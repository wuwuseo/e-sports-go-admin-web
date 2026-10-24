import {
  CLOSE_CONDITION_FIELD_SPECS,
  CLOSE_CONDITION_MAX_DEPTH,
  CLOSE_CONDITION_MAX_NODES,
  CLOSE_CONDITION_OPERATORS,
} from '../../api';
import type {
  CloseConditionFieldSpec,
  CloseConditionGroupOp,
  CloseConditionNode,
  CloseConditionOperator,
} from '../../api';

// 结单条件树（结单条件自定义）的纯逻辑：节点工厂、与后端一致的口径校验、只读摘要。
// 形状判定与 internal/apps/esports/close_condition.go 的 normalizeCloseConditionNode 保持一致：
// 组合节点填 op（and / or / not）+ children，叶子节点填 field + operator + value，两者互斥。

const OPERATOR_LABELS: Record<CloseConditionOperator, string> = {
  '>=': '≥',
  '>': '>',
  '<=': '≤',
  '<': '<',
  '==': '=',
  '!=': '≠',
};

export const operatorLabel = (operator: string) =>
  OPERATOR_LABELS[operator as CloseConditionOperator] || operator;

export const fieldSpecOf = (key: string | undefined) =>
  key
    ? CLOSE_CONDITION_FIELD_SPECS.find((item) => item.key === key)
    : undefined;

export const isGroupOp = (
  value: string | undefined
): value is CloseConditionGroupOp =>
  value === 'and' || value === 'or' || value === 'not';

const GROUP_OP_LABELS: Record<CloseConditionGroupOp, string> = {
  and: '全部满足（AND）',
  or: '任一满足（OR）',
  not: '取反（NOT）',
};

const GROUP_OP_SHORT_LABELS: Record<CloseConditionGroupOp, string> = {
  and: '且',
  or: '或',
  not: '非',
};

export const groupOpLabel = (op: CloseConditionGroupOp) =>
  GROUP_OP_LABELS[op] || op;

/** 叶子：有 field / operator / value 任一即为叶子，与后端「组合节点三者皆空」互补。 */
export function isCloseConditionLeaf(node: CloseConditionNode): boolean {
  return (
    !!node.field ||
    !!node.operator ||
    (node.value !== null && node.value !== undefined)
  );
}

export function newCloseConditionLeaf(field?: string): CloseConditionNode {
  const spec = fieldSpecOf(field) || CLOSE_CONDITION_FIELD_SPECS[0];
  // 布尔字段默认「== 1（成立）」，数值字段默认「>= 1」，都是该字段下最小的成立条件。
  return {
    field: spec.key,
    operator: spec.kind === 'bool' ? '==' : '>=',
    value: 1,
  };
}

export function newCloseConditionGroup(
  op?: CloseConditionGroupOp,
  children?: CloseConditionNode[]
): CloseConditionNode {
  const list =
    children && children.length > 0 ? children : [newCloseConditionLeaf()];
  return { op: op || 'and', children: list };
}

export function countCloseConditionNodes(
  node: CloseConditionNode | null | undefined
): number {
  if (!node) return 0;
  let total = 1;
  (node.children || []).forEach((child) => {
    total += countCloseConditionNodes(child);
  });
  return total;
}

/**
 * 是否已配置条件树：后端未配置时零值节点序列化为 `{}`（各字段 omitempty），
 * 与后端 isCloseConditionTreeConfigured 对齐——只有 op 或 field 非空才算已配置。
 */
export function isCloseConditionTreeConfigured(
  node: CloseConditionNode | null | undefined
): node is CloseConditionNode {
  if (!node) return false;
  return !!node.op?.trim() || !!node.field?.trim();
}

/** 深拷贝条件树；未配置（null 或零值 `{}`）统一返回 null，表示回落结构化条件项。 */
export function cloneCloseConditionTree(
  node: CloseConditionNode | null | undefined
): CloseConditionNode | null {
  if (!isCloseConditionTreeConfigured(node)) return null;
  return JSON.parse(JSON.stringify(node)) as CloseConditionNode;
}

/** 值文本：布尔字段用「成立 / 不成立」，时长补秒单位，其余按数值展示。 */
export function closeConditionValueText(
  spec: CloseConditionFieldSpec | undefined,
  value: number | null | undefined
): string {
  if (value === null || value === undefined) return '未填';
  if (spec && spec.kind === 'bool') return value === 1 ? '成立' : '不成立';
  if (spec && spec.kind === 'seconds') return `${value} 秒`;
  return String(value);
}

function leafSummary(node: CloseConditionNode): string {
  const spec = fieldSpecOf(node.field);
  const label = spec ? spec.label : node.field || '未选字段';
  const operator = operatorLabel(node.operator || '?');
  const value = closeConditionValueText(spec, node.value);
  // 布尔字段的 == 1 / != 1 折叠成「标签 / 非 标签」更易读。
  if (spec && spec.kind === 'bool' && (node.value === 0 || node.value === 1)) {
    const truthy = node.value === 1;
    const eqPositive = node.operator === '==' ? truthy : null;
    let positive = eqPositive;
    if (node.operator === '!=') positive = !truthy;
    if (positive !== null) return positive ? label : `非 ${label}`;
  }
  return `${label} ${operator} ${value}`;
}

/** 只读摘要：供规则列表与提示展示，叶子用「字段 运算符 值」，组合用 且/或/非(...) 嵌套。 */
export function closeConditionSummary(
  node: CloseConditionNode | null | undefined
): string {
  if (!isCloseConditionTreeConfigured(node)) return '';
  if (isCloseConditionLeaf(node)) return leafSummary(node);
  const op = isGroupOp(node.op) ? node.op : 'and';
  const inner = (node.children || []).map(closeConditionSummary).join('，');
  const label = GROUP_OP_SHORT_LABELS[op] || '且';
  return `${label}(${inner})`;
}

function validateNode(
  node: CloseConditionNode,
  depth: number,
  path: string,
  errors: string[],
  fieldSpecs: CloseConditionFieldSpec[],
  operators: CloseConditionOperator[],
  maxDepth: number
): void {
  if (depth > maxDepth) {
    errors.push(`${path} 超过最大嵌套深度 ${maxDepth}`);
    return;
  }
  const children = node.children || [];
  if (isCloseConditionLeaf(node)) {
    if (isGroupOp(node.op) || children.length > 0) {
      errors.push(`${path} 不能同时是条件项与条件组`);
      return;
    }
    if (!fieldSpecs.some((item) => item.key === node.field)) {
      errors.push(`${path} 未选择有效字段`);
    }
    if (!node.operator || operators.indexOf(node.operator) < 0) {
      errors.push(`${path} 未选择有效运算符`);
    }
    const { value } = node;
    if (value === null || value === undefined || !Number.isFinite(value)) {
      errors.push(`${path} 未填写有效值`);
    }
    return;
  }
  if (!isGroupOp(node.op)) {
    errors.push(`${path} 逻辑运算无效`);
    return;
  }
  if (children.length === 0) {
    errors.push(`${path} 至少需要一个子条件`);
    return;
  }
  if (node.op === 'not' && children.length !== 1) {
    errors.push(`${path} 取反只能包含一个子条件`);
    return;
  }
  children.forEach((child, index) => {
    validateNode(
      child,
      depth + 1,
      `${path}.${index + 1}`,
      errors,
      fieldSpecs,
      operators,
      maxDepth
    );
  });
}

/**
 * 提交前校验，口径与后端 normalizeCloseConditionTree 对齐：
 * 深度 ≤ 5、节点数 ≤ 50、组合节点至少 1 个子节点且 not 恰好 1 个、叶子字段与运算符合法且值有限。
 * 返回空数组表示可提交；节点树为空（未配置）同样返回空数组（回落结构化条件项）。
 */
export function validateCloseConditionTree(
  node: CloseConditionNode | null | undefined,
  fieldSpecs: CloseConditionFieldSpec[] = CLOSE_CONDITION_FIELD_SPECS,
  operators: CloseConditionOperator[] = CLOSE_CONDITION_OPERATORS,
  maxDepth = CLOSE_CONDITION_MAX_DEPTH,
  maxNodes = CLOSE_CONDITION_MAX_NODES
): string[] {
  // 零值 {}(后端未配置)与 null 一样不校验，回落结构化条件项。
  if (!isCloseConditionTreeConfigured(node)) return [];
  const errors: string[] = [];
  validateNode(node, 1, '根条件组', errors, fieldSpecs, operators, maxDepth);
  const total = countCloseConditionNodes(node);
  if (total > maxNodes) {
    errors.push(`条件节点共 ${total} 个，超过上限 ${maxNodes}`);
  }
  return errors;
}

export interface StructuredCloseConditionInput {
  minEvidence: number;
  requireDuration: boolean;
  requireNoPendingAddon: boolean;
  requireNoOpenAftersale: boolean;
}

/**
 * 按结构化条件项生成等价条件树，口径与后端 structuredCloseConditionTree 一致
 * （凭证 ≥N、时长为零用「系统时长 OR 上报服务量」、无未处理加钟、无进行中售后）。
 * 用于让设计器以现有默认口径为起点，避免从空白条件开始配置。无条件项时返回 null。
 */
export function structuredCloseConditionTree(
  input: StructuredCloseConditionInput
): CloseConditionNode | null {
  const children: CloseConditionNode[] = [];
  if (input.minEvidence >= 1) {
    children.push({
      field: 'evidence_count',
      operator: '>=',
      value: input.minEvidence,
    });
  }
  if (input.requireDuration) {
    children.push({
      op: 'or',
      children: [
        { field: 'service_seconds', operator: '>', value: 0 },
        { field: 'service_units', operator: '>', value: 0 },
      ],
    });
  }
  if (input.requireNoPendingAddon) {
    children.push({ field: 'pending_addon_count', operator: '==', value: 0 });
  }
  if (input.requireNoOpenAftersale) {
    children.push({ field: 'open_aftersale_count', operator: '==', value: 0 });
  }
  if (children.length === 0) return null;
  return { op: 'and', children };
}
