<template>
  <div class="container page-container">
    <a-card class="general-card" title="订单">
      <a-space class="toolbar">
        <a-button :loading="loading" @click="load">刷新</a-button>
      </a-space>
      <a-table
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
          <a-table-column data-index="refund_status" title="退款状态" />
          <a-table-column title="存单">
            <template #cell="{ record }">
              <a-tag v-if="record.deposit_status === 'frozen'" color="arcoblue"
                >已存单</a-tag
              >
              <span v-else>—</span>
            </template>
          </a-table-column>
          <a-table-column title="操作">
            <template #cell="{ record }">
              <a-button type="text" @click="showDetail(record.id)"
                >详情</a-button
              >
              <template v-if="canOperate && isUnpaid(record)">
                <a-button type="text" @click="openOps(record, 'reprice')"
                  >改价</a-button
                >
                <a-button type="text" @click="openOps(record, 'reschedule')"
                  >改期</a-button
                >
                <a-button
                  type="text"
                  status="success"
                  @click="payWithBalance(record)"
                  >余额核销</a-button
                >
                <a-button
                  type="text"
                  status="success"
                  @click="openCardPay(record)"
                  >储值卡核销</a-button
                >
              </template>
              <a-button
                v-if="
                  canOperate && record.fulfillment_status === 'pending_close'
                "
                type="text"
                status="success"
                @click="openOps(record, 'close')"
                >结单</a-button
              >
              <a-button
                v-if="
                  canOperate &&
                  record.fulfillment_status === 'pending_close_review'
                "
                type="text"
                status="success"
                @click="approveReview(record)"
                >复核通过</a-button
              >
              <a-button
                v-if="
                  canOperate &&
                  record.fulfillment_status === 'pending_close_review'
                "
                type="text"
                status="danger"
                @click="openRejectReview(record)"
                >复核驳回</a-button
              >
              <a-button
                v-if="canOperate && record.fulfillment_status === 'in_service'"
                type="text"
                status="warning"
                @click="openAddon(record)"
                >加钟</a-button
              >
              <a-button
                v-if="
                  canOperate &&
                  record.fulfillment_status !== 'cancelled' &&
                  record.fulfillment_status !== 'completed'
                "
                type="text"
                status="danger"
                @click="openOps(record, 'cancel')"
                >取消</a-button
              >
              <a-button
                v-if="canDeposit(record)"
                type="text"
                status="warning"
                @click="deposit(record)"
                >存单</a-button
              >
              <a-button
                v-if="canOperate && record.deposit_status === 'frozen'"
                type="text"
                @click="restore(record)"
                >恢复</a-button
              >
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="detailVisible"
      title="订单详情"
      :footer="false"
      width="520px"
    >
      <a-descriptions v-if="detail" :column="1" bordered>
        <a-descriptions-item label="订单号">{{
          detail.order_no
        }}</a-descriptions-item>
        <a-descriptions-item label="客户 / 商品"
          >{{ detail.customer_id }} / {{ detail.sku_id }}</a-descriptions-item
        >
        <a-descriptions-item label="单价 / 份数"
          >{{ money(detail.unit_price_cents) }} ×
          {{ detail.quantity }}</a-descriptions-item
        >
        <a-descriptions-item label="折扣 / 人工调整"
          >-{{ money(detail.discount_cents) }} /
          {{ money(detail.manual_adjust_cents) }}</a-descriptions-item
        >
        <a-descriptions-item label="应付金额">{{
          money(detail.payable_cents)
        }}</a-descriptions-item>
        <a-descriptions-item label="报价版本 / 数据版本"
          >{{ detail.quote_version }} /
          {{ detail.version }}</a-descriptions-item
        >
        <a-descriptions-item label="承诺服务量 / 席位"
          >{{ detail.promised_service_units }} /
          {{ detail.required_seats }}</a-descriptions-item
        >
        <a-descriptions-item label="支付 / 履约 / 退款"
          >{{ detail.payment_status }} / {{ detail.fulfillment_status }} /
          {{ detail.refund_status }}</a-descriptions-item
        >
        <a-descriptions-item label="存单状态"
          >{{ detail.deposit_status }}
          {{
            detail.deposited_at ? `（${detail.deposited_at}）` : ''
          }}</a-descriptions-item
        >
        <a-descriptions-item label="支付截止时间">{{
          detail.payment_deadline
        }}</a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <a-modal
      v-model:visible="opsVisible"
      :title="opsTitle"
      @ok="submitOps"
      @cancel="opsVisible = false"
    >
      <a-form :model="opsForm">
        <template v-if="opsAction === 'reprice'">
          <a-form-item label="份数" required>
            <a-input-number v-model="opsForm.quantity" :min="1" />
          </a-form-item>
          <a-form-item label="人工调整（元，可为负）" required>
            <a-input-number v-model="opsForm.manualAdjustYuan" :precision="2" />
          </a-form-item>
          <a-form-item label="议价后应付">
            <a-input :model-value="previewPayableText" disabled />
          </a-form-item>
        </template>
        <a-form-item
          v-if="opsAction === 'reschedule'"
          label="新的约定开始时间"
          required
        >
          <a-date-picker
            v-model="opsForm.startAt"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
          />
        </a-form-item>
        <a-form-item :label="opsAction === 'close' ? '备注' : '原因（必填）'">
          <a-textarea v-model="opsForm.reason" :max-length="255" />
        </a-form-item>
        <template v-if="opsAction === 'close' && closeFormFields.length > 0">
          <a-divider>结单表单（§3.4）：{{ closeFormTemplateName }}</a-divider>
          <a-form-item
            v-for="item in closeFormFields"
            :key="item.key"
            :label="item.label"
            :required="isCloseFormRequired(item)"
          >
            <a-input
              v-if="
                item.field_type === 'text' ||
                item.field_type === 'datetime' ||
                item.field_type === 'image' ||
                item.field_type === 'reference'
              "
              :model-value="closeFormText(item.key)"
              :max-length="item.max_length > 0 ? item.max_length : undefined"
              :placeholder="closeFormPlaceholder(item)"
              @update:model-value="(value) => setCloseFormText(item.key, value)"
            />
            <a-input-number
              v-else-if="item.field_type === 'number'"
              :model-value="closeFormNumber(item.key)"
              @update:model-value="
                (value) => setCloseFormNumber(item.key, value)
              "
            />
            <a-input
              v-else-if="item.field_type === 'money'"
              :model-value="money(opsTarget ? opsTarget.payable_cents : 0)"
              disabled
            />
            <a-select
              v-else-if="item.field_type === 'select'"
              :model-value="closeFormText(item.key)"
              @update:model-value="(value) => setCloseFormText(item.key, value)"
            >
              <a-option
                v-for="option in item.options || []"
                :key="option"
                :value="option"
                >{{ option }}</a-option
              >
            </a-select>
            <a-select
              v-else-if="item.field_type === 'multiselect'"
              :model-value="closeFormList(item.key)"
              multiple
              @update:model-value="(value) => setCloseFormList(item.key, value)"
            >
              <a-option
                v-for="option in item.options || []"
                :key="option"
                :value="option"
                >{{ option }}</a-option
              >
            </a-select>
            <a-switch
              v-else-if="item.field_type === 'switch'"
              :model-value="closeFormBool(item.key)"
              @update:model-value="(value) => setCloseFormBool(item.key, value)"
            />
          </a-form-item>
        </template>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="cardPayVisible"
      title="储值卡核销"
      :ok-loading="cardPayLoading"
      @ok="submitCardPay"
      @cancel="cardPayVisible = false"
    >
      <a-form :model="cardPayForm">
        <a-form-item label="订单号">
          <a-typography-text>{{ cardPayForm.orderNo }}</a-typography-text>
        </a-form-item>
        <a-form-item label="储值卡 ID" required>
          <a-input-number v-model="cardPayForm.cardId" :min="1" />
        </a-form-item>
        <a-typography-text type="secondary">
          按订单应付额足额核销，扣减顺序为先赠送权益、后本金；卡须属该客户、在有效期内且适用该商品。
        </a-typography-text>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="addonVisible"
      title="订单加钟（§3.3 / §12.5）"
      :footer="false"
      width="680px"
    >
      <a-form :model="addonForm">
        <a-form-item label="追加金额（元）">
          <a-input-number
            v-model="addonForm.addedYuan"
            :min="0"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="追加服务量">
          <a-input-number v-model="addonForm.addedUnits" :min="0" />
          <a-typography-text type="secondary">
            金额与服务量至少一项为正；单位与订单 SKU 的服务计量单位一致。
          </a-typography-text>
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="addonForm.note" :max-length="255" />
        </a-form-item>
        <a-space>
          <a-button
            type="primary"
            :loading="addonSubmitting"
            @click="submitAddon"
            >发起加钟</a-button
          >
          <a-button :loading="addonLoading" @click="loadAddons"
            >刷新列表</a-button
          >
        </a-space>
      </a-form>
      <a-typography-text type="secondary" class="addon-tip">
        发起后进入「待陪玩确认」，由陪玩在陪玩端确认或拒绝；确认后追加金额与服务量累加到订单，
        并按确认时点锁定的分成规则生成加钟分成。存在待确认加钟时无法结单。
      </a-typography-text>
      <a-table
        :data="addons"
        :loading="addonLoading"
        row-key="id"
        :pagination="{ pageSize: 5 }"
      >
        <template #columns>
          <a-table-column data-index="addon_no" title="加钟单号" />
          <a-table-column title="追加金额">
            <template #cell="{ record }">{{
              money(record.added_cents)
            }}</template>
          </a-table-column>
          <a-table-column data-index="added_units" title="追加服务量" />
          <a-table-column title="状态">
            <template #cell="{ record }">{{
              addonStatusLabel(record.status)
            }}</template>
          </a-table-column>
          <a-table-column title="加钟分成">
            <template #cell="{ record }">{{
              money(record.commission_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="90">
            <template #cell="{ record }">
              <a-button
                v-if="record.status === 'pending'"
                type="text"
                status="danger"
                @click="withdrawAddon(record)"
                >撤回</a-button
              >
              <span v-else>—</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-modal>

    <a-modal
      v-model:visible="closeReviewVisible"
      title="复核驳回结单"
      @ok="submitRejectReview"
      @cancel="closeReviewVisible = false"
    >
      <a-form :model="closeReviewForm">
        <a-form-item label="驳回原因" required>
          <a-textarea
            v-model="closeReviewForm.reason"
            :max-length="255"
            placeholder="如：服务凭证存疑，请补充后重新结单"
          />
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
    approveCloseReview,
    cancelOrder,
    cancelOrderAddon,
    closeOrder,
    createOrderAddon,
    depositOrder,
    getOrder,
    getOrderCloseForm,
    listOrderAddons,
    listOrders,
    payEsportsOrderByStoredValueCard,
    payOrderWithBalance,
    rejectCloseReview,
    repriceOrder,
    rescheduleOrder,
    restoreOrder,
  } from '../../api';
  import type {
    EsportsCloseFormField,
    EsportsOrder,
    EsportsOrderAddon,
    OrderCloseFormView,
  } from '../../api';

  type OpsAction = 'reprice' | 'reschedule' | 'cancel' | 'close';

  const { hasButtonPermission } = usePermission();
  const canOperate = computed(() =>
    hasButtonPermission('esports:orders:operate')
  );

  const loading = ref(false);
  const orders = ref<EsportsOrder[]>([]);
  const detail = ref<EsportsOrder | null>(null);
  const detailVisible = ref(false);
  const opsVisible = ref(false);
  const opsAction = ref<OpsAction>('reprice');
  const opsTarget = ref<EsportsOrder | null>(null);
  const opsForm = reactive({
    quantity: 1,
    manualAdjustYuan: 0,
    startAt: '',
    reason: '',
  });

  // ── 结单表单（§3.4）：按订单适用模板动态渲染，值随结单一起提交 ──
  const closeForm = ref<OrderCloseFormView | null>(null);
  const closeFormValues = ref<Record<string, unknown>>({});
  const closeFormFields = computed<EsportsCloseFormField[]>(
    () => closeForm.value?.fields || []
  );
  const closeFormTemplateName = computed(() => {
    const template = closeForm.value?.template;
    return template ? `${template.name} v${template.version}` : '无适用模板';
  });
  // 模板绑定可覆盖字段库的必填默认值；金额只读字段由系统填写，不参与必填。
  const closeFormBindingRequired = (key: string) =>
    (closeForm.value?.template?.fields || []).some(
      (binding) => binding.field_key === key && binding.required
    );
  const isCloseFormRequired = (item: EsportsCloseFormField) =>
    item.field_type !== 'money' &&
    (item.required || closeFormBindingRequired(item.key));
  const closeFormText = (key: string) => {
    const value = closeFormValues.value[key];
    return typeof value === 'string' ? value : '';
  };
  const closeFormNumber = (key: string) => {
    const value = closeFormValues.value[key];
    return typeof value === 'number' ? value : undefined;
  };
  const closeFormBool = (key: string) => closeFormValues.value[key] === true;
  const closeFormList = (key: string) => {
    const value = closeFormValues.value[key];
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  };
  const closeFormPlaceholder = (item: EsportsCloseFormField) => {
    if (item.field_type === 'datetime')
      return 'ISO 时间，如 2026-10-14T10:00:00Z';
    if (item.field_type === 'image') return '附件引用或图片地址';
    if (item.field_type === 'reference') return '关联对象 ID';
    return '';
  };
  const setCloseFormText = (key: string, value: unknown) => {
    closeFormValues.value[key] = typeof value === 'string' ? value : '';
  };
  const setCloseFormNumber = (key: string, value: unknown) => {
    closeFormValues.value[key] = typeof value === 'number' ? value : null;
  };
  const setCloseFormBool = (key: string, value: unknown) => {
    closeFormValues.value[key] = value === true;
  };
  const setCloseFormList = (key: string, value: unknown) => {
    closeFormValues.value[key] = Array.isArray(value)
      ? value.map((item) => String(item))
      : [];
  };
  const isEmptyCloseFormValue = (value: unknown) =>
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);

  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  // 透出后端返回的中文错误信息（如结单条件缺失），取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };
  const isUnpaid = (order: EsportsOrder) =>
    order.payment_status === 'unpaid' &&
    order.fulfillment_status === 'pending_payment';

  // ── 加钟（§3.3 / §6.2 / §12.5）：客服对服务中订单发起，陪玩确认后累加并生成加钟分成 ──
  const addonVisible = ref(false);
  const addonLoading = ref(false);
  const addonSubmitting = ref(false);
  const addonOrderId = ref(0);
  const addons = ref<EsportsOrderAddon[]>([]);
  const addonForm = reactive({ addedYuan: 0, addedUnits: 0, note: '' });
  const addonStatusMap: Record<string, string> = {
    pending: '待陪玩确认',
    confirmed: '已确认',
    rejected: '已拒绝',
    cancelled: '已撤回',
  };
  const addonStatusLabel = (value: string) => addonStatusMap[value] || value;

  async function load() {
    loading.value = true;
    try {
      orders.value = (await listOrders()).data.data || [];
    } catch {
      Message.error('加载失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  async function loadAddons() {
    if (!addonOrderId.value) return;
    addonLoading.value = true;
    try {
      addons.value =
        (await listOrderAddons(addonOrderId.value)).data.data || [];
    } catch {
      Message.error('加载加钟列表失败，请稍后重试');
    } finally {
      addonLoading.value = false;
    }
  }

  function openAddon(record: EsportsOrder) {
    addonOrderId.value = record.id;
    addonForm.addedYuan = 0;
    addonForm.addedUnits = 0;
    addonForm.note = '';
    addonVisible.value = true;
    loadAddons();
  }

  async function submitAddon() {
    const addedCents = Math.round(addonForm.addedYuan * 100);
    if (addedCents <= 0 && addonForm.addedUnits <= 0) {
      Message.warning('追加金额与追加服务量至少填一项');
      return;
    }
    addonSubmitting.value = true;
    try {
      await createOrderAddon(addonOrderId.value, {
        added_cents: addedCents,
        added_units: addonForm.addedUnits,
        note: addonForm.note.trim(),
      });
      Message.success('已发起加钟，等待陪玩确认');
      addonForm.addedYuan = 0;
      addonForm.addedUnits = 0;
      addonForm.note = '';
      await loadAddons();
      await load();
    } catch (err) {
      Message.error(
        errorText(
          err,
          '发起加钟失败：仅服务中订单可发起，且同一订单只允许一条待确认加钟'
        )
      );
    } finally {
      addonSubmitting.value = false;
    }
  }

  async function withdrawAddon(record: EsportsOrderAddon) {
    try {
      await cancelOrderAddon(record.id);
      Message.success('已撤回加钟');
      await loadAddons();
    } catch (err) {
      Message.error(errorText(err, '撤回失败：加钟已被陪玩处理'));
    }
  }

  // ── 结单复核（§3.4）──
  const closeReviewVisible = ref(false);
  const closeReviewTarget = ref<EsportsOrder | null>(null);
  const closeReviewForm = reactive({ reason: '' });

  async function approveReview(record: EsportsOrder) {
    try {
      await approveCloseReview(record.id);
      Message.success('已复核通过，订单完成');
      await load();
    } catch (err) {
      Message.error(errorText(err, '复核通过失败：不得自审或状态已变化'));
    }
  }

  function openRejectReview(record: EsportsOrder) {
    closeReviewTarget.value = record;
    closeReviewForm.reason = '';
    closeReviewVisible.value = true;
  }

  async function submitRejectReview() {
    const record = closeReviewTarget.value;
    if (!record) return;
    if (!closeReviewForm.reason.trim()) {
      Message.warning('请填写驳回原因');
      return;
    }
    try {
      await rejectCloseReview(record.id, closeReviewForm.reason.trim());
      closeReviewVisible.value = false;
      Message.success('已驳回，订单回退待结单');
      await load();
    } catch (err) {
      Message.error(errorText(err, '复核驳回失败：不得自审或状态已变化'));
    }
  }
  // 仅已付款、未存单、未结束的订单可存单。
  const canDeposit = (order: EsportsOrder) =>
    canOperate.value &&
    order.deposit_status === 'none' &&
    order.payment_status === 'paid' &&
    order.fulfillment_status !== 'completed' &&
    order.fulfillment_status !== 'cancelled';
  const opsTitle = computed(
    () =>
      ({
        reprice: '订单改价',
        reschedule: '订单改期',
        cancel: '取消订单',
        close: '结单',
      }[opsAction.value])
  );
  // 改价预览：标价 × 份数 − 会员折扣 + 人工调整，与后端算法保持一致。
  const previewPayableText = computed(() => {
    const order = opsTarget.value;
    if (!order) return '';
    const next =
      order.unit_price_cents * opsForm.quantity -
      order.discount_cents +
      Math.round(opsForm.manualAdjustYuan * 100);
    return `${money(next)}（须大于 0）`;
  });

  async function showDetail(id: number) {
    try {
      detail.value = (await getOrder(id)).data.data || null;
      detailVisible.value = true;
    } catch {
      Message.error('无法获取订单详情');
    }
  }

  async function openOps(order: EsportsOrder, action: OpsAction) {
    opsTarget.value = order;
    opsAction.value = action;
    opsForm.quantity = order.quantity;
    opsForm.manualAdjustYuan = order.manual_adjust_cents / 100;
    opsForm.startAt = '';
    opsForm.reason = '';
    closeForm.value = null;
    closeFormValues.value = {};
    opsVisible.value = true;
    if (action === 'close') {
      try {
        closeForm.value = (await getOrderCloseForm(order.id)).data.data || null;
      } catch {
        Message.error('加载结单表单失败，可重试或直接结单');
      }
    }
  }

  async function submitOps() {
    const order = opsTarget.value;
    if (!order) return;
    if (!opsForm.reason.trim()) {
      Message.warning('请填写原因');
      return;
    }
    // 结单表单（§3.4）：必填项前端先拦一道，后端仍会事务内原子校验。
    if (opsAction.value === 'close') {
      const missing = closeFormFields.value.filter(
        (item) =>
          isCloseFormRequired(item) &&
          isEmptyCloseFormValue(closeFormValues.value[item.key])
      );
      if (missing.length > 0) {
        Message.warning(
          `请填写结单表单必填项：${missing
            .map((item) => item.label)
            .join('、')}`
        );
        return;
      }
    }
    try {
      if (opsAction.value === 'reprice') {
        await repriceOrder(order.id, {
          expected_version: order.version,
          quantity: opsForm.quantity,
          manual_adjust_cents: Math.round(opsForm.manualAdjustYuan * 100),
          reason: opsForm.reason.trim(),
        });
      } else if (opsAction.value === 'reschedule') {
        if (!opsForm.startAt) {
          Message.warning('请选择新的开始时间');
          return;
        }
        await rescheduleOrder(order.id, {
          expected_version: order.version,
          start_at: new Date(opsForm.startAt).toISOString(),
          reason: opsForm.reason.trim(),
        });
      } else if (opsAction.value === 'close') {
        await closeOrder(
          order.id,
          opsForm.reason.trim(),
          closeFormValues.value
        );
      } else {
        await cancelOrder(order.id, opsForm.reason.trim());
      }
      opsVisible.value = false;
      Message.success(opsAction.value === 'close' ? '已结单' : '操作已提交');
      await load();
    } catch (err) {
      Message.error(errorText(err, '操作失败，请刷新后重试'));
    }
  }

  async function payWithBalance(order: EsportsOrder) {
    try {
      await payOrderWithBalance(order.id);
      Message.success('已用余额核销，订单转入待派单');
      await load();
    } catch {
      Message.error('核销失败：余额不足或订单状态已变化');
    }
  }

  // ── 储值卡核销（§4.4 消费） ──
  const cardPayVisible = ref(false);
  const cardPayLoading = ref(false);
  const cardPayForm = reactive({ orderId: 0, orderNo: '', cardId: 0 });

  function openCardPay(order: EsportsOrder) {
    cardPayForm.orderId = order.id;
    cardPayForm.orderNo = order.order_no;
    cardPayForm.cardId = order.stored_value_card_id || 0;
    cardPayVisible.value = true;
  }

  async function submitCardPay() {
    if (!cardPayForm.cardId) {
      Message.warning('请填写储值卡 ID');
      return;
    }
    cardPayLoading.value = true;
    try {
      await payEsportsOrderByStoredValueCard(
        cardPayForm.orderId,
        cardPayForm.cardId
      );
      cardPayVisible.value = false;
      Message.success('已用储值卡核销，订单转入待派单');
      await load();
    } catch (err) {
      Message.error(
        errorText(err, '核销失败：卡不可用、余额不足或订单状态已变化')
      );
    } finally {
      cardPayLoading.value = false;
    }
  }

  async function deposit(order: EsportsOrder) {
    try {
      await depositOrder(order.id);
      Message.success('已存单');
      await load();
    } catch {
      Message.error('存单失败：仅已付款订单可存单或状态已变化');
    }
  }

  async function restore(order: EsportsOrder) {
    try {
      await restoreOrder(order.id);
      Message.success('已恢复');
      await load();
    } catch {
      Message.error('恢复失败：订单状态已变化');
    }
  }

  onMounted(load);
</script>

<style scoped>
  .toolbar {
    margin-bottom: 16px;
  }

  .addon-tip {
    display: block;
    margin: 12px 0;
  }
</style>
