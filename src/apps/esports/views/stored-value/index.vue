<template>
  <div class="container page-container">
    <a-tabs v-model:active-key="mainTab" @change="onMainTabChange">
      <a-tab-pane key="cards" title="储值卡" />
      <a-tab-pane
        v-if="canExceptionList"
        key="exceptions"
        title="异常队列（§4.6-06）"
      />
    </a-tabs>

    <template v-if="mainTab === 'cards'">
      <a-card class="general-card" title="储值卡">
        <a-space class="toolbar" wrap>
          <a-button :loading="loading" @click="loadCards">刷新</a-button>
          <a-select
            v-model="filterStatus"
            placeholder="按状态筛选"
            allow-clear
            :style="{ width: '150px' }"
            @change="loadCards"
          >
            <a-option
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
              >{{ option.label }}</a-option
            >
          </a-select>
          <a-input-number
            v-model="filterCustomerId"
            placeholder="按客户 ID 筛选"
            :min="0"
            :style="{ width: '170px' }"
          />
          <a-checkbox v-model="onlyRemind" @change="loadCards"
            >只看临近到期</a-checkbox
          >
          <a-button v-if="canManage" type="primary" @click="openCreate"
            >开卡</a-button
          >
          <a-button v-if="canManage" @click="openPackageCreate"
            >新建套餐</a-button
          >
        </a-space>

        <a-table
          :data="cards"
          :loading="loading"
          row-key="id"
          :pagination="{ pageSize: 10 }"
        >
          <template #columns>
            <a-table-column data-index="card_no" title="卡号" />
            <a-table-column
              data-index="customer_id"
              title="客户 ID"
              :width="90"
            />
            <a-table-column title="来源支付">
              <template #cell="{ record }">{{
                channelLabel(record.payment_channel)
              }}</template>
            </a-table-column>
            <a-table-column title="本金余额">
              <template #cell="{ record }">{{
                moneyText(record.principal_remaining_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="赠送余额">
              <template #cell="{ record }">{{
                moneyText(record.bonus_remaining_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="卡内合计">
              <template #cell="{ record }">{{
                moneyText(record.balance_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="有效期">
              <template #cell="{ record }">{{
                fmtDate(record.valid_until)
              }}</template>
            </a-table-column>
            <a-table-column title="状态">
              <template #cell="{ record }">
                <a-tag :color="statusColor(record.status)">{{
                  statusLabel(record.status)
                }}</a-tag>
              </template>
            </a-table-column>
            <a-table-column title="操作" :width="100">
              <template #cell="{ record }">
                <a-button type="text" @click="openDetail(record)"
                  >详情</a-button
                >
              </template>
            </a-table-column>
          </template>
        </a-table>
      </a-card>

      <a-card class="general-card" title="储值卡套餐" style="margin-top: 16px">
        <a-table
          :data="packages"
          :loading="packagesLoading"
          row-key="id"
          :pagination="false"
        >
          <template #columns>
            <a-table-column data-index="code" title="编码" />
            <a-table-column data-index="name" title="套餐名" />
            <a-table-column title="本金">
              <template #cell="{ record }">{{
                moneyText(record.principal_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="赠送">
              <template #cell="{ record }">{{
                moneyText(record.bonus_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="状态">
              <template #cell="{ record }">
                <a-tag
                  :color="record.status === 'on_sale' ? 'green' : 'gray'"
                  >{{ record.status === 'on_sale' ? '在售' : '已下架' }}</a-tag
                >
              </template>
            </a-table-column>
            <a-table-column title="操作" :width="140">
              <template #cell="{ record }">
                <a-button type="text" @click="openPackageEdit(record)"
                  >编辑</a-button
                >
                <a-button type="text" @click="togglePackageStatus(record)">{{
                  record.status === 'on_sale' ? '下架' : '上架'
                }}</a-button>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </a-card>
    </template>

    <a-card v-else class="general-card" title="储值卡一致性异常队列（§4.6-06）">
      <div class="hint">
        结单 / 结算时「卡标记 / 关联卡 /
        核销流水」三者不符会自动入队，此处只是可跟进的落地记录；
        指派后转「跟进中」，处置须填写中文说明。
      </div>
      <a-space class="toolbar" wrap>
        <a-select
          v-model="exceptionFilterStatus"
          placeholder="待跟进（待指派 + 跟进中）"
          allow-clear
          :style="{ width: '220px' }"
        >
          <a-option value="open">待指派</a-option>
          <a-option value="following">跟进中</a-option>
          <a-option value="resolved">已处理</a-option>
          <a-option value="ignored">已忽略</a-option>
        </a-select>
        <a-select
          v-model="exceptionFilterKind"
          placeholder="全部不一致类型"
          allow-clear
          :style="{ width: '180px' }"
        >
          <a-option
            v-for="option in exceptionKindOptions"
            :key="option.value"
            :value="option.value"
            >{{ option.label }}</a-option
          >
        </a-select>
        <a-input-number
          v-model="exceptionFilterCardId"
          placeholder="按卡 ID 筛选"
          :min="0"
          :style="{ width: '150px' }"
        />
        <a-input-number
          v-model="exceptionFilterOrderId"
          placeholder="按订单 ID 筛选"
          :min="0"
          :style="{ width: '160px' }"
        />
        <a-checkbox v-model="exceptionMine">只看指派给我的</a-checkbox>
        <a-checkbox v-model="exceptionUnassigned">只看未指派</a-checkbox>
        <a-button :loading="exceptionsLoading" @click="loadExceptions"
          >查询</a-button
        >
      </a-space>
      <a-table
        :data="exceptions"
        :loading="exceptionsLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column
            data-index="exception_no"
            title="异常号"
            :width="200"
          />
          <a-table-column data-index="card_id" title="卡 ID" :width="80" />
          <a-table-column data-index="order_id" title="订单" :width="80" />
          <a-table-column data-index="customer_id" title="客户" :width="80" />
          <a-table-column title="不一致类型" :width="150">
            <template #cell="{ record }">{{
              exceptionKindText(record.kind)
            }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="100">
            <template #cell="{ record }">
              <a-tag :color="exceptionStatusColor(record.status)">{{
                exceptionStatusText(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="重复" :width="70">
            <template #cell="{ record }">×{{ record.occurrences }}</template>
          </a-table-column>
          <a-table-column title="跟进人" :width="90">
            <template #cell="{ record }">{{
              record.assignee_admin_id ?? '-'
            }}</template>
          </a-table-column>
          <a-table-column title="原因" :width="180">
            <template #cell="{ record }">
              <a-tooltip :content="record.reason">
                <span>{{ record.reason || '-' }}</span>
              </a-tooltip>
            </template>
          </a-table-column>
          <a-table-column title="处置说明" :width="180">
            <template #cell="{ record }">{{
              record.resolution || '-'
            }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="180">
            <template #cell="{ record }">
              <a-button
                v-if="canExceptionDetail"
                type="text"
                @click="openExceptionDetail(record)"
                >详情</a-button
              >
              <a-button
                v-if="canExceptionAssign && isExceptionOpen(record)"
                type="text"
                @click="openExceptionAssign(record)"
                >指派</a-button
              >
              <a-button
                v-if="canExceptionResolve && isExceptionOpen(record)"
                type="text"
                @click="openExceptionResolve(record)"
                >处置</a-button
              >
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-drawer
      v-model:visible="exceptionDetailVisible"
      :width="600"
      title="异常详情"
      unmount-on-close
    >
      <template v-if="exceptionDetail">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="异常号" :span="2">{{
            exceptionDetail.exception_no
          }}</a-descriptions-item>
          <a-descriptions-item label="卡 ID">{{
            exceptionDetail.card_id
          }}</a-descriptions-item>
          <a-descriptions-item label="订单">{{
            exceptionDetail.order_id || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="客户">{{
            exceptionDetail.customer_id || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="类型">{{
            exceptionKindText(exceptionDetail.kind)
          }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="exceptionStatusColor(exceptionDetail.status)">{{
              exceptionStatusText(exceptionDetail.status)
            }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="重复次数">{{
            exceptionDetail.occurrences
          }}</a-descriptions-item>
          <a-descriptions-item label="跟进人">{{
            exceptionDetail.assignee_admin_id ?? '未指派'
          }}</a-descriptions-item>
          <a-descriptions-item label="指派时间">{{
            fmtMinute(exceptionDetail.assigned_at)
          }}</a-descriptions-item>
          <a-descriptions-item label="原因" :span="2">{{
            exceptionDetail.reason || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="处置说明" :span="2">{{
            exceptionDetail.resolution || '-'
          }}</a-descriptions-item>
        </a-descriptions>
        <a-divider>对比快照</a-divider>
        <pre class="detail-json">{{ exceptionDetailJson }}</pre>
      </template>
    </a-drawer>

    <a-modal
      v-model:visible="exceptionAssignVisible"
      title="指派跟进人"
      @ok="submitExceptionAssign"
      @cancel="exceptionAssignVisible = false"
    >
      <a-form :model="exceptionAssignForm">
        <a-form-item label="跟进人管理员 ID" required>
          <a-input-number v-model="exceptionAssignForm.adminId" :min="1" />
        </a-form-item>
        <div class="hint">
          异常 {{ exceptionTarget?.exception_no }}（卡
          {{ exceptionTarget?.card_id }}）：指派后状态转「跟进中」，可再次改派。
        </div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="exceptionResolveVisible"
      title="处置储值卡异常"
      @ok="submitExceptionResolve"
      @cancel="exceptionResolveVisible = false"
    >
      <a-form :model="exceptionResolveForm">
        <a-form-item label="处置动作" required>
          <a-radio-group v-model="exceptionResolveForm.action">
            <a-radio value="resolve">置为已处理</a-radio>
            <a-radio value="ignore">忽略（无需处理）</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          label="处置说明（置为已处理时必填，中文）"
          :required="exceptionResolveForm.action === 'resolve'"
        >
          <a-textarea
            v-model="exceptionResolveForm.resolution"
            :max-length="500"
            :auto-size="{ minRows: 3 }"
            placeholder="例如：已核对核销流水，缺失流水补录完成"
          />
        </a-form-item>
        <div class="hint">
          异常 {{ exceptionTarget?.exception_no }}（状态版本
          {{
            exceptionTarget?.version
          }}）：以管理员身份执行并留痕，处置后不可回退。
        </div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="createVisible"
      title="开卡"
      :ok-loading="creating"
      @ok="submitCreate"
      @cancel="createVisible = false"
    >
      <a-form :model="createForm">
        <a-form-item label="客户 ID" required>
          <a-input-number v-model="createForm.customerId" :min="1" />
        </a-form-item>
        <a-form-item label="开卡来源">
          <a-select v-model="createForm.source">
            <a-option value="staff">客服代办</a-option>
            <a-option value="self">客户自助</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="来源支付" required>
          <a-select v-model="createForm.paymentChannel">
            <a-option
              v-for="option in channelOptions"
              :key="option.value"
              :value="option.value"
              >{{ option.label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="createForm.paymentChannel !== 'customer_balance'"
          label="支付凭证号"
          required
        >
          <a-input v-model="createForm.paymentRef" :max-length="128" />
        </a-form-item>
        <a-form-item label="套餐（可选）">
          <a-select
            v-model="createForm.packageId"
            allow-clear
            placeholder="选择套餐自动带出本金 / 赠送"
            @change="onPackageChange"
          >
            <a-option
              v-for="pkg in packages.filter((p) => p.status === 'on_sale')"
              :key="pkg.id"
              :value="pkg.id"
              >{{ pkg.name }}（{{ moneyText(pkg.principal_cents) }} 送
              {{ moneyText(pkg.bonus_cents) }}）</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="开卡本金（分）" required>
          <a-input-number
            v-model="createForm.principalCents"
            :min="1"
            :disabled="createForm.packageId > 0"
          />
        </a-form-item>
        <a-form-item
          v-if="createForm.paymentChannel !== 'customer_balance'"
          label="赠送权益（分）"
        >
          <a-input-number
            v-model="createForm.bonusCents"
            :min="0"
            :disabled="createForm.packageId > 0"
          />
          <a-typography-text type="secondary"
            >选套餐时由套餐决定；留空（0）则按客户会员等级的赠送比例自动计算（§10.4）。</a-typography-text
          >
        </a-form-item>
        <a-form-item label="适用商品 SKU ID（留空为全场通用）">
          <a-input-tag
            v-model="createForm.applicableScope"
            placeholder="输入 SKU ID 后回车"
            :max-tag-count="6"
          />
        </a-form-item>
        <a-form-item label="允许本金购买礼物">
          <a-switch v-model="createForm.allowGifts" />
          <a-typography-text type="secondary"
            >只允许使用卡内实付本金，赠送权益不可用于送礼。</a-typography-text
          >
        </a-form-item>
        <a-form-item label="有效天数" required>
          <a-input-number v-model="createForm.validityDays" :min="1" />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="createForm.note" :max-length="255" />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model="createForm.contractConfirmed"
            >已确认储值卡合同</a-checkbox
          >
        </a-form-item>
        <a-typography-text type="secondary">
          {{
            createForm.paymentChannel === 'customer_balance'
              ? '用余额购卡属账户间划转：同事务扣减客户余额本金、增加卡内本金，不接受赠送权益。'
              : '外部收款先生成待核验申请；独立财务核对实际到账后才发放卡内余额。'
          }}
        </a-typography-text>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="packageVisible"
      :title="packageEditingId ? '编辑套餐' : '新建套餐'"
      :ok-loading="packageSaving"
      @ok="submitPackage"
      @cancel="packageVisible = false"
    >
      <a-form :model="packageForm">
        <a-form-item label="套餐编码" required>
          <a-input
            v-model="packageForm.code"
            :max-length="64"
            :disabled="Boolean(packageEditingId)"
          />
        </a-form-item>
        <a-form-item label="套餐名" required>
          <a-input v-model="packageForm.name" :max-length="120" />
        </a-form-item>
        <a-form-item label="本金（分）" required>
          <a-input-number v-model="packageForm.principalCents" :min="1" />
        </a-form-item>
        <a-form-item label="赠送（分）">
          <a-input-number v-model="packageForm.bonusCents" :min="0" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="packageForm.sortOrder" :min="0" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:visible="detailVisible"
      :width="640"
      title="储值卡详情"
      unmount-on-close
    >
      <template v-if="detail">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="卡号">{{
            detail.card.card_no
          }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="statusColor(detail.card.status)">{{
              statusLabel(detail.card.status)
            }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="客户 ID">{{
            detail.card.customer_id
          }}</a-descriptions-item>
          <a-descriptions-item label="来源支付">{{
            channelLabel(detail.card.payment_channel)
          }}</a-descriptions-item>
          <a-descriptions-item label="申请凭证号">{{
            detail.card.payment_ref || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="核验人">{{
            detail.card.payment_verified_by_admin_id || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="核验时间">{{
            fmtMinute(detail.card.payment_verified_at)
          }}</a-descriptions-item>
          <a-descriptions-item label="核验记录">{{
            detail.card.payment_verification_note || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="本金余额">{{
            moneyText(detail.card.principal_remaining_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="赠送余额">{{
            moneyText(detail.card.bonus_remaining_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="累计已消费">{{
            moneyText(detail.card.consumed_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="有效期至">{{
            fmtDate(detail.card.valid_until)
          }}</a-descriptions-item>
          <a-descriptions-item label="适用商品">{{
            (detail.card.applicable_scope || []).length
              ? (detail.card.applicable_scope || []).join('、')
              : '全场通用'
          }}</a-descriptions-item>
          <a-descriptions-item label="本金可送礼">{{
            detail.card.allow_gifts ? '是' : '否'
          }}</a-descriptions-item>
          <a-descriptions-item label="已退金额">{{
            moneyText(detail.card.refunded_cents)
          }}</a-descriptions-item>
        </a-descriptions>

        <a-divider>流水</a-divider>
        <a-table :data="detail.transactions" row-key="id" size="small">
          <template #columns>
            <a-table-column data-index="entry_type" title="类型" :width="110" />
            <a-table-column title="本金变动">
              <template #cell="{ record }">{{
                moneyText(record.principal_delta_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="赠送变动">
              <template #cell="{ record }">{{
                moneyText(record.bonus_delta_cents)
              }}</template>
            </a-table-column>
            <a-table-column data-index="note" title="备注" />
            <a-table-column title="时间">
              <template #cell="{ record }">{{
                fmtMinute(record.created_at)
              }}</template>
            </a-table-column>
          </template>
        </a-table>

        <template v-if="detail.card.status === 'pending_verification'">
          <a-divider>{{
            detail.card.source === 'self'
              ? '客户自助购卡核销（§4.4）'
              : '核验外部收款'
          }}</a-divider>
          <a-alert type="warning">
            待核对实际到账。当前卡内余额为 0，不能用于订单核销。
          </a-alert>
          <a-form
            v-if="detail.card.source === 'self' && canVerifySelfPurchase"
            :model="verificationForm"
            style="margin-top: 16px"
          >
            <a-form-item label="申请凭证号（开卡时登记）">
              <a-input :model-value="detail.card.payment_ref" disabled />
            </a-form-item>
            <a-form-item label="实收金额（分，须等于开卡本金）" required>
              <a-input-number
                v-model="verificationForm.receivedCents"
                :min="0"
              />
            </a-form-item>
            <a-form-item label="核销依据 / 驳回原因（至少 8 字）" required>
              <a-textarea
                v-model="verificationForm.evidenceNote"
                :max-length="255"
              />
            </a-form-item>
            <a-space>
              <a-button
                type="primary"
                :loading="verifying"
                @click="submitSelfPurchaseVerification(true)"
                >核销并激活</a-button
              >
              <a-button
                :loading="verifying"
                @click="submitSelfPurchaseVerification(false)"
                >驳回申请</a-button
              >
            </a-space>
            <a-typography-text type="secondary">
              实收金额须与开卡本金一致；开卡申请人不得核验本人提交的收款，驳回会把支付意图置为无效。
            </a-typography-text>
          </a-form>
          <a-alert
            v-else-if="detail.card.source === 'self'"
            type="info"
            style="margin-top: 16px"
          >
            该卡是客户自助购卡申请，需「自助购卡核验」权限（esports:stored_value:verify_self_purchase）才能核销。
          </a-alert>
          <a-form
            v-else-if="canVerifyPayment"
            :model="verificationForm"
            style="margin-top: 16px"
          >
            <a-form-item label="实际到账流水号" required>
              <a-input
                v-model="verificationForm.receiptRef"
                :max-length="128"
              />
            </a-form-item>
            <a-form-item label="实收金额（分）" required>
              <a-input-number
                v-model="verificationForm.receivedCents"
                :min="0"
              />
            </a-form-item>
            <a-form-item label="核验依据/驳回原因" required>
              <a-textarea
                v-model="verificationForm.evidenceNote"
                :max-length="255"
              />
            </a-form-item>
            <a-space>
              <a-button
                type="primary"
                :loading="verifying"
                @click="submitPaymentVerification(true)"
                >确认到账并激活</a-button
              >
              <a-button
                :loading="verifying"
                @click="submitPaymentVerification(false)"
                >驳回申请</a-button
              >
            </a-space>
          </a-form>
        </template>

        <a-divider>退卡</a-divider>
        <a-space class="toolbar" wrap>
          <a-button :loading="quoteLoading" @click="loadQuote"
            >退卡试算</a-button
          >
          <a-button
            v-if="canQuoteBatch"
            :loading="batchQuoteLoading"
            @click="loadBatchQuote"
            >退卡批次试算（按预付款批次）</a-button
          >
          <a-button
            v-if="canManage"
            type="primary"
            :disabled="!canRequestRefund"
            @click="submitRefundRequest"
            >申请退卡</a-button
          >
          <template v-if="detail.card.status === 'refund_pending'">
            <a-button
              v-if="canApprove"
              type="primary"
              @click="openRefundDecision(true)"
              >审核通过并出账</a-button
            >
            <a-button v-if="canApprove" @click="openRefundDecision(false)"
              >驳回</a-button
            >
          </template>
        </a-space>
        <a-descriptions v-if="quote" :column="2" size="small">
          <a-descriptions-item label="剩余本金">{{
            moneyText(quote.remaining_principal_cents as number)
          }}</a-descriptions-item>
          <a-descriptions-item label="剩余赠送">{{
            moneyText(quote.remaining_bonus_cents as number)
          }}</a-descriptions-item>
          <a-descriptions-item label="可退金额">{{
            moneyText(quote.refundable_cents as number)
          }}</a-descriptions-item>
          <a-descriptions-item label="赠送作废">{{
            moneyText(quote.bonus_forfeited_cents as number)
          }}</a-descriptions-item>
        </a-descriptions>
        <a-typography-text type="secondary">
          退卡按合同试算：可退金额为未消费本金，未消费赠送权益作废、不折现。申请后须由财务审核，审核人不得与申请人相同；审核通过即出账，必须登记打款凭证。
        </a-typography-text>

        <template v-if="batchQuote">
          <a-divider>批次试算明细（§4.5）</a-divider>
          <a-descriptions :column="2" size="small" bordered>
            <a-descriptions-item label="可退本金">
              {{ moneyText(batchQuote.refundable_principal_cents) }}
            </a-descriptions-item>
            <a-descriptions-item label="作废赠送">
              {{ moneyText(batchQuote.forfeited_bonus_cents) }}
            </a-descriptions-item>
            <a-descriptions-item label="批次剩余本金">
              {{ moneyText(batchQuote.batch_principal_remaining_cents) }}
            </a-descriptions-item>
            <a-descriptions-item label="批次剩余赠送">
              {{ moneyText(batchQuote.batch_bonus_remaining_cents) }}
            </a-descriptions-item>
            <a-descriptions-item label="试算口径" :span="2">
              {{ batchQuote.basis?.refund_rule || '-' }}
            </a-descriptions-item>
          </a-descriptions>
          <a-table
            :data="batchQuote.batches"
            row-key="batch_source_id"
            size="small"
            :pagination="false"
          >
            <template #columns>
              <a-table-column title="批次" :width="180">
                <template #cell="{ record }">
                  {{ record.batch_source_type }} / {{ record.batch_source_id }}
                </template>
              </a-table-column>
              <a-table-column data-index="fund_batch" title="资金来源批次" />
              <a-table-column title="入账本金">
                <template #cell="{ record }">{{
                  moneyText(record.principal_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="入账赠送">
                <template #cell="{ record }">{{
                  moneyText(record.bonus_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="已分摊">
                <template #cell="{ record }">{{
                  moneyText(record.allocated_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="可退">
                <template #cell="{ record }">{{
                  moneyText(record.refundable_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="作废赠送">
                <template #cell="{ record }">{{
                  moneyText(record.bonus_forfeited_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="标记" :width="90">
                <template #cell="{ record }">
                  <a-tag v-if="record.over_allocated" color="red"
                    >分摊超额</a-tag
                  >
                  <a-tag v-else-if="!record.split_known" color="orange"
                    >构成未知</a-tag
                  >
                  <a-tag v-else color="green">正常</a-tag>
                </template>
              </a-table-column>
            </template>
          </a-table>
          <template v-if="batchQuote.anomalies.length">
            <a-divider>批次异常</a-divider>
            <a-list size="small" :bordered="false">
              <a-list-item
                v-for="(item, index) in batchQuote.anomalies"
                :key="`${item.kind}-${index}`"
              >
                <a-tag color="red">{{ item.kind }}</a-tag>
                {{ item.account_type }}#{{ item.account_id }} ·
                {{ item.detail }}
              </a-list-item>
            </a-list>
          </template>
        </template>
      </template>
    </a-drawer>

    <a-modal
      v-model:visible="refundDecisionVisible"
      title="退卡审核出账"
      :width="560"
      @ok="submitRefundDecision"
      @cancel="refundDecisionVisible = false"
    >
      <a-form :model="refundDecisionForm">
        <a-form-item label="审核结论" required>
          <a-radio-group v-model="refundDecisionForm.approve">
            <a-radio :value="true">通过（即出账）</a-radio>
            <a-radio :value="false">驳回</a-radio>
          </a-radio-group>
        </a-form-item>
        <template v-if="refundDecisionForm.approve">
          <a-form-item label="打款凭证 / 银行流水号（6-128 位）" required>
            <a-input
              v-model="refundDecisionForm.payoutRef"
              :max-length="128"
              placeholder="已实际打款的回单号 / 银行流水号"
            />
          </a-form-item>
          <a-form-item label="打款备注">
            <a-textarea
              v-model="refundDecisionForm.payoutNote"
              :max-length="255"
              :auto-size="{ minRows: 2 }"
            />
          </a-form-item>
          <a-alert type="warning">
            当前 api.ts 的退卡决策函数尚未透传 payout_ref /
            payout_note，通过操作会被后端以「退卡出账必须填写打款凭证或银行流水号」拒绝，需先补齐
            api.ts 入参。
          </a-alert>
        </template>
        <div class="hint">
          退卡 {{ refundDecisionTarget?.card_no }}（试算可退
          {{ refundableText }}）：以管理员身份执行并留痕，审核人不得是申请人。
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
    assignStoredValueException,
    createEsportsStoredValueCard,
    createEsportsStoredValuePackage,
    decideEsportsStoredValueCardRefund,
    getEsportsStoredValueCard,
    getEsportsStoredValueCardRefundQuote,
    getEsportsStoredValueCards,
    getEsportsStoredValuePackages,
    getStoredValueCardRefundBatchQuote,
    getStoredValueException,
    listStoredValueExceptions,
    requestEsportsStoredValueCardRefund,
    resolveStoredValueException,
    setEsportsStoredValuePackageStatus,
    updateEsportsStoredValuePackage,
    verifyEsportsStoredValueCardPayment,
    verifyStoredValueCardSelfPurchase,
  } from '../../api';
  import type {
    EsportsStoredValueCard,
    EsportsStoredValueException,
    EsportsStoredValuePackage,
    RechargeRefundQuote,
    StoredValueCardDetail,
    StoredValueExceptionStatus,
    StoredValuePaymentChannel,
    StoredValueStatus,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  // 权限码全部取自 app.go 的 PermAPI / PermButton 声明。
  const canManage = computed(() =>
    hasButtonPermission('esports:stored_value:manage')
  );
  const canApprove = computed(() =>
    hasButtonPermission('esports:stored_value:refund_approve')
  );
  const canVerifyPayment = computed(() =>
    hasButtonPermission('esports:stored_value:payment_verify')
  );
  const canVerifySelfPurchase = computed(() =>
    hasButtonPermission('esports:stored_value:verify_self_purchase')
  );
  const canQuoteBatch = computed(() =>
    hasButtonPermission('esports:stored_value:refund_batch_quote')
  );
  const canExceptionDetail = computed(() =>
    hasButtonPermission('esports:stored_value:exceptions_detail')
  );
  const canExceptionList = computed(() =>
    hasButtonPermission('esports:stored_value:exceptions_list')
  );
  const canExceptionAssign = computed(() =>
    hasButtonPermission('esports:stored_value:exceptions_assign')
  );
  const canExceptionResolve = computed(() =>
    hasButtonPermission('esports:stored_value:exceptions_resolve')
  );

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

  const statusOptions: { value: StoredValueStatus; label: string }[] = [
    { value: 'pending_verification', label: '待核验收款' },
    { value: 'rejected', label: '收款未通过' },
    { value: 'active', label: '可用' },
    { value: 'exhausted', label: '已用尽' },
    { value: 'refund_pending', label: '退卡待审' },
    { value: 'refunded', label: '已退卡' },
    { value: 'expired', label: '已过期' },
    { value: 'frozen', label: '已冻结' },
  ];
  const channelOptions: {
    value: StoredValuePaymentChannel;
    label: string;
  }[] = [
    { value: 'wechat_work', label: '企业微信收款' },
    { value: 'merchant_qr', label: '工作室商户码' },
    { value: 'corporate_transfer', label: '对公转账' },
    { value: 'customer_balance', label: '客户余额划转' },
  ];
  const statusLabel = (value: StoredValueStatus) =>
    statusOptions.find((option) => option.value === value)?.label || value;
  const statusColor = (value: StoredValueStatus) => {
    switch (value) {
      case 'active':
        return 'green';
      case 'refund_pending':
        return 'orangered';
      case 'pending_verification':
        return 'orange';
      case 'rejected':
        return 'red';
      case 'exhausted':
      case 'expired':
        return 'gray';
      case 'refunded':
        return 'arcoblue';
      default:
        return 'gray';
    }
  };
  const channelLabel = (value: StoredValuePaymentChannel) =>
    channelOptions.find((option) => option.value === value)?.label || value;
  // 金额分转元展示；变动额可能为负。
  const moneyText = (cents: number | undefined) =>
    `${((cents || 0) / 100).toFixed(2)} 元`;
  const pad = (value: number) => String(value).padStart(2, '0');
  const fmtDate = (value: string | null | undefined) => {
    if (!value) return '-';
    const d = new Date(value);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const fmtMinute = (value: string | null | undefined) => {
    if (!value) return '-';
    const d = new Date(value);
    return `${fmtDate(value)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };
  // 幂等键：前端生成，重复提交同一开卡请求不会重复入账。
  const newKey = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ── 列表 ──
  const loading = ref(false);
  const cards = ref<EsportsStoredValueCard[]>([]);
  const filterStatus = ref<StoredValueStatus | ''>('');
  const filterCustomerId = ref<number>(0);
  const onlyRemind = ref(false);

  async function loadCards() {
    loading.value = true;
    try {
      cards.value =
        (
          await getEsportsStoredValueCards({
            status: filterStatus.value || undefined,
            customer_id: filterCustomerId.value || undefined,
            remind_days: onlyRemind.value ? 30 : undefined,
          })
        ).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载储值卡失败'));
    } finally {
      loading.value = false;
    }
  }

  // ── 套餐管理（§4.4） ──
  const packages = ref<EsportsStoredValuePackage[]>([]);
  const packagesLoading = ref(false);
  const packageVisible = ref(false);
  const packageSaving = ref(false);
  const packageEditingId = ref(0);
  const packageForm = reactive({
    code: '',
    name: '',
    principalCents: 0,
    bonusCents: 0,
    sortOrder: 0,
    version: 1,
  });

  async function loadPackages() {
    packagesLoading.value = true;
    try {
      packages.value =
        (await getEsportsStoredValuePackages(true)).data.data || [];
    } catch {
      Message.error('加载套餐失败');
    } finally {
      packagesLoading.value = false;
    }
  }

  function openPackageCreate() {
    packageEditingId.value = 0;
    packageForm.code = '';
    packageForm.name = '';
    packageForm.principalCents = 0;
    packageForm.bonusCents = 0;
    packageForm.sortOrder = 0;
    packageForm.version = 1;
    packageVisible.value = true;
  }

  function openPackageEdit(pkg: EsportsStoredValuePackage) {
    packageEditingId.value = pkg.id;
    packageForm.code = pkg.code;
    packageForm.name = pkg.name;
    packageForm.principalCents = pkg.principal_cents;
    packageForm.bonusCents = pkg.bonus_cents;
    packageForm.sortOrder = pkg.sort_order;
    packageForm.version = pkg.version;
    packageVisible.value = true;
  }

  async function submitPackage() {
    if (
      !packageForm.code.trim() ||
      !packageForm.name.trim() ||
      packageForm.principalCents <= 0
    ) {
      Message.warning('请填写套餐编码、名称与本金');
      return;
    }
    packageSaving.value = true;
    try {
      if (packageEditingId.value) {
        await updateEsportsStoredValuePackage(packageEditingId.value, {
          code: packageForm.code,
          name: packageForm.name.trim(),
          principal_cents: packageForm.principalCents,
          bonus_cents: packageForm.bonusCents,
          sort_order: packageForm.sortOrder,
          version: packageForm.version,
        });
      } else {
        await createEsportsStoredValuePackage({
          code: packageForm.code.trim(),
          name: packageForm.name.trim(),
          principal_cents: packageForm.principalCents,
          bonus_cents: packageForm.bonusCents,
          sort_order: packageForm.sortOrder,
        });
      }
      packageVisible.value = false;
      Message.success('已保存套餐');
      await loadPackages();
    } catch (err) {
      Message.error(errorText(err, '保存套餐失败'));
    } finally {
      packageSaving.value = false;
    }
  }

  async function togglePackageStatus(pkg: EsportsStoredValuePackage) {
    try {
      await setEsportsStoredValuePackageStatus(
        pkg.id,
        pkg.status === 'on_sale' ? 'off_sale' : 'on_sale'
      );
      Message.success('已更新套餐状态');
      await loadPackages();
    } catch (err) {
      Message.error(errorText(err, '更新套餐状态失败'));
    }
  }

  // ── 开卡 ──
  const createVisible = ref(false);
  const creating = ref(false);
  const createForm = reactive({
    customerId: 0,
    source: 'staff' as 'staff' | 'self',
    paymentChannel: 'merchant_qr' as StoredValuePaymentChannel,
    paymentRef: '',
    packageId: 0,
    principalCents: 0,
    bonusCents: 0,
    applicableScope: [] as string[],
    allowGifts: false,
    validityDays: 365,
    note: '',
    contractConfirmed: false,
  });

  function openCreate() {
    createForm.customerId = 0;
    createForm.source = 'staff';
    createForm.paymentChannel = 'merchant_qr';
    createForm.paymentRef = '';
    createForm.packageId = 0;
    createForm.principalCents = 0;
    createForm.bonusCents = 0;
    createForm.applicableScope = [];
    createForm.allowGifts = false;
    createForm.validityDays = 365;
    createForm.note = '';
    createForm.contractConfirmed = false;
    createVisible.value = true;
  }

  // 选套餐：本金 / 赠送自动带出（§4.4），选套餐后本金 / 赠送不可手动改。
  function onPackageChange(pkgId: unknown) {
    const id = typeof pkgId === 'number' ? pkgId : 0;
    createForm.packageId = id;
    const pkg = packages.value.find((p) => p.id === id);
    if (pkg) {
      createForm.principalCents = pkg.principal_cents;
      createForm.bonusCents = pkg.bonus_cents;
    }
  }

  async function submitCreate() {
    if (!createForm.customerId || !createForm.principalCents) {
      Message.warning('请填写客户与开卡本金');
      return;
    }
    if (!createForm.contractConfirmed) {
      Message.warning('开卡前须确认储值卡合同');
      return;
    }
    creating.value = true;
    try {
      await createEsportsStoredValueCard({
        customer_id: createForm.customerId,
        source: createForm.source,
        payment_channel: createForm.paymentChannel,
        payment_ref: createForm.paymentRef,
        package_id: createForm.packageId || undefined,
        principal_cents: createForm.principalCents,
        bonus_cents:
          createForm.paymentChannel === 'customer_balance'
            ? 0
            : createForm.bonusCents,
        applicable_scope: createForm.applicableScope
          .map((value) => Number(value))
          .filter((value) => value > 0),
        allow_gifts: createForm.allowGifts,
        contract_confirmed: true,
        validity_days: createForm.validityDays,
        note: createForm.note,
        idempotency_key: newKey('sv-open'),
      });
      createVisible.value = false;
      Message.success(
        createForm.paymentChannel === 'customer_balance'
          ? '已开卡'
          : '已提交待核验开卡申请，到账确认后才可使用'
      );
      await loadCards();
    } catch (err) {
      Message.error(errorText(err, '开卡失败'));
    } finally {
      creating.value = false;
    }
  }

  // ── 详情与退卡 ──
  const detailVisible = ref(false);
  const detail = ref<StoredValueCardDetail | null>(null);
  const quote = ref<Record<string, unknown> | null>(null);
  const quoteLoading = ref(false);
  // 批次维度试算（§4.5）：逐批展示预付款批次的剩余与可退金额。
  const batchQuote = ref<RechargeRefundQuote | null>(null);
  const batchQuoteLoading = ref(false);
  const verifying = ref(false);
  const verificationForm = reactive({
    receiptRef: '',
    receivedCents: 0,
    evidenceNote: '',
  });
  // 仅可用 / 已用尽 / 已过期的卡可申请退卡（待审、已退、冻结不可）。
  const canRequestRefund = computed(() => {
    const status = detail.value?.card.status;
    return (
      status === 'active' || status === 'exhausted' || status === 'expired'
    );
  });

  async function openDetail(card: EsportsStoredValueCard) {
    detailVisible.value = true;
    detail.value = null;
    quote.value = null;
    batchQuote.value = null;
    try {
      detail.value = (await getEsportsStoredValueCard(card.id)).data.data;
      verificationForm.receiptRef = detail.value.card.payment_ref || '';
      verificationForm.receivedCents = detail.value.card.principal_cents;
      verificationForm.evidenceNote = '';
    } catch (err) {
      Message.error(errorText(err, '加载储值卡详情失败'));
    }
  }

  async function submitPaymentVerification(approve: boolean) {
    if (!detail.value) return;
    if (verificationForm.evidenceNote.trim().length < 8) {
      Message.warning('请填写至少 8 字的核验依据或驳回原因');
      return;
    }
    const { card } = detail.value;
    const ok = await confirmFundsAction(
      `确认${approve ? '核销到账并激活' : '驳回'}储值卡 ${card.card_no}？${
        approve
          ? '激活后卡内余额立即可用于订单核销。'
          : '驳回后需重新提交开卡申请。'
      }`,
      approve ? '核验开卡到账' : '驳回开卡申请'
    );
    if (!ok) return;
    verifying.value = true;
    try {
      await verifyEsportsStoredValueCardPayment(card.id, {
        approve,
        receipt_ref: verificationForm.receiptRef.trim(),
        received_cents: verificationForm.receivedCents,
        evidence_note: verificationForm.evidenceNote.trim(),
      });
      Message.success(approve ? '已核验到账并激活储值卡' : '已驳回申请');
      await openDetail(card);
      await loadCards();
    } catch (err) {
      Message.error(errorText(err, '收款核验失败'));
    } finally {
      verifying.value = false;
    }
  }

  // 客户自助购卡核销（§4.4）：走专用入口，核销后同步支付意图与卡激活外盒。
  async function submitSelfPurchaseVerification(approve: boolean) {
    if (!detail.value) return;
    if (verificationForm.evidenceNote.trim().length < 8) {
      Message.warning('请填写至少 8 字的核销依据或驳回原因');
      return;
    }
    const { card } = detail.value;
    const ok = await confirmFundsAction(
      `确认${approve ? '核销' : '驳回'}客户自助购卡 ${card.card_no}（凭证号 ${
        card.payment_ref || '-'
      }，实收 ${moneyText(verificationForm.receivedCents)}）？`,
      approve ? '自助购卡核销' : '驳回自助购卡'
    );
    if (!ok) return;
    verifying.value = true;
    try {
      await verifyStoredValueCardSelfPurchase(card.id, {
        approve,
        received_cents: verificationForm.receivedCents,
        evidence_note: verificationForm.evidenceNote.trim(),
      });
      Message.success(approve ? '已核销并激活储值卡' : '已驳回自助购卡申请');
      await openDetail(card);
      await loadCards();
    } catch (err) {
      Message.error(
        errorText(err, '自助购卡核销失败：实收金额与开卡本金不一致或状态已变化')
      );
    } finally {
      verifying.value = false;
    }
  }

  async function loadQuote() {
    if (!detail.value) return;
    quoteLoading.value = true;
    try {
      const result = (
        await getEsportsStoredValueCardRefundQuote(detail.value.card.id)
      ).data.data;
      quote.value = result.quote;
    } catch (err) {
      Message.error(errorText(err, '退卡试算失败'));
    } finally {
      quoteLoading.value = false;
    }
  }

  async function loadBatchQuote() {
    if (!detail.value) return;
    batchQuoteLoading.value = true;
    try {
      batchQuote.value =
        (await getStoredValueCardRefundBatchQuote(detail.value.card.id)).data
          .data || null;
    } catch (err) {
      Message.error(errorText(err, '退卡批次试算失败'));
    } finally {
      batchQuoteLoading.value = false;
    }
  }

  async function submitRefundRequest() {
    if (!detail.value) return;
    const { card } = detail.value;
    const ok = await confirmFundsAction(
      `确认对储值卡 ${card.card_no} 提交退卡申请？申请后须由其他管理员审核，审核通过即出账。`,
      '申请退卡'
    );
    if (!ok) return;
    try {
      await requestEsportsStoredValueCardRefund(card.id);
      Message.success('已提交退卡申请，等待财务审核');
      await openDetail(card);
      await loadCards();
    } catch (err) {
      Message.error(errorText(err, '申请退卡失败'));
    }
  }

  // 退卡审核：通过即出账，必须先登记打款凭证 / 银行流水号（后端已改为必填）。
  const refundDecisionVisible = ref(false);
  const refundDecisionTarget = ref<EsportsStoredValueCard | null>(null);
  const refundDecisionForm = reactive({
    approve: true,
    payoutRef: '',
    payoutNote: '',
  });
  // 可退金额优先取退卡试算，其次取批次试算（两者的可退本金口径一致）。
  const refundableText = computed(() =>
    moneyText(
      Number(
        quote.value?.refundable_cents ||
          batchQuote.value?.refundable_principal_cents ||
          0
      )
    )
  );

  function openRefundDecision(approve: boolean) {
    if (!detail.value) return;
    refundDecisionTarget.value = detail.value.card;
    refundDecisionForm.approve = approve;
    refundDecisionForm.payoutRef = '';
    refundDecisionForm.payoutNote = '';
    refundDecisionVisible.value = true;
  }

  async function submitRefundDecision() {
    const target = refundDecisionTarget.value;
    if (!target) return;
    const { approve } = refundDecisionForm;
    const payoutRef = refundDecisionForm.payoutRef.trim();
    if (approve) {
      if (payoutRef.length < 6 || payoutRef.length > 128) {
        Message.warning('打款凭证 / 银行流水号须填写 6-128 个字符');
        return;
      }
      if (!/^[A-Za-z0-9\u4e00-\u9fa5\-_/.]+$/.test(payoutRef)) {
        Message.warning('打款凭证号只能包含字母、数字与 - _ / . 等字符');
        return;
      }
    }
    const ok = await confirmFundsAction(
      `确认${approve ? '通过退卡并出账' : '驳回退卡'}（卡号 ${
        target.card_no
      }，试算可退 ${refundableText.value}）？${
        approve ? `打款凭证 ${payoutRef}。` : ''
      }审核人不得是申请人，操作不可回退。`,
      approve ? '退卡审核出账' : '驳回退卡'
    );
    if (!ok) return;
    try {
      // TODO(api.ts): decideEsportsStoredValueCardRefund 目前只接受 (id, approve)，
      // 后端本轮起审核通过必须带 payout_ref（打款凭证 / 银行流水号）与可选 payout_note。
      // 需 api.ts 补第三个入参（如 { payout_ref, payout_note }）后再在此透传；
      // 在此之前通过操作会被后端以「退卡出账必须填写打款凭证或银行流水号」拒绝。
      await decideEsportsStoredValueCardRefund(target.id, approve);
      Message.success(approve ? '已通过退卡' : '已驳回退卡');
      refundDecisionVisible.value = false;
      await openDetail(target);
      await loadCards();
    } catch (err) {
      Message.error(errorText(err, '退卡审核失败'));
    }
  }

  // ── 储值卡一致性异常队列（§4.6-06） ──
  const mainTab = ref<'cards' | 'exceptions'>('cards');
  const exceptions = ref<EsportsStoredValueException[]>([]);
  const exceptionsLoading = ref(false);
  const exceptionFilterStatus = ref<StoredValueExceptionStatus | ''>('');
  const exceptionFilterKind = ref<string>('');
  const exceptionFilterCardId = ref(0);
  const exceptionFilterOrderId = ref(0);
  const exceptionMine = ref(false);
  const exceptionUnassigned = ref(false);
  const exceptionKindOptions = [
    { value: 'write_off_mismatch', label: '核销流水不符' },
    { value: 'card_flag_mismatch', label: '卡标记不符' },
    { value: 'card_link_mismatch', label: '关联卡不符' },
    { value: 'settlement_blocked', label: '结算被拦截' },
  ];
  const exceptionKindText = (kind: string) =>
    exceptionKindOptions.find((option) => option.value === kind)?.label || kind;
  const exceptionStatusText = (status: StoredValueExceptionStatus) =>
    ({
      open: '待指派',
      following: '跟进中',
      resolved: '已处理',
      ignored: '已忽略',
    }[status] || status);
  const exceptionStatusColor = (status: StoredValueExceptionStatus) =>
    ({
      open: 'red',
      following: 'orange',
      resolved: 'green',
      ignored: 'gray',
    }[status] || 'gray');
  const isExceptionOpen = (record: EsportsStoredValueException) =>
    record.status === 'open' || record.status === 'following';

  async function loadExceptions() {
    exceptionsLoading.value = true;
    try {
      exceptions.value =
        (
          await listStoredValueExceptions({
            status: exceptionFilterStatus.value || undefined,
            kind: exceptionFilterKind.value || undefined,
            card_id: exceptionFilterCardId.value || undefined,
            order_id: exceptionFilterOrderId.value || undefined,
            mine: exceptionMine.value || undefined,
            unassigned: exceptionUnassigned.value || undefined,
          })
        ).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载储值卡异常队列失败'));
    } finally {
      exceptionsLoading.value = false;
    }
  }

  // 切到「异常队列」页签时按需拉取（默认只看待跟进）。
  function onMainTabChange(key: string | number) {
    if (key === 'exceptions' && exceptions.value.length === 0) {
      loadExceptions();
    }
  }

  const exceptionDetailVisible = ref(false);
  const exceptionDetail = ref<EsportsStoredValueException | null>(null);
  const exceptionDetailJson = computed(() =>
    exceptionDetail.value?.detail
      ? JSON.stringify(exceptionDetail.value.detail, null, 2)
      : '无对比快照'
  );
  const exceptionTarget = ref<EsportsStoredValueException | null>(null);
  const exceptionAssignVisible = ref(false);
  const exceptionAssignForm = reactive({ adminId: 0 });
  const exceptionResolveVisible = ref(false);
  const exceptionResolveForm = reactive({
    action: 'resolve' as 'resolve' | 'ignore',
    resolution: '',
  });

  async function openExceptionDetail(record: EsportsStoredValueException) {
    exceptionDetailVisible.value = true;
    exceptionDetail.value = record;
    try {
      exceptionDetail.value = (
        await getStoredValueException(record.id)
      ).data.data;
    } catch (err) {
      Message.error(errorText(err, '加载异常详情失败'));
    }
  }

  function openExceptionAssign(record: EsportsStoredValueException) {
    exceptionTarget.value = record;
    exceptionAssignForm.adminId = record.assignee_admin_id || 0;
    exceptionAssignVisible.value = true;
  }

  async function submitExceptionAssign() {
    const target = exceptionTarget.value;
    if (!target) return;
    if (!exceptionAssignForm.adminId) {
      Message.warning('请填写跟进人管理员 ID');
      return;
    }
    const ok = await confirmFundsAction(
      `确认把异常 ${target.exception_no} 指派给管理员 ${exceptionAssignForm.adminId}？指派后状态转「跟进中」。`,
      '指派异常跟进人'
    );
    if (!ok) return;
    try {
      await assignStoredValueException(target.id, exceptionAssignForm.adminId);
      exceptionAssignVisible.value = false;
      Message.success('已指派跟进人');
      await loadExceptions();
    } catch (err) {
      Message.error(errorText(err, '指派失败：跟进人不存在或状态已变化'));
    }
  }

  function openExceptionResolve(record: EsportsStoredValueException) {
    exceptionTarget.value = record;
    exceptionResolveForm.action = 'resolve';
    exceptionResolveForm.resolution = '';
    exceptionResolveVisible.value = true;
  }

  async function submitExceptionResolve() {
    const target = exceptionTarget.value;
    if (!target) return;
    const resolution = exceptionResolveForm.resolution.trim();
    if (exceptionResolveForm.action === 'resolve' && !resolution) {
      Message.warning('置为已处理时必须填写处置说明');
      return;
    }
    const ok = await confirmFundsAction(
      `确认对异常 ${target.exception_no} 执行「${
        exceptionResolveForm.action === 'resolve' ? '已处理' : '忽略'
      }」？处置后不可回退。`,
      '处置储值卡异常'
    );
    if (!ok) return;
    try {
      await resolveStoredValueException(target.id, {
        action: exceptionResolveForm.action,
        resolution,
        expected_version: target.version,
      });
      exceptionResolveVisible.value = false;
      exceptionDetailVisible.value = false;
      Message.success('已处置该异常');
      await loadExceptions();
    } catch (err) {
      Message.error(errorText(err, '处置失败：状态已变化或说明不合规'));
    }
  }

  onMounted(() => {
    loadCards();
    loadPackages();
  });
</script>

<style scoped>
  .toolbar {
    margin-bottom: 12px;
  }

  .hint {
    margin-bottom: 12px;
    color: var(--color-text-3);
    font-size: 12px;
  }

  .detail-json {
    max-height: 260px;
    margin: 0;
    padding: 8px;
    overflow: auto;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    background: var(--color-fill-1);
  }
</style>
