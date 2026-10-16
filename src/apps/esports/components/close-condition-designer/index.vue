<template>
  <div class="cc-designer">
    <DesignerNode
      v-if="tree"
      :node="tree"
      :depth="1"
      :node-count="nodeCount"
      :field-specs="fieldSpecs"
      :operators="operators"
      @change="onTreeChange"
    />
    <div v-else class="cc-designer-empty">
      <span class="cc-designer-empty-text">
        未配置条件树：结单按「服务凭证张数 / 服务时长 / 未处理加钟 /
        进行中售后」 等结构化条件项判定。
      </span>
      <a-button size="small" type="primary" @click="enableTree"
        >配置条件树</a-button
      >
    </div>

    <div class="cc-designer-foot">
      <a-typography-text type="secondary">
        条件树支持 AND / OR / NOT 嵌套，最多 {{ maxDepth }} 层、{{ maxNodes }}
        个节点；清空即回落结构化条件项。规则生效后才作用于订单，条件不满足时结单按钮不可点。
      </a-typography-text>
      <span v-if="tree" class="cc-designer-count"
        >当前 {{ nodeCount() }} 个节点</span
      >
      <a-button v-if="tree" size="small" @click="clearTree"
        >清空条件树</a-button
      >
    </div>

    <ul v-if="errors.length" class="cc-designer-errors">
      <li v-for="(item, index) in errors" :key="index">{{ item }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
  import { computed, provide } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import {
    CLOSE_CONDITION_FIELD_SPECS,
    CLOSE_CONDITION_MAX_DEPTH,
    CLOSE_CONDITION_MAX_NODES,
    CLOSE_CONDITION_OPERATORS,
  } from '../../api';
  import type {
    CloseConditionFieldSpec,
    CloseConditionNode,
    CloseConditionOperator,
  } from '../../api';
  import DesignerNode from './designer-node.vue';
  import {
    countCloseConditionNodes,
    isCloseConditionTreeConfigured,
    newCloseConditionGroup,
    structuredCloseConditionTree,
    validateCloseConditionTree,
  } from './logic';
  import type { StructuredCloseConditionInput } from './logic';

  const props = withDefaults(
    defineProps<{
      /** 条件树；null 表示未配置，结单回落结构化条件项。就地编辑，不产生本地副本。 */
      modelValue: CloseConditionNode | null;
      fieldSpecs?: CloseConditionFieldSpec[];
      operators?: CloseConditionOperator[];
      maxDepth?: number;
      maxNodes?: number;
      /** 「配置条件树」的起点模板来源；缺省时用「全部满足（AND）」空组。 */
      structuredSource?: StructuredCloseConditionInput;
    }>(),
    {
      fieldSpecs: () => CLOSE_CONDITION_FIELD_SPECS,
      operators: () => CLOSE_CONDITION_OPERATORS,
      maxDepth: CLOSE_CONDITION_MAX_DEPTH,
      maxNodes: CLOSE_CONDITION_MAX_NODES,
      structuredSource: undefined,
    }
  );

  const emit = defineEmits<{
    (e: 'update:modelValue', value: CloseConditionNode | null): void;
    (e: 'change'): void;
  }>();

  // 零值 `{}` 视为未配置，避免把后端条件树的空对象当成可编辑的树。
  const tree = computed(() =>
    isCloseConditionTreeConfigured(props.modelValue) ? props.modelValue : null
  );
  const nodeCount = () => countCloseConditionNodes(tree.value);
  const errors = computed(() =>
    validateCloseConditionTree(
      tree.value,
      props.fieldSpecs,
      props.operators,
      props.maxDepth,
      props.maxNodes
    )
  );

  provide('closeConditionDesigner', {
    // 用 getter 暴露，上层调整上限时子节点可实时读取。
    get maxDepth() {
      return props.maxDepth;
    },
    // 就地修改后回传同一引用，既满足 v-model 约定，又避免换对象导致输入框失焦。
    notifyChange: () => {
      emit('update:modelValue', props.modelValue);
      emit('change');
    },
    notify: (text: string) => Message.warning(text),
  });

  function onTreeChange() {
    emit('change');
  }

  function enableTree() {
    const fromStructured = props.structuredSource
      ? structuredCloseConditionTree(props.structuredSource)
      : null;
    emit('update:modelValue', fromStructured || newCloseConditionGroup('and'));
    emit('change');
  }

  function clearTree() {
    emit('update:modelValue', null);
    emit('change');
  }
</script>

<style scoped>
  .cc-designer {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cc-designer-empty {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--color-fill-1, #f7f8fa);
    border-radius: 4px;
  }

  .cc-designer-empty-text {
    color: var(--color-text-3, #86909c);
    font-size: 12px;
  }

  .cc-designer-foot {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .cc-designer-count {
    color: var(--color-text-3, #86909c);
    font-size: 12px;
  }

  .cc-designer-errors {
    margin: 0;
    padding-left: 18px;
    color: var(--color-danger-6, #f53f3f);
    font-size: 12px;
  }
</style>
