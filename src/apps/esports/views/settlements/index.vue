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
            <a-input-number
              v-model="entryFilters.orderId"
              placeholder="订单 ID"
              :min="0"
              :style="{ width: '140px' }"
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
              <a-table-column data-index="order_id" title="订单" :width="90">
                <template #cell="{ record }">#{{ record.order_id }}</template>
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
              <a-table-column data-index="created_at" title="创建时间" />
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 客服提成规则（§12.2） -->
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

        <!-- 客服提成明细（§12.2 / §12.7） -->
        <a-tab-pane key="cs_entries" title="客服提成明细">
          <a-space class="toolbar">
            <a-input-number
              v-model="csEntryFilters.adminId"
              placeholder="客服 ID"
              :min="0"
              :style="{ width: '150px' }"
            />
            <a-input-number
              v-model="csEntryFilters.orderId"
              placeholder="订单 ID"
              :min="0"
              :style="{ width: '150px' }"
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
              <a-table-column data-index="order_id" title="订单" :width="90" />
              <a-table-column data-index="admin_id" title="客服" :width="80" />
              <a-table-column title="类型">
                <template #cell="{ record }">{{
                  record.kind === 'reversal' ? '退款冲回' : '订单提成'
                }}</template>
              </a-table-column>
              <a-table-column title="基数">
                <template #cell="{ record }">{{
                  money(record.base_cents)
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
          </a-space>
          <a-table
            :data="settlements"
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
                <template #cell="{ record }">{{
                  settlementStatusLabel(record.status)
                }}</template>
              </a-table-column>
              <a-table-column title="打款凭证">
                <template #cell="{ record }">{{
                  record.payout_ref || '-'
                }}</template>
              </a-table-column>
              <a-table-column title="操作" :width="220">
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
                    <!-- 客服提成结算不写钱包，锁定后由财务打款并登记外部凭证（§12.2）。 -->
                    <a-button
                      v-if="
                        record.status === 'locked' && record.owner_type === 'cs'
                      "
                      type="text"
                      status="success"
                      @click="openPayout(record)"
                      >登记发放</a-button
                    >
                  </template>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 提现审核（§6.3 / §12.6） -->
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
              <a-table-column title="操作" :width="180">
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
                    <a-button
                      v-else-if="record.status === 'approved'"
                      type="text"
                      status="success"
                      @click="openWithdrawalPay(record)"
                      >登记打款</a-button
                    >
                    <span v-else class="text-secondary">-</span>
                  </template>
                  <span v-else>-</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 结单规则（§3.4 首版） -->
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
            售后」做成可配置规则，按 全局 / 游戏分区 / SKU
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
              <a-table-column title="操作" :width="140">
                <template #cell="{ record }">
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
      </a-tabs>
    </a-card>

    <a-modal
      v-model:visible="closeRuleVisible"
      title="新建结单规则（§3.4）"
      @ok="submitCloseRule"
      @cancel="closeRuleVisible = false"
    >
      <a-form :model="closeRuleForm">
        <a-form-item label="规则编号" required>
          <a-input v-model="closeRuleForm.code" :max-length="48" />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model="closeRuleForm.name" :max-length="64" />
        </a-form-item>
        <a-form-item label="适用范围" required>
          <a-select v-model="closeRuleForm.scope">
            <a-option value="global">全局</a-option>
            <a-option value="game">按游戏分区</a-option>
            <a-option value="sku">按 SKU</a-option>
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
            placeholder="游戏分区名或 SKU 编号"
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
        <a-form-item label="备注">
          <a-input v-model="closeRuleForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:visible="detailVisible"
      title="结算单详情"
      :width="520"
      :footer="false"
    >
      <a-descriptions v-if="detail" :column="1" bordered>
        <a-descriptions-item label="结算单号">{{
          detail.settlement_no
        }}</a-descriptions-item>
        <a-descriptions-item label="陪玩 ID">{{
          detail.owner_id
        }}</a-descriptions-item>
        <a-descriptions-item label="结算周期"
          >{{ detail.period_start }} ~
          {{ detail.period_end }}</a-descriptions-item
        >
        <a-descriptions-item label="应结 / 调整 / 实结"
          >{{ money(detail.gross_cents) }} /
          {{ money(detail.adjustment_cents) }} /
          {{ money(detail.net_cents) }}</a-descriptions-item
        >
        <a-descriptions-item label="明细数">{{
          detail.entry_count
        }}</a-descriptions-item>
        <a-descriptions-item label="状态">{{
          settlementStatusLabel(detail.status)
        }}</a-descriptions-item>
        <a-descriptions-item label="锁定人 / 锁定时间"
          >{{ detail.locked_by_admin_id ?? '-' }} /
          {{ detail.locked_at || '-' }}</a-descriptions-item
        >
        <a-descriptions-item label="创建时间">{{
          detail.created_at
        }}</a-descriptions-item>
      </a-descriptions>
    </a-drawer>

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
            <a-option value="player">按陪玩</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="ruleForm.scope !== 'global'"
          :label="ruleForm.scope === 'game' ? '游戏标识' : '陪玩 ID'"
          required
        >
          <a-input v-model="ruleForm.scopeKey" :max-length="64" />
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
                v-model="tier.thresholdBaseCents"
                placeholder="基数阈值（分）"
                :min="1"
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
          客服提成结算不写猫粮钱包：锁定后由财务打款，并在结算单上登记外部打款凭证。
          也可由 `esports_generate_cs_settlements`
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
          驳回会把申请金额退回陪玩的猫粮账户，退回只发生一次。
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
          打款不再改动猫粮账户：申请时钱已离开猫粮，此处只登记到账凭证与时间。
        </a-typography-text>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    activateCloseRule,
    activateCommissionRule,
    activateCsCommissionRule,
    createCloseRule,
    createCommissionRule,
    createCsCommissionRule,
    createCsSettlement,
    createSettlement,
    getCsCommissionSummary,
    getSettlement,
    listCloseRules,
    listCommissionEntries,
    listCommissionRules,
    listCsCommissionEntries,
    listCsCommissionRules,
    listSettlements,
    listWithdrawals,
    lockSettlement,
    paySettlement,
    payWithdrawal,
    reviewWithdrawal,
    rollbackCloseRule,
    rollbackCommissionRule,
    rollbackCsCommissionRule,
  } from '../../api';
  import type {
    CloseRuleScope,
    CommissionCalcMode,
    CommissionEntry,
    CommissionRule,
    CommissionRuleInput,
    CommissionScope,
    CommissionUnitBasis,
    EsportsCloseRule,
    Settlement,
    CsCommissionEntry,
    CsCommissionPeriod,
    CsCommissionRule,
    CsCommissionRuleInput,
    CsCommissionSummary,
    EsportsWithdrawal,
    WithdrawalChannel,
    WithdrawalStatus,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canOperate = computed(() =>
    hasButtonPermission('esports:settlements:manage')
  );

  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  const activeTab = ref('rules');

  // ── 结单规则（§3.4 首版） ──
  const closeRules = ref<EsportsCloseRule[]>([]);
  const closeRulesLoading = ref(false);
  const closeRuleVisible = ref(false);
  const closeRuleForm = reactive<{
    code: string;
    name: string;
    scope: CloseRuleScope;
    scopeKey: string;
    minEvidence: number;
    requireDuration: boolean;
    requireNoPendingAddon: boolean;
    requireNoOpenAftersale: boolean;
    reviewThresholdYuan: number;
    note: string;
  }>({
    code: '',
    name: '',
    scope: 'global',
    scopeKey: '',
    minEvidence: 1,
    requireDuration: true,
    requireNoPendingAddon: true,
    requireNoOpenAftersale: true,
    reviewThresholdYuan: 0,
    note: '',
  });
  const closeRuleScopeMap: Record<string, string> = {
    global: '全局',
    game: '按游戏分区',
    sku: '按 SKU',
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

  async function loadCloseRules() {
    closeRulesLoading.value = true;
    try {
      closeRules.value = (await listCloseRules()).data.data || [];
    } catch {
      Message.error('加载结单规则失败，请稍后重试');
    } finally {
      closeRulesLoading.value = false;
    }
  }

  function openCloseRuleCreate() {
    closeRuleForm.code = '';
    closeRuleForm.name = '';
    closeRuleForm.scope = 'global';
    closeRuleForm.scopeKey = '';
    closeRuleForm.minEvidence = 1;
    closeRuleForm.requireDuration = true;
    closeRuleForm.requireNoPendingAddon = true;
    closeRuleForm.requireNoOpenAftersale = true;
    closeRuleForm.reviewThresholdYuan = 0;
    closeRuleForm.note = '';
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
    try {
      await createCloseRule({
        code: closeRuleForm.code.trim(),
        name: closeRuleForm.name.trim(),
        scope: closeRuleForm.scope,
        scope_key: closeRuleForm.scopeKey.trim(),
        min_evidence: closeRuleForm.minEvidence,
        require_duration: closeRuleForm.requireDuration,
        require_no_pending_addon: closeRuleForm.requireNoPendingAddon,
        require_no_open_aftersale: closeRuleForm.requireNoOpenAftersale,
        review_threshold_cents: Math.round(
          closeRuleForm.reviewThresholdYuan * 100
        ),
        note: closeRuleForm.note.trim(),
      });
      closeRuleVisible.value = false;
      Message.success('已创建结单规则（草稿）');
      await loadCloseRules();
    } catch (err) {
      Message.error(errorText(err, '创建失败：规则编号冲突或参数无效'));
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

  // ── 分成规则 ──
  const rules = ref<CommissionRule[]>([]);
  const rulesLoading = ref(false);
  const ruleNoFilter = ref('');
  const ruleStatusMap: Record<string, string> = {
    draft: '草稿',
    active: '生效中',
    history: '历史',
  };
  const scopeMap: Record<string, string> = {
    global: '全局',
    game: '按游戏',
    player: '按陪玩',
  };
  const unitBasisMap: Record<string, string> = {
    sku_quantity: '商品数量',
    promised_units: '承诺服务量',
  };
  const ruleStatusLabel = (value: string) => ruleStatusMap[value] || value;
  const scopeLabel = (scope: string, key: string) =>
    scope === 'global'
      ? scopeMap.global
      : `${scopeMap[scope] || scope}（${key || '-'}）`;
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
      Message.error('加载分成规则失败，请稍后重试');
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
        ruleForm.calcMode === 'percent'
          ? 0
          : Math.round(ruleForm.valueYuan * 100),
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
    orderId?: number;
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
            order_id: entryFilters.orderId || undefined,
            status: entryFilters.status || undefined,
          })
        ).data.data || [];
    } catch {
      Message.error('加载分成明细失败，请稍后重试');
    } finally {
      entriesLoading.value = false;
    }
  }

  // ── 结算单 ──
  const settlements = ref<Settlement[]>([]);
  const settlementsLoading = ref(false);
  const settlementPlayerId = ref<number>();
  const settlementStatusMap: Record<string, string> = {
    draft: '草稿',
    locked: '已锁定',
    paid: '已打款',
  };
  const settlementStatusLabel = (value: string) =>
    settlementStatusMap[value] || value;

  const detailVisible = ref(false);
  const detail = ref<Settlement | null>(null);

  async function loadSettlements() {
    settlementsLoading.value = true;
    try {
      settlements.value =
        (await listSettlements(settlementPlayerId.value || undefined)).data
          .data || [];
    } catch {
      Message.error('加载结算单失败，请稍后重试');
    } finally {
      settlementsLoading.value = false;
    }
  }

  async function showSettlement(id: number) {
    try {
      detail.value = (await getSettlement(id)).data.data || null;
      detailVisible.value = true;
    } catch {
      Message.error('无法获取结算单详情');
    }
  }

  async function doLockSettlement(record: Settlement) {
    try {
      await lockSettlement(record.id);
      Message.success('已锁定结算单');
      await loadSettlements();
    } catch (err) {
      Message.error(errorText(err, '锁定失败：状态已变化或无待结算明细'));
    }
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

  // ── 客服提成规则（§12.2） ──
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
      Message.error('加载客服提成规则失败，请稍后重试');
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
      value_bp: percent ? csRuleForm.valueBp : 0,
      value_cents: percent ? 0 : Math.round(csRuleForm.valueYuan * 100),
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

  // ── 客服提成明细与概览（§12.7） ──
  const csEntries = ref<CsCommissionEntry[]>([]);
  const csEntriesLoading = ref(false);
  const csSummary = ref<CsCommissionSummary | null>(null);
  const csSummaryLoading = ref(false);
  const csEntryFilters = reactive<{
    adminId?: number;
    orderId?: number;
    status?: string;
  }>({});

  async function loadCsEntries() {
    csEntriesLoading.value = true;
    try {
      csEntries.value =
        (
          await listCsCommissionEntries({
            admin_id: csEntryFilters.adminId || undefined,
            order_id: csEntryFilters.orderId || undefined,
            status: csEntryFilters.status || undefined,
          })
        ).data.data || [];
    } catch {
      Message.error('加载客服提成明细失败，请稍后重试');
    } finally {
      csEntriesLoading.value = false;
    }
  }

  async function loadCsSummary() {
    csSummaryLoading.value = true;
    try {
      csSummary.value = (await getCsCommissionSummary()).data.data || null;
    } catch {
      Message.error('加载提成概览失败，请稍后重试');
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

  function openPayout(record: Settlement) {
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

  // ── 提现审核（§6.3 / §12.6） ──
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
      Message.error('加载提现单失败，请稍后重试');
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
      Message.success('已驳回，申请金额已退回猫粮');
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

  // 切换页签时按需加载对应数据（定义在各 load* 之后，避免 no-use-before-define）。
  const onTabChange = (key: string | number) => {
    if (key === 'rules') loadRules();
    else if (key === 'entries') loadEntries();
    else if (key === 'cs_rules') loadCsRules();
    else if (key === 'cs_entries') loadCsEntries();
    else if (key === 'withdrawals') loadWithdrawals();
    else loadSettlements();
  };

  onMounted(() => {
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
</style>
