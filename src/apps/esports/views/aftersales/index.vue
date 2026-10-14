<template>
  <div class="container page-container">
    <a-card class="general-card" title="售后">
      <a-space class="toolbar">
        <a-select
          v-model="statusFilter"
          :style="{ width: '160px' }"
          @change="load"
        >
          <a-option value="">全部</a-option>
          <a-option
            v-for="option in statusOptions"
            :key="option.value"
            :value="option.value"
            >{{ option.label }}</a-option
          >
        </a-select>
        <a-button :loading="loading" @click="load">刷新</a-button>
        <a-button v-if="canOperate" type="primary" @click="openCreate"
          >新建售后</a-button
        >
      </a-space>
      <a-table
        :data="items"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="after_sale_no" title="售后单号" />
          <a-table-column title="关联订单">
            <template #cell="{ record }">#{{ record.source_id }}</template>
          </a-table-column>
          <a-table-column title="类型">
            <template #cell="{ record }">{{ kindLabel(record.kind) }}</template>
          </a-table-column>
          <a-table-column title="来源">
            <template #cell="{ record }">{{
              channelLabel(record.channel)
            }}</template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">{{
              statusLabel(record.status)
            }}</template>
          </a-table-column>
          <a-table-column title="责任方">
            <template #cell="{ record }">{{
              faultLabel(record.fault_party)
            }}</template>
          </a-table-column>
          <a-table-column title="方案">
            <template #cell="{ record }">{{
              planLabel(record.plan_action)
            }}</template>
          </a-table-column>
          <a-table-column title="赔付金额">
            <template #cell="{ record }">{{
              money(record.refund_cents)
            }}</template>
          </a-table-column>
          <a-table-column data-index="handler_admin_id" title="处理人" />
          <a-table-column title="阶段时限">
            <template #cell="{ record }">
              <a-typography-text
                :type="record.sla_overdue ? 'danger' : undefined"
                >{{ slaLabel(record) }}</a-typography-text
              >
            </template>
          </a-table-column>
          <a-table-column data-index="created_at" title="创建时间" />
          <a-table-column title="操作" :width="260">
            <template #cell="{ record }">
              <a-button type="text" @click="showDetail(record.id)"
                >详情</a-button
              >
              <template v-if="canOperate">
                <a-button
                  v-if="record.status === 'pending_accept'"
                  type="text"
                  @click="accept(record)"
                  >受理</a-button
                >
                <a-button
                  v-if="record.status === 'processing'"
                  type="text"
                  @click="openPlan(record)"
                  >提交方案</a-button
                >
                <a-button
                  v-if="record.status === 'pending_customer_confirm'"
                  type="text"
                  status="success"
                  @click="confirmPlan(record)"
                  >代客户确认</a-button
                >
                <a-button
                  v-if="record.status === 'pending_approval'"
                  type="text"
                  status="success"
                  @click="approve(record)"
                  >审批</a-button
                >
                <a-button
                  v-if="record.status === 'pending_approval'"
                  type="text"
                  status="danger"
                  @click="openReject(record)"
                  >驳回</a-button
                >
                <a-button
                  v-if="record.status === 'pending_execution'"
                  type="text"
                  status="success"
                  @click="execute(record)"
                  >执行</a-button
                >
                <a-button
                  v-if="canWithdraw(record)"
                  type="text"
                  @click="withdraw(record)"
                  >撤回</a-button
                >
              </template>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-drawer
      v-model:visible="detailVisible"
      title="售后详情"
      :width="520"
      :footer="false"
    >
      <a-descriptions v-if="detail" :column="1" bordered>
        <a-descriptions-item label="售后单号">{{
          detail.after_sale_no
        }}</a-descriptions-item>
        <a-descriptions-item label="关联订单"
          >#{{ detail.source_id }}
          <template v-if="detailOrderNo">（{{ detailOrderNo }}）</template>
        </a-descriptions-item>
        <a-descriptions-item label="类型 / 来源"
          >{{ kindLabel(detail.kind) }} /
          {{ channelLabel(detail.channel) }}</a-descriptions-item
        >
        <a-descriptions-item label="状态">{{
          statusLabel(detail.status)
        }}</a-descriptions-item>
        <a-descriptions-item label="诉求">{{
          detail.demand
        }}</a-descriptions-item>
        <a-descriptions-item label="期望方案">{{
          detail.expected_plan || '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="凭证">{{
          detail.evidence_ref || '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="联系方式">{{
          detail.contact || '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="责任方 / 方案"
          >{{ faultLabel(detail.fault_party) }} /
          {{ planLabel(detail.plan_action) }}</a-descriptions-item
        >
        <a-descriptions-item label="赔付金额">{{
          money(detail.refund_cents)
        }}</a-descriptions-item>
        <a-descriptions-item label="客户 / 陪玩"
          >{{ detail.customer_id ?? '-' }} /
          {{ detail.player_id ?? '-' }}</a-descriptions-item
        >
        <a-descriptions-item label="处理 / 审批 / 执行"
          >{{ detail.handler_admin_id ?? '-' }} /
          {{ detail.approver_admin_id ?? '-' }} /
          {{ detail.executor_admin_id ?? '-' }}</a-descriptions-item
        >
        <a-descriptions-item label="处理说明">{{
          detail.resolution || '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="创建 / 结束时间"
          >{{ detail.created_at }} /
          {{ detail.resolved_at || '-' }}</a-descriptions-item
        >
      </a-descriptions>
    </a-drawer>

    <a-modal
      v-model:visible="createVisible"
      title="新建售后"
      @ok="submitCreate"
      @cancel="createVisible = false"
    >
      <a-form :model="createForm">
        <a-form-item label="来源订单 ID" required>
          <a-input-number v-model="createForm.sourceId" :min="1" />
        </a-form-item>
        <a-form-item label="类型" required>
          <a-select v-model="createForm.kind">
            <a-option
              v-for="option in kindOptions"
              :key="option.value"
              :value="option.value"
              >{{ option.label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="来源" required>
          <a-select v-model="createForm.channel">
            <a-option
              v-for="option in channelOptions"
              :key="option.value"
              :value="option.value"
              >{{ option.label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="诉求" required>
          <a-textarea v-model="createForm.demand" :max-length="500" />
        </a-form-item>
        <a-form-item label="期望方案">
          <a-input v-model="createForm.expectedPlan" :max-length="255" />
        </a-form-item>
        <a-form-item label="凭证">
          <a-input v-model="createForm.evidenceRef" :max-length="255" />
        </a-form-item>
        <a-form-item label="联系方式">
          <a-input v-model="createForm.contact" :max-length="120" />
        </a-form-item>
        <a-form-item label="客户 ID（可选）">
          <a-input-number v-model="createForm.customerId" :min="0" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="planVisible"
      title="提交处理方案"
      @ok="submitPlan"
      @cancel="planVisible = false"
    >
      <a-form :model="planForm">
        <a-form-item label="责任方" required>
          <a-select v-model="planForm.faultParty">
            <a-option
              v-for="option in faultOptions"
              :key="option.value"
              :value="option.value"
              >{{ option.label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="方案" required>
          <a-select v-model="planForm.planAction">
            <a-option
              v-for="option in planOptions"
              :key="option.value"
              :value="option.value"
              >{{ option.label }}</a-option
            >
          </a-select>
        </a-form-item>
        <template v-if="planForm.planAction === 'makeup_service'">
          <a-form-item label="补履约类型" required>
            <a-select v-model="planForm.makeupKind">
              <a-option value="makeup_time">补钟（补足服务量）</a-option>
              <a-option value="replace_player">换人（换人重新履约）</a-option>
            </a-select>
          </a-form-item>
          <a-form-item label="承接陪玩 ID" required>
            <a-input-number v-model="planForm.makeupPlayerId" :min="1" />
          </a-form-item>
          <a-form-item label="席位序号" required>
            <a-input-number v-model="planForm.makeupSeatIndex" :min="1" />
          </a-form-item>
          <a-form-item label="补足服务量">
            <a-input-number v-model="planForm.makeupUnits" :min="0" />
            <a-typography-text type="secondary">
              单位与订单 SKU 的服务计量单位一致；补钟须大于零。
            </a-typography-text>
          </a-form-item>
          <a-form-item label="公司承担报酬（元）">
            <a-input-number
              v-model="planForm.makeupCompanyPayYuan"
              :min="0"
              :precision="2"
            />
          </a-form-item>
        </template>
        <a-form-item v-else label="赔付金额（元）">
          <a-input-number
            v-model="planForm.refundYuan"
            :min="0"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="处理说明">
          <a-textarea v-model="planForm.resolution" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="rejectVisible"
      title="驳回售后"
      @ok="submitReject"
      @cancel="rejectVisible = false"
    >
      <a-form :model="rejectForm">
        <a-form-item label="驳回原因" required>
          <a-textarea v-model="rejectForm.reason" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-card class="general-card card-block" title="补履约任务（§13.6）">
      <a-space class="toolbar">
        <a-select
          v-model="makeupStatusFilter"
          :style="{ width: '160px' }"
          @change="loadMakeups"
        >
          <a-option value="">全部</a-option>
          <a-option
            v-for="option in makeupStatusOptions"
            :key="option.value"
            :value="option.value"
            >{{ option.label }}</a-option
          >
        </a-select>
        <a-button :loading="makeupLoading" @click="loadMakeups">刷新</a-button>
      </a-space>
      <a-typography-text type="secondary" class="makeup-tip">
        售后方案选「补履约（补钟 /
        换人）」并经审批、执行后在这里开始服务并由客服验收；
        补履约由公司承担报酬，**不增加原订单实收与成交额**。
      </a-typography-text>
      <a-table
        :data="makeups"
        :loading="makeupLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column data-index="makeup_no" title="任务号" />
          <a-table-column title="关联订单">
            <template #cell="{ record }">#{{ record.order_id }}</template>
          </a-table-column>
          <a-table-column title="类型">
            <template #cell="{ record }">{{
              makeupKindLabel(record.kind)
            }}</template>
          </a-table-column>
          <a-table-column title="承接陪玩 / 席位">
            <template #cell="{ record }"
              >{{ record.player_id }} / {{ record.seat_index }}</template
            >
          </a-table-column>
          <a-table-column title="补足量">
            <template #cell="{ record }">{{ record.units }}</template>
          </a-table-column>
          <a-table-column title="公司承担">
            <template #cell="{ record }">{{
              money(record.company_pay_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">{{
              makeupStatusLabel(record.status)
            }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="140">
            <template #cell="{ record }">
              <a-button
                v-if="record.status === 'pending'"
                type="text"
                @click="startMakeup(record)"
                >开始服务</a-button
              >
              <a-button
                v-else-if="record.status === 'servicing'"
                type="text"
                status="success"
                @click="openCompleteMakeup(record)"
                >验收</a-button
              >
              <span v-else>—</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="makeupCompleteVisible"
      title="验收补履约"
      @ok="submitMakeupComplete"
      @cancel="makeupCompleteVisible = false"
    >
      <a-form :model="makeupCompleteForm">
        <a-form-item label="验收说明">
          <a-textarea v-model="makeupCompleteForm.note" :max-length="255" />
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
    acceptAfterSale,
    approveAfterSale,
    confirmAfterSalePlan,
    completeFulfillmentMakeup,
    createAfterSale,
    executeAfterSale,
    getAfterSale,
    getOrder,
    listAfterSales,
    listFulfillmentMakeups,
    planAfterSale,
    rejectAfterSale,
    startFulfillmentMakeup,
    withdrawAfterSale,
  } from '../../api';
  import type {
    AfterSaleChannel,
    AfterSaleFaultParty,
    AfterSaleInput,
    AfterSaleKind,
    AfterSalePlanAction,
    AfterSalePlanInput,
    EsportsAfterSale,
    EsportsFulfillmentMakeup,
    MakeupKind,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canOperate = computed(() =>
    hasButtonPermission('esports:aftersales:operate')
  );

  const loading = ref(false);
  const statusFilter = ref('');
  const items = ref<EsportsAfterSale[]>([]);
  const detail = ref<EsportsAfterSale | null>(null);
  const detailOrderNo = ref('');
  const detailVisible = ref(false);

  const statusOptions = [
    { value: 'pending_accept', label: '待受理' },
    { value: 'processing', label: '处理中' },
    { value: 'pending_approval', label: '待审批' },
    { value: 'pending_execution', label: '待执行' },
    { value: 'completed', label: '已完成' },
    { value: 'rejected', label: '已驳回' },
    { value: 'withdrawn', label: '已撤回' },
    { value: 'execution_failed', label: '执行失败' },
  ];
  const statusMap: Record<string, string> = {
    pending_accept: '待受理',
    processing: '处理中',
    pending_customer_confirm: '待客户确认',
    pending_approval: '待审批',
    pending_execution: '待执行',
    execution_failed: '执行失败',
    completed: '已完成',
    rejected: '已驳回',
    withdrawn: '已撤回',
  };
  const kindOptions = [
    { value: 'service_mismatch', label: '服务不符' },
    { value: 'duration_short', label: '时长不足' },
    { value: 'no_show', label: '陪玩未到场' },
    { value: 'wrong_item', label: '错单' },
    { value: 'overcharge', label: '多收费用' },
    { value: 'player_appeal', label: '陪玩申诉' },
    { value: 'refund_request', label: '申请退款' },
    { value: 'other', label: '其他' },
  ];
  const kindMap: Record<string, string> = Object.fromEntries(
    kindOptions.map((item) => [item.value, item.label])
  );
  const channelOptions = [
    { value: 'customer', label: '客户' },
    { value: 'admin', label: '客服' },
    { value: 'player', label: '陪玩' },
    { value: 'system', label: '系统' },
  ];
  const channelMap: Record<string, string> = Object.fromEntries(
    channelOptions.map((item) => [item.value, item.label])
  );
  const faultOptions = [
    { value: 'undetermined', label: '待定' },
    { value: 'player', label: '陪玩' },
    { value: 'admin', label: '客服' },
    { value: 'customer', label: '客户' },
    { value: 'platform', label: '平台' },
    { value: 'none', label: '无' },
  ];
  const faultMap: Record<string, string> = Object.fromEntries(
    faultOptions.map((item) => [item.value, item.label])
  );
  const planOptions = [
    { value: 'none', label: '无' },
    { value: 'refund_original', label: '退原核销款' },
    { value: 'compensate', label: '发放补偿' },
    { value: 'makeup_service', label: '补履约（补钟/换人）' },
  ];
  const planMap: Record<string, string> = Object.fromEntries(
    planOptions.map((item) => [item.value, item.label])
  );

  const kindLabel = (value: string) => kindMap[value] || value;
  const channelLabel = (value: string) => channelMap[value] || value;
  const statusLabel = (value: string) => statusMap[value] || value;
  const faultLabel = (value: string) => faultMap[value] || value;
  const planLabel = (value: string) => planMap[value] || value;
  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  // §13.5 限时：展示当前阶段剩余时间，已超时显示超时时长（列表加载时计算一次）。
  const slaLabel = (record: EsportsAfterSale) => {
    if (!record.sla_deadline) return '—';
    const minutes = Math.round(
      (new Date(record.sla_deadline).getTime() - Date.now()) / 60000
    );
    return record.sla_overdue
      ? `已超时 ${Math.abs(minutes)} 分钟`
      : `${minutes} 分钟后到期`;
  };
  const canWithdraw = (record: EsportsAfterSale) =>
    !['completed', 'rejected', 'withdrawn'].includes(record.status);
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  const createVisible = ref(false);
  const createForm = reactive<{
    sourceId: number;
    kind: AfterSaleKind;
    channel: AfterSaleChannel;
    demand: string;
    expectedPlan: string;
    evidenceRef: string;
    contact: string;
    customerId: number;
  }>({
    sourceId: 1,
    kind: 'refund_request',
    channel: 'customer',
    demand: '',
    expectedPlan: '',
    evidenceRef: '',
    contact: '',
    customerId: 0,
  });

  const planVisible = ref(false);
  const planTarget = ref<EsportsAfterSale | null>(null);
  const planForm = reactive<{
    faultParty: AfterSaleFaultParty;
    planAction: AfterSalePlanAction;
    refundYuan: number;
    resolution: string;
    // 补履约方案参数（§13.6）：plan_action=makeup_service 时使用。
    makeupKind: MakeupKind;
    makeupPlayerId: number;
    makeupSeatIndex: number;
    makeupUnits: number;
    makeupCompanyPayYuan: number;
  }>({
    faultParty: 'undetermined',
    planAction: 'refund_original',
    refundYuan: 0,
    resolution: '',
    makeupKind: 'makeup_time',
    makeupPlayerId: 0,
    makeupSeatIndex: 1,
    makeupUnits: 0,
    makeupCompanyPayYuan: 0,
  });

  const rejectVisible = ref(false);
  const rejectTarget = ref<EsportsAfterSale | null>(null);
  const rejectForm = reactive({ reason: '' });

  async function load() {
    loading.value = true;
    try {
      items.value = (await listAfterSales(statusFilter.value)).data.data || [];
    } catch {
      Message.error('加载售后列表失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  async function showDetail(id: number) {
    try {
      const item = (await getAfterSale(id)).data.data || null;
      detail.value = item;
      detailOrderNo.value = '';
      if (item) {
        try {
          detailOrderNo.value =
            (await getOrder(item.source_id)).data.data?.order_no || '';
        } catch {
          detailOrderNo.value = '';
        }
      }
      detailVisible.value = true;
    } catch {
      Message.error('无法获取售后详情');
    }
  }

  function openCreate() {
    createForm.sourceId = 1;
    createForm.kind = 'refund_request';
    createForm.channel = 'customer';
    createForm.demand = '';
    createForm.expectedPlan = '';
    createForm.evidenceRef = '';
    createForm.contact = '';
    createForm.customerId = 0;
    createVisible.value = true;
  }

  async function submitCreate() {
    if (createForm.sourceId < 1 || !createForm.demand.trim()) {
      Message.warning('请填写来源订单 ID 与诉求');
      return;
    }
    const input: AfterSaleInput = {
      source_type: 'order',
      source_id: createForm.sourceId,
      kind: createForm.kind,
      channel: createForm.channel,
      demand: createForm.demand.trim(),
      expected_plan: createForm.expectedPlan.trim(),
      evidence_ref: createForm.evidenceRef.trim(),
      contact: createForm.contact.trim(),
    };
    if (createForm.customerId > 0) input.customer_id = createForm.customerId;
    try {
      await createAfterSale(input);
      createVisible.value = false;
      Message.success('已创建售后单');
      await load();
    } catch (err) {
      Message.error(
        errorText(err, '创建失败：订单不存在或同问题已有进行中售后')
      );
    }
  }

  async function accept(record: EsportsAfterSale) {
    try {
      await acceptAfterSale(record.id);
      Message.success('已受理');
      await load();
    } catch (err) {
      Message.error(errorText(err, '受理失败，请刷新后重试'));
    }
  }

  function openPlan(record: EsportsAfterSale) {
    planTarget.value = record;
    planForm.faultParty = 'undetermined';
    planForm.planAction = 'refund_original';
    planForm.refundYuan = 0;
    planForm.resolution = '';
    planForm.makeupKind = 'makeup_time';
    planForm.makeupPlayerId = 0;
    planForm.makeupSeatIndex = 1;
    planForm.makeupUnits = 0;
    planForm.makeupCompanyPayYuan = 0;
    planVisible.value = true;
  }

  async function submitPlan() {
    const record = planTarget.value;
    if (!record) return;
    try {
      const payload: AfterSalePlanInput = {
        fault_party: planForm.faultParty,
        plan_action: planForm.planAction,
        refund_cents: Math.round(planForm.refundYuan * 100),
        resolution: planForm.resolution.trim(),
      };
      if (planForm.planAction === 'makeup_service') {
        // 补履约不产生退款金额（§13.6）。
        payload.refund_cents = 0;
        payload.makeup_kind = planForm.makeupKind;
        payload.makeup_player_id = planForm.makeupPlayerId;
        payload.makeup_seat_index = planForm.makeupSeatIndex;
        payload.makeup_units = planForm.makeupUnits;
        payload.makeup_company_pay_cents = Math.round(
          planForm.makeupCompanyPayYuan * 100
        );
      }
      await planAfterSale(record.id, payload);
      planVisible.value = false;
      Message.success('已提交方案，等待审批');
      await load();
    } catch (err) {
      Message.error(errorText(err, '提交方案失败：参数无效或状态已变化'));
    }
  }

  // §13.3 待客户确认：客户线下已同意时由客服代确认，方案随后进入待审批。
  async function confirmPlan(record: EsportsAfterSale) {
    try {
      await confirmAfterSalePlan(record.id);
      Message.success('已代客户确认，售后进入待审批');
      await load();
    } catch (err) {
      Message.error(errorText(err, '确认失败：售后不在待客户确认状态'));
    }
  }

  async function approve(record: EsportsAfterSale) {
    try {
      await approveAfterSale(record.id);
      Message.success('已审批通过');
      await load();
    } catch (err) {
      Message.error(errorText(err, '审批失败：不得自审或退款额度不足'));
    }
  }

  function openReject(record: EsportsAfterSale) {
    rejectTarget.value = record;
    rejectForm.reason = '';
    rejectVisible.value = true;
  }

  async function submitReject() {
    const record = rejectTarget.value;
    if (!record) return;
    if (!rejectForm.reason.trim()) {
      Message.warning('请填写驳回原因');
      return;
    }
    try {
      await rejectAfterSale(record.id, rejectForm.reason.trim());
      rejectVisible.value = false;
      Message.success('已驳回');
      await load();
    } catch (err) {
      Message.error(errorText(err, '驳回失败，请刷新后重试'));
    }
  }

  async function execute(record: EsportsAfterSale) {
    try {
      await executeAfterSale(record.id);
      Message.success('已执行');
      await load();
    } catch (err) {
      Message.error(errorText(err, '执行失败：外部渠道退款未接入或状态已变化'));
    }
  }

  async function withdraw(record: EsportsAfterSale) {
    try {
      await withdrawAfterSale(record.id);
      Message.success('已撤回');
      await load();
    } catch (err) {
      Message.error(errorText(err, '撤回失败，请刷新后重试'));
    }
  }

  // ── 补履约任务（§13.6） ──
  const makeupLoading = ref(false);
  const makeupStatusFilter = ref('');
  const makeups = ref<EsportsFulfillmentMakeup[]>([]);
  const makeupCompleteVisible = ref(false);
  const makeupCompleteTarget = ref<EsportsFulfillmentMakeup | null>(null);
  const makeupCompleteForm = reactive({ note: '' });
  const makeupStatusOptions = [
    { value: 'pending', label: '待服务' },
    { value: 'servicing', label: '服务中' },
    { value: 'completed', label: '已验收' },
  ];
  const makeupKindMap: Record<string, string> = {
    makeup_time: '补钟',
    replace_player: '换人',
  };
  const makeupStatusMap: Record<string, string> = {
    pending: '待服务',
    servicing: '服务中',
    completed: '已验收',
    cancelled: '已取消',
  };
  const makeupKindLabel = (value: string) => makeupKindMap[value] || value;
  const makeupStatusLabel = (value: string) => makeupStatusMap[value] || value;

  async function loadMakeups() {
    makeupLoading.value = true;
    try {
      makeups.value =
        (await listFulfillmentMakeups(makeupStatusFilter.value)).data.data ||
        [];
    } catch {
      Message.error('加载补履约任务失败，请稍后重试');
    } finally {
      makeupLoading.value = false;
    }
  }

  async function startMakeup(record: EsportsFulfillmentMakeup) {
    try {
      await startFulfillmentMakeup(record.id);
      Message.success('已开始补履约服务');
      await loadMakeups();
    } catch (err) {
      Message.error(errorText(err, '开始失败：任务状态已变化'));
    }
  }

  function openCompleteMakeup(record: EsportsFulfillmentMakeup) {
    makeupCompleteTarget.value = record;
    makeupCompleteForm.note = '';
    makeupCompleteVisible.value = true;
  }

  async function submitMakeupComplete() {
    const record = makeupCompleteTarget.value;
    if (!record) return;
    try {
      await completeFulfillmentMakeup(
        record.id,
        makeupCompleteForm.note.trim()
      );
      makeupCompleteVisible.value = false;
      Message.success('已完成验收');
      await loadMakeups();
    } catch (err) {
      Message.error(errorText(err, '验收失败：任务状态已变化'));
    }
  }

  onMounted(() => {
    load();
    loadMakeups();
  });
</script>

<style scoped>
  .toolbar {
    margin-bottom: 16px;
  }

  .makeup-tip {
    display: block;
    margin-bottom: 12px;
  }
</style>
