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
          @click="openOrder"
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
          <a-table-column title="客户">
            <template #cell="{ record }">{{
              record.customer_name || `#${record.customer_id}`
            }}</template>
          </a-table-column>
          <a-table-column title="商品">
            <template #cell="{ record }">{{ skuLabel(record) }}</template>
          </a-table-column>
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
    <a-modal
      v-model:visible="orderVisible"
      title="客服报单"
      width="620px"
      @ok="saveOrder"
    >
      <a-form :model="orderForm">
        <a-form-item label="客户" required>
          <a-select
            v-model="orderForm.customer_id"
            allow-search
            placeholder="搜索客户姓名或手机号"
            @change="loadQuotes"
          >
            <a-option
              v-for="item in customers"
              :key="item.id"
              :value="item.id"
              >{{ item.display_name }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="商品" required>
          <a-select
            v-model="orderForm.product_id"
            allow-search
            placeholder="搜索商品名称或编码"
            @change="onSkuChange"
          >
            <a-option
              v-for="item in skus.filter((sku) => sku.status === 'on_sale')"
              :key="item.id"
              :value="item.id"
              >{{ item.title }} · {{ item.code }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="购买份数" required>
          <a-input-number
            v-model="orderForm.quantity"
            :min="1"
            :max="1000"
            @change="loadQuotes"
          />
        </a-form-item>
        <a-form-item label="指定陪玩（可选，可多选）">
          <a-space direction="vertical" fill>
            <OwnerMultiSelect
              v-model="preferredPlayerIds"
              :max="seatLimit"
              placeholder="搜索并选择陪玩（第一个为主陪玩）"
            />
            <a-typography-text type="secondary">
              指定后订单直接由客服指派，不进入优先通知窗口；陪玩须资质合格。<template
                v-if="seatLimit > 0"
                >最多可选 {{ seatLimit }} 个（商品席位数）。</template
              >
            </a-typography-text>
          </a-space>
        </a-form-item>
        <a-form-item v-if="primaryPlayerId > 0" label="固排代入（可选）">
          <a-space direction="vertical" fill>
            <a-space wrap>
              <a-button
                v-for="mate in teammates"
                :key="mate.player_id"
                size="mini"
                :type="
                  preferredPlayerIds.includes(mate.player_id)
                    ? 'primary'
                    : 'outline'
                "
                @click="toggleTeammate(mate.player_id)"
                >{{ mate.display_name }}（#{{ mate.player_id }}）</a-button
              >
              <a-typography-text
                v-if="!teammatesLoading && teammates.length === 0"
                type="secondary"
                >主陪玩暂无已建立的固排</a-typography-text
              >
            </a-space>
            <a-typography-text type="secondary">
              点击固排成员即加入指定陪玩（主陪玩保持在第一位）；再点一次移除。
            </a-typography-text>
          </a-space>
        </a-form-item>

        <a-divider>报价构成</a-divider>
        <a-spin :loading="quoteLoading" style="width: 100%">
          <template v-if="currentQuote">
            <a-descriptions :column="1" size="small" bordered>
              <a-descriptions-item label="单价 × 份数">
                {{ money(currentQuote.unit_price_cents) }} ×
                {{ currentQuote.quantity }} =
                {{ money(currentQuote.subtotal_cents) }}
              </a-descriptions-item>
              <a-descriptions-item label="会员等级 / 折扣">
                {{ currentQuote.member_level_code || '未定级' }} ·
                {{ (currentQuote.member_discount_bps / 100).toFixed(2) }}%
              </a-descriptions-item>
              <a-descriptions-item label="会员折扣额">
                -{{ money(currentQuote.member_discount_cents) }}
              </a-descriptions-item>
              <a-descriptions-item label="人工调整额">
                {{ manualAdjustCents >= 0 ? '+' : '-'
                }}{{ money(Math.abs(manualAdjustCents)) }}
                <a-typography-text
                  v-if="manualAdjustCents !== 0 && !manualAdjustReasonOk"
                  type="danger"
                >
                  （须填写 4–255 字调整原因）
                </a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item label="最终应付">
                <a-typography-text style="font-weight: 600">{{
                  money(estimatedPayableCents)
                }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item label="承诺服务量">
                {{ currentQuote.promised_service_units }}
                {{ currentQuote.service_unit_name || '服务量' }}
              </a-descriptions-item>
              <a-descriptions-item label="结单要求">
                {{ currentQuote.close_rule_code || '按游戏 / 全局规则回落' }}
              </a-descriptions-item>
            </a-descriptions>
            <a-typography-text type="secondary">
              免审额度：{{
                money(approvalThresholdCents)
              }}（超出请先落单，再走订单改价审批）； 人工议价后小计不得低于
              {{
                money(
                  (currentSku?.min_unit_price_cents || 0) *
                    currentQuote.quantity
                )
              }}。
            </a-typography-text>
          </template>
          <a-empty
            v-else
            description="选择客户与商品后展示标价、会员折扣、人工调整与最终应付"
          />
        </a-spin>

        <a-form-item label="人工调整（元，正数加收 / 负数减免）">
          <a-input-number
            v-model="manualAdjustYuan"
            :precision="2"
            :style="{ width: '160px' }"
          />
        </a-form-item>
        <a-form-item label="人工调整原因">
          <a-input
            v-model="manualAdjustReason"
            :max-length="255"
            placeholder="调整金额非零时必填，4–255 字"
          />
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
                  allow-search
                  :style="{ width: '180px' }"
                  placeholder="搜索客户"
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
                  v-model="record.product_id"
                  allow-search
                  :style="{ width: '220px' }"
                  placeholder="搜索商品"
                >
                  <a-option
                    v-for="item in onSaleSkus"
                    :key="item.id"
                    :value="item.id"
                    >{{ item.title }} · {{ item.code }}</a-option
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
            第 {{ result.row }} 行（客户 #{{ result.customerId }} / 商品：{{
              skuName(result.skuId)
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
  import { uuidV4 } from '@/utils/uuid';
  import { computed, onMounted, reactive, ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import yuanToCents from '@/utils/money';
  import { errorText } from '@/utils/error';
  import AttachmentSelector from '@/components/attachment-selector/index.vue';
  import { resolveAttachmentAccessUrl } from '@/services/attachment-access.service';
  import type { AttachmentResponse } from '@/types/api';
  import OwnerMultiSelect from '../../components/OwnerMultiSelect.vue';
  import type {
    PlayerTeammateOption,
    AgeCheck,
    EsportsCustomer,
    EsportsOrder,
    EsportsSku,
    OrderInput,
    SkuQuotePreview,
  } from '../../api';
  import {
    listPlayerTeammatesForAdmin,
    createCustomer,
    createOrder,
    listCustomers,
    listOrders,
    listSkus,
    listSkusWithQuote,
    listPendingAgeChecks,
    reviewAgeCheck,
    submitAgeCheck,
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
  // 商品列展示名称：优先订单上的 product_name 快照，历史单回落当前 商品 标题。
  const skuName = (skuId: number) =>
    skus.value.find((sku) => sku.id === skuId)?.title || '未知商品';
  const skuLabel = (order: EsportsOrder) =>
    order.product_name || skuName(order.product_id);
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
  // 客户 / 商品未选择时必须用 undefined：绑 a-select 的数字 ID 若为 0，
  // Arco 会当作已选中值把下拉框渲染成「0」（ID 从 1 起，0 只是未选占位）。
  const orderForm = reactive<OrderInput>({
    customer_id: undefined as unknown as number,
    product_id: undefined as unknown as number,
    quantity: 1,
  });
  const orderRequestKey = ref(uuidV4());
  // 指定陪玩（可多选，第一个为主陪玩）：空数组表示不指定，由客服指派。
  const preferredPlayerIds = ref<number[]>([]);
  const primaryPlayerId = computed(() =>
    preferredPlayerIds.value.length > 0 ? preferredPlayerIds.value[0] : 0
  );
  // 席位数上限：商品列表接口暂不返回 required_seats，前端不做硬限制，
  // 由后端创建订单时校验「指定陪玩数 ≤ 商品席位数」并返回中文错误。
  const seatLimit = computed(() => 0);
  // 主陪玩的已确认固排：选中主陪玩后加载，点选可一键加入/移出。
  const teammates = ref<PlayerTeammateOption[]>([]);
  const teammatesLoading = ref(false);
  const teammatesSeq = ref(0);
  async function teamsRequest(playerId: number) {
    teammates.value = [];
    if (!playerId) return;
    teammatesSeq.value += 1;
    const token = teammatesSeq.value;
    teammatesLoading.value = true;
    try {
      const res = await listPlayerTeammatesForAdmin(playerId);
      if (token !== teammatesSeq.value) return;
      teammates.value = res.data.data || [];
    } catch {
      if (token === teammatesSeq.value) teammates.value = [];
    } finally {
      if (token === teammatesSeq.value) teammatesLoading.value = false;
    }
  }
  watch(primaryPlayerId, (playerId) => {
    teamsRequest(playerId);
  });
  function toggleTeammate(playerId: number) {
    if (preferredPlayerIds.value.includes(playerId)) {
      preferredPlayerIds.value = preferredPlayerIds.value.filter(
        (id) => id !== playerId
      );
      return;
    }
    if (
      seatLimit.value > 0 &&
      preferredPlayerIds.value.length >= seatLimit.value
    ) {
      Message.warning(`该商品最多指定 ${seatLimit.value} 个陪玩`);
      return;
    }
    preferredPlayerIds.value = [...preferredPlayerIds.value, playerId];
  }
  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  // 透出后端返回的中文错误信息（如客户归属校验），取不到时回退默认文案。
  // ── 报价构成：选客户 / 商品 / 份数后调用后端试算，逐项展示标价、
  //    会员折扣、承诺服务量与结单要求；人工调整按「元」录入，正负号与后端一致。 ──
  const quoteLoading = ref(false);
  const quotes = ref<Record<string, SkuQuotePreview>>({});
  const manualAdjustYuan = ref(0);
  const manualAdjustReason = ref('');
  const currentQuote = computed<SkuQuotePreview | null>(() =>
    orderForm.product_id
      ? quotes.value[String(orderForm.product_id)] || null
      : null
  );
  const currentSku = computed<EsportsSku | null>(
    () => skus.value.find((sku) => sku.id === orderForm.product_id) || null
  );
  const manualAdjustCents = computed(() =>
    Number.isFinite(manualAdjustYuan.value)
      ? yuanToCents(manualAdjustYuan.value)
      : 0
  );
  const manualAdjustReasonOk = computed(() => {
    const reason = manualAdjustReason.value.trim();
    return reason.length >= 4 && reason.length <= 255;
  });
  // 免审额度：subtotal × adjustment_approval_bp ‰，与后端同一算式。
  const approvalThresholdCents = computed(() => {
    const quote = currentQuote.value;
    const sku = currentSku.value;
    if (!quote || !sku) return 0;
    const bp =
      sku.adjustment_approval_bp > 0 && sku.adjustment_approval_bp <= 10000
        ? sku.adjustment_approval_bp
        : 2000;
    return Math.floor((quote.subtotal_cents * bp) / 10000);
  });
  const estimatedPayableCents = computed(() => {
    const quote = currentQuote.value;
    if (!quote) return 0;
    return (
      quote.subtotal_cents +
      manualAdjustCents.value -
      quote.member_discount_cents
    );
  });

  async function loadQuotes() {
    if (!orderForm.customer_id) {
      quotes.value = {};
      return;
    }
    quoteLoading.value = true;
    try {
      const result = await listSkusWithQuote(
        orderForm.customer_id,
        orderForm.quantity || 1
      );
      skus.value = result.data.data?.items || [];
      quotes.value = result.data.data?.quotes || {};
    } catch (err) {
      quotes.value = {};
      Message.error(errorText(err, '加载报价试算失败'));
    } finally {
      quoteLoading.value = false;
    }
  }

  function openOrder() {
    orderForm.customer_id = undefined as unknown as number;
    orderForm.product_id = undefined as unknown as number;
    orderForm.quantity = 1;
    preferredPlayerIds.value = [];
    manualAdjustYuan.value = 0;
    manualAdjustReason.value = '';
    quotes.value = {};
    orderRequestKey.value = uuidV4();
    orderVisible.value = true;
  }

  // 换 商品 时人工调整归零：免审额度与最低价都随 商品 变化，避免带着旧调整额提交。
  function onSkuChange() {
    manualAdjustYuan.value = 0;
  }

  // ── 批量报单（复用 POST /admin/orders，逐行独立幂等键，失败行不阻塞成功行） ──
  interface BatchRow {
    key: string;
    customer_id?: number;
    product_id?: number;
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
    key: uuidV4(),
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
        key: uuidV4(),
        customer_id: customerId,
        product_id: skuId,
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
          listCustomers({ limit: 500 }),
          listSkus({ limit: 500 }),
        ]);
        orders.value = orderResult.data.data || [];
        const customerRows = customerResult.data.data;
        customers.value = Array.isArray(customerRows)
          ? customerRows
          : customerRows?.items || [];
        skus.value = skuResult.data.data || [];
      } else if (activeTab.value === 'customers') {
        const customerRows = (await listCustomers({ limit: 500 })).data.data;
        customers.value = Array.isArray(customerRows)
          ? customerRows
          : customerRows?.items || [];
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
      (row) =>
        !row.customer_id ||
        row.customer_id < 1 ||
        !row.product_id ||
        row.product_id < 1 ||
        row.quantity < 1
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
            customer_id: row.customer_id as number,
            product_id: row.product_id as number,
            quantity: row.quantity,
          },
          uuidV4()
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
          customerId: row.customer_id as number,
          skuId: row.product_id as number,
          ok: true,
          message: '报单成功',
        });
      } else {
        fail += 1;
        batchResults.value.push({
          key: row.key,
          row: i + 1,
          customerId: row.customer_id as number,
          skuId: row.product_id as number,
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
    if (
      !orderForm.customer_id ||
      !orderForm.product_id ||
      orderForm.quantity < 1
    )
      return;
    const adjustCents = manualAdjustCents.value;
    const quote = currentQuote.value;
    // 人工调整与后端同口径前置校验：金额非零须有 4–255 字原因、不得超免审额度、不得低于最低允许价。
    if (adjustCents !== 0) {
      if (!manualAdjustReasonOk.value) {
        Message.warning('人工调整须填写 4–255 字的调整原因');
        return;
      }
      if (
        approvalThresholdCents.value > 0 &&
        Math.abs(adjustCents) > approvalThresholdCents.value
      ) {
        Message.warning(
          `人工调整 ${money(Math.abs(adjustCents))} 超过免审额度 ${money(
            approvalThresholdCents.value
          )}，请先落单后再走订单改价审批`
        );
        return;
      }
      if (quote && currentSku.value) {
        const floor =
          (currentSku.value.min_unit_price_cents ||
            currentSku.value.unit_price_cents) * quote.quantity;
        if (quote.subtotal_cents + adjustCents < floor) {
          Message.warning(
            `人工议价后小计不得低于 商品 最低允许价（${money(floor)}）`
          );
          return;
        }
      }
    }
    try {
      const payload: OrderInput = { ...orderForm };
      if (preferredPlayerIds.value.length > 0) {
        // 兼容单陪玩字段（主陪玩）+ 多陪玩数组（后端自动逐席位指派）。
        const [firstPlayerId] = preferredPlayerIds.value;
        payload.preferred_player_id = firstPlayerId;
        payload.preferred_player_ids = preferredPlayerIds.value;
      }
      if (adjustCents !== 0) {
        payload.manual_adjust_cents = adjustCents;
        payload.manual_adjust_reason = manualAdjustReason.value.trim();
      }
      const expected = estimatedPayableCents.value;
      const created = (await createOrder(payload, orderRequestKey.value)).data
        .data;
      orderRequestKey.value = uuidV4();
      preferredPlayerIds.value = [];
      orderVisible.value = false;
      // 成交价以后端 payable_cents 为准：与页面试算不一致时如实提示，不静默按试算值展示。
      if (created && expected > 0 && created.payable_cents !== expected) {
        Message.warning(
          `报单已受理，但应付与页面试算不一致：后端 ${money(
            created.payable_cents
          )}、页面试算 ${money(expected)}，请以订单详情为准`
        );
      } else {
        Message.success('报单成功');
      }
      await loadActive();
    } catch (err) {
      Message.error(
        errorText(
          err,
          '报单失败，请检查支付时限配置、可售名额、人工调整额度与指定陪玩资质'
        )
      );
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
