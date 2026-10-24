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
          :placeholder="
            activeTab === 'aftersale_quality' ? '处理客服 ID' : '负责客服 ID'
          "
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
        <!-- 资金三维度只由财务资金报表接受：其它报表带上会被后端 400，故仅财务页签展示与发送。 -->
        <template v-if="activeTab === 'finance'">
          <a-select
            v-model="accountType"
            placeholder="账户类型"
            allow-clear
            :style="{ width: '140px' }"
          >
            <a-option value="customer_balance">客户余额</a-option>
            <a-option value="player_catfood">陪玩猫粮</a-option>
          </a-select>
          <a-select
            v-model="entryType"
            placeholder="流水类型"
            allow-clear
            :style="{ width: '140px' }"
          >
            <a-option value="recharge">充值收入</a-option>
            <a-option value="consume">消费支出</a-option>
            <a-option value="refund_return">退款返还</a-option>
            <a-option value="adjust">调整</a-option>
            <a-option value="expire">到期作废</a-option>
            <a-option value="withdraw">提现支出</a-option>
          </a-select>
          <a-select
            v-model="settlementStatus"
            placeholder="结算状态"
            allow-clear
            :style="{ width: '140px' }"
          >
            <a-option value="draft">结算草稿</a-option>
            <a-option value="locked">已锁定</a-option>
            <a-option value="paid">已打款</a-option>
            <a-option value="void">已作废</a-option>
          </a-select>
        </template>
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
        <a-button
          v-if="currentReportType"
          :loading="exporting"
          @click="handleExport"
          >导出 CSV</a-button
        >
        <!-- P1-07：响应显式带出本次数据域（full = 超管 / 财务授权全量，owner = 本人局部）。 -->
        <a-tag
          v-if="dataScopeLabel && activeTab !== 'exports'"
          :color="dataScopeColor"
          >{{ dataScopeLabel }}</a-tag
        >
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
        <a-tab-pane v-if="canViewExports" key="exports" title="导出记录" />
      </a-tabs>

      <template v-if="activeTab === 'exports'">
        <a-space class="toolbar" wrap>
          <a-select
            v-model="exportTypeFilter"
            placeholder="全部报表"
            allow-clear
            :style="{ width: '180px' }"
            @change="loadExports"
          >
            <a-option
              v-for="item in reportTypeOptions"
              :key="item.value"
              :value="item.value"
              >{{ item.label }}</a-option
            >
          </a-select>
          <a-button :loading="exportHistoryLoading" @click="loadExports"
            >刷新</a-button
          >
          <a-typography-text type="secondary"
            >非超管只看到本人导出记录；超管可看到全部（后端按数据域收敛）。</a-typography-text
          >
        </a-space>
        <a-table
          :data="exportHistory"
          :loading="exportHistoryLoading"
          row-key="id"
          :pagination="{ pageSize: 20 }"
        >
          <template #columns>
            <a-table-column title="报表" :width="140">
              <template #cell="{ record }">{{
                reportTypeLabel(record.report_type)
              }}</template>
            </a-table-column>
            <a-table-column data-index="format" title="格式" :width="80" />
            <a-table-column title="导出人" :width="120">
              <template #cell="{ record }">{{
                record.admin_name || record.admin_id
              }}</template>
            </a-table-column>
            <a-table-column data-index="row_count" title="行数" :width="90" />
            <a-table-column data-index="file_name" title="文件名" />
            <a-table-column data-index="checksum" title="校验和" />
            <a-table-column title="筛选条件">
              <template #cell="{ record }">{{
                filterSnapshotText(record.filter_snapshot)
              }}</template>
            </a-table-column>
            <a-table-column title="状态" :width="100">
              <template #cell="{ record }">
                <a-tag color="green">{{
                  exportStatusLabel(record.row_count)
                }}</a-tag>
              </template>
            </a-table-column>
            <a-table-column
              data-index="created_at"
              title="导出时间"
              :width="190"
            />
          </template>
        </a-table>
      </template>

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
          <!-- 加钟收入（P1-16）：已收款加钟单的实收额，已包含在营收内，单列供对账。 -->
          <a-descriptions-item label="其中加钟收入">{{
            money(addonRevenueCents)
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
          <!-- 作废结算单单列（终态不可再发放）：金额不计入上面的分成 / 实结合计，仅供对账。 -->
          <a-descriptions-item label="作废结算单数">{{
            settlementVoidCount
          }}</a-descriptions-item>
          <a-descriptions-item label="作废分成合计">{{
            money(settlementVoidGross)
          }}</a-descriptions-item>
          <a-descriptions-item label="作废实结合计">{{
            money(settlementVoidNet)
          }}</a-descriptions-item>
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
  import {
    exportEsportsReport,
    getEsportsReport,
    listReportExports,
    listReportTypeExports,
  } from '../../api';
  import type {
    AfterSaleQualityReport,
    CsPerformanceReport,
    DispatchEfficiencyReport,
    EsportsReport,
    FinanceReport,
    OwnerOverviewReport,
    ReportExport,
    ReportPeriod,
    ReportQuery,
    ReportType,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canViewFinance = computed(() =>
    hasButtonPermission('esports:stats:finance')
  );
  // 导出历史两条路由（/report-exports、/reports/{type}/exports）只有 PermAPI 权限码，
  // 因此这里用同菜单的按钮权限 esports:stats:manage 取或。
  const canViewExports = computed(() =>
    hasButtonPermission('esports:stats:manage')
  );

  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  const durationText = (seconds: number) => {
    if (seconds < 60) return `${seconds} 秒`;
    return `${Math.round(seconds / 60)} 分钟`;
  };
  // 透出后端返回的中文错误信息（如「财务资金报表不支持按负责客服筛选」），取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  // 报表页签 + 导出记录页签：导出记录不走 /reports/{type}，需要单独的联合类型。
  type ReportTab = ReportType | 'exports';

  const reportTypeOptions: { value: ReportType; label: string }[] = [
    { value: 'owner_overview', label: '经营总览' },
    { value: 'cs_performance', label: '客服业绩' },
    { value: 'dispatch_efficiency', label: '派单效率' },
    { value: 'aftersale_quality', label: '售后质量' },
    { value: 'finance', label: '财务资金与结算' },
  ];
  const reportTypeMap: Record<string, string> = Object.fromEntries(
    reportTypeOptions.map((item) => [item.value, item.label])
  );
  const reportTypeLabel = (value: string) => reportTypeMap[value] || value;

  const report = ref<EsportsReport | null>(null);
  const loading = ref(false);
  const exporting = ref(false);
  const activeTab = ref<ReportTab>('owner_overview');

  // 当前报表类型（导出记录页签为 null），用于类型收窄与导出前置判断。
  const currentReportType = computed<ReportType | null>(() =>
    activeTab.value === 'exports' ? null : activeTab.value
  );

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
  // 财务资金报表专用三维度（后端只对 finance 接受，其它报表传这三个会 400）。
  const accountType = ref<string>();
  const entryType = ref<string>();
  const settlementStatus = ref<string>();

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

  // 后端财务汇总返回客户余额 / 陪玩猫粮两类账户桶，这里按动态桶读取。
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

  // settlement.void 与 summary.addon_revenue_cents 是本轮后端新增字段，
  // api.ts 的类型尚未声明（本次改动不改 api.ts），这里按扩展类型读取。
  type FinanceSettlementExt = FinanceReport['settlement'] & {
    void?: { count: number; gross_cents: number; net_cents: number };
  };
  type OwnerSummaryExt = OwnerOverviewReport['summary'] & {
    addon_revenue_cents?: number;
  };
  const settlementVoid = computed(
    () => (finance.value?.settlement as FinanceSettlementExt | undefined)?.void
  );
  const settlementVoidCount = computed(() => settlementVoid.value?.count ?? 0);
  const settlementVoidGross = computed(
    () => settlementVoid.value?.gross_cents ?? 0
  );
  const settlementVoidNet = computed(
    () => settlementVoid.value?.net_cents ?? 0
  );
  const addonRevenueCents = computed(
    () =>
      (overview.value?.summary as OwnerSummaryExt | undefined)
        ?.addon_revenue_cents ?? 0
  );

  // 数据域标记（P1-07）：后端在响应顶层给出 full / owner，便于审计本次是全量还是局部。
  const dataScope = computed(
    () =>
      (report.value as (EsportsReport & { data_scope?: string }) | null)
        ?.data_scope || ''
  );
  const dataScopeLabels: Record<string, string> = {
    full: '数据域：全量',
    owner: '数据域：仅本人归属',
  };
  const dataScopeLabel = computed(() => dataScopeLabels[dataScope.value] || '');
  const dataScopeColor = computed(() =>
    dataScope.value === 'full' ? 'green' : 'orange'
  );

  // ── 导出记录：/report-exports 与 /reports/{type}/exports 两条历史路由 ──
  const exportHistory = ref<ReportExport[]>([]);
  const exportHistoryLoading = ref(false);
  const exportTypeFilter = ref<ReportType | ''>('');

  // 后端导出为同步落盘并直接返回 CSV，记录本身没有独立状态字段：
  // row_count 为 0 时提示「已完成（0 行）」，避免被误读成失败任务。
  const exportStatusLabel = (rowCount: number) =>
    rowCount > 0 ? '已完成' : '已完成（0 行）';
  const filterSnapshotText = (snapshot: Record<string, unknown> | null) => {
    if (!snapshot) return '—';
    const entries = Object.entries(snapshot).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined
    );
    if (!entries.length) return '—';
    return entries
      .map(([key, value]) =>
        typeof value === 'object'
          ? `${key}=${JSON.stringify(value)}`
          : `${key}=${value}`
      )
      .join('；');
  };

  async function loadExports() {
    exportHistoryLoading.value = true;
    try {
      const type = exportTypeFilter.value;
      exportHistory.value = type
        ? (await listReportTypeExports(type)).data.data || []
        : (await listReportExports()).data.data || [];
    } catch (err) {
      exportHistory.value = [];
      Message.error(errorText(err, '加载导出记录失败，请稍后重试'));
    } finally {
      exportHistoryLoading.value = false;
    }
  }

  const buildParams = (): ReportQuery => {
    const params: ReportQuery & {
      account_type?: string;
      entry_type?: string;
      settlement_status?: string;
    } = { period: period.value, limit: 100 };
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
    // 资金三维度只对 finance 生效：其它报表带上会被后端 400，故仅在财务页签下发送。
    if (financeTab) {
      if (accountType.value) params.account_type = accountType.value;
      if (entryType.value) params.entry_type = entryType.value;
      if (settlementStatus.value)
        params.settlement_status = settlementStatus.value;
    }
    return params;
  };

  const load = async () => {
    // 导出记录页签走独立的历史接口，不请求 /reports/{type}。
    if (!currentReportType.value) {
      await loadExports();
      return;
    }
    loading.value = true;
    try {
      const { data } = await getEsportsReport(
        currentReportType.value,
        buildParams()
      );
      report.value = data.data;
    } catch (err) {
      report.value = null;
      Message.error(errorText(err, '加载报表失败，请稍后重试'));
    } finally {
      loading.value = false;
    }
  };

  // 导出 CSV：与查看接口同一组筛选参数，由后端按同一数据边界与审计口径生成。
  const handleExport = async () => {
    const type = currentReportType.value;
    if (!type) return;
    exporting.value = true;
    try {
      const res = await exportEsportsReport(type, buildParams());
      const blob = res.data;
      const disposition = res.headers['content-disposition'] as
        | string
        | undefined;
      let fileName = `esports_${type}.csv`;
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
      // 导出会落一条导出记录：留在导出记录页签时顺手刷新，避免看到旧列表。
      if (activeTab.value === 'exports') await loadExports();
    } catch (err) {
      Message.error(errorText(err, '导出失败，请稍后重试'));
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
