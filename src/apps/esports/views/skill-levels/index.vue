<template>
  <div class="container page-container">
    <a-card class="general-card" title="技能等级（陪玩等级）">
      <a-alert v-if="defaulted" type="warning" class="banner"
        >当前展示的是内置默认四级（尚未保存过自定义配置），保存后即生效并用于商品门槛
        / 考核 / 派单比较。</a-alert
      >
      <a-space class="toolbar">
        <a-button :loading="loading" @click="load">刷新</a-button>
        <a-button
          v-if="canManage"
          type="outline"
          :disabled="rows.length >= 12"
          @click="addRow"
          >添加等级</a-button
        >
        <a-button
          v-if="canManage"
          type="primary"
          :loading="saving"
          @click="save"
          >保存</a-button
        >
      </a-space>

      <a-table
        :data="rows"
        :loading="loading"
        row-key="rowId"
        :pagination="false"
      >
        <template #columns>
          <a-table-column title="序" :width="70">
            <template #cell="{ rowIndex }">{{ rowIndex }}</template>
          </a-table-column>
          <a-table-column title="编码" :width="260">
            <template #cell="{ record }">
              <a-input
                v-if="canManage"
                v-model="record.code"
                :max-length="32"
                placeholder="小写字母开头，如 novice"
              />
              <span v-else>{{ record.code }}</span>
            </template>
          </a-table-column>
          <a-table-column title="显示名" :width="260">
            <template #cell="{ record }">
              <a-input
                v-if="canManage"
                v-model="record.name"
                :max-length="32"
                placeholder="如 新手"
              />
              <span v-else>{{ record.name }}</span>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="220">
            <template #cell="{ rowIndex }">
              <template v-if="canManage">
                <a-button
                  type="text"
                  :disabled="rowIndex === 0"
                  @click="move(rowIndex, -1)"
                  >上移</a-button
                >
                <a-button
                  type="text"
                  :disabled="rowIndex === rows.length - 1"
                  @click="move(rowIndex, 1)"
                  >下移</a-button
                >
                <a-popconfirm
                  content="删除该等级？已有数据里引用该编码的商品门槛 / 陪玩档案将视为失效档（接不了任何已知门槛的单）。"
                  @ok="removeRow(rowIndex)"
                >
                  <a-button type="text" status="danger">删除</a-button>
                </a-popconfirm>
              </template>
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>

      <div class="hint">
        等级从上到下由低到高，序号越小档位越低；考核升级 / 派单比较 / 商品门槛
        均按此处顺序进行。编码保存后用于商品门槛、订单快照与陪玩档案落库，改码
        等于换档（历史引用按失效档处理），改名不影响已有数据。1~12
        档，编码须为小写字母开头的字母数字下划线且不重复。
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import { fetchSkillLevels } from '../../skill-levels';
  import { getAdminSkillLevels, saveAdminSkillLevels } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canManage = computed(() =>
    hasButtonPermission('esports:skill_levels:manage')
  );

  interface SkillRow {
    rowId: number;
    code: string;
    name: string;
    [key: string]: unknown;
  }

  const loading = ref(false);
  const saving = ref(false);
  const defaulted = ref(false);
  const rows = ref<SkillRow[]>([]);
  let rowSeq = 0;

  function nextRowId() {
    rowSeq += 1;
    return rowSeq;
  }

  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  async function load() {
    loading.value = true;
    try {
      const { data } = await getAdminSkillLevels();
      const items = data.data?.items ?? [];
      defaulted.value = data.data?.defaulted ?? false;
      rows.value = items.map((item) => ({
        rowId: nextRowId(),
        code: item.code,
        name: item.name,
      }));
    } catch (err) {
      Message.error(errorText(err, '加载技能等级失败，请稍后重试'));
    } finally {
      loading.value = false;
    }
  }

  function addRow() {
    rows.value.push({ rowId: nextRowId(), code: '', name: '' });
  }

  function removeRow(index: number) {
    rows.value.splice(index, 1);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.value.length) return;
    const [row] = rows.value.splice(index, 1);
    rows.value.splice(target, 0, row);
  }

  async function save() {
    const items = rows.value.map((row) => ({
      code: row.code.trim(),
      name: row.name.trim(),
    }));
    if (items.length < 1) {
      Message.warning('至少保留 1 个等级');
      return;
    }
    if (items.some((item) => !item.code || !item.name)) {
      Message.warning('请补全每一行的编码与显示名');
      return;
    }
    saving.value = true;
    try {
      await saveAdminSkillLevels(items);
      // 公开读接口有模块级缓存（表单选项与 H5 文案共用），保存后强制刷新。
      await fetchSkillLevels(true);
      Message.success('已保存技能等级');
      await load();
    } catch (err) {
      Message.error(errorText(err, '保存失败：编码重复、格式无效或超过 12 档'));
    } finally {
      saving.value = false;
    }
  }

  onMounted(load);
</script>

<style scoped>
  .banner {
    margin-bottom: 16px;
  }

  .toolbar {
    margin-bottom: 16px;
  }

  .hint {
    margin-top: 4px;
    color: var(--color-text-3);
    font-size: 12px;
  }
</style>
