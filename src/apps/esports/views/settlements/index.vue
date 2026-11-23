<template>
  <div class="container page-container">
    <a-card class="general-card" title="结算">
      <a-tabs v-model:active-key="activeTab" @change="onTabChange">
        <!-- 分成规则 -->
        <a-tab-pane key="rules" title="分成规则">
          <a-space class="toolbar">
            <a-input
              v-model="ruleNoFilter"
              placeholder="规则编号"
              :style="{ width: '200px' }"
              allow-clear
              @press-enter="loadRules"
            />
            <a-button :loading="rulesLoading" @click="loadRules">查询</a-button>
            <a-button v-if="canOperate" type="primary" @click="openRuleCreate"
              >新建规则</a-button
            >
          </a-space>
          <a-table
            :data="rules"
            :loading="rulesLoading"
            row-key="id"
            :pagination="{ pageSize: 20 }"
          >
            <template #columns>
              <a-table-column data-index="rule_no" title="规则编号" />
              <a-table-column data-index="version" title="版本" :width="80" />
              <a-table-column title="状态">
                <template #cell="{ record }">{{
                  ruleStatusLabel(record.status)
                }}</template>
              </a-table-column>
              <a-table-column title="范围">
                <template #cell="{ record }">{{
                  scopeLabel(record.scope, record.scope_key)
                }}</template>
              </a-table-column>
              <a-table-column title="计算方式">
                <template #cell="{ record }">{{ calcLabel(record) }}</template>
              </a-table-column>
              <a-table-column title="生效时间">
                <template #cell="{ record }">{{
                  record.effective_at || '-'
                }}</template>
              </a-table-column>
              <a-table-column title="备注">
                <template #cell="{ record }">{{ record.note || '-' }}</template>
              </a-table-column>
              <a-table-column title="操作" :width="160">
                <template #cell="{ record }">
                  <template v-if="canOperate">
                    <a-button
                      v-if="record.status === 'draft'"
                      type="text"
                      status="success"
                      @click="activateRule(record)"
                      >生效</a-button
                    >
                    <a-button
                      v-if="record.status === 'active'"
                      type="text"
                      @click="rollbackRule(record)"
                      >回滚</a-button
                    >
                    <span
                      v-if="
                        record.status !== 'draft' && record.status !== 'active'
                      "
                      >-</span
                    >
                  </template>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 分成明细 -->
        <a-tab-pane key="entries" title="分成明细">
          <a-space class="toolbar">
            <a-input-number
              v-model="entryFilters.playerId"
              placeholder="陪玩 ID"
              :min="0"
              :style="{ width: '140px' }"
            />
            <a-input
              v-model="entryFilters.orderNo"
              placeholder="订单号"
              allow-clear
              :style="{ width: '180px' }"
            />
            <a-select
              v-model="entryFilters.status"
              :style="{ width: '160px' }"
              allow-clear
              placeholder="状态"
            >
              <a-option
                v-for="option in entryStatusOptions"
                :key="option.value"
                :value="option.value"
                >{{ option.label }}</a-option
              >
            </a-select>
            <a-button :loading="entriesLoading" @click="loadEntries"
              >查询</a-button
            >
          </a-space>
          <a-table
            :data="entries"
            :loading="entriesLoading"
            row-key="id"
            :pagination="{ pageSize: 20 }"
          >
            <template #columns>
              <a-table-column title="订单" :width="170">
                <template #cell="{ record }">{{
                  record.order_no || '—'
                }}</template>
              </a-table-column>
              <a-table-column data-index="player_id" title="陪玩" :width="90" />
              <a-table-column title="类型">
                <template #cell="{ record }">{{
                  entryKindLabel(record.kind)
                }}</template>
              </a-table-column>
              <a-table-column data-index="rule_no" title="规则" />
              <a-table-column title="计算基数">
                <template #cell="{ record }">{{
                  money(record.base_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="分成金额">
                <template #cell="{ record }">{{
                  money(record.amount_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="状态">
                <template #cell="{ record }">{{
                  entryStatusLabel(record.status)
                }}</template>
              </a-table-column>
              <a-table-column title="结算单">
                <template #cell="{ record }">{{
                  record.settlement_id ? `#${record.settlement_id}` : '-'
                }}</template>
              </a-table-column>
              <a-table-column title="争议冻结" :width="160">
                <template #cell="{ record }">
                  <a-tag v-if="record.frozen_at" color="orange">已冻结</a-tag>
                  <span v-else>-</span>
                  <a-typography-text
                    v-if="record.frozen_reason"
                    type="secondary"
                    class="freeze-reason"
                    >{{ record.frozen_reason }}</a-typography-text
                  >
                </template>
              </a-table-column>
              <a-table-column data-index="created_at" title="创建时间" />
              <!-- 争议冻结：冻结 / 解冻按订单维度作用于待结算明细，需二次确认。 -->
              <a-table-column title="操作" :width="140">
                <template #cell="{ record }">
                  <a-button
                    v-if="entryCanFreeze(record)"
                    type="text"
                    status="danger"
                    @click="openFreeze(record)"
                    >冻结</a-button
                  >
                  <a-button
                    v-else-if="record.frozen_at && canUnfreeze"
                    type="text"
                    @click="openUnfreeze(record)"
                    >解冻</a-button
                  >
                  <span v-else class="text-secondary">-</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 客服提成规则 -->
        <a-tab-pane key="cs_rules" title="客服提成规则">
          <a-space class="toolbar">
            <a-input
              v-model="csRuleNoFilter"
              placeholder="规则编号"
              :style="{ width: '200px' }"
            />
            <a-button :loading="csRulesLoading" @click="loadCsRules"
              >查询</a-button
            >
            <a-button v-if="canOperate" type="primary" @click="openCsRuleCreate"
              >新建客服提成规则</a-button
            >
          </a-space>
          <a-table
            :data="csRules"
            :loading="csRulesLoading"
            row-key="id"
            :pagination="{ pageSize: 20 }"
          >
            <template #columns>
              <a-table-column data-index="rule_no" title="规则编号" />
              <a-table-column data-index="version" title="版本" :width="80" />
              <a-table-column title="状态">
                <template #cell="{ record }">{{
                  ruleStatusLabel(record.status)
                }}</template>
              </a-table-column>
              <a-table-column title="适用">
                <template #cell="{ record }">{{
                  record.scope === 'global'
                    ? '全局默认'
                    : `客服 ${record.scope_key}`
                }}</template>
              </a-table-column>
              <a-table-column title="基数">
                <template #cell="{ record }">{{
                  csBaseModeLabel(record.base_mode)
                }}</template>
              </a-table-column>
              <a-table-column title="计费">
                <template #cell="{ record }">{{ csCalcText(record) }}</template>
              </a-table-column>
              <a-table-column title="礼物提成">
                <template #cell="{ record }">{{
                  record.include_gifts ? '开启' : '关闭'
                }}</template>
              </a-table-column>
              <a-table-column title="提成周期">
                <template #cell="{ record }">{{
                  csPeriodLabel(record.period)
                }}</template>
              </a-table-column>
              <a-table-column data-index="note" title="备注" />
              <a-table-column title="操作" :width="160">
                <template #cell="{ record }">
                  <template v-if="canOperate">
                    <a-button
                      v-if="record.status === 'draft'"
                      type="text"
                      status="success"
                      @click="doActivateCsRule(record)"
                      >生效</a-button
                    >
                    <a-button
                      v-if="record.status !== 'active'"
                      type="text"
                      @click="doRollbackCsRule(record)"
                      >回滚</a-button
                    >
                    <span
                      v-if="record.status === 'active'"
                      class="text-secondary"
                      >生效中</span
                    >
                  </template>
                  <span v-else>-</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 客服提成明细 -->
        <a-tab-pane key="cs_entries" title="客服提成明细">
          <a-space class="toolbar">
            <AdminSelect
              v-model="csEntryFilters.adminId"
              placeholder="选择客服"
              :style="{ width: '170px' }"
            />
            <a-input
              v-model="csEntryFilters.orderNo"
              placeholder="订单号"
              allow-clear
              :style="{ width: '180px' }"
            />
            <a-select
              v-model="csEntryFilters.status"
              placeholder="状态"
              allow-clear
              :style="{ width: '140px' }"
            >
              <a-option
                v-for="option in entryStatusOptions"
                :key="option.value"
                :value="option.value"
                >{{ option.label }}</a-option
              >
            </a-select>
            <a-button :loading="csEntriesLoading" @click="loadCsEntries"
              >查询</a-button
            >
            <a-button :loading="csSummaryLoading" @click="loadCsSummary"
              >本人提成概览</a-button
            >
          </a-space>
          <a-descriptions
            v-if="csSummary"
            class="toolbar"
            :column="3"
            size="small"
            bordered
          >
            <a-descriptions-item label="待结算提成">{{
              money(csSummary.pending_settlement_cents)
            }}</a-descriptions-item>
            <a-descriptions-item label="已结算提成">{{
              money(csSummary.settled_cents)
            }}</a-descriptions-item>
            <a-descriptions-item label="本月累计">{{
              money(csSummary.monthly_cents)
            }}</a-descriptions-item>
          </a-descriptions>
          <a-table
            :data="csEntries"
            :loading="csEntriesLoading"
            row-key="id"
            :pagination="{ pageSize: 20 }"
          >
            <template #columns>
              <a-table-column title="来源" :width="110">
                <template #cell="{ record }">{{
                  record.gift_order_id
                    ? `礼物 #${record.gift_order_id}`
                    : `订单 #${record.order_id}`
                }}</template>
              </a-table-column>
              <a-table-column data-index="admin_id" title="客服" :width="80" />
              <a-table-column title="类型">
                <template #cell="{ record }">{{
                  record.kind === 'gift_reversal'
                    ? '礼物退款冲回'
                    : record.kind === 'gift'
                    ? '礼物提成'
                    : record.kind === 'reversal'
                    ? '订单退款冲回'
                    : '订单提成'
                }}</template>
              </a-table-column>
              <a-table-column title="基数">
                <template #cell="{ record }">{{
                  money(record.base_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="渠道成本">
                <template #cell="{ record }">{{
                  money(record.channel_cost_cents || 0)
                }}</template>
              </a-table-column>
              <a-table-column title="工作室剩余">
                <template #cell="{ record }">{{
                  money(record.studio_remainder_cents || 0)
                }}</template>
              </a-table-column>
              <a-table-column title="计费">
                <template #cell="{ record }">{{
                  csEntryCalcText(record)
                }}</template>
              </a-table-column>
              <a-table-column title="提成金额">
                <template #cell="{ record }">{{
                  money(record.amount_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="状态">
                <template #cell="{ record }">{{
                  entryStatusLabel(record.status)
                }}</template>
              </a-table-column>
              <a-table-column data-index="note" title="备注" />
              <a-table-column data-index="created_at" title="创建时间" />
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 结算单 -->
        <a-tab-pane key="settlements" title="结算单">
          <a-space class="toolbar">
            <a-input-number
              v-model="settlementPlayerId"
              placeholder="陪玩 ID"
              :min="0"
              :style="{ width: '160px' }"
            />
            <a-button :loading="settlementsLoading" @click="loadSettlements"
              >查询</a-button
            >
            <a-button
              v-if="canOperate"
              type="primary"
              @click="openSettlementCreate"
              >生成陪玩结算单</a-button
            >
            <a-button v-if="canOperate" @click="openCsSettlementCreate"
              >生成客服提成结算单</a-button
            >
            <!-- 作废单默认隐藏（后端 listSettlements 已排除 void），需要核对时再打开。 -->
            <a-checkbox v-model="showVoidSettlements">显示已作废</a-checkbox>
          </a-space>
          <a-table
            :data="visibleSettlements"
            :loading="settlementsLoading"
            row-key="id"
            :pagination="{ pageSize: 20 }"
          >
            <template #columns>
              <a-table-column data-index="settlement_no" title="结算单号" />
              <a-table-column title="主体" :width="90">
                <template #cell="{ record }">{{
                  record.owner_type === 'cs' ? '客服' : '陪玩'
                }}</template>
              </a-table-column>
              <a-table-column
                data-index="owner_id"
                title="主体 ID"
                :width="90"
              />
              <a-table-column title="结算周期">
                <template #cell="{ record }"
                  >{{ record.period_start }} ~ {{ record.period_end }}</template
                >
              </a-table-column>
              <a-table-column title="应结金额">
                <template #cell="{ record }">{{
                  money(record.gross_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="调整">
                <template #cell="{ record }">{{
                  money(record.adjustment_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="实结金额">
                <template #cell="{ record }">{{
                  money(record.net_cents)
                }}</template>
              </a-table-column>
              <a-table-column
                data-index="entry_count"
                title="明细数"
                :width="90"
              />
              <a-table-column title="状态">
                <template #cell="{ record }">
                  <a-tag v-if="record.status === 'void'" color="red"
                    >已作废</a-tag
                  >
                  <span v-else>{{ settlementStatusLabel(record.status) }}</span>
                </template>
              </a-table-column>
              <a-table-column title="打款凭证">
                <template #cell="{ record }">{{
                  record.payout_ref || '-'
                }}</template>
              </a-table-column>
              <a-table-column title="操作" :width="300">
                <template #cell="{ record }">
                  <a-button type="text" @click="showSettlement(record.id)"
                    >详情</a-button
                  >
                  <template v-if="canOperate">
                    <a-button
                      v-if="record.status === 'draft'"
                      type="text"
                      status="success"
                      @click="doLockSettlement(record)"
                      >锁定</a-button
                    >
                    <!-- 客服提成结算不写钱包，锁定后由财务打款并登记外部凭证。 -->
                    <a-button
                      v-if="
                        record.status === 'locked' && record.owner_type === 'cs'
                      "
                      type="text"
                      status="success"
                      @click="openPayout(record)"
                      >登记发放</a-button
                    >
                    <!-- 作废 / 重开（P0-6 / P0-8）：仅客服提成结算单；作废人不得等于登记人。 -->
                    <a-button
                      v-if="csVoidable(record)"
                      type="text"
                      status="danger"
                      @click="openCsVoid(record)"
                      >作废</a-button
                    >
                    <a-button
                      v-if="csReopenable(record)"
                      type="text"
                      @click="openCsReopen(record)"
                      >重开</a-button
                    >
                  </template>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 提现审核 -->
        <a-tab-pane key="withdrawals" title="提现审核">
          <a-space class="toolbar">
            <a-input-number
              v-model="withdrawalFilters.playerId"
              placeholder="陪玩 ID"
              :min="0"
              :style="{ width: '150px' }"
            />
            <a-select
              v-model="withdrawalFilters.status"
              placeholder="状态"
              allow-clear
              :style="{ width: '140px' }"
            >
              <a-option
                v-for="option in withdrawalStatusOptions"
                :key="option.value"
                :value="option.value"
                >{{ option.label }}</a-option
              >
            </a-select>
            <a-button :loading="withdrawalsLoading" @click="loadWithdrawals"
              >查询</a-button
            >
          </a-space>
          <a-table
            :data="withdrawals"
            :loading="withdrawalsLoading"
            row-key="id"
            :pagination="{ pageSize: 20 }"
          >
            <template #columns>
              <a-table-column data-index="withdrawal_no" title="提现单号" />
              <a-table-column data-index="player_id" title="陪玩" :width="80" />
              <a-table-column title="申请金额">
                <template #cell="{ record }">{{
                  money(record.amount_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="手续费 / 税费">
                <template #cell="{ record }"
                  >{{ money(record.fee_cents) }} /
                  {{ money(record.tax_cents) }}</template
                >
              </a-table-column>
              <a-table-column title="实际到账">
                <template #cell="{ record }">{{
                  money(record.net_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="提现方式">
                <template #cell="{ record }">{{
                  withdrawalChannelLabel(record.channel)
                }}</template>
              </a-table-column>
              <a-table-column title="收款账号">
                <template #cell="{ record }">{{ record.account_ref }}</template>
              </a-table-column>
              <a-table-column title="状态">
                <template #cell="{ record }">
                  <a-tag :color="withdrawalStatusColor(record.status)">{{
                    withdrawalStatusLabel(record.status)
                  }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="打款凭证">
                <template #cell="{ record }">{{
                  record.payout_ref || '-'
                }}</template>
              </a-table-column>
              <a-table-column title="打款执行" :width="130">
                <template #cell="{ record }">
                  <a-tag :color="payoutDisplay(record).color">{{
                    payoutDisplay(record).label
                  }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="操作" :width="280">
                <template #cell="{ record }">
                  <template v-if="canOperate">
                    <template v-if="record.status === 'pending_review'">
                      <a-button
                        type="text"
                        status="success"
                        @click="doReviewWithdrawal(record, true)"
                        >通过</a-button
                      >
                      <a-button
                        type="text"
                        status="danger"
                        @click="openWithdrawalReject(record)"
                        >驳回</a-button
                      >
                    </template>
                    <template v-else-if="record.status === 'approved'">
                      <a-button
                        type="text"
                        status="success"
                        @click="openWithdrawalPayoutRequest(record)"
                        >提交打款</a-button
                      >
                      <a-button
                        type="text"
                        @click="openWithdrawalPayouts(record)"
                        >打款记录</a-button
                      >
                      <!-- 旧版 /pay 入口保留兼容，主流程走打款执行状态机。 -->
                      <a-dropdown trigger="click">
                        <a-button type="text">旧版入口</a-button>
                        <template #content>
                          <a-doption @click="openWithdrawalPay(record)"
                            >旧版登记打款（兼容）</a-doption
                          >
                        </template>
                      </a-dropdown>
                    </template>
                    <a-button
                      v-else-if="record.status === 'paid'"
                      type="text"
                      @click="openWithdrawalPayouts(record)"
                      >打款记录</a-button
                    >
                    <span v-else class="text-secondary">-</span>
                  </template>
                  <span v-else>-</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 批量代发（云账户）：按 ISO 周预览可发单 → 一键提交 → 批次列表 / 明细 / 同步 / 重试 -->
        <a-tab-pane key="payout_batches" title="批量代发">
          <a-space class="toolbar" wrap>
            <a-select
              v-model="payoutBatchWeek"
              :style="{ width: '220px' }"
              @change="loadPayoutBatchPreview"
            >
              <a-option
                v-for="option in payoutBatchWeekOptions"
                :key="option.value"
                :value="option.value"
                >{{ option.label }}</a-option
              >
            </a-select>
            <a-button
              :loading="payoutBatchPreviewLoading"
              @click="loadPayoutBatchPreview"
              >刷新预览</a-button
            >
          </a-space>
          <!-- 未启用 / 配置不完整 / 无权限：直接展示后端中文提示，主按钮随之为禁用。 -->
          <a-alert
            v-if="payoutBatchError"
            type="warning"
            class="payout-batch-alert"
            >{{ payoutBatchError }}</a-alert
          >
          <a-space class="payout-batch-summary" wrap>
            <a-typography-text>
              本周可代发
              <span class="config-value">{{
                payoutBatchPreview?.ready_count || 0
              }}</span>
              笔，合计
              <span class="config-value">{{
                money(payoutBatchPreview?.ready_total_cents || 0)
              }}</span>
              ；跳过 {{ payoutBatchPreview?.skipped_count || 0 }} 笔（{{
                money(payoutBatchPreview?.skipped_total_cents || 0)
              }}）
            </a-typography-text>
            <a-button
              type="primary"
              :loading="payoutBatchSubmitting"
              :disabled="!canSubmitPayoutBatch"
              @click="confirmSubmitPayoutBatch"
              >代发本周（{{ payoutBatchPreview?.ready_count || 0 }} 笔 /
              {{
                money(payoutBatchPreview?.ready_total_cents || 0)
              }}）</a-button
            >
          </a-space>
          <a-table
            :data="payoutBatchPreview?.items || []"
            :loading="payoutBatchPreviewLoading"
            row-key="withdrawal_no"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column title="陪玩名称">
                <template #cell="{ record }">{{
                  record.player_name || `#${record.player_id}`
                }}</template>
              </a-table-column>
              <a-table-column data-index="withdrawal_no" title="提现单号" />
              <a-table-column title="净额">
                <template #cell="{ record }">{{
                  money(record.net_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="收款账户">
                <template #cell="{ record }">
                  <span v-if="record.account_no_masked">
                    {{ accountTypeLabel(record.account_type) }}
                    {{ record.account_no_masked }}
                  </span>
                  <span v-else class="text-secondary">未签约</span>
                </template>
              </a-table-column>
              <a-table-column title="状态" :width="220">
                <template #cell="{ record }">
                  <a-tag v-if="record.ready" color="green">可代发</a-tag>
                  <a-tag v-else color="gray"
                    >跳过：{{ record.skip_reason }}</a-tag
                  >
                </template>
              </a-table-column>
            </template>
          </a-table>

          <div class="section-title">代发批次</div>
          <a-space class="toolbar" wrap>
            <a-select
              v-model="payoutBatchFilters.status"
              placeholder="批次状态"
              allow-clear
              :style="{ width: '160px' }"
              @change="reloadPayoutBatches"
            >
              <a-option
                v-for="option in payoutBatchStatusOptions"
                :key="option.value"
                :value="option.value"
                >{{ option.label }}</a-option
              >
            </a-select>
            <a-button
              :loading="payoutBatchesLoading"
              @click="reloadPayoutBatches"
              >查询</a-button
            >
          </a-space>
          <a-table
            :data="payoutBatches"
            :loading="payoutBatchesLoading"
            row-key="id"
            :pagination="{
              current: payoutBatchPage,
              pageSize: payoutBatchPageSize,
              total: payoutBatchTotal,
              showTotal: true,
            }"
            @page-change="changePayoutBatchPage"
          >
            <template #columns>
              <a-table-column data-index="batch_no" title="批次号" />
              <a-table-column title="状态" :width="100">
                <template #cell="{ record }">
                  <a-tag :color="payoutBatchStatusColor(record.status)">{{
                    payoutBatchStatusLabel(record.status)
                  }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column
                data-index="total_count"
                title="笔数"
                :width="80"
              />
              <a-table-column title="金额" :width="110">
                <template #cell="{ record }">{{
                  money(record.total_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="服务商批次号">
                <template #cell="{ record }">{{
                  record.provider_batch_no || '-'
                }}</template>
              </a-table-column>
              <a-table-column title="提交人">
                <template #cell="{ record }">{{
                  record.submitted_by || '-'
                }}</template>
              </a-table-column>
              <a-table-column title="提交时间">
                <template #cell="{ record }">{{
                  record.submitted_at || '-'
                }}</template>
              </a-table-column>
              <a-table-column title="失败原因">
                <template #cell="{ record }">{{
                  record.fail_reason || '-'
                }}</template>
              </a-table-column>
              <!-- 同步仅进行中批次可用；重试仅 partial / failed 且确有失败明细时可用。 -->
              <a-table-column title="操作" :width="210">
                <template #cell="{ record }">
                  <a-button
                    v-if="canPayoutBatchDetail"
                    type="text"
                    @click="openPayoutBatchDetail(record)"
                    >查看明细</a-button
                  >
                  <a-button
                    v-if="canPayoutBatchSync && payoutBatchCanSync(record)"
                    type="text"
                    :loading="payoutBatchActionId === record.id"
                    @click="doSyncPayoutBatch(record)"
                    >同步</a-button
                  >
                  <a-button
                    v-if="canPayoutBatchRetry && payoutBatchCanRetry(record)"
                    type="text"
                    status="danger"
                    :loading="payoutBatchActionId === record.id"
                    @click="doRetryPayoutBatch(record)"
                    >重试</a-button
                  >
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 结单规则（首版） -->
        <a-tab-pane key="close_rules" title="结单规则">
          <a-space class="toolbar">
            <a-button type="primary" @click="openCloseRuleCreate"
              >新建规则</a-button
            >
            <a-button :loading="closeRulesLoading" @click="loadCloseRules"
              >刷新</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="close-rule-tip">
            把「服务凭证不少于 N 张、服务时长不为零、无未处理加钟 /
            售后」做成可配置规则，按 全局 / 游戏分区 / 商品
            绑定；金额达阈值时须由非负责客服的管理员复核结单。规则版本化：草稿 →
            生效，改规则生成新版本，回滚以历史版本为模板生成更高版本。
          </a-typography-text>
          <a-table
            :data="closeRules"
            :loading="closeRulesLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="code" title="规则编号" />
              <a-table-column data-index="name" title="名称" />
              <a-table-column title="适用范围">
                <template #cell="{ record }">{{
                  closeRuleScopeLabel(record)
                }}</template>
              </a-table-column>
              <a-table-column title="凭证/时长/无加钟/无售后">
                <template #cell="{ record }"
                  >{{ record.min_evidence }} 张 /
                  {{ record.require_duration ? '是' : '否' }} /
                  {{ record.require_no_pending_addon ? '是' : '否' }} /
                  {{ record.require_no_open_aftersale ? '是' : '否' }}</template
                >
              </a-table-column>
              <a-table-column title="复核阈值">
                <template #cell="{ record }">{{
                  money(record.review_threshold_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="版本 / 状态">
                <template #cell="{ record }"
                  >v{{ record.version }} /
                  {{ closeRuleStatusLabel(record.status) }}</template
                >
              </a-table-column>
              <a-table-column title="条件树" :width="220">
                <template #cell="{ record }">
                  <span
                    v-if="ruleHasConditionTree(record)"
                    class="close-rule-tree"
                    :title="closeRuleTreeSummary(record)"
                    >{{ closeRuleTreeSummary(record) }}</span
                  >
                  <span v-else class="close-rule-tree-none">默认结构化项</span>
                </template>
              </a-table-column>
              <a-table-column title="操作" :width="200">
                <template #cell="{ record }">
                  <a-button
                    v-if="record.status === 'draft'"
                    type="text"
                    @click="openCloseRuleEdit(record)"
                    >编辑</a-button
                  >
                  <a-button
                    v-if="record.status === 'draft'"
                    type="text"
                    status="success"
                    @click="doActivateCloseRule(record)"
                    >生效</a-button
                  >
                  <a-button
                    v-else-if="record.status === 'history'"
                    type="text"
                    @click="doRollbackCloseRule(record)"
                    >回滚</a-button
                  >
                  <span v-else>—</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 结算周期：日/周/月/自定义间隔，按 全局 → 游戏 → 等级 → 陪玩 逐级覆盖 -->
        <a-tab-pane key="settlement_cycles" title="结算周期">
          <a-space class="toolbar">
            <a-button type="primary" @click="openCycleCreate"
              >新建周期</a-button
            >
            <a-button :loading="cyclesLoading" @click="loadCycles"
              >刷新</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="close-rule-tip">
            按工作室发薪习惯配置日结 / 周结 / 月结 / 自定义间隔（天数，按 UTC
            自然日对齐切分）；同一维度同一键只保留一条配置，解析时按「单个陪玩 →
            按等级 → 按游戏 → 全局默认」逐级覆盖，全部缺失时回落系统配置（
            <span class="config-value">当前 {{ settlementPeriodText }}</span>
            ）。陪玩端「下次结算时间」与自动结算任务均按解析结果执行；
            存在争议的被冻结明细不参与当期结算，争议终结后自动解冻。
          </a-typography-text>
          <a-table
            :data="cycles"
            :loading="cyclesLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column title="维度">
                <template #cell="{ record }">{{
                  cycleScopeLabel(record)
                }}</template>
              </a-table-column>
              <a-table-column title="周期">
                <template #cell="{ record }">{{
                  cyclePeriodLabel(record)
                }}</template>
              </a-table-column>
              <a-table-column data-index="note" title="备注" />
              <a-table-column title="状态" :width="90">
                <template #cell="{ record }">{{
                  record.enabled ? '启用' : '停用'
                }}</template>
              </a-table-column>
              <a-table-column title="操作" :width="150">
                <template #cell="{ record }">
                  <a-button type="text" @click="openCycleEdit(record)"
                    >编辑</a-button
                  >
                  <a-button type="text" @click="toggleCycle(record)">
                    {{ record.enabled ? '停用' : '启用' }}
                  </a-button>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 陪玩追偿 -->
        <a-tab-pane key="recoveries" title="陪玩追偿">
          <a-space class="toolbar">
            <a-input-number
              v-model="recoveryFilters.playerId"
              placeholder="陪玩 ID"
              :min="1"
            />
            <a-select
              v-model="recoveryFilters.status"
              placeholder="状态"
              allow-clear
              style="width: 140px"
            >
              <a-option value="pending">待审批</a-option>
              <a-option value="approved">待扣回</a-option>
              <a-option value="recovered">已扣回</a-option>
              <a-option value="rejected">已驳回</a-option>
            </a-select>
            <a-button :loading="recoveriesLoading" @click="loadRecoveries"
              >查询</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="tip">
            客户赔付由陪玩承担时，售后执行会生成待审批的追偿单；由非申请人审批通过后从陪玩{{
              walletName('player_catfood')
            }}扣回（余额不足可待结算后再执行）。
            扣回与「退款冲回分成」相互独立。
          </a-typography-text>
          <a-table
            :data="recoveries"
            :loading="recoveriesLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="recovery_no" title="追偿单号" />
              <a-table-column data-index="player_id" title="陪玩 ID" />
              <a-table-column title="金额">
                <template #cell="{ record }">{{
                  money(record.amount_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="来源">
                <template #cell="{ record }">{{
                  record.after_sale_id > 0
                    ? `售后 #${record.after_sale_id}`
                    : '手工'
                }}</template>
              </a-table-column>
              <a-table-column data-index="reason" title="追偿原因" />
              <a-table-column title="状态">
                <template #cell="{ record }">{{
                  recoveryStatusLabel(record.status)
                }}</template>
              </a-table-column>
              <a-table-column title="操作" :width="200">
                <template #cell="{ record }">
                  <a-button
                    v-if="canOperate && record.status === 'pending'"
                    type="text"
                    status="success"
                    @click="doApproveRecovery(record)"
                    >审批</a-button
                  >
                  <a-button
                    v-if="canOperate && record.status === 'pending'"
                    type="text"
                    status="danger"
                    @click="openRecoveryReject(record)"
                    >驳回</a-button
                  >
                  <a-button
                    v-if="canOperate && record.status === 'approved'"
                    type="text"
                    status="success"
                    @click="doExecuteRecovery(record)"
                    >执行扣回</a-button
                  >
                  <span v-if="record.status === 'recovered'">已扣回</span>
                  <span v-else-if="record.status === 'rejected'">已驳回</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-modal
      v-model:visible="closeRuleVisible"
      :title="closeRuleForm.id > 0 ? '编辑结单规则' : '新建结单规则'"
      :width="760"
      @ok="submitCloseRule"
      @cancel="closeRuleVisible = false"
    >
      <a-form :model="closeRuleForm">
        <a-form-item label="规则编号" required>
          <a-input
            v-model="closeRuleForm.code"
            :max-length="48"
            :disabled="closeRuleForm.id > 0"
          />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model="closeRuleForm.name" :max-length="64" />
        </a-form-item>
        <a-form-item label="适用范围" required>
          <a-select v-model="closeRuleForm.scope">
            <a-option value="global">全局</a-option>
            <a-option value="game">按游戏分区</a-option>
            <a-option value="sku">按 商品</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="closeRuleForm.scope !== 'global'"
          label="范围键"
          required
        >
          <a-input
            v-model="closeRuleForm.scopeKey"
            :max-length="64"
            placeholder="游戏分区名或 商品 编号"
          />
        </a-form-item>
        <a-form-item label="服务凭证最少张数" required>
          <a-input-number v-model="closeRuleForm.minEvidence" :min="1" />
        </a-form-item>
        <a-form-item label="要求服务时长不为零">
          <a-switch v-model="closeRuleForm.requireDuration" />
        </a-form-item>
        <a-form-item label="无未处理加钟">
          <a-switch v-model="closeRuleForm.requireNoPendingAddon" />
        </a-form-item>
        <a-form-item label="无进行中售后">
          <a-switch v-model="closeRuleForm.requireNoOpenAftersale" />
        </a-form-item>
        <a-form-item label="金额复核阈值（元）">
          <a-input-number
            v-model="closeRuleForm.reviewThresholdYuan"
            :min="0"
            :precision="2"
          />
          <a-typography-text type="secondary">
            订单应付达该阈值时须由非负责客服的管理员复核结单；0 表示不额外复核。
          </a-typography-text>
        </a-form-item>
        <a-form-item label="结单条件树">
          <CloseConditionDesigner
            v-model="closeRuleForm.conditionTree"
            :structured-source="closeRuleStructuredSource"
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="closeRuleForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="cycleVisible"
      :title="cycleForm.id ? '编辑结算周期' : '新建结算周期'"
      @ok="submitCycle"
      @cancel="cycleVisible = false"
    >
      <a-form :model="cycleForm">
        <a-form-item label="配置维度" required>
          <a-select v-model="cycleForm.scope" :disabled="cycleForm.id > 0">
            <a-option value="global">全局默认</a-option>
            <a-option value="game">按游戏分区</a-option>
            <a-option value="level">按陪玩等级</a-option>
            <a-option value="player">按单个陪玩</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="cycleForm.scope !== 'global'"
          label="维度键"
          required
        >
          <a-select
            v-if="cycleForm.scope === 'level'"
            v-model="cycleForm.scopeKey"
          >
            <a-option
              v-for="level in skillLevels"
              :key="level.code"
              :value="level.code"
            >
              {{ level.name }}（{{ level.code }}）
            </a-option>
          </a-select>
          <a-input
            v-else
            v-model="cycleForm.scopeKey"
            :max-length="64"
            :placeholder="
              cycleForm.scope === 'player' ? '陪玩档案 ID' : '游戏分区名'
            "
          />
        </a-form-item>
        <a-form-item label="结算周期" required>
          <a-select v-model="cycleForm.period">
            <a-option value="daily">日结</a-option>
            <a-option value="weekly">周结</a-option>
            <a-option value="monthly">月结</a-option>
            <a-option value="custom">自定义间隔</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="cycleForm.period === 'custom'"
          label="间隔天数"
          required
        >
          <a-input-number
            v-model="cycleForm.intervalDays"
            :min="1"
            :max="365"
          />
          <a-typography-text type="secondary">
            按 UTC 自然日从 1970-01-01 对齐切分，1–365 天。
          </a-typography-text>
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="cycleForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 结算单详情：后端返回 { settlement, entries, entry_count, detail_truncated } 包体。 -->
    <a-drawer
      v-model:visible="detailVisible"
      title="结算单详情"
      :width="900"
      :footer="false"
    >
      <a-spin :loading="detailLoading" style="width: 100%">
        <a-empty v-if="!detail" description="暂无详情" />
        <template v-else>
          <a-descriptions :column="2" size="small" bordered>
            <a-descriptions-item label="结算单号">{{
              detail.settlement.settlement_no
            }}</a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag v-if="detail.settlement.status === 'void'" color="red"
                >已作废</a-tag
              >
              <span v-else>{{
                settlementStatusLabel(detail.settlement.status)
              }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="主体"
              >{{ detail.settlement.owner_type === 'cs' ? '客服' : '陪玩' }} #{{
                detail.settlement.owner_id
              }}</a-descriptions-item
            >
            <a-descriptions-item label="版本"
              >v{{ detail.settlement.version }}</a-descriptions-item
            >
            <a-descriptions-item label="结算周期"
              >{{ detail.settlement.period_start }} ~
              {{ detail.settlement.period_end }}</a-descriptions-item
            >
            <a-descriptions-item label="明细数">{{
              detail.settlement.entry_count
            }}</a-descriptions-item>
            <a-descriptions-item label="应结金额">{{
              money(detail.settlement.gross_cents)
            }}</a-descriptions-item>
            <a-descriptions-item label="调整金额">{{
              money(detail.settlement.adjustment_cents)
            }}</a-descriptions-item>
            <a-descriptions-item label="实结金额">{{
              money(detail.settlement.net_cents)
            }}</a-descriptions-item>
            <a-descriptions-item label="明细合计（返回条目）"
              >{{ money(detailEntrySummary.amount) }} / 净额
              {{ money(detailEntrySummary.net) }}</a-descriptions-item
            >
            <a-descriptions-item label="锁定人 / 锁定时间"
              >{{ detail.settlement.locked_by_admin_id ?? '-' }} /
              {{ detail.settlement.locked_at || '-' }}</a-descriptions-item
            >
            <a-descriptions-item label="发放凭证 / 发放时间"
              >{{ detail.settlement.payout_ref || '-' }} /
              {{ detail.settlement.paid_at || '-' }}</a-descriptions-item
            >
            <a-descriptions-item label="发放人">{{
              detail.settlement.paid_by_admin_id ?? '-'
            }}</a-descriptions-item>
            <a-descriptions-item label="作废人 / 作废时间"
              >{{ detail.settlement.voided_by_admin_id ?? '-' }} /
              {{ detail.settlement.voided_at || '-' }}</a-descriptions-item
            >
            <a-descriptions-item label="作废原因" :span="2">{{
              detail.settlement.void_reason || '-'
            }}</a-descriptions-item>
            <a-descriptions-item label="创建 / 更新时间" :span="2"
              >{{ detail.settlement.created_at }} /
              {{ detail.settlement.updated_at }}</a-descriptions-item
            >
          </a-descriptions>

          <a-alert
            v-if="detail.detail_truncated"
            class="detail-alert"
            type="warning"
          >
            本期明细超过返回上限，以下仅展示前
            {{ detail.entry_count }} 条；结算金额以结算单汇总字段为准。
          </a-alert>
          <a-alert
            v-if="
              detail.settlement.owner_type === 'cs' &&
              !detail.entries.length &&
              detail.settlement.entry_count > 0
            "
            class="detail-alert"
            type="info"
          >
            客服提成结算单的明细由客服提成明细表绑定，本详情接口只内联陪玩分成明细，
            因此这里不返回条目；请到「客服提成明细」页签按客服 ID 与周期核对。
          </a-alert>

          <div class="section-title">
            本期明细（{{ detail.entries.length }} 条，已冻结
            {{ detailEntrySummary.frozen }} 条）
          </div>
          <a-table
            :data="detail.entries"
            row-key="id"
            size="small"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column title="订单" :width="170">
                <template #cell="{ record }">{{
                  record.order_no || '—'
                }}</template>
              </a-table-column>
              <a-table-column data-index="player_id" title="陪玩" :width="80" />
              <a-table-column title="类型" :width="100">
                <template #cell="{ record }">{{
                  entryKindLabel(record.kind)
                }}</template>
              </a-table-column>
              <a-table-column title="规则 / 版本">
                <template #cell="{ record }"
                  >{{ record.rule_no || '-' }} / v{{
                    record.rule_version
                  }}</template
                >
              </a-table-column>
              <a-table-column title="基数" :width="100">
                <template #cell="{ record }">{{
                  money(record.base_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="分成" :width="100">
                <template #cell="{ record }">{{
                  money(record.amount_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="扣减" :width="100">
                <template #cell="{ record }">{{
                  money(record.deducted_cents || 0)
                }}</template>
              </a-table-column>
              <a-table-column title="净额" :width="100">
                <template #cell="{ record }">{{
                  money(record.net_cents || 0)
                }}</template>
              </a-table-column>
              <a-table-column title="状态" :width="90">
                <template #cell="{ record }">{{
                  entryStatusLabel(record.status)
                }}</template>
              </a-table-column>
              <a-table-column title="冻结" :width="120">
                <template #cell="{ record }">
                  <a-tag v-if="record.frozen_at" color="orange">已冻结</a-tag>
                  <span v-else class="text-secondary">-</span>
                </template>
              </a-table-column>
              <a-table-column title="操作" :width="120">
                <template #cell="{ record }">
                  <a-button
                    v-if="entryCanFreeze(record)"
                    type="text"
                    status="danger"
                    @click="openFreeze(record)"
                    >冻结</a-button
                  >
                  <a-button
                    v-else-if="record.frozen_at && canUnfreeze"
                    type="text"
                    @click="openUnfreeze(record)"
                    >解冻</a-button
                  >
                  <span v-else class="text-secondary">-</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </template>
      </a-spin>
    </a-drawer>

    <!-- 冻结订单分成（争议冻结）：必须填写原因，确认后按订单 + 陪玩冻结待结算明细。 -->
    <a-modal
      v-model:visible="freezeVisible"
      title="冻结订单分成（二次确认）"
      ok-text="确认冻结"
      @ok="submitFreeze"
      @cancel="freezeVisible = false"
    >
      <a-form :model="freezeForm">
        <a-form-item label="订单">
          <a-typography-text>#{{ freezeForm.orderId }}</a-typography-text>
        </a-form-item>
        <a-form-item label="陪玩">
          <a-typography-text>#{{ freezeForm.playerId }}</a-typography-text>
        </a-form-item>
        <a-form-item label="冻结原因" required>
          <a-textarea
            v-model="freezeForm.reason"
            :max-length="255"
            placeholder="如：客户投诉服务问题，待争议处理"
          />
        </a-form-item>
        <a-typography-text type="secondary">
          冻结后该订单该陪玩的待结算分成不参与当期结算，明细状态仍为待结算；
          争议结案后在此解冻即可恢复。已结算或已纳入结算单的明细不会被冻结。
        </a-typography-text>
      </a-form>
    </a-modal>

    <!-- 解冻订单分成：解冻该订单下全部被冻结的待结算明细。 -->
    <a-modal
      v-model:visible="unfreezeVisible"
      title="解冻订单分成（二次确认）"
      ok-text="确认解冻"
      @ok="submitUnfreeze"
      @cancel="unfreezeVisible = false"
    >
      <a-typography-text>
        将解冻订单 {{ unfreezeOrderNo || `#${unfreezeOrderId}` }}
        下全部被冻结的待结算分成明细，恢复参与当期结算。
      </a-typography-text>
      <a-typography-text type="secondary" class="modal-tip">
        解冻按订单维度生效，会同时解除该订单其他陪玩的冻结。
      </a-typography-text>
    </a-modal>

    <!-- 作废客服提成结算单：原因必填，作废人不得与登记人相同。 -->
    <a-modal
      v-model:visible="csVoidVisible"
      title="作废客服提成结算单（二次确认）"
      ok-text="确认作废"
      @ok="submitCsVoid"
      @cancel="csVoidVisible = false"
    >
      <a-form :model="csVoidForm">
        <a-form-item label="结算单">
          <a-typography-text>{{ csVoidForm.settlementNo }}</a-typography-text>
        </a-form-item>
        <a-form-item label="作废原因" required>
          <a-textarea
            v-model="csVoidForm.reason"
            :max-length="120"
            placeholder="如：周期内数据有误，需重新计提"
          />
        </a-form-item>
        <a-typography-text type="secondary">
          作废后该单绑定的提成明细安全回退到待结算，原单转为已作废且不可再发放；
          已登记发放的结算单不能作废（须走财务冲正），作废人不得与登记人相同。
        </a-typography-text>
      </a-form>
    </a-modal>

    <!-- 重开客服提成结算单：按同一客服 + 同一周期重新生成草稿单。 -->
    <a-modal
      v-model:visible="csReopenVisible"
      title="重开客服提成结算单（二次确认）"
      ok-text="确认重开"
      @ok="submitCsReopen"
      @cancel="csReopenVisible = false"
    >
      <a-form :model="csReopenForm">
        <a-form-item label="原结算单">
          <a-typography-text>{{ csReopenForm.settlementNo }}</a-typography-text>
        </a-form-item>
        <a-form-item label="客服 / 周期">
          <a-typography-text
            >客服 #{{ csReopenForm.adminId }} · {{ csReopenForm.periodStart }} ~
            {{ csReopenForm.periodEnd }}</a-typography-text
          >
        </a-form-item>
        <a-form-item label="重开原因" required>
          <a-textarea
            v-model="csReopenForm.reason"
            :max-length="120"
            placeholder="如：更正后重新计提，避免漏发"
          />
        </a-form-item>
        <a-typography-text type="secondary">
          重开只生成草稿单，仍需锁定并登记发放（发放人不得等于登记人），因此作废
          + 重开不会重复发钱。
        </a-typography-text>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="ruleCreateVisible"
      title="新建分成规则"
      @ok="submitRuleCreate"
      @cancel="ruleCreateVisible = false"
    >
      <a-form :model="ruleForm">
        <a-form-item label="规则编号（留空自动生成）">
          <a-input v-model="ruleForm.ruleNo" :max-length="64" />
        </a-form-item>
        <a-form-item label="范围" required>
          <a-select v-model="ruleForm.scope">
            <a-option value="global">全局</a-option>
            <a-option value="game">按游戏</a-option>
            <a-option value="level">按陪玩等级</a-option>
            <a-option value="player">按陪玩</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="ruleForm.scope !== 'global'"
          :label="
            ruleForm.scope === 'game'
              ? '游戏标识'
              : ruleForm.scope === 'level'
              ? '陪玩等级'
              : '陪玩 ID'
          "
          required
        >
          <a-select
            v-if="ruleForm.scope === 'level'"
            v-model="ruleForm.scopeKey"
          >
            <a-option
              v-for="level in skillLevels"
              :key="level.code"
              :value="level.code"
            >
              {{ level.name }}（{{ level.code }}）
            </a-option>
          </a-select>
          <a-input v-else v-model="ruleForm.scopeKey" :max-length="64" />
        </a-form-item>
        <a-form-item label="计算方式" required>
          <a-select v-model="ruleForm.calcMode">
            <a-option value="percent">按比例（万分比）</a-option>
            <a-option value="fixed_per_order">每单固定</a-option>
            <a-option value="fixed_per_unit">每单位固定</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="ruleForm.calcMode === 'percent'"
          label="比例（万分比）"
        >
          <a-input-number v-model="ruleForm.valueBp" :min="1" :max="10000" />
        </a-form-item>
        <a-form-item v-else label="固定金额（元）">
          <a-input-number
            v-model="ruleForm.valueYuan"
            :min="0"
            :precision="2"
          />
        </a-form-item>
        <a-form-item
          v-if="ruleForm.calcMode === 'fixed_per_unit'"
          label="计量基准"
        >
          <a-select v-model="ruleForm.unitBasis">
            <a-option value="sku_quantity">商品数量</a-option>
            <a-option value="promised_units">承诺服务量</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model="ruleForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="settlementCreateVisible"
      title="生成结算单"
      @ok="submitSettlementCreate"
      @cancel="settlementCreateVisible = false"
    >
      <a-form :model="settlementForm">
        <a-form-item label="陪玩 ID" required>
          <a-input-number v-model="settlementForm.playerId" :min="1" />
        </a-form-item>
        <a-form-item label="周期开始" required>
          <a-date-picker
            v-model="settlementForm.periodStart"
            show-time
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="周期结束" required>
          <a-date-picker
            v-model="settlementForm.periodEnd"
            show-time
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="csRuleCreateVisible"
      title="新建客服提成规则"
      @ok="submitCsRuleCreate"
      @cancel="csRuleCreateVisible = false"
    >
      <a-form :model="csRuleForm">
        <a-form-item label="规则编号（留空自动生成）">
          <a-input v-model="csRuleForm.ruleNo" :max-length="48" />
        </a-form-item>
        <a-form-item label="适用范围" required>
          <a-select v-model="csRuleForm.scope">
            <a-option value="global">全局默认</a-option>
            <a-option value="admin">指定客服</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="csRuleForm.scope === 'admin'"
          label="客服管理员 ID"
          required
        >
          <a-input-number v-model="csRuleForm.scopeKey" :min="1" />
        </a-form-item>
        <a-form-item label="提成基数" required>
          <a-select v-model="csRuleForm.baseMode">
            <a-option value="order_amount">报单金额（折后应付）</a-option>
            <a-option value="order_contribution"
              >订单贡献（扣陪玩分成后）</a-option
            >
            <a-option value="order_count">单量（每单 1）</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="计费方式" required>
          <a-select v-model="csRuleForm.calcMode">
            <a-option value="percent">按比例（万分比）</a-option>
            <a-option value="fixed_per_order">每单固定额</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="礼物收入">
          <a-switch v-model="csRuleForm.includeGifts" />
          <a-typography-text type="secondary" style="margin-left: 8px"
            >开启后，已付款礼物按本规则计提客服提成；礼物退款冲回。</a-typography-text
          >
        </a-form-item>
        <a-form-item
          v-if="csRuleForm.calcMode === 'percent'"
          label="比例（万分比，有阶梯时为兜底）"
        >
          <a-input-number v-model="csRuleForm.valueBp" :min="0" :max="10000" />
        </a-form-item>
        <a-form-item v-else label="每单固定额（元）">
          <a-input-number
            v-model="csRuleForm.valueYuan"
            :min="0"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="提成周期" required>
          <a-select v-model="csRuleForm.period">
            <a-option value="daily">日结</a-option>
            <a-option value="weekly">周结</a-option>
            <a-option value="monthly">月结</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="阶梯（按周期累计净基数分档）">
          <a-space direction="vertical" fill>
            <a-space
              v-for="(tier, index) in csRuleForm.tiers"
              :key="index"
              align="center"
            >
              <a-input-number
                :model-value="tier.thresholdBaseCents / 100"
                placeholder="基数阈值（元）"
                :min="0.01"
                :precision="2"
                @change="(value) => onTierThresholdChange(tier, value)"
              />
              <a-input-number
                v-model="tier.valueBp"
                placeholder="比例（万分比）"
                :min="1"
                :max="10000"
              />
              <a-button
                size="mini"
                status="danger"
                @click="csRuleForm.tiers.splice(index, 1)"
                >删除</a-button
              >
            </a-space>
            <a-button size="mini" @click="addCsRuleTier">添加阶梯档</a-button>
          </a-space>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model="csRuleForm.note" :max-length="255" />
        </a-form-item>
        <a-typography-text type="secondary">
          提成只在订单完成后生成；退款按比例冲回、全额退款冲至零；提成不得超过「报单金额扣除陪玩分成」后的可分余额。
        </a-typography-text>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="csSettlementVisible"
      title="生成客服提成结算单"
      @ok="submitCsSettlementCreate"
      @cancel="csSettlementVisible = false"
    >
      <a-form :model="csSettlementForm">
        <a-form-item label="客服管理员 ID" required>
          <a-input-number v-model="csSettlementForm.adminId" :min="1" />
        </a-form-item>
        <a-form-item label="周期开始" required>
          <a-date-picker
            v-model="csSettlementForm.periodStart"
            show-time
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="周期结束" required>
          <a-date-picker
            v-model="csSettlementForm.periodEnd"
            show-time
            style="width: 100%"
          />
        </a-form-item>
        <a-typography-text type="secondary">
          客服提成结算不写{{
            walletName('player_catfood')
          }}钱包：锁定后由财务打款，并在结算单上登记外部打款凭证。 也可由
          `esports_generate_cs_settlements`
          任务按上一完整周期自动生成草稿结算单（幂等：同客服同周期已生成则跳过）。
        </a-typography-text>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="payoutVisible"
      title="登记发放"
      @ok="submitPayout"
      @cancel="payoutVisible = false"
    >
      <a-form :model="payoutForm">
        <a-form-item label="结算单">
          <a-typography-text>{{ payoutForm.settlementNo }}</a-typography-text>
        </a-form-item>
        <a-form-item label="外部打款凭证号" required>
          <a-input v-model="payoutForm.payoutRef" :max-length="128" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="withdrawalRejectVisible"
      title="驳回提现"
      @ok="submitWithdrawalReject"
      @cancel="withdrawalRejectVisible = false"
    >
      <a-form :model="withdrawalRejectForm">
        <a-form-item label="提现单">
          <a-typography-text>{{
            withdrawalRejectForm.withdrawalNo
          }}</a-typography-text>
        </a-form-item>
        <a-form-item label="驳回原因" required>
          <a-textarea v-model="withdrawalRejectForm.reason" :max-length="255" />
        </a-form-item>
        <a-typography-text type="secondary">
          驳回会把申请金额退回陪玩的{{
            walletName('player_catfood')
          }}账户，退回只发生一次。
        </a-typography-text>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="withdrawalPayVisible"
      title="登记提现打款"
      @ok="submitWithdrawalPay"
      @cancel="withdrawalPayVisible = false"
    >
      <a-form :model="withdrawalPayForm">
        <a-form-item label="提现单">
          <a-typography-text>{{
            withdrawalPayForm.withdrawalNo
          }}</a-typography-text>
        </a-form-item>
        <a-form-item label="外部打款凭证号" required>
          <a-input v-model="withdrawalPayForm.payoutRef" :max-length="128" />
        </a-form-item>
        <a-form-item label="完税凭证号">
          <a-input v-model="withdrawalPayForm.taxRef" :max-length="128" />
        </a-form-item>
        <a-typography-text type="secondary">
          打款不再改动{{ walletName('player_catfood') }}账户：申请时钱已离开{{
            walletName('player_catfood')
          }}，此处只登记到账凭证与时间。
          旧版入口会直接置为已打款；建议改用「提交打款」走打款执行状态机。
        </a-typography-text>
      </a-form>
    </a-modal>

    <!-- 打款执行记录：pay_requested 可确认成功 / 标记失败，失败后可重新提交。 -->
    <a-drawer
      v-model:visible="withdrawalPayoutsVisible"
      title="提现打款记录"
      :width="760"
      :footer="false"
    >
      <a-space class="toolbar">
        <a-typography-text>
          提现单：{{ withdrawalPayoutsTarget?.withdrawal_no || '-' }}（实际到账
          {{ money(withdrawalPayoutsTarget?.net_cents || 0) }}）
        </a-typography-text>
        <a-button
          size="small"
          :loading="withdrawalPayoutsLoading"
          @click="reloadWithdrawalPayouts"
          >刷新</a-button
        >
      </a-space>
      <a-table
        :data="withdrawalPayouts"
        :loading="withdrawalPayoutsLoading"
        row-key="id"
        :pagination="false"
      >
        <template #columns>
          <a-table-column data-index="payout_no" title="打款单号" />
          <a-table-column title="渠道" :width="90">
            <template #cell="{ record }">{{
              withdrawalChannelLabel(record.channel)
            }}</template>
          </a-table-column>
          <a-table-column data-index="transaction_no" title="外部流水号" />
          <a-table-column title="金额" :width="110">
            <template #cell="{ record }">{{
              money(record.amount_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="120">
            <template #cell="{ record }">
              <a-tag :color="withdrawalPayoutStatusColor(record.status)">{{
                withdrawalPayoutStatusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="完税凭证" :width="120">
            <template #cell="{ record }">{{ record.tax_ref || '-' }}</template>
          </a-table-column>
          <a-table-column title="提交时间" :width="170">
            <template #cell="{ record }">{{
              record.created_at || '-'
            }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="190">
            <template #cell="{ record }">
              <template v-if="record.status === 'pay_requested'">
                <a-button
                  type="text"
                  status="success"
                  @click="openWithdrawalPayoutPaid(record)"
                  >确认成功</a-button
                >
                <a-button
                  type="text"
                  status="danger"
                  @click="openWithdrawalPayoutFailed(record)"
                  >标记失败</a-button
                >
              </template>
              <span v-else-if="record.status === 'paid'" class="text-secondary"
                >已到账</span
              >
              <span v-else class="text-secondary">{{
                record.fail_reason || '已失败'
              }}</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
      <a-typography-text type="secondary" class="payout-tip">
        打款执行分阶段落账：提交打款后为「待确认到账」，确认成功才把提现单置为已打款；
        标记失败后提现单仍为已通过，可重新提交打款。同一外部流水号只能登记一次。
      </a-typography-text>
    </a-drawer>

    <!-- 批量代发明细：批次头 + 逐笔状态 / 服务商单号 / 失败码 / 到账时间 -->
    <a-drawer
      v-model:visible="payoutBatchDetailVisible"
      title="代发批次明细"
      :width="920"
      :footer="false"
    >
      <a-spin :loading="payoutBatchDetailLoading" style="width: 100%">
        <a-descriptions
          v-if="payoutBatchDetailTarget"
          :column="3"
          size="small"
          bordered
        >
          <a-descriptions-item label="批次号">{{
            payoutBatchDetailTarget.batch_no
          }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag
              :color="payoutBatchStatusColor(payoutBatchDetailTarget.status)"
              >{{
                payoutBatchStatusLabel(payoutBatchDetailTarget.status)
              }}</a-tag
            >
          </a-descriptions-item>
          <a-descriptions-item label="笔数 / 金额"
            >{{ payoutBatchDetailTarget.total_count }} 笔 /
            {{
              money(payoutBatchDetailTarget.total_cents)
            }}</a-descriptions-item
          >
          <a-descriptions-item label="服务商批次号">{{
            payoutBatchDetailTarget.provider_batch_no || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="提交人">{{
            payoutBatchDetailTarget.submitted_by || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="提交时间">{{
            payoutBatchDetailTarget.submitted_at || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="失败原因" :span="3">{{
            payoutBatchDetailTarget.fail_reason || '-'
          }}</a-descriptions-item>
        </a-descriptions>
        <a-table
          :data="payoutBatchDetailItems"
          row-key="payout_id"
          :pagination="false"
          class="payout-batch-detail-table"
        >
          <template #columns>
            <a-table-column data-index="withdrawal_no" title="提现单号" />
            <a-table-column title="陪玩">
              <template #cell="{ record }">{{
                record.player_name || `#${record.player_id}`
              }}</template>
            </a-table-column>
            <a-table-column title="金额" :width="100">
              <template #cell="{ record }">{{
                money(record.amount_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="状态" :width="100">
              <template #cell="{ record }">
                <a-tag :color="withdrawalPayoutStatusColor(record.status)">{{
                  withdrawalPayoutStatusLabel(record.status)
                }}</a-tag>
              </template>
            </a-table-column>
            <a-table-column title="服务商单号">
              <template #cell="{ record }">{{
                record.provider_order_no || '-'
              }}</template>
            </a-table-column>
            <a-table-column title="服务商状态">
              <template #cell="{ record }">{{
                record.provider_status || '-'
              }}</template>
            </a-table-column>
            <a-table-column title="失败码">
              <template #cell="{ record }">{{
                record.fail_code || '-'
              }}</template>
            </a-table-column>
            <a-table-column title="到账时间">
              <template #cell="{ record }">{{
                record.paid_at || '-'
              }}</template>
            </a-table-column>
          </template>
        </a-table>
      </a-spin>
    </a-drawer>

    <!-- 提交打款执行：金额固定为实际到账额，外部流水号幂等。 -->
    <a-modal
      v-model:visible="withdrawalPayoutRequestVisible"
      title="提交提现打款"
      @ok="submitWithdrawalPayoutRequest"
      @cancel="withdrawalPayoutRequestVisible = false"
    >
      <a-form :model="withdrawalPayoutRequestForm">
        <a-form-item label="提现单">
          <a-typography-text>{{
            withdrawalPayoutRequestForm.withdrawalNo
          }}</a-typography-text>
        </a-form-item>
        <a-form-item label="实际到账金额">
          <a-typography-text>{{
            money(withdrawalPayoutRequestForm.amountCents)
          }}</a-typography-text>
        </a-form-item>
        <a-form-item label="打款渠道" required>
          <a-select v-model="withdrawalPayoutRequestForm.channel">
            <a-option value="bank_card">银行卡</a-option>
            <a-option value="wechat">微信</a-option>
            <a-option value="alipay">支付宝</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="外部打款凭证号" required>
          <a-input
            v-model="withdrawalPayoutRequestForm.transactionNo"
            :max-length="128"
            placeholder="银行 / 微信 / 支付宝流水号，同一流水号只能登记一次"
          />
        </a-form-item>
        <a-typography-text type="secondary">
          提交后提现单进入打款执行（待确认到账），打款金额须等于实际到账额；
          随后在打款记录里确认成功或标记失败。
        </a-typography-text>
      </a-form>
    </a-modal>

    <!-- 确认打款成功：回填完税凭证，提现单置为已打款。 -->
    <a-modal
      v-model:visible="withdrawalPayoutPaidVisible"
      title="确认打款成功"
      @ok="submitWithdrawalPayoutPaid"
      @cancel="withdrawalPayoutPaidVisible = false"
    >
      <a-form :model="withdrawalPayoutPaidForm">
        <a-form-item label="打款执行单">
          <a-typography-text>{{
            withdrawalPayoutPaidForm.payoutNo
          }}</a-typography-text>
        </a-form-item>
        <a-form-item label="完税凭证号">
          <a-input
            v-model="withdrawalPayoutPaidForm.taxRef"
            :max-length="128"
            placeholder="选填"
          />
        </a-form-item>
        <a-typography-text type="secondary">
          确认成功后回填到账时间与打款人，并把提现单同步置为已打款。
        </a-typography-text>
      </a-form>
    </a-modal>

    <!-- 标记打款失败：提现单保持已通过，可重新提交打款。 -->
    <a-modal
      v-model:visible="withdrawalPayoutFailedVisible"
      title="标记打款失败"
      @ok="submitWithdrawalPayoutFailed"
      @cancel="withdrawalPayoutFailedVisible = false"
    >
      <a-form :model="withdrawalPayoutFailedForm">
        <a-form-item label="打款执行单">
          <a-typography-text>{{
            withdrawalPayoutFailedForm.payoutNo
          }}</a-typography-text>
        </a-form-item>
        <a-form-item label="失败原因" required>
          <a-textarea
            v-model="withdrawalPayoutFailedForm.reason"
            :max-length="255"
            placeholder="如：收款账号有误 / 渠道退回"
          />
        </a-form-item>
        <a-typography-text type="secondary">
          标记失败后提现单仍为已通过，可重新提交打款执行。
        </a-typography-text>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="recoveryRejectVisible"
      title="驳回陪玩追偿"
      @ok="submitRecoveryReject"
      @cancel="recoveryRejectVisible = false"
    >
      <a-form :model="recoveryRejectForm">
        <a-form-item label="驳回原因" required>
          <a-textarea
            v-model="recoveryRejectForm.reason"
            :max-length="255"
            placeholder="如：责任判定有误，实际为平台责任"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import dayjs from 'dayjs';
  import isoWeek from 'dayjs/plugin/isoWeek';
  import usePermission from '@/hooks/permission';
  import { getConfigByGroup } from '@/api/config';
  import yuanToCents from '@/utils/money';
  import { errorText } from '@/utils/error';
  import { formatYuan } from '@/utils/format';
  import { useWalletDisplay } from '../../wallet-display';
  import AdminSelect from '../../components/AdminSelect.vue';
  import { fetchSkillLevels, type SkillLevel } from '../../skill-levels';
  import {
    activateCloseRule,
    activateCommissionRule,
    activateCsCommissionRule,
    createCloseRule,
    createCommissionRule,
    createCsCommissionRule,
    createCsSettlement,
    createPayoutBatch,
    createSettlement,
    freezeOrderCommission,
    getCsCommissionSummary,
    getPayoutBatch,
    getSettlementDetail,
    listCloseRules,
    listCommissionEntries,
    listCommissionRules,
    listCsCommissionEntries,
    listCsCommissionRules,
    listPayoutBatches,
    listSettlementCycles,
    listSettlements,
    listWithdrawalPayouts,
    listWithdrawals,
    lockSettlement,
    markWithdrawalPayoutFailed,
    markWithdrawalPayoutPaid,
    approvePlayerRecovery,
    createSettlementCycle,
    executePlayerRecovery,
    listPlayerRecoveries,
    paySettlement,
    payWithdrawal,
    previewPayoutBatch,
    rejectPlayerRecovery,
    requestWithdrawalPayout,
    retryPayoutBatch,
    reviewWithdrawal,
    rollbackCloseRule,
    rollbackCommissionRule,
    rollbackCsCommissionRule,
    setSettlementCycleStatus,
    syncPayoutBatch,
    updateCloseRule,
    unfreezeOrderCommission,
    updateSettlementCycle,
  } from '../../api';
  import type {
    CloseConditionNode,
    CloseRuleScope,
    CommissionCalcMode,
    CommissionEntry,
    CommissionEntryStatus,
    CommissionRule,
    CommissionRuleInput,
    CommissionScope,
    CommissionUnitBasis,
    EsportsCloseRule,
    EsportsPlayerRecovery,
    PayoutBatch,
    PayoutBatchItem,
    PayoutBatchPreview,
    PayoutBatchStatus,
    Settlement,
    SettlementCycle,
    SettlementCyclePeriod,
    SettlementCycleScope,
    SettlementStatus,
    CsCommissionEntry,
    CsCommissionPeriod,
    CsCommissionRule,
    CsCommissionRuleInput,
    CsCommissionSummary,
    EsportsWithdrawal,
    EsportsWithdrawalPayout,
    WithdrawalChannel,
    WithdrawalPayoutStatus,
    WithdrawalStatus,
  } from '../../api';
  import CloseConditionDesigner from '../../components/close-condition-designer/index.vue';
  import {
    cloneCloseConditionTree,
    closeConditionSummary,
    isCloseConditionTreeConfigured,
    validateCloseConditionTree,
  } from '../../components/close-condition-designer/logic';

  // ISO 周（周一为一周开始），与后端 YYYY-Www 口径一致。
  dayjs.extend(isoWeek);

  const { displayName: walletName } = useWalletDisplay();

  const { hasButtonPermission } = usePermission();
  const canOperate = computed(() =>
    hasButtonPermission('esports:settlements:manage')
  );
  // 冻结 / 解冻与客服提成作废 / 重开（P0-6 / P0-8）的按钮级权限，
  // 复用后端 app.go 已声明的 PermAPI code。
  const canFreeze = computed(() =>
    hasButtonPermission('esports:settlements:freeze')
  );
  const canUnfreeze = computed(() =>
    hasButtonPermission('esports:settlements:unfreeze')
  );
  const canCsVoid = computed(() =>
    hasButtonPermission('esports:settlements:cs_void')
  );
  const canCsReopen = computed(() =>
    hasButtonPermission('esports:settlements:cs_reopen')
  );
  // 批量代发按钮级权限（后端 app.go 已声明同名 PermAPI code）。
  const canPayoutBatchPreview = computed(() =>
    hasButtonPermission('esports:settlements:payout_batches_preview')
  );
  const canPayoutBatchRead = computed(() =>
    hasButtonPermission('esports:settlements:payout_batches_read')
  );
  const canPayoutBatchCreate = computed(() =>
    hasButtonPermission('esports:settlements:payout_batches_create')
  );
  const canPayoutBatchDetail = computed(() =>
    hasButtonPermission('esports:settlements:payout_batches_detail')
  );
  const canPayoutBatchSync = computed(() =>
    hasButtonPermission('esports:settlements:payout_batches_sync')
  );
  const canPayoutBatchRetry = computed(() =>
    hasButtonPermission('esports:settlements:payout_batches_retry')
  );

  // 结算单列表 / 详情记录：后端已返回 void 状态、version 与作废留痕，
  // api.ts 的 Settlement 尚未包含，这里按真实响应放宽（不改 api.ts，由另一路补齐）。
  type SettlementRow = Omit<Settlement, 'status'> & {
    status: SettlementStatus | 'void';
    version: number;
    voided_by_admin_id: number | null;
    voided_at: string | null;
    void_reason: string;
  };

  // 结算单详情包体（GET /admin/settlements/:id）：{ settlement, entries, entry_count, detail_truncated }。
  // 详情记录与列表行结构一致，直接复用，避免后端补字段时两处漂移。
  type SettlementDetailRecord = SettlementRow;
  // 明细读模型（commissionEntryView）：在明细原始字段上补规则数值、扣减项与到手净额。
  interface SettlementDetailEntry {
    id: number;
    order_id: number | null;
    player_id: number;
    kind: string;
    rule_no: string;
    rule_version: number;
    base_cents: number;
    amount_cents: number;
    status: CommissionEntryStatus;
    settlement_id: number | null;
    frozen_at: string | null;
    frozen_reason: string;
    deducted_cents: number;
    net_cents: number;
  }
  interface SettlementDetailPayload {
    settlement: SettlementDetailRecord;
    entries: SettlementDetailEntry[];
    entry_count: number;
    detail_truncated: boolean;
  }
  // 冻结 / 解冻按订单维度调用，两种明细（列表 / 详情）都满足该最小形状。
  interface FreezableEntry {
    order_id: number | null;
    order_no?: string;
    player_id: number;
    status: CommissionEntryStatus;
    settlement_id?: number | null;
    frozen_at: string | null;
  }
  // 仅「待结算、未纳入结算单、未冻结」的明细可以冻结；已冻结的走解冻。
  const entryCanFreeze = (record: FreezableEntry) =>
    canFreeze.value &&
    record.status === 'pending_settlement' &&
    !record.frozen_at &&
    !record.settlement_id &&
    !!record.order_id;

  const money = formatYuan;
  // 提现打款错误提示：后端对「审核人自打款 / 越权」返回 403，
  // 通用 businessError 文案是「无权访问该客户或订单」，这里替换为可操作的中文提示。
  const payoutErrorText = (err: unknown, fallback: string) => {
    const { response } = err as {
      response?: { status?: number; data?: { message?: string } };
    };
    if (response?.status === 403) {
      return '无权操作：审核人不得自行登记打款，请由其他财务人员操作';
    }
    return response?.data?.message || fallback;
  };

  const activeTab = ref('rules');

  // ── 结单规则（首版） ──
  const closeRules = ref<EsportsCloseRule[]>([]);
  const closeRulesLoading = ref(false);
  const closeRuleVisible = ref(false);
  const closeRuleForm = reactive<{
    id: number;
    version: number;
    code: string;
    name: string;
    scope: CloseRuleScope;
    scopeKey: string;
    minEvidence: number;
    requireDuration: boolean;
    requireNoPendingAddon: boolean;
    requireNoOpenAftersale: boolean;
    reviewThresholdYuan: number;
    /** 通用 AND/OR 条件树；null 表示未配置，结单回落结构化条件项。 */
    conditionTree: CloseConditionNode | null;
    note: string;
  }>({
    id: 0,
    version: 0,
    code: '',
    name: '',
    scope: 'global',
    scopeKey: '',
    minEvidence: 1,
    requireDuration: true,
    requireNoPendingAddon: true,
    requireNoOpenAftersale: true,
    reviewThresholdYuan: 0,
    conditionTree: null,
    note: '',
  });
  const closeRuleScopeMap: Record<string, string> = {
    global: '全局',
    game: '按游戏分区',
    sku: '按 商品',
  };
  const closeRuleStatusMap: Record<string, string> = {
    draft: '草稿',
    active: '生效中',
    history: '历史',
  };
  const closeRuleScopeLabel = (record: EsportsCloseRule) =>
    record.scope === 'global'
      ? '全局'
      : `${closeRuleScopeMap[record.scope] || record.scope}：${
          record.scope_key
        }`;
  const closeRuleStatusLabel = (value: string) =>
    closeRuleStatusMap[value] || value;

  // 条件树：后端未配置时零值序列化为 {}，按 op / field 非空判定是否已配置。
  const ruleHasConditionTree = (record: EsportsCloseRule) =>
    isCloseConditionTreeConfigured(record.condition_tree);
  const closeRuleTreeSummary = (record: EsportsCloseRule) =>
    closeConditionSummary(record.condition_tree);
  // 设计器的起点模板：按当前结构化条件项生成等价条件树，避免从空白条件开始配置。
  const closeRuleStructuredSource = computed(() => ({
    minEvidence: closeRuleForm.minEvidence,
    requireDuration: closeRuleForm.requireDuration,
    requireNoPendingAddon: closeRuleForm.requireNoPendingAddon,
    requireNoOpenAftersale: closeRuleForm.requireNoOpenAftersale,
  }));

  async function loadCloseRules() {
    closeRulesLoading.value = true;
    try {
      closeRules.value = (await listCloseRules()).data.data || [];
    } catch {
      // 错误提示由 api 拦截器统一弹出，这里只负责复位 loading。
    } finally {
      closeRulesLoading.value = false;
    }
  }

  function resetCloseRuleForm() {
    closeRuleForm.id = 0;
    closeRuleForm.version = 0;
    closeRuleForm.code = '';
    closeRuleForm.name = '';
    closeRuleForm.scope = 'global';
    closeRuleForm.scopeKey = '';
    closeRuleForm.minEvidence = 1;
    closeRuleForm.requireDuration = true;
    closeRuleForm.requireNoPendingAddon = true;
    closeRuleForm.requireNoOpenAftersale = true;
    closeRuleForm.reviewThresholdYuan = 0;
    closeRuleForm.conditionTree = null;
    closeRuleForm.note = '';
  }

  function openCloseRuleCreate() {
    resetCloseRuleForm();
    closeRuleVisible.value = true;
  }

  // 仅草稿可编辑（后端要求 status=draft 且按 expected_version 乐观锁），生效 / 历史版本只读。
  function openCloseRuleEdit(record: EsportsCloseRule) {
    resetCloseRuleForm();
    closeRuleForm.id = record.id;
    closeRuleForm.version = record.version;
    closeRuleForm.code = record.code;
    closeRuleForm.name = record.name;
    closeRuleForm.scope = record.scope;
    closeRuleForm.scopeKey = record.scope_key;
    closeRuleForm.minEvidence = record.min_evidence;
    closeRuleForm.requireDuration = record.require_duration;
    closeRuleForm.requireNoPendingAddon = record.require_no_pending_addon;
    closeRuleForm.requireNoOpenAftersale = record.require_no_open_aftersale;
    closeRuleForm.reviewThresholdYuan = record.review_threshold_cents / 100;
    // 深拷贝条件树：设计器就地编辑只作用于副本，取消编辑不会污染列表数据。
    closeRuleForm.conditionTree = cloneCloseConditionTree(
      record.condition_tree
    );
    closeRuleForm.note = record.note;
    closeRuleVisible.value = true;
  }

  async function submitCloseRule() {
    if (!closeRuleForm.code.trim() || !closeRuleForm.name.trim()) {
      Message.warning('请填写规则编号与名称');
      return;
    }
    if (closeRuleForm.scope !== 'global' && !closeRuleForm.scopeKey.trim()) {
      Message.warning('请填写范围键');
      return;
    }
    // 结单条件树：与后端 normalizeCloseConditionTree 同口径（深度 / 节点数 / 叶子完整性），
    // 前端先拦一道，后端写入时仍会原子校验。
    const treeErrors = validateCloseConditionTree(closeRuleForm.conditionTree);
    if (treeErrors.length > 0) {
      Message.warning(`结单条件树不完整：${treeErrors[0]}`);
      return;
    }
    const payload = {
      code: closeRuleForm.code.trim(),
      name: closeRuleForm.name.trim(),
      scope: closeRuleForm.scope,
      scope_key: closeRuleForm.scopeKey.trim(),
      min_evidence: closeRuleForm.minEvidence,
      require_duration: closeRuleForm.requireDuration,
      require_no_pending_addon: closeRuleForm.requireNoPendingAddon,
      require_no_open_aftersale: closeRuleForm.requireNoOpenAftersale,
      review_threshold_cents: yuanToCents(closeRuleForm.reviewThresholdYuan),
      condition_tree: closeRuleForm.conditionTree,
      note: closeRuleForm.note.trim(),
    };
    try {
      if (closeRuleForm.id > 0) {
        await updateCloseRule(closeRuleForm.id, closeRuleForm.version, payload);
        Message.success('已保存草稿（版本递增）');
      } else {
        await createCloseRule(payload);
        Message.success('已创建结单规则（草稿）');
      }
      closeRuleVisible.value = false;
      await loadCloseRules();
    } catch (err) {
      Message.error(
        errorText(
          err,
          closeRuleForm.id > 0
            ? '保存失败：规则已变更或参数无效'
            : '创建失败：规则编号冲突或参数无效'
        )
      );
    }
  }

  async function doActivateCloseRule(record: EsportsCloseRule) {
    try {
      await activateCloseRule(record.id);
      Message.success('已生效');
      await loadCloseRules();
    } catch (err) {
      Message.error(errorText(err, '生效失败：状态已变化'));
    }
  }

  async function doRollbackCloseRule(record: EsportsCloseRule) {
    try {
      await rollbackCloseRule(record.id);
      Message.success('已回滚为新版本并生效');
      await loadCloseRules();
    } catch (err) {
      Message.error(errorText(err, '回滚失败'));
    }
  }

  // ── 结算周期（逐级覆盖） ──
  const cycles = ref<SettlementCycle[]>([]);
  const cyclesLoading = ref(false);
  const cycleVisible = ref(false);
  const cycleForm = reactive<{
    id: number;
    scope: SettlementCycleScope;
    scopeKey: string;
    period: SettlementCyclePeriod;
    intervalDays: number;
    note: string;
  }>({
    id: 0,
    scope: 'global',
    scopeKey: '',
    period: 'weekly',
    intervalDays: 7,
    note: '',
  });
  const cycleScopeMap: Record<string, string> = {
    global: '全局默认',
    game: '按游戏分区',
    level: '按陪玩等级',
    player: '按单个陪玩',
  };
  const cyclePeriodMap: Record<string, string> = {
    daily: '日结',
    weekly: '周结',
    monthly: '月结',
    custom: '自定义间隔',
  };
  const cycleScopeLabel = (record: SettlementCycle) =>
    record.scope === 'global'
      ? '全局默认'
      : `${cycleScopeMap[record.scope] || record.scope}：${record.scope_key}`;
  const cyclePeriodLabel = (record: SettlementCycle) =>
    record.period === 'custom'
      ? `每 ${record.interval_days} 天`
      : cyclePeriodMap[record.period] || record.period;

  async function loadCycles() {
    cyclesLoading.value = true;
    try {
      cycles.value = (await listSettlementCycles()).data.data || [];
    } catch {
      // 错误提示由 api 拦截器统一弹出，这里只负责复位 loading。
    } finally {
      cyclesLoading.value = false;
    }
  }

  function openCycleCreate() {
    cycleForm.id = 0;
    cycleForm.scope = 'global';
    cycleForm.scopeKey = '';
    cycleForm.period = 'weekly';
    cycleForm.intervalDays = 7;
    cycleForm.note = '';
    cycleVisible.value = true;
  }

  function openCycleEdit(record: SettlementCycle) {
    cycleForm.id = record.id;
    cycleForm.scope = record.scope;
    cycleForm.scopeKey = record.scope_key;
    cycleForm.period = record.period;
    cycleForm.intervalDays = record.interval_days || 7;
    cycleForm.note = record.note;
    cycleVisible.value = true;
  }

  async function submitCycle() {
    const key = cycleForm.scopeKey.trim();
    if (cycleForm.scope !== 'global' && !key) {
      Message.warning('请填写维度键');
      return;
    }
    if (
      cycleForm.scope === 'player' &&
      (!/^\d+$/.test(key) || Number(key) < 1)
    ) {
      Message.warning('按陪玩维度的维度键须为陪玩档案 ID');
      return;
    }
    const payload = {
      scope: cycleForm.scope,
      scope_key: cycleForm.scope === 'global' ? '' : key,
      period: cycleForm.period,
      interval_days: cycleForm.period === 'custom' ? cycleForm.intervalDays : 0,
      note: cycleForm.note.trim(),
    };
    try {
      if (cycleForm.id > 0) {
        await updateSettlementCycle(cycleForm.id, payload);
      } else {
        await createSettlementCycle(payload);
      }
      cycleVisible.value = false;
      Message.success('已保存结算周期');
      await loadCycles();
    } catch (err) {
      Message.error(
        errorText(
          err,
          '保存失败：同维度同键已存在或参数无效（自定义间隔限 1–365 天）'
        )
      );
    }
  }

  async function toggleCycle(record: SettlementCycle) {
    try {
      await setSettlementCycleStatus(record.id, !record.enabled);
      Message.success(record.enabled ? '已停用' : '已启用');
      await loadCycles();
    } catch (err) {
      Message.error(errorText(err, '启停失败：状态已变化'));
    }
  }

  // ── 分成规则 ──
  const rules = ref<CommissionRule[]>([]);
  const rulesLoading = ref(false);
  const ruleNoFilter = ref('');
  const ruleStatusMap: Record<string, string> = {
    draft: '草稿',
    scheduled: '待生效',
    active: '生效中',
    history: '历史',
  };
  const scopeMap: Record<string, string> = {
    global: '全局',
    game: '按游戏',
    level: '按陪玩等级',
    player: '按陪玩',
  };
  // 技能等级文案走系统配置（配置驱动）。
  const skillLevels = ref<SkillLevel[]>([]);
  const playerLevelMap = computed<Record<string, string>>(() =>
    Object.fromEntries(skillLevels.value.map((item) => [item.code, item.name]))
  );
  const unitBasisMap: Record<string, string> = {
    sku_quantity: '商品数量',
    promised_units: '承诺服务量',
  };
  const ruleStatusLabel = (value: string) => ruleStatusMap[value] || value;
  const scopeLabel = (scope: string, key: string) =>
    scope === 'global'
      ? scopeMap.global
      : `${scopeMap[scope] || scope}（${
          scope === 'level' ? playerLevelMap.value[key] || key : key || '-'
        }）`;
  const calcLabel = (record: CommissionRule) => {
    if (record.calc_mode === 'percent')
      return `按比例 ${(record.value_bp / 100).toFixed(2)}%`;
    if (record.calc_mode === 'fixed_per_order')
      return `每单 ${money(record.value_cents)}`;
    return `每单位 ${money(record.value_cents)}（${
      unitBasisMap[record.unit_basis] || record.unit_basis
    }）`;
  };

  async function loadRules() {
    rulesLoading.value = true;
    try {
      rules.value =
        (await listCommissionRules(ruleNoFilter.value)).data.data || [];
    } catch {
      // 错误提示由 api 拦截器统一弹出，这里只负责复位 loading。
    } finally {
      rulesLoading.value = false;
    }
  }

  const ruleCreateVisible = ref(false);
  const ruleForm = reactive<{
    ruleNo: string;
    scope: CommissionScope;
    scopeKey: string;
    calcMode: CommissionCalcMode;
    valueBp: number;
    valueYuan: number;
    unitBasis: CommissionUnitBasis;
    note: string;
  }>({
    ruleNo: '',
    scope: 'global',
    scopeKey: '',
    calcMode: 'percent',
    valueBp: 3000,
    valueYuan: 0,
    unitBasis: 'sku_quantity',
    note: '',
  });

  function openRuleCreate() {
    ruleForm.ruleNo = '';
    ruleForm.scope = 'global';
    ruleForm.scopeKey = '';
    ruleForm.calcMode = 'percent';
    ruleForm.valueBp = 3000;
    ruleForm.valueYuan = 0;
    ruleForm.unitBasis = 'sku_quantity';
    ruleForm.note = '';
    ruleCreateVisible.value = true;
  }

  async function submitRuleCreate() {
    if (ruleForm.scope !== 'global' && !ruleForm.scopeKey.trim()) {
      Message.warning('请填写范围标识');
      return;
    }
    const input: CommissionRuleInput = {
      scope: ruleForm.scope,
      scope_key: ruleForm.scope !== 'global' ? ruleForm.scopeKey.trim() : '',
      calc_mode: ruleForm.calcMode,
      value_bp: ruleForm.calcMode === 'percent' ? ruleForm.valueBp : 0,
      value_cents:
        ruleForm.calcMode === 'percent' ? 0 : yuanToCents(ruleForm.valueYuan),
      unit_basis: ruleForm.unitBasis,
      note: ruleForm.note.trim(),
    };
    if (ruleForm.ruleNo.trim()) input.rule_no = ruleForm.ruleNo.trim();
    try {
      await createCommissionRule(input);
      ruleCreateVisible.value = false;
      Message.success('已创建分成规则（草稿）');
      await loadRules();
    } catch (err) {
      Message.error(errorText(err, '创建失败：参数无效或规则编号重复'));
    }
  }

  async function activateRule(record: CommissionRule) {
    try {
      await activateCommissionRule(record.id);
      Message.success('已生效');
      await loadRules();
    } catch (err) {
      Message.error(errorText(err, '生效失败：状态已变化或同规则已有生效版本'));
    }
  }

  async function rollbackRule(record: CommissionRule) {
    try {
      await rollbackCommissionRule(record.id);
      Message.success('已回滚');
      await loadRules();
    } catch (err) {
      Message.error(errorText(err, '回滚失败，请刷新后重试'));
    }
  }

  // ── 分成明细 ──
  const entries = ref<CommissionEntry[]>([]);
  const entriesLoading = ref(false);
  const entryFilters = reactive<{
    playerId?: number;
    orderNo?: string;
    status?: string;
  }>({});
  const entryStatusOptions = [
    { value: 'pending_settlement', label: '待结算' },
    { value: 'settled', label: '已结算' },
    { value: 'void', label: '已作废' },
  ];
  const entryKindMap: Record<string, string> = {
    service: '服务分成',
    reversal: '售后退回',
  };
  const entryStatusMap: Record<string, string> = {
    pending_settlement: '待结算',
    settled: '已结算',
    void: '已作废',
  };
  const entryKindLabel = (value: string) => entryKindMap[value] || value;
  const entryStatusLabel = (value: string) => entryStatusMap[value] || value;

  async function loadEntries() {
    entriesLoading.value = true;
    try {
      entries.value =
        (
          await listCommissionEntries({
            player_id: entryFilters.playerId || undefined,
            order_no: entryFilters.orderNo?.trim() || undefined,
            status: entryFilters.status || undefined,
          })
        ).data.data || [];
    } catch {
      // 错误提示由 api 拦截器统一弹出，这里只负责复位 loading。
    } finally {
      entriesLoading.value = false;
    }
  }

  // ── 结算单 ──
  const settlements = ref<SettlementRow[]>([]);
  const settlementsLoading = ref(false);
  const settlementPlayerId = ref<number>();
  // 作废单默认不展示（后端 listSettlements 已排除 void，这里再做一层兜底过滤）。
  const showVoidSettlements = ref(false);
  const visibleSettlements = computed(() =>
    showVoidSettlements.value
      ? settlements.value
      : settlements.value.filter((item) => item.status !== 'void')
  );
  const settlementStatusMap: Record<string, string> = {
    draft: '草稿',
    locked: '已锁定',
    paid: '已打款',
    void: '已作废',
  };
  const settlementStatusLabel = (value: string) =>
    settlementStatusMap[value] || value;

  const detailVisible = ref(false);
  const detailLoading = ref(false);
  const detail = ref<SettlementDetailPayload | null>(null);
  const detailSettlementId = ref(0);
  // 明细返回条目的金额合计（仅统计本接口返回的条目，供与结算单汇总交叉核对）。
  const detailEntrySummary = computed(() => {
    const list = detail.value?.entries || [];
    return {
      amount: list.reduce((sum, item) => sum + (item.amount_cents || 0), 0),
      net: list.reduce((sum, item) => sum + (item.net_cents || 0), 0),
      frozen: list.filter((item) => !!item.frozen_at).length,
    };
  });

  async function loadSettlements() {
    settlementsLoading.value = true;
    try {
      settlements.value = ((
        await listSettlements(settlementPlayerId.value || undefined)
      ).data.data || []) as unknown as SettlementRow[];
    } catch {
      // 错误提示由 api 拦截器统一弹出，这里只负责复位 loading。
    } finally {
      settlementsLoading.value = false;
    }
  }

  // 详情接口返回 { settlement, entries, entry_count, detail_truncated }，
  // api.ts 目前按单个 Settlement 声明返回类型，这里按真实包体收敛解析。
  async function fetchSettlementDetail(id: number) {
    const payload = (await getSettlementDetail(id)).data
      .data as unknown as SettlementDetailPayload | null;
    if (!payload || !payload.settlement) return null;
    return {
      settlement: payload.settlement,
      entries: payload.entries || [],
      entry_count: payload.entry_count || 0,
      detail_truncated: !!payload.detail_truncated,
    };
  }

  async function showSettlement(id: number) {
    detailSettlementId.value = id;
    detail.value = null;
    detailVisible.value = true;
    detailLoading.value = true;
    try {
      const payload = await fetchSettlementDetail(id);
      if (!payload) {
        Message.error('结算单详情为空');
        detailVisible.value = false;
        return;
      }
      detail.value = payload;
    } catch (err) {
      detailVisible.value = false;
      Message.error(errorText(err, '无法获取结算单详情'));
    } finally {
      detailLoading.value = false;
    }
  }

  // 冻结 / 解冻后同时刷新明细、结算单列表与当前详情抽屉，避免残留旧状态。
  async function refreshAfterFreeze() {
    await Promise.all([loadEntries(), loadSettlements()]);
    if (!detailSettlementId.value) return;
    try {
      detail.value = await fetchSettlementDetail(detailSettlementId.value);
    } catch {
      // 列表刷新已给出提示，详情刷新失败不重复弹错。
    }
  }

  async function doLockSettlement(record: SettlementRow) {
    try {
      await lockSettlement(record.id);
      Message.success('已锁定结算单');
      await loadSettlements();
    } catch (err) {
      Message.error(errorText(err, '锁定失败：状态已变化或无待结算明细'));
    }
  }

  // ── 争议冻结：冻结 / 解冻按订单维度，作用于该订单的待结算分成明细。
  const freezeVisible = ref(false);
  const freezeForm = reactive({ orderId: 0, playerId: 0, reason: '' });

  function openFreeze(record: FreezableEntry) {
    if (!record.order_id) {
      Message.warning('该明细没有关联订单，无法按订单冻结');
      return;
    }
    freezeForm.orderId = record.order_id;
    freezeForm.playerId = record.player_id;
    freezeForm.reason = '';
    freezeVisible.value = true;
  }

  async function submitFreeze() {
    const reason = freezeForm.reason.trim();
    if (!reason) {
      Message.warning('请填写冻结原因');
      return;
    }
    try {
      const result = (
        await freezeOrderCommission(freezeForm.orderId, {
          player_id: freezeForm.playerId || undefined,
          reason,
        })
      ).data.data;
      freezeVisible.value = false;
      Message.success(
        result.frozen > 0
          ? `已冻结 ${result.frozen} 条待结算明细`
          : '该订单没有可冻结的待结算明细'
      );
      await refreshAfterFreeze();
    } catch (err) {
      Message.error(errorText(err, '冻结失败：明细已结算或状态已变化'));
    }
  }

  const unfreezeVisible = ref(false);
  const unfreezeOrderId = ref(0);
  const unfreezeOrderNo = ref('');

  function openUnfreeze(record: FreezableEntry) {
    if (!record.order_id) {
      Message.warning('该明细没有关联订单，无法按订单解冻');
      return;
    }
    unfreezeOrderId.value = record.order_id;
    unfreezeOrderNo.value = record.order_no || '';
    unfreezeVisible.value = true;
  }

  async function submitUnfreeze() {
    try {
      const result = (await unfreezeOrderCommission(unfreezeOrderId.value)).data
        .data;
      unfreezeVisible.value = false;
      Message.success(
        result.unfrozen > 0
          ? `已解冻 ${result.unfrozen} 条明细`
          : '该订单没有被冻结的明细'
      );
      await refreshAfterFreeze();
    } catch (err) {
      Message.error(errorText(err, '解冻失败：状态已变化'));
    }
  }

  // ── 客服提成结算单作废 / 重开（P0-6 / P0-8） ──
  const csVoidable = (record: SettlementRow) =>
    canCsVoid.value &&
    record.owner_type === 'cs' &&
    (record.status === 'draft' || record.status === 'locked');
  const csReopenable = (record: SettlementRow) =>
    canCsReopen.value && record.owner_type === 'cs' && record.status === 'void';

  const csVoidVisible = ref(false);
  const csVoidForm = reactive({
    settlementId: 0,
    settlementNo: '',
    reason: '',
  });

  function openCsVoid(record: SettlementRow) {
    csVoidForm.settlementId = record.id;
    csVoidForm.settlementNo = record.settlement_no;
    csVoidForm.reason = '';
    csVoidVisible.value = true;
  }

  async function submitCsVoid() {
    const reason = csVoidForm.reason.trim();
    if (!reason) {
      Message.warning('请填写作废原因');
      return;
    }
    // TODO(api.ts 待补封装)：voidCsSettlement(id: number, reason: string)
    //   路由：POST /api/v1/esports/admin/cs-settlements/{id}/void
    //   入参：{ reason: string }（必填，≤120 字）
    //   返回：{ settlement_id, settlement_no, owner_type, owner_id, period_start,
    //           period_end, net_cents, entry_count, released_count, operator_id,
    //           reason, voided_at, version }
    // 封装补齐后把下面这行替换为：
    //   await voidCsSettlement(csVoidForm.settlementId, reason);
    // 并保留成功提示与列表刷新。
    csVoidVisible.value = false;
    Message.warning(
      '作废接口尚未在 api.ts 封装（voidCsSettlement），已保留确认与原因校验，补齐封装后即可提交'
    );
  }

  const csReopenVisible = ref(false);
  const csReopenForm = reactive({
    settlementNo: '',
    adminId: 0,
    periodStart: '',
    periodEnd: '',
    reason: '',
  });

  function openCsReopen(record: SettlementRow) {
    csReopenForm.settlementNo = record.settlement_no;
    csReopenForm.adminId = record.owner_id;
    csReopenForm.periodStart = record.period_start;
    csReopenForm.periodEnd = record.period_end;
    csReopenForm.reason = '';
    csReopenVisible.value = true;
  }

  async function submitCsReopen() {
    const reason = csReopenForm.reason.trim();
    if (!reason) {
      Message.warning('请填写重开原因');
      return;
    }
    // TODO(api.ts 待补封装)：reopenCsSettlement(input)
    //   路由：POST /api/v1/esports/admin/cs-settlements/reopen
    //   入参：{ admin_id: number, period_start: string(RFC3339), period_end: string(RFC3339),
    //           reason: string }（reason 必填，≤120 字）
    //   返回：Settlement（新生成的草稿单）
    // 封装补齐后把下面这行替换为：
    //   await reopenCsSettlement({
    //     admin_id: csReopenForm.adminId,
    //     period_start: csReopenForm.periodStart,
    //     period_end: csReopenForm.periodEnd,
    //     reason,
    //   });
    csReopenVisible.value = false;
    Message.warning(
      '重开接口尚未在 api.ts 封装（reopenCsSettlement），已保留确认与原因校验，补齐封装后即可提交'
    );
  }

  const settlementCreateVisible = ref(false);
  const settlementForm = reactive<{
    playerId: number;
    periodStart?: string;
    periodEnd?: string;
  }>({ playerId: 1 });
  const toIso = (value?: string) =>
    value ? new Date(value).toISOString() : '';

  function openSettlementCreate() {
    settlementForm.playerId = settlementPlayerId.value || 1;
    settlementForm.periodStart = undefined;
    settlementForm.periodEnd = undefined;
    settlementCreateVisible.value = true;
  }

  async function submitSettlementCreate() {
    if (
      settlementForm.playerId < 1 ||
      !settlementForm.periodStart ||
      !settlementForm.periodEnd
    ) {
      Message.warning('请填写陪玩 ID 与结算周期');
      return;
    }
    try {
      await createSettlement({
        player_id: settlementForm.playerId,
        period_start: toIso(settlementForm.periodStart),
        period_end: toIso(settlementForm.periodEnd),
      });
      settlementCreateVisible.value = false;
      Message.success('已生成结算单');
      await loadSettlements();
    } catch (err) {
      Message.error(errorText(err, '生成失败：该周期没有待结算明细'));
    }
  }

  // ── 客服提成规则 ──
  const csRules = ref<CsCommissionRule[]>([]);
  const csRulesLoading = ref(false);
  const csRuleNoFilter = ref('');
  const csBaseModeMap: Record<string, string> = {
    order_amount: '报单金额',
    order_contribution: '订单贡献',
    order_count: '单量',
  };
  const csPeriodMap: Record<string, string> = {
    daily: '日结',
    weekly: '周结',
    monthly: '月结',
  };
  const csBaseModeLabel = (value: string) => csBaseModeMap[value] || value;
  const csPeriodLabel = (value: string) => csPeriodMap[value] || value;
  const csCalcText = (record: CsCommissionRule) => {
    if (record.calc_mode === 'fixed_per_order') {
      return `每单 ${(record.value_cents / 100).toFixed(2)} 元`;
    }
    const tiers = record.tiers || [];
    if (tiers.length) {
      return `阶梯 ${tiers
        .map(
          (tier) => `${tier.threshold_base_cents / 100}元/${tier.value_bp}bp`
        )
        .join('、')}`;
    }
    return `${record.value_bp}bp`;
  };
  const csEntryCalcText = (record: CsCommissionEntry) => {
    if (record.calc_mode === 'fixed_per_order') return '每单固定额';
    const bp = record.matched_tier_bp || 0;
    return bp > 0 ? `阶梯 ${bp}bp` : '按比例';
  };

  async function loadCsRules() {
    csRulesLoading.value = true;
    try {
      csRules.value =
        (await listCsCommissionRules(csRuleNoFilter.value)).data.data || [];
    } catch {
      // 错误提示由 api 拦截器统一弹出，这里只负责复位 loading。
    } finally {
      csRulesLoading.value = false;
    }
  }

  async function doActivateCsRule(record: CsCommissionRule) {
    try {
      await activateCsCommissionRule(record.id);
      Message.success('已生效');
      await loadCsRules();
    } catch (err) {
      Message.error(errorText(err, '生效失败：仅草稿版本可生效'));
    }
  }

  async function doRollbackCsRule(record: CsCommissionRule) {
    try {
      await rollbackCsCommissionRule(record.id);
      Message.success('已按该版本生成新的生效版本');
      await loadCsRules();
    } catch (err) {
      Message.error(errorText(err, '回滚失败，请稍后重试'));
    }
  }

  const csRuleCreateVisible = ref(false);
  const csRuleForm = reactive<{
    ruleNo: string;
    scope: 'global' | 'admin';
    scopeKey?: number;
    baseMode: 'order_amount' | 'order_contribution' | 'order_count';
    calcMode: 'percent' | 'fixed_per_order';
    includeGifts: boolean;
    valueBp: number;
    valueYuan: number;
    period: CsCommissionPeriod;
    tiers: { thresholdBaseCents: number; valueBp: number }[];
    note: string;
  }>({
    ruleNo: '',
    scope: 'global',
    baseMode: 'order_amount',
    calcMode: 'percent',
    includeGifts: false,
    valueBp: 500,
    valueYuan: 0,
    period: 'monthly',
    tiers: [],
    note: '',
  });

  function openCsRuleCreate() {
    csRuleForm.ruleNo = '';
    csRuleForm.scope = 'global';
    csRuleForm.scopeKey = undefined;
    csRuleForm.baseMode = 'order_amount';
    csRuleForm.calcMode = 'percent';
    csRuleForm.includeGifts = false;
    csRuleForm.valueBp = 500;
    csRuleForm.valueYuan = 0;
    csRuleForm.period = 'monthly';
    csRuleForm.tiers = [];
    csRuleForm.note = '';
    csRuleCreateVisible.value = true;
  }

  function addCsRuleTier() {
    csRuleForm.tiers.push({ thresholdBaseCents: 0, valueBp: 0 });
  }

  // 阶梯阈值表单按元录入，落库仍以分保存
  function onTierThresholdChange(
    tier: { thresholdBaseCents: number },
    value: unknown
  ) {
    tier.thresholdBaseCents =
      typeof value === 'number' ? yuanToCents(value) : 0;
  }

  function csRuleIncomplete() {
    if (csRuleForm.scope === 'admin' && !csRuleForm.scopeKey) return true;
    if (csRuleForm.calcMode === 'fixed_per_order') {
      return csRuleForm.valueYuan <= 0;
    }
    // 无阶梯时必须给出兜底比例。
    return csRuleForm.valueBp <= 0 && csRuleForm.tiers.length === 0;
  }

  async function submitCsRuleCreate() {
    const percent = csRuleForm.calcMode === 'percent';
    // 单量基数无法按比例计价，提交前拦住这个组合。
    if (percent && csRuleForm.baseMode === 'order_count') {
      Message.warning('单量基数只支持「每单固定额」');
      return;
    }
    if (csRuleIncomplete()) {
      Message.warning('请填写完整的规则配置');
      return;
    }
    const input: CsCommissionRuleInput = {
      rule_no: csRuleForm.ruleNo || undefined,
      scope: csRuleForm.scope,
      scope_key:
        csRuleForm.scope === 'admin' && csRuleForm.scopeKey
          ? String(csRuleForm.scopeKey)
          : undefined,
      base_mode: csRuleForm.baseMode,
      calc_mode: csRuleForm.calcMode,
      include_gifts: csRuleForm.includeGifts,
      value_bp: percent ? csRuleForm.valueBp : 0,
      value_cents: percent ? 0 : yuanToCents(csRuleForm.valueYuan),
      tiers: csRuleForm.tiers.map((tier) => ({
        threshold_base_cents: tier.thresholdBaseCents,
        value_bp: tier.valueBp,
      })),
      period: csRuleForm.period,
      note: csRuleForm.note,
    };
    try {
      await createCsCommissionRule(input);
      csRuleCreateVisible.value = false;
      Message.success('已创建规则（草稿），点「生效」后开始计提');
      await loadCsRules();
    } catch (err) {
      Message.error(errorText(err, '创建失败：请检查阶梯与必填项'));
    }
  }

  // ── 客服提成明细与概览 ──
  const csEntries = ref<CsCommissionEntry[]>([]);
  const csEntriesLoading = ref(false);
  const csSummary = ref<CsCommissionSummary | null>(null);
  const csSummaryLoading = ref(false);
  const csEntryFilters = reactive<{
    adminId?: number;
    orderNo?: string;
    status?: string;
  }>({});

  async function loadCsEntries() {
    csEntriesLoading.value = true;
    try {
      csEntries.value =
        (
          await listCsCommissionEntries({
            admin_id: csEntryFilters.adminId || undefined,
            order_no: csEntryFilters.orderNo?.trim() || undefined,
            status: csEntryFilters.status || undefined,
          })
        ).data.data || [];
    } catch {
      // 错误提示由 api 拦截器统一弹出，这里只负责复位 loading。
    } finally {
      csEntriesLoading.value = false;
    }
  }

  async function loadCsSummary() {
    csSummaryLoading.value = true;
    try {
      csSummary.value = (await getCsCommissionSummary()).data.data || null;
    } catch {
      // 错误提示由 api 拦截器统一弹出，这里只负责复位 loading。
    } finally {
      csSummaryLoading.value = false;
    }
  }

  // ── 客服提成结算单与发放 ──
  const csSettlementVisible = ref(false);
  const csSettlementForm = reactive<{
    adminId: number;
    periodStart?: string;
    periodEnd?: string;
  }>({ adminId: 1 });

  function openCsSettlementCreate() {
    csSettlementForm.adminId = csEntryFilters.adminId || 1;
    csSettlementForm.periodStart = undefined;
    csSettlementForm.periodEnd = undefined;
    csSettlementVisible.value = true;
  }

  async function submitCsSettlementCreate() {
    if (
      csSettlementForm.adminId < 1 ||
      !csSettlementForm.periodStart ||
      !csSettlementForm.periodEnd
    ) {
      Message.warning('请填写客服 ID 与结算周期');
      return;
    }
    try {
      await createCsSettlement({
        admin_id: csSettlementForm.adminId,
        period_start: toIso(csSettlementForm.periodStart),
        period_end: toIso(csSettlementForm.periodEnd),
      });
      csSettlementVisible.value = false;
      Message.success('已生成客服提成结算单');
      await loadSettlements();
    } catch (err) {
      Message.error(errorText(err, '生成失败：该周期没有待结算提成'));
    }
  }

  const payoutVisible = ref(false);
  const payoutForm = reactive({
    settlementId: 0,
    settlementNo: '',
    payoutRef: '',
  });

  function openPayout(record: SettlementRow) {
    payoutForm.settlementId = record.id;
    payoutForm.settlementNo = record.settlement_no;
    payoutForm.payoutRef = '';
    payoutVisible.value = true;
  }

  async function submitPayout() {
    if (!payoutForm.payoutRef) {
      Message.warning('请填写外部打款凭证号');
      return;
    }
    try {
      await paySettlement(payoutForm.settlementId, payoutForm.payoutRef);
      payoutVisible.value = false;
      Message.success('已登记发放');
      await loadSettlements();
    } catch (err) {
      Message.error(errorText(err, '登记失败：请先锁定结算单'));
    }
  }

  // ── 提现审核 ──
  const withdrawals = ref<EsportsWithdrawal[]>([]);
  const withdrawalsLoading = ref(false);
  const withdrawalFilters = reactive<{
    playerId?: number;
    status?: WithdrawalStatus;
  }>({});
  const withdrawalStatusOptions: { value: WithdrawalStatus; label: string }[] =
    [
      { value: 'pending_review', label: '待审核' },
      { value: 'approved', label: '已通过待打款' },
      { value: 'paid', label: '已打款' },
      { value: 'rejected', label: '已驳回' },
    ];
  const withdrawalChannelMap: Record<WithdrawalChannel, string> = {
    bank_card: '银行卡',
    wechat: '微信',
    alipay: '支付宝',
  };
  const withdrawalStatusLabel = (value: WithdrawalStatus) =>
    withdrawalStatusOptions.find((option) => option.value === value)?.label ||
    value;
  const withdrawalChannelLabel = (value: WithdrawalChannel) =>
    withdrawalChannelMap[value] || value;
  const withdrawalStatusColor = (value: WithdrawalStatus) => {
    switch (value) {
      case 'pending_review':
        return 'orangered';
      case 'approved':
        return 'arcoblue';
      case 'paid':
        return 'green';
      default:
        return 'gray';
    }
  };

  async function loadWithdrawals() {
    withdrawalsLoading.value = true;
    try {
      withdrawals.value =
        (
          await listWithdrawals({
            player_id: withdrawalFilters.playerId || undefined,
            status: withdrawalFilters.status || undefined,
          })
        ).data.data || [];
    } catch {
      // 错误提示由 api 拦截器统一弹出，这里只负责复位 loading。
    } finally {
      withdrawalsLoading.value = false;
    }
  }

  async function doReviewWithdrawal(
    record: EsportsWithdrawal,
    approve: boolean
  ) {
    try {
      await reviewWithdrawal(record.id, approve);
      Message.success(approve ? '已通过提现审核' : '已驳回提现');
      await loadWithdrawals();
    } catch (err) {
      Message.error(errorText(err, '审核失败：状态已变化'));
    }
  }

  const withdrawalRejectVisible = ref(false);
  const withdrawalRejectForm = reactive({
    id: 0,
    withdrawalNo: '',
    reason: '',
  });

  function openWithdrawalReject(record: EsportsWithdrawal) {
    withdrawalRejectForm.id = record.id;
    withdrawalRejectForm.withdrawalNo = record.withdrawal_no;
    withdrawalRejectForm.reason = '';
    withdrawalRejectVisible.value = true;
  }

  async function submitWithdrawalReject() {
    if (!withdrawalRejectForm.reason) {
      Message.warning('请填写驳回原因');
      return;
    }
    try {
      await reviewWithdrawal(
        withdrawalRejectForm.id,
        false,
        withdrawalRejectForm.reason
      );
      withdrawalRejectVisible.value = false;
      Message.success(`已驳回，申请金额已退回${walletName('player_catfood')}`);
      await loadWithdrawals();
    } catch (err) {
      Message.error(errorText(err, '驳回失败：状态已变化'));
    }
  }

  const withdrawalPayVisible = ref(false);
  const withdrawalPayForm = reactive({
    id: 0,
    withdrawalNo: '',
    payoutRef: '',
    taxRef: '',
  });

  function openWithdrawalPay(record: EsportsWithdrawal) {
    withdrawalPayForm.id = record.id;
    withdrawalPayForm.withdrawalNo = record.withdrawal_no;
    withdrawalPayForm.payoutRef = '';
    withdrawalPayForm.taxRef = '';
    withdrawalPayVisible.value = true;
  }

  async function submitWithdrawalPay() {
    if (!withdrawalPayForm.payoutRef) {
      Message.warning('请填写外部打款凭证号');
      return;
    }
    try {
      await payWithdrawal(
        withdrawalPayForm.id,
        withdrawalPayForm.payoutRef,
        withdrawalPayForm.taxRef
      );
      withdrawalPayVisible.value = false;
      Message.success('已登记打款');
      await loadWithdrawals();
    } catch (err) {
      Message.error(errorText(err, '登记失败：请先通过审核'));
    }
  }

  // ── 提现打款执行状态机（补全） ──
  const withdrawalPayoutStatusMap: Record<WithdrawalPayoutStatus, string> = {
    pay_requested: '待确认到账',
    paid: '已打款',
    pay_failed: '打款失败',
  };
  const withdrawalPayoutStatusLabel = (value: WithdrawalPayoutStatus) =>
    withdrawalPayoutStatusMap[value] || value;
  const withdrawalPayoutStatusColor = (value: WithdrawalPayoutStatus) => {
    if (value === 'paid') return 'green';
    if (value === 'pay_failed') return 'red';
    return 'orange';
  };

  // 打款记录缓存（按提现单 ID）：用于列表「打款执行」列与最新记录判定。
  const payoutCache = ref<Record<number, EsportsWithdrawalPayout[]>>({});
  const latestPayout = (withdrawalId: number) =>
    payoutCache.value[withdrawalId]?.[0];

  // 提现单列表展示的打款执行状态：未加载记录时回落到提现单状态。
  const payoutDisplay = (record: EsportsWithdrawal) => {
    const latest = latestPayout(record.id);
    if (latest) {
      return {
        label: withdrawalPayoutStatusLabel(latest.status),
        color: withdrawalPayoutStatusColor(latest.status),
      };
    }
    if (record.status === 'approved') {
      return { label: '待提交打款', color: 'orange' };
    }
    if (record.status === 'paid') {
      return { label: '已打款', color: 'green' };
    }
    return { label: '-', color: 'gray' };
  };

  async function fetchWithdrawalPayouts(withdrawalId: number) {
    const items = (await listWithdrawalPayouts(withdrawalId)).data.data || [];
    payoutCache.value = { ...payoutCache.value, [withdrawalId]: items };
    return items;
  }

  const withdrawalPayouts = ref<EsportsWithdrawalPayout[]>([]);
  const withdrawalPayoutsLoading = ref(false);
  const withdrawalPayoutsVisible = ref(false);
  const withdrawalPayoutsTarget = ref<EsportsWithdrawal | null>(null);

  async function openWithdrawalPayouts(record: EsportsWithdrawal) {
    withdrawalPayoutsTarget.value = record;
    withdrawalPayouts.value = payoutCache.value[record.id] || [];
    withdrawalPayoutsVisible.value = true;
    withdrawalPayoutsLoading.value = true;
    try {
      withdrawalPayouts.value = await fetchWithdrawalPayouts(record.id);
    } catch (err) {
      Message.error(errorText(err, '加载打款记录失败，请稍后重试'));
    } finally {
      withdrawalPayoutsLoading.value = false;
    }
  }

  async function reloadWithdrawalPayouts() {
    const target = withdrawalPayoutsTarget.value;
    if (!target) return;
    withdrawalPayoutsLoading.value = true;
    try {
      withdrawalPayouts.value = await fetchWithdrawalPayouts(target.id);
    } catch (err) {
      Message.error(errorText(err, '加载打款记录失败，请稍后重试'));
    } finally {
      withdrawalPayoutsLoading.value = false;
    }
  }

  // 提交 / 确认 / 失败后同时刷新提现单与当前打款记录抽屉。
  async function refreshAfterPayoutAction() {
    await loadWithdrawals();
    const target = withdrawalPayoutsTarget.value;
    if (!target) return;
    try {
      withdrawalPayouts.value = await fetchWithdrawalPayouts(target.id);
    } catch {
      // 列表刷新已给出提示，抽屉刷新失败不再重复弹错。
    }
  }

  const withdrawalPayoutRequestVisible = ref(false);
  const withdrawalPayoutRequestForm = reactive<{
    id: number;
    withdrawalNo: string;
    channel: WithdrawalChannel;
    transactionNo: string;
    amountCents: number;
  }>({
    id: 0,
    withdrawalNo: '',
    channel: 'bank_card',
    transactionNo: '',
    amountCents: 0,
  });

  function openWithdrawalPayoutRequest(record: EsportsWithdrawal) {
    withdrawalPayoutRequestForm.id = record.id;
    withdrawalPayoutRequestForm.withdrawalNo = record.withdrawal_no;
    withdrawalPayoutRequestForm.channel = record.channel;
    withdrawalPayoutRequestForm.transactionNo = '';
    // 后端要求打款金额等于实际到账额，直接带出并只读展示。
    withdrawalPayoutRequestForm.amountCents = record.net_cents;
    withdrawalPayoutRequestVisible.value = true;
  }

  async function submitWithdrawalPayoutRequest() {
    const transactionNo = withdrawalPayoutRequestForm.transactionNo.trim();
    if (!transactionNo) {
      Message.warning('请填写外部打款凭证号');
      return;
    }
    try {
      const payout = (
        await requestWithdrawalPayout(withdrawalPayoutRequestForm.id, {
          channel: withdrawalPayoutRequestForm.channel,
          transaction_no: transactionNo,
          amount_cents: withdrawalPayoutRequestForm.amountCents,
        })
      ).data.data;
      withdrawalPayoutRequestVisible.value = false;
      Message.success('已提交打款执行，请确认到账后标记成功');
      await loadWithdrawals();
      const target =
        withdrawals.value.find(
          (item) => item.id === withdrawalPayoutRequestForm.id
        ) || null;
      if (target) {
        await openWithdrawalPayouts(target);
      } else if (payout) {
        await fetchWithdrawalPayouts(payout.withdrawal_id);
      }
    } catch (err) {
      Message.error(
        payoutErrorText(
          err,
          '提交打款失败：提现单须为已通过，且打款金额须等于实际到账额'
        )
      );
    }
  }

  const withdrawalPayoutPaidVisible = ref(false);
  const withdrawalPayoutPaidForm = reactive({
    payoutId: 0,
    payoutNo: '',
    taxRef: '',
  });

  function openWithdrawalPayoutPaid(payout: EsportsWithdrawalPayout) {
    withdrawalPayoutPaidForm.payoutId = payout.id;
    withdrawalPayoutPaidForm.payoutNo = payout.payout_no;
    withdrawalPayoutPaidForm.taxRef = payout.tax_ref || '';
    withdrawalPayoutPaidVisible.value = true;
  }

  async function submitWithdrawalPayoutPaid() {
    try {
      await markWithdrawalPayoutPaid(
        withdrawalPayoutPaidForm.payoutId,
        withdrawalPayoutPaidForm.taxRef.trim()
      );
      withdrawalPayoutPaidVisible.value = false;
      Message.success('已确认打款成功，提现单已置为已打款');
      await refreshAfterPayoutAction();
    } catch (err) {
      Message.error(payoutErrorText(err, '确认失败：打款执行单状态已变化'));
    }
  }

  const withdrawalPayoutFailedVisible = ref(false);
  const withdrawalPayoutFailedForm = reactive({
    payoutId: 0,
    payoutNo: '',
    reason: '',
  });

  function openWithdrawalPayoutFailed(payout: EsportsWithdrawalPayout) {
    withdrawalPayoutFailedForm.payoutId = payout.id;
    withdrawalPayoutFailedForm.payoutNo = payout.payout_no;
    withdrawalPayoutFailedForm.reason = '';
    withdrawalPayoutFailedVisible.value = true;
  }

  async function submitWithdrawalPayoutFailed() {
    const reason = withdrawalPayoutFailedForm.reason.trim();
    if (!reason) {
      Message.warning('请填写打款失败原因');
      return;
    }
    try {
      await markWithdrawalPayoutFailed(
        withdrawalPayoutFailedForm.payoutId,
        reason
      );
      withdrawalPayoutFailedVisible.value = false;
      Message.success('已标记打款失败，可重新提交打款');
      await refreshAfterPayoutAction();
    } catch (err) {
      Message.error(payoutErrorText(err, '标记失败：打款执行单状态已变化'));
    }
  }

  // ── 陪玩追偿 ──
  const recoveries = ref<EsportsPlayerRecovery[]>([]);
  const recoveriesLoading = ref(false);
  const recoveryFilters = reactive<{ playerId?: number; status?: string }>({
    playerId: undefined,
    status: undefined,
  });
  const recoveryRejectVisible = ref(false);
  const recoveryRejectTarget = ref<EsportsPlayerRecovery | null>(null);
  const recoveryRejectForm = reactive({ reason: '' });
  const recoveryStatusMap: Record<string, string> = {
    pending: '待审批',
    approved: '待扣回',
    recovered: '已扣回',
    rejected: '已驳回',
  };
  const recoveryStatusLabel = (value: string) =>
    recoveryStatusMap[value] || value;

  async function loadRecoveries() {
    recoveriesLoading.value = true;
    try {
      recoveries.value =
        (
          await listPlayerRecoveries({
            player_id: recoveryFilters.playerId || undefined,
            status: recoveryFilters.status || undefined,
          })
        ).data.data || [];
    } catch {
      // 错误提示由 api 拦截器统一弹出，这里只负责复位 loading。
    } finally {
      recoveriesLoading.value = false;
    }
  }

  async function doApproveRecovery(record: EsportsPlayerRecovery) {
    try {
      await approvePlayerRecovery(record.id);
      Message.success('已审批通过，待执行扣回');
      await loadRecoveries();
    } catch (err) {
      Message.error(errorText(err, '审批失败：不得自审或状态已变化'));
    }
  }

  function openRecoveryReject(record: EsportsPlayerRecovery) {
    recoveryRejectTarget.value = record;
    recoveryRejectForm.reason = '';
    recoveryRejectVisible.value = true;
  }

  async function submitRecoveryReject() {
    const target = recoveryRejectTarget.value;
    if (!target) return;
    if (!recoveryRejectForm.reason.trim()) {
      Message.warning('请填写驳回原因');
      return;
    }
    try {
      await rejectPlayerRecovery(target.id, recoveryRejectForm.reason.trim());
      recoveryRejectVisible.value = false;
      Message.success('已驳回');
      await loadRecoveries();
    } catch (err) {
      Message.error(errorText(err, '驳回失败：不得自审或状态已变化'));
    }
  }

  async function doExecuteRecovery(record: EsportsPlayerRecovery) {
    try {
      await executePlayerRecovery(record.id);
      Message.success(`已从陪玩${walletName('player_catfood')}扣回`);
      await loadRecoveries();
    } catch (err) {
      Message.error(
        errorText(
          err,
          `执行失败：${walletName('player_catfood')}余额不足或状态已变化`
        )
      );
    }
  }

  // ── 批量代发（云账户） ──
  // 周选择固定 YYYY-Www（ISO 周），与后端 payoutWeekWindow 口径一致；近 8 周足够覆盖补发场景。
  const PAYOUT_BATCH_WEEK_FORMAT = 'GGGG-[W]WW';
  const payoutBatchWeek = ref(dayjs().format(PAYOUT_BATCH_WEEK_FORMAT));
  const payoutBatchWeekOptions = computed(() =>
    Array.from({ length: 8 }, (_, index) => {
      const day = dayjs().subtract(index, 'week');
      const value = day.format(PAYOUT_BATCH_WEEK_FORMAT);
      return {
        label: `${value}（${day.startOf('isoWeek').format('MM-DD')} 起）`,
        value,
      };
    })
  );
  const payoutBatchPreview = ref<PayoutBatchPreview | null>(null);
  const payoutBatchPreviewLoading = ref(false);
  // 未启用 / 配置不完整时后端返回 503，前端同时禁用提交入口。
  const payoutBatchDisabled = ref(false);
  const payoutBatchError = ref('');
  const payoutBatchSubmitting = ref(false);

  const payoutBatchStatusOptions: {
    label: string;
    value: PayoutBatchStatus;
  }[] = [
    { label: '提交中', value: 'submitting' },
    { label: '已提交', value: 'submitted' },
    { label: '部分成功', value: 'partial' },
    { label: '已结清', value: 'settled' },
    { label: '失败', value: 'failed' },
  ];
  const payoutBatchStatusLabel = (value: PayoutBatchStatus) =>
    payoutBatchStatusOptions.find((option) => option.value === value)?.label ||
    value;
  const payoutBatchStatusColor = (value: PayoutBatchStatus) => {
    switch (value) {
      case 'submitting':
        return 'arcoblue';
      case 'submitted':
        return 'blue';
      case 'partial':
        return 'orange';
      case 'settled':
        return 'green';
      default:
        return 'red';
    }
  };
  const PAYOUT_ACCOUNT_TYPE_LABELS: Record<string, string> = {
    bank_card: '银行卡',
    alipay: '支付宝',
  };
  const accountTypeLabel = (value: string) =>
    PAYOUT_ACCOUNT_TYPE_LABELS[value] || value || '-';

  const payoutBatches = ref<PayoutBatch[]>([]);
  const payoutBatchesLoading = ref(false);
  const payoutBatchFilters = reactive<{ status?: PayoutBatchStatus }>({
    status: undefined,
  });
  const payoutBatchPage = ref(1);
  const payoutBatchPageSize = 10;
  const payoutBatchTotal = ref(0);
  // 行级同步 / 重试的加载态，避免同一批次连点重复提交。
  const payoutBatchActionId = ref(0);

  const payoutBatchDetailVisible = ref(false);
  const payoutBatchDetailLoading = ref(false);
  const payoutBatchDetailTarget = ref<PayoutBatch | null>(null);
  const payoutBatchDetailItems = ref<PayoutBatchItem[]>([]);

  const canSubmitPayoutBatch = computed(
    () =>
      canPayoutBatchCreate.value &&
      !payoutBatchDisabled.value &&
      (payoutBatchPreview.value?.ready_count || 0) > 0
  );

  // 503 或文案含「未启用 / 配置不完整」都按未启用处理。
  const payoutBatchDisabledByError = (err: unknown) => {
    const { response } = err as {
      response?: { status?: number; data?: { message?: string } };
    };
    const message = response?.data?.message || '';
    return (
      response?.status === 503 ||
      message.includes('未启用') ||
      message.includes('配置不完整')
    );
  };

  async function loadPayoutBatchPreview() {
    if (!canPayoutBatchPreview.value) {
      payoutBatchPreview.value = null;
      payoutBatchError.value = '无批量代发预览权限，请联系管理员分配权限';
      return;
    }
    payoutBatchPreviewLoading.value = true;
    payoutBatchError.value = '';
    try {
      payoutBatchPreview.value = (
        await previewPayoutBatch(payoutBatchWeek.value)
      ).data.data;
      payoutBatchDisabled.value = false;
    } catch (err) {
      const message = errorText(err, '加载代发预览失败，请稍后重试');
      payoutBatchPreview.value = null;
      payoutBatchDisabled.value = payoutBatchDisabledByError(err);
      payoutBatchError.value = payoutBatchDisabled.value
        ? `${message}。请前往「系统配置 → 云账户代发配置」开启云账户代发，并确认「陪玩打款渠道」为云账户代发。`
        : message;
    } finally {
      payoutBatchPreviewLoading.value = false;
    }
  }

  async function loadPayoutBatches() {
    if (!canPayoutBatchRead.value) return;
    payoutBatchesLoading.value = true;
    try {
      const page = (
        await listPayoutBatches({
          status: payoutBatchFilters.status || undefined,
          page: payoutBatchPage.value,
          page_size: payoutBatchPageSize,
        })
      ).data.data;
      payoutBatches.value = page?.items || [];
      payoutBatchTotal.value = page?.total || 0;
    } catch (err) {
      payoutBatches.value = [];
      payoutBatchTotal.value = 0;
      Message.error(errorText(err, '加载代发批次失败，请稍后重试'));
    } finally {
      payoutBatchesLoading.value = false;
    }
  }

  function reloadPayoutBatches() {
    payoutBatchPage.value = 1;
    loadPayoutBatches();
  }

  function changePayoutBatchPage(page: number) {
    payoutBatchPage.value = page;
    loadPayoutBatches();
  }

  async function loadPayoutBatchDetail(id: number) {
    payoutBatchDetailVisible.value = true;
    payoutBatchDetailLoading.value = true;
    payoutBatchDetailTarget.value = null;
    payoutBatchDetailItems.value = [];
    try {
      const batchDetail = (await getPayoutBatch(id)).data.data;
      payoutBatchDetailTarget.value = batchDetail.batch;
      payoutBatchDetailItems.value = batchDetail.items || [];
    } catch (err) {
      payoutBatchDetailVisible.value = false;
      Message.error(errorText(err, '加载批次明细失败，请稍后重试'));
    } finally {
      payoutBatchDetailLoading.value = false;
    }
  }

  const openPayoutBatchDetail = (record: PayoutBatch) =>
    loadPayoutBatchDetail(record.id);

  // 同步仅进行中批次可用；重试入口只对 partial / failed 开放，失败明细数在点击时核实。
  const payoutBatchCanSync = (record: PayoutBatch) =>
    ['submitting', 'submitted', 'partial'].includes(record.status);
  const payoutBatchCanRetry = (record: PayoutBatch) =>
    record.status === 'partial' || record.status === 'failed';

  async function confirmSubmitPayoutBatch() {
    const preview = payoutBatchPreview.value;
    if (!preview || !canSubmitPayoutBatch.value) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '批量代发确认',
        content: `本周将代发 ${preview.ready_count} 笔，合计 ${money(
          preview.ready_total_cents
        )}。\n确认后立即向云账户发起打款，提交后不可撤销。`,
        okText: '确认代发',
        cancelText: '取消',
        closable: false,
        maskClosable: false,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;
    payoutBatchSubmitting.value = true;
    try {
      const result = (await createPayoutBatch({ week: payoutBatchWeek.value }))
        .data.data;
      if (result.existing) {
        Message.info('该周批次已存在，已为你定位');
      } else {
        Message.success(`已向云账户发起代发：${result.batch_no}`);
      }
      payoutBatchPage.value = 1;
      await loadPayoutBatches();
      await loadPayoutBatchPreview();
      // 定位：直接展开该批次明细（同一周重复提交时也指向既有批次）。
      if (canPayoutBatchDetail.value) await loadPayoutBatchDetail(result.id);
    } catch (err) {
      Message.error(errorText(err, '提交批量代发失败，请稍后重试'));
    } finally {
      payoutBatchSubmitting.value = false;
    }
  }

  async function doSyncPayoutBatch(record: PayoutBatch) {
    payoutBatchActionId.value = record.id;
    try {
      const summary = (await syncPayoutBatch(record.id)).data.data;
      Message.success(
        `同步完成：变更 ${summary.changed_count} 笔，到账 ${summary.paid_count} 笔，失败 ${summary.failed_count} 笔，待确认 ${summary.pending_count} 笔`
      );
      await loadPayoutBatches();
      if (
        payoutBatchDetailVisible.value &&
        payoutBatchDetailTarget.value?.id === record.id
      ) {
        await loadPayoutBatchDetail(record.id);
      }
    } catch (err) {
      Message.error(errorText(err, '同步失败：请稍后重试或检查云账户配置'));
    } finally {
      payoutBatchActionId.value = 0;
    }
  }

  async function doRetryPayoutBatch(record: PayoutBatch) {
    payoutBatchActionId.value = record.id;
    try {
      // 先核对该批次确有 pay_failed 明细，避免无失败明细时发起无效重试。
      const batchDetail = (await getPayoutBatch(record.id)).data.data;
      const failedCount = (batchDetail.items || []).filter(
        (item) => item.status === 'pay_failed'
      ).length;
      if (failedCount === 0) {
        Message.warning('该批次没有可重试的失败明细');
        return;
      }
      const confirmed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: '重试失败明细',
          content: `将重试批次 ${record.batch_no} 中 ${failedCount} 笔失败明细，重新向云账户发起打款（原失败记录保留用于审计）。`,
          okText: '确认重试',
          cancelText: '取消',
          closable: false,
          maskClosable: false,
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!confirmed) return;
      const result = (await retryPayoutBatch(record.id)).data.data;
      Message.success(
        result.existing
          ? '该批次已重试过，已复用既有重试批次'
          : `已创建重试批次：${result.batch_no}`
      );
      payoutBatchPage.value = 1;
      await loadPayoutBatches();
      if (canPayoutBatchDetail.value) await loadPayoutBatchDetail(result.id);
    } catch (err) {
      Message.error(errorText(err, '重试失败：请刷新后重试'));
    } finally {
      payoutBatchActionId.value = 0;
    }
  }

  // 切换页签时按需加载对应数据（定义在各 load* 之后，避免 no-use-before-define）。
  const onTabChange = (key: string | number) => {
    if (key === 'rules') loadRules();
    else if (key === 'entries') loadEntries();
    else if (key === 'cs_rules') loadCsRules();
    else if (key === 'cs_entries') loadCsEntries();
    else if (key === 'withdrawals') loadWithdrawals();
    else if (key === 'payout_batches') {
      loadPayoutBatchPreview();
      loadPayoutBatches();
    } else if (key === 'recoveries') loadRecoveries();
    else if (key === 'settlement_cycles') loadCycles();
    else loadSettlements();
  };

  // 结算周期说明里直接显示系统配置当前值；读不到时只少这一处提示，不影响结算。
  const settlementPeriodValue = ref('');
  // 配置存的是 daily / weekly / monthly，展示转成中文；未知值原样显示不丢信息。
  const SETTLEMENT_PERIOD_LABELS: Record<string, string> = {
    daily: '日结',
    weekly: '周结',
    monthly: '月结',
  };
  const settlementPeriodText = computed(
    () =>
      SETTLEMENT_PERIOD_LABELS[settlementPeriodValue.value] ||
      settlementPeriodValue.value ||
      '-'
  );
  async function loadSettlementPeriodValue() {
    try {
      const { data } = await getConfigByGroup('esports');
      const row = (data.data || []).find(
        (item) => item.key === 'app.esports.settlement_period'
      );
      settlementPeriodValue.value = row?.value || '';
    } catch {
      // ponytail: 配置中心不可用时静默降级，页面其余数据照常加载。
      settlementPeriodValue.value = '';
    }
  }

  onMounted(() => {
    fetchSkillLevels().then((items) => {
      skillLevels.value = items;
    });
    loadSettlementPeriodValue();
    loadRules();
    loadCloseRules();
  });
</script>

<style scoped>
  .toolbar {
    margin-bottom: 16px;
  }

  .close-rule-tip {
    display: block;
    margin-bottom: 12px;
  }

  .config-value {
    color: rgb(var(--primary-6));
    font-weight: 600;
  }

  /* 条件树摘要：单行省略，完整内容由 title 悬浮展示。 */
  .close-rule-tree {
    display: inline-block;
    max-width: 210px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    vertical-align: bottom;
  }

  .close-rule-tree-none {
    color: var(--color-text-3, #86909c);
  }

  .freeze-reason {
    display: block;
    font-size: 12px;
  }

  .payout-tip {
    display: block;
    margin-top: 12px;
  }

  .detail-alert {
    margin: 12px 0;
  }

  .payout-batch-alert,
  .payout-batch-summary {
    margin-bottom: 12px;
  }

  .payout-batch-detail-table {
    margin-top: 12px;
  }

  .section-title {
    margin: 16px 0 8px;
    color: var(--color-text-3);
    font-weight: 500;
  }

  .modal-tip {
    display: block;
    margin-top: 8px;
  }
</style>
