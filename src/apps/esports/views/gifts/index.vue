<template>
  <div class="container page-container">
    <a-card class="general-card" title="礼物目录">
      <a-space class="toolbar">
        <a-button :loading="loading" @click="load">刷新</a-button>
        <a-button v-if="canManage" type="primary" @click="openCreate"
          >新建礼物</a-button
        >
      </a-space>

      <a-table
        :data="items"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="code" title="编号" />
          <a-table-column data-index="name" title="名称" />
          <a-table-column data-index="category" title="分类" />
          <a-table-column title="价格">
            <template #cell="{ record }">{{
              yuan(record.price_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="默认分成">
            <template #cell="{ record }">{{ commissionText(record) }}</template>
          </a-table-column>
          <a-table-column title="高额档">
            <template #cell="{ record }">{{
              record.high_value ? '是' : '否'
            }}</template>
          </a-table-column>
          <a-table-column title="年龄限制">
            <template #cell="{ record }">{{
              record.require_age ? '是' : '否'
            }}</template>
          </a-table-column>
          <a-table-column title="排序" :width="70">
            <template #cell="{ record }">{{ record.sort_order }}</template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)">{{
                statusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="200">
            <template #cell="{ record }">
              <template v-if="canManage">
                <a-button type="text" @click="openEdit(record)">编辑</a-button>
                <a-button
                  v-if="record.status !== 'on_sale'"
                  type="text"
                  status="success"
                  @click="changeStatus(record, 'on_sale')"
                  >上架</a-button
                >
                <a-button
                  v-else
                  type="text"
                  status="danger"
                  @click="changeStatus(record, 'off_sale')"
                  >下架</a-button
                >
              </template>
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="待确认礼物">
      <a-space class="toolbar">
        <a-button :loading="intentLoading" @click="loadIntents"
          >刷新确认单</a-button
        >
        <a-button v-if="canManage" type="primary" @click="openSend"
          >发起客户确认</a-button
        >
      </a-space>
      <a-table
        :data="intents"
        :loading="intentLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column data-index="id" title="确认单 ID" />
          <a-table-column data-index="customer_id" title="客户 ID" />
          <a-table-column title="礼物 / 收礼陪玩">
            <template #cell="{ record }"
              >{{ record.gift_name }} × {{ record.quantity }} →
              {{ record.player_name }}</template
            >
          </a-table-column>
          <a-table-column title="客户确认金额">
            <template #cell="{ record }">{{
              yuan(record.amount_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="付款来源">
            <template #cell="{ record }">{{
              record.stored_value_card_id
                ? `储值卡 ${record.stored_value_card_no} 本金`
                : '客户余额本金'
            }}</template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">{{
              intentStatus(record.status)
            }}</template>
          </a-table-column>
          <a-table-column title="到期时间">
            <template #cell="{ record }">{{ record.expires_at }}</template>
          </a-table-column>
          <a-table-column title="操作">
            <template #cell="{ record }">
              <a-button
                v-if="canManage && record.status === 'confirmed'"
                type="text"
                @click="executeIntent(record)"
                >执行送礼</a-button
              >
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
      <div class="hint"
        >客户在移动端核对礼物、收礼人、数量和金额后确认；确认单 30
        分钟内有效。</div
      >
    </a-card>

    <a-card class="general-card" title="送礼单据">
      <a-space class="toolbar" wrap>
        <a-input-number
          v-model="filterCustomerId"
          :min="1"
          placeholder="客户 ID"
          :style="{ width: '140px' }"
        />
        <a-input-number
          v-model="filterPlayerId"
          :min="1"
          placeholder="陪玩 ID"
          :style="{ width: '140px' }"
        />
        <a-select
          v-model="filterReviewStatus"
          placeholder="复核状态"
          allow-clear
          :style="{ width: '160px' }"
        >
          <a-option value="normal">正常</a-option>
          <a-option value="flagged">待复核</a-option>
          <a-option value="approved">复核通过</a-option>
          <a-option value="rejected">复核驳回</a-option>
        </a-select>
        <a-button type="primary" :loading="orderLoading" @click="loadOrders"
          >查询</a-button
        >
      </a-space>

      <a-table
        :data="orders"
        :loading="orderLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column data-index="gift_no" title="礼物单号" :width="200" />
          <a-table-column title="客户 / 陪玩">
            <template #cell="{ record }"
              >{{ record.customer_id }} → {{ record.player_name }}（{{
                record.player_id
              }}）</template
            >
          </a-table-column>
          <a-table-column title="金额">
            <template #cell="{ record }">{{
              yuan(record.amount_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="付款来源">
            <template #cell="{ record }">{{
              record.stored_value_card_id
                ? `储值卡 ${record.stored_value_card_id} 本金`
                : '客户余额本金'
            }}</template>
          </a-table-column>
          <a-table-column title="陪玩收入">
            <template #cell="{ record }">{{
              yuan(record.income_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="关联订单">
            <template #cell="{ record }">{{ record.order_id ?? '-' }}</template>
          </a-table-column>
          <a-table-column title="复核">
            <template #cell="{ record }">
              <a-tag :color="reviewColor(record.review_status)">{{
                reviewLabel(record.review_status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">{{
              record.status === 'refunded' ? '已退款' : '已支付'
            }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="220">
            <template #cell="{ record }">
              <template v-if="canManage && record.status === 'paid'">
                <template v-if="record.review_status === 'flagged'">
                  <a-button
                    type="text"
                    status="success"
                    @click="review(record, 'approve')"
                    >通过</a-button
                  >
                  <a-button
                    type="text"
                    status="danger"
                    @click="review(record, 'reject')"
                    >驳回</a-button
                  >
                </template>
                <a-button
                  type="text"
                  status="danger"
                  @click="openRefund(record)"
                  >退款</a-button
                >
              </template>
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="礼物榜单">
      <a-space class="toolbar">
        <a-select v-model="board" :style="{ width: '180px' }">
          <a-option value="player">陪玩收礼榜</a-option>
          <a-option value="customer">客户贡献榜</a-option>
        </a-select>
        <a-select v-model="period" :style="{ width: '140px' }">
          <a-option value="daily">日榜</a-option>
          <a-option value="weekly">周榜</a-option>
          <a-option value="monthly">月榜</a-option>
        </a-select>
        <a-button :loading="boardLoading" @click="loadBoard">查询</a-button>
      </a-space>
      <a-table
        :data="boardRows"
        :loading="boardLoading"
        row-key="owner_id"
        :pagination="false"
      >
        <template #columns>
          <a-table-column title="排名" :width="70">
            <template #cell="{ rowIndex }">{{ rowIndex + 1 }}</template>
          </a-table-column>
          <a-table-column title="归属" :width="120">
            <template #cell="{ record }">{{ record.owner_id }}</template>
          </a-table-column>
          <a-table-column data-index="owner_name" title="名称" />
          <a-table-column title="金额">
            <template #cell="{ record }">{{
              yuan(record.amount_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="笔数" :width="90">
            <template #cell="{ record }">{{ record.count }}</template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card
      class="general-card"
      title="礼物争议（§9.5 申请 → 审核 → 执行部分退款）"
    >
      <a-space class="toolbar">
        <a-select
          v-model="disputeFilterStatus"
          placeholder="全部状态"
          allow-clear
          :style="{ width: '160px' }"
        >
          <a-option value="pending_review">待审核</a-option>
          <a-option value="approved">待执行</a-option>
          <a-option value="completed">已完成</a-option>
          <a-option value="rejected">已驳回</a-option>
          <a-option value="withdrawn">已撤回</a-option>
        </a-select>
        <a-button :loading="disputesLoading" @click="loadDisputes"
          >刷新</a-button
        >
        <a-button type="primary" @click="openDisputeCreate"
          >代客户建单</a-button
        >
      </a-space>
      <div class="hint">
        客户可在移动端对本人礼物订单发起争议；客服审核须给出不超过申请额与可退余额的确认金额，
        审核人与申请人、执行人与审核人不得为同一人。执行后按比例冲回礼物分成、客服提成与成长值。
      </div>
      <a-table
        :data="disputes"
        :loading="disputesLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column
            data-index="dispute_no"
            title="争议单号"
            :width="200"
          />
          <a-table-column data-index="gift_no" title="礼物单号" :width="180" />
          <a-table-column title="类型" :width="120">
            <template #cell="{ record }">{{
              disputeKindText(record.kind)
            }}</template>
          </a-table-column>
          <a-table-column data-index="demand" title="客户诉求" />
          <a-table-column title="申请 / 确认" :width="160">
            <template #cell="{ record }">
              {{ yuan(record.requested_refund_cents) }} /
              {{
                record.approved_refund_cents
                  ? yuan(record.approved_refund_cents)
                  : '-'
              }}
            </template>
          </a-table-column>
          <a-table-column title="状态" :width="110">
            <template #cell="{ record }">
              <a-tag :color="disputeStatusTagColor(record.status)">{{
                disputeStatusText(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="180">
            <template #cell="{ record }">
              <a-button
                v-if="record.status === 'pending_review'"
                type="text"
                @click="openDisputeReview(record)"
                >审核</a-button
              >
              <a-button
                v-else-if="record.status === 'approved'"
                type="text"
                @click="executeDispute(record)"
                >执行退款</a-button
              >
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="disputeCreateVisible"
      title="代客户建礼物争议单"
      :width="600"
      @ok="submitDisputeCreate"
      @cancel="disputeCreateVisible = false"
    >
      <a-form :model="disputeCreateForm">
        <a-form-item label="礼物单据" required>
          <a-select
            v-model="disputeCreateForm.giftOrderId"
            placeholder="选择可退的礼物单据"
          >
            <a-option
              v-for="order in refundableOrders"
              :key="order.id"
              :value="order.id"
            >
              {{ order.gift_no }} · 客户 {{ order.customer_id }} ·
              {{ yuan(order.amount_cents) }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="争议类型" required>
          <a-select v-model="disputeCreateForm.kind">
            <a-option
              v-for="(label, key) in disputeKindMap"
              :key="key"
              :value="key"
              >{{ label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="客户诉求" required>
          <a-textarea
            v-model="disputeCreateForm.demand"
            :max-length="500"
            :auto-size="{ minRows: 2 }"
          />
        </a-form-item>
        <a-form-item label="申请退款（元）" required>
          <a-input-number
            v-model="disputeCreateForm.requestedYuan"
            :min="0.01"
            :precision="2"
          />
        </a-form-item>
        <div class="hint">代客户建单时会记录申请人，审核不得由本人完成。</div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="disputeReviewVisible"
      title="审核礼物争议"
      :width="560"
      @ok="submitDisputeReview"
      @cancel="disputeReviewVisible = false"
    >
      <a-form :model="disputeReviewForm">
        <a-form-item label="审核结论" required>
          <a-radio-group v-model="disputeReviewForm.approve">
            <a-radio :value="true">通过并退款</a-radio>
            <a-radio :value="false">驳回</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="disputeReviewForm.approve"
          label="确认退款（元）"
          required
        >
          <a-input-number
            v-model="disputeReviewForm.approvedYuan"
            :min="0.01"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="审核说明">
          <a-textarea
            v-model="disputeReviewForm.resolution"
            :max-length="255"
            :auto-size="{ minRows: 2 }"
          />
        </a-form-item>
        <div class="hint">
          申请退款
          {{
            disputeReviewTarget
              ? yuan(disputeReviewTarget.requested_refund_cents)
              : '-'
          }}，确认额不得超过申请额与可退余额；驳回必须填写说明。
        </div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="formVisible"
      :title="formTarget ? '编辑礼物' : '新建礼物'"
      :width="640"
      @ok="submitForm"
      @cancel="formVisible = false"
    >
      <a-form :model="form">
        <a-form-item label="编号" required>
          <a-input
            v-model="form.code"
            :max-length="80"
            :disabled="!!formTarget"
          />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model="form.name" :max-length="120" />
        </a-form-item>
        <a-form-item label="分类">
          <a-input v-model="form.category" :max-length="80" />
        </a-form-item>
        <a-form-item label="价格（元）" required>
          <a-input-number v-model="form.priceYuan" :min="0.01" :precision="2" />
        </a-form-item>
        <a-form-item label="分成方式" required>
          <a-radio-group v-model="form.commissionMode">
            <a-radio value="percent">按比例</a-radio>
            <a-radio value="fixed">固定金额</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="form.commissionMode === 'percent'"
          label="分成比例（%）"
        >
          <a-input-number
            v-model="form.commissionPercent"
            :min="0"
            :max="100"
            :precision="2"
          />
        </a-form-item>
        <a-form-item v-else label="固定分成（元）">
          <a-input-number
            v-model="form.commissionYuan"
            :min="0"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="高额档（需二次确认）">
          <a-switch v-model="form.highValue" />
        </a-form-item>
        <a-form-item label="仅成年客户可送">
          <a-switch v-model="form.requireAge" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="form.sortOrder" :min="0" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="sendVisible"
      title="发起礼物确认"
      :ok-loading="sendSubmitting"
      :mask-closable="!sendSubmitting"
      @ok="submitSend"
      @cancel="sendVisible = false"
    >
      <a-form :model="sendForm">
        <a-form-item label="客户 ID" required>
          <a-input-number v-model="sendForm.customerId" :min="1" />
        </a-form-item>
        <a-form-item label="礼物" required>
          <a-select v-model="sendForm.giftId" placeholder="选择上架礼物">
            <a-option
              v-for="gift in onSaleGifts"
              :key="gift.id"
              :value="gift.id"
              >{{ gift.name }}（{{ yuan(gift.price_cents) }}）</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="收礼陪玩 ID" required>
          <a-input-number v-model="sendForm.playerId" :min="1" />
        </a-form-item>
        <a-form-item label="数量" required>
          <a-input-number v-model="sendForm.quantity" :min="1" :max="999" />
        </a-form-item>
        <a-form-item label="关联订单 ID（仅追溯，可不填）">
          <a-input-number v-model="sendForm.orderId" :min="0" />
        </a-form-item>
        <a-form-item label="付款来源" required>
          <a-radio-group v-model="sendForm.paymentSource">
            <a-radio value="customer_balance_principal">客户余额本金</a-radio>
            <a-radio value="stored_value_card_principal">储值卡本金</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="sendForm.paymentSource === 'stored_value_card_principal'"
          label="可送礼储值卡 ID"
          required
        >
          <a-input-number v-model="sendForm.storedValueCardId" :min="1" />
          <div class="hint"
            >请从该客户的储值卡列表选择合同允许送礼且仍有实付本金的卡。</div
          >
        </a-form-item>
        <div class="hint"
          >创建后请客户在移动端“我的 → 待确认礼物”核对并确认，再执行送礼。</div
        >
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="refundVisible"
      title="礼物退款"
      @ok="submitRefund"
      @cancel="refundVisible = false"
    >
      <a-form :model="refundForm">
        <a-form-item label="退款原因" required>
          <a-textarea v-model="refundForm.reason" :max-length="255" />
        </a-form-item>
      </a-form>
      <div class="hint"
        >退款将原路退还余额或储值卡本金，并冲回礼物分成与会员成长值。</div
      >
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    createGift,
    createGiftDisputeByAdmin,
    executeGiftDispute,
    getGiftLeaderboard,
    listGiftDisputes,
    listGiftOrders,
    listGifts,
    refundGift,
    reviewGift,
    reviewGiftDispute,
    listGiftIntents,
    createGiftIntent,
    executeGiftIntent,
    setGiftStatus,
    updateGift,
  } from '../../api';
  import type {
    Gift,
    GiftDispute,
    GiftDisputeKind,
    GiftDisputeStatus,
    GiftIntent,
    GiftLeaderboardRow,
    GiftOrder,
    GiftReviewStatus,
    GiftStatus,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canManage = computed(() => hasButtonPermission('esports:gifts:manage'));

  const statusMap: Record<GiftStatus, string> = {
    draft: '草稿',
    on_sale: '上架',
    off_sale: '下架',
  };
  const statusColorMap: Record<GiftStatus, string> = {
    draft: 'gray',
    on_sale: 'green',
    off_sale: 'orange',
  };
  const reviewMap: Record<GiftReviewStatus, string> = {
    normal: '正常',
    flagged: '待复核',
    approved: '复核通过',
    rejected: '复核驳回',
  };
  const reviewColorMap: Record<GiftReviewStatus, string> = {
    normal: 'green',
    flagged: 'orange',
    approved: 'blue',
    rejected: 'red',
  };
  const statusLabel = (value: GiftStatus) => statusMap[value] || value;
  const statusColor = (value: GiftStatus) => statusColorMap[value] || 'gray';
  const reviewLabel = (value: GiftReviewStatus) => reviewMap[value] || value;
  const reviewColor = (value: GiftReviewStatus) =>
    reviewColorMap[value] || 'gray';
  // 金额以分存储，展示为元。
  const yuan = (value: number) => `¥${(value / 100).toFixed(2)}`;
  const commissionText = (gift: Gift) =>
    gift.commission_mode === 'fixed'
      ? `${yuan(gift.commission_cents)} / 笔`
      : `${gift.commission_bp / 100}%`;
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  // ── 礼物目录 ──
  const loading = ref(false);
  const items = ref<Gift[]>([]);
  const onSaleGifts = computed(() =>
    items.value.filter((gift) => gift.status === 'on_sale')
  );

  async function load() {
    loading.value = true;
    try {
      items.value = (await listGifts()).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载礼物目录失败'));
    } finally {
      loading.value = false;
    }
  }

  const formVisible = ref(false);
  const formTarget = ref<Gift | null>(null);
  const form = reactive({
    code: '',
    name: '',
    category: '',
    priceYuan: 0,
    commissionMode: 'percent' as 'percent' | 'fixed',
    commissionPercent: 60,
    commissionYuan: 0,
    highValue: false,
    requireAge: false,
    sortOrder: 0,
  });

  function openCreate() {
    formTarget.value = null;
    Object.assign(form, {
      code: '',
      name: '',
      category: '',
      priceYuan: 0,
      commissionMode: 'percent',
      commissionPercent: 60,
      commissionYuan: 0,
      highValue: false,
      requireAge: false,
      sortOrder: 0,
    });
    formVisible.value = true;
  }

  function openEdit(record: Gift) {
    formTarget.value = record;
    Object.assign(form, {
      code: record.code,
      name: record.name,
      category: record.category,
      priceYuan: record.price_cents / 100,
      commissionMode: record.commission_mode,
      commissionPercent: record.commission_bp / 100,
      commissionYuan: record.commission_cents / 100,
      highValue: record.high_value,
      requireAge: record.require_age,
      sortOrder: record.sort_order,
    });
    formVisible.value = true;
  }

  async function submitForm() {
    const payload = {
      code: form.code,
      name: form.name,
      icon: '',
      price_cents: Math.round(form.priceYuan * 100),
      category: form.category,
      commission_mode: form.commissionMode,
      commission_bp:
        form.commissionMode === 'percent'
          ? Math.round(form.commissionPercent * 100)
          : 0,
      commission_cents:
        form.commissionMode === 'fixed'
          ? Math.round(form.commissionYuan * 100)
          : 0,
      high_value: form.highValue,
      require_age: form.requireAge,
      sort_order: form.sortOrder,
    };
    try {
      if (formTarget.value) {
        await updateGift(formTarget.value.id, {
          ...payload,
          expected_version: formTarget.value.version,
        });
      } else {
        await createGift({ ...payload, status: 'draft' });
      }
      Message.success('保存成功');
      formVisible.value = false;
      await load();
    } catch (err) {
      Message.error(errorText(err, '提交失败：编号重复、版本已变化或参数无效'));
    }
  }

  async function changeStatus(record: Gift, status: GiftStatus) {
    try {
      await setGiftStatus(record.id, record.version, status);
      Message.success('状态已更新');
      await load();
    } catch (err) {
      Message.error(errorText(err, '状态更新失败：版本已变化或状态不允许'));
    }
  }

  // ── 送礼单据 ──
  const orderLoading = ref(false);
  const orders = ref<GiftOrder[]>([]);
  const filterCustomerId = ref<number>();
  const filterPlayerId = ref<number>();
  const filterReviewStatus = ref<GiftReviewStatus>();

  async function loadOrders() {
    orderLoading.value = true;
    try {
      orders.value =
        (
          await listGiftOrders({
            customer_id: filterCustomerId.value,
            player_id: filterPlayerId.value,
            review_status: filterReviewStatus.value,
          })
        ).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载礼物单据失败'));
    } finally {
      orderLoading.value = false;
    }
  }

  const sendVisible = ref(false);
  const intentLoading = ref(false);
  const intents = ref<GiftIntent[]>([]);
  const intentStatus = (value: GiftIntent['status']) =>
    ({
      pending: '待客户确认',
      confirmed: '客户已确认',
      consumed: '已送礼',
      cancelled: '已取消',
    }[value]);
  async function loadIntents() {
    intentLoading.value = true;
    try {
      intents.value = (await listGiftIntents()).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载确认单失败'));
    } finally {
      intentLoading.value = false;
    }
  }
  async function executeIntent(intent: GiftIntent) {
    try {
      await executeGiftIntent(intent.id);
      Message.success('送礼成功');
      await loadIntents();
      await loadOrders();
    } catch (err) {
      Message.error(
        errorText(err, '执行失败：确认单过期、明细已变化或余额不足')
      );
    }
  }
  const sendForm = reactive({
    customerId: 0,
    giftId: undefined as number | undefined,
    playerId: 0,
    quantity: 1,
    orderId: 0,
    paymentSource: 'customer_balance_principal' as
      | 'customer_balance_principal'
      | 'stored_value_card_principal',
    storedValueCardId: 0,
  });

  // 礼物确认单幂等（§9.5-02）：client_key 与「本次提交内容」绑定——同一份内容连点两次复用同一个键，
  // 只产生一张确认单（服务端按 client_key + 请求体哈希去重）；内容变了就换键，
  // 否则同键异体会被后端判为冲突，改正表单后重试将一直失败。
  const sendSubmitting = ref(false);
  const sendClientKey = ref('');
  let sendKeyBody = '';

  function ensureSendClientKey(body: string) {
    if (!sendClientKey.value || sendKeyBody !== body) {
      sendClientKey.value = crypto.randomUUID();
      sendKeyBody = body;
    }
    return sendClientKey.value;
  }

  function openSend() {
    Object.assign(sendForm, {
      customerId: 0,
      giftId: undefined,
      playerId: 0,
      quantity: 1,
      orderId: 0,
      paymentSource: 'customer_balance_principal',
      storedValueCardId: 0,
    });
    sendClientKey.value = '';
    sendKeyBody = '';
    sendSubmitting.value = false;
    sendVisible.value = true;
  }

  async function submitSend() {
    if (sendSubmitting.value) return;
    if (!sendForm.giftId) {
      Message.error('请选择礼物');
      return;
    }
    if (
      sendForm.paymentSource === 'stored_value_card_principal' &&
      !sendForm.storedValueCardId
    ) {
      Message.error('请选择可送礼储值卡');
      return;
    }
    // 幂等键绑定提交内容（不含 client_key 本身）。
    const body = {
      customer_id: sendForm.customerId,
      gift_id: sendForm.giftId,
      player_id: sendForm.playerId,
      quantity: sendForm.quantity,
      order_id: sendForm.orderId ? sendForm.orderId : null,
      payment_source: sendForm.paymentSource,
      stored_value_card_id:
        sendForm.paymentSource === 'stored_value_card_principal'
          ? sendForm.storedValueCardId
          : 0,
    };
    sendSubmitting.value = true;
    try {
      await createGiftIntent({
        ...body,
        client_key: ensureSendClientKey(JSON.stringify(body)),
      });
      Message.success('已发起客户确认');
      sendVisible.value = false;
      // 表单会话结束才清键：同一份内容重复提交仍命中同一条确认单。
      sendClientKey.value = '';
      sendKeyBody = '';
      await loadIntents();
    } catch (err) {
      Message.error(
        errorText(err, '创建确认单失败：身份、年龄或礼物状态不符合要求')
      );
    } finally {
      sendSubmitting.value = false;
    }
  }

  async function review(record: GiftOrder, decision: 'approve' | 'reject') {
    try {
      await reviewGift(record.id, decision);
      Message.success('复核完成');
      await loadOrders();
    } catch (err) {
      Message.error(errorText(err, '复核失败：状态已变化'));
    }
  }

  const refundVisible = ref(false);
  const refundTarget = ref<GiftOrder | null>(null);
  const refundForm = reactive({ reason: '' });

  function openRefund(record: GiftOrder) {
    refundTarget.value = record;
    refundForm.reason = '';
    refundVisible.value = true;
  }

  async function submitRefund() {
    if (!refundTarget.value) return;
    try {
      await refundGift(refundTarget.value.id, refundForm.reason);
      Message.success('退款成功');
      refundVisible.value = false;
      await loadOrders();
    } catch (err) {
      Message.error(errorText(err, '退款失败：单据已退款或状态不允许'));
    }
  }

  // ── 榜单 ──
  const boardLoading = ref(false);
  const board = ref<'customer' | 'player'>('player');
  const period = ref<'daily' | 'weekly' | 'monthly'>('daily');
  const boardRows = ref<GiftLeaderboardRow[]>([]);

  async function loadBoard() {
    boardLoading.value = true;
    try {
      boardRows.value =
        (await getGiftLeaderboard(board.value, period.value)).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载榜单失败'));
    } finally {
      boardLoading.value = false;
    }
  }

  // ── 礼物争议（§9.5）：客户申请 → 客服审核 → 执行部分退款 ──
  const disputeKindMap: Record<GiftDisputeKind, string> = {
    not_received: '未收到礼物',
    wrong_gift: '送错对象',
    quality: '礼物与说明不符',
    unauthorized: '非本人授权送礼',
    other: '其他',
  };
  const disputeStatusMap: Record<GiftDisputeStatus, string> = {
    pending_review: '待审核',
    approved: '待执行',
    rejected: '已驳回',
    completed: '已完成',
    withdrawn: '已撤回',
  };
  const disputeStatusColor: Record<GiftDisputeStatus, string> = {
    pending_review: 'orange',
    approved: 'blue',
    rejected: 'red',
    completed: 'green',
    withdrawn: 'gray',
  };

  const disputeKindText = (kind: string) =>
    disputeKindMap[kind as GiftDisputeKind] || kind;
  const disputeStatusText = (status: string) =>
    disputeStatusMap[status as GiftDisputeStatus] || status;
  const disputeStatusTagColor = (status: string) =>
    disputeStatusColor[status as GiftDisputeStatus] || 'gray';

  const disputes = ref<GiftDispute[]>([]);
  const disputesLoading = ref(false);
  const disputeFilterStatus = ref<GiftDisputeStatus>();

  // 可发起争议的礼物单据：已支付且未退满。
  const refundableOrders = computed(() =>
    orders.value.filter(
      (order) => order.status === 'paid' && order.refund_status !== 'full'
    )
  );

  async function loadDisputes() {
    disputesLoading.value = true;
    try {
      disputes.value =
        (await listGiftDisputes(disputeFilterStatus.value)).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载礼物争议失败'));
    } finally {
      disputesLoading.value = false;
    }
  }

  const disputeCreateVisible = ref(false);
  const disputeCreateForm = reactive<{
    giftOrderId?: number;
    kind: GiftDisputeKind;
    demand: string;
    requestedYuan: number;
  }>({ giftOrderId: undefined, kind: 'quality', demand: '', requestedYuan: 0 });

  function openDisputeCreate() {
    disputeCreateForm.giftOrderId = undefined;
    disputeCreateForm.kind = 'quality';
    disputeCreateForm.demand = '';
    disputeCreateForm.requestedYuan = 0;
    disputeCreateVisible.value = true;
  }

  async function submitDisputeCreate() {
    const order = refundableOrders.value.find(
      (row) => row.id === disputeCreateForm.giftOrderId
    );
    if (!order) {
      Message.warning('请选择可退的礼物单据');
      return;
    }
    if (!disputeCreateForm.demand.trim()) {
      Message.warning('请填写客户诉求');
      return;
    }
    if (disputeCreateForm.requestedYuan <= 0) {
      Message.warning('请填写申请退款金额');
      return;
    }
    const availableYuan = (order.amount_cents - order.refund_cents) / 100;
    if (disputeCreateForm.requestedYuan > availableYuan) {
      Message.warning(`申请额不得超过可退余额 ${availableYuan} 元`);
      return;
    }
    try {
      await createGiftDisputeByAdmin({
        gift_order_id: order.id,
        customer_id: order.customer_id,
        kind: disputeCreateForm.kind,
        demand: disputeCreateForm.demand.trim(),
        requested_refund_cents: Math.round(
          disputeCreateForm.requestedYuan * 100
        ),
      });
      disputeCreateVisible.value = false;
      Message.success('已建争议单，待审核');
      await loadDisputes();
    } catch (err) {
      Message.error(
        errorText(err, '建单失败：该单据已有进行中争议、非归属客户或参数无效')
      );
    }
  }

  const disputeReviewVisible = ref(false);
  const disputeReviewTarget = ref<GiftDispute | null>(null);
  const disputeReviewForm = reactive<{
    approve: boolean;
    approvedYuan: number;
    resolution: string;
  }>({ approve: true, approvedYuan: 0, resolution: '' });

  function openDisputeReview(record: GiftDispute) {
    disputeReviewTarget.value = record;
    disputeReviewForm.approve = true;
    disputeReviewForm.approvedYuan = record.requested_refund_cents / 100;
    disputeReviewForm.resolution = '';
    disputeReviewVisible.value = true;
  }

  async function submitDisputeReview() {
    const target = disputeReviewTarget.value;
    if (!target) return;
    if (disputeReviewForm.approve && disputeReviewForm.approvedYuan <= 0) {
      Message.warning('请填写确认退款金额');
      return;
    }
    if (!disputeReviewForm.approve && !disputeReviewForm.resolution.trim()) {
      Message.warning('驳回必须填写说明');
      return;
    }
    try {
      await reviewGiftDispute(target.id, {
        approve: disputeReviewForm.approve,
        approved_refund_cents: disputeReviewForm.approve
          ? Math.round(disputeReviewForm.approvedYuan * 100)
          : undefined,
        resolution: disputeReviewForm.resolution.trim(),
      });
      disputeReviewVisible.value = false;
      Message.success(
        disputeReviewForm.approve ? '已通过，待执行退款' : '已驳回'
      );
      await loadDisputes();
    } catch (err) {
      Message.error(
        errorText(err, '审核失败：申请人不得自审、确认额超限或状态已变化')
      );
    }
  }

  async function executeDispute(record: GiftDispute) {
    try {
      await executeGiftDispute(record.id);
      Message.success('已执行退款并按比例冲回分成');
      await loadDisputes();
      await loadOrders();
    } catch (err) {
      Message.error(
        errorText(err, '执行失败：执行人不得为审核人，或可退余额不足')
      );
    }
  }

  onMounted(async () => {
    await load();
    await loadOrders();
    await loadIntents();
    await loadBoard();
    await loadDisputes();
  });
</script>

<style scoped>
  .toolbar {
    margin-bottom: 12px;
  }

  .hint {
    color: var(--color-text-3);
    font-size: 12px;
  }
</style>
