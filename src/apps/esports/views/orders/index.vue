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
                <a-button
                  type="text"
                  status="success"
                  @click="openCardPay(record)"
                  >储值卡核销</a-button
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
      width="520px"
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
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="cardPayVisible"
      title="储值卡核销"
      :ok-loading="cardPayLoading"
      @ok="submitCardPay"
      @cancel="cardPayVisible = false"
    >
      <a-form :model="cardPayForm">
        <a-form-item label="订单号">
          <a-typography-text>{{ cardPayForm.orderNo }}</a-typography-text>
        </a-form-item>
        <a-form-item label="储值卡 ID" required>
          <a-input-number v-model="cardPayForm.cardId" :min="1" />
        </a-form-item>
        <a-typography-text type="secondary">
          按订单应付额足额核销，扣减顺序为先赠送权益、后本金；卡须属该客户、在有效期内且适用该商品。
        </a-typography-text>
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
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import useUserStore from '@/store/modules/user';
  import {
    approveCloseReview,
    backfillOrder,
    cancelOrder,
    cancelOrderAddon,
    closeOrder,
    createOrderAddon,
    depositOrder,
    getOrder,
    getOrderCloseApproval,
    getOrderCloseConditions,
    getOrderCloseForm,
    listOrderAddons,
    listOrders,
    payEsportsOrderByStoredValueCard,
    payOrderAddonByBalance,
    payOrderWithBalance,
    previewReprice,
    requestPriceAdjustment,
    listPriceAdjustments,
    decidePriceAdjustment,
    rejectCloseReview,
    repriceOrder,
    rescheduleOrder,
    restoreOrder,
    setOrderChannelCost,
    listCommissionRules,
    setOrderManualCommissionRule,
    confirmOrderAppointment,
  } from '../../api';
  import type {
    CloseConditionStatus,
    CommissionRule,
    EsportsCloseFormField,
    EsportsOrder,
    EsportsOrderAddon,
    OrderCloseApprovalView,
    OrderCloseFormView,
    RepriceQuote,
    PriceAdjustment,
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
      } catch {
        Message.error('加载结单配置失败，可重试或直接结单');
      }
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
        await closeOrder(
          order.id,
          opsForm.reason.trim(),
          closeFormValues.value,
          substitutes
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

  // ── 储值卡核销（§4.4 消费） ──
  const cardPayVisible = ref(false);
  const cardPayLoading = ref(false);
  const cardPayForm = reactive({ orderId: 0, orderNo: '', cardId: 0 });

  function openCardPay(order: EsportsOrder) {
    cardPayForm.orderId = order.id;
    cardPayForm.orderNo = order.order_no;
    cardPayForm.cardId = order.stored_value_card_id || 0;
    cardPayVisible.value = true;
  }

  async function submitCardPay() {
    if (!cardPayForm.cardId) {
      Message.warning('请填写储值卡 ID');
      return;
    }
    cardPayLoading.value = true;
    try {
      await payEsportsOrderByStoredValueCard(
        cardPayForm.orderId,
        cardPayForm.cardId
      );
      cardPayVisible.value = false;
      Message.success('已用储值卡核销，订单转入待派单');
      await load();
    } catch (err) {
      Message.error(
        errorText(err, '核销失败：卡不可用、余额不足或订单状态已变化')
      );
    } finally {
      cardPayLoading.value = false;
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
</style>
