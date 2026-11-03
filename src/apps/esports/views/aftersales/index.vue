<template>
  <div class="container page-container">
    <a-tabs v-model:active-key="activeTab" type="card-gutter">
      <a-tab-pane key="tickets" title="售后单">
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
            title="售后单列表：一张售后单对应一条来源单据与一个问题类型，状态从待受理走到完成 / 驳回 / 撤回"
            :data="items"
            :loading="loading"
            row-key="id"
            :pagination="{ pageSize: 20 }"
          >
            <template #columns>
              <a-table-column data-index="after_sale_no" title="售后单号" />
              <a-table-column title="来源单据">
                <template #cell="{ record }"
                  >{{ sourceTypeLabel(record.source_type) }} #{{
                    record.source_id
                  }}</template
                >
              </a-table-column>
              <a-table-column title="类型">
                <template #cell="{ record }">{{
                  kindLabel(record.kind)
                }}</template>
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
              <a-table-column title="操作" :width="320">
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
                    <a-popconfirm
                      v-if="record.status === 'execution_failed'"
                      content="撤回后该单预占的退款额度会按原路释放，且执行失败的售后单不能在原单上重试，是否继续？"
                      @ok="withdrawExecutionFailed(record)"
                    >
                      <a-button type="text" status="warning"
                        >撤回执行失败</a-button
                      >
                    </a-popconfirm>
                    <a-tooltip
                      v-if="record.status === 'pending_customer_confirm'"
                      content="后端尚未开放 POST /admin/after-sales/:id/confirm（confirmAfterSaleByAdmin），暂不可代客确认；代客确认不是审批，不能调用审批接口"
                    >
                      <span>
                        <a-button type="text" disabled>代客确认</a-button>
                      </span>
                    </a-tooltip>
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
          :width="720"
          :footer="false"
        >
          <a-descriptions v-if="detail" :column="1" bordered>
            <a-descriptions-item label="售后单号">{{
              detail.after_sale_no
            }}</a-descriptions-item>
            <a-descriptions-item label="来源单据"
              >{{ sourceTypeLabel(detail.source_type) }} #{{ detail.source_id }}
              <template v-if="detailOrderNo">（{{ detailOrderNo }}）</template>
            </a-descriptions-item>
            <a-descriptions-item label="类型 / 来源"
              >{{ kindLabel(detail.kind) }} /
              {{ channelLabel(detail.channel) }}</a-descriptions-item
            >
            <a-descriptions-item label="状态">{{
              statusLabel(detail.status)
            }}</a-descriptions-item>
            <a-descriptions-item label="订单支付状态">
              <template v-if="paymentStatusException">
                <a-tag color="red">支付异常（渠道撤销 / 拒付）</a-tag>
                <a-typography-text type="danger">
                  后端已禁止审批预占与退款执行，请先人工处置支付异常
                </a-typography-text>
              </template>
              <span v-else>{{ orderPaymentStatusLabel }}</span>
            </a-descriptions-item>
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
              >{{ nameOrId(detail.customer_name, detail.customer_id) }} /
              {{
                nameOrId(detail.player_name, detail.player_id)
              }}</a-descriptions-item
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

          <a-divider>动作项与逐项进度</a-divider>
          <template v-if="detailActions">
            <a-space wrap class="summary">
              <a-tag>共 {{ detailActions.progress.total }} 项</a-tag>
              <a-tag color="green"
                >成功 {{ detailActions.progress.succeeded }}</a-tag
              >
              <a-tag color="red"
                >失败 {{ detailActions.progress.failed }}</a-tag
              >
              <a-tag color="gray"
                >待执行 {{ detailActions.progress.pending }}</a-tag
              >
            </a-space>
            <a-table
              title="方案动作项：多动作方案逐项执行，资金类（退款 / 补偿）与补履约类（补钟 / 换人）分别落账"
              :data="detailActions.actions"
              row-key="id"
              :pagination="false"
              size="small"
            >
              <template #columns>
                <a-table-column title="序号" :width="60">
                  <template #cell="{ record }">#{{ record.seq }}</template>
                </a-table-column>
                <a-table-column title="动作">
                  <template #cell="{ record }">{{
                    actionTypeLabel(record.action_type)
                  }}</template>
                </a-table-column>
                <a-table-column title="金额 / 参数">
                  <template #cell="{ record }">{{
                    actionDetail(record)
                  }}</template>
                </a-table-column>
                <a-table-column title="状态">
                  <template #cell="{ record }">
                    <a-tag :color="actionStatusColor(record.status)">{{
                      actionStatusLabel(record.status)
                    }}</a-tag>
                  </template>
                </a-table-column>
                <a-table-column data-index="result_summary" title="结果" />
                <a-table-column title="操作" :width="80">
                  <template #cell="{ record }">
                    <a-button
                      v-if="canExecuteAction(record)"
                      type="text"
                      size="mini"
                      :loading="actionExecuting === record.seq"
                      @click="executeActionItem(record)"
                      >执行</a-button
                    >
                    <span v-else>—</span>
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </template>
          <a-empty v-else description="该售后单无动作项（单动作方案）" />

          <a-divider>复核申请</a-divider>
          <a-space class="toolbar" wrap>
            <a-button
              v-if="canRequestReview"
              size="small"
              type="primary"
              @click="openReviewRequest"
              >发起复核</a-button
            >
            <a-button size="small" :loading="reviewLoading" @click="loadReviews"
              >刷新复核</a-button
            >
            <a-typography-text type="secondary">
              仅「已驳回 /
              已完成」的终态售后可凭新证据发起复核；结论须由非申请人且非原审批人的
              异人审查（维持原结论 / 发回重新处理）。
            </a-typography-text>
          </a-space>
          <a-table
            title="结单复核记录：已终态售后凭新证据发起，须由非申请人且非原审批人的异人审查"
            :data="reviews"
            row-key="id"
            :pagination="false"
            size="small"
          >
            <template #columns>
              <a-table-column data-index="review_no" title="复核单号" />
              <a-table-column data-index="reason" title="复核理由" />
              <a-table-column title="申请人">
                <template #cell="{ record }"
                  >#{{ record.applicant_admin_id }}</template
                >
              </a-table-column>
              <a-table-column title="状态">
                <template #cell="{ record }">
                  <a-tag :color="reviewStatusColor(record.status)">{{
                    reviewStatusLabel(record.status)
                  }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="审查人">
                <template #cell="{ record }">{{
                  record.reviewer_admin_id ?? '—'
                }}</template>
              </a-table-column>
              <a-table-column data-index="decision_note" title="结论说明" />
              <a-table-column title="操作" :width="180">
                <template #cell="{ record }">
                  <template v-if="record.status === 'pending'">
                    <a-button
                      v-if="canDecideReview"
                      type="text"
                      size="mini"
                      @click="openReviewDecision(record, 'uphold')"
                      >维持</a-button
                    >
                    <a-button
                      v-if="canDecideReview"
                      type="text"
                      size="mini"
                      status="warning"
                      @click="openReviewDecision(record, 'reopen')"
                      >发回</a-button
                    >
                    <a-button
                      v-if="canWithdrawReview"
                      type="text"
                      size="mini"
                      status="danger"
                      @click="withdrawReviewItem(record)"
                      >撤回</a-button
                    >
                  </template>
                  <span v-else>—</span>
                </template>
              </a-table-column>
            </template>
          </a-table>

          <template v-if="canViewExternalRefunds">
            <a-divider>外部退款（外部渠道退款单）</a-divider>
            <a-alert
              v-if="paymentStatusException"
              type="error"
              class="block-gap"
            >
              订单支付状态异常（渠道撤销 /
              拒付）：后端已禁止退款执行，执行请求会被原样拒绝。
            </a-alert>
            <a-space class="toolbar" wrap>
              <a-button
                size="small"
                :loading="externalRefundLoading"
                @click="loadExternalRefunds"
                >刷新外部退款</a-button
              >
              <a-button
                v-if="canRegisterExternalRefund"
                size="small"
                type="outline"
                @click="openExternalRefundRegister"
                >登记外部退款</a-button
              >
              <a-button
                v-if="canBatchRefundExecute && canBatchRefund"
                size="small"
                type="outline"
                :loading="batchExecuting"
                @click="executeBatchRefund"
                >按充值批次生成退款执行明细</a-button
              >
            </a-space>
            <a-typography-text type="secondary" class="section-tip">
              外部渠道支付（企微收款 / 商户码 /
              对公转账）且无余额核销的「退原核销款」会在售后执行时生成
              待执行的外部退款单；财务核验后在这里执行，执行时会核销售后预占的退款额度并对齐订单退款状态。
            </a-typography-text>
            <a-table
              title="外部退款单：没有余额核销的外渠道付款退款，财务核验后在这里逐单执行"
              :data="externalRefunds"
              row-key="id"
              :pagination="false"
              size="small"
              :scroll="{ x: 900 }"
            >
              <template #columns>
                <a-table-column data-index="refund_no" title="退款单号" />
                <a-table-column title="渠道">
                  <template #cell="{ record }">{{
                    payChannelText(record.channel)
                  }}</template>
                </a-table-column>
                <a-table-column data-index="transaction_no" title="流水号" />
                <a-table-column title="金额">
                  <template #cell="{ record }">{{
                    money(record.amount_cents)
                  }}</template>
                </a-table-column>
                <a-table-column title="状态">
                  <template #cell="{ record }">
                    <a-tag
                      :color="record.status === 'executed' ? 'green' : 'orange'"
                      >{{ externalRefundStatusLabel(record.status) }}</a-tag
                    >
                  </template>
                </a-table-column>
                <a-table-column title="登记人">
                  <template #cell="{ record }">{{
                    record.registered_by_admin_id ?? '—'
                  }}</template>
                </a-table-column>
                <a-table-column title="执行人 / 时间">
                  <template #cell="{ record }">
                    {{ record.executed_by_admin_id ?? '—' }} /
                    {{ record.executed_at || '—' }}
                  </template>
                </a-table-column>
                <a-table-column title="操作" :width="100">
                  <template #cell="{ record }">
                    <a-button
                      v-if="
                        record.status === 'registered' &&
                        canExecuteExternalRefund
                      "
                      type="text"
                      size="mini"
                      status="success"
                      @click="openExternalRefundExecute(record)"
                      >执行</a-button
                    >
                    <span v-else>—</span>
                  </template>
                </a-table-column>
              </template>
            </a-table>
            <a-empty
              v-if="!externalRefunds.length && !externalRefundLoading"
              description="该售后单暂无外部退款单"
            />

            <template v-if="refundExecutions.length">
              <a-divider orientation="left">批次退款执行明细</a-divider>
              <a-table
                title="批次退款执行明细：每一批对应一条财务流水，执行后核销该批次预占的退款额度"
                :data="refundExecutions"
                row-key="id"
                :pagination="false"
                size="small"
                :scroll="{ x: 900 }"
              >
                <template #columns>
                  <a-table-column data-index="execution_no" title="执行单号" />
                  <a-table-column title="批次来源">
                    <template #cell="{ record }"
                      >{{ record.batch_source_type }} #{{
                        record.batch_source_id
                      }}</template
                    >
                  </a-table-column>
                  <a-table-column title="金额">
                    <template #cell="{ record }">{{
                      money(record.amount_cents)
                    }}</template>
                  </a-table-column>
                  <a-table-column title="状态">
                    <template #cell="{ record }">
                      <a-tag
                        :color="
                          record.status === 'executed' ? 'green' : 'orange'
                        "
                        >{{
                          record.status === 'executed' ? '已打款' : '待打款'
                        }}</a-tag
                      >
                    </template>
                  </a-table-column>
                  <a-table-column data-index="finance_ref" title="财务流水号" />
                  <a-table-column title="操作" :width="120">
                    <template #cell="{ record }">
                      <a-button
                        v-if="
                          record.status === 'pending' &&
                          canMarkRechargeRefundExecuted
                        "
                        type="text"
                        size="mini"
                        status="success"
                        @click="openFinanceRef(record)"
                        >登记已打款</a-button
                      >
                      <span v-else>—</span>
                    </template>
                  </a-table-column>
                </template>
              </a-table>
            </template>
          </template>

          <template v-if="canViewMessages">
            <a-divider>沟通记录 / 补证</a-divider>
            <a-space class="toolbar" wrap>
              <a-button
                size="small"
                :loading="messageLoading"
                @click="loadMessages"
                >刷新沟通</a-button
              >
              <a-button
                v-if="canRequestEvidence"
                size="small"
                type="outline"
                @click="openEvidenceRequest"
                >提示客户补证</a-button
              >
              <a-typography-text type="secondary">
                客服侧可见内部备注（visibility=internal），客户侧只看得到「客户可见」的消息；
                客户回复带附件的沟通记录即视为已补证。
              </a-typography-text>
            </a-space>
            <a-table
              title="沟通记录：客服内部备注与客户可见消息分流展示，客户带附件的回复视为已补证"
              :data="messages"
              row-key="id"
              :pagination="false"
              size="small"
              :scroll="{ x: 800 }"
            >
              <template #columns>
                <a-table-column
                  data-index="created_at"
                  title="时间"
                  :width="180"
                />
                <a-table-column title="发送方" :width="160">
                  <template #cell="{ record }">
                    {{ messageAuthorLabel(record) }}
                  </template>
                </a-table-column>
                <a-table-column data-index="content" title="内容" />
                <a-table-column title="可见性" :width="100">
                  <template #cell="{ record }">
                    <a-tag
                      :color="
                        record.visibility === 'internal' ? 'red' : 'green'
                      "
                      >{{
                        record.visibility === 'internal' ? '仅客服' : '客户可见'
                      }}</a-tag
                    >
                  </template>
                </a-table-column>
                <a-table-column title="附件" :width="160">
                  <template #cell="{ record }">
                    {{ record.attachments?.length || 0 }} 个
                  </template>
                </a-table-column>
              </template>
            </a-table>
            <a-empty
              v-if="!messages.length && !messageLoading"
              description="暂无沟通记录"
            />
            <!-- 客服回复：后端 POST /admin/after-sales/:id/messages 已注册，
                 走 api.ts 的 sendAfterSaleMessage（未改动 api.ts）。 -->
            <div v-if="canCreateMessage" class="message-reply">
              <a-textarea
                v-model="messageForm.content"
                :max-length="1000"
                :auto-size="{ minRows: 2, maxRows: 5 }"
                placeholder="回复客户 / 记录沟通内容（≤1000 字）"
              />
              <a-space class="message-reply-actions" wrap>
                <a-checkbox v-model="messageForm.internal"
                  >仅客服可见（内部备注）</a-checkbox
                >
                <a-button
                  type="primary"
                  size="small"
                  :loading="messageSending"
                  :disabled="!messageForm.content.trim()"
                  @click="submitMessage"
                  >发送</a-button
                >
              </a-space>
            </div>
          </template>
        </a-drawer>

        <a-modal
          v-model:visible="reviewRequestVisible"
          title="发起售后复核"
          @ok="submitReviewRequest"
          @cancel="reviewRequestVisible = false"
        >
          <a-form :model="reviewRequestForm">
            <a-form-item label="复核理由" required>
              <a-textarea
                v-model="reviewRequestForm.reason"
                :max-length="500"
              />
            </a-form-item>
            <a-form-item label="新证据附件">
              <AttachmentSelector
                :model-value="reviewEvidence"
                multiple
                accept="image/png,image/jpeg,application/pdf"
                default-directory="private/esports/aftersale"
                @select="selectReviewEvidence"
              />
              <a-typography-text type="secondary">
                附件须为本人上传的私有文件（目录固定为
                private/esports/aftersale，最多 20 个），非空时后端校验归属与
                MIME 并写入复核单的 evidence_ref。
              </a-typography-text>
            </a-form-item>
          </a-form>
        </a-modal>

        <a-modal
          v-model:visible="reviewDecisionVisible"
          :title="
            reviewDecisionForm.decision === 'reopen'
              ? '发回重新处理'
              : '维持原结论'
          "
          @ok="submitReviewDecision"
          @cancel="reviewDecisionVisible = false"
        >
          <a-form :model="reviewDecisionForm">
            <a-form-item label="复核单号">{{
              reviewDecisionForm.reviewNo
            }}</a-form-item>
            <a-form-item label="结论说明">
              <a-textarea
                v-model="reviewDecisionForm.note"
                :max-length="255"
                placeholder="发回重新处理时建议写明理由"
              />
            </a-form-item>
            <a-typography-text type="secondary">
              申请人不得自审，原审批人同样不得审查；发回后售后单回到「处理中」，可重新提交方案。
            </a-typography-text>
          </a-form>
        </a-modal>

        <a-modal
          v-model:visible="createVisible"
          title="新建售后"
          @ok="submitCreate"
          @cancel="createVisible = false"
        >
          <a-form :model="createForm">
            <a-form-item label="来源类型" required>
              <a-select v-model="createForm.sourceType">
                <a-option
                  v-for="option in sourceTypeOptions"
                  :key="option.value"
                  :value="option.value"
                  >{{ option.label }}</a-option
                >
              </a-select>
            </a-form-item>
            <a-form-item :label="sourceIdLabel" required>
              <a-input-number v-model="createForm.sourceId" :min="1" />
            </a-form-item>
            <a-form-item label="类型" required>
              <a-select v-model="createForm.kind">
                <a-option
                  v-for="option in availableKindOptions"
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
            <a-form-item label="凭证附件">
              <a-space direction="vertical" fill>
                <AttachmentSelector
                  :model-value="createEvidence"
                  multiple
                  accept="image/png,image/jpeg,application/pdf"
                  default-directory="private/esports/aftersale"
                  @select="selectCreateEvidence"
                />
                <a-typography-text type="secondary">
                  仅可引用本人上传的私有附件（目录固定为
                  private/esports/aftersale，最多 20
                  个）；非空时后端校验附件归属与 MIME 并把引用写入
                  evidence_ref（JSON 数组），引用他人附件会被拒。
                </a-typography-text>
                <span v-if="evidenceSelectedText">{{
                  evidenceSelectedText
                }}</span>
              </a-space>
            </a-form-item>
            <a-form-item label="凭证说明 / 编号（可选）">
              <a-input v-model="createForm.evidenceRef" :max-length="255" />
            </a-form-item>
            <a-form-item label="联系方式">
              <a-input v-model="createForm.contact" :max-length="120" />
            </a-form-item>
            <a-form-item label="客户（可选）">
              <OwnerSelect
                v-model="createForm.customerId"
                owner-type="customer"
                placeholder="搜索并选择客户"
              />
            </a-form-item>
          </a-form>
        </a-modal>

        <a-modal
          v-model:visible="planVisible"
          title="提交处理方案"
          width="760px"
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
            <a-form-item label="方案模式">
              <a-radio-group v-model="planForm.mode">
                <a-radio value="single">单动作方案</a-radio>
                <a-radio value="multi">多动作方案（逐项执行）</a-radio>
              </a-radio-group>
              <a-typography-text type="secondary">
                多动作方案可同时提交「退款 / 补偿 / 补钟 /
                换人」中的多项，执行时逐项推进并各自留痕，
                允许一条成功、一条失败后再对失败项重试。
              </a-typography-text>
            </a-form-item>
            <template v-if="planForm.mode === 'single'">
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
                    <a-option value="replace_player"
                      >换人（换人重新履约）</a-option
                    >
                  </a-select>
                </a-form-item>
                <a-form-item label="承接陪玩" required>
                  <OwnerSelect
                    v-model="planForm.makeupPlayerId"
                    owner-type="player"
                    placeholder="搜索并选择承接陪玩"
                  />
                </a-form-item>
                <a-form-item label="席位序号" required>
                  <a-select v-model="planForm.makeupSeatIndex">
                    <a-option
                      v-for="seat in planSeatOptions"
                      :key="seat"
                      :value="seat"
                      >{{ seat }} 号位</a-option
                    >
                  </a-select>
                </a-form-item>
                <a-form-item label="补足服务量">
                  <a-input-number v-model="planForm.makeupUnits" :min="0" />
                  <a-typography-text type="secondary">
                    单位与订单 商品 的服务计量单位一致；补钟须大于零。
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
              <template v-else>
                <a-form-item label="赔付金额（元）">
                  <a-input-number
                    v-model="planForm.refundYuan"
                    :min="0"
                    :precision="2"
                  />
                </a-form-item>
                <a-form-item label="争议陪玩（不选 = 不指定）">
                  <OwnerSelect
                    v-model="planForm.disputePlayerId"
                    owner-type="player"
                    placeholder="搜索并选择争议陪玩"
                  />
                  <a-typography-text type="secondary">
                    可选：指定该单实际服务成员后，退款将优先冲回该成员的服务与加钟分成，
                    剩余额度再按比例分摊其他成员；留空或填 0 则按整体比例冲回。
                  </a-typography-text>
                </a-form-item>
              </template>
            </template>
            <template v-else>
              <a-form-item label="动作项" required>
                <a-space direction="vertical" fill>
                  <div
                    v-for="(action, index) in planForm.actions"
                    :key="action.key"
                    class="action-row"
                  >
                    <a-space wrap>
                      <span class="action-seq">#{{ index + 1 }}</span>
                      <a-select
                        v-model="action.actionType"
                        :style="{ width: '140px' }"
                      >
                        <a-option
                          v-for="option in actionTypeOptions"
                          :key="option.value"
                          :value="option.value"
                          >{{ option.label }}</a-option
                        >
                      </a-select>
                      <template v-if="isFundingAction(action.actionType)">
                        <a-input-number
                          v-model="action.amountYuan"
                          :min="0"
                          :precision="2"
                          placeholder="金额（元）"
                          :style="{ width: '140px' }"
                        />
                        <OwnerSelect
                          v-if="action.actionType === 'refund'"
                          v-model="action.disputePlayerId"
                          owner-type="player"
                          placeholder="争议陪玩（可选）"
                          :style="{ width: '150px' }"
                        />
                      </template>
                      <template v-else>
                        <OwnerSelect
                          v-model="action.playerId"
                          owner-type="player"
                          placeholder="搜索承接陪玩"
                          :style="{ width: '150px' }"
                        />
                        <a-select
                          v-model="action.seatIndex"
                          placeholder="席位"
                          :style="{ width: '110px' }"
                        >
                          <a-option
                            v-for="seat in planSeatOptions"
                            :key="seat"
                            :value="seat"
                            >{{ seat }} 号位</a-option
                          >
                        </a-select>
                        <a-input-number
                          v-model="action.units"
                          :min="0"
                          placeholder="补足量"
                          :style="{ width: '110px' }"
                        />
                        <a-input-number
                          v-model="action.companyPayYuan"
                          :min="0"
                          :precision="2"
                          placeholder="公司承担（元）"
                          :style="{ width: '150px' }"
                        />
                      </template>
                      <a-input
                        v-model="action.note"
                        placeholder="备注"
                        :style="{ width: '150px' }"
                      />
                      <a-button
                        size="mini"
                        status="danger"
                        :disabled="planForm.actions.length <= 1"
                        @click="removePlanAction(index)"
                        >删</a-button
                      >
                    </a-space>
                  </div>
                  <a-button
                    size="mini"
                    type="outline"
                    :disabled="planForm.actions.length >= 10"
                    @click="addPlanAction"
                    >添加动作项</a-button
                  >
                </a-space>
                <a-typography-text type="secondary">
                  资金类动作项仅订单来源可用且金额须大于零；一张售后单最多一条补履约动作项
                  （补钟或换人，须指定资质合格的承接陪玩与订单范围内的席位）。
                </a-typography-text>
              </a-form-item>
            </template>
            <template
              v-if="
                planForm.faultParty === 'player' &&
                (planForm.mode === 'multi' ||
                  planForm.planAction !== 'makeup_service')
              "
            >
              <a-form-item label="向陪玩追偿（元，0 = 不追偿）">
                <a-input-number
                  v-model="planForm.recoveryYuan"
                  :min="0"
                  :precision="2"
                />
                <a-typography-text type="secondary">
                  售后执行会生成待审批的陪玩追偿单，审批通过后从陪玩{{
                    walletName('player_catfood')
                  }}扣回； 与「退款冲回分成」相互独立，且不得超过赔付金额。
                </a-typography-text>
              </a-form-item>
              <a-form-item
                v-if="planForm.recoveryYuan > 0"
                label="追偿陪玩"
                required
              >
                <OwnerSelect
                  v-model="planForm.recoveryPlayerId"
                  owner-type="player"
                  placeholder="搜索并选择追偿陪玩"
                />
              </a-form-item>
            </template>
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

        <a-card class="general-card card-block" title="补履约任务">
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
            <a-button :loading="makeupLoading" @click="loadMakeups"
              >刷新</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="makeup-tip">
            售后方案选「补履约（补钟 /
            换人）」并经审批、执行后在这里开始服务并由客服验收；
            补履约由公司承担报酬，**不增加原订单实收与成交额**。
          </a-typography-text>
          <a-table
            title="补履约任务：售后方案执行后开始服务并由客服验收，报酬由公司承担、不计入原订单实收"
            :data="makeups"
            :loading="makeupLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="makeup_no" title="任务号" />
              <a-table-column title="关联订单">
                <template #cell="{ record }">{{
                  record.order_no || '—'
                }}</template>
              </a-table-column>
              <a-table-column title="类型">
                <template #cell="{ record }">{{
                  makeupKindLabel(record.kind)
                }}</template>
              </a-table-column>
              <a-table-column title="承接陪玩 / 席位">
                <template #cell="{ record }"
                  >{{ nameOrId(record.player_name, record.player_id) }} /
                  {{ record.seat_index }}</template
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
      </a-tab-pane>

      <a-tab-pane key="rules" title="规则与命中">
        <a-card
          v-if="canListRules"
          class="general-card"
          title="售后自动建单规则"
        >
          <a-space class="toolbar" wrap>
            <a-select
              v-model="ruleStatusFilter"
              :style="{ width: '160px' }"
              @change="loadRules"
            >
              <a-option value="">全部状态</a-option>
              <a-option value="draft">草稿</a-option>
              <a-option value="active">启用</a-option>
              <a-option value="disabled">停用</a-option>
            </a-select>
            <a-button :loading="ruleLoading" @click="loadRules">刷新</a-button>
            <a-button
              v-if="canCreateRule"
              type="primary"
              @click="openRuleCreate"
              >新建规则</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="section-tip">
            多条规则同时命中时按 priority 从大到小取第一条；auto_create
            关闭时只留痕 + 待办，由客服确认后建单。
            已产生命中留痕的规则不可删除，请改为停用（status=disabled）。
          </a-typography-text>
          <a-table
            title="自动建单规则：多条同时命中按优先级取首条；关闭自动建单时只留痕并转客服待办"
            :data="rules"
            :loading="ruleLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
            :scroll="{ x: 1500 }"
          >
            <template #columns>
              <a-table-column data-index="code" title="规则编码" />
              <a-table-column data-index="name" title="规则名称" />
              <a-table-column title="来源">
                <template #cell="{ record }">{{
                  sourceTypeLabel(record.source_type)
                }}</template>
              </a-table-column>
              <a-table-column title="触发时机">
                <template #cell="{ record }">{{
                  ruleTriggerLabel(record.trigger_event)
                }}</template>
              </a-table-column>
              <a-table-column title="判定口径 / 阈值">
                <template #cell="{ record }">{{
                  ruleMetricLabel(record)
                }}</template>
              </a-table-column>
              <a-table-column title="观察窗口">
                <template #cell="{ record }">{{
                  record.window_minutes
                    ? `${record.window_minutes} 分钟`
                    : '不限时'
                }}</template>
              </a-table-column>
              <a-table-column title="适用范围">
                <template #cell="{ record }">{{
                  ruleScopeLabel(record)
                }}</template>
              </a-table-column>
              <a-table-column title="生成问题类型">
                <template #cell="{ record }">{{
                  kindLabel(record.after_sale_kind)
                }}</template>
              </a-table-column>
              <a-table-column title="建单通道">
                <template #cell="{ record }">{{
                  record.channel === 'system' ? '自动建单' : '只推待办'
                }}</template>
              </a-table-column>
              <a-table-column title="默认责任方">
                <template #cell="{ record }">{{
                  faultLabel(record.fault_party)
                }}</template>
              </a-table-column>
              <a-table-column title="命中即建单">
                <template #cell="{ record }">
                  <a-tag :color="record.auto_create ? 'green' : 'gray'">{{
                    record.auto_create ? '是' : '否'
                  }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column data-index="priority" title="优先级" />
              <a-table-column title="状态">
                <template #cell="{ record }">
                  <a-tag :color="ruleStatusColor(record.status)">{{
                    ruleStatusLabel(record.status)
                  }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="操作" :width="140">
                <template #cell="{ record }">
                  <a-button
                    v-if="canUpdateRule"
                    type="text"
                    size="mini"
                    @click="openRuleEdit(record)"
                    >编辑</a-button
                  >
                  <a-popconfirm
                    v-if="canDeleteRule"
                    content="删除后不可恢复；已产生命中留痕的规则会被后端拒绝，请改为停用。"
                    @ok="deleteRuleItem(record)"
                  >
                    <a-button type="text" size="mini" status="danger"
                      >删除</a-button
                    >
                  </a-popconfirm>
                </template>
              </a-table-column>
            </template>
          </a-table>
          <a-empty
            v-if="!rules.length && !ruleLoading"
            description="暂无售后规则"
          />
        </a-card>

        <a-card
          v-if="canViewRuleHits"
          class="general-card card-block"
          title="规则命中留痕"
        >
          <a-space class="toolbar" wrap>
            <a-select
              v-model="ruleHitRuleFilter"
              :style="{ width: '220px' }"
              @change="loadRuleHits"
            >
              <a-option :value="0">全部规则</a-option>
              <a-option v-for="rule in rules" :key="rule.id" :value="rule.id"
                >{{ rule.code }} · {{ rule.name }}</a-option
              >
            </a-select>
            <a-select
              v-model="ruleHitSourceFilter"
              :style="{ width: '160px' }"
              @change="loadRuleHits"
            >
              <a-option value="">全部来源</a-option>
              <a-option value="order">服务订单</a-option>
              <a-option value="gift">礼物单</a-option>
            </a-select>
            <a-select
              v-model="ruleHitPendingFilter"
              :style="{ width: '180px' }"
              @change="loadRuleHits"
            >
              <a-option value="">全部命中</a-option>
              <a-option value="1">仅待客服处理</a-option>
            </a-select>
            <a-button :loading="ruleHitLoading" @click="loadRuleHits"
              >刷新</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="section-tip">
            命中留痕为只增记录：命中规则、命中来源单据（订单
            ID）、命中时间与命中的售后单都可回查。
          </a-typography-text>
          <a-table
            title="命中留痕：只增记录，可回查命中规则、来源单据、指标值与生成的售后单"
            :data="ruleHits"
            :loading="ruleHitLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
            :scroll="{ x: 1000 }"
          >
            <template #columns>
              <a-table-column title="命中规则">
                <template #cell="{ record }">{{
                  ruleHitLabel(record)
                }}</template>
              </a-table-column>
              <a-table-column title="命中单据">
                <template #cell="{ record }">
                  {{ sourceTypeLabel(record.source_type) }} #{{
                    record.source_id
                  }}
                </template>
              </a-table-column>
              <a-table-column title="指标值 / 阈值">
                <template #cell="{ record }">{{
                  ruleHitMetricText(record)
                }}</template>
              </a-table-column>
              <a-table-column title="生成售后单">
                <template #cell="{ record }">
                  <a-link
                    v-if="record.after_sale_id"
                    @click="showDetail(record.after_sale_id)"
                    >#{{ record.after_sale_id }}</a-link
                  >
                  <span v-else>—</span>
                </template>
              </a-table-column>
              <a-table-column data-index="created_at" title="命中时间" />
            </template>
          </a-table>
          <a-empty
            v-if="!ruleHits.length && !ruleHitLoading"
            description="暂无命中记录"
          />
        </a-card>

        <a-card
          v-if="!canListRules && !canViewRuleHits"
          class="general-card"
          title="规则与命中"
        >
          <a-empty description="当前账号无售后规则 / 命中留痕查看权限" />
        </a-card>
      </a-tab-pane>
    </a-tabs>

    <a-modal
      v-model:visible="externalRefundRegisterVisible"
      title="登记外部退款"
      @ok="submitExternalRefundRegister"
      @cancel="externalRefundRegisterVisible = false"
    >
      <a-form :model="externalRefundForm">
        <a-form-item label="关联订单号" required>
          <a-input
            v-model="externalRefundForm.orderNo"
            placeholder="如 SO-20261025-000001"
            allow-clear
          />
          <a-typography-text type="secondary">
            外部退款必须落到订单；本次登记会关联售后单
            {{
              detail?.after_sale_no || '-'
            }}。未关联售后单的对外付款会被后端视为私下赔付留痕。
          </a-typography-text>
        </a-form-item>
        <a-form-item label="退款渠道" required>
          <a-select v-model="externalRefundForm.channel">
            <a-option value="wechat_work">企业微信收款</a-option>
            <a-option value="merchant_qr">商户码</a-option>
            <a-option value="corporate_transfer">对公转账</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="退款流水号" required>
          <a-input
            v-model="externalRefundForm.transactionNo"
            :max-length="128"
            placeholder="渠道退款流水号，同一流水号只能登记一次"
          />
        </a-form-item>
        <a-form-item label="退款金额（元）" required>
          <a-input-number
            v-model="externalRefundForm.amountYuan"
            :min="0.01"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="退款依据说明" required>
          <a-textarea
            v-model="externalRefundForm.reason"
            :max-length="255"
            placeholder="例如：售后方案审批后退原核销款"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="externalRefundExecuteVisible"
      title="执行外部退款"
      @ok="submitExternalRefundExecute"
      @cancel="externalRefundExecuteVisible = false"
    >
      <a-form :model="externalRefundExecuteForm">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="退款单号">{{
            externalRefundExecuteForm.refundNo
          }}</a-descriptions-item>
          <a-descriptions-item label="渠道 / 金额"
            >{{ externalRefundExecuteForm.channel }} /
            {{
              money(externalRefundExecuteForm.amountCents)
            }}</a-descriptions-item
          >
          <a-descriptions-item label="订单 / 售后单"
            >#{{ externalRefundExecuteForm.orderId }} / #{{
              externalRefundExecuteForm.afterSaleId
            }}</a-descriptions-item
          >
        </a-descriptions>
        <a-form-item label="核对打款流水号" required>
          <a-input
            v-model="externalRefundExecuteForm.transactionNo"
            :max-length="128"
            placeholder="请再次输入登记时填写的退款流水号"
          />
          <a-typography-text type="secondary">
            执行即对外放款：后端会核验额度、订单冻结与支付状态（渠道撤销 /
            拒付会直接拒绝），且登记人不得自行执行。
          </a-typography-text>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="financeRefVisible"
      title="登记批次退款已打款"
      @ok="submitFinanceRef"
      @cancel="financeRefVisible = false"
    >
      <a-form :model="financeRefForm">
        <a-form-item label="执行单号">{{
          financeRefForm.executionNo
        }}</a-form-item>
        <a-form-item label="财务流水号" required>
          <a-input v-model="financeRefForm.financeRef" :max-length="128" />
          <a-typography-text type="secondary">
            登记后该笔执行明细置为 executed；重复登记会被后端拒绝。
          </a-typography-text>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="evidenceRequestVisible"
      title="提示客户补证"
      @ok="submitEvidenceRequest"
      @cancel="evidenceRequestVisible = false"
    >
      <a-form :model="evidenceRequestForm">
        <a-form-item label="补证说明" required>
          <a-textarea
            v-model="evidenceRequestForm.note"
            :max-length="200"
            placeholder="1–200 字，客户会在售后单内直接看到这条提示"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="ruleModalVisible"
      :title="ruleForm.id > 0 ? '编辑售后规则' : '新建售后规则'"
      width="760px"
      @ok="submitRule"
      @cancel="ruleModalVisible = false"
    >
      <a-form :model="ruleForm">
        <!-- 规则编码由后台自动生成：新建时无需填写，编辑时只读展示生成结果。 -->
        <a-form-item v-if="ruleForm.id > 0" label="规则编码">
          <a-input v-model="ruleForm.code" disabled />
        </a-form-item>
        <a-form-item label="规则名称" required>
          <a-input v-model="ruleForm.name" :max-length="120" />
        </a-form-item>
        <a-form-item label="来源类型" required>
          <a-select v-model="ruleForm.sourceType" @change="onRuleSourceChange">
            <a-option value="order">服务订单</a-option>
            <a-option value="gift">礼物单</a-option>
          </a-select>
          <a-typography-text type="secondary">
            后端只支持服务订单 / 礼物单两类来源的自动触发，其他来源会被拒绝。
          </a-typography-text>
        </a-form-item>
        <a-form-item label="触发时机" required>
          <a-select v-model="ruleForm.triggerEvent">
            <a-option
              v-for="option in ruleTriggerOptions"
              :key="option.value"
              :value="option.value"
              >{{ option.label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="判定口径" required>
          <a-select v-model="ruleForm.metric" @change="onRuleMetricChange">
            <a-option
              v-for="option in ruleMetricOptions"
              :key="option.value"
              :value="option.value"
              >{{ option.label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item :label="ruleThresholdLabel" required>
          <a-input-number
            v-model="ruleForm.thresholdValue"
            :min="0"
            :precision="ruleThresholdPrecision"
            :disabled="ruleForm.metric === 'none'"
          />
          <a-typography-text type="secondary">
            百分比口径按 % 填 0.01–100（保存自动 ×100
            存基点）；金额口径按元填（保存自动 ×100
            存分）；时长口径按分钟填；不判定口径固定 0。
          </a-typography-text>
        </a-form-item>
        <a-form-item label="观察窗口（分钟，0 = 不限时）">
          <a-input-number v-model="ruleForm.windowMinutes" :min="0" />
        </a-form-item>
        <a-form-item label="适用游戏（可选）">
          <a-input v-model="ruleForm.scopeGame" :max-length="48" />
        </a-form-item>
        <a-form-item label="适用商品（可选）">
          <SkuSelect
            v-model="ruleForm.scopeSkuId"
            :fallback-title="skuLabel(ruleForm.scopeSkuId)"
            placeholder="不限商品，可搜索名称或编码"
          />
        </a-form-item>
        <a-form-item label="命中生成的问题类型" required>
          <a-select v-model="ruleForm.afterSaleKind">
            <a-option
              v-for="option in ruleKindOptions"
              :key="option.value"
              :value="option.value"
              >{{ option.label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="建单通道" required>
          <a-select v-model="ruleForm.channel">
            <a-option value="system">自动建单</a-option>
            <a-option value="admin">只推待办</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="默认责任方" required>
          <a-select v-model="ruleForm.faultParty">
            <a-option
              v-for="option in faultOptions"
              :key="option.value"
              :value="option.value"
              >{{ option.label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="命中即建单">
          <a-switch v-model="ruleForm.autoCreate" />
          <a-typography-text type="secondary">
            关闭后只写命中留痕与客服待办，不自动建单。
          </a-typography-text>
        </a-form-item>
        <a-form-item label="优先级（0–1000，越大越先命中）">
          <a-input-number v-model="ruleForm.priority" :min="0" :max="1000" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model="ruleForm.note" :max-length="255" />
        </a-form-item>
        <a-form-item label="规则状态" required>
          <a-select v-model="ruleForm.status">
            <a-option value="draft">草稿</a-option>
            <a-option value="active">启用</a-option>
            <a-option value="disabled">停用</a-option>
          </a-select>
        </a-form-item>
        <a-typography-text v-if="ruleForm.id > 0" type="secondary">
          编辑走 version 乐观锁（当前版本
          {{ ruleForm.version }}），被别人改过会提示刷新后重试。
        </a-typography-text>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { uuidV4 } from '@/utils/uuid';
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import yuanToCents from '@/utils/money';
  import AttachmentSelector from '@/components/attachment-selector/index.vue';
  import type { AttachmentResponse } from '@/types/api';
  import { useWalletDisplay } from '../../wallet-display';
  import OwnerSelect from '../../components/OwnerSelect.vue';
  import SkuSelect from '../../components/SkuSelect.vue';
  import {
    acceptAfterSale,
    approveAfterSale,
    completeFulfillmentMakeup,
    createAfterSale,
    createAfterSaleRule,
    decideAfterSaleReview,
    deleteAfterSaleRule,
    executeAfterSale,
    executeAfterSaleAction,
    executeAfterSaleRefundByBatch,
    executeExternalRefund,
    getAfterSale,
    getAfterSaleRule,
    getOrder,
    listAfterSaleActions,
    listAfterSales,
    listAfterSaleMessages,
    listAfterSaleReviews,
    listAfterSaleRuleHits,
    listAfterSaleRules,
    listSkus,
    listExternalRefunds,
    listFulfillmentMakeups,
    markRechargeRefundExecuted,
    planAfterSale,
    registerExternalRefund,
    rejectAfterSale,
    requestAfterSaleEvidence,
    requestAfterSaleReview,
    sendAfterSaleMessage,
    startFulfillmentMakeup,
    updateAfterSaleRule,
    withdrawAfterSale,
    withdrawAfterSaleReview,
  } from '../../api';
  import type {
    AfterSaleActionInput,
    AfterSaleActionProgress,
    AfterSaleActionStatus,
    AfterSaleActionType,
    AfterSaleChannel,
    AfterSaleFaultParty,
    AfterSaleInput,
    AfterSaleKind,
    AfterSalePlanAction,
    AfterSalePlanInput,
    AfterSaleReviewDecision,
    AfterSaleRuleHit,
    AfterSaleRuleInput,
    AfterSaleRuleMetric,
    AfterSaleRuleSourceType,
    AfterSaleRuleStatus,
    AfterSaleRuleTriggerEvent,
    AfterSaleSourceType,
    EsportsAfterSale,
    EsportsAfterSaleAction,
    EsportsAfterSaleMessage,
    EsportsAfterSaleReview,
    EsportsAfterSaleRule,
    EsportsExternalRefund,
    EsportsFulfillmentMakeup,
    EsportsRechargeRefundExecution,
    EsportsSku,
    MakeupKind,
  } from '../../api';

  const { displayName: walletName } = useWalletDisplay();

  const payChannelMap: Record<string, string> = {
    wechat_work: '企业微信收款',
    merchant_qr: '工作室商户码',
    corporate_transfer: '对公转账',
  };
  const payChannelText = (value?: string) =>
    (value && payChannelMap[value]) || value || '—';

  const { hasButtonPermission, hasAnyPermission } = usePermission();
  const canOperate = computed(() =>
    hasButtonPermission('esports:aftersales:operate')
  );
  // 复核三权限：申请 / 异人审查 / 撤回，各自独立。
  const canRequestReview = computed(() =>
    hasButtonPermission('esports:aftersales:review_request')
  );
  const canDecideReview = computed(() =>
    hasButtonPermission('esports:aftersales:review_decide')
  );
  const canWithdrawReview = computed(() =>
    hasButtonPermission('esports:aftersales:review_withdraw')
  );
  // 外部退款 / 批次退款执行：权限码均取自 app.go 的 PermAPI 声明，不另造 code。
  const canRegisterExternalRefund = computed(() =>
    hasButtonPermission('esports:settlements:external_refund_register')
  );
  const canViewExternalRefunds = computed(() =>
    hasButtonPermission('esports:settlements:external_refund_list')
  );
  const canExecuteExternalRefund = computed(() =>
    hasButtonPermission('esports:settlements:external_refund_execute')
  );
  const canBatchRefundExecute = computed(() =>
    hasButtonPermission('esports:aftersales:refund_execute')
  );
  const canMarkRechargeRefundExecuted = computed(() =>
    hasButtonPermission('esports:settlements:recharge_refund_execute')
  );
  // 售后沟通 / 补证与规则维护权限。
  const canViewMessages = computed(() =>
    hasButtonPermission('esports:aftersales:messages_list')
  );
  // 回复沟通记录：权限码取自 app.go 的 PermAPI 声明（只有 API 授权、无同名按钮），
  // 因此按「按钮码 || 同码 API 授权」并集判断，避免非超管被误隐藏。
  const canCreateMessage = computed(
    () =>
      hasButtonPermission('esports:aftersales:messages_create') ||
      hasAnyPermission(['esports:aftersales:messages_create'])
  );
  const canRequestEvidence = computed(() =>
    hasButtonPermission('esports:aftersales:evidence_request')
  );
  const canListRules = computed(() =>
    hasButtonPermission('esports:aftersale:rules_list')
  );
  const canCreateRule = computed(() =>
    hasButtonPermission('esports:aftersale:rules_create')
  );
  const canUpdateRule = computed(() =>
    hasButtonPermission('esports:aftersale:rules_update')
  );
  const canDeleteRule = computed(() =>
    hasButtonPermission('esports:aftersale:rules_delete')
  );
  const canViewRuleHits = computed(() =>
    hasButtonPermission('esports:aftersale:rules_hits')
  );

  const activeTab = ref('tickets');

  // 待客户确认 → 待审批 的客服侧「代客确认」：后端已有 confirmAfterSaleByAdmin（aftersale.go:947），
  // 但 app.go 未注册对应路由、api.ts 也没有封装，因此这里只预留按钮与说明，不调用任何接口。
  // 代客确认 ≠ 审批：不得复用 approveAfterSale；待后端新增
  // POST /admin/after-sales/:id/confirm 后，改成调用 confirmAfterSale(id) 即可。

  const loading = ref(false);
  const statusFilter = ref('');
  const items = ref<EsportsAfterSale[]>([]);
  const detail = ref<EsportsAfterSale | null>(null);
  const detailOrderNo = ref('');
  const detailVisible = ref(false);
  // 订单支付状态（payment_status=exception 表示渠道撤销 / 拒付）：后端据此禁止审批预占与退款执行。
  const orderPaymentStatus = ref('');
  const paymentStatusException = computed(
    () => orderPaymentStatus.value === 'exception'
  );
  const orderPaymentStatusLabel = computed(() => {
    if (orderPaymentStatus.value === 'exception')
      return '异常（渠道撤销 / 拒付）';
    if (orderPaymentStatus.value) return orderPaymentStatus.value;
    return detail.value?.source_type === 'order' ? '—' : '—（非订单来源）';
  });

  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

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

  // ── 动作项与逐项进度 ──
  const detailActions = ref<{
    progress: AfterSaleActionProgress;
    actions: EsportsAfterSaleAction[];
  } | null>(null);
  const actionExecuting = ref(0);
  const actionStatusMap: Record<AfterSaleActionStatus, string> = {
    pending: '待执行',
    executing: '执行中',
    awaiting_execution: '待执行（外部退款）',
    succeeded: '已成功',
    failed: '执行失败',
  };
  const actionStatusLabel = (value: AfterSaleActionStatus) =>
    actionStatusMap[value] || value;
  const actionStatusColor = (value: AfterSaleActionStatus) => {
    switch (value) {
      case 'succeeded':
        return 'green';
      case 'failed':
        return 'red';
      case 'executing':
        return 'arcoblue';
      default:
        return 'orange';
    }
  };
  // 管理端展示统一优先显示名称，缺名回落 #ID，都没有显示 '-'（后端已批量补全名字）。
  const nameOrId = (name?: string, id?: number | null) =>
    name || (id && id > 0 ? `#${id}` : '-');
  // 动作项参数摘要：资金类展示金额与争议陪玩，补履约类展示承接陪玩 / 席位 / 补足量 / 公司承担。
  const actionDetail = (action: EsportsAfterSaleAction) => {
    if (
      action.action_type === 'refund' ||
      action.action_type === 'compensate'
    ) {
      const dispute =
        action.dispute_player_id && action.dispute_player_id > 0
          ? `，争议陪玩 ${nameOrId(
              action.dispute_player_name,
              action.dispute_player_id
            )}`
          : '';
      return `金额 ${money(action.amount_cents)}${dispute}`;
    }
    return `陪玩 ${nameOrId(action.player_name, action.player_id)}，席位 ${
      action.seat_index ?? '—'
    }，补足量 ${action.units}，公司承担 ${money(action.company_pay_cents)}`;
  };
  // 仅待执行 / 执行中 / 失败的项可执行；售后单须处于待执行或执行失败态，后端会再校验。
  const canExecuteAction = (action: EsportsAfterSaleAction) =>
    canOperate.value &&
    !!detail.value &&
    ['pending_execution', 'execution_failed'].includes(detail.value.status) &&
    ['pending', 'executing', 'failed'].includes(action.status);

  async function loadDetailActions(id: number) {
    detailActions.value = null;
    try {
      detailActions.value = (await listAfterSaleActions(id)).data.data || null;
    } catch (err) {
      Message.error(errorText(err, '加载动作项进度失败'));
    }
  }

  async function executeActionItem(action: EsportsAfterSaleAction) {
    if (!detail.value) return;
    actionExecuting.value = action.seq;
    try {
      await executeAfterSaleAction(detail.value.id, action.seq);
      Message.success(`第 ${action.seq} 项动作已执行`);
      await loadDetailActions(detail.value.id);
      await load();
    } catch (err) {
      Message.error(
        errorText(
          err,
          '执行动作项失败：该动作项已完成、来源订单已冻结或状态已变化'
        )
      );
      await loadDetailActions(detail.value.id);
    } finally {
      actionExecuting.value = 0;
    }
  }

  // ── 终态售后复核 ──
  const reviews = ref<EsportsAfterSaleReview[]>([]);
  const reviewLoading = ref(false);
  const reviewRequestVisible = ref(false);
  const reviewEvidence = ref<AttachmentResponse[]>([]);
  const reviewRequestForm = reactive({ reason: '' });
  const reviewDecisionVisible = ref(false);
  const reviewDecisionForm = reactive<{
    id: number;
    reviewNo: string;
    decision: AfterSaleReviewDecision;
    note: string;
  }>({ id: 0, reviewNo: '', decision: 'uphold', note: '' });
  const reviewStatusMap: Record<string, string> = {
    pending: '待审查',
    upheld: '维持原结论',
    reopened: '已发回重新处理',
    withdrawn: '已撤回',
  };
  const reviewStatusLabel = (value: string) => reviewStatusMap[value] || value;
  const reviewStatusColor = (value: string) => {
    switch (value) {
      case 'upheld':
        return 'green';
      case 'reopened':
        return 'orange';
      case 'withdrawn':
        return 'gray';
      default:
        return 'arcoblue';
    }
  };

  function selectReviewEvidence(
    value: AttachmentResponse | AttachmentResponse[]
  ) {
    reviewEvidence.value = Array.isArray(value) ? value : [value];
  }

  async function loadReviews() {
    if (!detail.value) return;
    reviewLoading.value = true;
    try {
      reviews.value =
        (await listAfterSaleReviews(detail.value.id)).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载复核记录失败'));
    } finally {
      reviewLoading.value = false;
    }
  }

  function openReviewRequest() {
    reviewRequestForm.reason = '';
    reviewEvidence.value = [];
    reviewRequestVisible.value = true;
  }

  async function submitReviewRequest() {
    const record = detail.value;
    if (!record) return;
    if (!reviewRequestForm.reason.trim()) {
      Message.warning('请填写复核理由');
      return;
    }
    try {
      const payload: {
        reason: string;
        evidence_attachment_ids?: number[];
      } = { reason: reviewRequestForm.reason.trim() };
      if (reviewEvidence.value.length) {
        payload.evidence_attachment_ids = reviewEvidence.value.map(
          (item) => item.id
        );
      }
      await requestAfterSaleReview(record.id, payload);
      reviewRequestVisible.value = false;
      Message.success('已提交复核申请，等待异人审查');
      await loadReviews();
      await load();
    } catch (err) {
      Message.error(
        errorText(
          err,
          '发起复核失败：仅终态售后可复核，且同单同时刻只允许一张进行中复核'
        )
      );
    }
  }

  function openReviewDecision(
    record: EsportsAfterSaleReview,
    decision: AfterSaleReviewDecision
  ) {
    reviewDecisionForm.id = record.id;
    reviewDecisionForm.reviewNo = record.review_no;
    reviewDecisionForm.decision = decision;
    reviewDecisionForm.note = '';
    reviewDecisionVisible.value = true;
  }

  async function submitReviewDecision() {
    if (
      reviewDecisionForm.decision === 'reopen' &&
      !reviewDecisionForm.note.trim()
    ) {
      Message.warning('发回重新处理须填写结论说明');
      return;
    }
    try {
      await decideAfterSaleReview(
        reviewDecisionForm.id,
        reviewDecisionForm.decision,
        reviewDecisionForm.note.trim()
      );
      reviewDecisionVisible.value = false;
      Message.success(
        reviewDecisionForm.decision === 'reopen'
          ? '已发回重新处理'
          : '已维持原结论'
      );
      await loadReviews();
      await load();
    } catch (err) {
      Message.error(
        errorText(
          err,
          '复核审查失败：申请人不得自审、原审批人不得审查，或订单分成已结算'
        )
      );
    }
  }

  async function withdrawReviewItem(record: EsportsAfterSaleReview) {
    try {
      await withdrawAfterSaleReview(record.id);
      Message.success('已撤回复核申请');
      await loadReviews();
    } catch (err) {
      Message.error(errorText(err, '撤回复核失败：仅申请人可撤回进行中的复核'));
    }
  }

  const statusOptions = [
    { value: 'pending_accept', label: '待受理' },
    { value: 'processing', label: '处理中' },
    { value: 'pending_customer_confirm', label: '待客户确认' },
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
  // 统一售后来源：按来源切换 ID 字段名，并限制可选问题类型。
  const sourceTypeOptions: { value: AfterSaleSourceType; label: string }[] = [
    { value: 'order', label: '服务订单' },
    { value: 'gift', label: '礼物单' },
    { value: 'recharge', label: '充值流水' },
    { value: 'assessment', label: '考核记录' },
  ];
  const sourceTypeMap: Record<string, string> = Object.fromEntries(
    sourceTypeOptions.map((item) => [item.value, item.label])
  );
  const createVisible = ref(false);
  // 建单凭证附件：只可引用本人上传的私有附件，后端校验归属与 MIME 后才落 evidence_ref。
  const createEvidence = ref<AttachmentResponse[]>([]);
  const evidenceSelectedText = computed(() =>
    createEvidence.value.length
      ? `已选附件：${createEvidence.value
          .map((item) => `#${item.id} ${item.original_name}`)
          .join('、')}`
      : ''
  );
  function selectCreateEvidence(
    value: AttachmentResponse | AttachmentResponse[]
  ) {
    createEvidence.value = Array.isArray(value) ? value : [value];
  }
  const createForm = reactive<{
    sourceType: AfterSaleSourceType;
    sourceId: number;
    kind: AfterSaleKind;
    channel: AfterSaleChannel;
    demand: string;
    expectedPlan: string;
    evidenceRef: string;
    contact: string;
    customerId: number;
  }>({
    sourceType: 'order',
    sourceId: 1,
    kind: 'refund_request',
    channel: 'customer',
    demand: '',
    expectedPlan: '',
    evidenceRef: '',
    contact: '',
    customerId: 0,
  });
  const sourceIdLabel = computed(() => {
    switch (createForm.sourceType) {
      case 'gift':
        return '礼物单 ID';
      case 'recharge':
        return '充值流水 ID';
      case 'assessment':
        return '考核记录 ID';
      default:
        return '订单号';
    }
  });
  const kindAllowBySource: Record<AfterSaleSourceType, string[]> = {
    order: [],
    gift: ['refund_request', 'wrong_item', 'overcharge', 'other'],
    recharge: ['refund_request', 'overcharge', 'other'],
    assessment: ['player_appeal', 'other'],
  };
  const availableKindOptions = computed(() => {
    const allow = kindAllowBySource[createForm.sourceType];
    if (!allow || allow.length === 0) return kindOptions;
    return kindOptions.filter((item) => allow.includes(item.value));
  });
  const sourceTypeLabel = (value: string) => sourceTypeMap[value] || value;
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
  // 限时：展示当前阶段剩余时间，已超时显示超时时长（列表加载时计算一次）。
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
    // execution_failed 由「撤回执行失败」专门入口处理（会提示释放预占额度），这里不再重复出按钮。
    !['completed', 'rejected', 'withdrawn', 'execution_failed'].includes(
      record.status
    );

  const planVisible = ref(false);
  const planTarget = ref<EsportsAfterSale | null>(null);
  // 补履约席位候选：按售后单关联订单的 required_seats 生成 1..N，非订单来源回退单席位。
  const planSeatOptions = ref<number[]>([1]);
  // 多动作方案的动作项草稿：金额 / 公司承担在前端按「元」录入，提交时转「分」。
  interface PlanActionDraft {
    key: string;
    actionType: AfterSaleActionType;
    amountYuan: number;
    playerId: number;
    seatIndex: number;
    units: number;
    companyPayYuan: number;
    disputePlayerId: number;
    note: string;
  }
  const actionTypeOptions: { value: AfterSaleActionType; label: string }[] = [
    { value: 'refund', label: '退原核销款' },
    { value: 'compensate', label: '发放补偿' },
    { value: 'makeup', label: '补钟' },
    { value: 'replace', label: '换人' },
  ];
  const actionTypeMap: Record<string, string> = Object.fromEntries(
    actionTypeOptions.map((item) => [item.value, item.label])
  );
  const actionTypeLabel = (value: string) => actionTypeMap[value] || value;
  const isFundingAction = (value: AfterSaleActionType) =>
    value === 'refund' || value === 'compensate';
  const newPlanAction = (): PlanActionDraft => ({
    key: uuidV4(),
    actionType: 'refund',
    amountYuan: 0,
    playerId: 0,
    seatIndex: 1,
    units: 0,
    companyPayYuan: 0,
    disputePlayerId: 0,
    note: '',
  });
  const planForm = reactive<{
    // 方案模式：single 走既有单动作路径，multi 提交多动作项并逐项执行。
    mode: 'single' | 'multi';
    faultParty: AfterSaleFaultParty;
    planAction: AfterSalePlanAction;
    refundYuan: number;
    resolution: string;
    actions: PlanActionDraft[];
    // 补履约方案参数：plan_action=makeup_service 时使用。
    makeupKind: MakeupKind;
    makeupPlayerId: number;
    makeupSeatIndex: number;
    makeupUnits: number;
    makeupCompanyPayYuan: number;
    // 追偿：责任方为陪玩时可填向陪玩追偿的陪玩与金额。
    recoveryPlayerId: number;
    recoveryYuan: number;
    // 争议涉及陪玩（成员明细冲回）：退款类方案可指定优先冲回该成员分成。
    disputePlayerId: number;
  }>({
    mode: 'single',
    faultParty: 'undetermined',
    planAction: 'refund_original',
    refundYuan: 0,
    resolution: '',
    actions: [],
    makeupKind: 'makeup_time',
    makeupPlayerId: 0,
    makeupSeatIndex: 1,
    makeupUnits: 0,
    makeupCompanyPayYuan: 0,
    recoveryPlayerId: 0,
    recoveryYuan: 0,
    disputePlayerId: 0,
  });

  function addPlanAction() {
    planForm.actions.push(newPlanAction());
  }
  function removePlanAction(index: number) {
    planForm.actions.splice(index, 1);
  }
  // 多动作方案的动作项校验：资金类金额须大于零；补履约须给承接陪玩与订单内席位，
  // 补钟须给大于零的补足量；一张售后单最多一条补履约动作项。
  function planActionError(): string {
    if (!planForm.actions.length) return '多动作方案至少需要一项动作';
    let makeupCount = 0;
    for (let i = 0; i < planForm.actions.length; i += 1) {
      const action = planForm.actions[i];
      const label = `第 ${i + 1} 项`;
      if (isFundingAction(action.actionType)) {
        if (action.amountYuan <= 0) {
          return `${label}资金类动作金额须大于零`;
        }
      } else {
        makeupCount += 1;
        if (makeupCount > 1) {
          return '一张售后单最多一条补履约动作项（补钟或换人）';
        }
        if (action.playerId < 1) return `${label}补履约须指定承接陪玩`;
        if (action.seatIndex < 1) return `${label}补履约须指定席位`;
        if (action.actionType === 'makeup' && action.units < 1) {
          return `${label}补钟须给出大于零的补足服务量`;
        }
      }
    }
    return '';
  }
  function planActionInput(action: PlanActionDraft): AfterSaleActionInput {
    const input: AfterSaleActionInput = { action_type: action.actionType };
    if (action.note.trim()) input.note = action.note.trim();
    if (isFundingAction(action.actionType)) {
      input.amount_cents = yuanToCents(action.amountYuan);
      if (action.actionType === 'refund' && action.disputePlayerId > 0) {
        input.dispute_player_id = action.disputePlayerId;
      }
      return input;
    }
    input.player_id = action.playerId;
    input.seat_index = action.seatIndex;
    input.units = action.units;
    input.company_pay_cents = yuanToCents(action.companyPayYuan);
    return input;
  }
  // 多动作方案的聚合摘要：plan_action 取主导类型，refund_cents 由后端按动作项求和。
  const multiPlanSummary = computed<AfterSalePlanAction>(() => {
    const types = planForm.actions.map((action) => action.actionType);
    if (types.includes('refund')) return 'refund_original';
    if (types.includes('compensate')) return 'compensate';
    return 'makeup_service';
  });

  const rejectVisible = ref(false);
  const rejectTarget = ref<EsportsAfterSale | null>(null);
  const rejectForm = reactive({ reason: '' });

  function openCreate() {
    createForm.sourceType = 'order';
    createForm.sourceId = 1;
    createForm.kind = 'refund_request';
    createForm.channel = 'customer';
    createForm.demand = '';
    createForm.expectedPlan = '';
    createForm.evidenceRef = '';
    createForm.contact = '';
    createForm.customerId = 0;
    createEvidence.value = [];
    createVisible.value = true;
  }

  async function submitCreate() {
    if (createForm.sourceId < 1 || !createForm.demand.trim()) {
      Message.warning('请填写来源单据 ID 与诉求');
      return;
    }
    const input: AfterSaleInput = {
      source_type: createForm.sourceType,
      source_id: createForm.sourceId,
      kind: createForm.kind,
      channel: createForm.channel,
      demand: createForm.demand.trim(),
      expected_plan: createForm.expectedPlan.trim(),
      evidence_ref: createForm.evidenceRef.trim(),
      contact: createForm.contact.trim(),
    };
    if (createEvidence.value.length) {
      input.evidence_attachment_ids = createEvidence.value.map(
        (item) => item.id
      );
    }
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
    planForm.mode = 'single';
    planForm.faultParty = 'undetermined';
    planForm.planAction = 'refund_original';
    planForm.refundYuan = 0;
    planForm.resolution = '';
    planForm.actions = [];
    planForm.makeupKind = 'makeup_time';
    planForm.makeupPlayerId = 0;
    planForm.makeupSeatIndex = 1;
    planForm.makeupUnits = 0;
    planForm.makeupCompanyPayYuan = 0;
    planForm.recoveryPlayerId = 0;
    planForm.recoveryYuan = 0;
    planForm.disputePlayerId = 0;
    planSeatOptions.value = [1];
    planVisible.value = true;
    // 拉关联订单的席位数生成下拉候选；切单/关窗后返回的结果丢弃。
    if (record.source_type === 'order' && record.source_id > 0) {
      getOrder(record.source_id)
        .then((res) => {
          if (planTarget.value !== record) return;
          const seats = res.data.data?.required_seats ?? 0;
          if (seats > 0) {
            planSeatOptions.value = Array.from(
              { length: seats },
              (_, i) => i + 1
            );
          }
        })
        .catch(() => undefined);
    }
  }

  async function submitPlan() {
    const record = planTarget.value;
    if (!record) return;
    const payload: AfterSalePlanInput = {
      fault_party: planForm.faultParty,
      plan_action: planForm.planAction,
      refund_cents: yuanToCents(planForm.refundYuan),
      resolution: planForm.resolution.trim(),
    };
    if (planForm.mode === 'multi') {
      // 多动作方案：refund_cents 由后端按资金类动作项求和，这里固定送 0。
      const error = planActionError();
      if (error) {
        Message.warning(error);
        return;
      }
      payload.plan_action = multiPlanSummary.value;
      payload.refund_cents = 0;
      payload.actions = planForm.actions.map(planActionInput);
      if (planForm.recoveryYuan > 0) {
        payload.recovery_cents = yuanToCents(planForm.recoveryYuan);
        payload.recovery_player_id = planForm.recoveryPlayerId;
      }
      try {
        await planAfterSale(record.id, payload);
        planVisible.value = false;
        Message.success('已提交多动作方案，等待客户确认');
        await load();
      } catch (err) {
        Message.error(
          errorText(
            err,
            '提交多动作方案失败：动作项参数无效、补履约陪玩不合格或状态已变化'
          )
        );
      }
      return;
    }
    try {
      if (planForm.planAction === 'makeup_service') {
        // 补履约不产生退款金额。
        payload.refund_cents = 0;
        payload.makeup_kind = planForm.makeupKind;
        payload.makeup_player_id = planForm.makeupPlayerId;
        payload.makeup_seat_index = planForm.makeupSeatIndex;
        payload.makeup_units = planForm.makeupUnits;
        payload.makeup_company_pay_cents = yuanToCents(
          planForm.makeupCompanyPayYuan
        );
      } else if (planForm.recoveryYuan > 0) {
        // 追偿：赔付由陪玩承担时另建待审批的追偿明细。
        payload.recovery_cents = yuanToCents(planForm.recoveryYuan);
        payload.recovery_player_id = planForm.recoveryPlayerId;
      }
      if (
        planForm.planAction !== 'makeup_service' &&
        planForm.disputePlayerId > 0
      ) {
        // 争议涉及陪玩：退款类方案可指定优先冲回该成员分成。
        payload.dispute_player_id = planForm.disputePlayerId;
      }
      await planAfterSale(record.id, payload);
      planVisible.value = false;
      Message.success('已提交方案，等待客户确认');
      await load();
    } catch (err) {
      Message.error(errorText(err, '提交方案失败：参数无效或状态已变化'));
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

  // ── execution_failed 死单回收（P0-9）──
  // 从「执行失败」撤回：后端在同一事务内原路释放该单仍占用的退款预占额度并解冻分成，
  // 返回更新后的售后单；这里按后端返回的最终状态展示，不臆造成功文案。
  async function withdrawExecutionFailed(record: EsportsAfterSale) {
    try {
      const res = await withdrawAfterSale(record.id);
      const updated = res.data.data;
      Message.success(
        `撤回执行失败成功：售后单状态 ${
          updated ? statusLabel(updated.status) : '已撤回'
        }，预占退款额度已释放`
      );
      await load();
      // 详情抽屉开着时直接用后端返回的售后单刷新状态，避免再次拉详情。
      if (detail.value?.id === record.id && updated) {
        detail.value = updated;
      }
    } catch (err) {
      Message.error(errorText(err, '撤回执行失败失败，请刷新后重试'));
    }
  }

  // ── 外部渠道退款单（补全）──
  const externalRefunds = ref<EsportsExternalRefund[]>([]);
  const externalRefundLoading = ref(false);
  const refundExecutions = ref<EsportsRechargeRefundExecution[]>([]);
  const batchExecuting = ref(false);
  // 按充值批次退款执行仅充值来源可用（后端按售后来源推导退款账户）。
  const canBatchRefund = computed(
    () => !!detail.value && detail.value.source_type === 'recharge'
  );
  const externalRefundStatusMap: Record<string, string> = {
    registered: '待财务执行',
    executed: '已执行',
  };
  const externalRefundStatusLabel = (value: string) =>
    externalRefundStatusMap[value] || value;

  // 外部退款按售后单归属展示：订单来源按 order_id 过滤，其余来源取最近记录后按 aftersale_id 过滤。
  async function loadExternalRefunds() {
    const record = detail.value;
    if (!record || !canViewExternalRefunds.value) {
      externalRefunds.value = [];
      return;
    }
    externalRefundLoading.value = true;
    try {
      const params =
        record.source_type === 'order' ? { order_no: record.order_no } : {};
      const rows = (await listExternalRefunds(params)).data.data || [];
      externalRefunds.value = rows.filter(
        (row) => row.aftersale_id === record.id
      );
    } catch (err) {
      Message.error(errorText(err, '加载外部退款登记失败'));
    } finally {
      externalRefundLoading.value = false;
    }
  }

  const externalRefundRegisterVisible = ref(false);
  const externalRefundForm = reactive({
    orderNo: '',
    channel: 'wechat_work',
    transactionNo: '',
    amountYuan: 0,
    reason: '',
  });

  function openExternalRefundRegister() {
    externalRefundForm.orderNo =
      detail.value?.source_type === 'order' ? detail.value.order_no || '' : '';
    externalRefundForm.channel = 'wechat_work';
    externalRefundForm.transactionNo = '';
    externalRefundForm.amountYuan = 0;
    externalRefundForm.reason = '';
    externalRefundRegisterVisible.value = true;
  }

  async function submitExternalRefundRegister() {
    const record = detail.value;
    if (!record) return;
    if (
      !externalRefundForm.orderNo.trim() ||
      !externalRefundForm.transactionNo.trim() ||
      externalRefundForm.amountYuan <= 0 ||
      !externalRefundForm.reason.trim()
    ) {
      Message.warning('请填写关联订单、退款渠道、流水号、金额与依据说明');
      return;
    }
    try {
      await registerExternalRefund({
        channel: externalRefundForm.channel,
        transaction_no: externalRefundForm.transactionNo.trim(),
        amount_cents: yuanToCents(externalRefundForm.amountYuan),
        order_no: externalRefundForm.orderNo.trim(),
        aftersale_id: record.id,
        reason: externalRefundForm.reason.trim(),
      });
      externalRefundRegisterVisible.value = false;
      Message.success('已登记外部退款，等待财务核验执行');
      await loadExternalRefunds();
    } catch (err) {
      Message.error(errorText(err, '登记外部退款失败'));
    }
  }

  const externalRefundExecuteVisible = ref(false);
  const externalRefundExecuteForm = reactive({
    id: 0,
    refundNo: '',
    channel: '',
    amountCents: 0,
    orderId: 0,
    afterSaleId: 0,
    transactionNo: '',
  });

  function openExternalRefundExecute(record: EsportsExternalRefund) {
    externalRefundExecuteForm.id = record.id;
    externalRefundExecuteForm.refundNo = record.refund_no;
    externalRefundExecuteForm.channel = record.channel;
    externalRefundExecuteForm.amountCents = record.amount_cents;
    externalRefundExecuteForm.orderId = record.order_id;
    externalRefundExecuteForm.afterSaleId = record.aftersale_id ?? 0;
    externalRefundExecuteForm.transactionNo = '';
    externalRefundExecuteVisible.value = true;
  }

  async function submitExternalRefundExecute() {
    const target = externalRefunds.value.find(
      (row) => row.id === externalRefundExecuteForm.id
    );
    if (!target) return;
    const entered = externalRefundExecuteForm.transactionNo.trim();
    if (!entered) {
      Message.warning('请核对并输入退款流水号');
      return;
    }
    if (entered !== target.transaction_no) {
      Message.warning('输入的流水号与登记单不一致，请核对后再执行');
      return;
    }
    try {
      const res = await executeExternalRefund(target.id);
      externalRefundExecuteVisible.value = false;
      Message.success(
        `外部退款已执行：${externalRefundStatusLabel(
          res.data.data?.status || 'executed'
        )}，订单退款状态已对齐`
      );
      await loadExternalRefunds();
      await load();
    } catch (err) {
      // 支付状态异常 / 存单冻结 / 登记人自行执行等中文原因由后端原样返回。
      Message.error(errorText(err, '执行外部退款失败'));
      await loadExternalRefunds();
    }
  }

  async function executeBatchRefund() {
    const record = detail.value;
    if (!record) return;
    batchExecuting.value = true;
    try {
      const rows =
        (await executeAfterSaleRefundByBatch(record.id)).data.data || [];
      refundExecutions.value = rows;
      Message.success(`已生成 ${rows.length} 条按充值批次的退款执行明细`);
    } catch (err) {
      Message.error(errorText(err, '按批次生成退款执行明细失败'));
    } finally {
      batchExecuting.value = false;
    }
  }

  const financeRefVisible = ref(false);
  const financeRefForm = reactive({
    id: 0,
    executionNo: '',
    financeRef: '',
  });

  function openFinanceRef(record: EsportsRechargeRefundExecution) {
    financeRefForm.id = record.id;
    financeRefForm.executionNo = record.execution_no;
    financeRefForm.financeRef = '';
    financeRefVisible.value = true;
  }

  async function submitFinanceRef() {
    if (!financeRefForm.financeRef.trim()) {
      Message.warning('请填写财务流水号');
      return;
    }
    try {
      const res = await markRechargeRefundExecuted(
        financeRefForm.id,
        financeRefForm.financeRef.trim()
      );
      const updated = res.data.data;
      const index = refundExecutions.value.findIndex(
        (row) => row.id === financeRefForm.id
      );
      if (updated && index >= 0) refundExecutions.value[index] = updated;
      financeRefVisible.value = false;
      Message.success('已登记批次退款打款');
    } catch (err) {
      Message.error(errorText(err, '登记批次退款打款失败'));
    }
  }

  // ── 售后单内沟通记录 / 补证 / 客服回复──
  // 读写均走 api.ts 封装（listAfterSaleMessages / sendAfterSaleMessage /
  // requestAfterSaleEvidence），不再直连裸 axios。
  const messages = ref<EsportsAfterSaleMessage[]>([]);
  const messageLoading = ref(false);
  const messageSending = ref(false);
  const messageForm = reactive({ content: '', internal: false });
  const messageAuthorTypeMap: Record<string, string> = {
    customer: '客户',
    admin: '客服',
    player: '陪玩',
    system: '系统',
  };
  const messageAuthorLabel = (record: EsportsAfterSaleMessage) =>
    `${messageAuthorTypeMap[record.author_type] || record.author_type}${
      record.author_name ? `（${record.author_name}）` : `#${record.author_id}`
    }`;

  async function loadMessages() {
    const record = detail.value;
    if (!record || !canViewMessages.value) {
      messages.value = [];
      return;
    }
    messageLoading.value = true;
    try {
      messages.value = (await listAfterSaleMessages(record.id)).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载沟通记录失败'));
    } finally {
      messageLoading.value = false;
    }
  }

  // ：客服回复（visibility=internal 为内部备注，客户不可见）；成功后就地刷新消息流。
  async function submitMessage() {
    const record = detail.value;
    if (!record) return;
    const content = messageForm.content.trim();
    if (!content) {
      Message.warning('请填写回复内容');
      return;
    }
    messageSending.value = true;
    try {
      await sendAfterSaleMessage(record.id, {
        content,
        visibility: messageForm.internal ? 'internal' : 'all',
      });
      messageForm.content = '';
      messageForm.internal = false;
      Message.success('已发送沟通记录');
      await loadMessages();
    } catch (err) {
      Message.error(errorText(err, '发送失败：内容须为 1–1000 字'));
    } finally {
      messageSending.value = false;
    }
  }

  const evidenceRequestVisible = ref(false);
  const evidenceRequestForm = reactive({ note: '' });

  function openEvidenceRequest() {
    evidenceRequestForm.note = '';
    evidenceRequestVisible.value = true;
  }

  async function submitEvidenceRequest() {
    const record = detail.value;
    if (!record) return;
    const note = evidenceRequestForm.note.trim();
    if (!note) {
      Message.warning('请填写补证说明');
      return;
    }
    try {
      await requestAfterSaleEvidence(record.id, { note });
      evidenceRequestVisible.value = false;
      Message.success('已提示客户补证，客户侧可在售后单内看到该提示');
      await loadMessages();
    } catch (err) {
      Message.error(errorText(err, '提示客户补证失败'));
    }
  }

  // ── 售后自动建单规则与命中留痕──
  const rules = ref<EsportsAfterSaleRule[]>([]);
  // 售后规则范围展示商品名而不是 商品 ID；商品下拉自身按关键词远程取数。
  const skus = ref<EsportsSku[]>([]);
  const skuLabel = (skuId: number) =>
    skus.value.find((sku) => sku.id === skuId)?.title || '未知商品';
  async function loadSkuLabels() {
    try {
      skus.value = (await listSkus({ limit: 500 })).data.data || [];
    } catch {
      // 商品名读取失败时规则仍可维护，范围展示回落「未知商品」。
    }
  }
  const ruleLoading = ref(false);
  const ruleStatusFilter = ref('');
  const ruleHits = ref<AfterSaleRuleHit[]>([]);
  const ruleHitLoading = ref(false);
  const ruleHitRuleFilter = ref(0);
  const ruleHitSourceFilter = ref('');
  const ruleHitPendingFilter = ref('');
  const ruleTriggerMap: Record<string, string> = {
    order_closed: '结单后',
    service_segment_finished: '服务段结束',
    gift_paid: '礼物支付完成',
    manual: '人工触发（暂不支持）',
  };
  const ruleTriggerLabel = (value: string) => ruleTriggerMap[value] || value;
  const ruleMetricMap: Record<string, string> = {
    amount_deviation_bp: '金额偏差（基点）',
    amount_over_cents: '金额超出（元）',
    duration_shortage_minutes: '时长不足（分钟）',
    duration_shortage_bp: '时长不足（基点）',
    none: '不判定',
  };
  const ruleMetricLabel = (record: EsportsAfterSaleRule) => {
    const metric = ruleMetricMap[record.metric] || record.metric;
    if (record.metric === 'none') return metric;
    if (record.metric === 'amount_over_cents') {
      return `${metric} ≥ ${money(record.threshold_value)}`;
    }
    if (record.metric === 'duration_shortage_minutes') {
      return `${metric} ≥ ${record.threshold_value} 分钟`;
    }
    return `${metric} ≥ ${record.threshold_value / 100}%`;
  };
  // 命中留痕只存度量值与阈值，按规则编码反查口径后换算成友好单位展示（分 → 元、基点 → %）。
  const ruleHitMetricText = (record: AfterSaleRuleHit) => {
    const metric = rules.value.find(
      (item) => item.code === record.rule_code
    )?.metric;
    if (!metric) return `${record.metric_value} / ${record.threshold_value}`;
    const text = (value: number) => {
      if (metric === 'amount_over_cents') return money(value);
      if (metric === 'amount_deviation_bp' || metric === 'duration_shortage_bp')
        return `${value / 100}%`;
      if (metric === 'duration_shortage_minutes') return `${value} 分钟`;
      return String(value);
    };
    return `${text(record.metric_value)} / ${text(record.threshold_value)}`;
  };
  const ruleScopeLabel = (record: EsportsAfterSaleRule) => {
    const parts: string[] = [];
    if (record.scope_game) parts.push(record.scope_game);
    if (record.scope_product_id)
      parts.push(`商品：${skuLabel(record.scope_product_id)}`);
    return parts.length ? parts.join(' / ') : '全部';
  };
  const ruleStatusMap: Record<string, string> = {
    draft: '草稿',
    active: '启用',
    disabled: '停用',
  };
  const ruleStatusLabel = (value: string) => ruleStatusMap[value] || value;
  const ruleStatusColor = (value: string) => {
    switch (value) {
      case 'active':
        return 'green';
      case 'disabled':
        return 'gray';
      default:
        return 'orange';
    }
  };
  const ruleHitLabel = (record: AfterSaleRuleHit) =>
    `${record.rule_code || '—'}（#${record.rule_id}）`;

  async function loadRules() {
    if (!canListRules.value) return;
    ruleLoading.value = true;
    try {
      const params = ruleStatusFilter.value
        ? { status: ruleStatusFilter.value as AfterSaleRuleStatus }
        : {};
      rules.value = (await listAfterSaleRules(params)).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载售后规则失败'));
    } finally {
      ruleLoading.value = false;
    }
  }

  async function loadRuleHits() {
    if (!canViewRuleHits.value) return;
    ruleHitLoading.value = true;
    try {
      const params: {
        rule_id?: number;
        source_type?: string;
        pending?: boolean;
      } = {};
      if (ruleHitRuleFilter.value > 0) {
        params.rule_id = ruleHitRuleFilter.value;
      }
      if (ruleHitSourceFilter.value) {
        params.source_type = ruleHitSourceFilter.value;
      }
      if (ruleHitPendingFilter.value) params.pending = true;
      ruleHits.value = (await listAfterSaleRuleHits(params)).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载规则命中留痕失败'));
    } finally {
      ruleHitLoading.value = false;
    }
  }

  const ruleModalVisible = ref(false);
  const ruleForm = reactive({
    id: 0,
    version: 0,
    code: '',
    name: '',
    sourceType: 'order' as AfterSaleRuleSourceType,
    triggerEvent: 'order_closed' as AfterSaleRuleTriggerEvent,
    metric: 'amount_deviation_bp' as AfterSaleRuleMetric,
    // 表单按百分比录入，默认 5%（保存时换算为 500 基点）。
    thresholdValue: 5,
    windowMinutes: 1440,
    scopeGame: '',
    scopeSkuId: 0,
    afterSaleKind: 'service_mismatch' as AfterSaleKind,
    channel: 'system' as 'system' | 'admin',
    faultParty: 'undetermined' as AfterSaleFaultParty,
    autoCreate: true,
    priority: 100,
    note: '',
    status: 'draft' as AfterSaleRuleStatus,
  });

  // 触发时机 / 判定口径 / 问题类型都受「来源类型」约束，选项与后端校验保持一致。
  const ruleTriggerOptions = computed(() => {
    if (ruleForm.sourceType === 'gift') {
      return [{ value: 'gift_paid', label: '礼物支付完成' }];
    }
    return [
      { value: 'order_closed', label: '结单后' },
      { value: 'service_segment_finished', label: '服务段结束' },
    ];
  });
  const ruleMetricOptions = computed(() => {
    const none = { value: 'none', label: '不判定（只按触发时机建单）' };
    if (ruleForm.sourceType === 'gift') {
      return [
        { value: 'amount_deviation_bp', label: '金额偏差（基点）' },
        { value: 'amount_over_cents', label: '金额超出（元）' },
        none,
      ];
    }
    return [
      { value: 'amount_deviation_bp', label: '金额偏差（基点）' },
      { value: 'amount_over_cents', label: '金额超出（元）' },
      { value: 'duration_shortage_minutes', label: '时长不足（分钟）' },
      { value: 'duration_shortage_bp', label: '时长不足（基点）' },
      none,
    ];
  });
  const ruleKindOptions = computed(() => {
    const allow = kindAllowBySource[ruleForm.sourceType] || [];
    return allow.length
      ? kindOptions.filter((item) => allow.includes(item.value))
      : kindOptions;
  });
  const ruleThresholdLabel = computed(() => {
    switch (ruleForm.metric) {
      case 'amount_deviation_bp':
      case 'duration_shortage_bp':
        return '阈值（%，0.01–100）';
      case 'amount_over_cents':
        return '阈值（元）';
      case 'duration_shortage_minutes':
        return '阈值（分钟）';
      default:
        return '阈值（不判定口径固定 0）';
    }
  });
  // 百分比 / 金额口径允许两位小数，时长口径只收整数分钟。
  const ruleThresholdPrecision = computed(() =>
    ruleForm.metric === 'duration_shortage_minutes' ? 0 : 2
  );

  // 阈值表单单位与后端存储单位不同：百分比 / 元口径 ×100 转换为基点 / 分，
  // 时长口径两边都是分钟原样提交。表单展示时反向除回。
  function thresholdToBackend(
    metric: AfterSaleRuleMetric,
    value: number
  ): number {
    if (
      metric === 'amount_deviation_bp' ||
      metric === 'duration_shortage_bp' ||
      metric === 'amount_over_cents'
    ) {
      return Math.round(value * 100);
    }
    return Math.round(value);
  }
  function thresholdFromBackend(
    metric: AfterSaleRuleMetric,
    value: number
  ): number {
    if (
      metric === 'amount_deviation_bp' ||
      metric === 'duration_shortage_bp' ||
      metric === 'amount_over_cents'
    ) {
      return value / 100;
    }
    return value;
  }

  function onRuleSourceChange(value: unknown) {
    const source = String(value) as AfterSaleRuleSourceType;
    ruleForm.triggerEvent = source === 'gift' ? 'gift_paid' : 'order_closed';
    ruleForm.metric =
      source === 'gift' ? 'amount_over_cents' : 'amount_deviation_bp';
    const allow = kindAllowBySource[source] || [];
    ruleForm.afterSaleKind = (
      allow.length ? allow[0] : 'other'
    ) as AfterSaleKind;
  }

  function onRuleMetricChange(value: unknown) {
    if (String(value) === 'none') ruleForm.thresholdValue = 0;
  }

  function openRuleCreate() {
    ruleForm.id = 0;
    ruleForm.version = 0;
    ruleForm.code = '';
    ruleForm.name = '';
    ruleForm.sourceType = 'order';
    ruleForm.triggerEvent = 'order_closed';
    ruleForm.metric = 'amount_deviation_bp';
    ruleForm.thresholdValue = 5;
    ruleForm.windowMinutes = 1440;
    ruleForm.scopeGame = '';
    ruleForm.scopeSkuId = 0;
    ruleForm.afterSaleKind = 'service_mismatch';
    ruleForm.channel = 'system';
    ruleForm.faultParty = 'undetermined';
    ruleForm.autoCreate = true;
    ruleForm.priority = 100;
    ruleForm.note = '';
    ruleForm.status = 'draft';
    ruleModalVisible.value = true;
  }

  async function openRuleEdit(record: EsportsAfterSaleRule) {
    try {
      // 编辑走版本乐观锁：先取详情拿最新 version，避免用列表里的旧版本提交。
      const latest = (await getAfterSaleRule(record.id)).data.data;
      const item = latest || record;
      ruleForm.id = item.id;
      ruleForm.version = item.version;
      ruleForm.code = item.code;
      ruleForm.name = item.name;
      ruleForm.sourceType = item.source_type;
      ruleForm.triggerEvent = item.trigger_event;
      ruleForm.metric = item.metric;
      ruleForm.thresholdValue = thresholdFromBackend(
        item.metric,
        item.threshold_value
      );
      ruleForm.windowMinutes = item.window_minutes;
      ruleForm.scopeGame = item.scope_game;
      ruleForm.scopeSkuId = item.scope_product_id ?? 0;
      ruleForm.afterSaleKind = item.after_sale_kind;
      ruleForm.channel = item.channel;
      ruleForm.faultParty = item.fault_party as AfterSaleFaultParty;
      ruleForm.autoCreate = item.auto_create;
      ruleForm.priority = item.priority;
      ruleForm.note = item.note;
      ruleForm.status = item.status;
      ruleModalVisible.value = true;
    } catch (err) {
      Message.error(errorText(err, '读取规则详情失败'));
    }
  }

  function rulePayload(): AfterSaleRuleInput {
    return {
      code: ruleForm.code.trim(),
      name: ruleForm.name.trim(),
      source_type: ruleForm.sourceType,
      trigger_event: ruleForm.triggerEvent,
      metric: ruleForm.metric,
      threshold_value: thresholdToBackend(
        ruleForm.metric,
        ruleForm.thresholdValue
      ),
      window_minutes: ruleForm.windowMinutes,
      scope_game: ruleForm.scopeGame.trim(),
      scope_product_id: ruleForm.scopeSkuId > 0 ? ruleForm.scopeSkuId : null,
      after_sale_kind: ruleForm.afterSaleKind,
      channel: ruleForm.channel,
      fault_party: ruleForm.faultParty,
      auto_create: ruleForm.autoCreate,
      priority: ruleForm.priority,
      note: ruleForm.note.trim(),
      status: ruleForm.status,
    };
  }

  function ruleFormError(): string {
    if (!ruleForm.name.trim()) return '请填写规则名称';
    if (ruleForm.priority < 0 || ruleForm.priority > 1000) {
      return '优先级须为 0–1000';
    }
    return '';
  }

  async function submitRule() {
    const error = ruleFormError();
    if (error) {
      Message.warning(error);
      return;
    }
    try {
      if (ruleForm.id > 0) {
        await updateAfterSaleRule(ruleForm.id, {
          ...rulePayload(),
          version: ruleForm.version,
        });
        Message.success('已保存规则');
      } else {
        await createAfterSaleRule(rulePayload());
        Message.success('已创建规则');
      }
      ruleModalVisible.value = false;
      await loadRules();
      if (canViewRuleHits.value) await loadRuleHits();
    } catch (err) {
      Message.error(errorText(err, '保存规则失败'));
    }
  }

  async function deleteRuleItem(record: EsportsAfterSaleRule) {
    try {
      await deleteAfterSaleRule(record.id);
      Message.success('已删除规则');
      await loadRules();
      if (canViewRuleHits.value) await loadRuleHits();
    } catch (err) {
      Message.error(
        errorText(err, '删除规则失败：已产生命中留痕的规则请改为停用')
      );
    }
  }

  // ── 补履约任务 ──
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

  async function showDetail(id: number) {
    try {
      const item = (await getAfterSale(id)).data.data || null;
      detail.value = item;
      detailOrderNo.value = '';
      orderPaymentStatus.value = '';
      externalRefunds.value = [];
      refundExecutions.value = [];
      messages.value = [];
      // 只有订单来源才去补订单号与支付状态；礼物 / 充值 / 考核来源没有订单上下文。
      if (item && item.source_type === 'order') {
        try {
          const order = (await getOrder(item.source_id)).data.data;
          detailOrderNo.value = order?.order_no || '';
          orderPaymentStatus.value = order?.payment_status || '';
        } catch {
          detailOrderNo.value = '';
          orderPaymentStatus.value = '';
        }
      }
      detailVisible.value = true;
      reviews.value = [];
      await Promise.all([
        loadDetailActions(id),
        loadReviews(),
        loadExternalRefunds(),
        loadMessages(),
      ]);
    } catch {
      Message.error('无法获取售后详情');
    }
  }

  onMounted(() => {
    load();
    loadMakeups();
    // 规则 / 命中留痕只在有对应查看权限时加载，避免无权限账号反复 403。
    if (canListRules.value) {
      loadRules();
      loadSkuLabels();
    }
    if (canViewRuleHits.value) loadRuleHits();
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

  .section-tip {
    display: block;
    margin-bottom: 12px;
  }

  .block-gap {
    margin-bottom: 12px;
  }

  .summary {
    margin-bottom: 12px;
  }

  .action-row {
    padding: 6px 0;
    border-bottom: 1px dashed var(--color-border-2);
  }

  .action-seq {
    color: var(--color-text-3);
    font-size: 12px;
  }

  .message-reply {
    margin-top: 12px;
  }

  .message-reply-actions {
    margin-top: 8px;
  }
</style>
