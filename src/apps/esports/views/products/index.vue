<template>
  <div class="container page-container">
    <a-card class="general-card" title="商品">
      <a-tabs v-model:active-key="activeTab" @change="loadActive">
        <a-tab-pane key="skus" title="商品/规格" />
        <a-tab-pane key="categories" title="产品分类" />
      </a-tabs>
      <a-space class="toolbar">
        <a-button :loading="loading" @click="loadActive">刷新</a-button>
        <a-button
          v-if="activeTab === 'skus' && canAddSku"
          type="primary"
          @click="openSku()"
          >新增商品</a-button
        >
        <a-button
          v-if="activeTab === 'categories' && canManageCategory"
          type="primary"
          @click="openCategory()"
          >新增分类</a-button
        >
      </a-space>

      <a-table
        v-if="activeTab === 'skus'"
        :data="skus"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="code" title="编码" />
          <a-table-column data-index="title" title="商品名" />
          <a-table-column title="分类">
            <template #cell="{ record }">{{
              categoryName(record.category_id)
            }}</template>
          </a-table-column>
          <a-table-column title="每份标价">
            <template #cell="{ record }">{{
              money(record.unit_price_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="一份服务量">
            <template #cell="{ record }"
              >{{ record.service_units }}
              {{ record.service_unit_name }}</template
            >
          </a-table-column>
          <a-table-column data-index="required_seats" title="席位" />
          <a-table-column title="名额（已售/总量）">
            <template #cell="{ record }">{{ quotaText(record) }}</template>
          </a-table-column>
          <a-table-column data-index="sort_order" title="排序" />
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'on_sale' ? 'green' : 'gray'">{{
                statusText(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column v-if="canEditSku" title="操作">
            <template #cell="{ record }">
              <a-button type="text" @click="openSku(record)">编辑</a-button>
              <a-button
                v-if="record.status !== 'off_sale'"
                type="text"
                status="warning"
                @click="toggleSale(record, 'off_sale')"
                >下架</a-button
              >
              <a-button
                v-else
                type="text"
                @click="toggleSale(record, 'on_sale')"
                >上架</a-button
              >
            </template>
          </a-table-column>
        </template>
      </a-table>

      <a-table
        v-else
        :data="categories"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="code" title="分类编码" />
          <a-table-column data-index="name" title="分类名" />
          <a-table-column data-index="game" title="关联游戏" />
          <a-table-column data-index="sort_order" title="排序" />
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'enabled' ? 'green' : 'gray'">{{
                record.status === 'enabled' ? '启用' : '停用'
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column v-if="canManageCategory" title="操作">
            <template #cell="{ record }">
              <a-button type="text" @click="openCategory(record)"
                >编辑</a-button
              >
              <a-popconfirm
                content="确认删除该分类？被商品引用的分类无法删除。"
                @ok="removeCategory(record)"
              >
                <a-button type="text" status="danger">删除</a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="skuVisible"
      :title="skuForm.id ? '编辑商品' : '新增商品'"
      @ok="saveSku"
    >
      <a-form :model="skuForm">
        <a-form-item label="编码" required>
          <a-input v-model="skuForm.code" :disabled="Boolean(skuForm.id)" />
        </a-form-item>
        <a-form-item label="商品名" required>
          <a-input v-model="skuForm.title" :max-length="160" />
        </a-form-item>
        <a-form-item label="产品分类">
          <a-select
            :model-value="skuForm.category_id ?? undefined"
            allow-clear
            @update:model-value="onCategoryChange"
          >
            <a-option
              v-for="item in categories.filter((c) => c.status === 'enabled')"
              :key="item.id"
              :value="item.id"
              >{{ item.name }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="服务类型" required>
          <a-select v-model="skuForm.service_type">
            <a-option value="play">陪玩</a-option>
            <a-option value="teaching">教学</a-option>
            <a-option value="entertainment">娱乐</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="每份标价（分）" required>
          <a-input-number v-model="skuForm.unit_price_cents" :min="1" />
        </a-form-item>
        <a-form-item label="一份服务量" required>
          <a-input-number v-model="skuForm.service_units" :min="1" />
        </a-form-item>
        <a-form-item label="服务单位" required>
          <a-input v-model="skuForm.service_unit_name" :max-length="32" />
        </a-form-item>
        <a-form-item label="必需席位" required>
          <a-input-number v-model="skuForm.required_seats" :min="1" />
        </a-form-item>
        <a-form-item label="名额总量（-1 不限量）" required>
          <a-input-number v-model="skuForm.quota_total" :min="-1" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="skuForm.sort_order" />
        </a-form-item>
        <a-form-item label="服务说明">
          <a-textarea v-model="skuForm.description" :max-length="500" />
        </a-form-item>
        <a-form-item label="状态" required>
          <a-select v-model="skuForm.status">
            <a-option value="draft">草稿</a-option>
            <a-option value="on_sale">上架</a-option>
            <a-option value="off_sale">下架</a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="categoryVisible"
      :title="categoryForm.id ? '编辑分类' : '新增分类'"
      @ok="saveCategory"
    >
      <a-form :model="categoryForm">
        <a-form-item label="分类编码" required>
          <a-input
            v-model="categoryForm.code"
            :disabled="Boolean(categoryForm.id)"
          />
        </a-form-item>
        <a-form-item label="分类名" required>
          <a-input v-model="categoryForm.name" :max-length="120" />
        </a-form-item>
        <a-form-item label="关联游戏">
          <a-input v-model="categoryForm.game" :max-length="120" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="categoryForm.sort_order" />
        </a-form-item>
        <a-form-item label="状态" required>
          <a-select v-model="categoryForm.status">
            <a-option value="enabled">启用</a-option>
            <a-option value="disabled">停用</a-option>
          </a-select>
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
    createCategory,
    createSku,
    deleteCategory,
    listCategories,
    listSkus,
    updateCategory,
    updateSku,
  } from '../../api';
  import type {
    CategoryInput,
    EsportsProductCategory,
    EsportsSku,
    SkuInput,
    SkuUpdateInput,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canAddSku = computed(() => hasButtonPermission('esports:skus:add'));
  const canEditSku = computed(() => hasButtonPermission('esports:skus:edit'));
  const canManageCategory = computed(() =>
    hasButtonPermission('esports:categories:manage')
  );

  const activeTab = ref('skus');
  const loading = ref(false);
  const skus = ref<EsportsSku[]>([]);
  const categories = ref<EsportsProductCategory[]>([]);
  const skuVisible = ref(false);
  const categoryVisible = ref(false);

  const emptySkuForm = (): SkuInput & { id: number } => ({
    id: 0,
    code: '',
    title: '',
    service_type: 'play',
    category_id: null,
    description: '',
    unit_price_cents: 1,
    service_units: 1,
    service_unit_name: '小时',
    required_seats: 1,
    quota_total: -1,
    sort_order: 0,
    status: 'draft',
  });
  const skuForm = reactive(emptySkuForm());
  // a-select 的 modelValue 不接受 null，这里把「清空」的 undefined 转回 null 以匹配 SkuInput 类型。
  function onCategoryChange(value: unknown) {
    skuForm.category_id = typeof value === 'number' ? value : null;
  }
  const emptyCategoryForm = (): CategoryInput & { id: number } => ({
    id: 0,
    code: '',
    name: '',
    game: '',
    sort_order: 0,
    status: 'enabled',
  });
  const categoryForm = reactive(emptyCategoryForm());

  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  const statusText = (status: EsportsSku['status']) =>
    ({ on_sale: '上架', draft: '草稿', off_sale: '下架' }[status]);
  const categoryName = (id: number | null) =>
    categories.value.find((item) => item.id === id)?.name || '未分类';
  const quotaText = (record: EsportsSku) =>
    record.quota_total === -1
      ? `不限（已售 ${record.quota_sold}）`
      : `${record.quota_sold}/${record.quota_total}`;

  async function loadActive() {
    loading.value = true;
    try {
      if (activeTab.value === 'skus') {
        const [skuResult, categoryResult] = await Promise.all([
          listSkus(),
          listCategories(),
        ]);
        skus.value = skuResult.data.data || [];
        categories.value = categoryResult.data.data || [];
      } else {
        categories.value = (await listCategories()).data.data || [];
      }
    } catch {
      Message.error('加载失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  function openSku(record?: EsportsSku) {
    Object.assign(skuForm, record ? { ...record } : emptySkuForm());
    skuVisible.value = true;
  }

  // 编辑时不提交 code（后端以创建时的编码为准）。
  const skuPayload = (): SkuUpdateInput => ({
    title: skuForm.title,
    service_type: skuForm.service_type,
    category_id: skuForm.category_id,
    description: skuForm.description,
    unit_price_cents: skuForm.unit_price_cents,
    service_units: skuForm.service_units,
    service_unit_name: skuForm.service_unit_name,
    required_seats: skuForm.required_seats,
    quota_total: skuForm.quota_total,
    sort_order: skuForm.sort_order,
    status: skuForm.status,
  });

  async function saveSku() {
    if (!skuForm.code.trim() || !skuForm.title.trim()) {
      Message.error('请填写商品编码与名称');
      return;
    }
    try {
      if (skuForm.id) {
        await updateSku(skuForm.id, skuPayload());
      } else {
        await createSku({ code: skuForm.code, ...skuPayload() });
      }
      skuVisible.value = false;
      Message.success('已保存');
      await loadActive();
    } catch {
      Message.error('保存商品失败，请检查名额是否低于已占用数量');
    }
  }

  // 上下架复用编辑接口，仅切换状态字段。
  async function toggleSale(record: EsportsSku, status: EsportsSku['status']) {
    try {
      await updateSku(record.id, {
        title: record.title,
        service_type: record.service_type,
        category_id: record.category_id,
        description: record.description,
        unit_price_cents: record.unit_price_cents,
        service_units: record.service_units,
        service_unit_name: record.service_unit_name,
        required_seats: record.required_seats,
        quota_total: record.quota_total,
        sort_order: record.sort_order,
        status,
      });
      await loadActive();
    } catch {
      Message.error('上下架失败，请稍后重试');
    }
  }

  function openCategory(record?: EsportsProductCategory) {
    Object.assign(categoryForm, record ? { ...record } : emptyCategoryForm());
    categoryVisible.value = true;
  }

  async function saveCategory() {
    if (!categoryForm.code.trim() || !categoryForm.name.trim()) {
      Message.error('请填写分类编码与名称');
      return;
    }
    const payload: CategoryInput = {
      code: categoryForm.code,
      name: categoryForm.name,
      game: categoryForm.game,
      sort_order: categoryForm.sort_order,
      status: categoryForm.status,
    };
    try {
      if (categoryForm.id) {
        await updateCategory(categoryForm.id, payload);
      } else {
        await createCategory(payload);
      }
      categoryVisible.value = false;
      Message.success('已保存');
      await loadActive();
    } catch {
      Message.error('保存分类失败，编码可能已存在');
    }
  }

  async function removeCategory(record: EsportsProductCategory) {
    try {
      await deleteCategory(record.id);
      Message.success('已删除');
      await loadActive();
    } catch {
      Message.error('删除失败，分类可能已被商品引用');
    }
  }

  onMounted(loadActive);
</script>

<style scoped>
  .toolbar {
    margin-bottom: 16px;
  }
</style>
