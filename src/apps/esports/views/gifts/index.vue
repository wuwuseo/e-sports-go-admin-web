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
        <a-button v-if="canManage" type="outline" @click="openSend"
          >代客送礼</a-button
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
      title="代客送礼"
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
        <a-form-item label="大额二次确认">
          <a-switch v-model="sendForm.confirmed" />
          <div class="hint">高额档礼物或超过阈值的大额打赏必须开启</div>
        </a-form-item>
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
      <div class="hint">退款将退还本金，并冲回礼物分成与会员成长值。</div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    createGift,
    getGiftLeaderboard,
    listGiftOrders,
    listGifts,
    refundGift,
    reviewGift,
    sendGift,
    setGiftStatus,
    updateGift,
  } from '../../api';
  import type {
    Gift,
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
  const sendForm = reactive({
    customerId: 0,
    giftId: undefined as number | undefined,
    playerId: 0,
    quantity: 1,
    orderId: 0,
    confirmed: false,
  });

  function openSend() {
    Object.assign(sendForm, {
      customerId: 0,
      giftId: undefined,
      playerId: 0,
      quantity: 1,
      orderId: 0,
      confirmed: false,
    });
    sendVisible.value = true;
  }

  async function submitSend() {
    if (!sendForm.giftId) {
      Message.error('请选择礼物');
      return;
    }
    try {
      await sendGift({
        customer_id: sendForm.customerId,
        gift_id: sendForm.giftId,
        player_id: sendForm.playerId,
        quantity: sendForm.quantity,
        order_id: sendForm.orderId ? sendForm.orderId : null,
        confirmed: sendForm.confirmed,
        // 客户端防抖 + 服务端幂等：每次提交生成一次性幂等键。
        client_key: crypto.randomUUID(),
      });
      Message.success('送礼成功');
      sendVisible.value = false;
      await loadOrders();
    } catch (err) {
      Message.error(errorText(err, '送礼失败：身份/年龄/大额确认或余额不足'));
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

  onMounted(async () => {
    await load();
    await loadOrders();
    await loadBoard();
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
