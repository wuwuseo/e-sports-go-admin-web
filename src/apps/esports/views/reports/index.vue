<template>
  <div class="container page-container">
    <a-card class="general-card" title="报单">
      <a-tabs v-model:active-key="activeTab" @change="loadActive">
        <a-tab-pane key="report" title="客服报单" />
        <a-tab-pane key="customers" title="客户" />
        <a-tab-pane v-if="canReviewAge" key="age-checks" title="年龄资格复核" />
      </a-tabs>
      <a-space class="toolbar">
        <a-button :loading="loading" @click="loadActive">刷新</a-button>
        <a-button
          v-if="activeTab === 'report' && canCreateOrder"
          type="primary"
          @click="orderVisible = true"
          >报单</a-button
        >
        <a-button
          v-if="activeTab === 'report' && canCreateOrder"
          @click="openBatch"
          >批量报单</a-button
        >
        <a-button
          v-if="activeTab === 'customers' && canCreateCustomer"
          type="primary"
          @click="customerVisible = true"
          >新增客户</a-button
        >
      </a-space>

      <a-table
        v-if="activeTab === 'report'"
        :data="orders"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="order_no" title="订单号" />
          <a-table-column data-index="customer_id" title="客户 ID" />
          <a-table-column data-index="sku_id" title="商品 ID" />
          <a-table-column data-index="quantity" title="份数" />
          <a-table-column title="应付金额">
            <template #cell="{ record }">{{
              money(record.payable_cents)
            }}</template>
          </a-table-column>
          <a-table-column data-index="payment_status" title="支付状态" />
          <a-table-column data-index="fulfillment_status" title="履约状态" />
        </template>
      </a-table>
      <a-table
        v-else-if="activeTab === 'customers'"
        :data="customers"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="id" title="ID" />
          <a-table-column data-index="display_name" title="客户名称" />
          <a-table-column data-index="age_status" title="年龄核验" />
          <a-table-column v-if="canSubmitAge" title="操作">
            <template #cell="{ record }">
              <a-button type="text" @click="openAgeCheck(record)"
                >提交核验</a-button
              >
            </template>
          </a-table-column>
        </template>
      </a-table>
      <a-table
        v-else
        :data="ageChecks"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="customer_name" title="客户" />
          <a-table-column data-index="claimed_age_status" title="提交结论" />
          <a-table-column
            data-index="requested_by_admin_id"
            title="提交人 ID"
          />
          <a-table-column data-index="created_at" title="提交时间" />
          <a-table-column title="操作">
            <template #cell="{ record }">
              <a-button
                type="text"
                @click="openEvidence(record.evidence_attachment_id)"
                >查看证据</a-button
              >
              <a-button type="text" @click="openReview(record)">复核</a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="customerVisible"
      title="新增客户"
      @ok="saveCustomer"
    >
      <a-form :model="customerForm">
        <a-form-item label="客户名称" required>
          <a-input v-model="customerForm.display_name" :max-length="120" />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal v-model:visible="orderVisible" title="客服报单" @ok="saveOrder">
      <a-form :model="orderForm">
        <a-form-item label="客户" required>
          <a-select v-model="orderForm.customer_id">
            <a-option
              v-for="item in customers"
              :key="item.id"
              :value="item.id"
              >{{ item.display_name }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="商品" required>
          <a-select v-model="orderForm.sku_id">
            <a-option
              v-for="item in skus.filter((sku) => sku.status === 'on_sale')"
              :key="item.id"
              :value="item.id"
              >{{ item.title }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="购买份数" required>
          <a-input-number v-model="orderForm.quantity" :min="1" :max="1000" />
        </a-form-item>
        <a-form-item label="指定陪玩（可选）">
          <a-input-number v-model="preferredPlayerId" :min="0" />
          <a-typography-text type="secondary">
            填陪玩档案
            ID；指定后订单直接由客服指派该陪玩、不进入优先通知窗口（§5.4），陪玩须资质合格。
          </a-typography-text>
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      v-model:visible="batchVisible"
      title="批量报单"
      :footer="false"
      width="820px"
    >
      <a-space direction="vertical" fill>
        <a-textarea
          v-model="batchImportText"
          placeholder="粘贴导入（可选）：每行一条「客户ID, 商品ID, 份数」，支持逗号/空格/Tab 分隔"
          :auto-size="{ minRows: 2, maxRows: 4 }"
        />
        <a-space>
          <a-button @click="importBatchRows">解析导入</a-button>
          <a-button @click="addBatchRow">添加一行</a-button>
        </a-space>
        <a-table
          :data="batchRows"
          row-key="key"
          :pagination="false"
          size="small"
        >
          <template #columns>
            <a-table-column title="客户">
              <template #cell="{ record }">
                <a-select
                  v-model="record.customer_id"
                  :style="{ width: '180px' }"
                  placeholder="选择客户"
                >
                  <a-option
                    v-for="item in customers"
                    :key="item.id"
                    :value="item.id"
                    >{{ item.display_name }}</a-option
                  >
                </a-select>
              </template>
            </a-table-column>
            <a-table-column title="商品">
              <template #cell="{ record }">
                <a-select
                  v-model="record.sku_id"
                  :style="{ width: '220px' }"
                  placeholder="选择商品"
                >
                  <a-option
                    v-for="item in onSaleSkus"
                    :key="item.id"
                    :value="item.id"
                    >{{ item.title }}</a-option
                  >
                </a-select>
              </template>
            </a-table-column>
            <a-table-column title="份数" :width="120">
              <template #cell="{ record }">
                <a-input-number
                  v-model="record.quantity"
                  :min="1"
                  :max="1000"
                  :style="{ width: '100px' }"
                />
              </template>
            </a-table-column>
            <a-table-column title="操作" :width="90">
              <template #cell="{ rowIndex }">
                <a-button
                  type="text"
                  status="danger"
                  @click="removeBatchRow(rowIndex)"
                  >移除</a-button
                >
              </template>
            </a-table-column>
          </template>
        </a-table>
        <a-space>
          <a-button
            type="primary"
            :loading="batchSubmitting"
            @click="submitBatch"
            >逐行提交</a-button
          >
          <a-button @click="batchVisible = false">关闭</a-button>
        </a-space>
        <a-alert v-if="batchResults.length" type="info">
          <div
            v-for="result in batchResults"
            :key="result.key"
            :class="result.ok ? 'batch-ok' : 'batch-fail'"
          >
            第 {{ result.row }} 行（客户 #{{ result.customerId }} / 商品 #{{
              result.skuId
            }}）：{{ result.ok ? '成功' : '失败' }} ——
            {{ result.message }}
          </div>
        </a-alert>
      </a-space>
    </a-modal>
    <a-modal
      v-model:visible="ageVisible"
      title="提交客户年龄核验"
      @ok="saveAgeCheck"
    >
      <a-form :model="ageForm">
        <a-form-item label="客户">{{ ageCustomerName }}</a-form-item>
        <a-form-item label="核验结论" required>
          <a-radio-group v-model="ageForm.claimed_age_status">
            <a-radio value="adult">成年</a-radio>
            <a-radio value="minor">未成年</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="证据附件" required>
          <AttachmentSelector
            :model-value="selectedEvidence"
            accept="image/png,image/jpeg,application/pdf"
            default-directory="private/esports/age-checks"
            @select="selectEvidence"
          />
          <span v-if="selectedEvidence">附件 #{{ selectedEvidence.id }}</span>
        </a-form-item>
        <div>提交后须由另一名有复核权限的员工确认，客户资格才会更新。</div>
      </a-form>
    </a-modal>
    <a-modal
      v-model:visible="reviewVisible"
      title="复核客户年龄资格"
      @ok="saveAgeReview"
    >
      <a-form :model="reviewForm">
        <a-form-item label="核验 ID">{{ reviewForm.id }}</a-form-item>
        <a-form-item label="决定" required>
          <a-radio-group v-model="reviewForm.decision">
            <a-radio value="approve">批准</a-radio>
            <a-radio value="reject">驳回</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="复核说明" required>
          <a-textarea v-model="reviewForm.review_note" :max-length="500" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import AttachmentSelector from '@/components/attachment-selector/index.vue';
  import { resolveAttachmentAccessUrl } from '@/services/attachment-access.service';
  import type { AttachmentResponse } from '@/types/api';
  import {
    createCustomer,
    createOrder,
    listCustomers,
    listOrders,
    listSkus,
    listPendingAgeChecks,
    reviewAgeCheck,
    submitAgeCheck,
  } from '../../api';
  import type {
    AgeCheck,
    EsportsCustomer,
    EsportsOrder,
    EsportsSku,
    OrderInput,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canCreateCustomer = computed(() =>
    hasButtonPermission('esports:customers:add')
  );
  const canCreateOrder = computed(() =>
    hasButtonPermission('esports:orders:add')
  );
  const canSubmitAge = computed(() =>
    hasButtonPermission('esports:age_checks:add')
  );
  const canReviewAge = computed(() =>
    hasButtonPermission('esports:age_checks:approve')
  );
  const activeTab = ref('report');
  const loading = ref(false);
  const customerVisible = ref(false);
  const orderVisible = ref(false);
  const ageVisible = ref(false);
  const reviewVisible = ref(false);
  const skus = ref<EsportsSku[]>([]);
  const customers = ref<EsportsCustomer[]>([]);
  const orders = ref<EsportsOrder[]>([]);
  const ageChecks = ref<AgeCheck[]>([]);
  const ageCustomerName = ref('');
  const selectedEvidence = ref<AttachmentResponse | null>(null);
  const ageForm = reactive({
    customer_id: 0,
    claimed_age_status: 'adult' as 'adult' | 'minor',
  });
  const reviewForm = reactive({
    id: 0,
    customer_version: 0,
    decision: 'approve' as 'approve' | 'reject',
    review_note: '',
  });
  const customerForm = reactive({ display_name: '' });
  const orderForm = reactive<OrderInput>({
    customer_id: 0,
    sku_id: 0,
    quantity: 1,
  });
  const orderRequestKey = ref(crypto.randomUUID());
  // 指定陪玩（§5.4）：0 表示不指定，由客服指派。
  const preferredPlayerId = ref<number>(0);
  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  // 透出后端返回的中文错误信息（如客户归属校验），取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  // ── 批量报单（复用 POST /admin/orders，逐行独立幂等键，失败行不阻塞成功行） ──
  interface BatchRow {
    key: string;
    customer_id: number;
    sku_id: number;
    quantity: number;
  }
  interface BatchResult {
    key: string;
    row: number;
    customerId: number;
    skuId: number;
    ok: boolean;
    message: string;
  }
  const onSaleSkus = computed(() =>
    skus.value.filter((sku) => sku.status === 'on_sale')
  );
  const batchVisible = ref(false);
  const batchImportText = ref('');
  const batchSubmitting = ref(false);
  const batchResults = ref<BatchResult[]>([]);
  const batchRows = ref<BatchRow[]>([]);
  const newBatchRow = (): BatchRow => ({
    key: crypto.randomUUID(),
    customer_id: 0,
    sku_id: 0,
    quantity: 1,
  });

  function openBatch() {
    batchRows.value = [newBatchRow()];
    batchResults.value = [];
    batchImportText.value = '';
    batchVisible.value = true;
  }

  function addBatchRow() {
    batchRows.value.push(newBatchRow());
  }

  function removeBatchRow(rowIndex: number) {
    if (batchRows.value.length <= 1) {
      batchRows.value = [newBatchRow()];
      return;
    }
    batchRows.value.splice(rowIndex, 1);
  }

  function importBatchRows() {
    const lines = batchImportText.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    let imported = 0;
    lines.forEach((line) => {
      const parts = line.split(/[,，\s\t]+/).filter(Boolean);
      if (parts.length < 3) {
        Message.warning(`无法解析（需「客户ID 商品ID 份数」三列）：${line}`);
        return;
      }
      const customerId = Number(parts[0]);
      const skuId = Number(parts[1]);
      const quantity = Number(parts[2]);
      if (
        !Number.isInteger(customerId) ||
        customerId < 1 ||
        !Number.isInteger(skuId) ||
        skuId < 1 ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        Message.warning(`无效数据（ID/份数须为正整数）：${line}`);
        return;
      }
      batchRows.value.push({
        key: crypto.randomUUID(),
        customer_id: customerId,
        sku_id: skuId,
        quantity,
      });
      imported += 1;
    });
    if (imported > 0) batchImportText.value = '';
  }

  async function loadActive() {
    loading.value = true;
    try {
      if (activeTab.value === 'report') {
        const [orderResult, customerResult, skuResult] = await Promise.all([
          listOrders(),
          listCustomers(),
          listSkus(),
        ]);
        orders.value = orderResult.data.data || [];
        customers.value = customerResult.data.data || [];
        skus.value = skuResult.data.data || [];
      } else if (activeTab.value === 'customers') {
        customers.value = (await listCustomers()).data.data || [];
      } else {
        ageChecks.value = (await listPendingAgeChecks()).data.data || [];
      }
    } catch {
      Message.error('加载失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  async function submitBatch() {
    const rows = batchRows.value;
    if (rows.length === 0) {
      Message.warning('请至少添加一行');
      return;
    }
    const invalid = rows.some(
      (row) => row.customer_id < 1 || row.sku_id < 1 || row.quantity < 1
    );
    if (invalid) {
      Message.warning('存在未填写完整或份数无效的行，请检查后重试');
      return;
    }
    batchSubmitting.value = true;
    batchResults.value = [];
    let success = 0;
    let fail = 0;
    // 逐行提交：每行独立幂等键，单行失败不阻塞其它行；后端对客户归属做校验。
    const settled = await Promise.allSettled(
      rows.map((row) =>
        createOrder(
          {
            customer_id: row.customer_id,
            sku_id: row.sku_id,
            quantity: row.quantity,
          },
          crypto.randomUUID()
        )
      )
    );
    settled.forEach((res, i) => {
      const row = rows[i];
      if (res.status === 'fulfilled') {
        success += 1;
        batchResults.value.push({
          key: row.key,
          row: i + 1,
          customerId: row.customer_id,
          skuId: row.sku_id,
          ok: true,
          message: '报单成功',
        });
      } else {
        fail += 1;
        batchResults.value.push({
          key: row.key,
          row: i + 1,
          customerId: row.customer_id,
          skuId: row.sku_id,
          ok: false,
          message: errorText(
            res.reason,
            '报单失败，请检查支付时限、名额与客户归属'
          ),
        });
      }
    });
    batchSubmitting.value = false;
    Message.success(`批量报单完成：成功 ${success} 笔，失败 ${fail} 笔`);
    await loadActive();
  }

  async function saveCustomer() {
    if (!customerForm.display_name.trim()) return;
    try {
      await createCustomer(customerForm.display_name.trim());
      customerVisible.value = false;
      customerForm.display_name = '';
      await loadActive();
    } catch {
      Message.error('创建客户失败');
    }
  }

  async function saveOrder() {
    if (!orderForm.customer_id || !orderForm.sku_id || orderForm.quantity < 1)
      return;
    try {
      const payload: OrderInput = { ...orderForm };
      if (preferredPlayerId.value > 0) {
        payload.preferred_player_id = preferredPlayerId.value;
      }
      await createOrder(payload, orderRequestKey.value);
      orderRequestKey.value = crypto.randomUUID();
      preferredPlayerId.value = 0;
      orderVisible.value = false;
      await loadActive();
    } catch {
      Message.error('报单失败，请检查支付时限配置、可售名额与指定陪玩资质');
    }
  }

  function openAgeCheck(customer: EsportsCustomer) {
    ageForm.customer_id = customer.id;
    ageForm.claimed_age_status = 'adult';
    ageCustomerName.value = customer.display_name;
    selectedEvidence.value = null;
    ageVisible.value = true;
  }

  function selectEvidence(value: AttachmentResponse | AttachmentResponse[]) {
    selectedEvidence.value = Array.isArray(value) ? value[0] || null : value;
  }

  async function saveAgeCheck() {
    if (!selectedEvidence.value) {
      Message.error('请先上传证据附件');
      return;
    }
    try {
      await submitAgeCheck(
        ageForm.customer_id,
        ageForm.claimed_age_status,
        selectedEvidence.value.id
      );
      ageVisible.value = false;
      Message.success('已提交，等待独立复核');
      await loadActive();
    } catch {
      Message.error('提交失败，请检查附件归属或是否已有待复核记录');
    }
  }

  async function openEvidence(attachmentId: number) {
    try {
      const access = await resolveAttachmentAccessUrl(attachmentId);
      window.open(access, '_blank', 'noopener,noreferrer');
    } catch {
      Message.error('无法打开证据附件');
    }
  }

  function openReview(check: AgeCheck) {
    reviewForm.id = check.id;
    reviewForm.customer_version = check.customer_version;
    reviewForm.decision = 'approve';
    reviewForm.review_note = '';
    reviewVisible.value = true;
  }

  async function saveAgeReview() {
    if (!reviewForm.review_note.trim()) {
      Message.error('请填写复核说明');
      return;
    }
    try {
      await reviewAgeCheck(reviewForm.id, {
        decision: reviewForm.decision,
        review_note: reviewForm.review_note.trim(),
        expected_customer_version: reviewForm.customer_version,
      });
      reviewVisible.value = false;
      await loadActive();
    } catch {
      Message.error('复核失败，请刷新后重试；提交人不能自审');
    }
  }

  onMounted(loadActive);
</script>

<style scoped>
  .toolbar {
    margin-bottom: 16px;
  }

  .batch-ok {
    color: var(--color-success-6);
  }

  .batch-fail {
    color: var(--color-danger-6);
  }
</style>
