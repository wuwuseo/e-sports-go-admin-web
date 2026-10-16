// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest';
import type { CloseConditionNode } from '../../api';
import {
  cloneCloseConditionTree,
  closeConditionSummary,
  countCloseConditionNodes,
  isCloseConditionTreeConfigured,
  newCloseConditionGroup,
  newCloseConditionLeaf,
  structuredCloseConditionTree,
  validateCloseConditionTree,
} from './logic';

const leaf = (
  field: string,
  operator: CloseConditionNode['operator'],
  value: number
): CloseConditionNode => ({ field, operator, value });

describe('结单条件树：已配置判定与深拷贝', () => {
  it('后端零值 {} 视为未配置', () => {
    expect(isCloseConditionTreeConfigured(null)).toBe(false);
    expect(isCloseConditionTreeConfigured({})).toBe(false);
    expect(
      isCloseConditionTreeConfigured({ op: undefined, field: '   ' })
    ).toBe(false);
    expect(isCloseConditionTreeConfigured({ op: 'and' })).toBe(true);
    expect(
      isCloseConditionTreeConfigured(leaf('evidence_count', '>=', 1))
    ).toBe(true);
  });

  it('未配置的条件树不产生表单值，已配置的深拷贝后与原对象解耦', () => {
    expect(cloneCloseConditionTree({})).toBeNull();
    expect(cloneCloseConditionTree(null)).toBeNull();
    const source: CloseConditionNode = {
      op: 'and',
      children: [leaf('evidence_count', '>=', 2)],
    };
    const copy = cloneCloseConditionTree(source);
    expect(copy).toEqual(source);
    copy!.children![0].value = 9;
    expect(source.children![0].value).toBe(2);
  });
});

describe('结单条件树：与后端同口径的提交前校验', () => {
  it('未配置（null 或零值 {}）视为可提交，回落结构化条件项', () => {
    expect(validateCloseConditionTree(null)).toEqual([]);
    expect(validateCloseConditionTree({})).toEqual([]);
  });

  it('AND/OR 嵌套的合法条件树无错误', () => {
    const tree: CloseConditionNode = {
      op: 'and',
      children: [
        leaf('evidence_count', '>=', 1),
        {
          op: 'or',
          children: [
            leaf('service_seconds', '>', 0),
            leaf('service_units', '>', 0),
          ],
        },
        leaf('pending_addon_count', '==', 0),
      ],
    };
    expect(validateCloseConditionTree(tree)).toEqual([]);
    expect(countCloseConditionNodes(tree)).toBe(6);
  });

  it('叶子缺值、字段非法或运算符非法时逐项报错', () => {
    const missingValue: CloseConditionNode = {
      op: 'and',
      children: [{ field: 'evidence_count', operator: '>=', value: null }],
    };
    expect(validateCloseConditionTree(missingValue)).toEqual([
      '根条件组.1 未填写有效值',
    ]);

    const badField: CloseConditionNode = {
      op: 'and',
      children: [leaf('unknown_field', '>=', 1)],
    };
    expect(validateCloseConditionTree(badField)).toEqual([
      '根条件组.1 未选择有效字段',
    ]);

    const badOperator: CloseConditionNode = {
      op: 'and',
      children: [
        { field: 'evidence_count', operator: '=<' as never, value: 1 },
      ],
    };
    expect(validateCloseConditionTree(badOperator)).toEqual([
      '根条件组.1 未选择有效运算符',
    ]);
  });

  it('取反节点必须恰好一个子条件', () => {
    const notWithTwo: CloseConditionNode = {
      op: 'not',
      children: [leaf('evidence_count', '>=', 1), leaf('addon_units', '==', 0)],
    };
    expect(validateCloseConditionTree(notWithTwo)).toEqual([
      '根条件组 取反只能包含一个子条件',
    ]);
    const notWithOne: CloseConditionNode = {
      op: 'not',
      children: [leaf('open_aftersale_count', '==', 0)],
    };
    expect(validateCloseConditionTree(notWithOne)).toEqual([]);
  });

  it('空条件组不可提交', () => {
    expect(validateCloseConditionTree({ op: 'and', children: [] })).toEqual([
      '根条件组 至少需要一个子条件',
    ]);
  });

  it('超过最大嵌套深度时报错', () => {
    const deep: CloseConditionNode = {
      op: 'and',
      children: [
        {
          op: 'and',
          children: [
            {
              op: 'and',
              children: [
                {
                  op: 'and',
                  children: [
                    {
                      op: 'and',
                      children: [leaf('evidence_count', '>=', 1)],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(validateCloseConditionTree(deep)).toEqual([
      '根条件组.1.1.1.1.1 超过最大嵌套深度 5',
    ]);
  });

  it('超过节点数上限时报错', () => {
    const many: CloseConditionNode = {
      op: 'and',
      children: Array.from({ length: 55 }, () =>
        leaf('evidence_count', '>=', 1)
      ),
    };
    expect(validateCloseConditionTree(many)).toEqual([
      '条件节点共 56 个，超过上限 50',
    ]);
  });
});

describe('结单条件树：只读摘要', () => {
  it('未配置时摘要为空', () => {
    expect(closeConditionSummary(null)).toBe('');
    expect(closeConditionSummary({})).toBe('');
  });

  it('布尔字段的 == 1 / == 0 折叠为「标签 / 非 标签」', () => {
    expect(
      closeConditionSummary(leaf('stored_value_consistent', '==', 1))
    ).toBe('储值卡核销一致');
    expect(
      closeConditionSummary(leaf('stored_value_consistent', '==', 0))
    ).toBe('非 储值卡核销一致');
  });

  it('组合节点按 且 / 或 嵌套输出', () => {
    const tree: CloseConditionNode = {
      op: 'and',
      children: [
        leaf('evidence_count', '>=', 1),
        {
          op: 'or',
          children: [
            leaf('service_seconds', '>', 0),
            leaf('service_units', '>', 0),
          ],
        },
      ],
    };
    expect(closeConditionSummary(tree)).toBe(
      '且(服务凭证张数 ≥ 1，或(系统服务时长（秒） > 0 秒，成员上报服务量 > 0))'
    );
  });
});

describe('结单条件树：结构化条件项折叠为等价条件树', () => {
  it('与后端 structuredCloseConditionTree 的四项口径一致', () => {
    expect(
      structuredCloseConditionTree({
        minEvidence: 2,
        requireDuration: true,
        requireNoPendingAddon: true,
        requireNoOpenAftersale: true,
      })
    ).toEqual({
      op: 'and',
      children: [
        { field: 'evidence_count', operator: '>=', value: 2 },
        {
          op: 'or',
          children: [
            { field: 'service_seconds', operator: '>', value: 0 },
            { field: 'service_units', operator: '>', value: 0 },
          ],
        },
        { field: 'pending_addon_count', operator: '==', value: 0 },
        { field: 'open_aftersale_count', operator: '==', value: 0 },
      ],
    });
  });

  it('无条件项时返回 null，生成的模板本身可提交', () => {
    expect(
      structuredCloseConditionTree({
        minEvidence: 0,
        requireDuration: false,
        requireNoPendingAddon: false,
        requireNoOpenAftersale: false,
      })
    ).toBeNull();
    const tree = structuredCloseConditionTree({
      minEvidence: 1,
      requireDuration: false,
      requireNoPendingAddon: false,
      requireNoOpenAftersale: false,
    });
    expect(validateCloseConditionTree(tree)).toEqual([]);
  });
});

describe('结单条件树：设计器节点工厂', () => {
  it('新建叶子默认字段合法且可提交', () => {
    const node = newCloseConditionLeaf();
    expect(node.field).toBe('evidence_count');
    expect(node.operator).toBe('>=');
    expect(
      validateCloseConditionTree(newCloseConditionGroup('and', [node]))
    ).toEqual([]);
  });

  it('新建布尔字段叶子时默认取「成立」', () => {
    expect(newCloseConditionLeaf('stored_value_consistent').value).toBe(1);
  });
});
