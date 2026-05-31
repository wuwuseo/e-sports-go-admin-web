<template>
  <div class="container page-container">
    <a-card class="general-card">
      <template #title>
        <div class="page-header">
          <span>{{ $t('menu.system.dict') }}</span>
          <span class="page-desc">{{ $t('system.dict.description') }}</span>
        </div>
      </template>

      <!-- 加载状态 -->
      <a-spin :loading="loading" style="width: 100%; min-height: 300px">
        <template v-if="!loading">
          <!-- 无数据 -->
          <a-empty v-if="blockKeys.length === 0" />

          <!-- 字典区块列表 -->
          <div v-for="dictType in blockKeys" :key="dictType" class="dict-block">
            <div class="block-header">
              <a-input
                v-model="blockNames[dictType]"
                size="small"
                class="block-title-input"
                :placeholder="$t('system.dict.block.type.placeholder')"
              />
            </div>

            <a-table
              :data="getRows(dictType)"
              :pagination="false"
              :bordered="{ cell: true }"
              size="small"
              style="margin-bottom: 8px"
            >
              <template #columns>
                <a-table-column
                  :title="$t('system.dict.block.key')"
                  data-index="value"
                  :width="300"
                >
                  <template #cell="{ record }">
                    <a-input
                      v-model="record.value"
                      size="small"
                      :placeholder="$t('system.dict.block.key')"
                    />
                  </template>
                </a-table-column>
                <a-table-column
                  :title="$t('system.dict.block.value')"
                  data-index="label"
                >
                  <template #cell="{ record }">
                    <a-input
                      v-model="record.label"
                      size="small"
                      :placeholder="$t('system.dict.block.value')"
                    />
                  </template>
                </a-table-column>
                <a-table-column
                  :title="$t('system.dict.operations')"
                  :width="140"
                  align="center"
                >
                  <template #cell="{ record }">
                    <a-space>
                      <a-button
                        type="text"
                        size="mini"
                        status="danger"
                        @click="removeRow(dictType, record)"
                      >
                        {{ $t('system.dict.block.delete') }}
                      </a-button>
                    </a-space>
                  </template>
                </a-table-column>
              </template>
            </a-table>

            <a-button
              type="outline"
              size="small"
              long
              @click="addRow(dictType)"
            >
              <template #icon><icon-plus /></template>
              {{ $t('system.dict.block.add') }}
            </a-button>
          </div>

          <!-- 底部操作按钮 -->
          <div class="bottom-actions">
            <a-space>
              <a-button type="outline" size="large" @click="addBlock">
                <template #icon><icon-plus /></template>
                {{ $t('system.dict.block.addBlock') }}
              </a-button>
              <a-button
                type="primary"
                size="large"
                :loading="saving"
                @click="handleSave"
              >
                {{ $t('system.dict.save') }}
              </a-button>
              <a-button size="large" @click="handleReset">
                {{ $t('system.dict.reset') }}
              </a-button>
            </a-space>
          </div>
        </template>
      </a-spin>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, onMounted } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import type { DictDataResponse } from '@/types/api';
  import {
    getDictDataList,
    createDictData,
    updateDictData,
    deleteDictData,
  } from '@/api/dict-data';
  import { notifyDictChange } from '@/hooks/dict';

  const { t } = useI18n();

  const loading = ref(true);
  const saving = ref(false);

  // 原始数据副本，用于重置
  const originalData = reactive<Record<string, DictDataResponse[]>>({});

  // 可编辑的行数据，每行额外扩展 originKey / originValue 以追踪是否修改
  interface EditableRow {
    id?: number;
    value: string; // 键名
    label: string; // 键值
    dictType: string;
    originValue: string;
    originLabel: string;
    isNewRow: boolean;
  }

  const editableRows = reactive<Record<string, EditableRow[]>>({});

  // 已删除的行 ID 集合
  const deletedRowIds = reactive<Record<string, Set<number>>>({});

  // 区块顺序列表
  const blockKeys = ref<string[]>([]);

  // 区块名称映射（编辑后的名称）
  const blockNames = reactive<Record<string, string>>({});

  // 获取指定类型的行
  const getRows = (dictType: string): EditableRow[] => {
    return editableRows[dictType] || [];
  };

  // 加载所有字典数据
  const loadData = async () => {
    loading.value = true;
    try {
      const { data } = await getDictDataList({ page: 1, page_size: 100 });
      const all: DictDataResponse[] = data.data?.data || [];

      // 按 dict_type 分组
      const groups: Record<string, DictDataResponse[]> = {};
      all
        .filter((item) => item.dict_type)
        .forEach((item) => {
          if (!groups[item.dict_type]) {
            groups[item.dict_type] = [];
          }
          groups[item.dict_type].push(item);
        });

      // 按创建时间排序
      const keys = Object.keys(groups).sort();
      blockKeys.value = keys;

      // 初始化每个分组的数据
      keys.forEach((dictType) => {
        const items = groups[dictType];
        originalData[dictType] = JSON.parse(JSON.stringify(items));
        blockNames[dictType] = dictType;

        editableRows[dictType] = items.map((item) => ({
          id: item.id,
          value: item.value,
          label: item.label,
          dictType: item.dict_type,
          originValue: item.value,
          originLabel: item.label,
          isNewRow: false,
        }));

        deletedRowIds[dictType] = new Set();
      });
    } catch {
      Message.error(t('system.dict.loadError'));
    } finally {
      loading.value = false;
    }
  };

  // 添加行
  const addRow = (dictType: string) => {
    if (!editableRows[dictType]) {
      editableRows[dictType] = [];
    }
    const nextSort = editableRows[dictType].length;
    editableRows[dictType].push({
      value: '',
      label: '',
      dictType,
      originValue: '',
      originLabel: '',
      isNewRow: true,
    });
  };

  // 删除行（标记删除）
  const removeRow = (dictType: string, record: EditableRow) => {
    const rows = editableRows[dictType];
    if (!rows) return;

    const index = rows.indexOf(record);
    if (index >= 0) {
      rows.splice(index, 1);
    }

    // 如果是已有行，记录 ID 以便后端删除
    if (record.id && !record.isNewRow) {
      if (!deletedRowIds[dictType]) {
        deletedRowIds[dictType] = new Set();
      }
      deletedRowIds[dictType].add(record.id);
    }
  };

  // 新建区块
  const addBlock = () => {
    const newType = `new_dict_type_${Date.now()}`;
    blockKeys.value.push(newType);
    blockNames[newType] = '';
    editableRows[newType] = [];
    deletedRowIds[newType] = new Set();
  };

  // 保存所有修改
  const handleSave = async () => {
    saving.value = true;
    try {
      const promises: Promise<any>[] = [];
      // 收集本次保存涉及到的字典类型，保存成功后广播变更事件，
      // 触发其他页面（如操作日志的模块下拉）通过 useDict 自动刷新
      const affectedDictTypes = new Set<string>();

      blockKeys.value.forEach((dictType) => {
        const rows = editableRows[dictType] || [];
        const delIds = deletedRowIds[dictType];
        const newBlockName = blockNames[dictType];

        // 1. 删除标记的行
        if (delIds && delIds.size > 0) {
          delIds.forEach((id) => {
            promises.push(deleteDictData(id));
          });
          affectedDictTypes.add(dictType);
        }

        // 2. 创建/更新行
        for (let i = 0; i < rows.length; i += 1) {
          const row = rows[i];
          // 跳过全部为空的行
          if (row.value || row.label) {
            if (row.isNewRow) {
              // 新建
              promises.push(
                createDictData({
                  dict_type: newBlockName,
                  label: row.label,
                  value: row.value,
                  sort: i + 1,
                  status: 1,
                })
              );
              affectedDictTypes.add(newBlockName);
            } else if (
              row.value !== row.originValue ||
              row.label !== row.originLabel ||
              newBlockName !== dictType
            ) {
              // 修改（如果区块名称改变，也需要更新）
              if (row.id) {
                promises.push(
                  updateDictData(row.id, {
                    label: row.label,
                    value: row.value,
                    dict_type:
                      newBlockName !== dictType ? newBlockName : undefined,
                  })
                );
                affectedDictTypes.add(dictType);
                if (newBlockName !== dictType) {
                  affectedDictTypes.add(newBlockName);
                }
              }
            }
          }
        }
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        Message.success(t('system.dict.saveSuccess'));
        // 广播字典变更事件，让所有正在使用这些字典的下拉框自动刷新
        affectedDictTypes.forEach((type) => {
          if (type) {
            notifyDictChange(type);
          }
        });
      } else {
        Message.info(t('system.dict.saveSuccess'));
      }

      // 重新加载
      await loadData();
    } catch {
      // error handled by interceptor
    } finally {
      saving.value = false;
    }
  };

  // 重置
  const handleReset = async () => {
    await loadData();
    Message.info(t('system.dict.reset'));
  };

  onMounted(() => {
    loadData();
  });
</script>

<script lang="ts">
  export default {
    name: 'SystemDictData',
  };
</script>

<style scoped lang="less">
  .container {
    :deep(.general-card) {
      .page-header {
        display: flex;
        align-items: baseline;
        gap: 12px;

        .page-desc {
          font-size: 13px;
          font-weight: 400;
          color: var(--color-text-3);
        }
      }
    }

    .dict-block {
      margin-bottom: 28px;
      padding: 16px;
      border: 1px solid var(--color-border-2);
      border-radius: 6px;
      background: var(--color-bg-1);

      .block-header {
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;

        .block-title-input {
          font-size: 15px;
          font-weight: 600;
          max-width: 300px;
        }
      }
    }

    .bottom-actions {
      display: flex;
      justify-content: center;
      padding-top: 16px;
      border-top: 1px solid var(--color-border-2);
    }
  }
</style>
