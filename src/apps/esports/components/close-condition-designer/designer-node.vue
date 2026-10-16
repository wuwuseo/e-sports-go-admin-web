<template>
  <div class="cc-node" :class="isLeaf ? 'cc-node-leaf' : 'cc-node-group'">
    <!-- 叶子：字段 + 运算符 + 值 -->
    <div v-if="isLeaf" class="cc-leaf">
      <a-select
        class="cc-field"
        :model-value="node.field"
        size="small"
        placeholder="选择字段"
        @change="onFieldChange"
      >
        <a-option v-for="spec in fieldSpecs" :key="spec.key" :value="spec.key">
          {{ spec.label }}
        </a-option>
      </a-select>
      <a-select
        class="cc-operator"
        :model-value="node.operator"
        size="small"
        @change="onOperatorChange"
      >
        <a-option v-for="op in operators" :key="op" :value="op">{{
          operatorLabel(op)
        }}</a-option>
      </a-select>
      <a-select
        v-if="fieldSpec && fieldSpec.kind === 'bool'"
        class="cc-value"
        :model-value="boolValue"
        size="small"
        @change="onBoolValueChange"
      >
        <a-option :value="1">成立</a-option>
        <a-option :value="0">不成立</a-option>
      </a-select>
      <a-input-number
        v-else
        class="cc-value"
        :model-value="numberValue"
        :min="0"
        :precision="0"
        size="small"
        placeholder="填写值"
        @change="onValueChange"
      />
      <a-button
        v-if="removable"
        type="text"
        status="danger"
        size="small"
        @click="emit('remove')"
        >删除</a-button
      >
    </div>

    <!-- 组合节点：and / or / not + children -->
    <div v-else class="cc-group">
      <div class="cc-group-head">
        <a-select
          class="cc-op"
          :model-value="node.op || 'and'"
          size="small"
          @change="onGroupOpChange"
        >
          <a-option value="and">全部满足（AND）</a-option>
          <a-option value="or">任一满足（OR）</a-option>
          <a-option value="not">取反（NOT）</a-option>
        </a-select>
        <a-button size="small" :disabled="!canAddChild" @click="addLeaf"
          >+ 条件</a-button
        >
        <a-button size="small" :disabled="!canAddGroup" @click="addGroup"
          >+ 条件组</a-button
        >
        <a-button
          v-if="removable"
          type="text"
          status="danger"
          size="small"
          @click="emit('remove')"
          >删除组</a-button
        >
      </div>
      <div class="cc-children">
        <DesignerNode
          v-for="(child, index) in node.children || []"
          :key="index"
          :node="child"
          :depth="depth + 1"
          :field-specs="fieldSpecs"
          :operators="operators"
          removable
          @remove="removeChild(index)"
        />
        <div v-if="!(node.children || []).length" class="cc-empty">
          该条件组还没有子条件，请至少添加一个。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  /*
   * 设计器有意直接改写「外层 index.vue 持有的条件树」：节点本身是递归的，
   * 若逐层 emit 上行，一次改动要穿过整条祖先链，且深拷贝会让 index.vue 的实时节点计数
   * 与设计器里的树脱钩。这里用注入的 notifyChange 通知外层重算，故关闭该规则。
   */
  /* eslint-disable vue/no-mutating-props */
  import { computed, inject } from 'vue';
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
  import {
    fieldSpecOf,
    isCloseConditionLeaf,
    newCloseConditionGroup,
    newCloseConditionLeaf,
    operatorLabel,
  } from './logic';

  const props = withDefaults(
    defineProps<{
      node: CloseConditionNode;
      depth?: number;
      removable?: boolean;
      /**
       * 节点总数上限，用于限制「+」按钮；由外层 index.vue 传入实时计数。
       * 传函数以保持响应式（节点增删后重新求值）。
       */
      nodeCount?: () => number;
      fieldSpecs?: CloseConditionFieldSpec[];
      operators?: CloseConditionOperator[];
    }>(),
    {
      depth: 1,
      removable: false,
      nodeCount: undefined,
      fieldSpecs: () => CLOSE_CONDITION_FIELD_SPECS,
      operators: () => CLOSE_CONDITION_OPERATORS,
    }
  );

  const emit = defineEmits<{
    (e: 'remove'): void;
    (e: 'change'): void;
  }>();

  // 外层注入的上下文：深度上限、改动通知与提示，避免逐层 emit 穿透。
  const ctx = inject<{
    maxDepth: number;
    notifyChange: () => void;
    notify: (text: string) => void;
  }>('closeConditionDesigner', {
    maxDepth: CLOSE_CONDITION_MAX_DEPTH,
    notifyChange: () => undefined,
    notify: () => undefined,
  });

  const isLeaf = computed(() => isCloseConditionLeaf(props.node));
  const fieldSpec = computed(() => fieldSpecOf(props.node.field));
  const numberValue = computed(() =>
    typeof props.node.value === 'number' ? props.node.value : undefined
  );
  const boolValue = computed(() => (props.node.value === 0 ? 0 : 1));

  const childCount = () =>
    typeof props.nodeCount === 'function' ? props.nodeCount() : 0;
  const underNodeLimit = () => childCount() < CLOSE_CONDITION_MAX_NODES;
  const notSaturated = () =>
    props.node.op !== 'not' || (props.node.children || []).length === 0;
  // 叶子占 1 层，条件组还要再容纳一个叶子，故加组要求 depth + 2 不超过上限。
  const canAddChild = computed(
    () => props.depth < ctx.maxDepth && underNodeLimit() && notSaturated()
  );
  const canAddGroup = computed(
    () => props.depth + 1 < ctx.maxDepth && underNodeLimit() && notSaturated()
  );

  function afterMutate() {
    emit('change');
    ctx.notifyChange();
  }

  function onFieldChange(value: unknown) {
    const field = String(value ?? '');
    const previous = fieldSpec.value;
    props.node.field = field;
    const next = fieldSpecOf(field);
    // 布尔与非布尔字段的取值域与运算符语义不同，跨类型切换时重置为该域下的最小成立条件。
    if (next && next.kind !== previous?.kind) {
      props.node.operator = next.kind === 'bool' ? '==' : '>=';
      props.node.value = 1;
    } else if (
      next &&
      next.kind === 'bool' &&
      props.node.value !== 0 &&
      props.node.value !== 1
    ) {
      props.node.value = 1;
    }
    afterMutate();
  }

  function onOperatorChange(value: unknown) {
    props.node.operator = String(value ?? '') as CloseConditionOperator;
    afterMutate();
  }

  function onValueChange(value: unknown) {
    props.node.value =
      typeof value === 'number' && Number.isFinite(value) ? value : null;
    afterMutate();
  }

  function onBoolValueChange(value: unknown) {
    props.node.value = Number(value) === 0 ? 0 : 1;
    afterMutate();
  }

  function onGroupOpChange(value: unknown) {
    const op = String(value ?? 'and') as CloseConditionGroupOp;
    const children = props.node.children || [];
    if (op === 'not' && children.length !== 1) {
      // 后端要求 not 恰好一个子节点；切换时收敛配置并明确告知，避免静默丢条件。
      props.node.op = 'not';
      props.node.children = [children[0] || newCloseConditionLeaf()];
      ctx.notify('取反只能包含一个子条件，已保留第一个子条件');
    } else {
      props.node.op = op;
    }
    afterMutate();
  }

  function addLeaf() {
    if (!canAddChild.value) return;
    props.node.children = [
      ...(props.node.children || []),
      newCloseConditionLeaf(),
    ];
    afterMutate();
  }

  function addGroup() {
    if (!canAddGroup.value) return;
    props.node.children = [
      ...(props.node.children || []),
      newCloseConditionGroup('and'),
    ];
    afterMutate();
  }

  function removeChild(index: number) {
    const children = props.node.children || [];
    if (children.length <= 1) {
      ctx.notify('条件组至少需要一个子条件，可删除整个条件组');
      return;
    }
    children.splice(index, 1);
    afterMutate();
  }
</script>

<style scoped>
  .cc-node-group {
    padding: 8px 10px;
    background: var(--color-fill-1, #f7f8fa);
    border-left: 2px solid var(--color-border-2, #e5e6eb);
    border-radius: 4px;
  }

  .cc-node-leaf {
    padding: 2px 0;
  }

  .cc-leaf,
  .cc-group-head {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .cc-field {
    width: 190px;
  }

  .cc-operator {
    width: 76px;
  }

  .cc-value {
    width: 130px;
  }

  .cc-children {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
  }

  .cc-empty {
    color: var(--color-text-3, #86909c);
    font-size: 12px;
  }
</style>
