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
</style>
