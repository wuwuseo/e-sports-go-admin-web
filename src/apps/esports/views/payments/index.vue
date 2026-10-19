<template>
  <div class="container">
    <a-alert
      v-if="whitelistBlocked"
      class="whitelist-alert"
      type="warning"
      show-icon
      closable
      @close="whitelistBlocked = false"
    >
      <template #title>
        未配置收款主体白名单（app.esports.payment_subject_whitelist）
      </template>
      白名单未配置时，提交 / 审核任何收款主体都会被后端一律拒绝（fail-closed）。
      请先在系统配置登记工作室主体名称（逗号分隔）后再提交或审核收款账户。
    </a-alert>

    <a-card class="general-card" title="上线自检（§18）">
      <div class="hint">
        逐项检查上线所需配置。「未配置」表示该能力目前只是代码闭环、实际不可用；
        标「降级」的项不影响交易主链路，但对应能力会走人工或缺失。
      </div>
      <div class="readiness-banner">
        <a-tag :color="!readiness ? 'gray' : readiness.ready ? 'green' : 'red'">
          {{
            !readiness
              ? '未检查'
              : readiness.ready
              ? '满足上线最低条件'
              : `存在 ${readiness.blockers} 个阻断项`
          }}
        </a-tag>
        <span v-if="readiness" class="muted">
          降级 {{ readiness.degraded }} 项 ·
          {{ new Date(readiness.generated_at).toLocaleString() }}
        </span>
        <a-button size="mini" :loading="readinessLoading" @click="loadReadiness"
          >重新检查</a-button
        >
      </div>
      <a-table
        :data="readiness?.checks || []"
        :loading="readinessLoading"
        row-key="key"
        :pagination="false"
        size="small"
      >
        <template #columns>
          <a-table-column title="检查项" :width="190">
            <template #cell="{ record }">{{ record.name }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="90">
            <template #cell="{ record }">
              <a-tag :color="readinessColor(record.status)">{{
                readinessText(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="说明">
            <template #cell="{ record }">{{ record.detail }}</template>
          </a-table-column>
          <a-table-column title="下一步" :width="280">
            <template #cell="{ record }">{{ record.action || '—' }}</template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="收款方式启停（§4.3）">
      <div class="hint">
        仅工作室主体名下、经财务审核启用的收款账户可用于核销；客服提交账户资料但不具备启用权限。
        停用某收款方式后不再接受新的到账凭证，进行中的待核验收款仍由财务处理。
      </div>
      <a-table
        :data="channels"
        :loading="channelsLoading"
        row-key="channel"
        :pagination="false"
      >
        <template #columns>
          <a-table-column title="收款方式" :width="180">
            <template #cell="{ record }">{{
              channelText(record.channel)
            }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="110">
            <template #cell="{ record }">
              <a-tag :color="record.enabled ? 'green' : 'gray'">{{
                record.enabled ? '启用' : '停用'
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="启用中的收款账户" :width="160">
            <template #cell="{ record }">{{ record.active_accounts }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="140">
            <template #cell="{ record }">
              <a-button
                v-if="canToggleChannel"
                type="text"
                @click="toggleChannel(record)"
                >{{ record.enabled ? '停用' : '启用' }}</a-button
              >
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="收款账户（§4.3 财务审核）">
      <a-space class="toolbar">
        <a-select
          v-model="accountFilterChannel"
          placeholder="全部收款方式"
          allow-clear
          :style="{ width: '180px' }"
        >
          <a-option
            v-for="(label, key) in channelMap"
            :key="key"
            :value="key"
            >{{ label }}</a-option
          >
        </a-select>
        <a-select
          v-model="accountFilterStatus"
          placeholder="全部状态"
          allow-clear
          :style="{ width: '150px' }"
        >
          <a-option value="pending_review">待审核</a-option>
          <a-option value="active">已启用</a-option>
          <a-option value="rejected">已驳回</a-option>
          <a-option value="disabled">已停用</a-option>
        </a-select>
        <a-button @click="loadAccounts">查询</a-button>
        <a-button
          v-if="canCreateAccount"
          type="primary"
          @click="openAccountCreate"
          >提交收款账户</a-button
        >
      </a-space>
      <div class="hint">
        收款主体须先在系统配置 app.esports.payment_subject_whitelist
        登记（逗号分隔）；白名单未配置时后端会拒绝提交与审核。
      </div>
      <a-table
        :data="accounts"
        :loading="accountsLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column title="收款方式" :width="150">
            <template #cell="{ record }">{{
              channelText(record.channel)
            }}</template>
          </a-table-column>
          <a-table-column data-index="subject_name" title="收款主体" />
          <a-table-column data-index="account_no" title="账号 / 商户号" />
          <a-table-column data-index="bank_name" title="开户行" :width="140" />
          <a-table-column title="状态" :width="110">
            <template #cell="{ record }">
              <a-tag :color="accountStatusColor(record.status)">{{
                accountStatusText(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column data-index="review_resolution" title="审核说明" />
          <a-table-column title="操作" :width="180">
            <template #cell="{ record }">
              <a-button
                v-if="record.status === 'pending_review' && canReviewAccount"
                type="text"
                @click="openAccountReview(record)"
                >审核</a-button
              >
              <a-button
                v-else-if="record.status === 'active' && canDisableAccount"
                type="text"
                status="danger"
                @click="disableAccount(record)"
                >停用</a-button
              >
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="收款核验">
      <a-tabs
        v-model:active-key="settleTab"
        :style="{ marginTop: '-12px' }"
        @change="onSettleTabChange"
      >
        <a-tab-pane key="proofs" title="待核验收款（§4.2）" />
        <a-tab-pane
          v-if="canListReversal"
          key="reversals"
          title="撤销 / 拒付（§3.2）"
        />
        <a-tab-pane
          v-if="canListRefundExecutions"
          key="refundExecutions"
          title="退款执行批次（§4.5）"
        />
      </a-tabs>

      <template v-if="settleTab === 'proofs'">
        <a-space class="toolbar">
          <a-select
            v-model="proofFilterStatus"
            placeholder="全部状态"
            allow-clear
            :style="{ width: '160px' }"
          >
            <a-option value="pending_verification">待核验</a-option>
            <a-option value="verified">已核销</a-option>
            <a-option value="rejected">已驳回</a-option>
          </a-select>
          <a-button :loading="proofsLoading" @click="loadProofs">刷新</a-button>
          <a-button
            v-if="canSubmitProof"
            type="primary"
            @click="openProofCreate"
            >提交到账凭证</a-button
          >
        </a-space>
        <div class="hint">
          核验前必须先查看凭证：点「查看凭证」核对凭证图片与到账金额后，再在弹窗内核销或驳回。
        </div>
        <a-table
          :data="proofs"
          :loading="proofsLoading"
          row-key="id"
          :pagination="{ pageSize: 10 }"
        >
          <template #columns>
            <a-table-column data-index="proof_no" title="凭证号" :width="200" />
            <a-table-column data-index="order_id" title="订单" :width="90" />
            <a-table-column title="收款方式" :width="150">
              <template #cell="{ record }">{{
                channelText(record.channel)
              }}</template>
            </a-table-column>
            <a-table-column data-index="transaction_no" title="渠道流水号" />
            <a-table-column title="到账金额" :width="120">
              <template #cell="{ record }">{{
                yuan(record.amount_cents)
              }}</template>
            </a-table-column>
            <a-table-column data-index="proof_ref" title="凭证" />
            <a-table-column title="状态" :width="110">
              <template #cell="{ record }">
                <a-tag :color="proofStatusColor(record.status)">{{
                  proofStatusText(record.status)
                }}</a-tag>
              </template>
            </a-table-column>
            <a-table-column data-index="resolution" title="核验说明" />
            <a-table-column title="操作" :width="120">
              <template #cell="{ record }">
                <a-button type="text" @click="openProofDetail(record)"
                  >查看凭证</a-button
                >
              </template>
            </a-table-column>
          </template>
        </a-table>
      </template>

      <template v-else-if="settleTab === 'reversals'">
        <a-space class="toolbar">
          <a-select
            v-model="reversalFilterStatus"
            placeholder="全部状态"
            allow-clear
            :style="{ width: '160px' }"
          >
            <a-option value="pending">待处置</a-option>
            <a-option value="handled">已处置</a-option>
            <a-option value="rejected">已认定误报</a-option>
          </a-select>
          <a-input-number
            v-model="reversalFilterOrderId"
            placeholder="按订单 ID 筛选"
            :min="0"
            :style="{ width: '170px' }"
          />
          <a-button :loading="reversalsLoading" @click="loadReversals"
            >查询</a-button
          >
          <a-button
            v-if="canRegisterReversal"
            type="primary"
            @click="openReversalCreate"
            >登记撤销 / 拒付</a-button
          >
        </a-space>
        <div class="hint">
          渠道撤销 /
          拒付只记账与告警，不改订单资金状态；订单如何处置由非登记人的管理员在「处置」中明确。
        </div>
        <a-table
          :data="reversals"
          :loading="reversalsLoading"
          row-key="id"
          :pagination="{ pageSize: 10 }"
        >
          <template #columns>
            <a-table-column
              data-index="reversal_no"
              title="撤销号"
              :width="200"
            />
            <a-table-column data-index="order_id" title="订单" :width="80" />
            <a-table-column
              data-index="receipt_id"
              title="收款回执"
              :width="90"
            />
            <a-table-column title="收款方式" :width="140">
              <template #cell="{ record }">{{
                channelText(record.channel)
              }}</template>
            </a-table-column>
            <a-table-column data-index="transaction_no" title="渠道流水号" />
            <a-table-column title="撤销金额" :width="120">
              <template #cell="{ record }">{{
                yuan(record.amount_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="类型" :width="100">
              <template #cell="{ record }">{{
                reversalKindText(record.kind)
              }}</template>
            </a-table-column>
            <a-table-column title="状态" :width="110">
              <template #cell="{ record }">
                <a-tag :color="reversalStatusColor(record.status)">{{
                  reversalStatusText(record.status)
                }}</a-tag>
              </template>
            </a-table-column>
            <a-table-column title="原因" :width="180">
              <template #cell="{ record }">
                <a-tooltip :content="record.reason">
                  <span>{{ record.reason }}</span>
                </a-tooltip>
              </template>
            </a-table-column>
            <a-table-column title="处置结论" :width="200">
              <template #cell="{ record }">
                <div v-if="record.action && record.action !== 'none'">
                  {{ reversalActionText(record.action) }}
                </div>
                <div class="muted">{{ record.resolution || '-' }}</div>
              </template>
            </a-table-column>
            <a-table-column title="操作" :width="100">
              <template #cell="{ record }">
                <a-button
                  v-if="record.status === 'pending' && canDecideReversal"
                  type="text"
                  @click="openReversalDecision(record)"
                  >处置</a-button
                >
                <span v-else>-</span>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </template>

      <template v-else>
        <a-space class="toolbar">
          <a-select
            v-model="refundFilterStatus"
            placeholder="全部状态"
            allow-clear
            :style="{ width: '160px' }"
          >
            <a-option value="pending">待打款</a-option>
            <a-option value="executed">已打款</a-option>
          </a-select>
          <a-button
            :loading="refundExecutionsLoading"
            @click="loadRefundExecutions"
            >刷新</a-button
          >
        </a-space>
        <div class="hint">
          只读批次列表：按充值批次生成的外部退款执行明细，pending
          表示待财务打款、executed
          表示已登记打款；打款登记在售后单页执行，本页不改任何状态。金额按分转元展示。
        </div>
        <a-table
          :data="refundExecutions"
          :loading="refundExecutionsLoading"
          row-key="id"
          :pagination="{ pageSize: 10 }"
        >
          <template #columns>
            <a-table-column
              data-index="execution_no"
              title="批次号"
              :width="190"
            />
            <a-table-column title="状态" :width="100">
              <template #cell="{ record }">
                <a-tag :color="refundExecutionStatusColor(record.status)">{{
                  refundExecutionStatusText(record.status)
                }}</a-tag>
              </template>
            </a-table-column>
            <a-table-column title="金额" :width="120">
              <template #cell="{ record }">{{
                yuan(record.amount_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="创建时间" :width="180">
              <template #cell="{ record }">{{
                timeText(record.created_at)
              }}</template>
            </a-table-column>
            <a-table-column title="打款时间" :width="180">
              <template #cell="{ record }">{{
                timeText(record.executed_at)
              }}</template>
            </a-table-column>
            <a-table-column title="关联售后单号" :width="190">
              <template #cell="{ record }">
                {{ record.after_sale_no || `#${record.after_sale_id}` }}
              </template>
            </a-table-column>
            <a-table-column title="执行人" :width="100">
              <template #cell="{ record }">
                {{ record.executed_by_admin_id ?? '-' }}
              </template>
            </a-table-column>
          </template>
        </a-table>
      </template>
    </a-card>

    <a-modal
      v-model:visible="accountCreateVisible"
      title="提交收款账户"
      :width="600"
      @ok="submitAccountCreate"
      @cancel="accountCreateVisible = false"
    >
      <a-form :model="accountCreateForm">
        <a-form-item label="收款方式" required>
          <a-select v-model="accountCreateForm.channel">
            <a-option
              v-for="(label, key) in channelMap"
              :key="key"
              :value="key"
              >{{ label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="收款主体" required>
          <a-input
            v-model="accountCreateForm.subjectName"
            :max-length="120"
            placeholder="须为工作室主体名称"
          />
        </a-form-item>
        <a-form-item
          :label="
            accountCreateForm.channel === 'corporate_transfer'
              ? '对公账号'
              : '商户号'
          "
          :required="accountCreateForm.channel === 'corporate_transfer'"
        >
          <a-input v-model="accountCreateForm.accountNo" :max-length="128" />
        </a-form-item>
        <a-form-item label="收款码地址">
          <a-input
            v-model="accountCreateForm.qrUrl"
            :max-length="255"
            placeholder="商户码 / 企微收款码图片地址"
          />
        </a-form-item>
        <a-form-item label="开户行">
          <a-input v-model="accountCreateForm.bankName" :max-length="120" />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="accountCreateForm.submitNote" :max-length="255" />
        </a-form-item>
        <div class="hint">提交后进入待财务审核，审核通过才可用于到账核销。</div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="accountReviewVisible"
      title="审核收款账户"
      :width="560"
      @ok="submitAccountReview"
      @cancel="accountReviewVisible = false"
    >
      <a-form :model="accountReviewForm">
        <a-form-item label="审核结论" required>
          <a-radio-group v-model="accountReviewForm.approve">
            <a-radio :value="true">通过并启用</a-radio>
            <a-radio :value="false">驳回</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="审核说明">
          <a-textarea
            v-model="accountReviewForm.resolution"
            :max-length="255"
            :auto-size="{ minRows: 2 }"
          />
        </a-form-item>
        <div class="hint">
          收款账户 {{ accountReviewTarget?.subject_name }}（{{
            accountReviewTarget
              ? channelText(accountReviewTarget.channel)
              : '-'
          }}）：提交人不得自审。
        </div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="proofCreateVisible"
      title="提交外部到账凭证"
      :width="620"
      @ok="submitProofCreate"
      @cancel="proofCreateVisible = false"
    >
      <a-form :model="proofCreateForm">
        <a-form-item label="订单 ID" required>
          <a-input-number v-model="proofCreateForm.orderId" :min="1" />
        </a-form-item>
        <a-form-item label="收款账户" required>
          <a-select
            v-model="proofCreateForm.accountId"
            placeholder="选择启用中的收款账户"
          >
            <a-option
              v-for="account in activeAccounts"
              :key="account.id"
              :value="account.id"
            >
              {{ channelText(account.channel) }} · {{ account.subject_name }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="渠道流水号" required>
          <a-input
            v-model="proofCreateForm.transactionNo"
            :max-length="128"
            placeholder="转账单号 / 商户订单号，同一渠道不可重复"
          />
        </a-form-item>
        <a-form-item label="到账金额（元）" required>
          <a-input-number
            v-model="proofCreateForm.amountYuan"
            :min="0.01"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="凭证（截图 / 回单地址）" required>
          <a-input
            v-model="proofCreateForm.proofRef"
            :max-length="255"
            placeholder="至少 8 个字符，指向已上传的转账截图或对公回单"
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea
            v-model="proofCreateForm.note"
            :max-length="500"
            :auto-size="{ minRows: 2 }"
          />
        </a-form-item>
        <div class="hint">
          提交后生成「待核验收款」，财务核验通过前订单不会派单。
        </div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="proofDetailVisible"
      title="核验到账凭证"
      :width="640"
      :footer="false"
    >
      <template v-if="proofDetail">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="凭证号">{{
            proofDetail.proof_no
          }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="proofStatusColor(proofDetail.status)">{{
              proofStatusText(proofDetail.status)
            }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="订单">{{
            proofDetail.order_id
          }}</a-descriptions-item>
          <a-descriptions-item label="收款方式">{{
            channelText(proofDetail.channel)
          }}</a-descriptions-item>
          <a-descriptions-item label="渠道流水号" :span="2">{{
            proofDetail.transaction_no
          }}</a-descriptions-item>
          <a-descriptions-item label="到账金额">
            <strong>{{ yuan(proofDetail.amount_cents) }}</strong>
          </a-descriptions-item>
          <a-descriptions-item label="提交人">{{
            proofDetail.submitted_by_admin_id ?? '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="备注" :span="2">{{
            proofDetail.note || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="核验说明" :span="2">{{
            proofDetail.resolution || '-'
          }}</a-descriptions-item>
        </a-descriptions>

        <a-divider>凭证</a-divider>
        <div v-if="isHttpRef(proofDetail.proof_ref)" class="proof-image">
          <a-image :src="proofDetail.proof_ref" :width="420" />
        </div>
        <div v-else class="hint">
          凭证未提供图片地址，请按以下内容核对原始凭证：
        </div>
        <a
          v-if="isHttpRef(proofDetail.proof_ref)"
          :href="proofDetail.proof_ref"
          target="_blank"
          rel="noopener noreferrer"
          >{{ proofDetail.proof_ref }}</a
        >
        <pre v-else class="proof-ref">{{ proofDetail.proof_ref }}</pre>

        <template v-if="proofDetail.status === 'pending_verification'">
          <a-divider>核验操作</a-divider>
          <a-form :model="proofRejectForm">
            <a-form-item label="驳回原因（驳回时必填）">
              <a-textarea
                v-model="proofRejectForm.resolution"
                :max-length="255"
                :auto-size="{ minRows: 2 }"
              />
            </a-form-item>
          </a-form>
          <div class="hint">
            以管理员身份执行：核销后订单进入待派单，提交人不得自审。金额、凭证核对无误后再点核销。
          </div>
          <a-space>
            <a-button
              v-if="canVerifyProof"
              type="primary"
              :loading="proofsLoading"
              @click="verifyProof(proofDetail)"
              >确认核销</a-button
            >
            <a-button
              v-if="canRejectProof"
              status="danger"
              :loading="proofsLoading"
              @click="submitProofReject"
              >驳回</a-button
            >
          </a-space>
        </template>
      </template>
    </a-modal>

    <a-modal
      v-model:visible="reversalCreateVisible"
      title="登记渠道撤销 / 拒付"
      :width="620"
      @ok="submitReversalCreate"
      @cancel="reversalCreateVisible = false"
    >
      <a-form :model="reversalCreateForm">
        <a-form-item label="收款回执 ID" required>
          <a-input-number v-model="reversalCreateForm.receiptId" :min="1" />
        </a-form-item>
        <a-form-item label="事件类型" required>
          <a-radio-group v-model="reversalCreateForm.kind">
            <a-radio value="revoked">渠道撤销</a-radio>
            <a-radio value="chargeback">拒付 / 退单</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="撤销金额（元）" required>
          <a-input-number
            v-model="reversalCreateForm.amountYuan"
            :min="0.01"
            :precision="2"
          />
          <a-typography-text type="secondary"
            >不得超过该笔回执的实际到账额；同一回执多次登记累计也不得超额。</a-typography-text
          >
        </a-form-item>
        <a-form-item label="撤销原因（4-255 字）" required>
          <a-textarea
            v-model="reversalCreateForm.reason"
            :max-length="255"
            :auto-size="{ minRows: 2 }"
          />
        </a-form-item>
        <a-form-item label="证据地址（回单 / 通知截图）">
          <a-input v-model="reversalCreateForm.evidenceRef" :max-length="255" />
        </a-form-item>
        <div class="hint">
          登记以管理员身份执行并留痕；只记账与告警，不改订单资金状态。登记人不得处置自己登记的记录。
        </div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="reversalDecisionVisible"
      title="处置渠道撤销 / 拒付"
      :width="600"
      @ok="submitReversalDecision"
      @cancel="reversalDecisionVisible = false"
    >
      <a-form :model="reversalDecisionForm">
        <a-form-item label="处置动作" required>
          <a-radio-group v-model="reversalDecisionForm.action">
            <a-radio value="mark_exception">转资金异常（人工跟进）</a-radio>
            <a-radio value="suspend_customer">转异常并限制客户自助下单</a-radio>
            <a-radio value="ignore">认定为误报</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          label="处置说明"
          :required="reversalDecisionForm.action !== 'ignore'"
        >
          <a-textarea
            v-model="reversalDecisionForm.resolution"
            :max-length="255"
            :auto-size="{ minRows: 2 }"
          />
        </a-form-item>
        <a-form-item
          v-if="reversalDecisionForm.action === 'suspend_customer'"
          label="风控原因"
          required
        >
          <a-input
            v-model="reversalDecisionForm.riskReason"
            :max-length="255"
            placeholder="限制客户自助下单的依据"
          />
        </a-form-item>
        <div class="hint">
          撤销单 {{ reversalDecisionTarget?.reversal_no }}（{{
            reversalDecisionTarget
              ? yuan(reversalDecisionTarget.amount_cents)
              : '-'
          }}）：以管理员身份执行，登记人不得自审。
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    createPaymentAccount,
    decidePaymentReversal,
    disablePaymentAccount,
    fetchReadiness,
    listOfflinePaymentProofs,
    listPaymentAccounts,
    listPaymentChannels,
    listPaymentReversals,
    listRechargeRefundExecutions,
    registerPaymentReversal,
    rejectOfflinePaymentProof,
    reviewPaymentAccount,
    setPaymentChannelStatus,
    submitOfflinePaymentProof,
    verifyOfflinePaymentProof,
  } from '../../api';
  import type {
    EsportsPaymentReversal,
    OfflinePaymentProof,
    OfflinePaymentProofStatus,
    PaymentAccount,
    PaymentAccountStatus,
    PaymentChannel,
    PaymentChannelView,
    PaymentReversalAction,
    PaymentReversalKind,
    PaymentReversalStatus,
    RechargeRefundExecutionStatus,
    RechargeRefundExecutionView,
    ReadinessReport,
  } from '../../api';

  const { hasButtonPermission, hasAnyPermission } = usePermission();
  // 权限码全部取自 app.go 的 PermAPI / PermButton 声明，不臆造。
  const canCreateAccount = computed(() =>
    hasButtonPermission('esports:payments:account_create')
  );
  const canReviewAccount = computed(() =>
    hasButtonPermission('esports:payments:account_review')
  );
  const canDisableAccount = computed(() =>
    hasButtonPermission('esports:payments:account_disable')
  );
  const canToggleChannel = computed(() =>
    hasButtonPermission('esports:payments:channel_status')
  );
  const canSubmitProof = computed(() =>
    hasButtonPermission('esports:payments:proof_submit')
  );
  const canVerifyProof = computed(() =>
    hasButtonPermission('esports:payments:proof_verify')
  );
  const canRejectProof = computed(() =>
    hasButtonPermission('esports:payments:proof_reject')
  );
  const canRegisterReversal = computed(() =>
    hasButtonPermission('esports:payments:reversal_register')
  );
  const canListReversal = computed(() =>
    hasButtonPermission('esports:payments:reversal_list')
  );
  const canDecideReversal = computed(() =>
    hasButtonPermission('esports:payments:reversal_decide')
  );
  // 退款执行批次是只读列表，权限码取 app.go 已声明的 esports:settlements:recharge_refund_executions。
  const canListRefundExecutions = computed(
    () =>
      hasButtonPermission('esports:settlements:recharge_refund_executions') ||
      hasAnyPermission(['esports:settlements:recharge_refund_executions'])
  );

  const yuan = (value: number) => `¥${(value / 100).toFixed(2)}`;
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };
  // 资金类动作统一二次确认，并显式提示以管理员身份执行（操作留痕）。
  const confirmFundsAction = (content: string, title = '资金类动作确认') =>
    new Promise<boolean>((resolve) => {
      Modal.confirm({
        title,
        content: `${content}\n本操作以管理员身份执行并留痕。`,
        okText: '确认执行',
        cancelText: '取消',
        closable: false,
        maskClosable: false,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

  const channelMap: Record<PaymentChannel, string> = {
    wechat_work: '企业微信收款',
    merchant_qr: '工作室商户码',
    corporate_transfer: '对公转账',
  };
  const channelText = (channel: string) =>
    channelMap[channel as PaymentChannel] || channel;
  const accountStatusText = (status: string) =>
    ({
      pending_review: '待审核',
      active: '已启用',
      rejected: '已驳回',
      disabled: '已停用',
    }[status] || status);
  const accountStatusColor = (status: string) =>
    ({
      pending_review: 'orange',
      active: 'green',
      rejected: 'red',
      disabled: 'gray',
    }[status] || 'gray');
  const proofStatusText = (status: string) =>
    ({
      pending_verification: '待核验',
      verified: '已核销',
      rejected: '已驳回',
    }[status] || status);
  const proofStatusColor = (status: string) =>
    ({
      pending_verification: 'orange',
      verified: 'green',
      rejected: 'red',
    }[status] || 'gray');

  const reversalKindText = (kind: string) =>
    ({ revoked: '渠道撤销', chargeback: '拒付 / 退单' }[kind] || kind);
  const reversalStatusText = (status: string) =>
    ({
      pending: '待处置',
      handled: '已处置',
      rejected: '已认定误报',
    }[status] || status);
  const reversalStatusColor = (status: string) =>
    ({ pending: 'orange', handled: 'green', rejected: 'gray' }[status] ||
    'gray');
  const reversalActionText = (action: string) =>
    ({
      none: '-',
      mark_exception: '转资金异常',
      suspend_customer: '转异常并限制客户',
      ignore: '认定为误报',
    }[action] || action);

  // 收款主体白名单 fail-closed（§4.3-07）：白名单未配置时后端拒绝一切提交 / 审核。
  // 上线自检（/admin/readiness）目前没有该检查项，前端只能按错误文案识别；
  // 一旦识别到即在页面顶部常驻提示，避免运营反复撞同一个 400。
  const whitelistBlocked = ref(false);
  const noteWhitelistBlocked = (message: string) => {
    if (
      message.includes('payment_subject_whitelist') ||
      message.includes('收款主体白名单')
    ) {
      whitelistBlocked.value = true;
    }
  };
  const isHttpRef = (url: string) => /^https?:\/\//i.test(url.trim());

  // ── 上线自检 ──
  const readiness = ref<ReadinessReport | null>(null);
  const readinessLoading = ref(false);
  const readinessText = (status: string) =>
    ({ ready: '可用', degraded: '降级', missing: '未配置' }[status] || status);
  const readinessColor = (status: string) =>
    ({ ready: 'green', degraded: 'orange', missing: 'red' }[status] || 'gray');

  async function loadReadiness() {
    readinessLoading.value = true;
    try {
      readiness.value = (await fetchReadiness()).data.data || null;
    } catch {
      // 自检失败不打扰操作，保留上一次结果并提示手工重试。
      Message.warning('上线自检加载失败，可稍后点「重新检查」');
    } finally {
      readinessLoading.value = false;
    }
  }

  // ── 收款方式启停 ──
  const channels = ref<PaymentChannelView[]>([]);
  const channelsLoading = ref(false);

  async function loadChannels() {
    channelsLoading.value = true;
    try {
      channels.value = (await listPaymentChannels()).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载收款方式失败'));
    } finally {
      channelsLoading.value = false;
    }
  }

  async function toggleChannel(record: PaymentChannelView) {
    const next = !record.enabled;
    const ok = await confirmFundsAction(
      `确认${next ? '启用' : '停用'}收款方式「${channelText(
        record.channel
      )}」？${
        next ? '' : '停用后不再接受新的到账凭证，进行中的待核验收款仍可处理。'
      }`
    );
    if (!ok) return;
    try {
      await setPaymentChannelStatus(record.channel, next);
      Message.success(next ? '已启用该收款方式' : '已停用该收款方式');
      await loadChannels();
    } catch (err) {
      Message.error(errorText(err, '启停失败，请刷新后重试'));
    }
  }

  // ── 收款账户 ──
  const accounts = ref<PaymentAccount[]>([]);
  const accountsLoading = ref(false);
  const accountFilterChannel = ref<PaymentChannel>();
  const accountFilterStatus = ref<PaymentAccountStatus>();

  const activeAccounts = computed(() =>
    accounts.value.filter((item) => item.status === 'active')
  );

  async function loadAccounts() {
    accountsLoading.value = true;
    try {
      accounts.value =
        (
          await listPaymentAccounts({
            channel: accountFilterChannel.value,
            status: accountFilterStatus.value,
          })
        ).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载收款账户失败'));
    } finally {
      accountsLoading.value = false;
    }
  }

  const accountCreateVisible = ref(false);
  const accountCreateForm = reactive({
    channel: 'wechat_work' as PaymentChannel,
    subjectName: '',
    accountNo: '',
    qrUrl: '',
    bankName: '',
    submitNote: '',
  });

  function openAccountCreate() {
    accountCreateForm.channel = 'wechat_work';
    accountCreateForm.subjectName = '';
    accountCreateForm.accountNo = '';
    accountCreateForm.qrUrl = '';
    accountCreateForm.bankName = '';
    accountCreateForm.submitNote = '';
    accountCreateVisible.value = true;
  }

  async function submitAccountCreate() {
    if (!accountCreateForm.subjectName.trim()) {
      Message.warning('请填写工作室收款主体');
      return;
    }
    if (
      accountCreateForm.channel === 'corporate_transfer' &&
      !accountCreateForm.accountNo.trim()
    ) {
      Message.warning('对公转账须填对公账号');
      return;
    }
    const ok = await confirmFundsAction(
      `确认提交收款主体「${accountCreateForm.subjectName.trim()}」的收款账户资料？提交后进入待财务审核。`,
      '提交收款账户'
    );
    if (!ok) return;
    try {
      await createPaymentAccount({
        channel: accountCreateForm.channel,
        subject_name: accountCreateForm.subjectName.trim(),
        account_no: accountCreateForm.accountNo.trim(),
        qr_url: accountCreateForm.qrUrl.trim(),
        bank_name: accountCreateForm.bankName.trim(),
        submit_note: accountCreateForm.submitNote.trim(),
      });
      accountCreateVisible.value = false;
      Message.success('已提交，待财务审核');
      await loadAccounts();
    } catch (err) {
      const message = errorText(err, '提交失败：主体/账号重复或参数无效');
      noteWhitelistBlocked(message);
      Message.error(message);
    }
  }

  const accountReviewVisible = ref(false);
  const accountReviewTarget = ref<PaymentAccount | null>(null);
  const accountReviewForm = reactive({ approve: true, resolution: '' });

  function openAccountReview(record: PaymentAccount) {
    accountReviewTarget.value = record;
    accountReviewForm.approve = true;
    accountReviewForm.resolution = '';
    accountReviewVisible.value = true;
  }

  async function submitAccountReview() {
    const target = accountReviewTarget.value;
    if (!target) return;
    if (!accountReviewForm.approve && !accountReviewForm.resolution.trim()) {
      Message.warning('驳回必须填写说明');
      return;
    }
    const ok = await confirmFundsAction(
      `确认${accountReviewForm.approve ? '通过并启用' : '驳回'}收款账户「${
        target.subject_name
      }」？审核通过即可用于到账核销。`,
      '审核收款账户'
    );
    if (!ok) return;
    try {
      await reviewPaymentAccount(target.id, {
        approve: accountReviewForm.approve,
        resolution: accountReviewForm.resolution.trim(),
      });
      accountReviewVisible.value = false;
      Message.success(
        accountReviewForm.approve ? '已启用该收款账户' : '已驳回'
      );
      await loadAccounts();
      await loadChannels();
    } catch (err) {
      const message = errorText(err, '审核失败：提交人不得自审或状态已变化');
      noteWhitelistBlocked(message);
      Message.error(message);
    }
  }

  async function disableAccount(record: PaymentAccount) {
    const ok = await confirmFundsAction(
      `确认停用收款账户「${record.subject_name}」？停用后不再接受新的到账核销。`,
      '停用收款账户'
    );
    if (!ok) return;
    try {
      await disablePaymentAccount(record.id);
      Message.success('已停用该收款账户');
      await loadAccounts();
      await loadChannels();
    } catch (err) {
      Message.error(errorText(err, '停用失败，请刷新后重试'));
    }
  }

  // ── 收款核验页签：待核验收款 / 撤销拒付 / 退款执行批次 ──
  const settleTab = ref<'proofs' | 'reversals' | 'refundExecutions'>('proofs');

  // ── 待核验收款 ──
  const proofs = ref<OfflinePaymentProof[]>([]);
  const proofsLoading = ref(false);
  const proofFilterStatus = ref<OfflinePaymentProofStatus>();
  // 核验前必须能查看凭证：表格里只给「查看凭证」，核销 / 驳回都在查看过凭证的弹窗内执行。
  const proofDetailVisible = ref(false);
  const proofDetail = ref<OfflinePaymentProof | null>(null);
  const proofRejectForm = reactive({ resolution: '' });

  async function loadProofs() {
    proofsLoading.value = true;
    try {
      proofs.value =
        (await listOfflinePaymentProofs({ status: proofFilterStatus.value }))
          .data.data || [];
      if (proofDetail.value) {
        proofDetail.value =
          proofs.value.find((item) => item.id === proofDetail.value?.id) ||
          proofDetail.value;
      }
    } catch (err) {
      Message.error(errorText(err, '加载待核验收款失败'));
    } finally {
      proofsLoading.value = false;
    }
  }

  function openProofDetail(record: OfflinePaymentProof) {
    proofDetail.value = record;
    proofRejectForm.resolution = '';
    proofDetailVisible.value = true;
  }

  const proofCreateVisible = ref(false);
  const proofCreateForm = reactive({
    orderId: 0,
    accountId: undefined as number | undefined,
    transactionNo: '',
    amountYuan: 0,
    proofRef: '',
    note: '',
  });

  function openProofCreate() {
    proofCreateForm.orderId = 0;
    proofCreateForm.accountId = undefined;
    proofCreateForm.transactionNo = '';
    proofCreateForm.amountYuan = 0;
    proofCreateForm.proofRef = '';
    proofCreateForm.note = '';
    proofCreateVisible.value = true;
  }

  async function submitProofCreate() {
    if (!proofCreateForm.orderId || !proofCreateForm.accountId) {
      Message.warning('请填写订单 ID 并选择收款账户');
      return;
    }
    if (proofCreateForm.amountYuan <= 0) {
      Message.warning('请填写到账金额');
      return;
    }
    if (proofCreateForm.proofRef.trim().length < 8) {
      Message.warning('凭证地址至少 8 个字符');
      return;
    }
    try {
      await submitOfflinePaymentProof({
        order_id: proofCreateForm.orderId,
        account_id: proofCreateForm.accountId,
        transaction_no: proofCreateForm.transactionNo.trim(),
        amount_cents: Math.round(proofCreateForm.amountYuan * 100),
        proof_ref: proofCreateForm.proofRef.trim(),
        note: proofCreateForm.note.trim(),
      });
      proofCreateVisible.value = false;
      Message.success('已生成待核验收款，财务核验前不会派单');
      await loadProofs();
    } catch (err) {
      Message.error(
        errorText(
          err,
          '提交失败：渠道流水重复、金额不足、收款方式停用或账户未启用'
        )
      );
    }
  }

  async function verifyProof(record: OfflinePaymentProof) {
    const ok = await confirmFundsAction(
      `确认核销订单 ${record.order_id} 的到账 ${yuan(
        record.amount_cents
      )}（流水号 ${record.transaction_no}）？核销后订单进入待派单，不可回退。`,
      '核销外部到账'
    );
    if (!ok) return;
    try {
      await verifyOfflinePaymentProof(record.id);
      Message.success('已核销，订单进入待派单');
      proofDetailVisible.value = false;
      await loadProofs();
    } catch (err) {
      Message.error(
        errorText(err, '核销失败：提交人不得自审或订单已不满足核销条件')
      );
    }
  }

  async function submitProofReject() {
    const target = proofDetail.value;
    if (!target) return;
    if (!proofRejectForm.resolution.trim()) {
      Message.warning('驳回必须填写原因');
      return;
    }
    const ok = await confirmFundsAction(
      `确认驳回订单 ${target.order_id} 的到账凭证 ${target.proof_no}？驳回后需重新提交凭证。`,
      '驳回到账凭证'
    );
    if (!ok) return;
    try {
      await rejectOfflinePaymentProof(
        target.id,
        proofRejectForm.resolution.trim()
      );
      Message.success('已驳回');
      proofDetailVisible.value = false;
      await loadProofs();
    } catch (err) {
      Message.error(errorText(err, '驳回失败：提交人不得自审或状态已变化'));
    }
  }

  // ── 渠道撤销 / 拒付（§3.2） ──
  const reversals = ref<EsportsPaymentReversal[]>([]);
  const reversalsLoading = ref(false);
  const reversalFilterStatus = ref<PaymentReversalStatus>();
  const reversalFilterOrderId = ref(0);

  async function loadReversals() {
    reversalsLoading.value = true;
    try {
      reversals.value =
        (
          await listPaymentReversals({
            order_id: reversalFilterOrderId.value || undefined,
            status: reversalFilterStatus.value,
          })
        ).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载撤销 / 拒付事件失败'));
    } finally {
      reversalsLoading.value = false;
    }
  }

  // ── 充值退款执行批次（§4.5，只读，api.ts 的 listRechargeRefundExecutions）：
  // 金额单位分，列表按批次 ID 倒序。 ──
  const refundExecutions = ref<RechargeRefundExecutionView[]>([]);
  const refundExecutionsLoading = ref(false);
  const refundFilterStatus = ref<RechargeRefundExecutionStatus>();
  const refundExecutionStatusText = (status: string) =>
    ({ pending: '待打款', executed: '已打款' }[status] || status);
  const refundExecutionStatusColor = (status: string) =>
    ({ pending: 'orange', executed: 'green' }[status] || 'gray');
  const timeText = (value: string | null) =>
    value ? new Date(value).toLocaleString() : '-';

  async function loadRefundExecutions() {
    refundExecutionsLoading.value = true;
    try {
      refundExecutions.value =
        (
          await listRechargeRefundExecutions({
            status: refundFilterStatus.value || undefined,
            limit: 200,
          })
        ).data.data || [];
    } catch (err) {
      // 状态非法等后端中文原因原样展示，不吞错误。
      Message.error(errorText(err, '加载退款执行批次失败'));
    } finally {
      refundExecutionsLoading.value = false;
    }
  }

  function onSettleTabChange(key: string | number) {
    if (key === 'reversals' && reversals.value.length === 0) {
      loadReversals();
    }
    if (key === 'refundExecutions' && refundExecutions.value.length === 0) {
      loadRefundExecutions();
    }
  }

  const reversalCreateVisible = ref(false);
  const reversalCreateForm = reactive({
    receiptId: 0,
    kind: 'revoked' as PaymentReversalKind,
    amountYuan: 0,
    reason: '',
    evidenceRef: '',
  });

  function openReversalCreate() {
    reversalCreateForm.receiptId = 0;
    reversalCreateForm.kind = 'revoked';
    reversalCreateForm.amountYuan = 0;
    reversalCreateForm.reason = '';
    reversalCreateForm.evidenceRef = '';
    reversalCreateVisible.value = true;
  }

  async function submitReversalCreate() {
    const reason = reversalCreateForm.reason.trim();
    if (!reversalCreateForm.receiptId) {
      Message.warning('请填写收款回执 ID');
      return;
    }
    if (reversalCreateForm.amountYuan <= 0) {
      Message.warning('请填写撤销金额');
      return;
    }
    if (reason.length < 4 || reason.length > 255) {
      Message.warning('撤销原因须填写 4-255 字');
      return;
    }
    const ok = await confirmFundsAction(
      `确认登记${reversalKindText(reversalCreateForm.kind)}，金额 ${yuan(
        Math.round(reversalCreateForm.amountYuan * 100)
      )}？登记后须由其他管理员处置。`,
      '登记撤销 / 拒付'
    );
    if (!ok) return;
    try {
      await registerPaymentReversal({
        receipt_id: reversalCreateForm.receiptId,
        kind: reversalCreateForm.kind,
        amount_cents: Math.round(reversalCreateForm.amountYuan * 100),
        reason,
        evidence_ref: reversalCreateForm.evidenceRef.trim(),
      });
      reversalCreateVisible.value = false;
      Message.success('已登记撤销 / 拒付事件');
      await loadReversals();
    } catch (err) {
      Message.error(
        errorText(err, '登记失败：回执不存在、金额超过实际到账或累计超额')
      );
    }
  }

  const reversalDecisionVisible = ref(false);
  const reversalDecisionTarget = ref<EsportsPaymentReversal | null>(null);
  const reversalDecisionForm = reactive({
    action: 'mark_exception' as PaymentReversalAction,
    resolution: '',
    riskReason: '',
  });

  function openReversalDecision(record: EsportsPaymentReversal) {
    reversalDecisionTarget.value = record;
    reversalDecisionForm.action = 'mark_exception';
    reversalDecisionForm.resolution = '';
    reversalDecisionForm.riskReason = '';
    reversalDecisionVisible.value = true;
  }

  async function submitReversalDecision() {
    const target = reversalDecisionTarget.value;
    if (!target) return;
    const resolution = reversalDecisionForm.resolution.trim();
    const riskReason = reversalDecisionForm.riskReason.trim();
    if (reversalDecisionForm.action !== 'ignore' && !resolution) {
      Message.warning('请填写处置说明');
      return;
    }
    if (reversalDecisionForm.action === 'suspend_customer' && !riskReason) {
      Message.warning('限制客户须同时填写风控原因');
      return;
    }
    const ok = await confirmFundsAction(
      `确认对撤销单 ${target.reversal_no}（${yuan(
        target.amount_cents
      )}）执行「${reversalActionText(reversalDecisionForm.action)}」？${
        reversalDecisionForm.action === 'ignore'
          ? '认定为误报不改动订单资金状态，其他处置会把订单置为资金异常。'
          : '处置后订单资金状态会变更，不可回退。'
      }`,
      '处置撤销 / 拒付'
    );
    if (!ok) return;
    try {
      await decidePaymentReversal(target.id, {
        action: reversalDecisionForm.action,
        resolution,
        risk_reason: riskReason,
      });
      reversalDecisionVisible.value = false;
      Message.success('已处置该撤销 / 拒付事件');
      await loadReversals();
    } catch (err) {
      Message.error(errorText(err, '处置失败：登记人不得自审或状态已变化'));
    }
  }

  onMounted(async () => {
    await loadReadiness();
    await loadChannels();
    await loadAccounts();
    await loadProofs();
  });
</script>

<style scoped>
  .toolbar {
    margin-bottom: 12px;
  }

  .whitelist-alert {
    margin-bottom: 12px;
  }

  .readiness-banner {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }

  .readiness-banner .muted,
  .muted {
    color: var(--color-text-3);
    font-size: 12px;
  }

  .proof-image {
    margin-bottom: 8px;
  }

  .proof-ref {
    margin: 0;
    padding: 8px;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    background: var(--color-fill-1);
  }

  .hint {
    margin-bottom: 12px;
    color: var(--color-text-3);
    font-size: 12px;
  }
</style>
