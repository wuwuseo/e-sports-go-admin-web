<template>
  <div class="container page-container">
    <a-card class="general-card" title="结单表单（§3.4）">
      <a-tabs v-model:active-key="activeTab">
        <!-- 字段库 -->
        <a-tab-pane key="fields" title="字段库">
          <a-space class="toolbar">
            <a-button v-if="canManage" type="primary" @click="openFieldCreate"
              >新建字段</a-button
            >
            <a-button :loading="fieldsLoading" @click="loadFields"
              >刷新</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="tip">
            字段可被多个模板复用；停用后新模板不可再引用，已生效模板不受影响。
          </a-typography-text>
          <a-table
            :data="fields"
            :loading="fieldsLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="key" title="字段标识" />
              <a-table-column data-index="label" title="显示名" />
              <a-table-column title="类型">
                <template #cell="{ record }">{{
                  fieldTypeLabel(record.field_type)
                }}</template>
              </a-table-column>
              <a-table-column title="必填">
                <template #cell="{ record }">{{
                  record.required ? '是' : '否'
                }}</template>
              </a-table-column>
              <a-table-column title="选项">
                <template #cell="{ record }">{{
                  (record.options || []).join(' / ') || '—'
                }}</template>
              </a-table-column>
              <a-table-column title="最大长度">
                <template #cell="{ record }">{{
                  record.max_length > 0 ? record.max_length : '不限'
                }}</template>
              </a-table-column>
              <a-table-column data-index="sort_order" title="排序" />
              <a-table-column title="状态 / 版本">
                <template #cell="{ record }"
                  >{{ record.enabled ? '启用' : '停用' }} / v{{
                    record.version
                  }}</template
                >
              </a-table-column>
              <a-table-column title="操作" :width="160">
                <template #cell="{ record }">
                  <a-button
                    v-if="canManage"
                    type="text"
                    @click="openFieldEdit(record)"
                    >编辑</a-button
                  >
                  <a-button
                    v-if="canManage"
                    type="text"
                    status="warning"
                    @click="toggleField(record)"
                    >{{ record.enabled ? '停用' : '启用' }}</a-button
                  >
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 表单模板 -->
        <a-tab-pane key="templates" title="表单模板">
          <a-space class="toolbar">
            <a-button
              v-if="canManage"
              type="primary"
              @click="openTemplateCreate"
              >新建模板</a-button
            >
            <a-button :loading="templatesLoading" @click="loadTemplates"
              >刷新</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="tip">
            按 SKU &gt; 游戏分区 &gt; 全局
            +金额区间命中订单；同层取版本最高，且仅草稿可生效，
            改模板生成新版本，回滚以历史版本为模板生成更高版本。
          </a-typography-text>
          <a-table
            :data="templates"
            :loading="templatesLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="code" title="模板编号" />
              <a-table-column data-index="name" title="名称" />
              <a-table-column title="适用范围">
                <template #cell="{ record }">{{
                  templateScopeLabel(record)
                }}</template>
              </a-table-column>
              <a-table-column title="金额区间">
                <template #cell="{ record }">{{
                  amountRangeLabel(record)
                }}</template>
              </a-table-column>
              <a-table-column title="字段">
                <template #cell="{ record }"
                  >{{ (record.fields || []).length }} 个</template
                >
              </a-table-column>
              <a-table-column title="版本 / 状态">
                <template #cell="{ record }"
                  >v{{ record.version }} /
                  {{ templateStatusLabel(record.status) }}</template
                >
              </a-table-column>
              <a-table-column title="操作" :width="140">
                <template #cell="{ record }">
                  <a-button
                    v-if="canManage && record.status === 'draft'"
                    type="text"
                    status="success"
                    @click="doActivateTemplate(record)"
                    >生效</a-button
                  >
                  <a-button
                    v-else-if="canManage && record.status === 'history'"
                    type="text"
                    @click="doRollbackTemplate(record)"
                    >回滚</a-button
                  >
                  <span v-else>—</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-modal
      v-model:visible="fieldVisible"
      :title="fieldEditing ? '编辑字段' : '新建字段'"
      @ok="submitField"
      @cancel="fieldVisible = false"
    >
      <a-form :model="fieldForm">
        <a-form-item label="字段标识 key" required>
          <a-input
            v-model="fieldForm.key"
            :max-length="48"
            :disabled="fieldEditing !== null"
            placeholder="小写字母开头，仅字母 / 数字 / 下划线"
          />
        </a-form-item>
        <a-form-item label="显示名" required>
          <a-input v-model="fieldForm.label" :max-length="64" />
        </a-form-item>
        <a-form-item label="字段类型" required>
          <a-select v-model="fieldForm.fieldType">
            <a-option
              v-for="(label, value) in fieldTypeLabels"
              :key="value"
              :value="value"
              >{{ label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="默认必填">
          <a-switch v-model="fieldForm.required" />
        </a-form-item>
        <a-form-item
          v-if="
            fieldForm.fieldType === 'select' ||
            fieldForm.fieldType === 'multiselect'
          "
          label="选项（每行一个）"
          required
        >
          <a-textarea
            v-model="fieldForm.optionsText"
            :auto-size="{ minRows: 3 }"
          />
        </a-form-item>
        <a-form-item
          v-if="fieldForm.fieldType === 'text'"
          label="最大长度（0 = 不限）"
        >
          <a-input-number v-model="fieldForm.maxLength" :min="0" :max="2000" />
        </a-form-item>
        <a-form-item label="排序值">
          <a-input-number v-model="fieldForm.sortOrder" />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="fieldForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="templateVisible"
      title="新建结单表单模板（§3.4）"
      @ok="submitTemplate"
      @cancel="templateVisible = false"
    >
      <a-form :model="templateForm">
        <a-form-item label="模板编号" required>
          <a-input v-model="templateForm.code" :max-length="48" />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model="templateForm.name" :max-length="64" />
        </a-form-item>
        <a-form-item label="适用范围" required>
          <a-select v-model="templateForm.scope">
            <a-option value="global">全局</a-option>
            <a-option value="game">按游戏分区</a-option>
            <a-option value="sku">按 SKU</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="templateForm.scope !== 'global'"
          label="范围键"
          required
        >
          <a-input
            v-model="templateForm.scopeKey"
            :max-length="64"
            placeholder="游戏分区名或 SKU 编号"
          />
        </a-form-item>
        <a-form-item label="金额下限（元，0 = 不限）">
          <a-input-number v-model="templateForm.minYuan" :min="0" />
        </a-form-item>
        <a-form-item label="金额上限（元，0 = 不限）">
          <a-input-number v-model="templateForm.maxYuan" :min="0" />
        </a-form-item>
        <a-form-item label="绑定字段" required>
          <a-select
            :model-value="boundKeys"
            multiple
            placeholder="从字段库选择字段"
            @change="onBoundKeysChange"
          >
            <a-option
              v-for="item in enabledFields"
              :key="item.key"
              :value="item.key"
              >{{ item.label }}（{{
                fieldTypeLabel(item.field_type)
              }}）</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item
          v-for="(binding, index) in templateForm.bindings"
          :key="binding.fieldKey"
          :label="`第 ${index + 1} 项：${fieldLabelOf(binding.fieldKey)}`"
        >
          <a-space>
            <a-checkbox v-model="binding.required">必填</a-checkbox>
            <a-button size="mini" @click="moveBinding(index, -1)"
              >上移</a-button
            >
            <a-button size="mini" @click="moveBinding(index, 1)">下移</a-button>
          </a-space>
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="templateForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    activateCloseFormTemplate,
    createCloseFormField,
    createCloseFormTemplate,
    listCloseFormFields,
    listCloseFormTemplates,
    rollbackCloseFormTemplate,
    setCloseFormFieldStatus,
    updateCloseFormField,
  } from '../../api';
  import type {
    CloseFormFieldType,
    CloseFormScope,
    CloseFormStatus,
    EsportsCloseFormField,
    EsportsCloseFormTemplate,
  } from '../../api';

  const fieldTypeLabels: Record<CloseFormFieldType, string> = {
    text: '文本',
    number: '数字',
    money: '金额（只读）',
    select: '单选',
    multiselect: '多选',
    datetime: '日期时间',
    image: '图片',
    switch: '开关',
    reference: '关联',
  };
  const templateStatusLabels: Record<CloseFormStatus, string> = {
    draft: '草稿',
    active: '生效中',
    history: '历史版本',
  };
  const fieldTypeLabel = (value: CloseFormFieldType) =>
    fieldTypeLabels[value] || value;
  const templateStatusLabel = (value: CloseFormStatus) =>
    templateStatusLabels[value] || value;
  const templateScopeLabel = (item: EsportsCloseFormTemplate) =>
    item.scope === 'global'
      ? '全局'
      : `${item.scope === 'game' ? '游戏分区' : 'SKU'}：${item.scope_key}`;
  const amountRangeLabel = (item: EsportsCloseFormTemplate) => {
    const min =
      item.min_cents > 0 ? `¥${(item.min_cents / 100).toFixed(2)}` : '不限';
    const max =
      item.max_cents > 0 ? `¥${(item.max_cents / 100).toFixed(2)}` : '不限';
    return `${min} ~ ${max}`;
  };
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  const { hasButtonPermission } = usePermission();
  const canManage = computed(() =>
    hasButtonPermission('esports:close_forms:manage')
  );

  const activeTab = ref('fields');

  // ── 字段库 ──
  const fields = ref<EsportsCloseFormField[]>([]);
  const fieldsLoading = ref(false);
  const fieldVisible = ref(false);
  const fieldEditing = ref<EsportsCloseFormField | null>(null);
  const fieldForm = reactive({
    key: '',
    label: '',
    fieldType: 'text' as CloseFormFieldType,
    required: false,
    optionsText: '',
    maxLength: 0,
    sortOrder: 0,
    note: '',
  });
  const enabledFields = computed(() =>
    fields.value.filter((item) => item.enabled)
  );
  const fieldLabelOf = (key: string) =>
    fields.value.find((item) => item.key === key)?.label || key;

  // 模板列表状态在此提前声明，供列表加载函数共用（满足 no-use-before-define）。
  const templates = ref<EsportsCloseFormTemplate[]>([]);
  const templatesLoading = ref(false);

  async function loadFields() {
    fieldsLoading.value = true;
    try {
      fields.value = (await listCloseFormFields()).data.data || [];
    } catch {
      Message.error('加载字段库失败，请稍后重试');
    } finally {
      fieldsLoading.value = false;
    }
  }

  async function loadTemplates() {
    templatesLoading.value = true;
    try {
      templates.value = (await listCloseFormTemplates()).data.data || [];
    } catch {
      Message.error('加载表单模板失败，请稍后重试');
    } finally {
      templatesLoading.value = false;
    }
  }

  function resetFieldForm() {
    fieldForm.key = '';
    fieldForm.label = '';
    fieldForm.fieldType = 'text';
    fieldForm.required = false;
    fieldForm.optionsText = '';
    fieldForm.maxLength = 0;
    fieldForm.sortOrder = 0;
    fieldForm.note = '';
  }

  function openFieldCreate() {
    fieldEditing.value = null;
    resetFieldForm();
    fieldVisible.value = true;
  }

  function openFieldEdit(record: EsportsCloseFormField) {
    fieldEditing.value = record;
    fieldForm.key = record.key;
    fieldForm.label = record.label;
    fieldForm.fieldType = record.field_type;
    fieldForm.required = record.required;
    fieldForm.optionsText = (record.options || []).join('\n');
    fieldForm.maxLength = record.max_length;
    fieldForm.sortOrder = record.sort_order;
    fieldForm.note = record.note;
    fieldVisible.value = true;
  }

  const parseOptions = () =>
    fieldForm.optionsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');

  async function submitField() {
    if (!fieldForm.key.trim() || !fieldForm.label.trim()) {
      Message.warning('请填写字段标识与显示名');
      return;
    }
    const payload = {
      key: fieldForm.key.trim(),
      label: fieldForm.label.trim(),
      field_type: fieldForm.fieldType,
      required: fieldForm.required,
      options: parseOptions(),
      max_length: fieldForm.maxLength,
      sort_order: fieldForm.sortOrder,
      note: fieldForm.note.trim(),
    };
    try {
      if (fieldEditing.value) {
        await updateCloseFormField(
          fieldEditing.value.id,
          fieldEditing.value.version,
          payload
        );
      } else {
        await createCloseFormField(payload);
      }
      fieldVisible.value = false;
      Message.success('已保存字段');
      await Promise.all([loadFields(), loadTemplates()]);
    } catch (err) {
      Message.error(errorText(err, '保存失败：标识重复或参数非法'));
    }
  }

  async function toggleField(record: EsportsCloseFormField) {
    try {
      await setCloseFormFieldStatus(record.id, !record.enabled);
      Message.success(record.enabled ? '已停用' : '已启用');
      await loadFields();
    } catch (err) {
      Message.error(errorText(err, '操作失败，请刷新后重试'));
    }
  }

  // ── 表单模板 ──
  const templateVisible = ref(false);
  const templateForm = reactive({
    code: '',
    name: '',
    scope: 'global' as CloseFormScope,
    scopeKey: '',
    minYuan: 0,
    maxYuan: 0,
    bindings: [] as { fieldKey: string; required: boolean }[],
    note: '',
  });
  const boundKeys = computed(() =>
    templateForm.bindings.map((binding) => binding.fieldKey)
  );

  function onBoundKeysChange(value: unknown) {
    const next = (Array.isArray(value) ? value : []).map((key) => String(key));
    const kept = templateForm.bindings.filter((binding) =>
      next.includes(binding.fieldKey)
    );
    next.forEach((key) => {
      if (!kept.some((binding) => binding.fieldKey === key)) {
        kept.push({ fieldKey: key, required: false });
      }
    });
    templateForm.bindings = kept;
  }

  function moveBinding(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= templateForm.bindings.length) return;
    const list = templateForm.bindings;
    const [item] = list.splice(index, 1);
    list.splice(target, 0, item);
  }

  function openTemplateCreate() {
    templateForm.code = '';
    templateForm.name = '';
    templateForm.scope = 'global';
    templateForm.scopeKey = '';
    templateForm.minYuan = 0;
    templateForm.maxYuan = 0;
    templateForm.bindings = [];
    templateForm.note = '';
    templateVisible.value = true;
  }

  async function submitTemplate() {
    if (!templateForm.code.trim() || !templateForm.name.trim()) {
      Message.warning('请填写模板编号与名称');
      return;
    }
    if (templateForm.scope !== 'global' && !templateForm.scopeKey.trim()) {
      Message.warning('请填写范围键');
      return;
    }
    if (templateForm.bindings.length === 0) {
      Message.warning('请至少绑定一个字段');
      return;
    }
    try {
      await createCloseFormTemplate({
        code: templateForm.code.trim(),
        name: templateForm.name.trim(),
        scope: templateForm.scope,
        scope_key: templateForm.scopeKey.trim(),
        min_cents: Math.round(templateForm.minYuan * 100),
        max_cents: Math.round(templateForm.maxYuan * 100),
        fields: templateForm.bindings.map((binding, index) => ({
          field_key: binding.fieldKey,
          required: binding.required,
          sort: index + 1,
        })),
        note: templateForm.note.trim(),
      });
      templateVisible.value = false;
      Message.success('已创建草稿模板，需“生效”后才会作用于结单');
      await loadTemplates();
    } catch (err) {
      Message.error(errorText(err, '创建失败：字段已停用或参数非法'));
    }
  }

  async function doActivateTemplate(record: EsportsCloseFormTemplate) {
    try {
      await activateCloseFormTemplate(record.id);
      Message.success('已生效');
      await loadTemplates();
    } catch (err) {
      Message.error(errorText(err, '生效失败：仅草稿可生效'));
    }
  }

  async function doRollbackTemplate(record: EsportsCloseFormTemplate) {
    try {
      await rollbackCloseFormTemplate(record.id);
      Message.success('已回滚并生效新版本');
      await loadTemplates();
    } catch (err) {
      Message.error(errorText(err, '回滚失败，请刷新后重试'));
    }
  }

  onMounted(() => {
    loadFields();
    loadTemplates();
  });
</script>

<style scoped lang="less">
  .toolbar {
    margin-bottom: 12px;
  }

  .tip {
    display: block;
    margin-bottom: 12px;
  }
</style>
