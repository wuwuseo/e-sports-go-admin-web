<template>
  <a-modal
    :visible="visible"
    :title="
      isEdit
        ? $t('system.role.form.title.edit')
        : $t('system.role.form.title.create')
    "
    :ok-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="formData" :rules="rules" auto-label-width>
      <a-form-item
        field="name"
        :label="$t('system.role.form.name')"
        :disabled="isEdit"
      >
        <a-input
          v-model="formData.name"
          :placeholder="$t('system.role.form.name.placeholder')"
          :disabled="isEdit"
        />
      </a-form-item>
      <a-form-item
        field="display_name"
        :label="$t('system.role.form.displayName')"
      >
        <a-input
          v-model="formData.display_name"
          :placeholder="$t('system.role.form.displayName.placeholder')"
        />
      </a-form-item>
      <a-form-item field="data_scope" :label="$t('system.role.form.dataScope')">
        <a-select
          v-model="formData.data_scope"
          :placeholder="$t('system.role.form.dataScope.placeholder')"
          @change="handleDataScopeChange"
        >
          <a-option value="all">{{
            $t('system.role.form.dataScope.all')
          }}</a-option>
          <a-option value="self">{{
            $t('system.role.form.dataScope.self')
          }}</a-option>
          <a-option value="department">{{
            $t('system.role.form.dataScope.department')
          }}</a-option>
          <a-option value="department_and_child">{{
            $t('system.role.form.dataScope.deptAndChild')
          }}</a-option>
          <a-option value="custom">{{
            $t('system.role.form.dataScope.custom')
          }}</a-option>
        </a-select>
      </a-form-item>
      <a-form-item
        v-if="formData.data_scope === 'custom'"
        field="data_scope_department_ids"
        :label="$t('system.role.form.deptScope')"
      >
        <a-tree-select
          v-model="formData.data_scope_department_ids"
          :data="departmentTreeOptions"
          multiple
          tree-checkable
          tree-check-strictly
          allow-clear
          :placeholder="$t('system.role.form.deptScope.placeholder')"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item
        field="description"
        :label="$t('system.role.form.description')"
      >
        <a-textarea
          v-model="formData.description"
          :placeholder="$t('system.role.form.description.placeholder')"
          :max-length="200"
          show-word-limit
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import useRoleStore from '@/store/modules/role';
  import { getDepartmentTree } from '@/api/department';
  import type {
    DataScope,
    DepartmentTreeNode,
    RoleResponse,
  } from '@/types/api';

  // 部门树选项的内部结构（用于 a-tree-select）
  interface DepartmentTreeOption {
    key: number;
    title: string;
    children?: DepartmentTreeOption[];
  }

  const props = defineProps<{
    visible: boolean;
    role?: RoleResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const roleStore = useRoleStore();
  const formRef = ref();
  const submitting = ref(false);

  const isEdit = computed(() => !!props.role);

  // 数据权限范围默认值
  const DEFAULT_DATA_SCOPE: DataScope = 'self';

  const formData = ref<{
    name: string;
    display_name: string;
    description: string;
    data_scope: DataScope;
    data_scope_department_ids: number[];
  }>({
    name: '',
    display_name: '',
    description: '',
    data_scope: DEFAULT_DATA_SCOPE,
    data_scope_department_ids: [],
  });

  // 部门树缓存
  const departmentTreeOptions = ref<DepartmentTreeOption[]>([]);

  // 将后端返回的部门树转换为 a-tree-select 期望的结构
  const transformDepartmentTree = (
    nodes: DepartmentTreeNode[]
  ): DepartmentTreeOption[] => {
    return nodes.map((node) => ({
      key: node.id,
      title: node.name,
      children: node.children?.length
        ? transformDepartmentTree(node.children)
        : undefined,
    }));
  };

  // 加载部门树（失败时静默，避免影响表单展示）
  const loadDepartmentTree = async () => {
    try {
      const res = await getDepartmentTree();
      departmentTreeOptions.value = transformDepartmentTree(
        res.data.data || []
      );
    } catch (err) {
      // 加载失败时保留空数组，错误已由 axios 拦截器统一提示
      departmentTreeOptions.value = [];
    }
  };

  const rules = computed(() => ({
    name: [{ required: true, message: t('system.role.form.name.required') }],
    display_name: [
      {
        required: true,
        message: t('system.role.form.displayName.required'),
      },
    ],
  }));

  // 切换数据权限范围时，若不再是 custom 则清空部门选择
  const handleDataScopeChange = (
    value:
      | string
      | number
      | boolean
      | Record<string, any>
      | (string | number | boolean | Record<string, any>)[]
  ) => {
    if (value !== 'custom') {
      formData.value.data_scope_department_ids = [];
    }
  };

  watch(
    () => props.visible,
    (val) => {
      if (!val) {
        return;
      }
      // 打开弹窗时加载部门树
      loadDepartmentTree();

      if (props.role) {
        formData.value = {
          name: props.role.name,
          display_name: props.role.display_name,
          description: props.role.description || '',
          data_scope: props.role.data_scope || DEFAULT_DATA_SCOPE,
          data_scope_department_ids: Array.isArray(
            props.role.data_scope_department_ids
          )
            ? [...props.role.data_scope_department_ids]
            : [],
        };
      } else {
        formData.value = {
          name: '',
          display_name: '',
          description: '',
          data_scope: DEFAULT_DATA_SCOPE,
          data_scope_department_ids: [],
        };
      }
    }
  );

  const handleSubmit = async () => {
    const res = await formRef.value?.validate();
    if (res) return;

    submitting.value = true;
    try {
      // 非 custom 模式时强制传空数组，避免后端拿到上次的脏数据
      const deptIds =
        formData.value.data_scope === 'custom'
          ? formData.value.data_scope_department_ids
          : [];

      if (isEdit.value && props.role) {
        await roleStore.updateRole(props.role.id, {
          display_name: formData.value.display_name,
          description: formData.value.description || undefined,
          data_scope: formData.value.data_scope,
          data_scope_department_ids: deptIds,
        });
        Message.success(t('system.role.updateSuccess'));
      } else {
        await roleStore.createRole({
          name: formData.value.name,
          display_name: formData.value.display_name,
          description: formData.value.description || undefined,
          data_scope: formData.value.data_scope,
          data_scope_department_ids: deptIds,
        });
        Message.success(t('system.role.createSuccess'));
      }
      emit('update:visible', false);
      emit('success');
    } finally {
      submitting.value = false;
    }
  };

  const handleCancel = () => {
    emit('update:visible', false);
  };
</script>
