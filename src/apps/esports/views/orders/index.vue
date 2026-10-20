<template>
  <div class="container page-container">
    <a-card class="general-card" title="订单">
      <a-space class="toolbar">
        <a-button :loading="loading" @click="load">刷新</a-button>
        <a-button v-if="canBackfill" type="primary" @click="openBackfill"
          >补录订单</a-button
        >
      </a-space>
      <a-table
        :data="orders"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="order_no" title="订单号" />
          <a-table-column data-index="customer_id" title="客户 ID" />
          <a-table-column data-index="sku_id" title="商品 ID" />
          <a-table-column data-index="quantity" title="份数" />
          <a-table-column title="应付金额">
            <template #cell="{ record }">{{
              money(record.payable_cents)
            }}</template>
          </a-table-column>
          <a-table-column data-index="payment_status" title="支付状态" />
          <a-table-column data-index="fulfillment_status" title="履约状态" />
          <a-table-column data-index="refund_status" title="退款状态" />
          <a-table-column title="存单">
            <template #cell="{ record }">
              <a-tag v-if="record.deposit_status === 'frozen'" color="arcoblue"
                >已存单</a-tag
              >
              <span v-else>—</span>
            </template>
          </a-table-column>
          <a-table-column title="操作">
            <template #cell="{ record }">
              <a-button type="text" @click="showDetail(record.id)"
                >详情</a-button
              >
              <template v-if="canOperate && isUnpaid(record)">
                <a-button type="text" @click="openOps(record, 'reprice')"
                  >改价</a-button
                >
                <a-button type="text" @click="openOps(record, 'reschedule')"
                  >改期</a-button
                >
                <a-button
                  type="text"
                  status="success"
                  @click="payWithBalance(record)"
                  >余额核销</a-button
                >
              </template>
              <a-button
                v-if="
                  canOperate &&
                  record.payment_status === 'paid' &&
                  record.fulfillment_status !== 'completed' &&
                  record.fulfillment_status !== 'cancelled'
                "
                type="text"
                @click="openChannelCost(record)"
                >渠道成本</a-button
              >
              <a-button
                v-if="
                  canOperate &&
                  record.fulfillment_status !== 'completed' &&
                  record.fulfillment_status !== 'cancelled'
                "
                type="text"
                @click="openCommissionRule(record)"
                >手动分成</a-button
              >
              <a-button
                v-if="
                  canOperate &&
                  record.appointment_status === 'request' &&
                  record.fulfillment_status !== 'completed' &&
                  record.fulfillment_status !== 'cancelled'
                "
                type="text"
                @click="confirmAppointment(record)"
                >确认档期</a-button
              >
              <!-- 在线收款（§4.3-02）：待付款订单由客服选渠道发起收款，未配置渠道时后端 503。 -->
              <a-button
                v-if="canStartPayment && isUnpaid(record)"
                type="text"
                status="success"
                @click="openPayment(record)"
                >在线收款</a-button
              >
              <!-- 已付款改期（§3.3）：付费档期已被席位占用，必须走限时提案，不能直改。 -->
              <a-button
                v-if="canProposeReschedule && canProposeRescheduleFor(record)"
                type="text"
                @click="openProposal(record)"
                >改期提案</a-button
              >
              <!-- 档期确认超时处置（§5.5-06）：超时挂起后只能退款或改期。 -->
              <a-button
                v-if="canDisposeAppointment && isAppointmentExpired(record)"
                type="text"
                status="warning"
                @click="openAppointmentDisposal(record)"
                >档期超时处置</a-button
              >
              <a-button
                v-if="
                  canOperate && record.fulfillment_status === 'pending_close'
                "
                type="text"
                status="success"
                class="close-btn"
                :disabled="isCloseBlocked(record)"
                :title="
                  isCloseBlocked(record)
                    ? `结单条件未满足：${closeBlockedReason(record)}`
                    : ''
                "
                @click="openOps(record, 'close')"
                >结单</a-button
              >
              <a-button
                v-if="
                  canOperate &&
                  record.fulfillment_status === 'pending_close_review'
                "
                type="text"
                status="success"
                @click="approveReview(record)"
                >复核通过</a-button
              >
              <a-button
                v-if="
                  canOperate &&
                  record.fulfillment_status === 'pending_close_review'
                "
                type="text"
                status="danger"
                @click="openRejectReview(record)"
                >复核驳回</a-button
              >
              <a-button
                v-if="canOperate && record.fulfillment_status === 'in_service'"
                type="text"
                status="warning"
                @click="openAddon(record)"
                >加钟</a-button
              >
              <a-button
                v-if="
                  canOperate &&
                  record.fulfillment_status !== 'cancelled' &&
                  record.fulfillment_status !== 'completed'
                "
                type="text"
                status="danger"
                @click="openOps(record, 'cancel')"
                >取消</a-button
              >
              <a-button
                v-if="canDeposit(record)"
                type="text"
                status="warning"
                @click="deposit(record)"
                >存单</a-button
              >
              <a-button
                v-if="canOperate && record.deposit_status === 'frozen'"
                type="text"
                @click="restore(record)"
                >恢复</a-button
              >
              <!-- 转公共池（§5.1）：待派单订单由负责客服交回公共池，清空负责客服。 -->
              <a-button
                v-if="canReleasePool && isPendingDispatch(record)"
                type="text"
                @click="openReleasePool(record)"
                >转公共池</a-button
              >
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="人工改价审批">
      <a-space class="toolbar"
        ><a-button :loading="priceLoading" @click="loadPriceAdjustments"
          >刷新审批单</a-button
        ></a-space
      >
      <a-table
        :data="priceAdjustments"
        :loading="priceLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column data-index="id" title="审批单" />
          <a-table-column data-index="order_id" title="订单 ID" />
          <a-table-column title="份数 / 人工调整">
            <template #cell="{ record }"
              >{{ record.quantity }} /
              {{ money(record.manual_adjust_cents) }}</template
            >
          </a-table-column>
          <a-table-column title="审批报价"
            ><template #cell="{ record }">{{
              money(record.payable_cents)
            }}</template></a-table-column
          >
          <a-table-column data-index="reason" title="原因" />
          <a-table-column data-index="status" title="状态" />
          <a-table-column title="操作">
            <template #cell="{ record }">
              <a-button
                v-if="
                  canApprovePrice &&
                  record.status === 'pending' &&
                  record.requested_by_admin_id !== currentAdminId
                "
                type="text"
                @click="openPriceDecision(record, true)"
                >通过</a-button
              >
              <a-button
                v-if="
                  canApprovePrice &&
                  record.status === 'pending' &&
                  record.requested_by_admin_id !== currentAdminId
                "
                type="text"
                status="danger"
                @click="openPriceDecision(record, false)"
                >驳回</a-button
              >
              <a-button
                v-if="
                  record.status === 'approved' &&
                  record.requested_by_admin_id === currentAdminId
                "
                type="text"
                @click="applyPriceAdjustment(record)"
                >应用改价</a-button
              >
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="priceDecisionVisible"
      title="改价审批"
      @ok="submitPriceDecision"
    >
      <a-textarea
        v-model="priceDecisionNote"
        placeholder="填写审批意见"
        :max-length="255"
      />
    </a-modal>

    <a-modal
      v-model:visible="detailVisible"
      title="订单详情"
      :footer="false"
      width="900px"
    >
      <a-descriptions v-if="detail" :column="1" bordered>
        <a-descriptions-item label="订单号">{{
          detail.order_no
        }}</a-descriptions-item>
        <a-descriptions-item
          v-if="detailApproval && detailApproval.approval"
          label="结单审批"
          >{{ approvalProgressLabel }}</a-descriptions-item
        >
        <a-descriptions-item label="客户 / 商品"
          >{{ detail.customer_id }} / {{ detail.sku_id }}</a-descriptions-item
        >
        <a-descriptions-item label="单价 / 份数"
          >{{ money(detail.unit_price_cents) }} ×
          {{ detail.quantity }}</a-descriptions-item
        >
        <a-descriptions-item label="折扣 / 人工调整"
          >-{{ money(detail.discount_cents) }} /
          {{ money(detail.manual_adjust_cents) }}</a-descriptions-item
        >
        <a-descriptions-item label="应付金额">{{
          money(detail.payable_cents)
        }}</a-descriptions-item>
        <a-descriptions-item label="渠道成本">{{
          money(detail.channel_cost_cents || 0)
        }}</a-descriptions-item>
        <a-descriptions-item label="报价版本 / 数据版本"
          >{{ detail.quote_version }} /
          {{ detail.version }}</a-descriptions-item
        >
        <a-descriptions-item label="承诺服务量 / 席位"
          >{{ detail.promised_service_units }} /
          {{ detail.required_seats }}</a-descriptions-item
        >
        <a-descriptions-item label="支付 / 履约 / 退款"
          >{{ detail.payment_status }} / {{ detail.fulfillment_status }} /
          {{ detail.refund_status }}</a-descriptions-item
        >
        <a-descriptions-item label="存单状态"
          >{{ detail.deposit_status }}
          {{
            detail.deposited_at ? `（${detail.deposited_at}）` : ''
          }}</a-descriptions-item
        >
        <a-descriptions-item label="支付截止时间">{{
          detail.payment_deadline
        }}</a-descriptions-item>
      </a-descriptions>
      <!-- 授权协作订单：仅放开只读查看，不转移负责关系；授予/撤销仍由后端校验超管或负责人。 -->
      <template v-if="detail && canViewCollaborators">
        <a-divider>协作客服</a-divider>
        <div v-if="canGrantCollaborator" class="collaborator-grant">
          <a-select
            v-if="!adminOptionsFailed"
            v-model="collaboratorAdminId"
            class="collaborator-select"
            placeholder="选择客服"
            allow-search
            :loading="adminOptionsLoading"
          >
            <a-option
              v-for="admin in collaboratorCandidates"
              :key="admin.id"
              :value="admin.id"
              >{{ admin.username }}（#{{ admin.id }}）</a-option
            >
          </a-select>
          <!-- 管理员列表接口不可用（如客服无管理员管理权限）时退化为手填 admin_id。 -->
          <a-input-number
            v-else
            v-model="collaboratorAdminId"
            class="collaborator-select"
            :min="1"
            :precision="0"
            placeholder="客服管理员 ID"
          />
          <a-button
            type="primary"
            :loading="collaboratorSubmitting"
            @click="submitCollaborator"
            >添加协作</a-button
          >
        </div>
        <a-table
          :data="collaborators"
          :loading="collaboratorLoading"
          row-key="id"
          :pagination="false"
          size="small"
        >
          <template #columns>
            <a-table-column title="客服">
              <template #cell="{ record }">
                <div>{{ adminLabel(record.admin_id) }}</div>
                <a-typography-text type="secondary">
                  授权人：{{
                    record.granted_by_admin_id
                      ? adminLabel(record.granted_by_admin_id)
                      : '—'
                  }}
                </a-typography-text>
              </template>
            </a-table-column>
            <a-table-column title="授权时间">
              <template #cell="{ record }">{{
                dateTimeText(record.created_at)
              }}</template>
            </a-table-column>
            <a-table-column
              v-if="canRemoveCollaborator"
              title="操作"
              :width="90"
            >
              <template #cell="{ record }">
                <a-popconfirm
                  content="确认移除该协作客服？移除后其将无法查看该订单。"
                  @ok="removeCollaborator(record)"
                >
                  <a-button type="text" status="danger">移除</a-button>
                </a-popconfirm>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </template>
      <!-- 席位与服务段（§5.5 / §3.3）：席位来自派单看板同一接口，服务段代操作按事件留痕。 -->
      <template v-if="detail && canViewSeats">
        <a-divider>席位与服务段</a-divider>
        <div class="seat-toolbar">
          <a-button :loading="seatsLoading" @click="loadSeats(detail.id)"
            >刷新席位</a-button
          >
          <a-button
            v-if="canTeamDispatch"
            type="primary"
            @click="openTeamDispatch(detail.id)"
            >固排成队</a-button
          >
        </div>
        <a-table
          :data="seats"
          :loading="seatsLoading"
          row-key="id"
          :pagination="false"
          size="small"
        >
          <template #columns>
            <a-table-column data-index="seat_index" title="席位" :width="60" />
            <a-table-column title="陪玩" :width="70">
              <template #cell="{ record }">{{
                record.player_id || '—'
              }}</template>
            </a-table-column>
            <a-table-column data-index="source" title="来源" :width="90" />
            <a-table-column title="状态" :width="90">
              <template #cell="{ record }">
                <a-tag>{{ record.status }}</a-tag>
              </template>
            </a-table-column>
            <a-table-column title="服务段操作" :width="230">
              <template #cell="{ record }">
                <template v-if="record.player_id">
                  <a-button
                    v-if="canPauseService"
                    type="text"
                    @click="openServiceOps(record, 'pause')"
                    >暂停</a-button
                  >
                  <a-button
                    v-if="canResumeService"
                    type="text"
                    @click="openServiceOps(record, 'resume')"
                    >恢复</a-button
                  >
                  <a-button
                    v-if="canTerminateService"
                    type="text"
                    status="danger"
                    @click="openServiceOps(record, 'terminate')"
                    >终止</a-button
                  >
                  <a-button
                    v-if="canCorrectTiming"
                    type="text"
                    @click="openServiceOps(record, 'correction')"
                    >时长更正</a-button
                  >
                </template>
                <span v-else>—</span>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </template>
      <!-- 席位角色快照（§15.1）：多人规格订单的逐席角色与承诺量，派单与结单校验同口径。 -->
      <template v-if="detail && canViewSeatRoles">
        <a-divider>席位角色</a-divider>
        <a-typography-text v-if="seatRoles.length === 0" type="secondary"
          >该单无席位角色快照（历史单或未配置多人规格）</a-typography-text
        >
        <a-space v-else wrap>
          <a-tag
            v-for="role in seatRoles"
            :key="role.seat_index"
            color="arcoblue"
          >
            第 {{ role.seat_index }} 席 · {{ role.role || '不限' }} · 需
            {{ role.promised_units }} 服务量 ·
            {{ role.substitutable ? '可替代' : '不可替代' }}
          </a-tag>
        </a-space>
      </template>
      <!-- 改期提案（§3.3）：已付款改期须客户与已接单成员逐人确认，撤回后订单档期不变。 -->
      <template v-if="detail && canListProposals">
        <a-divider>改期提案</a-divider>
        <a-table
          :data="proposals"
          :loading="proposalLoading"
          row-key="id"
          :pagination="false"
          size="small"
        >
          <template #columns>
            <a-table-column data-index="proposal_no" title="提案号" />
            <a-table-column title="原档期">
              <template #cell="{ record }">
                {{ dateTimeText(record.from_start_at || '') }} /
                {{ record.from_service_duration_minutes }} 分钟
              </template>
            </a-table-column>
            <a-table-column title="新档期">
              <template #cell="{ record }">
                {{ dateTimeText(record.to_start_at) }} /
                {{ record.to_service_duration_minutes }} 分钟
              </template>
            </a-table-column>
            <a-table-column title="状态" :width="90">
              <template #cell="{ record }">
                <a-tag :color="proposalStatusColor(record.status)">{{
                  proposalStatusLabel(record.status)
                }}</a-tag>
              </template>
            </a-table-column>
            <a-table-column title="确认进度">
              <template #cell="{ record }">{{
                proposalProgress(record)
              }}</template>
            </a-table-column>
            <a-table-column title="操作" :width="80">
              <template #cell="{ record }">
                <a-popconfirm
                  v-if="canWithdrawProposal && record.status === 'pending'"
                  content="确认撤回该改期提案？撤回后订单档期保持不变。"
                  @ok="withdrawProposal(record)"
                >
                  <a-button type="text" status="danger">撤回</a-button>
                </a-popconfirm>
                <span v-else>—</span>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </template>
    </a-modal>

    <a-modal
      v-model:visible="opsVisible"
      :title="opsTitle"
      @ok="submitOps"
      @cancel="opsVisible = false"
    >
      <a-form :model="opsForm">
        <template v-if="opsAction === 'reprice'">
          <a-form-item label="份数" required>
            <a-input-number v-model="opsForm.quantity" :min="1" />
          </a-form-item>
          <a-form-item label="人工调整（元，可为负）" required>
            <a-input-number v-model="opsForm.manualAdjustYuan" :precision="2" />
          </a-form-item>
          <a-form-item label="议价后应付">
            <a-input :model-value="previewPayableText" disabled />
          </a-form-item>
        </template>
        <a-form-item
          v-if="opsAction === 'reschedule'"
          label="新的约定开始时间"
          required
        >
          <a-date-picker
            v-model="opsForm.startAt"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
          />
        </a-form-item>
        <div
          v-if="opsAction === 'reprice' && repriceQuote?.requires_approval"
          class="hint"
          >人工调整超过 {{ repriceQuote.approval_threshold_bp / 100 }}%
          免审幅度，提交后先由其他管理员审批。</div
        >
        <!-- 取消试算（§3.3 公示取消政策）：先展示免费窗口、手续费与退款构成，再确认取消。 -->
        <template v-if="opsAction === 'cancel'">
          <a-divider>取消试算</a-divider>
          <a-spin v-if="cancelPreviewLoading" />
          <template v-else-if="cancelQuote">
            <a-descriptions :column="1" size="small" bordered>
              <a-descriptions-item label="取消政策">
                免费取消窗口
                {{ cancelQuote.policy.free_hours }} 小时，超窗手续费
                {{ cancelQuote.policy.fee_bp / 100 }}%
              </a-descriptions-item>
              <a-descriptions-item label="免费截止">{{
                dateTimeText(cancelQuote.free_until)
              }}</a-descriptions-item>
              <a-descriptions-item label="已付 / 已退 / 退款中">
                {{ money(cancelQuote.payable_cents) }} /
                {{ money(cancelQuote.refunded_cents) }} /
                {{ money(cancelQuote.refund_reserved_cents) }}
              </a-descriptions-item>
              <a-descriptions-item label="手续费 / 应退">
                {{ money(cancelQuote.fee_cents) }} /
                {{ money(cancelQuote.refund_cents) }}
              </a-descriptions-item>
            </a-descriptions>
            <a-typography-text v-if="!cancelQuote.cancelable" type="danger">
              当前不可取消：{{
                cancelQuote.blocked_reason || '后端未给出拦截原因'
              }}
            </a-typography-text>
          </template>
          <a-typography-text v-else-if="cancelPreviewError" type="danger">{{
            cancelPreviewError
          }}</a-typography-text>
        </template>
        <a-form-item :label="opsAction === 'close' ? '备注' : '原因（必填）'">
          <a-textarea v-model="opsForm.reason" :max-length="255" />
        </a-form-item>
        <template
          v-if="
            opsAction === 'close' && opsTarget && closeConditionOf(opsTarget)
          "
        >
          <a-divider>
            结单条件（§3.4）{{
              closeConditionOf(opsTarget)!.rule_code || '内置默认'
            }}
            <template v-if="closeConditionOf(opsTarget)!.tree_configured"
              >· 自定义条件树</template
            >
          </a-divider>
          <div
            v-for="(item, index) in closeConditionOf(opsTarget)!.items"
            :key="`${item.field}-${item.operator}-${item.expected}-${index}`"
            class="condition-row"
          >
            <a-tag :color="item.satisfied ? 'green' : 'red'">
              {{ item.satisfied ? '满足' : '未满足' }}
            </a-tag>
            <span>
              {{ item.label }} 需 {{ item.operator }} {{ item.expected }}，当前
              {{ item.actual }}
            </span>
          </div>
          <div
            v-if="!closeConditionOf(opsTarget)!.satisfied"
            class="hint danger"
          >
            条件未满足，结单将被拦截：{{
              closeConditionOf(opsTarget)!.reasons.join('；')
            }}
          </div>
        </template>
        <template v-if="opsAction === 'close' && closeFormFields.length > 0">
          <a-divider>结单表单（§3.4）：{{ closeFormTemplateName }}</a-divider>
          <a-form-item
            v-for="item in closeFormFields"
            :key="item.key"
            :label="item.label"
            :required="isCloseFormRequired(item)"
          >
            <a-input
              v-if="
                item.field_type === 'text' ||
                item.field_type === 'datetime' ||
                item.field_type === 'image' ||
                item.field_type === 'reference'
              "
              :model-value="closeFormText(item.key)"
              :max-length="item.max_length > 0 ? item.max_length : undefined"
              :placeholder="closeFormPlaceholder(item)"
              @update:model-value="(value) => setCloseFormText(item.key, value)"
            />
            <a-input-number
              v-else-if="item.field_type === 'number'"
              :model-value="closeFormNumber(item.key)"
              @update:model-value="
                (value) => setCloseFormNumber(item.key, value)
              "
            />
            <a-input
              v-else-if="item.field_type === 'money'"
              :model-value="money(opsTarget ? opsTarget.payable_cents : 0)"
              disabled
            />
            <a-select
              v-else-if="item.field_type === 'select'"
              :model-value="closeFormText(item.key)"
              @update:model-value="(value) => setCloseFormText(item.key, value)"
            >
              <a-option
                v-for="option in item.options || []"
                :key="option"
                :value="option"
                >{{ option }}</a-option
              >
            </a-select>
            <a-select
              v-else-if="item.field_type === 'multiselect'"
              :model-value="closeFormList(item.key)"
              multiple
              @update:model-value="(value) => setCloseFormList(item.key, value)"
            >
              <a-option
                v-for="option in item.options || []"
                :key="option"
                :value="option"
                >{{ option }}</a-option
              >
            </a-select>
            <a-switch
              v-else-if="item.field_type === 'switch'"
              :model-value="closeFormBool(item.key)"
              @update:model-value="(value) => setCloseFormBool(item.key, value)"
            />
          </a-form-item>
        </template>
        <template
          v-if="
            opsAction === 'close' &&
            closeFormSubmitRule &&
            closeFormSubmitRule.allow_substitute &&
            substituteRows.length > 0
          "
        >
          <a-divider>代提交未上报陪玩（§3.4）</a-divider>
          <a-typography-text type="secondary">
            提交规则要求 {{ closeFormSubmitRule.required }} 名成员上报；第
            {{ substituteRows.map((row) => row.seatIndex).join('、') }}
            席尚未上报，可代填服务量或服务凭证后结单。
          </a-typography-text>
          <a-form-item
            v-for="row in substituteRows"
            :key="row.seatIndex"
            :label="`第 ${row.seatIndex} 席（陪玩 ${row.playerId}）`"
          >
            <a-space>
              <a-input-number
                v-model="row.units"
                :min="0"
                placeholder="上报服务量"
              />
              <a-input
                v-model="row.evidence"
                placeholder="服务凭证引用"
                :max-length="255"
              />
            </a-space>
          </a-form-item>
        </template>
        <!-- 查看服务凭证（§3.4-03）：后端要求结单回传覆盖全部图片附件的 viewed_evidence_attachment_ids。 -->
        <template
          v-if="opsAction === 'close' && evidenceAttachmentIds.length > 0"
        >
          <a-divider>
            查看服务凭证（§3.4-03）：共
            {{ evidenceAttachmentIds.length }} 张，已确认
            {{ viewedEvidenceIds.length }} 张
          </a-divider>
          <a-typography-text type="secondary">
            结单前须逐张查看陪玩上传的凭证图片，点击图片或「标记已查看」计为确认；未全部确认时后端会拒绝结单并列出还差的附件
            ID。
          </a-typography-text>
          <div class="evidence-list">
            <div
              v-for="attachmentId in evidenceAttachmentIds"
              :key="attachmentId"
              class="evidence-item"
            >
              <div class="evidence-head">
                <span>附件 #{{ attachmentId }}</span>
                <a-tag
                  :color="
                    viewedEvidenceIds.includes(attachmentId)
                      ? 'green'
                      : 'orange'
                  "
                >
                  {{
                    viewedEvidenceIds.includes(attachmentId)
                      ? '已查看'
                      : '未查看'
                  }}
                </a-tag>
              </div>
              <a
                v-if="evidenceUrlOf(attachmentId)"
                :href="evidenceUrlOf(attachmentId)"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  :src="evidenceUrlOf(attachmentId)"
                  class="evidence-thumb"
                  alt="服务凭证"
                  @click="markEvidenceViewed(attachmentId)"
                />
              </a>
              <a-typography-text v-else type="danger"
                >附件地址获取失败，请重新打开结单弹窗重试</a-typography-text
              >
              <a-button
                size="mini"
                type="text"
                @click="toggleEvidenceViewed(attachmentId)"
                >{{
                  viewedEvidenceIds.includes(attachmentId)
                    ? '取消确认'
                    : '标记已查看'
                }}</a-button
              >
            </div>
          </div>
          <a-button
            class="evidence-all"
            type="outline"
            status="success"
            @click="markAllEvidenceViewed"
            >全部我已查看</a-button
          >
        </template>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="channelCostVisible"
      title="登记渠道成本（§12.1）"
      :ok-loading="channelCostLoading"
      @ok="submitChannelCost"
      @cancel="channelCostVisible = false"
    >
      <a-form :model="channelCostForm">
        <a-form-item label="订单号">
          <a-typography-text>{{ channelCostForm.orderNo }}</a-typography-text>
        </a-form-item>
        <a-form-item label="渠道成本（元）" required>
          <a-input-number v-model="channelCostForm.yuan" :min="0" />
        </a-form-item>
        <a-typography-text type="secondary">
          结单计提客服提成时从可分基数扣除，并参与「工作室剩余 = 服务应付 −
          陪玩分成 − 客服提成 − 渠道成本」反算；结单后不可再改。
        </a-typography-text>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="commissionRuleVisible"
      title="单笔手动指定分成规则（§12.3）"
      :ok-loading="commissionRuleLoading"
      @ok="submitCommissionRule"
      @cancel="commissionRuleVisible = false"
    >
      <a-form :model="commissionRuleForm">
        <a-form-item label="订单号">
          <a-typography-text>{{
            commissionRuleForm.orderNo
          }}</a-typography-text>
        </a-form-item>
        <a-form-item label="分成规则">
          <a-select v-model="commissionRuleForm.ruleId">
            <a-option :value="0">不指定（逐级回落）</a-option>
            <a-option
              v-for="rule in activeCommissionRules"
              :key="rule.id"
              :value="rule.id"
            >
              {{ rule.rule_no }} v{{ rule.version }} ·
              {{ scopeText(rule.scope, rule.scope_key) }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-typography-text type="secondary">
          优先级：单笔手动指定 &gt; 陪玩个体约定 &gt; 陪玩等级 &gt; 游戏 &gt;
          全局默认。仅成员接单锁定规则前可设，已有成员锁定规则或订单已终态时会被拒绝；选「不指定」即清除。
        </a-typography-text>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="addonVisible"
      title="订单加钟（§3.3 / §12.5）"
      :footer="false"
      width="680px"
    >
      <a-form :model="addonForm">
        <a-form-item label="追加金额（元）">
          <a-input-number
            v-model="addonForm.addedYuan"
            :min="0"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="追加服务量">
          <a-input-number v-model="addonForm.addedUnits" :min="0" />
          <a-typography-text type="secondary">
            金额与服务量至少一项为正；单位与订单 SKU 的服务计量单位一致。
          </a-typography-text>
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="addonForm.note" :max-length="255" />
        </a-form-item>
        <a-space>
          <a-button
            type="primary"
            :loading="addonSubmitting"
            @click="submitAddon"
            >发起加钟</a-button
          >
          <a-button :loading="addonLoading" @click="loadAddons"
            >刷新列表</a-button
          >
        </a-space>
      </a-form>
      <a-typography-text type="secondary" class="addon-tip">
        发起后进入「待陪玩确认」，由陪玩在陪玩端确认或拒绝；确认后追加金额与服务量累加到订单，
        并按确认时点锁定的分成规则生成加钟分成。存在待确认加钟时无法结单。
      </a-typography-text>
      <a-table
        :data="addons"
        :loading="addonLoading"
        row-key="id"
        :pagination="{ pageSize: 5 }"
      >
        <template #columns>
          <a-table-column data-index="addon_no" title="加钟单号" />
          <a-table-column title="追加金额">
            <template #cell="{ record }">{{
              money(record.added_cents)
            }}</template>
          </a-table-column>
          <a-table-column data-index="added_units" title="追加服务量" />
          <a-table-column title="状态">
            <template #cell="{ record }">{{
              addonStatusLabel(record.status)
            }}</template>
          </a-table-column>
          <a-table-column title="加钟分成">
            <template #cell="{ record }">{{
              money(record.commission_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="收款">
            <template #cell="{ record }">{{
              addonPaymentLabel(record)
            }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="130">
            <template #cell="{ record }">
              <a-button
                v-if="record.status === 'pending'"
                type="text"
                status="danger"
                @click="withdrawAddon(record)"
                >撤回</a-button
              >
              <a-button
                v-else-if="
                  record.status === 'confirmed' &&
                  record.payment_status === 'unpaid'
                "
                type="text"
                status="success"
                @click="collectAddon(record)"
                >余额收款</a-button
              >
              <span v-else>—</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-modal>

    <a-modal
      v-model:visible="closeReviewVisible"
      title="复核驳回结单"
      @ok="submitRejectReview"
      @cancel="closeReviewVisible = false"
    >
      <a-form :model="closeReviewForm">
        <a-form-item label="驳回原因" required>
          <a-textarea
            v-model="closeReviewForm.reason"
            :max-length="255"
            placeholder="如：服务凭证存疑，请补充后重新结单"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="backfillVisible"
      title="补录历史订单"
      :ok-loading="backfillSubmitting"
      @ok="submitBackfill"
      @cancel="backfillVisible = false"
    >
      <a-form :model="backfillForm">
        <a-form-item label="客户 ID" required>
          <a-input-number
            v-model="backfillForm.customerId"
            :min="1"
            :precision="0"
          />
        </a-form-item>
        <a-form-item label="SKU ID" required>
          <a-input-number
            v-model="backfillForm.skuId"
            :min="1"
            :precision="0"
          />
        </a-form-item>
        <a-form-item label="数量" required>
          <a-input-number
            v-model="backfillForm.quantity"
            :min="1"
            :precision="0"
          />
        </a-form-item>
        <a-form-item label="实际成交单价（元，留空按 SKU 价）">
          <a-input-number
            v-model="backfillForm.unitPriceYuan"
            :min="0"
            :precision="2"
            placeholder="留空按 SKU 当前规格价"
          />
        </a-form-item>
        <a-form-item label="实际成交时间" required>
          <a-date-picker
            v-model="backfillForm.settledAt"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
          />
        </a-form-item>
        <a-form-item label="履约状态" required>
          <a-radio-group v-model="backfillForm.fulfillmentStatus">
            <a-radio value="completed">已完成</a-radio>
            <a-radio value="cancelled">已取消</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="收款状态">
          <a-typography-text type="secondary">
            历史补录单一律按已收款登记；未收款的历史单请补录为「已取消」
          </a-typography-text>
        </a-form-item>
        <a-form-item label="补录原因" required>
          <a-textarea
            v-model="backfillForm.reason"
            :max-length="255"
            show-word-limit
            placeholder="填写补录原因（4-255 字）"
          />
        </a-form-item>
        <a-form-item label="计入客服提成">
          <a-space>
            <a-switch
              v-model="backfillForm.countCsCommission"
              :disabled="backfillForm.fulfillmentStatus !== 'completed'"
            />
            <a-typography-text type="secondary">
              仅影响客服提成；陪玩分成与成长值始终按补录单计提
            </a-typography-text>
          </a-space>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 在线收款（§4.3-02）：渠道配置态来自 /admin/payment-channels，未开通渠道由后端 503 明确失败。 -->
    <a-modal
      v-model:visible="paymentVisible"
      title="在线收款（§4.3）"
      :ok-loading="paymentLoading"
      ok-text="发起收款"
      @ok="submitPayment"
      @cancel="paymentVisible = false"
    >
      <a-form :model="paymentForm">
        <a-form-item label="订单号">
          <a-typography-text>{{ paymentForm.orderNo }}</a-typography-text>
        </a-form-item>
        <a-form-item label="收款渠道" required>
          <a-select
            v-model="paymentForm.channel"
            placeholder="选择收款渠道"
            :loading="paymentChannelsLoading"
          >
            <a-option
              v-for="option in paymentChannelOptions"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
            >
              {{ option.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-typography-text
          v-if="paymentChannelsError"
          type="warning"
          class="hint"
          >{{ paymentChannelsError }}</a-typography-text
        >
        <template v-if="paymentResult">
          <a-divider>收款信息</a-divider>
          <a-descriptions :column="1" size="small" bordered>
            <a-descriptions-item label="支付意图号">{{
              paymentResult.intent_no
            }}</a-descriptions-item>
            <a-descriptions-item label="渠道">{{
              channelLabel(paymentResult.channel)
            }}</a-descriptions-item>
            <a-descriptions-item label="收款金额">{{
              money(paymentResult.amount_cents)
            }}</a-descriptions-item>
            <a-descriptions-item label="有效期至">{{
              dateTimeText(paymentResult.expires_at)
            }}</a-descriptions-item>
            <a-descriptions-item label="收银台地址">
              <a
                :href="paymentResult.pay_url"
                target="_blank"
                rel="noopener noreferrer"
                >{{ paymentResult.pay_url || '渠道未返回地址' }}</a
              >
            </a-descriptions-item>
          </a-descriptions>
          <a-typography-text type="secondary" class="hint">
            把收银台地址发给客户即可扫码支付；到账以渠道回调验签为准，本页不改成订单状态。
          </a-typography-text>
        </template>
        <a-typography-text v-else type="secondary" class="hint">
          发起后由后端校验渠道开通、启用收款账户、支付时限与金额口径；未配置渠道会明确返回中文原因，不会假装成功。
        </a-typography-text>
      </a-form>
    </a-modal>

    <!-- 档期确认超时处置（§5.5-06）：只提供后端契约里的退还 / 改期两种处置。 -->
    <a-modal
      v-model:visible="appointmentVisible"
      title="档期确认超时处置（§5.5-06）"
      :ok-loading="appointmentLoading"
      ok-text="确认处置"
      @ok="submitAppointmentDisposal"
      @cancel="appointmentVisible = false"
    >
      <a-form :model="appointmentForm">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="订单号">{{
            appointmentForm.orderNo
          }}</a-descriptions-item>
          <a-descriptions-item label="预约开始">{{
            dateTimeText(appointmentForm.requestedStartAt)
          }}</a-descriptions-item>
          <a-descriptions-item label="确认时限">{{
            dateTimeText(appointmentForm.confirmDeadline)
          }}</a-descriptions-item>
          <a-descriptions-item label="超时挂起时间">{{
            dateTimeText(appointmentForm.suspendedAt)
          }}</a-descriptions-item>
          <a-descriptions-item label="后端处置选项">
            <span v-if="appointmentOptionsLoading">读取中…</span>
            <template v-else-if="appointmentOptions">
              {{
                appointmentCurrentActionText(appointmentOptions.current_action)
              }}
              · 截止 {{ dateTimeText(appointmentOptions.expire_at) }}
            </template>
            <span v-else>退还 / 改期（策略读取失败，按默认两项展示）</span>
          </a-descriptions-item>
        </a-descriptions>
        <a-form-item label="处置方式" required>
          <a-radio-group v-model="appointmentForm.action">
            <a-radio
              v-for="action in appointmentActionOptions"
              :key="action"
              :value="action"
              >{{ appointmentActionText(action) }}</a-radio
            >
          </a-radio-group>
        </a-form-item>
        <a-typography-text
          v-if="appointmentOptionsFallback"
          type="danger"
          class="hint"
        >
          无法读取当前处置策略，提交后以服务端校验为准（{{
            appointmentOptionsError
          }}）
        </a-typography-text>
        <a-form-item
          v-if="appointmentForm.action === 'reschedule'"
          label="新的预约开始时间"
          required
        >
          <a-date-picker
            v-model="appointmentForm.startAt"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
          />
        </a-form-item>
        <a-form-item label="处置原因（必填）">
          <a-textarea v-model="appointmentForm.reason" :max-length="255" />
        </a-form-item>
        <a-typography-text v-if="appointmentError" type="danger">{{
          appointmentError
        }}</a-typography-text>
      </a-form>
    </a-modal>

    <!-- 释放到公共池（§5.1）：清空负责客服并留痕，订单回到待派单公共池。 -->
    <a-modal
      v-model:visible="releasePoolVisible"
      title="转公共池（§5.1）"
      :ok-loading="releasePoolLoading"
      ok-text="确认转池"
      @ok="submitReleasePool"
      @cancel="releasePoolVisible = false"
    >
      <a-form :model="releasePoolForm">
        <a-form-item label="订单号">
          <a-typography-text>{{ releasePoolForm.orderNo }}</a-typography-text>
        </a-form-item>
        <a-form-item label="转池原因（必填）">
          <a-textarea v-model="releasePoolForm.reason" :max-length="255" />
        </a-form-item>
        <a-typography-text type="secondary">
          仅待派单订单可转池；转池后清空负责客服，订单回到公共池等待其他客服认领。
        </a-typography-text>
      </a-form>
    </a-modal>

    <!-- 限时改期提案（§3.3）：已付款订单改期须客户与已接单成员逐人确认，提案本身不改订单。 -->
    <a-modal
      v-model:visible="proposalVisible"
      title="发起改期提案（§3.3）"
      :ok-loading="proposalSubmitting"
      ok-text="提交提案"
      @ok="submitProposal"
      @cancel="proposalVisible = false"
    >
      <a-form :model="proposalForm">
        <a-form-item label="订单号">
          <a-typography-text>{{ proposalForm.orderNo }}</a-typography-text>
        </a-form-item>
        <a-form-item label="新的开始时间" required>
          <a-date-picker
            v-model="proposalForm.startAt"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
          />
        </a-form-item>
        <a-form-item label="服务时长（分钟）" required>
          <a-input-number v-model="proposalForm.durationMinutes" :min="1" />
        </a-form-item>
        <a-form-item label="改期原因（必填）">
          <a-textarea v-model="proposalForm.reason" :max-length="255" />
        </a-form-item>
        <a-typography-text type="secondary">
          提案提交后进入限时确认，客户与已接单成员逐人确认后才原子切换档期；未确认前可撤回。未付款订单仍走直接改期。
        </a-typography-text>
      </a-form>
    </a-modal>

    <!-- 服务段代操作（§3.3）：暂停 / 恢复 / 终止 / 时长更正，全部按事件留痕。 -->
    <a-modal
      v-model:visible="serviceVisible"
      :title="serviceTitle"
      :ok-loading="serviceLoading"
      :ok-text="serviceOkText"
      @ok="submitServiceOps"
      @cancel="serviceVisible = false"
    >
      <a-form :model="serviceForm">
        <a-form-item label="订单 / 席位 / 陪玩">
          <a-typography-text>
            #{{ serviceForm.orderId }} · 第 {{ serviceForm.seatIndex }} 席 ·
            陪玩 {{ serviceForm.playerId }}
          </a-typography-text>
        </a-form-item>
        <template v-if="serviceAction === 'terminate'">
          <a-form-item label="已履约服务量" required>
            <a-input-number v-model="serviceForm.terminatedUnits" :min="0" />
          </a-form-item>
          <a-form-item label="责任方" required>
            <a-select v-model="serviceForm.responsibility">
              <a-option
                v-for="party in responsibilityOptions"
                :key="party.value"
                :value="party.value"
                >{{ party.label }}</a-option
              >
            </a-select>
          </a-form-item>
        </template>
        <template v-if="serviceAction === 'correction'">
          <a-form-item label="更正后有效秒数" required>
            <a-input-number
              v-model="serviceForm.effectiveSeconds"
              :min="1"
              :max="serviceTimingUpperBound ?? undefined"
            />
          </a-form-item>
          <a-form-item label="更正后暂停秒数" required>
            <a-input-number v-model="serviceForm.pausedSeconds" :min="0" />
          </a-form-item>
          <a-form-item label="责任方" required>
            <a-select v-model="serviceForm.responsibility">
              <a-option
                v-for="party in responsibilityOptions"
                :key="party.value"
                :value="party.value"
                >{{ party.label }}</a-option
              >
            </a-select>
          </a-form-item>
          <a-typography-text v-if="serviceTimingLoading" type="secondary">
            正在读取服务段计时…
          </a-typography-text>
          <a-typography-text
            v-else-if="serviceForm.currentTimingText"
            type="secondary"
          >
            {{ serviceForm.currentTimingText }}
          </a-typography-text>
          <a-typography-text v-if="serviceTimingUpperBound" type="secondary">
            可填上限
            {{ serviceTimingUpperBound }}
            秒（与后端更正校验同源：min(服务段墙钟跨度, 订单标准时长 ×
            系数)），超出会被前端直接拦下。
          </a-typography-text>
          <a-typography-text type="secondary" class="hint">
            仅已结束的服务段可更正；有效秒数上限由服务端校验（min(服务段墙钟跨度,
            订单标准时长 × 系数)），越界会原样返回可更正区间与实际跨度。
          </a-typography-text>
          <a-typography-text v-if="serviceForm.lastTimingText" type="secondary">
            服务端最近一次返回的计时：{{ serviceForm.lastTimingText }}
          </a-typography-text>
        </template>
        <a-form-item label="原因（必填）">
          <a-textarea v-model="serviceForm.reason" :max-length="255" />
        </a-form-item>
        <a-typography-text v-if="serviceError" type="danger">{{
          serviceError
        }}</a-typography-text>
        <a-descriptions
          v-if="serviceResultText"
          :column="1"
          size="small"
          bordered
          class="hint"
        >
          <a-descriptions-item label="服务端结果">{{
            serviceResultText
          }}</a-descriptions-item>
        </a-descriptions>
      </a-form>
    </a-modal>

    <!-- 固排成队（§5.3）：主陪玩 + 其固排一次占满空席位，候选由后端过滤资格/在线/分区。 -->
    <a-modal
      v-model:visible="teamVisible"
      title="固排成队（§5.3）"
      :ok-button-props="{ disabled: teamSelected.length === 0 }"
      @ok="submitTeamDispatch"
      @cancel="closeTeamDispatch"
    >
      <a-form :model="teamForm" layout="vertical">
        <a-form-item label="主陪玩档案 ID" required>
          <a-space>
            <a-input-number v-model="teamForm.mainPlayerId" :min="1" />
            <a-button type="outline" @click="loadTeamCandidates"
              >加载固排候选</a-button
            >
          </a-space>
        </a-form-item>
        <a-form-item v-if="teamCandidatesLoaded">
          <a-typography-text v-if="teamCandidates.length === 0" type="secondary"
            >该主陪玩在本单无可成队的固排（须已建立固排且资格 / 在线 / 分区 /
            等级满足）</a-typography-text
          >
          <a-checkbox-group v-else v-model="teamSelected">
            <a-checkbox
              v-for="candidate in teamCandidates"
              :key="candidate.player_id"
              :value="candidate.player_id"
            >
              {{ candidate.display_name }}（{{ candidate.level }} ·
              {{ candidate.presence }}）
            </a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import useUserStore from '@/store/modules/user';
  import { getAdmins } from '@/api/user';
  import { resolveAttachmentAccessUrl } from '@/services/attachment-access.service';
  import {
    addOrderCollaborator,
    approveCloseReview,
    backfillOrder,
    cancelOrder,
    cancelOrderAddon,
    closeOrder,
    correctOrderPlayerServiceTiming,
    createOrderAddon,
    depositOrder,
    disposeExpiredAppointment,
    getOrder,
    getOrderCloseApproval,
    getOrderCloseConditions,
    getOrderCloseForm,
    getOrderSeatRoles,
    getTeammateCandidates,
    getAppointmentDisposalOptions,
    getOrderServiceTiming,
    listOrderAddons,
    listOrderCollaborators,
    listOrderRescheduleProposals,
    listOrderSeats,
    listOrders,
    listPaymentChannels,
    payOrderAddonByBalance,
    payOrderWithBalance,
    pauseOrderPlayerService,
    previewCancelOrder,
    previewReprice,
    proposeOrderReschedule,
    releaseOrderToPool,
    requestPriceAdjustment,
    resumeOrderPlayerService,
    startOrderPayment,
    teamDispatch,
    terminateOrderPlayerService,
    withdrawRescheduleProposal,
    listPriceAdjustments,
    decidePriceAdjustment,
    rejectCloseReview,
    removeOrderCollaborator,
    repriceOrder,
    rescheduleOrder,
    restoreOrder,
    setOrderChannelCost,
    listCommissionRules,
    setOrderManualCommissionRule,
    confirmOrderAppointment,
  } from '../../api';
  import type {
    AppointmentDisposalOptions,
    CancelQuote,
    CloseConditionStatus,
    CommissionRule,
    EsportsCloseFormField,
    EsportsDispatchSeat,
    EsportsOrder,
    EsportsOrderAddon,
    EsportsOrderCollaborator,
    EsportsSeatSpec,
    OrderCloseApprovalView,
    OrderCloseFormView,
    OrderPaymentStartView,
    PaymentChannel,
    PaymentChannelView,
    PlayerServiceTiming,
    RepriceQuote,
    PriceAdjustment,
    RescheduleProposalView,
    TeammateDispatchCandidate,
  } from '../../api';

  type OpsAction = 'reprice' | 'reschedule' | 'cancel' | 'close';

  const { hasButtonPermission } = usePermission();
  const userStore = useUserStore();
  const currentAdminId = computed(() => Number(userStore.accountId || 0));
  const canApprovePrice = computed(
    () =>
      userStore.isSuperAdmin &&
      hasButtonPermission('esports:orders:price_approve')
  );
  const canOperate = computed(() =>
    hasButtonPermission('esports:orders:operate')
  );
  // 补录订单复用「新增订单」权限码 esports:orders:add（语义为生成订单），后端无独立 backfill 权限码。
  const canBackfill = computed(() => hasButtonPermission('esports:orders:add'));
  // 授权协作订单：查看 / 授予 / 撤销分别对应独立按钮权限码，超管与负责人校验由后端兜底。
  const canViewCollaborators = computed(() =>
    hasButtonPermission('esports:orders:collaborators')
  );
  const canGrantCollaborator = computed(() =>
    hasButtonPermission('esports:orders:collaborator_add')
  );
  const canRemoveCollaborator = computed(() =>
    hasButtonPermission('esports:orders:collaborator_remove')
  );
  // 订单动作入口的权限码逐一取自 app.go 的 PermAPI 声明，前端隐藏不替代后端鉴权。
  const canStartPayment = computed(() =>
    hasButtonPermission('esports:payments:order_start')
  );
  const canDisposeAppointment = computed(() =>
    hasButtonPermission('esports:orders:appointment_dispose')
  );
  const canReleasePool = computed(() =>
    hasButtonPermission('esports:dispatch:release_pool')
  );
  const canPreviewCancel = computed(() =>
    hasButtonPermission('esports:orders:cancel_preview')
  );
  const canProposeReschedule = computed(() =>
    hasButtonPermission('esports:orders:reschedule_propose')
  );
  const canListProposals = computed(() =>
    hasButtonPermission('esports:orders:reschedule_list')
  );
  const canWithdrawProposal = computed(() =>
    hasButtonPermission('esports:orders:reschedule_withdraw')
  );
  const canViewSeatRoles = computed(() =>
    hasButtonPermission('esports:orders:seat_roles')
  );
  const canViewSeats = computed(() =>
    hasButtonPermission('esports:dispatch:seats')
  );
  const canTeamDispatch = computed(() =>
    hasButtonPermission('esports:dispatch:team_dispatch')
  );
  const canPauseService = computed(() =>
    hasButtonPermission('esports:orders:service_pause_admin')
  );
  const canResumeService = computed(() =>
    hasButtonPermission('esports:orders:service_resume_admin')
  );
  const canTerminateService = computed(() =>
    hasButtonPermission('esports:orders:service_terminate')
  );
  const canCorrectTiming = computed(() =>
    hasButtonPermission('esports:orders:service_timing_correction')
  );

  const loading = ref(false);
  const priceLoading = ref(false);
  const priceAdjustments = ref<PriceAdjustment[]>([]);
  const priceDecisionVisible = ref(false);
  const priceDecisionTarget = ref<PriceAdjustment | null>(null);
  const priceDecisionApprove = ref(false);
  const priceDecisionNote = ref('');

  // 透出后端返回的中文错误信息（如结单条件缺失），取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  async function loadPriceAdjustments() {
    priceLoading.value = true;
    try {
      priceAdjustments.value = (await listPriceAdjustments()).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载改价审批单失败'));
    } finally {
      priceLoading.value = false;
    }
  }
  function openPriceDecision(item: PriceAdjustment, approve: boolean) {
    priceDecisionTarget.value = item;
    priceDecisionApprove.value = approve;
    priceDecisionNote.value = '';
    priceDecisionVisible.value = true;
  }
  async function submitPriceDecision() {
    if (!priceDecisionTarget.value || !priceDecisionNote.value.trim()) {
      Message.warning('请填写审批意见');
      return;
    }
    try {
      await decidePriceAdjustment(
        priceDecisionTarget.value.id,
        priceDecisionApprove.value,
        priceDecisionNote.value.trim()
      );
      priceDecisionVisible.value = false;
      Message.success('审批已记录');
      await loadPriceAdjustments();
    } catch (err) {
      Message.error(errorText(err, '审批失败：订单状态或版本已变化'));
    }
  }
  const orders = ref<EsportsOrder[]>([]);
  const detail = ref<EsportsOrder | null>(null);
  const detailVisible = ref(false);
  // 结单审批进度（§3.4）：详情抽屉展示当前待审批节点。
  const detailApproval = ref<OrderCloseApprovalView | null>(null);
  const approvalProgressLabel = computed(() => {
    const view = detailApproval.value;
    if (!view || !view.approval) return '—';
    if (view.current_node) {
      return `待「${view.current_node.name}」审批（第 ${
        view.current_node.seq
      } / ${(view.approval.steps || []).length} 节点）`;
    }
    return view.approval.status === 'approved' ? '已全部通过' : '已驳回';
  });
  const opsVisible = ref(false);
  const opsAction = ref<OpsAction>('reprice');
  const opsTarget = ref<EsportsOrder | null>(null);
  const opsForm = reactive({
    quantity: 1,
    manualAdjustYuan: 0,
    startAt: '',
    reason: '',
  });

  // ── 结单表单（§3.4）：按订单适用模板动态渲染，值随结单一起提交 ──
  const closeForm = ref<OrderCloseFormView | null>(null);
  const closeFormValues = ref<Record<string, unknown>>({});
  const closeFormFields = computed<EsportsCloseFormField[]>(
    () => closeForm.value?.fields || []
  );
  const closeFormTemplateName = computed(() => {
    const template = closeForm.value?.template;
    return template ? `${template.name} v${template.version}` : '无适用模板';
  });
  // 模板绑定可覆盖字段库的必填默认值；金额只读字段由系统填写，不参与必填。
  const closeFormBindingRequired = (key: string) =>
    (closeForm.value?.template?.fields || []).some(
      (binding) => binding.field_key === key && binding.required
    );
  const isCloseFormRequired = (item: EsportsCloseFormField) =>
    item.field_type !== 'money' &&
    (item.required || closeFormBindingRequired(item.key));
  const closeFormText = (key: string) => {
    const value = closeFormValues.value[key];
    return typeof value === 'string' ? value : '';
  };
  const closeFormNumber = (key: string) => {
    const value = closeFormValues.value[key];
    return typeof value === 'number' ? value : undefined;
  };
  const closeFormBool = (key: string) => closeFormValues.value[key] === true;
  const closeFormList = (key: string) => {
    const value = closeFormValues.value[key];
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  };
  const closeFormPlaceholder = (item: EsportsCloseFormField) => {
    if (item.field_type === 'datetime')
      return 'ISO 时间，如 2026-10-14T10:00:00Z';
    if (item.field_type === 'image') return '附件引用或图片地址';
    if (item.field_type === 'reference') return '关联对象 ID';
    return '';
  };
  const setCloseFormText = (key: string, value: unknown) => {
    closeFormValues.value[key] = typeof value === 'string' ? value : '';
  };
  const setCloseFormNumber = (key: string, value: unknown) => {
    closeFormValues.value[key] = typeof value === 'number' ? value : null;
  };
  const setCloseFormBool = (key: string, value: unknown) => {
    closeFormValues.value[key] = value === true;
  };
  const setCloseFormList = (key: string, value: unknown) => {
    closeFormValues.value[key] = Array.isArray(value)
      ? value.map((item) => String(item))
      : [];
  };
  const isEmptyCloseFormValue = (value: unknown) =>
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);
  const closeFormSubmitRule = computed(
    () => closeForm.value?.submit_rule || null
  );
  // 客服代提交行（§3.4）：仅在生效提交规则允许代提交且存在未上报成员时渲染。
  const substituteRows = ref<
    { seatIndex: number; playerId: number; units: number; evidence: string }[]
  >([]);

  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  const isUnpaid = (order: EsportsOrder) =>
    order.payment_status === 'unpaid' &&
    order.fulfillment_status === 'pending_payment';
  const isPendingDispatch = (order: EsportsOrder) =>
    order.fulfillment_status === 'pending_dispatch';
  // 档期超时挂起时间由后端拆单 / 到期任务写入，api.ts 的 EsportsOrder 未声明该字段。
  const appointmentSuspendedAt = (order: EsportsOrder) =>
    (order as EsportsOrder & { appointment_suspended_at?: string | null })
      .appointment_suspended_at || '';
  // 档期确认超时（§5.5-06）：只有挂起态才开放退还 / 改期处置入口。
  const isAppointmentExpired = (order: EsportsOrder) =>
    order.appointment_status === 'pending_confirm' &&
    !!appointmentSuspendedAt(order);
  // 已付款订单改期必须走限时提案（后端对直改返回 409），未付款仍走直接改期。
  const canProposeRescheduleFor = (order: EsportsOrder) =>
    order.payment_status === 'paid' &&
    order.fulfillment_status !== 'completed' &&
    order.fulfillment_status !== 'cancelled';

  // ── 加钟（§3.3 / §6.2 / §12.5）：客服对服务中订单发起，陪玩确认后累加并生成加钟分成 ──
  const addonVisible = ref(false);
  const addonLoading = ref(false);
  const addonSubmitting = ref(false);
  const addonOrderId = ref(0);
  const addons = ref<EsportsOrderAddon[]>([]);
  const addonForm = reactive({ addedYuan: 0, addedUnits: 0, note: '' });
  const addonStatusMap: Record<string, string> = {
    pending: '待陪玩确认',
    confirmed: '已确认',
    rejected: '已拒绝',
    cancelled: '已撤回',
  };
  const addonStatusLabel = (value: string) => addonStatusMap[value] || value;

  // ── 结单条件（§3.4）：条件不满足时结单按钮不可点，弹窗内逐项展示未满足原因 ──
  const closeConditionMap = ref<Record<number, CloseConditionStatus>>({});

  async function loadCloseConditions() {
    const pending = orders.value.filter(
      (order) => order.fulfillment_status === 'pending_close'
    );
    if (!pending.length) {
      closeConditionMap.value = {};
      return;
    }
    const results = await Promise.all(
      pending.map(async (order) => {
        try {
          return {
            id: order.id,
            status: (await getOrderCloseConditions(order.id)).data.data,
          };
        } catch {
          return { id: order.id, status: null };
        }
      })
    );
    const map: Record<number, CloseConditionStatus> = {};
    results.forEach((item) => {
      if (item.status) map[item.id] = item.status;
    });
    closeConditionMap.value = map;
  }

  async function load() {
    loading.value = true;
    try {
      orders.value = (await listOrders()).data.data || [];
      await loadCloseConditions();
    } catch {
      Message.error('加载失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  async function applyPriceAdjustment(item: PriceAdjustment) {
    try {
      await repriceOrder(item.order_id, {
        expected_version: item.order_version,
        quantity: item.quantity,
        manual_adjust_cents: item.manual_adjust_cents,
        reason: item.reason,
        approval_id: item.id,
      });
      Message.success('审批报价已应用，须客户重新确认报价');
      await load();
      await loadPriceAdjustments();
    } catch (err) {
      Message.error(errorText(err, '应用失败：订单或审批状态已变化'));
    }
  }

  const closeConditionOf = (record: EsportsOrder) =>
    closeConditionMap.value[record.id];
  // 仅在已拿到条件状态且判定为不满足时置灰，避免接口异常导致无法结单。
  const isCloseBlocked = (record: EsportsOrder) => {
    const status = closeConditionOf(record);
    return !!status && !status.satisfied;
  };
  const closeBlockedReason = (record: EsportsOrder) => {
    const status = closeConditionOf(record);
    return status ? status.reasons.join('；') : '';
  };

  async function loadAddons() {
    if (!addonOrderId.value) return;
    addonLoading.value = true;
    try {
      addons.value =
        (await listOrderAddons(addonOrderId.value)).data.data || [];
    } catch {
      Message.error('加载加钟列表失败，请稍后重试');
    } finally {
      addonLoading.value = false;
    }
  }

  function openAddon(record: EsportsOrder) {
    addonOrderId.value = record.id;
    addonForm.addedYuan = 0;
    addonForm.addedUnits = 0;
    addonForm.note = '';
    addonVisible.value = true;
    loadAddons();
  }

  async function submitAddon() {
    const addedCents = Math.round(addonForm.addedYuan * 100);
    if (addedCents <= 0 && addonForm.addedUnits <= 0) {
      Message.warning('追加金额与追加服务量至少填一项');
      return;
    }
    addonSubmitting.value = true;
    try {
      await createOrderAddon(addonOrderId.value, {
        added_cents: addedCents,
        added_units: addonForm.addedUnits,
        note: addonForm.note.trim(),
      });
      Message.success('已发起加钟，等待陪玩确认');
      addonForm.addedYuan = 0;
      addonForm.addedUnits = 0;
      addonForm.note = '';
      await loadAddons();
      await load();
    } catch (err) {
      Message.error(
        errorText(
          err,
          '发起加钟失败：仅服务中订单可发起，且同一订单只允许一条待确认加钟'
        )
      );
    } finally {
      addonSubmitting.value = false;
    }
  }

  async function withdrawAddon(record: EsportsOrderAddon) {
    try {
      await cancelOrderAddon(record.id);
      Message.success('已撤回加钟');
      await loadAddons();
    } catch (err) {
      Message.error(errorText(err, '撤回失败：加钟已被陪玩处理'));
    }
  }

  // 加钟收款（§3.3）：确认后的追加金额由客服按客户余额收单。
  const addonPaymentLabel = (record: EsportsOrderAddon) => {
    if (record.status !== 'confirmed') return '—';
    return record.payment_status === 'paid'
      ? `已收 ${money(record.paid_cents)}`
      : '待收款';
  };

  async function collectAddon(record: EsportsOrderAddon) {
    try {
      await payOrderAddonByBalance(record.id);
      Message.success('已完成加钟收款');
      await loadAddons();
    } catch (err) {
      Message.error(errorText(err, '收款失败：加钟未确认或客户余额不足'));
    }
  }

  // ── 结单复核（§3.4）──
  const closeReviewVisible = ref(false);
  const closeReviewTarget = ref<EsportsOrder | null>(null);
  const closeReviewForm = reactive({ reason: '' });

  async function approveReview(record: EsportsOrder) {
    try {
      await approveCloseReview(record.id);
      Message.success('已复核通过，订单完成');
      await load();
    } catch (err) {
      Message.error(errorText(err, '复核通过失败：不得自审或状态已变化'));
    }
  }

  function openRejectReview(record: EsportsOrder) {
    closeReviewTarget.value = record;
    closeReviewForm.reason = '';
    closeReviewVisible.value = true;
  }

  async function submitRejectReview() {
    const record = closeReviewTarget.value;
    if (!record) return;
    if (!closeReviewForm.reason.trim()) {
      Message.warning('请填写驳回原因');
      return;
    }
    try {
      await rejectCloseReview(record.id, closeReviewForm.reason.trim());
      closeReviewVisible.value = false;
      Message.success('已驳回，订单回退待结单');
      await load();
    } catch (err) {
      Message.error(errorText(err, '复核驳回失败：不得自审或状态已变化'));
    }
  }
  // 仅已付款、未存单、未结束的订单可存单。
  const canDeposit = (order: EsportsOrder) =>
    canOperate.value &&
    order.deposit_status === 'none' &&
    order.payment_status === 'paid' &&
    order.fulfillment_status !== 'completed' &&
    order.fulfillment_status !== 'cancelled';
  const opsTitle = computed(
    () =>
      ({
        reprice: '订单改价',
        reschedule: '订单改期',
        cancel: '取消订单',
        close: '结单',
      }[opsAction.value])
  );
  const repriceQuote = ref<RepriceQuote | null>(null);
  const repricePreviewError = ref('');
  const repricePreviewLoading = ref(false);
  let repricePreviewSequence = 0;
  watch(
    () => [
      opsVisible.value,
      opsAction.value,
      opsTarget.value?.id,
      opsForm.quantity,
      opsForm.manualAdjustYuan,
    ],
    async () => {
      repricePreviewSequence += 1;
      const sequence = repricePreviewSequence;
      repriceQuote.value = null;
      repricePreviewError.value = '';
      if (
        !opsVisible.value ||
        opsAction.value !== 'reprice' ||
        !opsTarget.value ||
        !Number.isSafeInteger(opsForm.quantity) ||
        opsForm.quantity < 1 ||
        !Number.isFinite(opsForm.manualAdjustYuan)
      ) {
        repricePreviewLoading.value = false;
        return;
      }
      repricePreviewLoading.value = true;
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 180);
      });
      if (sequence !== repricePreviewSequence) return;
      try {
        const result = await previewReprice(opsTarget.value.id, {
          expected_version: opsTarget.value.version,
          quantity: opsForm.quantity,
          manual_adjust_cents: Math.round(opsForm.manualAdjustYuan * 100),
          reason: '',
        });
        if (sequence === repricePreviewSequence) {
          repriceQuote.value = result.data.data;
        }
      } catch (error) {
        if (sequence === repricePreviewSequence) {
          repricePreviewError.value = errorText(error, '报价无法计算');
        }
      } finally {
        if (sequence === repricePreviewSequence) {
          repricePreviewLoading.value = false;
        }
      }
    }
  );
  const previewPayableText = computed(() => {
    if (repricePreviewLoading.value) return '正在计算报价…';
    if (repricePreviewError.value) return repricePreviewError.value;
    const quote = repriceQuote.value;
    if (!quote) return '请填写份数和调整金额';
    return `${money(quote.unit_price_cents)} × ${quote.quantity} − ${money(
      quote.discount_cents
    )} + ${money(quote.manual_adjust_cents)} = ${money(quote.payable_cents)}`;
  });

  // ── 授权协作客服：负责人把订单只读查看权限授予其他客服，不转移负责关系 ──
  // 客服候选来自管理员列表（getAdmins），取不到名称时回落 #<admin_id>。
  interface CollaboratorAdminOption {
    id: number;
    username: string;
  }
  const collaborators = ref<EsportsOrderCollaborator[]>([]);
  const collaboratorLoading = ref(false);
  const collaboratorSubmitting = ref(false);
  const collaboratorOrderId = ref(0);
  const collaboratorAdminId = ref<number | undefined>(undefined);
  const adminOptions = ref<CollaboratorAdminOption[]>([]);
  const adminOptionsLoading = ref(false);
  // 管理员列表接口不可用时（客服通常无管理员管理权限），退化为手填 admin_id。
  const adminOptionsFailed = ref(false);
  const adminOptionsLoaded = ref(false);

  const adminNameMap = computed(() => {
    const map = new Map<number, string>();
    adminOptions.value.forEach((admin) => map.set(admin.id, admin.username));
    return map;
  });
  const adminLabel = (adminId: number) =>
    adminNameMap.value.get(adminId) || `#${adminId}`;
  const dateTimeText = (value: string) =>
    value ? value.replace('T', ' ').slice(0, 19) : '—';
  // 已在该订单协作中的客服不再出现在下拉候选中，避免重复提交。
  const collaboratorCandidates = computed(() => {
    const used = new Set(collaborators.value.map((item) => item.admin_id));
    return adminOptions.value.filter((admin) => !used.has(admin.id));
  });

  async function loadAdminOptions() {
    if (
      adminOptionsLoaded.value ||
      adminOptionsLoading.value ||
      adminOptionsFailed.value
    )
      return;
    adminOptionsLoading.value = true;
    try {
      const res = await getAdmins({
        page: 1,
        page_size: 200,
        status: 'active',
      });
      adminOptions.value = res.data.data.data || [];
      adminOptionsLoaded.value = true;
    } catch {
      // 名称仅用于展示，拿不到权限时静默降级为 #id + 手填 admin_id。
      adminOptionsFailed.value = true;
    } finally {
      adminOptionsLoading.value = false;
    }
  }

  async function loadCollaborators(orderId: number) {
    collaboratorOrderId.value = orderId;
    collaborators.value = [];
    collaboratorAdminId.value = undefined;
    if (!canViewCollaborators.value) return;
    collaboratorLoading.value = true;
    try {
      const list = (await listOrderCollaborators(orderId)).data.data || [];
      // 快速切换订单时丢弃过期响应，避免串单。
      if (collaboratorOrderId.value === orderId) collaborators.value = list;
    } catch (err) {
      if (collaboratorOrderId.value === orderId) {
        Message.error(errorText(err, '加载协作客服失败'));
      }
    } finally {
      if (collaboratorOrderId.value === orderId) {
        collaboratorLoading.value = false;
      }
    }
  }

  async function submitCollaborator() {
    const adminId = collaboratorAdminId.value;
    if (!adminId || !Number.isSafeInteger(adminId) || adminId <= 0) {
      Message.warning('请选择客服');
      return;
    }
    collaboratorSubmitting.value = true;
    try {
      // 后端对已存在的协作记录幂等返回，前端无需先查重。
      await addOrderCollaborator(collaboratorOrderId.value, adminId);
      Message.success('已添加协作客服');
      await loadCollaborators(collaboratorOrderId.value);
    } catch (err) {
      Message.error(errorText(err, '添加失败：仅超级管理员或订单负责人可授予'));
    } finally {
      collaboratorSubmitting.value = false;
    }
  }

  async function removeCollaborator(record: EsportsOrderCollaborator) {
    try {
      await removeOrderCollaborator(record.order_id, record.admin_id);
      Message.success('已移除协作客服');
      await loadCollaborators(record.order_id);
    } catch (err) {
      Message.error(errorText(err, '移除失败：仅超级管理员或订单负责人可撤销'));
    }
  }

  // ── 在线收款（§4.3-02）：渠道枚举与启停态来自 /admin/payment-channels ──
  const paymentVisible = ref(false);
  const paymentLoading = ref(false);
  const paymentResult = ref<OrderPaymentStartView | null>(null);
  const paymentChannels = ref<PaymentChannelView[]>([]);
  const paymentChannelsLoading = ref(false);
  const paymentChannelsError = ref('');
  const paymentForm = reactive({
    orderId: 0,
    orderNo: '',
    channel: 'wechat_work' as PaymentChannel,
  });
  const paymentChannelLabels: Record<string, string> = {
    wechat_work: '企业微信收款',
    merchant_qr: '工作室商户码',
    corporate_transfer: '对公转账',
  };
  const channelLabel = (channel: string) =>
    paymentChannelLabels[channel] || channel;
  const paymentChannelOptions = computed(() => {
    if (paymentChannels.value.length > 0) {
      return paymentChannels.value.map((item) => ({
        value: item.channel,
        label: `${channelLabel(item.channel)}（${
          item.enabled ? '启用中' : '已停用'
        } · ${item.active_accounts} 个启用账户）`,
        // 停用渠道后端必然拒绝，前端直接置灰；启停态读不到时全部可选，由后端如实判定。
        disabled: !item.enabled,
      }));
    }
    return Object.keys(paymentChannelLabels).map((value) => ({
      value,
      label: channelLabel(value),
      disabled: false,
    }));
  });

  async function loadPaymentChannels() {
    if (paymentChannelsLoading.value) return;
    paymentChannelsLoading.value = true;
    paymentChannelsError.value = '';
    try {
      paymentChannels.value = (await listPaymentChannels()).data.data || [];
    } catch (err) {
      paymentChannels.value = [];
      paymentChannelsError.value = errorText(
        err,
        '无法读取收款渠道配置态（可能无「收款方式」查看权限），渠道是否开通以发起后的后端返回为准'
      );
    } finally {
      paymentChannelsLoading.value = false;
    }
  }

  function openPayment(order: EsportsOrder) {
    paymentForm.orderId = order.id;
    paymentForm.orderNo = order.order_no;
    paymentForm.channel = 'wechat_work';
    paymentResult.value = null;
    paymentVisible.value = true;
    loadPaymentChannels();
  }

  async function submitPayment() {
    if (!paymentForm.channel) {
      Message.warning('请选择收款渠道');
      return;
    }
    paymentLoading.value = true;
    try {
      paymentResult.value =
        (await startOrderPayment(paymentForm.orderId, paymentForm.channel)).data
          .data || null;
      Message.success('已发起收款，请把收银台地址发给客户');
      await load();
    } catch (err) {
      // 未开通渠道时后端返回 503「收款通道尚未配置」，原样展示，不做乐观成功。
      paymentResult.value = null;
      Message.error(errorText(err, '发起收款失败'));
    } finally {
      paymentLoading.value = false;
    }
  }

  // ── 档期确认超时处置（§5.5-06）：退还 / 改期两种处置，放行范围由后端配置决定 ──
  const appointmentVisible = ref(false);
  const appointmentLoading = ref(false);
  const appointmentError = ref('');
  const appointmentForm = reactive({
    orderId: 0,
    orderNo: '',
    orderVersion: 1,
    requestedStartAt: '',
    confirmDeadline: '',
    suspendedAt: '',
    action: 'refund' as 'refund' | 'reschedule',
    startAt: '',
    reason: '',
  });

  // 可用处置动作由后端返回（api.ts 的 getAppointmentDisposalOptions）：
  // allowed_actions / current_action / expire_at。
  const appointmentOptions = ref<AppointmentDisposalOptions | null>(null);
  const appointmentOptionsLoading = ref(false);
  // 只读接口不可用时降级为原来的两项，并在弹窗内明确提示，不静默吞错。
  const appointmentOptionsFallback = ref(false);
  const appointmentOptionsError = ref('');
  const appointmentActionText = (action: string) =>
    ({
      refund: '全额退还（平台责任，不收手续费）',
      reschedule: '改期（回到待确认档期）',
    }[action] || action);
  const appointmentCurrentActionText = (action: string) =>
    ({
      refund: '仅允许全额退还',
      reschedule: '仅允许改期',
      both: '退还与改期皆可',
    }[action] || action);
  // 只渲染后端放行的动作；读取失败时退回原有的 refund / reschedule 两项。
  const appointmentActionOptions = computed<string[]>(() => {
    const allowed = appointmentOptions.value?.allowed_actions || [];
    return allowed.length ? allowed : ['refund', 'reschedule'];
  });

  async function loadAppointmentDisposalOptions(orderId: number) {
    appointmentOptionsLoading.value = true;
    try {
      appointmentOptions.value =
        (await getAppointmentDisposalOptions(orderId)).data.data || null;
      const allowed = appointmentActionOptions.value;
      if (allowed.length && !allowed.includes(appointmentForm.action)) {
        appointmentForm.action = allowed[0] as 'refund' | 'reschedule';
      }
    } catch (err) {
      appointmentOptions.value = null;
      appointmentOptionsFallback.value = true;
      appointmentOptionsError.value = errorText(err, '读取处置策略失败');
    } finally {
      appointmentOptionsLoading.value = false;
    }
  }

  function openAppointmentDisposal(order: EsportsOrder) {
    appointmentForm.orderId = order.id;
    appointmentForm.orderNo = order.order_no;
    appointmentForm.orderVersion = order.version;
    appointmentForm.requestedStartAt = order.requested_start_at || '';
    appointmentForm.confirmDeadline =
      order.appointment_confirmation_deadline || '';
    appointmentForm.suspendedAt = appointmentSuspendedAt(order);
    appointmentForm.action = 'refund';
    appointmentForm.startAt = '';
    appointmentForm.reason = '';
    appointmentError.value = '';
    appointmentOptions.value = null;
    appointmentOptionsFallback.value = false;
    appointmentOptionsError.value = '';
    appointmentVisible.value = true;
    loadAppointmentDisposalOptions(order.id);
  }

  async function submitAppointmentDisposal() {
    const reason = appointmentForm.reason.trim();
    if (!reason) {
      Message.warning('请填写处置原因');
      return;
    }
    if (appointmentForm.action === 'reschedule' && !appointmentForm.startAt) {
      Message.warning('改期须选择新的预约开始时间');
      return;
    }
    appointmentLoading.value = true;
    appointmentError.value = '';
    try {
      await disposeExpiredAppointment(appointmentForm.orderId, {
        action: appointmentForm.action,
        reason,
        start_at:
          appointmentForm.action === 'reschedule'
            ? new Date(appointmentForm.startAt).toISOString()
            : undefined,
        expected_version: appointmentForm.orderVersion,
      });
      appointmentVisible.value = false;
      Message.success(
        appointmentForm.action === 'refund'
          ? '已全额退还并取消订单'
          : '已改期，订单回到待确认档期'
      );
      await load();
    } catch (err) {
      // 「当前档期超时只允许 X 处置」等中文原因原样回显，便于按配置改选处置方式。
      appointmentError.value = errorText(
        err,
        '处置失败：状态已变化或方式未被放行'
      );
      Message.error(appointmentError.value);
    } finally {
      appointmentLoading.value = false;
    }
  }

  // ── 转公共池（§5.1）：清空负责客服并留痕，订单回到待派单公共池 ──
  const releasePoolVisible = ref(false);
  const releasePoolLoading = ref(false);
  const releasePoolForm = reactive({ orderId: 0, orderNo: '', reason: '' });

  function openReleasePool(order: EsportsOrder) {
    releasePoolForm.orderId = order.id;
    releasePoolForm.orderNo = order.order_no;
    releasePoolForm.reason = '';
    releasePoolVisible.value = true;
  }

  async function submitReleasePool() {
    const reason = releasePoolForm.reason.trim();
    if (!reason) {
      Message.warning('请填写转池原因');
      return;
    }
    releasePoolLoading.value = true;
    try {
      await releaseOrderToPool(releasePoolForm.orderId, reason);
      releasePoolVisible.value = false;
      Message.success('已转公共池');
      await load();
    } catch (err) {
      Message.error(errorText(err, '转池失败：仅待派单订单可转公共池'));
    } finally {
      releasePoolLoading.value = false;
    }
  }

  // ── 限时改期提案（§3.3）：已付款改期须客户与已接单成员逐人确认，撤回不改订单 ──
  const proposalVisible = ref(false);
  const proposalSubmitting = ref(false);
  const proposalLoading = ref(false);
  const proposals = ref<RescheduleProposalView[]>([]);
  const proposalForm = reactive({
    orderId: 0,
    orderNo: '',
    orderVersion: 1,
    startAt: '',
    durationMinutes: 60,
    reason: '',
  });
  const proposalStatusMap: Record<string, string> = {
    pending: '待确认',
    confirmed: '已生效',
    rejected: '已拒绝',
    expired: '已过期',
    withdrawn: '已撤回',
  };
  const proposalStatusLabel = (status: string) =>
    proposalStatusMap[status] || status;
  const proposalStatusColor = (status: string) =>
    ((
      {
        pending: 'orange',
        confirmed: 'green',
        rejected: 'red',
        expired: 'gray',
        withdrawn: 'gray',
      } as Record<string, string>
    )[status] || 'gray');
  const proposalProgress = (record: RescheduleProposalView) => {
    if (record.status !== 'pending') return '—';
    const confirmed = (record.confirmations || []).filter(
      (item) => item.decision === 'confirmed'
    ).length;
    return `已确认 ${confirmed}，待确认 ${
      (record.pending_confirmers || []).length
    }，截止 ${dateTimeText(record.expires_at)}`;
  };

  async function loadProposals(orderId: number) {
    if (!canListProposals.value) return;
    proposalLoading.value = true;
    try {
      proposals.value =
        (await listOrderRescheduleProposals(orderId)).data.data || [];
    } catch (err) {
      proposals.value = [];
      Message.error(errorText(err, '加载改期提案失败'));
    } finally {
      proposalLoading.value = false;
    }
  }

  function openProposal(order: EsportsOrder) {
    proposalForm.orderId = order.id;
    proposalForm.orderNo = order.order_no;
    proposalForm.orderVersion = order.version;
    proposalForm.startAt = '';
    proposalForm.durationMinutes = order.service_duration_minutes || 60;
    proposalForm.reason = '';
    proposalVisible.value = true;
  }

  async function submitProposal() {
    if (!proposalForm.startAt) {
      Message.warning('请选择新的开始时间');
      return;
    }
    const reason = proposalForm.reason.trim();
    if (!reason) {
      Message.warning('请填写改期原因');
      return;
    }
    proposalSubmitting.value = true;
    try {
      await proposeOrderReschedule(proposalForm.orderId, {
        expected_version: proposalForm.orderVersion,
        start_at: new Date(proposalForm.startAt).toISOString(),
        service_duration_minutes: proposalForm.durationMinutes,
        reason,
      });
      proposalVisible.value = false;
      Message.success('已发起改期提案，等待客户与已接单成员确认');
      await load();
      await loadProposals(proposalForm.orderId);
    } catch (err) {
      Message.error(
        errorText(err, '发起提案失败：仅已付款且状态未变化的订单可提案')
      );
    } finally {
      proposalSubmitting.value = false;
    }
  }

  async function withdrawProposal(record: RescheduleProposalView) {
    try {
      await withdrawRescheduleProposal(record.id);
      Message.success('已撤回改期提案');
      await loadProposals(record.order_id);
    } catch (err) {
      Message.error(errorText(err, '撤回失败：提案已确认、过期或已撤回'));
    }
  }

  // ── 席位与席位角色（§5.5 / §15.1）──
  const seats = ref<EsportsDispatchSeat[]>([]);
  const seatsLoading = ref(false);
  const seatRoles = ref<EsportsSeatSpec[]>([]);

  async function loadSeats(orderId: number) {
    if (!canViewSeats.value) return;
    seatsLoading.value = true;
    try {
      seats.value = (await listOrderSeats(orderId)).data.data || [];
    } catch (err) {
      seats.value = [];
      Message.error(errorText(err, '无法获取席位信息'));
    } finally {
      seatsLoading.value = false;
    }
  }

  async function loadSeatRoles(orderId: number) {
    if (!canViewSeatRoles.value) return;
    try {
      seatRoles.value =
        (await getOrderSeatRoles(orderId)).data.data?.seat_roles || [];
    } catch {
      // 席位角色只用于展示约束，读取失败不阻断详情。
      seatRoles.value = [];
    }
  }

  // ── 服务段代操作（§3.3）：暂停 / 恢复 / 终止 / 时长更正，全部按事件留痕 ──
  type ServiceAction = 'pause' | 'resume' | 'terminate' | 'correction';
  const serviceVisible = ref(false);
  const serviceLoading = ref(false);
  const serviceAction = ref<ServiceAction>('pause');
  const serviceError = ref('');
  const serviceResultText = ref('');
  const serviceForm = reactive({
    orderId: 0,
    playerId: 0,
    seatIndex: 0,
    terminatedUnits: 0,
    effectiveSeconds: 0,
    pausedSeconds: 0,
    responsibility: 'player',
    reason: '',
    lastTimingText: '',
    currentTimingText: '',
  });
  // 服务段计时只读接口（api.ts 的 getOrderServiceTiming）：upper_bound_seconds 与后端
  // 更正校验同源，用作输入上限与提交前拦截。
  const serviceTimingLoading = ref(false);
  // null 表示没读到上界（字段缺失或接口失败），此时只靠服务端错误文案兜底。
  const serviceTimingUpperBound = ref<number | null>(null);
  const responsibilityOptions = [
    { value: 'player', label: '陪玩' },
    { value: 'customer', label: '客户' },
    { value: 'platform', label: '平台' },
    { value: 'force_majeure', label: '不可抗力' },
  ];
  const responsibilityLabel = (value: string) =>
    responsibilityOptions.find((item) => item.value === value)?.label || value;
  // 服务端最近一次返回的计时快照（暂停 / 恢复响应），供时长更正弹窗参照。
  const serviceTimingTexts: Record<number, string> = {};
  const serviceTitle = computed(
    () =>
      ({
        pause: '代暂停服务段（§3.3）',
        resume: '代恢复服务段（§3.3）',
        terminate: '终止服务段（§3.3）',
        correction: '服务时长更正（留痕）',
      }[serviceAction.value])
  );
  const serviceOkText = computed(
    () =>
      ({
        pause: '确认暂停',
        resume: '确认恢复',
        terminate: '确认终止',
        correction: '提交更正',
      }[serviceAction.value])
  );

  // 秒数按「X 分 Y 秒」展示，与弹窗提示口径一致。
  const secondsText = (seconds: number) =>
    `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;

  async function loadServiceTiming(orderId: number, playerId: number) {
    serviceTimingLoading.value = true;
    try {
      const timing = (await getOrderServiceTiming(orderId, playerId)).data.data;
      if (!timing) return;
      if (typeof timing.effective_seconds === 'number') {
        serviceForm.effectiveSeconds = timing.effective_seconds;
        serviceForm.currentTimingText = `当前有效时长 ${secondsText(
          timing.effective_seconds
        )}`;
      }
      serviceTimingUpperBound.value =
        typeof timing.upper_bound_seconds === 'number' &&
        timing.upper_bound_seconds > 0
          ? timing.upper_bound_seconds
          : null;
    } catch (err) {
      // 读不到计时不影响提交：不预填、不加前端上界，交由服务端更正校验兜底。
      serviceTimingUpperBound.value = null;
      serviceForm.currentTimingText = '';
      serviceError.value = errorText(
        err,
        '无法读取当前服务段计时，提交后以服务端校验为准'
      );
    } finally {
      serviceTimingLoading.value = false;
    }
  }

  function openServiceOps(seat: EsportsDispatchSeat, action: ServiceAction) {
    if (!seat.player_id) return;
    serviceAction.value = action;
    serviceForm.orderId = seat.order_id;
    serviceForm.playerId = seat.player_id;
    serviceForm.seatIndex = seat.seat_index;
    serviceForm.terminatedUnits = 0;
    serviceForm.effectiveSeconds = 0;
    serviceForm.pausedSeconds = 0;
    serviceForm.responsibility = 'player';
    serviceForm.reason = '';
    serviceForm.lastTimingText = serviceTimingTexts[seat.player_id] || '';
    serviceForm.currentTimingText = '';
    serviceTimingUpperBound.value = null;
    serviceError.value = '';
    serviceResultText.value = '';
    serviceVisible.value = true;
    // 时长更正弹窗打开即按后端口径预填当前有效时长与可填上限。
    if (action === 'correction') {
      loadServiceTiming(seat.order_id, seat.player_id);
    }
  }

  function rememberTiming(timing?: PlayerServiceTiming | null) {
    if (!timing) return;
    const text = `有效 ${timing.effective_seconds} 秒 · 暂停 ${timing.paused_seconds} 秒 · 状态 ${timing.status}`;
    serviceTimingTexts[timing.player_id] = text;
    serviceForm.lastTimingText = text;
  }

  async function refreshServiceViews() {
    await load();
    if (detail.value) await loadSeats(detail.value.id);
  }

  async function submitServiceOps() {
    const reason = serviceForm.reason.trim();
    if (!reason) {
      Message.warning('请填写原因');
      return;
    }
    // 已读到上界时前端直接拦下，不再等服务端报越界。
    if (
      serviceAction.value === 'correction' &&
      serviceTimingUpperBound.value !== null &&
      serviceForm.effectiveSeconds > serviceTimingUpperBound.value
    ) {
      Message.warning(
        `更正后有效秒数不得超过可填上限 ${serviceTimingUpperBound.value} 秒`
      );
      return;
    }
    serviceLoading.value = true;
    serviceError.value = '';
    serviceResultText.value = '';
    const { orderId, playerId } = serviceForm;
    try {
      if (serviceAction.value === 'pause' || serviceAction.value === 'resume') {
        const timing =
          serviceAction.value === 'pause'
            ? (await pauseOrderPlayerService(orderId, playerId, reason)).data
                .data
            : (await resumeOrderPlayerService(orderId, playerId, reason)).data
                .data;
        rememberTiming(timing);
        serviceVisible.value = false;
        Message.success(
          serviceAction.value === 'pause' ? '已代暂停服务段' : '已代恢复服务段'
        );
        await refreshServiceViews();
      } else if (serviceAction.value === 'terminate') {
        const result = (
          await terminateOrderPlayerService(orderId, playerId, {
            terminated_units: serviceForm.terminatedUnits,
            responsibility: serviceForm.responsibility,
            reason,
          })
        ).data.data;
        serviceResultText.value = `已登记履约量 ${
          result.terminated_units
        } · 未履约量 ${result.unfulfilled_units} · 责任方 ${responsibilityLabel(
          result.fault_party
        )} · 有效 ${result.effective_seconds} 秒 / 暂停 ${
          result.paused_seconds
        } 秒`;
        Message.success('已终止服务段');
        await refreshServiceViews();
      } else {
        const result = (
          await correctOrderPlayerServiceTiming(orderId, playerId, {
            effective_seconds: serviceForm.effectiveSeconds,
            paused_seconds: serviceForm.pausedSeconds,
            responsibility: serviceForm.responsibility,
            reason,
          })
        ).data.data;
        serviceResultText.value = `有效秒数 ${
          result.effective_seconds_before
        } → ${result.effective_seconds_after} · 暂停秒数 ${
          result.paused_seconds_before
        } → ${result.paused_seconds_after} · 停工 ${
          result.downtime_seconds
        } 秒 / ${result.downtime_count} 次 · 责任方 ${responsibilityLabel(
          result.responsibility
        )}`;
        Message.success('已提交时长更正留痕');
        await refreshServiceViews();
      }
    } catch (err) {
      // 更正越界时后端返回「有效秒数须在 1–N 秒之间（墙钟跨度 …）」——原样展示有效时长与上限。
      serviceError.value = errorText(
        err,
        '服务段操作失败：状态已变化、无归属权限或超出可更正区间'
      );
      Message.error(serviceError.value);
    } finally {
      serviceLoading.value = false;
    }
  }

  // ── 固排成队（§5.3）：候选由后端按固排关系 / 资格 / 在线 / 分区 / 等级过滤 ──
  const teamVisible = ref(false);
  const teamOrderId = ref(0);
  const teamForm = reactive({ mainPlayerId: 1 });
  const teamCandidates = ref<TeammateDispatchCandidate[]>([]);
  const teamSelected = ref<number[]>([]);
  const teamCandidatesLoaded = ref(false);

  function openTeamDispatch(orderId: number) {
    teamOrderId.value = orderId;
    teamForm.mainPlayerId = 1;
    teamCandidates.value = [];
    teamSelected.value = [];
    teamCandidatesLoaded.value = false;
    teamVisible.value = true;
  }

  async function loadTeamCandidates() {
    if (teamForm.mainPlayerId < 1) {
      Message.warning('请填写有效的主陪玩档案 ID');
      return;
    }
    try {
      teamCandidates.value =
        (await getTeammateCandidates(teamOrderId.value, teamForm.mainPlayerId))
          .data.data || [];
      teamSelected.value = [];
      teamCandidatesLoaded.value = true;
    } catch (err) {
      Message.error(errorText(err, '加载固排候选失败：订单状态或主陪玩无效'));
    }
  }

  async function submitTeamDispatch() {
    if (teamForm.mainPlayerId < 1) {
      Message.warning('请填写有效的主陪玩档案 ID');
      return;
    }
    try {
      await teamDispatch(
        teamOrderId.value,
        teamForm.mainPlayerId,
        teamSelected.value
      );
      teamVisible.value = false;
      Message.success('已一次成队并发出邀请');
      await loadSeats(teamOrderId.value);
      await load();
    } catch (err) {
      Message.error(errorText(err, '成队失败：固排关系、资格或空席位不足'));
    }
  }

  function closeTeamDispatch() {
    teamCandidates.value = [];
    teamSelected.value = [];
    teamCandidatesLoaded.value = false;
  }

  // ── 结单凭证（§3.4-03）：close-form 返回的图片附件必须逐张查看后原样回传 ──
  const evidenceAttachmentIds = ref<number[]>([]);
  const viewedEvidenceIds = ref<number[]>([]);
  const evidenceUrls = ref<Record<number, string>>({});
  const evidenceUrlOf = (attachmentId: number) =>
    evidenceUrls.value[attachmentId] || '';
  const markEvidenceViewed = (attachmentId: number) => {
    if (!viewedEvidenceIds.value.includes(attachmentId)) {
      viewedEvidenceIds.value = [...viewedEvidenceIds.value, attachmentId];
    }
  };
  const toggleEvidenceViewed = (attachmentId: number) => {
    viewedEvidenceIds.value = viewedEvidenceIds.value.includes(attachmentId)
      ? viewedEvidenceIds.value.filter((id) => id !== attachmentId)
      : [...viewedEvidenceIds.value, attachmentId];
  };
  const markAllEvidenceViewed = () => {
    viewedEvidenceIds.value = [...evidenceAttachmentIds.value];
  };
  async function loadEvidence(attachmentIds: number[]) {
    evidenceAttachmentIds.value = attachmentIds;
    viewedEvidenceIds.value = [];
    evidenceUrls.value = {};
    const resolved = await Promise.all(
      attachmentIds.map(async (attachmentId) => {
        try {
          return [
            attachmentId,
            await resolveAttachmentAccessUrl(attachmentId),
          ] as const;
        } catch {
          return [attachmentId, ''] as const;
        }
      })
    );
    const urls: Record<number, string> = {};
    resolved.forEach(([attachmentId, url]) => {
      if (url) urls[attachmentId] = url;
    });
    evidenceUrls.value = urls;
  }

  // ── 取消试算（§3.3）：取消前先展示手续费与退款构成，再确认提交 ──
  const cancelQuote = ref<CancelQuote | null>(null);
  const cancelPreviewLoading = ref(false);
  const cancelPreviewError = ref('');

  async function loadCancelPreview(orderId: number) {
    cancelPreviewLoading.value = true;
    cancelPreviewError.value = '';
    try {
      cancelQuote.value = (await previewCancelOrder(orderId)).data.data || null;
    } catch (err) {
      cancelQuote.value = null;
      cancelPreviewError.value = errorText(
        err,
        '取消试算失败，请确认订单归属与状态'
      );
    } finally {
      cancelPreviewLoading.value = false;
    }
  }

  async function showDetail(id: number) {
    try {
      detail.value = (await getOrder(id)).data.data || null;
      detailApproval.value = null;
      try {
        detailApproval.value =
          (await getOrderCloseApproval(id)).data.data || null;
      } catch {
        detailApproval.value = null;
      }
      detailVisible.value = true;
      // 详情打开后并行加载协作客服、候选客服名称、席位 / 席位角色与改期提案。
      loadCollaborators(id);
      loadAdminOptions();
      loadSeats(id);
      loadSeatRoles(id);
      loadProposals(id);
    } catch {
      Message.error('无法获取订单详情');
    }
  }

  async function openOps(order: EsportsOrder, action: OpsAction) {
    opsTarget.value = order;
    opsAction.value = action;
    opsForm.quantity = order.quantity;
    opsForm.manualAdjustYuan = order.manual_adjust_cents / 100;
    opsForm.startAt = '';
    opsForm.reason = '';
    closeForm.value = null;
    closeFormValues.value = {};
    substituteRows.value = [];
    evidenceAttachmentIds.value = [];
    viewedEvidenceIds.value = [];
    evidenceUrls.value = {};
    cancelQuote.value = null;
    cancelPreviewError.value = '';
    opsVisible.value = true;
    if (action === 'close') {
      try {
        const view = (await getOrderCloseForm(order.id)).data.data || null;
        closeForm.value = view;
        substituteRows.value = (view?.unsubmitted || []).map((item) => ({
          seatIndex: item.seat_index,
          playerId: item.player_id,
          units: 0,
          evidence: '',
        }));
        // 后端本轮新增：订单全部图片附件 ID（升序去重），结单须逐张确认后原样回传。
        const viewWithEvidence = view as
          | (OrderCloseFormView & { evidence_attachment_ids?: number[] })
          | null;
        await loadEvidence(viewWithEvidence?.evidence_attachment_ids || []);
      } catch (err) {
        Message.error(errorText(err, '加载结单配置失败，可重试或直接结单'));
      }
    }
    if (action === 'cancel' && canPreviewCancel.value) {
      loadCancelPreview(order.id);
    }
  }

  async function submitOps() {
    const order = opsTarget.value;
    if (!order) return;
    if (!opsForm.reason.trim()) {
      Message.warning('请填写原因');
      return;
    }
    // 结单条件（§3.4）：条件不满足时结单按钮已置灰，这里再兜一道，后端仍会事务内原子校验。
    if (opsAction.value === 'close') {
      const condition = closeConditionOf(order);
      if (condition && !condition.satisfied) {
        Message.error(`结单条件未满足：${condition.reasons.join('；')}`);
        return;
      }
    }
    // 结单表单（§3.4）：必填项前端先拦一道，后端仍会事务内原子校验。
    if (opsAction.value === 'close') {
      const missing = closeFormFields.value.filter(
        (item) =>
          isCloseFormRequired(item) &&
          isEmptyCloseFormValue(closeFormValues.value[item.key])
      );
      if (missing.length > 0) {
        Message.warning(
          `请填写结单表单必填项：${missing
            .map((item) => item.label)
            .join('、')}`
        );
        return;
      }
    }
    // 结单凭证（§3.4-03）：图片附件未逐张确认时后端必然 400，前端先拦一道并如实提示还差几张。
    if (opsAction.value === 'close' && evidenceAttachmentIds.value.length > 0) {
      const missingEvidence = evidenceAttachmentIds.value.filter(
        (attachmentId) => !viewedEvidenceIds.value.includes(attachmentId)
      );
      if (missingEvidence.length > 0) {
        Message.warning(
          `请先逐张查看服务凭证，还差 ${
            missingEvidence.length
          } 张（附件 #${missingEvidence.join('、#')}）`
        );
        return;
      }
    }
    // 取消试算（§3.3）：后端判定不可取消时先展示拦截原因，不提交取消。
    if (opsAction.value === 'cancel' && cancelQuote.value) {
      if (!cancelQuote.value.cancelable) {
        Message.error(
          cancelQuote.value.blocked_reason ||
            '当前订单不可取消，请按后端提示处理'
        );
        return;
      }
    }
    try {
      let submittedPriceApproval = false;
      if (opsAction.value === 'reprice') {
        if (!repriceQuote.value || repricePreviewLoading.value) {
          Message.warning('请等待服务器计算新报价');
          return;
        }
        const payload = {
          expected_version: order.version,
          quantity: opsForm.quantity,
          manual_adjust_cents: Math.round(opsForm.manualAdjustYuan * 100),
          reason: opsForm.reason.trim(),
        };
        if (repriceQuote.value.requires_approval) {
          await requestPriceAdjustment(order.id, {
            ...payload,
            request_key: crypto.randomUUID(),
          });
          submittedPriceApproval = true;
        } else {
          await repriceOrder(order.id, payload);
        }
      } else if (opsAction.value === 'reschedule') {
        if (!opsForm.startAt) {
          Message.warning('请选择新的开始时间');
          return;
        }
        await rescheduleOrder(order.id, {
          expected_version: order.version,
          start_at: new Date(opsForm.startAt).toISOString(),
          reason: opsForm.reason.trim(),
        });
      } else if (opsAction.value === 'close') {
        const substitutes = substituteRows.value
          .filter((row) => row.units > 0 || row.evidence.trim() !== '')
          .map((row) => ({
            seat_index: row.seatIndex,
            reported_units: row.units,
            evidence_ref: row.evidence.trim(),
          }));
        // 结单须回传 viewed_evidence_attachment_ids（api.ts 的 closeOrder 第 5 参）：
        // 无图片凭证时传 undefined，不写入请求体，保持既有调用方行为。
        await closeOrder(
          order.id,
          opsForm.reason.trim(),
          closeFormValues.value,
          substitutes,
          evidenceAttachmentIds.value.length > 0
            ? evidenceAttachmentIds.value
            : undefined
        );
      } else {
        await cancelOrder(order.id, opsForm.reason.trim());
      }
      opsVisible.value = false;
      let successText = '操作已提交';
      if (submittedPriceApproval) {
        successText = '已提交改价审批，审批通过后再应用报价';
      } else if (opsAction.value === 'close') {
        successText = '已结单';
      }
      Message.success(successText);
      await load();
      if (submittedPriceApproval) await loadPriceAdjustments();
    } catch (err) {
      Message.error(errorText(err, '操作失败，请刷新后重试'));
    }
  }

  async function payWithBalance(order: EsportsOrder) {
    try {
      await payOrderWithBalance(order.id);
      Message.success('已用余额核销，订单转入待派单');
      await load();
    } catch {
      Message.error('核销失败：余额不足或订单状态已变化');
    }
  }

  async function deposit(order: EsportsOrder) {
    try {
      await depositOrder(order.id);
      Message.success('已存单');
      await load();
    } catch {
      Message.error('存单失败：仅已付款订单可存单或状态已变化');
    }
  }

  // ── 渠道成本（§12.1） ──
  const channelCostVisible = ref(false);
  const channelCostLoading = ref(false);
  const channelCostForm = reactive({ orderId: 0, orderNo: '', yuan: 0 });

  function openChannelCost(order: EsportsOrder) {
    channelCostForm.orderId = order.id;
    channelCostForm.orderNo = order.order_no;
    channelCostForm.yuan = (order.channel_cost_cents || 0) / 100;
    channelCostVisible.value = true;
  }

  async function submitChannelCost() {
    const cents = Math.round(channelCostForm.yuan * 100);
    if (cents < 0) {
      Message.warning('渠道成本不能为负');
      return;
    }
    channelCostLoading.value = true;
    try {
      await setOrderChannelCost(channelCostForm.orderId, cents);
      channelCostVisible.value = false;
      Message.success('已登记渠道成本');
      await load();
    } catch (err) {
      Message.error(errorText(err, '登记失败：金额超应付或订单已结单'));
    } finally {
      channelCostLoading.value = false;
    }
  }

  // ── 单笔手动指定分成规则（§12.3 五级优先级最高一级） ──
  const commissionRuleVisible = ref(false);
  const commissionRuleLoading = ref(false);
  const activeCommissionRules = ref<CommissionRule[]>([]);
  const commissionRuleForm = reactive({ orderId: 0, orderNo: '', ruleId: 0 });

  const scopeTextMap: Record<string, string> = {
    global: '全局',
    game: '按游戏',
    level: '按陪玩等级',
    player: '按陪玩',
  };
  function scopeText(scope: string, key: string) {
    if (scope === 'global') return scopeTextMap.global;
    return `${scopeTextMap[scope] || scope}（${key || '-'}）`;
  }

  async function openCommissionRule(order: EsportsOrder) {
    commissionRuleForm.orderId = order.id;
    commissionRuleForm.orderNo = order.order_no;
    commissionRuleForm.ruleId = order.manual_commission_rule_id || 0;
    try {
      const res = await listCommissionRules();
      activeCommissionRules.value = (res.data.data || []).filter(
        (rule) => rule.status === 'active' || rule.status === 'scheduled'
      );
    } catch {
      activeCommissionRules.value = [];
    }
    commissionRuleVisible.value = true;
  }

  async function submitCommissionRule() {
    commissionRuleLoading.value = true;
    try {
      await setOrderManualCommissionRule(
        commissionRuleForm.orderId,
        commissionRuleForm.ruleId
      );
      commissionRuleVisible.value = false;
      Message.success('已更新单笔分成规则');
      await load();
    } catch (err) {
      Message.error(errorText(err, '设置失败：已有成员锁定规则或订单已终态'));
    } finally {
      commissionRuleLoading.value = false;
    }
  }

  // ── 预约档期确认（§3.2 / §5.5） ──
  async function confirmAppointment(order: EsportsOrder) {
    try {
      await confirmOrderAppointment(order.id);
      Message.success('已确认档期');
      await load();
    } catch (err) {
      Message.error(
        errorText(err, '确认失败：提案已超时、开始时间已过或状态已变化')
      );
    }
  }

  async function restore(order: EsportsOrder) {
    try {
      await restoreOrder(order.id);
      Message.success('已恢复');
      await load();
    } catch {
      Message.error('恢复失败：订单状态已变化');
    }
  }

  // ── 补录历史订单（entry_point=admin_backfill）──
  const backfillVisible = ref(false);
  const backfillSubmitting = ref(false);
  const backfillForm = reactive({
    customerId: 0,
    skuId: 0,
    quantity: 1,
    unitPriceYuan: undefined as number | undefined,
    settledAt: '',
    fulfillmentStatus: 'completed' as 'completed' | 'cancelled',
    reason: '',
    countCsCommission: false,
  });

  function openBackfill() {
    backfillForm.customerId = 0;
    backfillForm.skuId = 0;
    backfillForm.quantity = 1;
    backfillForm.unitPriceYuan = undefined;
    backfillForm.settledAt = '';
    backfillForm.fulfillmentStatus = 'completed';
    backfillForm.reason = '';
    backfillForm.countCsCommission = false;
    backfillVisible.value = true;
  }

  // 已取消单不计提任何提成：切到已取消时同步关掉开关，避免开关显示与实际口径不一致。
  watch(
    () => backfillForm.fulfillmentStatus,
    (status) => {
      if (status !== 'completed') backfillForm.countCsCommission = false;
    }
  );

  async function submitBackfill() {
    if (
      !Number.isSafeInteger(backfillForm.customerId) ||
      backfillForm.customerId <= 0
    ) {
      Message.warning('请填写客户 ID');
      return;
    }
    if (!Number.isSafeInteger(backfillForm.skuId) || backfillForm.skuId <= 0) {
      Message.warning('请填写 SKU ID');
      return;
    }
    if (
      !Number.isSafeInteger(backfillForm.quantity) ||
      backfillForm.quantity <= 0
    ) {
      Message.warning('请填写数量（大于 0）');
      return;
    }
    if (!backfillForm.settledAt) {
      Message.warning('请选择实际成交时间');
      return;
    }
    const reason = backfillForm.reason.trim();
    if (reason.length < 4 || reason.length > 255) {
      Message.warning('补录原因须为 4-255 字');
      return;
    }
    // 已取消单不计提任何提成，开关对后端无意义：统一按 false 提交。
    const countCsCommission =
      backfillForm.fulfillmentStatus === 'completed' &&
      backfillForm.countCsCommission;
    backfillSubmitting.value = true;
    try {
      await backfillOrder(
        {
          customer_id: backfillForm.customerId,
          sku_id: backfillForm.skuId,
          quantity: backfillForm.quantity,
          unit_price_cents:
            backfillForm.unitPriceYuan == null
              ? 0
              : Math.round(backfillForm.unitPriceYuan * 100),
          settled_at: new Date(backfillForm.settledAt).toISOString(),
          fulfillment_status: backfillForm.fulfillmentStatus,
          payment_status: 'paid',
          reason,
          count_cs_commission: countCsCommission,
        },
        crypto.randomUUID()
      );
      backfillVisible.value = false;
      Message.success('补录成功');
      await load();
    } catch (err) {
      Message.error(
        errorText(err, '补录失败：请检查客户 / SKU 与成交时间范围')
      );
    } finally {
      backfillSubmitting.value = false;
    }
  }

  onMounted(async () => {
    await load();
    await loadPriceAdjustments();
  });
</script>

<style scoped>
  .toolbar {
    margin-bottom: 16px;
  }

  .addon-tip {
    display: block;
    margin: 12px 0;
  }

  /* 结单按钮（§3.4）：条件未满足时置灰，仍保留 title 悬浮提示未满足原因。 */
  .close-btn:disabled {
    color: rgb(0 0 0 / 25%);
    cursor: not-allowed;
  }

  /* 协作客服：候选下拉与添加按钮同行，窄弹层内自适应撑满。 */
  .collaborator-grant {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .collaborator-select {
    flex: 1;
  }

  /* 席位区块：刷新与固排成队按钮同行。 */
  .seat-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  /* 结单服务凭证（§3.4-03）：逐张预览 + 逐张确认，缩略图可点击计为已查看。 */
  .evidence-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 8px 0;
  }

  .evidence-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 160px;
  }

  .evidence-head {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: space-between;
  }

  .evidence-thumb {
    width: 160px;
    height: 120px;
    object-fit: cover;
    border-radius: 4px;
    cursor: pointer;
  }

  .evidence-all {
    margin-top: 4px;
  }
</style>
