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
          <a-table-column title="来源单据">
            <template #cell="{ record }"
              >{{ sourceTypeLabel(record.source_type) }} #{{
                record.source_id
              }}</template
            >
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

      <a-divider>动作项与逐项进度（§13.6）</a-divider>
      <template v-if="detailActions">
        <a-space wrap class="summary">
          <a-tag>共 {{ detailActions.progress.total }} 项</a-tag>
          <a-tag color="green"
            >成功 {{ detailActions.progress.succeeded }}</a-tag
          >
          <a-tag color="red">失败 {{ detailActions.progress.failed }}</a-tag>
          <a-tag color="gray"
            >待执行 {{ detailActions.progress.pending }}</a-tag
          >
        </a-space>
        <a-table
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
              <template #cell="{ record }">{{ actionDetail(record) }}</template>
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

      <a-divider>复核申请（§13.6）</a-divider>
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
      <a-table :data="reviews" row-key="id" :pagination="false" size="small">
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
    </a-drawer>

    <a-modal
      v-model:visible="reviewRequestVisible"
      title="发起售后复核"
      @ok="submitReviewRequest"
      @cancel="reviewRequestVisible = false"
    >
      <a-form :model="reviewRequestForm">
        <a-form-item label="复核理由" required>
          <a-textarea v-model="reviewRequestForm.reason" :max-length="500" />
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
            private/esports/aftersale，最多 20 个），非空时后端校验归属与 MIME
            并写入复核单的 evidence_ref。
          </a-typography-text>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="reviewDecisionVisible"
      :title="
        reviewDecisionForm.decision === 'reopen' ? '发回重新处理' : '维持原结论'
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
              private/esports/aftersale，最多 20 个）；非空时后端校验附件归属与
              MIME 并把引用写入 evidence_ref（JSON 数组），引用他人附件会被拒。
            </a-typography-text>
            <span v-if="evidenceSelectedText">{{ evidenceSelectedText }}</span>
          </a-space>
        </a-form-item>
        <a-form-item label="凭证说明 / 编号（可选）">
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
          <template v-else>
            <a-form-item label="赔付金额（元）">
              <a-input-number
                v-model="planForm.refundYuan"
                :min="0"
                :precision="2"
              />
            </a-form-item>
            <a-form-item label="争议陪玩 ID（0 = 不指定）">
              <a-input-number v-model="planForm.disputePlayerId" :min="0" />
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
                    <a-input-number
                      v-if="action.actionType === 'refund'"
                      v-model="action.disputePlayerId"
                      :min="0"
                      placeholder="争议陪玩 ID"
                      :style="{ width: '140px' }"
                    />
                  </template>
                  <template v-else>
                    <a-input-number
                      v-model="action.playerId"
                      :min="1"
                      placeholder="承接陪玩 ID"
                      :style="{ width: '140px' }"
                    />
                    <a-input-number
                      v-model="action.seatIndex"
                      :min="1"
                      placeholder="席位"
                      :style="{ width: '100px' }"
                    />
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
              售后执行会生成待审批的陪玩追偿单（§13.4），审批通过后从陪玩猫粮扣回；
              与「退款冲回分成」相互独立，且不得超过赔付金额。
            </a-typography-text>
          </a-form-item>
          <a-form-item
            v-if="planForm.recoveryYuan > 0"
            label="追偿陪玩 ID"
            required
          >
            <a-input-number v-model="planForm.recoveryPlayerId" :min="1" />
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
  import AttachmentSelector from '@/components/attachment-selector/index.vue';
  import type { AttachmentResponse } from '@/types/api';
  import {
    acceptAfterSale,
    approveAfterSale,
    completeFulfillmentMakeup,
    createAfterSale,
    decideAfterSaleReview,
    executeAfterSale,
    executeAfterSaleAction,
    getAfterSale,
    getOrder,
    listAfterSaleActions,
    listAfterSales,
    listAfterSaleReviews,
    listFulfillmentMakeups,
    planAfterSale,
    rejectAfterSale,
    requestAfterSaleReview,
    startFulfillmentMakeup,
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
    AfterSaleSourceType,
    EsportsAfterSale,
    EsportsAfterSaleAction,
    EsportsAfterSaleReview,
    EsportsFulfillmentMakeup,
    MakeupKind,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canOperate = computed(() =>
    hasButtonPermission('esports:aftersales:operate')
  );
  // 复核三权限（§13.6）：申请 / 异人审查 / 撤回，各自独立。
  const canRequestReview = computed(() =>
    hasButtonPermission('esports:aftersales:review_request')
  );
  const canDecideReview = computed(() =>
    hasButtonPermission('esports:aftersales:review_decide')
  );
  const canWithdrawReview = computed(() =>
    hasButtonPermission('esports:aftersales:review_withdraw')
  );

  const loading = ref(false);
  const statusFilter = ref('');
  const items = ref<EsportsAfterSale[]>([]);
  const detail = ref<EsportsAfterSale | null>(null);
  const detailOrderNo = ref('');
  const detailVisible = ref(false);

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

  // ── 动作项与逐项进度（§13.6） ──
  const detailActions = ref<{
    progress: AfterSaleActionProgress;
    actions: EsportsAfterSaleAction[];
  } | null>(null);
  const actionExecuting = ref(0);
  const actionStatusMap: Record<AfterSaleActionStatus, string> = {
    pending: '待执行',
    executing: '执行中',
    succeeded: '已成功',
    failed: '执行失败',
    skipped: '已跳过',
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
      case 'skipped':
        return 'gray';
      default:
        return 'orange';
    }
  };
  // 动作项参数摘要：资金类展示金额与争议陪玩，补履约类展示承接陪玩 / 席位 / 补足量 / 公司承担。
  const actionDetail = (action: EsportsAfterSaleAction) => {
    if (
      action.action_type === 'refund' ||
      action.action_type === 'compensate'
    ) {
      const dispute =
        action.dispute_player_id && action.dispute_player_id > 0
          ? `，争议陪玩 #${action.dispute_player_id}`
          : '';
      return `金额 ${money(action.amount_cents)}${dispute}`;
    }
    return `陪玩 #${action.player_id ?? '—'}，席位 ${
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

  // ── 终态售后复核（§13.6） ──
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
  // §13.1 / §13.3 统一售后来源：按来源切换 ID 字段名，并限制可选问题类型。
  const sourceTypeOptions: { value: AfterSaleSourceType; label: string }[] = [
    { value: 'order', label: '服务订单' },
    { value: 'gift', label: '礼物单' },
    { value: 'stored_value_card', label: '储值卡' },
    { value: 'recharge', label: '充值流水' },
    { value: 'assessment', label: '考核记录' },
  ];
  const sourceTypeMap: Record<string, string> = Object.fromEntries(
    sourceTypeOptions.map((item) => [item.value, item.label])
  );
  const createVisible = ref(false);
  // 建单凭证附件（§13.2）：只可引用本人上传的私有附件，后端校验归属与 MIME 后才落 evidence_ref。
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
      case 'stored_value_card':
        return '储值卡 ID';
      case 'recharge':
        return '充值流水 ID';
      case 'assessment':
        return '考核记录 ID';
      default:
        return '订单 ID';
    }
  });
  const kindAllowBySource: Record<AfterSaleSourceType, string[]> = {
    order: [],
    gift: ['refund_request', 'wrong_item', 'overcharge', 'other'],
    stored_value_card: ['refund_request', 'overcharge', 'other'],
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

  const planVisible = ref(false);
  const planTarget = ref<EsportsAfterSale | null>(null);
  // 多动作方案的动作项草稿（§13.6）：金额 / 公司承担在前端按「元」录入，提交时转「分」。
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
    key: crypto.randomUUID(),
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
    // 方案模式（§13.6）：single 走既有单动作路径，multi 提交多动作项并逐项执行。
    mode: 'single' | 'multi';
    faultParty: AfterSaleFaultParty;
    planAction: AfterSalePlanAction;
    refundYuan: number;
    resolution: string;
    actions: PlanActionDraft[];
    // 补履约方案参数（§13.6）：plan_action=makeup_service 时使用。
    makeupKind: MakeupKind;
    makeupPlayerId: number;
    makeupSeatIndex: number;
    makeupUnits: number;
    makeupCompanyPayYuan: number;
    // 追偿（§13.4）：责任方为陪玩时可填向陪玩追偿的陪玩与金额。
    recoveryPlayerId: number;
    recoveryYuan: number;
    // 争议涉及陪玩（§13.3 成员明细冲回）：退款类方案可指定优先冲回该成员分成。
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
  // 多动作方案的动作项校验（§13.6）：资金类金额须大于零；补履约须给承接陪玩与订单内席位，
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
      input.amount_cents = Math.round(action.amountYuan * 100);
      if (action.actionType === 'refund' && action.disputePlayerId > 0) {
        input.dispute_player_id = action.disputePlayerId;
      }
      return input;
    }
    input.player_id = action.playerId;
    input.seat_index = action.seatIndex;
    input.units = action.units;
    input.company_pay_cents = Math.round(action.companyPayYuan * 100);
    return input;
  }
  // 多动作方案的聚合摘要（§13.6）：plan_action 取主导类型，refund_cents 由后端按动作项求和。
  const multiPlanSummary = computed<AfterSalePlanAction>(() => {
    const types = planForm.actions.map((action) => action.actionType);
    if (types.includes('refund')) return 'refund_original';
    if (types.includes('compensate')) return 'compensate';
    return 'makeup_service';
  });

  const rejectVisible = ref(false);
  const rejectTarget = ref<EsportsAfterSale | null>(null);
  const rejectForm = reactive({ reason: '' });

  async function showDetail(id: number) {
    try {
      const item = (await getAfterSale(id)).data.data || null;
      detail.value = item;
      detailOrderNo.value = '';
      // 只有订单来源才去补订单号；礼物 / 储值卡 / 充值 / 考核来源没有订单上下文。
      if (item && item.source_type === 'order') {
        try {
          detailOrderNo.value =
            (await getOrder(item.source_id)).data.data?.order_no || '';
        } catch {
          detailOrderNo.value = '';
        }
      }
      detailVisible.value = true;
      reviews.value = [];
      await Promise.all([loadDetailActions(id), loadReviews()]);
    } catch {
      Message.error('无法获取售后详情');
    }
  }

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
    planVisible.value = true;
  }

  async function submitPlan() {
    const record = planTarget.value;
    if (!record) return;
    const payload: AfterSalePlanInput = {
      fault_party: planForm.faultParty,
      plan_action: planForm.planAction,
      refund_cents: Math.round(planForm.refundYuan * 100),
      resolution: planForm.resolution.trim(),
    };
    if (planForm.mode === 'multi') {
      // 多动作方案（§13.6）：refund_cents 由后端按资金类动作项求和，这里固定送 0。
      const error = planActionError();
      if (error) {
        Message.warning(error);
        return;
      }
      payload.plan_action = multiPlanSummary.value;
      payload.refund_cents = 0;
      payload.actions = planForm.actions.map(planActionInput);
      if (planForm.recoveryYuan > 0) {
        payload.recovery_cents = Math.round(planForm.recoveryYuan * 100);
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
        // 补履约不产生退款金额（§13.6）。
        payload.refund_cents = 0;
        payload.makeup_kind = planForm.makeupKind;
        payload.makeup_player_id = planForm.makeupPlayerId;
        payload.makeup_seat_index = planForm.makeupSeatIndex;
        payload.makeup_units = planForm.makeupUnits;
        payload.makeup_company_pay_cents = Math.round(
          planForm.makeupCompanyPayYuan * 100
        );
      } else if (planForm.recoveryYuan > 0) {
        // 追偿（§13.4）：赔付由陪玩承担时另建待审批的追偿明细。
        payload.recovery_cents = Math.round(planForm.recoveryYuan * 100);
        payload.recovery_player_id = planForm.recoveryPlayerId;
      }
      if (
        planForm.planAction !== 'makeup_service' &&
        planForm.disputePlayerId > 0
      ) {
        // 争议涉及陪玩（§13.3）：退款类方案可指定优先冲回该成员分成。
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
</style>
