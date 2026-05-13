<template>
  <a-modal
    :visible="visible"
    :title="$t('system.role.permission.title')"
    :width="820"
    :ok-loading="saving"
    :ok-text="$t('system.role.permission.save')"
    :cancel-text="$t('common.cancel')"
    unmount-on-close
    @cancel="handleCancel"
    @ok="handleSave"
  >
    <a-spin :loading="loading" style="width: 100%">
      <!-- 角色信息 -->
      <div v-if="role" class="role-meta">
        <a-tag color="arcoblue">{{ role.name }}</a-tag>
        <span class="role-display">{{ role.display_name }}</span>
      </div>

      <!-- 工具栏：搜索 + 类型筛选 + 全选 -->
      <div class="assign-toolbar">
        <a-input-search
          v-model="keyword"
          :placeholder="$t('system.role.permission.searchPlaceholder')"
          allow-clear
          style="width: 260px"
        />
        <a-select
          v-model="typeFilter"
          :placeholder="$t('system.role.permission.type')"
          allow-clear
          style="width: 140px"
        >
          <a-option value="api">{{
            $t('system.role.permission.tab.api')
          }}</a-option>
          <a-option value="menu">{{
            $t('system.role.permission.tab.menu')
          }}</a-option>
          <a-option value="button">{{
            $t('system.role.permission.tab.button')
          }}</a-option>
        </a-select>
        <a-checkbox
          :model-value="isAllSelected"
          :indeterminate="isIndeterminate"
          @change="handleToggleAll"
        >
          {{ $t('system.role.permission.selectAll') }}
        </a-checkbox>
        <a-tag color="green">
          {{
            $t('system.role.permission.selectedCount', {
              count: selectedKeys.size,
            })
          }}
        </a-tag>
      </div>

      <!-- 权限分组列表 -->
      <a-empty v-if="filteredGroups.length === 0" />
      <a-collapse
        v-else
        :default-active-key="activeGroupKeys"
        :bordered="false"
        class="permission-collapse"
      >
        <a-collapse-item
          v-for="group in filteredGroups"
          :key="group.object"
          :header="group.object"
        >
          <template #extra>
            <a-tag size="small">
              {{
                $t('system.role.permission.groupCount', {
                  selected: getGroupSelectedCount(group),
                  total: group.items.length,
                })
              }}
            </a-tag>
          </template>
          <div class="permission-grid">
            <a-checkbox
              v-for="perm in group.items"
              :key="permKey(perm)"
              :model-value="selectedKeys.has(permKey(perm))"
              @change="
                (val: boolean | (string | number | boolean)[]) =>
                  handleToggleOne(perm, Boolean(val))
              "
            >
              <span class="perm-action">{{ perm.action }}</span>
              <a-tag :color="typeColor(perm.type)" size="small">{{
                perm.type
              }}</a-tag>
              <span v-if="perm.description" class="perm-desc">{{
                perm.description
              }}</span>
            </a-checkbox>
          </div>
        </a-collapse-item>
      </a-collapse>

      <a-divider />

      <!-- 自定义权限（用于添加权限库中尚未存在的项） -->
      <a-typography-text bold>
        {{ $t('system.role.permission.addTitle') }}
      </a-typography-text>
      <a-form :model="customForm" layout="inline" style="margin-top: 8px">
        <a-form-item :label="$t('system.role.permission.object')">
          <a-input
            v-model="customForm.object"
            :placeholder="$t('system.role.permission.objectPlaceholder')"
          />
        </a-form-item>
        <a-form-item :label="$t('system.role.permission.action')">
          <a-input
            v-model="customForm.action"
            :placeholder="$t('system.role.permission.actionPlaceholder')"
          />
        </a-form-item>
        <a-form-item :label="$t('system.role.permission.type')">
          <a-select v-model="customForm.type" style="width: 120px">
            <a-option value="api">{{
              $t('system.role.permission.tab.api')
            }}</a-option>
            <a-option value="menu">{{
              $t('system.role.permission.tab.menu')
            }}</a-option>
            <a-option value="button">{{
              $t('system.role.permission.tab.button')
            }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button @click="handleAddCustom">
            <template #icon><icon-plus /></template>
            {{ $t('system.role.permission.addButton') }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, computed, reactive, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import {
    getRolePermissions,
    assignRolePermissions,
    removeRolePermissions,
  } from '@/api/role';
  import { getPermissions } from '@/api/permission';
  import type {
    RoleResponse,
    PermissionResponse,
    PermissionType,
  } from '@/types/api';

  const { t } = useI18n();

  const props = defineProps<{
    visible: boolean;
    role?: RoleResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  // 全部可分配的权限（来自权限库 + 角色已分配中可能不在权限库的兜底项）
  const allPermissions = ref<PermissionResponse[]>([]);
  // 角色已分配的权限快照（用于和保存时的勾选状态做差集）
  const assignedSnapshot = ref<PermissionResponse[]>([]);
  // 当前勾选集合，使用 object|action|type 作为唯一 key
  const selectedKeys = ref<Set<string>>(new Set());

  const loading = ref(false);
  const saving = ref(false);

  const keyword = ref('');
  const typeFilter = ref<PermissionType | undefined>(undefined);

  const customForm = reactive({
    object: '',
    action: '',
    type: 'api' as PermissionType,
  });

  // 生成权限唯一标识
  const permKey = (p: { object: string; action: string; type: string }) =>
    `${p.object}|${p.action}|${p.type}`;

  // 类型对应的颜色，便于区分
  const typeColor = (type: PermissionType): string => {
    if (type === 'api') return 'blue';
    if (type === 'menu') return 'green';
    return 'orange';
  };

  // 按 object 分组的权限列表（已经过搜索/类型过滤）
  interface PermissionGroup {
    object: string;
    items: PermissionResponse[];
  }

  const filteredPermissions = computed<PermissionResponse[]>(() => {
    const kw = keyword.value.trim().toLowerCase();
    return allPermissions.value.filter((p) => {
      if (typeFilter.value && p.type !== typeFilter.value) return false;
      if (!kw) return true;
      return (
        p.object.toLowerCase().includes(kw) ||
        p.action.toLowerCase().includes(kw) ||
        (p.description ?? '').toLowerCase().includes(kw)
      );
    });
  });

  const filteredGroups = computed<PermissionGroup[]>(() => {
    const map = new Map<string, PermissionResponse[]>();
    filteredPermissions.value.forEach((p) => {
      if (!map.has(p.object)) map.set(p.object, []);
      map.get(p.object)!.push(p);
    });
    return Array.from(map.entries())
      .map(([object, items]) => ({
        object,
        items: items.sort((a, b) => a.action.localeCompare(b.action)),
      }))
      .sort((a, b) => a.object.localeCompare(b.object));
  });

  // 默认展开所有分组
  const activeGroupKeys = computed(() =>
    filteredGroups.value.map((g) => g.object)
  );

  // 当前过滤结果中已选中的数量，用于全选 / 半选状态
  const filteredSelectedCount = computed(
    () =>
      filteredPermissions.value.filter((p) =>
        selectedKeys.value.has(permKey(p))
      ).length
  );

  const isAllSelected = computed(
    () =>
      filteredPermissions.value.length > 0 &&
      filteredSelectedCount.value === filteredPermissions.value.length
  );

  const isIndeterminate = computed(
    () =>
      filteredSelectedCount.value > 0 &&
      filteredSelectedCount.value < filteredPermissions.value.length
  );

  const getGroupSelectedCount = (group: PermissionGroup) =>
    group.items.filter((p) => selectedKeys.value.has(permKey(p))).length;

  // 切换单个权限的勾选
  const handleToggleOne = (perm: PermissionResponse, checked: boolean) => {
    const key = permKey(perm);
    const next = new Set(selectedKeys.value);
    if (checked) {
      next.add(key);
    } else {
      next.delete(key);
    }
    selectedKeys.value = next;
  };

  // 全选 / 全不选（仅作用于当前过滤结果）
  const handleToggleAll = (val: boolean | (string | number | boolean)[]) => {
    const checked = Boolean(val);
    const next = new Set(selectedKeys.value);
    filteredPermissions.value.forEach((p) => {
      const key = permKey(p);
      if (checked) next.add(key);
      else next.delete(key);
    });
    selectedKeys.value = next;
  };

  // 添加权限库中没有的"自定义权限项"，加入全集并自动勾选
  const handleAddCustom = () => {
    const o = customForm.object.trim();
    const a = customForm.action.trim();
    if (!o || !a) {
      Message.warning(t('system.role.permission.objectRequired'));
      return;
    }
    const fake: PermissionResponse = {
      id: -Date.now(),
      role_name: props.role?.name || '',
      domain: 'default',
      object: o,
      action: a,
      type: customForm.type,
      description: '',
    };
    const key = permKey(fake);
    // 若全集中已有相同项，则只勾选；否则追加
    const exists = allPermissions.value.some((p) => permKey(p) === key);
    if (!exists) {
      allPermissions.value = [...allPermissions.value, fake];
    }
    const next = new Set(selectedKeys.value);
    next.add(key);
    selectedKeys.value = next;
    customForm.object = '';
    customForm.action = '';
  };

  // 加载权限库 + 角色已分配权限
  const fetchData = async () => {
    if (!props.role) return;
    loading.value = true;
    try {
      // 并发拉取：权限库 / 已分配
      const [libRes, assignedRes] = await Promise.all([
        getPermissions({ page: 1, page_size: 1000 }),
        getRolePermissions({ role_name: props.role.name }),
      ]);
      const libItems: PermissionResponse[] =
        (libRes.data.data as any)?.items ||
        (libRes.data.data as any)?.data ||
        [];
      const assigned = assignedRes.data.data || [];
      assignedSnapshot.value = assigned;

      // 合并：权限库为基础，把"已分配但库里没有的"项追加进去，避免遗漏
      const map = new Map<string, PermissionResponse>();
      libItems.forEach((p) => map.set(permKey(p), p));
      assigned.forEach((p) => {
        if (!map.has(permKey(p))) map.set(permKey(p), p);
      });
      allPermissions.value = Array.from(map.values());

      // 初始化勾选状态
      selectedKeys.value = new Set(assigned.map((p) => permKey(p)));
    } finally {
      loading.value = false;
    }
  };

  // 批量保存：对比 selectedKeys 与 assignedSnapshot，分别走"分配 / 移除"
  const handleSave = async () => {
    if (!props.role) return;
    const { role } = props;
    const assignedKeys = new Set(assignedSnapshot.value.map((p) => permKey(p)));
    const selected = selectedKeys.value;

    // 需要新增分配的权限
    const toAdd = allPermissions.value.filter(
      (p) => selected.has(permKey(p)) && !assignedKeys.has(permKey(p))
    );
    // 需要移除的权限（按已分配快照来定位 domain，避免 domain 错误）
    const toRemove = assignedSnapshot.value.filter(
      (p) => !selected.has(permKey(p))
    );

    if (toAdd.length === 0 && toRemove.length === 0) {
      Message.info(t('system.role.permission.noChange'));
      emit('update:visible', false);
      return;
    }

    saving.value = true;
    try {
      // 按 domain 分组分别调用移除接口
      const removeByDomain = new Map<string, typeof toRemove>();
      toRemove.forEach((p) => {
        const d = p.domain || 'default';
        if (!removeByDomain.has(d)) removeByDomain.set(d, []);
        removeByDomain.get(d)!.push(p);
      });

      const tasks: Promise<unknown>[] = [];
      if (toAdd.length > 0) {
        tasks.push(
          assignRolePermissions({
            role_name: role.name,
            domain: 'default',
            permissions: toAdd.map((p) => ({
              object: p.object,
              action: p.action,
              type: p.type,
              description: p.description,
            })),
          })
        );
      }
      removeByDomain.forEach((items, domain) => {
        tasks.push(
          removeRolePermissions({
            role_name: role.name,
            domain,
            permissions: items.map((p) => ({
              object: p.object,
              action: p.action,
              type: p.type,
            })),
          })
        );
      });

      await Promise.all(tasks);
      Message.success(
        t('system.role.permission.saveSuccess', {
          add: toAdd.length,
          remove: toRemove.length,
        })
      );
      emit('success');
      emit('update:visible', false);
    } finally {
      saving.value = false;
    }
  };

  const handleCancel = () => {
    emit('update:visible', false);
  };

  // 弹窗打开时拉数据；关闭时重置状态
  watch(
    () => props.visible,
    (val) => {
      if (val) {
        keyword.value = '';
        typeFilter.value = undefined;
        fetchData();
      } else {
        allPermissions.value = [];
        assignedSnapshot.value = [];
        selectedKeys.value = new Set();
      }
    }
  );
</script>

<style lang="less" scoped>
  .role-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;

    .role-display {
      color: var(--color-text-2);
      font-size: 13px;
    }
  }

  .assign-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }

  .permission-collapse {
    max-height: 420px;
    overflow-y: auto;
    background: var(--color-bg-2);
  }

  .permission-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 8px 16px;

    .perm-action {
      margin-right: 6px;
      font-weight: 500;
    }

    .perm-desc {
      margin-left: 6px;
      color: var(--color-text-3);
      font-size: 12px;
    }
  }
</style>
