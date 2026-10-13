<template>
  <div class="container page-container">
    <a-card class="general-card" title="储值卡">
      <a-space class="toolbar" wrap>
        <a-button :loading="loading" @click="loadCards">刷新</a-button>
        <a-select
          v-model="filterStatus"
          placeholder="按状态筛选"
          allow-clear
          :style="{ width: '150px' }"
          @change="loadCards"
        >
          <a-option
            v-for="option in statusOptions"
            :key="option.value"
            :value="option.value"
            >{{ option.label }}</a-option
          >
        </a-select>
        <a-input-number
          v-model="filterCustomerId"
          placeholder="按客户 ID 筛选"
          :min="0"
          :style="{ width: '170px' }"
        />
        <a-checkbox v-model="onlyRemind" @change="loadCards"
          >只看临近到期</a-checkbox
        >
        <a-button v-if="canManage" type="primary" @click="openCreate"
          >开卡</a-button
        >
      </a-space>

      <a-table
        :data="cards"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column data-index="card_no" title="卡号" />
          <a-table-column
            data-index="customer_id"
            title="客户 ID"
            :width="90"
          />
          <a-table-column title="来源支付">
            <template #cell="{ record }">{{
              channelLabel(record.payment_channel)
            }}</template>
          </a-table-column>
          <a-table-column title="本金余额">
            <template #cell="{ record }">{{
              moneyText(record.principal_remaining_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="赠送余额">
            <template #cell="{ record }">{{
              moneyText(record.bonus_remaining_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="卡内合计">
            <template #cell="{ record }">{{
              moneyText(record.balance_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="有效期">
            <template #cell="{ record }">{{
              fmtDate(record.valid_until)
            }}</template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)">{{
                statusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="100">
            <template #cell="{ record }">
              <a-button type="text" @click="openDetail(record)">详情</a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="createVisible"
      title="开卡"
      :ok-loading="creating"
      @ok="submitCreate"
      @cancel="createVisible = false"
    >
      <a-form :model="createForm">
        <a-form-item label="客户 ID" required>
          <a-input-number v-model="createForm.customerId" :min="1" />
        </a-form-item>
        <a-form-item label="开卡来源">
          <a-select v-model="createForm.source">
            <a-option value="staff">客服代办</a-option>
            <a-option value="self">客户自助</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="来源支付" required>
          <a-select v-model="createForm.paymentChannel">
            <a-option
              v-for="option in channelOptions"
              :key="option.value"
              :value="option.value"
              >{{ option.label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="createForm.paymentChannel !== 'customer_balance'"
          label="支付凭证号"
          required
        >
          <a-input v-model="createForm.paymentRef" :max-length="128" />
        </a-form-item>
        <a-form-item label="开卡本金（分）" required>
          <a-input-number v-model="createForm.principalCents" :min="1" />
        </a-form-item>
        <a-form-item
          v-if="createForm.paymentChannel !== 'customer_balance'"
          label="赠送权益（分）"
        >
          <a-input-number v-model="createForm.bonusCents" :min="0" />
        </a-form-item>
        <a-form-item label="适用商品 SKU ID（留空为全场通用）">
          <a-input-tag
            v-model="createForm.applicableScope"
            placeholder="输入 SKU ID 后回车"
            :max-tag-count="6"
          />
        </a-form-item>
        <a-form-item label="有效天数" required>
          <a-input-number v-model="createForm.validityDays" :min="1" />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="createForm.note" :max-length="255" />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model="createForm.contractConfirmed"
            >已确认储值卡合同</a-checkbox
          >
        </a-form-item>
        <a-typography-text type="secondary">
          {{
            createForm.paymentChannel === 'customer_balance'
              ? '用余额购卡属账户间划转：同事务扣减客户余额本金、增加卡内本金，不接受赠送权益。'
              : '外部收款开卡须填写支付凭证号，便于财务核验。'
          }}
        </a-typography-text>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:visible="detailVisible"
      :width="640"
      title="储值卡详情"
      unmount-on-close
    >
      <template v-if="detail">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="卡号">{{
            detail.card.card_no
          }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="statusColor(detail.card.status)">{{
              statusLabel(detail.card.status)
            }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="客户 ID">{{
            detail.card.customer_id
          }}</a-descriptions-item>
          <a-descriptions-item label="来源支付">{{
            channelLabel(detail.card.payment_channel)
          }}</a-descriptions-item>
          <a-descriptions-item label="本金余额">{{
            moneyText(detail.card.principal_remaining_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="赠送余额">{{
            moneyText(detail.card.bonus_remaining_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="累计已消费">{{
            moneyText(detail.card.consumed_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="有效期至">{{
            fmtDate(detail.card.valid_until)
          }}</a-descriptions-item>
          <a-descriptions-item label="适用商品">{{
            (detail.card.applicable_scope || []).length
              ? (detail.card.applicable_scope || []).join('、')
              : '全场通用'
          }}</a-descriptions-item>
          <a-descriptions-item label="已退金额">{{
            moneyText(detail.card.refunded_cents)
          }}</a-descriptions-item>
        </a-descriptions>

        <a-divider>流水</a-divider>
        <a-table :data="detail.transactions" row-key="id" size="small">
          <template #columns>
            <a-table-column data-index="entry_type" title="类型" :width="110" />
            <a-table-column title="本金变动">
              <template #cell="{ record }">{{
                moneyText(record.principal_delta_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="赠送变动">
              <template #cell="{ record }">{{
                moneyText(record.bonus_delta_cents)
              }}</template>
            </a-table-column>
            <a-table-column data-index="note" title="备注" />
            <a-table-column title="时间">
              <template #cell="{ record }">{{
                fmtMinute(record.created_at)
              }}</template>
            </a-table-column>
          </template>
        </a-table>

        <a-divider>退卡</a-divider>
        <a-space class="toolbar" wrap>
          <a-button :loading="quoteLoading" @click="loadQuote"
            >退卡试算</a-button
          >
          <a-button
            v-if="canManage"
            type="primary"
            :disabled="!canRequestRefund"
            @click="submitRefundRequest"
            >申请退卡</a-button
          >
          <template v-if="detail.card.status === 'refund_pending'">
            <a-button
              v-if="canApprove"
              type="primary"
              @click="decideRefund(true)"
              >审核通过</a-button
            >
            <a-button v-if="canApprove" @click="decideRefund(false)"
              >驳回</a-button
            >
          </template>
        </a-space>
        <a-descriptions v-if="quote" :column="2" size="small">
          <a-descriptions-item label="剩余本金">{{
            moneyText(quote.remaining_principal_cents as number)
          }}</a-descriptions-item>
          <a-descriptions-item label="剩余赠送">{{
            moneyText(quote.remaining_bonus_cents as number)
          }}</a-descriptions-item>
          <a-descriptions-item label="可退金额">{{
            moneyText(quote.refundable_cents as number)
          }}</a-descriptions-item>
          <a-descriptions-item label="赠送作废">{{
            moneyText(quote.bonus_forfeited_cents as number)
          }}</a-descriptions-item>
        </a-descriptions>
        <a-typography-text type="secondary">
          退卡按合同试算：可退金额为未消费本金，未消费赠送权益作废、不折现。申请后须由财务审核，审核人不得与申请人相同。
        </a-typography-text>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    createEsportsStoredValueCard,
    decideEsportsStoredValueCardRefund,
    getEsportsStoredValueCard,
    getEsportsStoredValueCardRefundQuote,
    getEsportsStoredValueCards,
    requestEsportsStoredValueCardRefund,
  } from '../../api';
  import type {
    EsportsStoredValueCard,
    StoredValueCardDetail,
    StoredValuePaymentChannel,
    StoredValueStatus,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canManage = computed(() =>
    hasButtonPermission('esports:stored_value:manage')
  );
  const canApprove = computed(() =>
    hasButtonPermission('esports:stored_value:refund_approve')
  );

  const statusOptions: { value: StoredValueStatus; label: string }[] = [
    { value: 'active', label: '可用' },
    { value: 'exhausted', label: '已用尽' },
    { value: 'refund_pending', label: '退卡待审' },
    { value: 'refunded', label: '已退卡' },
    { value: 'expired', label: '已过期' },
    { value: 'frozen', label: '已冻结' },
  ];
  const channelOptions: {
    value: StoredValuePaymentChannel;
    label: string;
  }[] = [
    { value: 'wechat_work', label: '企业微信收款' },
    { value: 'merchant_qr', label: '工作室商户码' },
    { value: 'corporate_transfer', label: '对公转账' },
    { value: 'customer_balance', label: '客户余额划转' },
  ];
  const statusLabel = (value: StoredValueStatus) =>
    statusOptions.find((option) => option.value === value)?.label || value;
  const statusColor = (value: StoredValueStatus) => {
    switch (value) {
      case 'active':
        return 'green';
      case 'refund_pending':
        return 'orangered';
      case 'exhausted':
      case 'expired':
        return 'gray';
      case 'refunded':
        return 'arcoblue';
      default:
        return 'gray';
    }
  };
  const channelLabel = (value: StoredValuePaymentChannel) =>
    channelOptions.find((option) => option.value === value)?.label || value;
  // 金额分转元展示；变动额可能为负。
  const moneyText = (cents: number | undefined) =>
    `${((cents || 0) / 100).toFixed(2)} 元`;
  const pad = (value: number) => String(value).padStart(2, '0');
  const fmtDate = (value: string | null | undefined) => {
    if (!value) return '-';
    const d = new Date(value);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const fmtMinute = (value: string | null | undefined) => {
    if (!value) return '-';
    const d = new Date(value);
    return `${fmtDate(value)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };
  // 幂等键：前端生成，重复提交同一开卡请求不会重复入账。
  const newKey = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ── 列表 ──
  const loading = ref(false);
  const cards = ref<EsportsStoredValueCard[]>([]);
  const filterStatus = ref<StoredValueStatus | ''>('');
  const filterCustomerId = ref<number>(0);
  const onlyRemind = ref(false);

  async function loadCards() {
    loading.value = true;
    try {
      cards.value =
        (
          await getEsportsStoredValueCards({
            status: filterStatus.value || undefined,
            customer_id: filterCustomerId.value || undefined,
            remind_days: onlyRemind.value ? 30 : undefined,
          })
        ).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载储值卡失败'));
    } finally {
      loading.value = false;
    }
  }

  // ── 开卡 ──
  const createVisible = ref(false);
  const creating = ref(false);
  const createForm = reactive({
    customerId: 0,
    source: 'staff' as 'staff' | 'self',
    paymentChannel: 'merchant_qr' as StoredValuePaymentChannel,
    paymentRef: '',
    principalCents: 0,
    bonusCents: 0,
    applicableScope: [] as string[],
    validityDays: 365,
    note: '',
    contractConfirmed: false,
  });

  function openCreate() {
    createForm.customerId = 0;
    createForm.source = 'staff';
    createForm.paymentChannel = 'merchant_qr';
    createForm.paymentRef = '';
    createForm.principalCents = 0;
    createForm.bonusCents = 0;
    createForm.applicableScope = [];
    createForm.validityDays = 365;
    createForm.note = '';
    createForm.contractConfirmed = false;
    createVisible.value = true;
  }

  async function submitCreate() {
    if (!createForm.customerId || !createForm.principalCents) {
      Message.warning('请填写客户与开卡本金');
      return;
    }
    if (!createForm.contractConfirmed) {
      Message.warning('开卡前须确认储值卡合同');
      return;
    }
    creating.value = true;
    try {
      await createEsportsStoredValueCard({
        customer_id: createForm.customerId,
        source: createForm.source,
        payment_channel: createForm.paymentChannel,
        payment_ref: createForm.paymentRef,
        principal_cents: createForm.principalCents,
        bonus_cents:
          createForm.paymentChannel === 'customer_balance'
            ? 0
            : createForm.bonusCents,
        applicable_scope: createForm.applicableScope
          .map((value) => Number(value))
          .filter((value) => value > 0),
        contract_confirmed: true,
        validity_days: createForm.validityDays,
        note: createForm.note,
        idempotency_key: newKey('sv-open'),
      });
      createVisible.value = false;
      Message.success('已开卡');
      await loadCards();
    } catch (err) {
      Message.error(errorText(err, '开卡失败'));
    } finally {
      creating.value = false;
    }
  }

  // ── 详情与退卡 ──
  const detailVisible = ref(false);
  const detail = ref<StoredValueCardDetail | null>(null);
  const quote = ref<Record<string, unknown> | null>(null);
  const quoteLoading = ref(false);
  // 仅可用 / 已用尽 / 已过期的卡可申请退卡（待审、已退、冻结不可）。
  const canRequestRefund = computed(() => {
    const status = detail.value?.card.status;
    return (
      status === 'active' || status === 'exhausted' || status === 'expired'
    );
  });

  async function openDetail(card: EsportsStoredValueCard) {
    detailVisible.value = true;
    detail.value = null;
    quote.value = null;
    try {
      detail.value = (await getEsportsStoredValueCard(card.id)).data.data;
    } catch (err) {
      Message.error(errorText(err, '加载储值卡详情失败'));
    }
  }

  async function loadQuote() {
    if (!detail.value) return;
    quoteLoading.value = true;
    try {
      const result = (
        await getEsportsStoredValueCardRefundQuote(detail.value.card.id)
      ).data.data;
      quote.value = result.quote;
    } catch (err) {
      Message.error(errorText(err, '退卡试算失败'));
    } finally {
      quoteLoading.value = false;
    }
  }

  async function submitRefundRequest() {
    if (!detail.value) return;
    try {
      await requestEsportsStoredValueCardRefund(detail.value.card.id);
      Message.success('已提交退卡申请，等待财务审核');
      await openDetail(detail.value.card);
      await loadCards();
    } catch (err) {
      Message.error(errorText(err, '申请退卡失败'));
    }
  }

  async function decideRefund(approve: boolean) {
    if (!detail.value) return;
    const { card } = detail.value;
    try {
      await decideEsportsStoredValueCardRefund(card.id, approve);
      Message.success(approve ? '已通过退卡' : '已驳回退卡');
      await openDetail(card);
      await loadCards();
    } catch (err) {
      Message.error(errorText(err, '退卡审核失败'));
    }
  }

  onMounted(loadCards);
</script>

<style scoped>
  .toolbar {
    margin-bottom: 12px;
  }
</style>
