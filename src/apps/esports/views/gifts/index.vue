<template>
  <div class="container page-container">
    <a-card class="general-card" title="礼物目录">
      <a-space class="toolbar">
        <a-button :loading="loading" @click="load">刷新</a-button>
        <a-button v-if="canManage" type="primary" @click="openCreate"
          >新建礼物</a-button
        >
      </a-space>

      <a-table
        :data="items"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="code" title="编号" />
          <a-table-column data-index="name" title="名称" />
          <a-table-column data-index="category" title="分类" />
          <a-table-column title="价格">
            <template #cell="{ record }">{{
              yuan(record.price_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="默认分成">
            <template #cell="{ record }">{{ commissionText(record) }}</template>
          </a-table-column>
          <a-table-column title="高额档">
            <template #cell="{ record }">{{
              record.high_value ? '是' : '否'
            }}</template>
          </a-table-column>
          <a-table-column title="年龄限制">
            <template #cell="{ record }">{{
              record.require_age ? '是' : '否'
            }}</template>
          </a-table-column>
          <a-table-column title="排序" :width="70">
            <template #cell="{ record }">{{ record.sort_order }}</template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)">{{
                statusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="200">
            <template #cell="{ record }">
              <template v-if="canManage">
                <a-button type="text" @click="openEdit(record)">编辑</a-button>
                <a-button
                  v-if="record.status !== 'on_sale'"
                  type="text"
                  status="success"
                  @click="changeStatus(record, 'on_sale')"
                  >上架</a-button
                >
                <a-button
                  v-else
                  type="text"
                  status="danger"
                  @click="changeStatus(record, 'off_sale')"
                  >下架</a-button
                >
              </template>
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="礼物意向">
      <a-space class="toolbar">
        <a-button :loading="intentLoading" @click="loadIntents"
          >刷新确认单</a-button
        >
        <a-button v-if="canManage" type="primary" @click="openSend"
          >发起客户确认</a-button
        >
      </a-space>
      <a-tabs v-model:active-key="intentTab">
        <a-tab-pane key="list" title="确认单列表">
          <a-table
            :data="intents"
            :loading="intentLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="id" title="确认单 ID" />
              <a-table-column data-index="customer_id" title="客户 ID" />
              <a-table-column title="礼物 / 收礼陪玩">
                <template #cell="{ record }"
                  >{{ record.gift_name }} × {{ record.quantity }} →
                  {{ record.player_name }}</template
                >
              </a-table-column>
              <a-table-column title="客户确认金额">
                <template #cell="{ record }">{{
                  yuan(record.amount_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="付款来源">
                <template #cell>客户余额本金</template>
              </a-table-column>
              <a-table-column title="收款状态">
                <template #cell="{ record }">{{
                  paymentText(record)
                }}</template>
              </a-table-column>
              <a-table-column title="状态">
                <template #cell="{ record }">{{
                  intentStatus(record.status)
                }}</template>
              </a-table-column>
              <a-table-column title="到期时间">
                <template #cell="{ record }">{{
                  fmtMinute(record.expires_at)
                }}</template>
              </a-table-column>
              <a-table-column title="操作" :width="180">
                <template #cell="{ record }">
                  <a-button
                    v-if="canManage && record.status === 'confirmed'"
                    type="text"
                    @click="executeIntent(record)"
                    >执行送礼</a-button
                  >
                  <a-popconfirm
                    v-if="canStartPayment && paymentStartable(record)"
                    content="确认对该确认单发起收款？渠道未开通时后端会明确失败。"
                    @ok="openPayment(record)"
                  >
                    <a-button type="text">发起收款</a-button>
                  </a-popconfirm>
                  <span
                    v-if="
                      !(canManage && record.status === 'confirmed') &&
                      !(canStartPayment && paymentStartable(record))
                    "
                    >-</span
                  >
                </template>
              </a-table-column>
            </template>
          </a-table>
          <div class="hint"
            >客户在移动端核对礼物、收礼人、数量和金额后确认；确认单 30
            分钟内有效。客户余额本金不足时，由客服对确认单发起收款，收款核销后成单。</div
          >
        </a-tab-pane>
        <a-tab-pane key="payment" title="收款核验">
          <a-table
            :data="awaitingPaymentIntents"
            :loading="intentLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="id" title="确认单 ID" />
              <a-table-column data-index="customer_id" title="客户 ID" />
              <a-table-column title="礼物">
                <template #cell="{ record }"
                  >{{ record.gift_name }} × {{ record.quantity }}</template
                >
              </a-table-column>
              <a-table-column title="应收">
                <template #cell="{ record }">{{
                  yuan(record.amount_cents)
                }}</template>
              </a-table-column>
              <a-table-column title="收款渠道">
                <template #cell="{ record }">{{
                  channelText(record.payment_channel)
                }}</template>
              </a-table-column>
              <a-table-column title="收款单号">
                <template #cell="{ record }">{{
                  record.payment_intent_no || '-'
                }}</template>
              </a-table-column>
              <a-table-column title="收款到期">
                <template #cell="{ record }">{{
                  fmtMinute(record.payment_expires_at)
                }}</template>
              </a-table-column>
              <a-table-column title="操作" :width="120">
                <template #cell="{ record }">
                  <a-button
                    v-if="canVerifyPayment"
                    type="text"
                    @click="openVerify(record)"
                    >核销 / 驳回</a-button
                  >
                  <span v-else>-</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
          <div class="hint"
            >人工核销须填写到账凭证号与不少于 8
            字的到账说明，实收金额须与应收一致；创建该确认单的经办人不得自行核销。驳回后收款意图置为失败，可让客户重新发起。</div
          >
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-card class="general-card" title="送礼单据">
      <a-space class="toolbar" wrap>
        <a-input-number
          v-model="filterCustomerId"
          :min="1"
          placeholder="客户 ID"
          :style="{ width: '140px' }"
        />
        <a-input-number
          v-model="filterPlayerId"
          :min="1"
          placeholder="陪玩 ID"
          :style="{ width: '140px' }"
        />
        <a-select
          v-model="filterReviewStatus"
          placeholder="复核状态"
          allow-clear
          :style="{ width: '160px' }"
        >
          <a-option value="normal">正常</a-option>
          <a-option value="flagged">待复核</a-option>
          <a-option value="approved">复核通过</a-option>
          <a-option value="rejected">复核驳回</a-option>
        </a-select>
        <a-button type="primary" :loading="orderLoading" @click="loadOrders"
          >查询</a-button
        >
      </a-space>

      <a-table
        :data="orders"
        :loading="orderLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column data-index="gift_no" title="礼物单号" :width="200" />
          <a-table-column title="客户 / 陪玩">
            <template #cell="{ record }"
              >{{ record.customer_id }} → {{ record.player_name }}（{{
                record.player_id
              }}）</template
            >
          </a-table-column>
          <a-table-column title="金额">
            <template #cell="{ record }">{{
              yuan(record.amount_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="付款来源">
            <template #cell>客户余额本金</template>
          </a-table-column>
          <a-table-column title="陪玩收入">
            <template #cell="{ record }">{{
              yuan(record.income_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="关联订单">
            <template #cell="{ record }">{{ record.order_id ?? '-' }}</template>
          </a-table-column>
          <a-table-column title="复核">
            <template #cell="{ record }">
              <a-tag :color="reviewColor(record.review_status)">{{
                reviewLabel(record.review_status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">{{
              record.status === 'refunded' ? '已退款' : '已支付'
            }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="220">
            <template #cell="{ record }">
              <template v-if="canManage && record.status === 'paid'">
                <template v-if="record.review_status === 'flagged'">
                  <a-button
                    type="text"
                    status="success"
                    @click="review(record, 'approve')"
                    >通过</a-button
                  >
                  <a-button
                    type="text"
                    status="danger"
                    @click="review(record, 'reject')"
                    >驳回</a-button
                  >
                </template>
                <a-button
                  type="text"
                  status="danger"
                  @click="openRefund(record)"
                  >退款</a-button
                >
              </template>
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="礼物榜单">
      <a-space class="toolbar">
        <a-select v-model="board" :style="{ width: '180px' }">
          <a-option value="player">陪玩收礼榜</a-option>
          <a-option value="customer">客户贡献榜</a-option>
        </a-select>
        <a-select v-model="period" :style="{ width: '140px' }">
          <a-option value="daily">日榜</a-option>
          <a-option value="weekly">周榜</a-option>
          <a-option value="monthly">月榜</a-option>
        </a-select>
        <a-button :loading="boardLoading" @click="loadBoard">查询</a-button>
      </a-space>
      <a-table
        :data="boardRows"
        :loading="boardLoading"
        row-key="owner_id"
        :pagination="false"
      >
        <template #columns>
          <a-table-column title="排名" :width="70">
            <template #cell="{ rowIndex }">{{ rowIndex + 1 }}</template>
          </a-table-column>
          <a-table-column data-index="owner_name" title="归属人" />
          <a-table-column title="金额">
            <template #cell="{ record }">{{
              yuan(record.amount_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="笔数" :width="90">
            <template #cell="{ record }">{{ record.count }}</template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="礼物争议">
      <a-space class="toolbar">
        <a-select
          v-model="disputeFilterStatus"
          placeholder="全部状态"
          allow-clear
          :style="{ width: '160px' }"
        >
          <a-option value="pending_review">待审核</a-option>
          <a-option value="approved">待执行</a-option>
          <a-option value="completed">已完成</a-option>
          <a-option value="rejected">已驳回</a-option>
          <a-option value="withdrawn">已撤回</a-option>
        </a-select>
        <a-button :loading="disputesLoading" @click="loadDisputes"
          >刷新</a-button
        >
        <a-button type="primary" @click="openDisputeCreate"
          >代客户建单</a-button
        >
      </a-space>
      <div class="hint">
        客户可在移动端对本人礼物订单发起争议；客服审核须给出不超过申请额与可退余额的确认金额，
        审核人与申请人、执行人与审核人不得为同一人。执行后按比例冲回礼物分成、客服提成与成长值。
      </div>
      <a-table
        :data="disputes"
        :loading="disputesLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column
            data-index="dispute_no"
            title="争议单号"
            :width="200"
          />
          <a-table-column data-index="gift_no" title="礼物单号" :width="180" />
          <a-table-column title="类型" :width="120">
            <template #cell="{ record }">{{
              disputeKindText(record.kind)
            }}</template>
          </a-table-column>
          <a-table-column data-index="demand" title="客户诉求" />
          <a-table-column title="申请 / 确认" :width="160">
            <template #cell="{ record }">
              {{ yuan(record.requested_refund_cents) }} /
              {{
                record.approved_refund_cents
                  ? yuan(record.approved_refund_cents)
                  : '-'
              }}
            </template>
          </a-table-column>
          <a-table-column title="状态" :width="110">
            <template #cell="{ record }">
              <a-tag :color="disputeStatusTagColor(record.status)">{{
                disputeStatusText(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="180">
            <template #cell="{ record }">
              <a-button
                v-if="record.status === 'pending_review'"
                type="text"
                @click="openDisputeReview(record)"
                >审核</a-button
              >
              <a-button
                v-else-if="record.status === 'approved'"
                type="text"
                @click="executeDispute(record)"
                >执行退款</a-button
              >
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="disputeCreateVisible"
      title="代客户建礼物争议单"
      :width="600"
      @ok="submitDisputeCreate"
      @cancel="disputeCreateVisible = false"
    >
      <a-form :model="disputeCreateForm">
        <a-form-item label="礼物单据" required>
          <a-select
            v-model="disputeCreateForm.giftOrderId"
            placeholder="选择可退的礼物单据"
          >
            <a-option
              v-for="order in refundableOrders"
              :key="order.id"
              :value="order.id"
            >
              {{ order.gift_no }} · 客户 {{ order.customer_id }} ·
              {{ yuan(order.amount_cents) }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="争议类型" required>
          <a-select v-model="disputeCreateForm.kind">
            <a-option
              v-for="(label, key) in disputeKindMap"
              :key="key"
              :value="key"
              >{{ label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="客户诉求" required>
          <a-textarea
            v-model="disputeCreateForm.demand"
            :max-length="500"
            :auto-size="{ minRows: 2 }"
          />
        </a-form-item>
        <a-form-item label="申请退款（元）" required>
          <a-input-number
            v-model="disputeCreateForm.requestedYuan"
            :min="0.01"
            :precision="2"
          />
        </a-form-item>
        <div class="hint">代客户建单时会记录申请人，审核不得由本人完成。</div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="disputeReviewVisible"
      title="审核礼物争议"
      :width="560"
      @ok="submitDisputeReview"
      @cancel="disputeReviewVisible = false"
    >
      <a-form :model="disputeReviewForm">
        <a-form-item label="审核结论" required>
          <a-radio-group v-model="disputeReviewForm.approve">
            <a-radio :value="true">通过并退款</a-radio>
            <a-radio :value="false">驳回</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="disputeReviewForm.approve"
          label="确认退款（元）"
          required
        >
          <a-input-number
            v-model="disputeReviewForm.approvedYuan"
            :min="0.01"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="审核说明">
          <a-textarea
            v-model="disputeReviewForm.resolution"
            :max-length="255"
            :auto-size="{ minRows: 2 }"
          />
        </a-form-item>
        <div class="hint">
          申请退款
          {{
            disputeReviewTarget
              ? yuan(disputeReviewTarget.requested_refund_cents)
              : '-'
          }}，确认额不得超过申请额与可退余额；驳回必须填写说明。
        </div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="formVisible"
      :title="formTarget ? '编辑礼物' : '新建礼物'"
      :width="640"
      @ok="submitForm"
      @cancel="formVisible = false"
    >
      <a-form :model="form">
        <a-form-item label="编号" required>
          <a-input
            v-model="form.code"
            :max-length="80"
            :disabled="!!formTarget"
          />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model="form.name" :max-length="120" />
        </a-form-item>
        <a-form-item label="分类">
          <a-input v-model="form.category" :max-length="80" />
        </a-form-item>
        <a-form-item label="价格（元）" required>
          <a-input-number v-model="form.priceYuan" :min="0.01" :precision="2" />
        </a-form-item>
        <a-form-item label="分成方式" required>
          <a-radio-group v-model="form.commissionMode">
            <a-radio value="percent">按比例</a-radio>
            <a-radio value="fixed">固定金额</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="form.commissionMode === 'percent'"
          label="分成比例（%）"
        >
          <a-input-number
            v-model="form.commissionPercent"
            :min="0"
            :max="100"
            :precision="2"
          />
        </a-form-item>
        <a-form-item v-else label="固定分成（元）">
          <a-input-number
            v-model="form.commissionYuan"
            :min="0"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="高额档（需二次确认）">
          <a-switch v-model="form.highValue" />
        </a-form-item>
        <a-form-item label="仅成年客户可送">
          <a-switch v-model="form.requireAge" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="form.sortOrder" :min="0" />
        </a-form-item>
      </a-form>

      <template v-if="formTarget && canReadTiers">
        <a-divider>
          价格档位
          <a-tooltip
            content="同一礼物下档位编码与价格唯一，至多一个默认档；已被引用的档位不可删除，只能停用。"
          >
            <icon-info-circle class="section-help-icon" />
          </a-tooltip>
        </a-divider>
        <a-space class="toolbar">
          <a-button
            v-if="canCreateTier"
            type="primary"
            size="small"
            @click="openTierCreate"
            >新增档位</a-button
          >
          <a-button size="small" :loading="tierLoading" @click="loadTiers"
            >刷新档位</a-button
          >
        </a-space>
        <a-table
          :data="tiers"
          :loading="tierLoading"
          row-key="id"
          :pagination="false"
          size="small"
        >
          <template #columns>
            <a-table-column data-index="tier_code" title="档位编码" />
            <a-table-column data-index="name" title="名称" />
            <a-table-column title="价格">
              <template #cell="{ record }">{{
                yuan(record.price_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="高额档" :width="80">
              <template #cell="{ record }">{{
                record.high_value ? '是' : '否'
              }}</template>
            </a-table-column>
            <a-table-column title="年龄限制" :width="90">
              <template #cell="{ record }">{{
                record.require_age ? '是' : '否'
              }}</template>
            </a-table-column>
            <a-table-column title="默认" :width="70">
              <template #cell="{ record }">{{
                record.is_default ? '是' : '否'
              }}</template>
            </a-table-column>
            <a-table-column data-index="sort_order" title="排序" :width="70" />
            <a-table-column title="状态" :width="80">
              <template #cell="{ record }">
                <a-tag
                  :color="record.status === 'enabled' ? 'green' : 'gray'"
                  >{{ record.status === 'enabled' ? '启用' : '停用' }}</a-tag
                >
              </template>
            </a-table-column>
            <a-table-column title="操作" :width="140">
              <template #cell="{ record }">
                <a-button
                  v-if="canUpdateTier"
                  type="text"
                  @click="openTierEdit(record)"
                  >编辑</a-button
                >
                <a-popconfirm
                  v-if="canDeleteTier"
                  content="确认删除该档位？已被礼物单引用的档位只能停用。"
                  @ok="removeTier(record)"
                >
                  <a-button type="text" status="danger">删除</a-button>
                </a-popconfirm>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </template>
    </a-modal>

    <a-modal
      v-model:visible="tierVisible"
      :title="tierTarget ? '编辑价格档位' : '新增价格档位'"
      :width="560"
      @ok="submitTier"
      @cancel="tierVisible = false"
    >
      <a-form :model="tierForm">
        <a-form-item
          label="档位编码"
          tooltip="创建后不可修改，同一礼物下不可重复。"
          required
        >
          <a-input
            v-model="tierForm.tierCode"
            :max-length="48"
            :disabled="!!tierTarget"
          />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model="tierForm.name" :max-length="120" />
        </a-form-item>
        <a-form-item
          label="价格（元）"
          tooltip="同一礼物下价格不可重复。"
          required
        >
          <a-input-number
            v-model="tierForm.priceYuan"
            :min="0.01"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="高额档（需二次确认）">
          <a-switch v-model="tierForm.highValue" />
        </a-form-item>
        <a-form-item label="仅成年客户可送">
          <a-switch v-model="tierForm.requireAge" />
        </a-form-item>
        <a-form-item
          label="默认档"
          tooltip="设为默认会清除同礼物的其它默认档。"
        >
          <a-switch v-model="tierForm.isDefault" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="tierForm.sortOrder" :min="0" />
        </a-form-item>
        <a-form-item label="状态">
          <a-radio-group v-model="tierForm.status">
            <a-radio value="enabled">启用</a-radio>
            <a-radio value="disabled">停用</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="paymentVisible"
      title="发起礼物收款"
      :width="560"
      :ok-loading="paymentSubmitting"
      :mask-closable="!paymentSubmitting"
      @ok="submitPaymentStart"
      @cancel="paymentVisible = false"
    >
      <a-form :model="paymentForm">
        <a-form-item label="确认单">
          <span v-if="paymentTarget"
            >#{{ paymentTarget.id }} · {{ paymentTarget.gift_name }} ×
            {{ paymentTarget.quantity }} · 应收
            {{ yuan(paymentTarget.amount_cents) }}</span
          >
        </a-form-item>
        <a-form-item label="收款渠道" required>
          <a-select v-model="paymentForm.channel">
            <a-option value="wechat_work">企业微信收款</a-option>
            <a-option value="merchant_qr">工作室商户码</a-option>
            <a-option value="corporate_transfer">对公转账</a-option>
          </a-select>
          <div class="hint"
            >企业微信收款走在线网关（须有启用中的收款账户）；商户码与对公转账按人工核销。渠道未开通时后端明确失败，不会伪成功。</div
          >
        </a-form-item>
        <template v-if="paymentResult">
          <a-form-item label="收款结果">
            <div>
              收款单号：{{ paymentResult.payment_intent_no }}（{{
                paymentResult.payment_status
              }}）
            </div>
            <div>应收金额：{{ yuan(paymentResult.payable_cents) }}</div>
            <div>收款到期：{{ fmtMinute(paymentResult.expires_at) }}</div>
            <div v-if="paymentResult.pay_url" class="pay-url">
              支付链接：{{ paymentResult.pay_url }}
            </div>
          </a-form-item>
        </template>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="verifyVisible"
      title="核销礼物收款"
      :width="560"
      @ok="submitVerify"
      @cancel="verifyVisible = false"
    >
      <a-form :model="verifyForm">
        <a-form-item label="确认单">
          <span v-if="verifyTarget"
            >#{{ verifyTarget.id }} · {{ verifyTarget.gift_name }} ×
            {{ verifyTarget.quantity }} · 应收
            {{ yuan(verifyTarget.amount_cents) }}</span
          >
        </a-form-item>
        <a-form-item label="核验结论" required>
          <a-radio-group v-model="verifyForm.approve">
            <a-radio :value="true">到账通过并成单</a-radio>
            <a-radio :value="false">驳回（未收到款）</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="verifyForm.approve" label="到账凭证号" required>
          <a-input v-model="verifyForm.paymentRef" :max-length="128" />
        </a-form-item>
        <a-form-item v-if="verifyForm.approve" label="实收金额（元）">
          <a-input-number :model-value="verifyYuan" disabled :precision="2" />
          <div class="hint">实收须与应收一致，否则后端拒绝核销。</div>
        </a-form-item>
        <a-form-item label="到账说明" required>
          <a-textarea
            v-model="verifyForm.evidenceNote"
            :max-length="255"
            :auto-size="{ minRows: 2 }"
          />
          <div class="hint">不少于 8 字，作为核销留痕。</div>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="sendVisible"
      title="发起礼物确认"
      :ok-loading="sendSubmitting"
      :mask-closable="!sendSubmitting"
      @ok="submitSend"
      @cancel="sendVisible = false"
    >
      <a-form :model="sendForm">
        <a-form-item label="客户 ID" required>
          <a-input-number v-model="sendForm.customerId" :min="1" />
        </a-form-item>
        <a-form-item label="礼物" required>
          <a-select v-model="sendForm.giftId" placeholder="选择上架礼物">
            <a-option
              v-for="gift in onSaleGifts"
              :key="gift.id"
              :value="gift.id"
              >{{ gift.name }}（{{ yuan(gift.price_cents) }}）</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="收礼陪玩 ID" required>
          <a-input-number v-model="sendForm.playerId" :min="1" />
        </a-form-item>
        <a-form-item label="数量" required>
          <a-input-number v-model="sendForm.quantity" :min="1" :max="999" />
        </a-form-item>
        <a-form-item label="关联订单 ID（仅追溯，可不填）">
          <a-input-number v-model="sendForm.orderId" :min="0" />
        </a-form-item>
        <a-form-item label="付款来源" required>
          <a-radio-group v-model="sendForm.paymentSource">
            <a-radio value="customer_balance_principal">客户余额本金</a-radio>
          </a-radio-group>
        </a-form-item>
        <div class="hint"
          >创建后请客户在移动端“我的 → 待确认礼物”核对并确认，再执行送礼。</div
        >
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="refundVisible"
      title="礼物退款"
      @ok="submitRefund"
      @cancel="refundVisible = false"
    >
      <a-form :model="refundForm">
        <a-form-item label="退款原因" required>
          <a-textarea v-model="refundForm.reason" :max-length="255" />
        </a-form-item>
      </a-form>
      <div class="hint">退款将原路退还余额，并冲回礼物分成与会员成长值。</div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import yuanToCents from '@/utils/money';
  import {
    createGift,
    createGiftDisputeByAdmin,
    createGiftTier,
    deleteGiftTier,
    executeGiftDispute,
    getGiftLeaderboard,
    listGiftDisputes,
    listGiftOrders,
    listGiftTiers,
    listGifts,
    refundGift,
    reviewGift,
    reviewGiftDispute,
    listGiftIntents,
    createGiftIntent,
    executeGiftIntent,
    setGiftStatus,
    startGiftPayment,
    updateGift,
    updateGiftTier,
    verifyGiftPayment,
  } from '../../api';
  import type {
    EsportsGiftTier,
    Gift,
    GiftDispute,
    GiftDisputeKind,
    GiftDisputeStatus,
    GiftIntent,
    GiftLeaderboardRow,
    GiftOrder,
    GiftPaymentStartView,
    GiftReviewStatus,
    GiftStatus,
    GiftTierInput,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canManage = computed(() => hasButtonPermission('esports:gifts:manage'));
  // 档位与收款入口的权限码取自 app.go 已声明项：esports:gifts:tiers / tier_create /
  // tier_update / tier_delete / payment_start / payment_verify。这些是 PermAPI 码，
  // hasButtonPermission 只命中 PermButton，故与「礼物管理按钮」取或，避免有管理权限的
  // 客服看不到入口；接口侧仍由后端鉴权兜底。
  const hasGiftPerm = (code: string) =>
    canManage.value || hasButtonPermission(code);
  const canReadTiers = computed(() => hasGiftPerm('esports:gifts:tiers'));
  const canCreateTier = computed(() =>
    hasGiftPerm('esports:gifts:tier_create')
  );
  const canUpdateTier = computed(() =>
    hasGiftPerm('esports:gifts:tier_update')
  );
  const canDeleteTier = computed(() =>
    hasGiftPerm('esports:gifts:tier_delete')
  );
  const canStartPayment = computed(() =>
    hasGiftPerm('esports:gifts:payment_start')
  );
  const canVerifyPayment = computed(() =>
    hasGiftPerm('esports:gifts:payment_verify')
  );

  const statusMap: Record<GiftStatus, string> = {
    draft: '草稿',
    on_sale: '上架',
    off_sale: '下架',
  };
  const statusColorMap: Record<GiftStatus, string> = {
    draft: 'gray',
    on_sale: 'green',
    off_sale: 'orange',
  };
  const reviewMap: Record<GiftReviewStatus, string> = {
    normal: '正常',
    flagged: '待复核',
    approved: '复核通过',
    rejected: '复核驳回',
  };
  const reviewColorMap: Record<GiftReviewStatus, string> = {
    normal: 'green',
    flagged: 'orange',
    approved: 'blue',
    rejected: 'red',
  };
  const statusLabel = (value: GiftStatus) => statusMap[value] || value;
  const statusColor = (value: GiftStatus) => statusColorMap[value] || 'gray';
  const reviewLabel = (value: GiftReviewStatus) => reviewMap[value] || value;
  const reviewColor = (value: GiftReviewStatus) =>
    reviewColorMap[value] || 'gray';
  // 金额以分存储，展示为元。
  const yuan = (value: number) => `¥${(value / 100).toFixed(2)}`;
  const commissionText = (gift: Gift) =>
    gift.commission_mode === 'fixed'
      ? `${yuan(gift.commission_cents)} / 笔`
      : `${gift.commission_bp / 100}%`;
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };
  const pad = (value: number) => String(value).padStart(2, '0');
  // 本地时区展示到分钟。
  const fmtMinute = (value: string | null | undefined) => {
    if (!value) return '-';
    const d = new Date(value);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  // 礼物确认单视图已返回收款字段与档位快照（§9.2-01 / §9.1-02），api.ts 的 GiftIntent
  // 尚未收录，页面侧就地补齐只读字段。
  type GiftIntentRow = GiftIntent & {
    payment_channel?: string;
    payment_status?: string;
    payment_intent_no?: string | null;
    payment_ref?: string;
    payment_expires_at?: string | null;
  };
  const paymentChannelMap: Record<string, string> = {
    wechat_work: '企业微信收款',
    merchant_qr: '工作室商户码',
    corporate_transfer: '对公转账',
  };
  const paymentStatusMap: Record<string, string> = {
    not_required: '未发起收款',
    awaiting_payment: '待核销',
    verified: '已核销',
    failed: '核销驳回',
  };
  const channelText = (value?: string) =>
    value ? paymentChannelMap[value] || value : '-';
  const paymentText = (row: GiftIntentRow) => {
    const status = row.payment_status || 'not_required';
    if (status === 'not_required') return '未发起收款';
    const channel = channelText(row.payment_channel);
    return `${channel} / ${paymentStatusMap[status] || status}`;
  };
  // 仅未终态、尚未发起收款且未过期的确认单可发起收款。
  const paymentStartable = (row: GiftIntentRow) =>
    row.status !== 'consumed' &&
    row.status !== 'cancelled' &&
    new Date(row.expires_at).getTime() > Date.now() &&
    (row.payment_status || 'not_required') === 'not_required';

  // ── 礼物目录 ──
  const loading = ref(false);
  const items = ref<Gift[]>([]);
  const onSaleGifts = computed(() =>
    items.value.filter((gift) => gift.status === 'on_sale')
  );

  async function load() {
    loading.value = true;
    try {
      items.value = (await listGifts()).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载礼物目录失败'));
    } finally {
      loading.value = false;
    }
  }

  const formVisible = ref(false);
  const formTarget = ref<Gift | null>(null);
  const form = reactive({
    code: '',
    name: '',
    category: '',
    priceYuan: 0,
    commissionMode: 'percent' as 'percent' | 'fixed',
    commissionPercent: 60,
    commissionYuan: 0,
    highValue: false,
    requireAge: false,
    sortOrder: 0,
  });

  // ── 礼物价格档位（§9.1-02）：随礼物编辑弹窗维护，gift_id / tier_code 创建后不可改 ──
  const tiers = ref<EsportsGiftTier[]>([]);
  const tierLoading = ref(false);
  const tierVisible = ref(false);
  const tierTarget = ref<EsportsGiftTier | null>(null);
  const tierForm = reactive({
    tierCode: '',
    name: '',
    priceYuan: 0,
    highValue: false,
    requireAge: false,
    isDefault: false,
    sortOrder: 0,
    status: 'enabled' as 'enabled' | 'disabled',
  });

  async function loadTiers() {
    const gift = formTarget.value;
    if (!gift) {
      tiers.value = [];
      return;
    }
    tierLoading.value = true;
    try {
      tiers.value = (await listGiftTiers(gift.id)).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载礼物档位失败'));
    } finally {
      tierLoading.value = false;
    }
  }

  function openTierCreate() {
    tierTarget.value = null;
    Object.assign(tierForm, {
      tierCode: '',
      name: '',
      priceYuan: 0,
      highValue: false,
      requireAge: false,
      isDefault: false,
      sortOrder: 0,
      status: 'enabled',
    });
    tierVisible.value = true;
  }

  function openTierEdit(record: EsportsGiftTier) {
    tierTarget.value = record;
    Object.assign(tierForm, {
      tierCode: record.tier_code,
      name: record.name,
      priceYuan: record.price_cents / 100,
      highValue: record.high_value,
      requireAge: record.require_age,
      isDefault: record.is_default,
      sortOrder: record.sort_order,
      status: record.status,
    });
    tierVisible.value = true;
  }

  function buildTierInput(): GiftTierInput | null {
    const tierCode = tierForm.tierCode.trim();
    const name = tierForm.name.trim();
    if (!tierCode || !name) {
      Message.warning('请填写档位编码与名称');
      return null;
    }
    if (!tierForm.priceYuan || tierForm.priceYuan <= 0) {
      Message.warning('请填写档位价格');
      return null;
    }
    return {
      tier_code: tierCode,
      name,
      price_cents: yuanToCents(tierForm.priceYuan),
      high_value: tierForm.highValue,
      require_age: tierForm.requireAge,
      is_default: tierForm.isDefault,
      sort_order: tierForm.sortOrder || 0,
      status: tierForm.status,
    };
  }

  async function submitTier() {
    const gift = formTarget.value;
    if (!gift) return;
    const input = buildTierInput();
    if (!input) return;
    const target = tierTarget.value;
    try {
      if (target) {
        // 编辑不提交 tier_code 改动（编码创建后不可变），按当前版本做乐观锁。
        await updateGiftTier(target.id, {
          ...input,
          tier_code: target.tier_code,
          expected_version: target.version,
        });
      } else {
        await createGiftTier(gift.id, input);
      }
      tierVisible.value = false;
      Message.success(target ? '已更新档位' : '已新增档位');
      await loadTiers();
    } catch (err) {
      Message.error(
        errorText(err, '保存档位失败：编码或价格重复、版本已变化或参数无效')
      );
    }
  }

  async function removeTier(record: EsportsGiftTier) {
    try {
      await deleteGiftTier(record.id, record.version);
      Message.success('已删除档位');
      await loadTiers();
    } catch (err) {
      Message.error(errorText(err, '删除失败：档位已被礼物单引用，只能停用'));
    }
  }

  function openCreate() {
    formTarget.value = null;
    Object.assign(form, {
      code: '',
      name: '',
      category: '',
      priceYuan: 0,
      commissionMode: 'percent',
      commissionPercent: 60,
      commissionYuan: 0,
      highValue: false,
      requireAge: false,
      sortOrder: 0,
    });
    tiers.value = [];
    formVisible.value = true;
  }

  function openEdit(record: Gift) {
    formTarget.value = record;
    Object.assign(form, {
      code: record.code,
      name: record.name,
      category: record.category,
      priceYuan: record.price_cents / 100,
      commissionMode: record.commission_mode,
      commissionPercent: record.commission_bp / 100,
      commissionYuan: record.commission_cents / 100,
      highValue: record.high_value,
      requireAge: record.require_age,
      sortOrder: record.sort_order,
    });
    formVisible.value = true;
    loadTiers();
  }

  async function submitForm() {
    const payload = {
      code: form.code,
      name: form.name,
      icon: '',
      price_cents: yuanToCents(form.priceYuan),
      category: form.category,
      commission_mode: form.commissionMode,
      commission_bp:
        form.commissionMode === 'percent'
          ? yuanToCents(form.commissionPercent)
          : 0,
      commission_cents:
        form.commissionMode === 'fixed' ? yuanToCents(form.commissionYuan) : 0,
      high_value: form.highValue,
      require_age: form.requireAge,
      sort_order: form.sortOrder,
    };
    try {
      if (formTarget.value) {
        await updateGift(formTarget.value.id, {
          ...payload,
          expected_version: formTarget.value.version,
        });
      } else {
        await createGift({ ...payload, status: 'draft' });
      }
      Message.success('保存成功');
      formVisible.value = false;
      await load();
    } catch (err) {
      Message.error(errorText(err, '提交失败：编号重复、版本已变化或参数无效'));
    }
  }

  async function changeStatus(record: Gift, status: GiftStatus) {
    try {
      await setGiftStatus(record.id, record.version, status);
      Message.success('状态已更新');
      await load();
    } catch (err) {
      Message.error(errorText(err, '状态更新失败：版本已变化或状态不允许'));
    }
  }

  // ── 送礼单据 ──
  const orderLoading = ref(false);
  const orders = ref<GiftOrder[]>([]);
  const filterCustomerId = ref<number>();
  const filterPlayerId = ref<number>();
  const filterReviewStatus = ref<GiftReviewStatus>();

  async function loadOrders() {
    orderLoading.value = true;
    try {
      orders.value =
        (
          await listGiftOrders({
            customer_id: filterCustomerId.value,
            player_id: filterPlayerId.value,
            review_status: filterReviewStatus.value,
          })
        ).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载礼物单据失败'));
    } finally {
      orderLoading.value = false;
    }
  }

  const sendVisible = ref(false);
  const intentLoading = ref(false);
  const intents = ref<GiftIntentRow[]>([]);
  const intentTab = ref('list');
  // 已发起收款、等待财务核销的确认单。
  const awaitingPaymentIntents = computed(() =>
    intents.value.filter((item) => item.payment_status === 'awaiting_payment')
  );
  const intentStatus = (value: GiftIntent['status']) =>
    ({
      pending: '待客户确认',
      confirmed: '客户已确认',
      consumed: '已送礼',
      cancelled: '已取消',
    }[value]);
  async function loadIntents() {
    intentLoading.value = true;
    try {
      intents.value = (await listGiftIntents()).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载确认单失败'));
    } finally {
      intentLoading.value = false;
    }
  }
  async function executeIntent(intent: GiftIntent) {
    try {
      await executeGiftIntent(intent.id);
      Message.success('送礼成功');
      await loadIntents();
      await loadOrders();
    } catch (err) {
      Message.error(
        errorText(err, '执行失败：确认单过期、明细已变化或余额不足')
      );
    }
  }

  // ── 礼物意向直接支付（§9.2-01）：发起收款 → 财务核销成单 ──
  const paymentVisible = ref(false);
  const paymentSubmitting = ref(false);
  const paymentTarget = ref<GiftIntentRow | null>(null);
  const paymentResult = ref<GiftPaymentStartView | null>(null);
  const paymentForm = reactive({ channel: 'wechat_work' });

  function openPayment(intent: GiftIntentRow) {
    paymentTarget.value = intent;
    paymentResult.value = null;
    paymentForm.channel = 'wechat_work';
    paymentVisible.value = true;
  }

  async function submitPaymentStart() {
    const target = paymentTarget.value;
    if (!target || paymentSubmitting.value) return;
    paymentSubmitting.value = true;
    try {
      paymentResult.value = (
        await startGiftPayment(target.id, { channel: paymentForm.channel })
      ).data.data;
      Message.success('已发起收款');
      await loadIntents();
    } catch (err) {
      // 渠道未开通 / 无启用账户时后端明确失败（503），原样透出中文提示。
      Message.error(
        errorText(err, '发起收款失败：收款渠道未开通、无可用账户或确认单已过期')
      );
    } finally {
      paymentSubmitting.value = false;
    }
  }

  const verifyVisible = ref(false);
  const verifyTarget = ref<GiftIntentRow | null>(null);
  const verifyForm = reactive({
    approve: true,
    paymentRef: '',
    evidenceNote: '',
  });
  const verifyYuan = computed(() =>
    verifyTarget.value ? verifyTarget.value.amount_cents / 100 : 0
  );

  function openVerify(intent: GiftIntentRow) {
    verifyTarget.value = intent;
    verifyForm.approve = true;
    verifyForm.paymentRef = '';
    verifyForm.evidenceNote = '';
    verifyVisible.value = true;
  }

  async function submitVerify() {
    const target = verifyTarget.value;
    if (!target) return;
    const note = verifyForm.evidenceNote.trim();
    if (note.length < 8) {
      Message.warning('到账说明不少于 8 字');
      return;
    }
    const paymentRef = verifyForm.paymentRef.trim();
    if (verifyForm.approve && !paymentRef) {
      Message.warning('请填写到账凭证号');
      return;
    }
    try {
      await verifyGiftPayment(target.id, {
        approve: verifyForm.approve,
        payment_ref: paymentRef,
        received_cents: verifyForm.approve ? target.amount_cents : 0,
        evidence_note: note,
      });
      verifyVisible.value = false;
      Message.success(
        verifyForm.approve ? '核销通过并已生成礼物单' : '已驳回该笔收款'
      );
      await loadIntents();
      if (verifyForm.approve) await loadOrders();
    } catch (err) {
      Message.error(
        errorText(err, '核销失败：凭证号或实收金额不符、已超时或不得自审')
      );
    }
  }
  const sendForm = reactive({
    customerId: 0,
    giftId: undefined as number | undefined,
    playerId: 0,
    quantity: 1,
    orderId: 0,
    paymentSource: 'customer_balance_principal' as const,
  });

  // 礼物确认单幂等（§9.5-02）：client_key 与「本次提交内容」绑定——同一份内容连点两次复用同一个键，
  // 只产生一张确认单（服务端按 client_key + 请求体哈希去重）；内容变了就换键，
  // 否则同键异体会被后端判为冲突，改正表单后重试将一直失败。
  const sendSubmitting = ref(false);
  const sendClientKey = ref('');
  let sendKeyBody = '';

  function ensureSendClientKey(body: string) {
    if (!sendClientKey.value || sendKeyBody !== body) {
      sendClientKey.value = crypto.randomUUID();
      sendKeyBody = body;
    }
    return sendClientKey.value;
  }

  function openSend() {
    Object.assign(sendForm, {
      customerId: 0,
      giftId: undefined,
      playerId: 0,
      quantity: 1,
      orderId: 0,
      paymentSource: 'customer_balance_principal',
    });
    sendClientKey.value = '';
    sendKeyBody = '';
    sendSubmitting.value = false;
    sendVisible.value = true;
  }

  async function submitSend() {
    if (sendSubmitting.value) return;
    if (!sendForm.giftId) {
      Message.error('请选择礼物');
      return;
    }
    // 幂等键绑定提交内容（不含 client_key 本身）。
    const body = {
      customer_id: sendForm.customerId,
      gift_id: sendForm.giftId,
      player_id: sendForm.playerId,
      quantity: sendForm.quantity,
      order_id: sendForm.orderId ? sendForm.orderId : null,
      payment_source: sendForm.paymentSource,
    };
    sendSubmitting.value = true;
    try {
      await createGiftIntent({
        ...body,
        client_key: ensureSendClientKey(JSON.stringify(body)),
      });
      Message.success('已发起客户确认');
      sendVisible.value = false;
      // 表单会话结束才清键：同一份内容重复提交仍命中同一条确认单。
      sendClientKey.value = '';
      sendKeyBody = '';
      await loadIntents();
    } catch (err) {
      Message.error(
        errorText(err, '创建确认单失败：身份、年龄或礼物状态不符合要求')
      );
    } finally {
      sendSubmitting.value = false;
    }
  }

  async function review(record: GiftOrder, decision: 'approve' | 'reject') {
    try {
      await reviewGift(record.id, decision);
      Message.success('复核完成');
      await loadOrders();
    } catch (err) {
      Message.error(errorText(err, '复核失败：状态已变化'));
    }
  }

  const refundVisible = ref(false);
  const refundTarget = ref<GiftOrder | null>(null);
  const refundForm = reactive({ reason: '' });

  function openRefund(record: GiftOrder) {
    refundTarget.value = record;
    refundForm.reason = '';
    refundVisible.value = true;
  }

  async function submitRefund() {
    if (!refundTarget.value) return;
    try {
      await refundGift(refundTarget.value.id, refundForm.reason);
      Message.success('退款成功');
      refundVisible.value = false;
      await loadOrders();
    } catch (err) {
      Message.error(errorText(err, '退款失败：单据已退款或状态不允许'));
    }
  }

  // ── 榜单 ──
  const boardLoading = ref(false);
  const board = ref<'customer' | 'player'>('player');
  const period = ref<'daily' | 'weekly' | 'monthly'>('daily');
  const boardRows = ref<GiftLeaderboardRow[]>([]);

  async function loadBoard() {
    boardLoading.value = true;
    try {
      boardRows.value =
        (await getGiftLeaderboard(board.value, period.value)).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载榜单失败'));
    } finally {
      boardLoading.value = false;
    }
  }

  // ── 礼物争议（§9.5）：客户申请 → 客服审核 → 执行部分退款 ──
  const disputeKindMap: Record<GiftDisputeKind, string> = {
    not_received: '未收到礼物',
    wrong_gift: '送错对象',
    quality: '礼物与说明不符',
    unauthorized: '非本人授权送礼',
    other: '其他',
  };
  const disputeStatusMap: Record<GiftDisputeStatus, string> = {
    pending_review: '待审核',
    approved: '待执行',
    rejected: '已驳回',
    completed: '已完成',
    withdrawn: '已撤回',
  };
  const disputeStatusColor: Record<GiftDisputeStatus, string> = {
    pending_review: 'orange',
    approved: 'blue',
    rejected: 'red',
    completed: 'green',
    withdrawn: 'gray',
  };

  const disputeKindText = (kind: string) =>
    disputeKindMap[kind as GiftDisputeKind] || kind;
  const disputeStatusText = (status: string) =>
    disputeStatusMap[status as GiftDisputeStatus] || status;
  const disputeStatusTagColor = (status: string) =>
    disputeStatusColor[status as GiftDisputeStatus] || 'gray';

  const disputes = ref<GiftDispute[]>([]);
  const disputesLoading = ref(false);
  const disputeFilterStatus = ref<GiftDisputeStatus>();

  // 可发起争议的礼物单据：已支付且未退满。
  const refundableOrders = computed(() =>
    orders.value.filter(
      (order) => order.status === 'paid' && order.refund_status !== 'full'
    )
  );

  async function loadDisputes() {
    disputesLoading.value = true;
    try {
      disputes.value =
        (await listGiftDisputes(disputeFilterStatus.value)).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载礼物争议失败'));
    } finally {
      disputesLoading.value = false;
    }
  }

  const disputeCreateVisible = ref(false);
  const disputeCreateForm = reactive<{
    giftOrderId?: number;
    kind: GiftDisputeKind;
    demand: string;
    requestedYuan: number;
  }>({ giftOrderId: undefined, kind: 'quality', demand: '', requestedYuan: 0 });

  function openDisputeCreate() {
    disputeCreateForm.giftOrderId = undefined;
    disputeCreateForm.kind = 'quality';
    disputeCreateForm.demand = '';
    disputeCreateForm.requestedYuan = 0;
    disputeCreateVisible.value = true;
  }

  async function submitDisputeCreate() {
    const order = refundableOrders.value.find(
      (row) => row.id === disputeCreateForm.giftOrderId
    );
    if (!order) {
      Message.warning('请选择可退的礼物单据');
      return;
    }
    if (!disputeCreateForm.demand.trim()) {
      Message.warning('请填写客户诉求');
      return;
    }
    if (disputeCreateForm.requestedYuan <= 0) {
      Message.warning('请填写申请退款金额');
      return;
    }
    const availableYuan = (order.amount_cents - order.refund_cents) / 100;
    if (disputeCreateForm.requestedYuan > availableYuan) {
      Message.warning(`申请额不得超过可退余额 ${availableYuan} 元`);
      return;
    }
    try {
      await createGiftDisputeByAdmin({
        gift_order_id: order.id,
        customer_id: order.customer_id,
        kind: disputeCreateForm.kind,
        demand: disputeCreateForm.demand.trim(),
        requested_refund_cents: yuanToCents(disputeCreateForm.requestedYuan),
      });
      disputeCreateVisible.value = false;
      Message.success('已建争议单，待审核');
      await loadDisputes();
    } catch (err) {
      Message.error(
        errorText(err, '建单失败：该单据已有进行中争议、非归属客户或参数无效')
      );
    }
  }

  const disputeReviewVisible = ref(false);
  const disputeReviewTarget = ref<GiftDispute | null>(null);
  const disputeReviewForm = reactive<{
    approve: boolean;
    approvedYuan: number;
    resolution: string;
  }>({ approve: true, approvedYuan: 0, resolution: '' });

  function openDisputeReview(record: GiftDispute) {
    disputeReviewTarget.value = record;
    disputeReviewForm.approve = true;
    disputeReviewForm.approvedYuan = record.requested_refund_cents / 100;
    disputeReviewForm.resolution = '';
    disputeReviewVisible.value = true;
  }

  async function submitDisputeReview() {
    const target = disputeReviewTarget.value;
    if (!target) return;
    if (disputeReviewForm.approve && disputeReviewForm.approvedYuan <= 0) {
      Message.warning('请填写确认退款金额');
      return;
    }
    if (!disputeReviewForm.approve && !disputeReviewForm.resolution.trim()) {
      Message.warning('驳回必须填写说明');
      return;
    }
    try {
      await reviewGiftDispute(target.id, {
        approve: disputeReviewForm.approve,
        approved_refund_cents: disputeReviewForm.approve
          ? yuanToCents(disputeReviewForm.approvedYuan)
          : undefined,
        resolution: disputeReviewForm.resolution.trim(),
      });
      disputeReviewVisible.value = false;
      Message.success(
        disputeReviewForm.approve ? '已通过，待执行退款' : '已驳回'
      );
      await loadDisputes();
    } catch (err) {
      Message.error(
        errorText(err, '审核失败：申请人不得自审、确认额超限或状态已变化')
      );
    }
  }

  async function executeDispute(record: GiftDispute) {
    try {
      await executeGiftDispute(record.id);
      Message.success('已执行退款并按比例冲回分成');
      await loadDisputes();
      await loadOrders();
    } catch (err) {
      Message.error(
        errorText(err, '执行失败：执行人不得为审核人，或可退余额不足')
      );
    }
  }

  onMounted(async () => {
    await load();
    await loadOrders();
    await loadIntents();
    await loadBoard();
    await loadDisputes();
  });
</script>

<style scoped>
  .toolbar {
    margin-bottom: 12px;
  }

  .hint {
    color: var(--color-text-3);
    font-size: 12px;
  }

  .section-help-icon {
    margin-left: 4px;
    color: var(--color-text-3);
    cursor: help;
  }

  .pay-url {
    word-break: break-all;
  }
</style>
