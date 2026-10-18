<template>
  <div class="container page-container">
    <a-card class="general-card" title="报表">
      <a-space class="toolbar" wrap>
        <a-select v-model="period" :style="{ width: '120px' }">
          <a-option value="daily">按日</a-option>
          <a-option value="weekly">按周</a-option>
          <a-option value="monthly">按月</a-option>
        </a-select>
        <a-date-picker
          v-model="startDate"
          value-format="YYYY-MM-DD"
          placeholder="开始日期"
          :style="{ width: '150px' }"
        />
        <a-date-picker
          v-model="endDate"
          value-format="YYYY-MM-DD"
          placeholder="结束日期"
          :style="{ width: '150px' }"
        />
        <a-input-number
          v-if="activeTab !== 'finance'"
          v-model="responsibleAdminId"
          placeholder="负责客服 ID"
          :min="0"
          :style="{ width: '150px' }"
        />
        <a-input
          v-if="activeTab !== 'finance'"
          v-model="game"
          placeholder="游戏"
          allow-clear
          :style="{ width: '120px' }"
        />
        <a-tooltip
          :content="activeTab === 'finance' ? '资金数据不按订单渠道归属' : ''"
          :disabled="activeTab !== 'finance'"
        >
          <a-select
            v-model="channelSource"
            :disabled="activeTab === 'finance'"
            placeholder="客户渠道来源"
            allow-clear
            :style="{ width: '150px' }"
          >
            <a-option value="manual">人工建档</a-option>
            <a-option value="wecom">企业微信</a-option>
            <a-option value="self">客户自助</a-option>
            <a-option value="import">批量导入</a-option>
          </a-select>
        </a-tooltip>
        <a-tooltip
          :content="activeTab === 'finance' ? '资金数据不按订单渠道归属' : ''"
          :disabled="activeTab !== 'finance'"
        >
          <a-select
            v-model="entryPoint"
            :disabled="activeTab === 'finance'"
            placeholder="报单入口"
            allow-clear
            :style="{ width: '150px' }"
          >
            <a-option value="cs_pc">电脑客服端</a-option>
            <a-option value="cs_mobile">移动客服端</a-option>
            <a-option value="wecom_sidebar">企微侧边栏</a-option>
            <a-option value="customer_self">客户自助</a-option>
            <a-option value="admin_backfill">后台补录</a-option>
          </a-select>
        </a-tooltip>
        <a-select
          v-if="activeTab !== 'finance'"
          v-model="appointmentType"
          placeholder="即时/预约"
          allow-clear
          :style="{ width: '130px' }"
        >
          <a-option value="instant">即时</a-option>
          <a-option value="request">预约</a-option>
        </a-select>
        <a-select
          v-if="activeTab !== 'finance'"
          v-model="seatType"
          placeholder="单人/多人"
          allow-clear
          :style="{ width: '130px' }"
        >
          <a-option value="single">单人</a-option>
          <a-option value="multi">多人</a-option>
        </a-select>
        <a-input
          v-if="activeTab === 'finance'"
          v-model="paymentChannel"
          placeholder="支付方式"
          allow-clear
          :style="{ width: '130px' }"
        />
        <template v-if="activeTab === 'aftersale_quality'">
          <a-select
            v-model="kind"
            placeholder="售后类型"
            allow-clear
            :style="{ width: '160px' }"
          >
            <a-option
              v-for="item in aftersaleKinds"
              :key="item.value"
              :value="item.value"
              >{{ item.label }}</a-option
            >
          </a-select>
          <a-select
            v-model="faultParty"
            placeholder="责任方"
            allow-clear
            :style="{ width: '130px' }"
          >
            <a-option
              v-for="item in faultParties"
              :key="item.value"
              :value="item.value"
              >{{ item.label }}</a-option
            >
          </a-select>
        </template>
        <a-button :loading="loading" @click="load">查询</a-button>
        <a-button :loading="exporting" @click="handleExport">导出 CSV</a-button>
      </a-space>

      <a-tabs v-model:active-key="activeTab" @change="load">
        <a-tab-pane key="owner_overview" title="经营总览" />
        <a-tab-pane key="cs_performance" title="客服业绩" />
        <a-tab-pane key="dispatch_efficiency" title="派单效率" />
        <a-tab-pane key="aftersale_quality" title="售后质量" />
        <a-tab-pane
          v-if="canViewFinance"
          key="finance"
          title="财务资金与结算"
        />
      </a-tabs>

      <template v-if="activeTab === 'owner_overview' && overview">
        <a-descriptions :column="4" bordered size="small">
          <a-descriptions-item label="订单数">{{
            overview.summary.order_count
          }}</a-descriptions-item>
          <a-descriptions-item label="已付款单">{{
            overview.summary.paid_count
          }}</a-descriptions-item>
          <a-descriptions-item label="营收">{{
            money(overview.summary.revenue_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="退款">{{
            money(overview.summary.refund_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="净营收">{{
            money(overview.summary.net_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="已结单">{{
            overview.summary.completed_count
          }}</a-descriptions-item>
          <a-descriptions-item label="已取消">{{
            overview.summary.cancelled_count
          }}</a-descriptions-item>
        </a-descriptions>
        <a-table
          :data="overview.buckets"
          row-key="bucket"
          :pagination="false"
          :style="{ marginTop: '12px' }"
        >
          <template #columns>
            <a-table-column data-index="bucket" title="周期" />
            <a-table-column data-index="order_count" title="订单数" />
            <a-table-column title="营收">
              <template #cell="{ record }">{{
                money(record.revenue_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="退款">
              <template #cell="{ record }">{{
                money(record.refund_cents)
              }}</template>
            </a-table-column>
          </template>
        </a-table>
        <a-table
          :data="overview.details"
          row-key="id"
          :pagination="{ pageSize: 20 }"
          :style="{ marginTop: '12px' }"
        >
          <template #columns>
            <a-table-column data-index="order_no" title="订单号" />
            <a-table-column data-index="customer_id" title="客户 ID" />
            <a-table-column title="应付">
              <template #cell="{ record }">{{
                money(record.payable_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="已退">
              <template #cell="{ record }">{{
                money(record.refunded_cents)
              }}</template>
            </a-table-column>
            <a-table-column data-index="payment_status" title="支付状态" />
            <a-table-column data-index="fulfillment_status" title="履约状态" />
          </template>
        </a-table>
      </template>

      <template v-else-if="activeTab === 'cs_performance' && performance">
        <a-table
          :data="performance.rows"
          :loading="loading"
          row-key="admin_id"
          :pagination="false"
        >
          <template #columns>
            <a-table-column data-index="admin_id" title="客服 ID" />
            <a-table-column data-index="admin_name" title="客服" />
            <a-table-column data-index="order_count" title="订单数" />
            <a-table-column title="营收">
              <template #cell="{ record }">{{
                money(record.revenue_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="退款">
              <template #cell="{ record }">{{
                money(record.refund_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="净额">
              <template #cell="{ record }">{{
                money(record.net_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="提成">
              <template #cell="{ record }">{{
                money(record.commission_cents)
              }}</template>
            </a-table-column>
          </template>
        </a-table>
      </template>

      <template v-else-if="activeTab === 'dispatch_efficiency' && dispatch">
        <a-descriptions :column="4" bordered size="small">
          <a-descriptions-item label="邀请数">{{
            dispatch.summary.invite_count
          }}</a-descriptions-item>
          <a-descriptions-item label="已接单">{{
            dispatch.summary.accepted_count
          }}</a-descriptions-item>
          <a-descriptions-item label="已拒单">{{
            dispatch.summary.rejected_count
          }}</a-descriptions-item>
          <a-descriptions-item label="已过期">{{
            dispatch.summary.expired_count
          }}</a-descriptions-item>
          <a-descriptions-item label="待响应">{{
            dispatch.summary.open_count
          }}</a-descriptions-item>
          <a-descriptions-item label="平均接单时长">{{
            durationText(dispatch.summary.avg_accept_seconds)
          }}</a-descriptions-item>
          <a-descriptions-item label="入池→派出">{{
            durationText(dispatch.summary.avg_pool_to_invite_seconds)
          }}</a-descriptions-item>
          <a-descriptions-item label="派出→接单">{{
            durationText(dispatch.summary.avg_invite_to_accept_seconds)
          }}</a-descriptions-item>
          <a-descriptions-item label="接单→开工">{{
            durationText(dispatch.summary.avg_accept_to_start_seconds)
          }}</a-descriptions-item>
          <a-descriptions-item label="入池→开工">{{
            durationText(dispatch.summary.avg_pool_to_start_seconds)
          }}</a-descriptions-item>
        </a-descriptions>
        <a-table
          :data="dispatch.rows"
          row-key="admin_id"
          :pagination="false"
          :style="{ marginTop: '12px' }"
        >
          <template #columns>
            <a-table-column data-index="admin_id" title="客服 ID" />
            <a-table-column data-index="admin_name" title="客服" />
            <a-table-column data-index="invite_count" title="邀请数" />
            <a-table-column data-index="accepted_count" title="已接单" />
            <a-table-column data-index="rejected_count" title="已拒单" />
            <a-table-column data-index="expired_count" title="已过期" />
          </template>
        </a-table>
      </template>

      <template v-else-if="activeTab === 'aftersale_quality' && aftersale">
        <a-descriptions :column="4" bordered size="small">
          <a-descriptions-item label="售后总数">{{
            aftersale.summary.total
          }}</a-descriptions-item>
          <a-descriptions-item label="已完成">{{
            aftersale.summary.completed
          }}</a-descriptions-item>
          <a-descriptions-item label="已驳回">{{
            aftersale.summary.rejected
          }}</a-descriptions-item>
          <a-descriptions-item label="已撤回">{{
            aftersale.summary.withdrawn
          }}</a-descriptions-item>
          <a-descriptions-item label="处理中">{{
            aftersale.summary.in_progress
          }}</a-descriptions-item>
          <a-descriptions-item label="赔付金额">{{
            money(aftersale.summary.refund_cents)
          }}</a-descriptions-item>
        </a-descriptions>
        <a-table
          :data="kindRows"
          row-key="key"
          :pagination="false"
          :style="{ marginTop: '12px' }"
        >
          <template #columns>
            <a-table-column title="售后类型">
              <template #cell="{ record }">{{
                aftersaleKindLabel(record.key)
              }}</template>
            </a-table-column>
            <a-table-column data-index="count" title="数量" />
          </template>
        </a-table>
        <a-table
          :data="faultRows"
          row-key="key"
          :pagination="false"
          :style="{ marginTop: '12px' }"
        >
          <template #columns>
            <a-table-column title="责任方">
              <template #cell="{ record }">{{
                faultPartyLabel(record.key)
              }}</template>
            </a-table-column>
            <a-table-column data-index="count" title="数量" />
          </template>
        </a-table>
        <a-table
          :data="aftersale.details"
          row-key="id"
          :pagination="{ pageSize: 20 }"
          :style="{ marginTop: '12px' }"
        >
          <template #columns>
            <a-table-column data-index="id" title="ID" :width="80" />
            <a-table-column title="类型">
              <template #cell="{ record }">{{
                aftersaleKindLabel(record.kind)
              }}</template>
            </a-table-column>
            <a-table-column data-index="status" title="状态" />
            <a-table-column title="责任方">
              <template #cell="{ record }">{{
                faultPartyLabel(record.fault_party)
              }}</template>
            </a-table-column>
            <a-table-column title="赔付">
              <template #cell="{ record }">{{
                money(record.refund_cents)
              }}</template>
            </a-table-column>
          </template>
        </a-table>
      </template>

      <template v-else-if="activeTab === 'finance' && finance">
        <a-descriptions
          v-if="customerWalletRows.length"
          :column="4"
          bordered
          size="small"
          title="客户余额资金（本金 + 赠送权益）"
        >
          <a-descriptions-item
            v-for="row in customerWalletRows"
            :key="row.key"
            :label="walletEntryLabel(row.key)"
          >
            {{ money(row.amount) }}
          </a-descriptions-item>
        </a-descriptions>
        <a-descriptions
          v-if="catfoodWalletRows.length"
          :column="4"
          bordered
          size="small"
          title="陪玩猫粮（本金 + 赠送权益）"
          :style="{ marginTop: '12px' }"
        >
          <a-descriptions-item
            v-for="row in catfoodWalletRows"
            :key="row.key"
            :label="walletEntryLabel(row.key)"
          >
            {{ money(row.amount) }}
          </a-descriptions-item>
        </a-descriptions>
        <a-descriptions
          v-if="storedValueWalletRows.length"
          :column="4"
          bordered
          size="small"
          title="储值卡账户（本金 + 赠送权益）"
          :style="{ marginTop: '12px' }"
        >
          <a-descriptions-item
            v-for="row in storedValueWalletRows"
            :key="row.key"
            :label="walletEntryLabel(row.key)"
          >
            {{ money(row.amount) }}
          </a-descriptions-item>
        </a-descriptions>
        <a-descriptions
          :column="4"
          bordered
          size="small"
          title="结算"
          :style="{ marginTop: '12px' }"
        >
          <a-descriptions-item label="结算单数">{{
            finance.settlement.count
          }}</a-descriptions-item>
          <a-descriptions-item label="分成合计">{{
            money(finance.settlement.gross_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="实结合计">{{
            money(finance.settlement.net_cents)
          }}</a-descriptions-item>
          <a-descriptions-item
            v-for="row in settlementStatusRows"
            :key="row.key"
            :label="settlementStatusLabel(row.key)"
          >
            {{ row.count }}
          </a-descriptions-item>
        </a-descriptions>
        <a-table
          :data="finance.payment_channels"
          row-key="channel"
          :pagination="false"
          :style="{ marginTop: '12px' }"
        >
          <template #columns>
            <a-table-column data-index="channel" title="支付方式" />
            <a-table-column title="到账金额">
              <template #cell="{ record }">{{
                money(record.amount_cents)
              }}</template>
            </a-table-column>
            <a-table-column data-index="count" title="笔数" />
          </template>
        </a-table>
      </template>
    </a-card>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import { exportEsportsReport, getEsportsReport } from '../../api';
  import type {
    AfterSaleQualityReport,
    CsPerformanceReport,
    DispatchEfficiencyReport,
    EsportsReport,
    FinanceReport,
    OwnerOverviewReport,
    ReportPeriod,
    ReportQuery,
    ReportType,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canViewFinance = computed(() =>
    hasButtonPermission('esports:stats:finance')
  );

  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  const durationText = (seconds: number) => {
    if (seconds < 60) return `${seconds} 秒`;
    return `${Math.round(seconds / 60)} 分钟`;
  };

  const report = ref<EsportsReport | null>(null);
  const loading = ref(false);
  const exporting = ref(false);
  const activeTab = ref<ReportType>('owner_overview');

  // 各报表类型的数据视图，用于模板中的类型收窄。
  const overview = computed<OwnerOverviewReport | null>(() =>
    report.value?.type === 'owner_overview' ? report.value : null
  );
  const performance = computed<CsPerformanceReport | null>(() =>
    report.value?.type === 'cs_performance' ? report.value : null
  );
  const dispatch = computed<DispatchEfficiencyReport | null>(() =>
    report.value?.type === 'dispatch_efficiency' ? report.value : null
  );
  const aftersale = computed<AfterSaleQualityReport | null>(() =>
    report.value?.type === 'aftersale_quality' ? report.value : null
  );
  const finance = computed<FinanceReport | null>(() =>
    report.value?.type === 'finance' ? report.value : null
  );

  // ── 筛选条件 ──
  const period = ref<ReportPeriod>('daily');
  const startDate = ref('');
  const endDate = ref('');
  const responsibleAdminId = ref<number>();
  const game = ref('');
  const channelSource = ref<ReportQuery['channel_source']>();
  const entryPoint = ref<ReportQuery['entry_point']>();
  const appointmentType = ref<'instant' | 'request' | undefined>();
  const seatType = ref<'single' | 'multi' | undefined>();
  const paymentChannel = ref('');
  const kind = ref<string>();
  const faultParty = ref<string>();

  const aftersaleKinds = [
    { value: 'service_mismatch', label: '服务不符' },
    { value: 'duration_short', label: '时长不足' },
    { value: 'no_show', label: '未履约' },
    { value: 'wrong_item', label: '货不对板' },
    { value: 'overcharge', label: '乱收费' },
    { value: 'player_appeal', label: '陪玩申诉' },
    { value: 'refund_request', label: '退款申请' },
    { value: 'other', label: '其他' },
  ];
  const faultParties = [
    { value: 'undetermined', label: '待定' },
    { value: 'player', label: '陪玩' },
    { value: 'admin', label: '客服' },
    { value: 'customer', label: '客户' },
    { value: 'platform', label: '平台' },
    { value: 'none', label: '无责' },
  ];
  const kindLabels: Record<string, string> = Object.fromEntries(
    aftersaleKinds.map((item) => [item.value, item.label])
  );
  const faultLabels: Record<string, string> = Object.fromEntries(
    faultParties.map((item) => [item.value, item.label])
  );

  const aftersaleKindLabel = (value: string) => kindLabels[value] || value;
  const faultPartyLabel = (value: string) => faultLabels[value] || value;

  const kindRows = computed(() =>
    Object.entries(aftersale.value?.by_kind ?? {}).map(([key, count]) => ({
      key,
      count,
    }))
  );
  const faultRows = computed(() =>
    Object.entries(aftersale.value?.by_fault_party ?? {}).map(
      ([key, count]) => ({
        key,
        count,
      })
    )
  );

  // 后端财务汇总返回客户余额 / 陪玩猫粮 / 储值卡三类账户桶；
  // API 类型暂只声明前两类，这里按动态桶读取，避免漏渲染储值卡。
  const financeWallet = computed<Record<string, Record<string, number>>>(() =>
    Object.fromEntries(Object.entries(finance.value?.wallet ?? {}))
  );
  const walletRows = (account: string) =>
    Object.entries(financeWallet.value[account] ?? {}).map(([key, amount]) => ({
      key,
      amount,
    }));
  const customerWalletRows = computed(() => walletRows('customer_balance'));
  const catfoodWalletRows = computed(() => walletRows('player_catfood'));
  const storedValueWalletRows = computed(() => walletRows('stored_value_card'));

  // 钱包流水类型与结算状态的中文标签（未知值原样展示，避免新增枚举时显示为空）。
  const walletEntryLabels: Record<string, string> = {
    recharge: '充值收入',
    consume: '消费支出',
    refund_return: '退款返还',
    adjust: '调整',
    expire: '到期作废',
    withdraw: '提现支出',
  };
  const walletEntryLabel = (value: string) => walletEntryLabels[value] || value;

  const settlementStatusLabels: Record<string, string> = {
    draft: '结算草稿',
    locked: '已锁定',
    paid: '已打款',
  };
  const settlementStatusLabel = (value: string) =>
    settlementStatusLabels[value] || value;
  const settlementStatusRows = computed(() =>
    Object.entries(finance.value?.settlement.by_status ?? {}).map(
      ([key, count]) => ({ key, count })
    )
  );

  const buildParams = (): ReportQuery => {
    const params: ReportQuery = { period: period.value, limit: 100 };
    const financeTab = activeTab.value === 'finance';
    if (startDate.value) params.start = startDate.value;
    if (endDate.value) params.end = endDate.value;
    // 财务总表不具备逐订单归属，不发送游戏 / 负责客服 / 预约 / 席位等订单维度，
    // 与后端 finance 的白名单口径保持一致（否则会返回参数错误）。
    if (!financeTab && responsibleAdminId.value)
      params.responsible_admin_id = responsibleAdminId.value;
    if (!financeTab && game.value) params.game = game.value;
    if (!financeTab && channelSource.value)
      params.channel_source = channelSource.value;
    if (!financeTab && entryPoint.value) params.entry_point = entryPoint.value;
    if (!financeTab && appointmentType.value)
      params.appointment_type = appointmentType.value;
    if (!financeTab && seatType.value) params.seat_type = seatType.value;
    if (paymentChannel.value) params.payment_channel = paymentChannel.value;
    if (kind.value) params.kind = kind.value;
    if (faultParty.value) params.fault_party = faultParty.value;
    return params;
  };

  const load = async () => {
    loading.value = true;
    try {
      const { data } = await getEsportsReport(activeTab.value, buildParams());
      report.value = data.data;
    } catch {
      report.value = null;
      Message.error('加载报表失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  };

  // 导出 CSV：与查看接口同一组筛选参数，由后端按同一数据边界与审计口径生成。
  const handleExport = async () => {
    exporting.value = true;
    try {
      const res = await exportEsportsReport(activeTab.value, buildParams());
      const blob = res.data;
      const disposition = res.headers['content-disposition'] as
        | string
        | undefined;
      let fileName = `esports_${activeTab.value}.csv`;
      const match = disposition?.match(/filename="?([^";]+)"?/i);
      if (match?.[1]) fileName = decodeURIComponent(match[1]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      Message.error('导出失败，请稍后重试');
    } finally {
      exporting.value = false;
    }
  };

  onMounted(load);
</script>

<style scoped>
  .toolbar {
    margin-bottom: 12px;
  }
</style>
