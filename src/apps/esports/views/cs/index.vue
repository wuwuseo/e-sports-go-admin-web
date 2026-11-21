<template>
  <div class="container page-container">
    <a-card class="general-card" title="客服工作台">
      <a-tabs default-active-key="workbench">
        <a-tab-pane key="workbench" title="工作台">
          <a-space class="toolbar" wrap>
            <a-button :loading="loading" @click="loadWorkbench">刷新</a-button>
            <a-button type="primary" @click="openWecomIntake"
              >企微自动建档</a-button
            >
          </a-space>

          <a-space class="summary" size="large" wrap>
            <span>我的客户：{{ workbench?.my_customers ?? 0 }}</span>
            <span
              >报单量：{{ performanceRow.order_count }}，成交额：{{
                moneyText(performanceRow.revenue_cents)
              }}</span
            >
            <span
              >退款：{{ moneyText(performanceRow.refund_cents) }}，净额：{{
                moneyText(performanceRow.net_cents)
              }}</span
            >
            <span
              >我的提成：{{ moneyText(performanceRow.commission_cents) }}</span
            >
          </a-space>

          <a-space class="summary" size="large" wrap>
            <a-tag
              v-for="todo in workbench?.todos || []"
              :key="todo.key"
              :color="todo.count > 0 ? 'orangered' : 'gray'"
              >{{ todo.label }}：{{ todo.count }}</a-tag
            >
          </a-space>

          <a-divider>会员优先预约</a-divider>
          <a-space class="toolbar" wrap>
            <a-button :loading="bookingLoading" @click="loadBookings"
              >刷新预约</a-button
            >
            <a-typography-text type="secondary">
              会员提交的专属预约意向按会员等级置顶、同等级按提交时间排序；处理结果只能是「已处理」或「已取消」，期望时段已过或久未处理的意向会由过期任务自动取消。
            </a-typography-text>
          </a-space>
          <a-table
            title="会员优先预约：会员提交的专属预约意向，按会员等级置顶、同等级按提交时间排序"
            :data="bookings"
            :loading="bookingLoading"
            row-key="id"
            :pagination="{ pageSize: 5 }"
            class="sub-card"
          >
            <template #columns>
              <a-table-column data-index="customer_name" title="客户" />
              <a-table-column title="会员等级">
                <template #cell="{ record }">{{
                  record.member_level_name ||
                  record.member_level_code ||
                  '未定级'
                }}</template>
              </a-table-column>
              <a-table-column title="陪玩">
                <template #cell="{ record }">{{
                  record.player_name || record.player_id
                }}</template>
              </a-table-column>
              <a-table-column title="期望时段">
                <template #cell="{ record }">{{
                  fmtMinute(record.requested_start_at)
                }}</template>
              </a-table-column>
              <a-table-column data-index="note" title="备注" />
              <a-table-column title="提交时间">
                <template #cell="{ record }">{{
                  fmtMinute(record.created_at)
                }}</template>
              </a-table-column>
              <a-table-column title="操作" :width="180">
                <template #cell="{ record }">
                  <template v-if="canProcessBooking">
                    <a-popconfirm
                      content="确认标记为已处理？仅在线下已与客户/陪玩约好档期后使用。"
                      @ok="processBooking(record, 'processed')"
                    >
                      <a-button type="text" status="success"
                        >标记已处理</a-button
                      >
                    </a-popconfirm>
                    <a-popconfirm
                      content="确认取消该预约意向？取消后不再计入客服待办。"
                      @ok="processBooking(record, 'cancelled')"
                    >
                      <a-button type="text" status="danger">取消</a-button>
                    </a-popconfirm>
                  </template>
                  <span v-else>—</span>
                </template>
              </a-table-column>
            </template>
          </a-table>

          <a-divider>订单池（按流转阶段）</a-divider>
          <a-tabs
            v-model:active-key="activePoolKey"
            type="card-gutter"
            size="small"
          >
            <a-tab-pane
              v-for="pool in pools"
              :key="pool.key"
              :title="`${pool.title}（${pool.rows.length}）`"
            >
              <a-table
                :data="pool.rows"
                row-key="id"
                :pagination="{ pageSize: 10 }"
                :title="`${pool.title}：订单按当前流转阶段分组，仅展示当前客服可见的订单`"
                class="sub-card"
              >
                <template #columns>
                  <a-table-column data-index="order_no" title="订单号" />
                  <a-table-column title="客户">
                    <template #cell="{ record }">{{
                      customerNameOf(record.customer_id)
                    }}</template>
                  </a-table-column>
                  <a-table-column title="应付">
                    <template #cell="{ record }">{{
                      moneyText(record.payable_cents)
                    }}</template>
                  </a-table-column>
                  <a-table-column
                    data-index="fulfillment_status"
                    title="履约状态"
                  />
                </template>
              </a-table>
            </a-tab-pane>
          </a-tabs>

          <a-divider>公共池（脱敏摘要）</a-divider>
          <a-table
            :data="workbench?.order_pool?.public_pool || []"
            row-key="id"
            :pagination="{ pageSize: 5 }"
            title="公共池（脱敏摘要）：超管可见客户名；非超管客户身份脱敏，仅见订单号与履约状态"
            class="sub-card"
          >
            <template #columns>
              <a-table-column data-index="order_no" title="订单号" />
              <a-table-column title="客户">
                <template #cell="{ record }">{{
                  customerNameOf(record.customer_id)
                }}</template>
              </a-table-column>
              <a-table-column
                data-index="fulfillment_status"
                title="履约状态"
              />
            </template>
          </a-table>

          <a-divider>对账 / 到账核销</a-divider>
          <a-space class="toolbar" wrap>
            <a-input
              v-model="proofOrderNo"
              placeholder="订单号（可选）"
              allow-clear
              :style="{ width: '200px' }"
            />
            <a-select v-model="proofStatus" :style="{ width: '160px' }">
              <a-option value="pending_verification">待核验</a-option>
              <a-option value="verified">已核销</a-option>
              <a-option value="rejected">已驳回</a-option>
            </a-select>
            <a-button :loading="proofLoading" @click="loadProofs"
              >查询待核验收款</a-button
            >
            <a-typography-text type="secondary">
              外部到账（企微收款 / 商户码 /
              对公转账）由客服提交凭证后在这里查询并核销；
              核销后订单才进入待派单，提交人不得自审。
            </a-typography-text>
          </a-space>
          <a-table
            title="到账凭证核销：外渠道收款凭证按状态筛选并核销，提交人不得自审"
            :data="proofs"
            :loading="proofLoading"
            row-key="id"
            :pagination="{ pageSize: 5 }"
            class="sub-card"
          >
            <template #columns>
              <a-table-column data-index="proof_no" title="凭证号" />
              <a-table-column title="关联订单">
                <template #cell="{ record }">{{
                  record.order_no || '—'
                }}</template>
              </a-table-column>
              <a-table-column title="渠道">
                <template #cell="{ record }">{{
                  payChannelText(record.channel)
                }}</template>
              </a-table-column>
              <a-table-column title="凭证金额">
                <template #cell="{ record }">{{
                  moneyText(record.amount_cents)
                }}</template>
              </a-table-column>
              <a-table-column data-index="transaction_no" title="渠道流水号" />
              <a-table-column title="状态">
                <template #cell="{ record }">
                  <a-tag :color="proofStatusColor(record.status)">{{
                    proofStatusLabel(record.status)
                  }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="操作" :width="150">
                <template #cell="{ record }">
                  <template v-if="record.status === 'pending_verification'">
                    <a-button
                      v-if="canVerifyProof"
                      type="text"
                      status="success"
                      @click="verifyProof(record)"
                      >核销</a-button
                    >
                    <a-button
                      v-if="canRejectProof"
                      type="text"
                      status="danger"
                      @click="openProofReject(record)"
                      >驳回</a-button
                    >
                    <span v-if="!canVerifyProof && !canRejectProof">—</span>
                  </template>
                  <span v-else>—</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="customers" title="我的客户">
          <a-space class="toolbar" wrap>
            <a-button :loading="customerLoading" @click="loadCustomers"
              >刷新</a-button
            >
            <a-input
              v-model="newCustomerName"
              placeholder="客户昵称"
              :style="{ width: '200px' }"
            />
            <a-button
              v-if="canManage"
              type="primary"
              :disabled="!newCustomerName"
              @click="submitCustomer"
              >新建客户</a-button
            >
          </a-space>

          <a-table
            title="我的客户：当前归属本客服的客户，可查看档案或转移归属"
            :data="customers"
            :loading="customerLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="id" title="ID" :width="70" />
              <a-table-column data-index="display_name" title="昵称" />
              <a-table-column data-index="phone" title="手机号">
                <template #cell="{ record }">{{
                  record.phone || '-'
                }}</template>
              </a-table-column>
              <a-table-column title="标签">
                <template #cell="{ record }">
                  <a-tag
                    v-for="tag in record.tags || []"
                    :key="tag"
                    size="small"
                    >{{ tag }}</a-tag
                  >
                  <span v-if="!(record.tags || []).length">-</span>
                </template>
              </a-table-column>
              <a-table-column title="跟进状态">
                <template #cell="{ record }">{{
                  followLabel(record.follow_status)
                }}</template>
              </a-table-column>
              <a-table-column title="最近联系">
                <template #cell="{ record }">{{
                  fmtMinute(record.last_contact_at)
                }}</template>
              </a-table-column>
              <a-table-column title="归属客服" :width="100">
                <template #cell="{ record }">{{
                  record.owner_admin_id || '—'
                }}</template>
              </a-table-column>
              <a-table-column title="操作" :width="150">
                <template #cell="{ record }">
                  <a-button type="text" @click="openProfile(record)"
                    >档案</a-button
                  >
                  <a-button
                    v-if="canTransferOwner"
                    type="text"
                    @click="openOwnerTransfer(record)"
                    >转移归属</a-button
                  >
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="scripts" title="话术库">
          <a-space class="toolbar" wrap>
            <a-button :loading="scriptLoading" @click="loadScripts"
              >刷新</a-button
            >
            <a-input
              v-model="scriptCategory"
              placeholder="按分类筛选"
              :style="{ width: '180px' }"
              @press-enter="loadScripts"
            />
            <a-button v-if="canManage" type="primary" @click="openScript()"
              >新建话术</a-button
            >
          </a-space>

          <a-table
            title="话术库：客服通用话术按分类维护，启用后可复用到沟通记录"
            :data="scripts"
            :loading="scriptLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="title" title="标题" />
              <a-table-column data-index="category" title="分类">
                <template #cell="{ record }">{{
                  record.category || '-'
                }}</template>
              </a-table-column>
              <a-table-column data-index="content" title="内容" />
              <a-table-column title="状态">
                <template #cell="{ record }">
                  <a-tag
                    :color="record.status === 'enabled' ? 'green' : 'gray'"
                    >{{ record.status === 'enabled' ? '启用' : '停用' }}</a-tag
                  >
                </template>
              </a-table-column>
              <a-table-column title="操作" :width="160">
                <template #cell="{ record }">
                  <template v-if="canManage">
                    <a-button type="text" @click="openScript(record)"
                      >编辑</a-button
                    >
                    <a-button
                      type="text"
                      :status="
                        record.status === 'enabled' ? 'danger' : 'success'
                      "
                      @click="toggleScript(record)"
                      >{{
                        record.status === 'enabled' ? '停用' : '启用'
                      }}</a-button
                    >
                  </template>
                  <span v-else>-</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-drawer
      v-model:visible="profileVisible"
      :width="720"
      title="客户档案"
      unmount-on-close
    >
      <template v-if="profile">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="昵称">{{
            profile.customer.display_name
          }}</a-descriptions-item>
          <a-descriptions-item label="会员等级">{{
            profile.member_level_code || '未定级'
          }}</a-descriptions-item>
          <a-descriptions-item
            :label="`当前${displayName('customer_balance')}`"
            >{{
              walletAmount(profile.balance_cents, 'customer_balance')
            }}</a-descriptions-item
          >
          <a-descriptions-item label="成长值">{{
            profile.growth_total
          }}</a-descriptions-item>
          <a-descriptions-item label="累计充值">{{
            moneyText(profile.recharged_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="累计消费">{{
            moneyText(profile.consumed_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="累计送礼">{{
            moneyText(profile.gifted_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="建档来源">{{
            sourceLabel(profile.source)
          }}</a-descriptions-item>
          <a-descriptions-item label="归属客服">{{
            profile.customer.owner_admin_id || '无归属'
          }}</a-descriptions-item>
        </a-descriptions>

        <a-form class="sub-card" :model="profileForm">
          <a-form-item label="手机号">
            <a-input v-model="profileForm.phone" :max-length="32" />
          </a-form-item>
          <a-form-item label="生日（MM-DD）">
            <a-input
              v-model="profileForm.birthday"
              placeholder="如 03-15，用于生日礼遇待办"
              :max-length="5"
            />
          </a-form-item>
          <a-form-item label="消费偏好">
            <a-input v-model="profileForm.preference" :max-length="255" />
          </a-form-item>
          <a-form-item label="客户标签">
            <a-input-tag
              v-model="profileForm.tags"
              placeholder="回车添加标签"
              :max-tag-count="6"
            />
          </a-form-item>
          <a-form-item label="跟进状态">
            <a-select v-model="profileForm.followStatus">
              <a-option
                v-for="option in followOptions"
                :key="option.value"
                :value="option.value"
                >{{ option.label }}</a-option
              >
            </a-select>
          </a-form-item>
          <a-form-item label="允许自助下单">
            <a-switch v-model="profileForm.selfOrderEnabled" />
            <a-typography-text type="secondary"
              >关闭后客户无法自助下单/充值/购卡</a-typography-text
            >
          </a-form-item>
          <a-button
            v-if="canManage"
            type="primary"
            :loading="profileSaving"
            @click="submitProfile"
            >保存档案</a-button
          >
        </a-form>

        <a-divider>历史订单明细</a-divider>
        <a-space class="toolbar" wrap>
          <a-button
            v-if="canBackfill"
            type="primary"
            :disabled="!backfillAllowed"
            @click="openBackfill"
            >补录历史订单</a-button
          >
          <a-typography-text type="secondary" class="order-tip">{{
            backfillHint
          }}</a-typography-text>
        </a-space>
        <a-typography-text type="secondary" class="order-tip">
          仅展示当前账号可见的订单（负责或已授权协作），越权订单不会出现在此明细中。
        </a-typography-text>
        <a-table
          title="历史订单：仅展示当前账号可见的订单（负责或已授权协作）"
          :data="profileOrders"
          :loading="profileOrderLoading"
          row-key="id"
          :pagination="{ pageSize: 5 }"
        >
          <template #columns>
            <a-table-column data-index="order_no" title="订单号" />
            <a-table-column title="应付">
              <template #cell="{ record }">{{
                moneyText(record.payable_cents)
              }}</template>
            </a-table-column>
            <a-table-column data-index="payment_status" title="支付状态" />
            <a-table-column data-index="fulfillment_status" title="履约状态" />
            <a-table-column title="下单时间">
              <template #cell="{ record }">{{
                fmtMinute(record.created_at)
              }}</template>
            </a-table-column>
          </template>
        </a-table>

        <a-divider>跟进记录</a-divider>
        <a-space class="toolbar" wrap>
          <a-input
            v-model="followForm.summary"
            placeholder="本次沟通要点"
            :style="{ width: '220px' }"
          />
          <a-select v-model="followForm.channel" :style="{ width: '110px' }">
            <a-option
              v-for="option in channelOptions"
              :key="option.value"
              :value="option.value"
              >{{ option.label }}</a-option
            >
          </a-select>
          <a-button
            v-if="canManage"
            type="primary"
            :disabled="!followForm.summary"
            :loading="followSaving"
            @click="submitFollowUp"
            >记录</a-button
          >
        </a-space>

        <a-list :data="followUps" :bordered="false">
          <template #item="{ item }">
            <a-list-item>
              <a-space direction="vertical" size="mini">
                <span>{{ item.summary }}</span>
                <a-typography-text type="secondary">
                  {{ channelLabel(item.channel) }} ·
                  {{ fmtMinute(item.created_at) }} · 下次跟进
                  {{ fmtMinute(item.next_follow_at) }}
                </a-typography-text>
              </a-space>
            </a-list-item>
          </template>
        </a-list>
      </template>
    </a-drawer>

    <a-modal
      v-model:visible="scriptVisible"
      title="话术"
      @ok="submitScript"
      @cancel="scriptVisible = false"
    >
      <a-form :model="scriptForm">
        <a-form-item label="标题" required>
          <a-input v-model="scriptForm.title" :max-length="120" />
        </a-form-item>
        <a-form-item label="分类">
          <a-input v-model="scriptForm.category" :max-length="60" />
        </a-form-item>
        <a-form-item label="内容" required>
          <a-textarea v-model="scriptForm.content" :max-length="2000" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="scriptForm.sortOrder" :min="0" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="proofRejectVisible"
      title="驳回到账凭证"
      @ok="submitProofReject"
      @cancel="proofRejectVisible = false"
    >
      <a-form :model="proofRejectForm">
        <a-form-item label="凭证号">{{
          proofRejectTarget?.proof_no || '—'
        }}</a-form-item>
        <a-form-item label="驳回原因" required>
          <a-textarea v-model="proofRejectForm.resolution" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="wecomVisible"
      title="企微自动建档"
      @ok="submitWecomIntake"
      @cancel="wecomVisible = false"
    >
      <a-form :model="wecomForm">
        <a-form-item label="企业主体 ID" required>
          <a-input v-model="wecomForm.corpId" :max-length="120" />
        </a-form-item>
        <a-form-item label="外部联系人标识" required>
          <a-input v-model="wecomForm.externalId" :max-length="255" />
        </a-form-item>
        <a-form-item label="客户昵称">
          <a-input v-model="wecomForm.displayName" :max-length="120" />
        </a-form-item>
        <a-form-item label="手机号">
          <a-input v-model="wecomForm.phone" :max-length="32" />
        </a-form-item>
        <a-typography-text type="secondary">
          同一「企业主体 +
          外部联系人标识」重复提交只返回既有档案，不会重复建档。
        </a-typography-text>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="ownerTransferVisible"
      title="转移客户归属"
      :ok-loading="ownerTransferSaving"
      @ok="submitOwnerTransfer"
      @cancel="ownerTransferVisible = false"
    >
      <a-form :model="ownerTransferForm">
        <a-form-item label="客户">
          <a-typography-text
            >{{ ownerTransferTarget?.display_name || '—' }}（#{{
              ownerTransferTarget?.id || '—'
            }}，当前归属客服
            {{
              ownerTransferTarget?.owner_admin_id || '无归属'
            }}）</a-typography-text
          >
        </a-form-item>
        <a-form-item label="目标客服" required>
          <a-select
            v-model="ownerTransferForm.targetAdminId"
            placeholder="选择目标客服"
          >
            <a-option
              v-for="admin in transferAdminOptions"
              :key="admin.admin_id"
              :value="admin.admin_id"
              >{{ admin.nickname || admin.username }}（{{
                optionPresenceLabel(admin.presence)
              }}）</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="转移原因" required>
          <a-textarea
            v-model="ownerTransferForm.reason"
            :max-length="200"
            show-word-limit
          />
        </a-form-item>
        <a-typography-text type="secondary">
          转移归属只追加交接留痕，历史跟进与订单归属不变；目标客服不能是当前归属人。
        </a-typography-text>
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
        <a-form-item label="客户">
          <a-typography-text>{{
            profileTarget?.display_name || '—'
          }}</a-typography-text>
        </a-form-item>
        <a-form-item label="商品" required>
          <SkuSelect
            v-model="backfillForm.skuId"
            placeholder="搜索商品名称或编码"
          />
        </a-form-item>
        <a-form-item label="数量" required>
          <a-input-number
            v-model="backfillForm.quantity"
            :min="1"
            :precision="0"
          />
        </a-form-item>
        <a-form-item label="实际成交单价（元，留空按 商品 价）">
          <a-input-number
            v-model="backfillForm.unitPriceYuan"
            :min="0"
            :precision="2"
            placeholder="留空按 商品 当前商品价"
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
  import { uuidV4 } from '@/utils/uuid';
  import { computed, onMounted, reactive, ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import yuanToCents from '@/utils/money';
  import { errorText } from '@/utils/error';
  import useUserStore from '@/store/modules/user';
  import {
    useWalletDisplay,
    rememberWalletDisplay,
  } from '../../wallet-display';
  import SkuSelect from '../../components/SkuSelect.vue';
  import {
    backfillOrder,
    createCustomer,
    createEsportsCustomerFollowUp,
    createEsportsScript,
    getEsportsCsWorkbench,
    getEsportsCustomerFollowUps,
    getEsportsCustomerProfile,
    getEsportsScripts,
    listCsPresences,
    listCustomers,
    listOfflinePaymentProofs,
    listOrders,
    listPriorityBookings,
    processPriorityBooking,
    rejectOfflinePaymentProof,
    setEsportsScriptStatus,
    transferCustomerOwner,
    updateEsportsCustomerProfile,
    updateEsportsScript,
    verifyOfflinePaymentProof,
    wecomIntakeCustomer,
  } from '../../api';
  import type {
    CsPresenceList,
    CsScript,
    CsWorkbench,
    CustomerFollowStatus,
    CustomerFollowUp,
    CustomerProfileSummary,
    EsportsCustomer,
    EsportsOrder,
    FollowChannel,
    OfflinePaymentProof,
    OfflinePaymentProofStatus,
    PriorityBooking,
  } from '../../api';

  const payChannelMap: Record<string, string> = {
    wechat_work: '企业微信收款',
    merchant_qr: '工作室商户码',
    corporate_transfer: '对公转账',
  };
  const payChannelText = (value?: string) =>
    (value && payChannelMap[value]) || value || '—';

  const { hasButtonPermission, hasAnyPermission } = usePermission();
  const userStore = useUserStore();
  const canManage = computed(() => hasButtonPermission('esports:cs:manage'));
  const isSuperAdmin = computed(() => userStore.isSuperAdmin);
  const currentAdminId = computed(() => Number(userStore.accountId || 0));
  // 权限码取 app.go 真实声明：这些码在权限树里是 PermAPI（类型 api），
  // 故与「客服工作台操作按钮」并集，避免非超管账号的按钮被误隐藏；后端仍兜底鉴权。
  const canTransferOwner = computed(
    () =>
      hasAnyPermission(['esports:customers:transfer_owner']) ||
      hasButtonPermission('esports:cs:manage')
  );
  const canProcessBooking = computed(
    () =>
      hasAnyPermission(['esports:members:priority_booking_process']) ||
      hasButtonPermission('esports:cs:manage')
  );
  // 补录复用「历史订单补录」PermAPI 码与「客服报单按钮」码。
  const canBackfill = computed(
    () =>
      hasAnyPermission(['esports:orders:backfill']) ||
      hasButtonPermission('esports:orders:add')
  );
  // 核销 / 驳回：与财务核销权限对齐，服务端仍是唯一防线。
  const canVerifyProof = computed(() =>
    hasButtonPermission('esports:payments:proof_verify')
  );
  const canRejectProof = computed(() =>
    hasButtonPermission('esports:payments:proof_reject')
  );

  const followOptions: { value: CustomerFollowStatus; label: string }[] = [
    { value: 'new', label: '新客户' },
    { value: 'following', label: '跟进中' },
    { value: 'pending', label: '待处理' },
    { value: 'dormant', label: '沉寂' },
    { value: 'closed', label: '已关闭' },
  ];
  const channelOptions: { value: FollowChannel; label: string }[] = [
    { value: 'pc', label: '电脑工作台' },
    { value: 'wecom', label: '企微侧边栏' },
    { value: 'mobile', label: '移动客服端' },
    { value: 'phone', label: '电话' },
    { value: 'other', label: '其他' },
  ];
  const sourceMap: Record<string, string> = {
    manual: '手动建档',
    wecom: '企微自动',
    self: '客户自助',
    import: '批量导入',
  };
  const followLabel = (value: CustomerFollowStatus) =>
    followOptions.find((option) => option.value === value)?.label || value;
  const channelLabel = (value: FollowChannel) =>
    channelOptions.find((option) => option.value === value)?.label || value;
  const sourceLabel = (value: string) => sourceMap[value] || value;
  // 金额分转元展示。
  const moneyText = (cents: number | undefined) =>
    `${((cents || 0) / 100).toFixed(2)} 元`;
  const pad = (value: number) => String(value).padStart(2, '0');
  const fmtMinute = (value: string | null | undefined) => {
    if (!value) return '-';
    const d = new Date(value);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  // ── 工作台 ──
  const loading = ref(false);
  const workbench = ref<CsWorkbench | null>(null);
  // 订单池用 tabs 切换，默认停在待派单。
  const activePoolKey = ref('pending_dispatch');
  // 客户名：由看板一次性带出（customer_id → 显示名）；脱敏订单 id 为 0，显示 '-'。
  const customerNameOf = (customerId: number) =>
    workbench.value?.order_pool?.customer_names?.[String(customerId)] ||
    (customerId > 0 ? `#${customerId}` : '-');
  const performanceRow = computed(() => {
    const rows = (workbench.value?.performance?.rows || []) as {
      order_count: number;
      revenue_cents: number;
      refund_cents: number;
      net_cents: number;
      commission_cents: number;
    }[];
    return (
      rows[0] || {
        order_count: 0,
        revenue_cents: 0,
        refund_cents: 0,
        net_cents: 0,
        commission_cents: 0,
      }
    );
  });
  const pools = computed(() => {
    const board = workbench.value?.order_pool;
    if (!board) return [];
    return [
      {
        key: 'pending_dispatch',
        title: '待派单',
        rows: board.pending_dispatch,
      },
      { key: 'grabbing', title: '抢单中', rows: board.grabbing },
      {
        key: 'pending_acceptance',
        title: '待接单',
        rows: board.pending_acceptance,
      },
      {
        key: 'pending_customer_confirm',
        title: '待客户确认',
        rows: board.pending_customer_confirm,
      },
      { key: 'in_service', title: '服务中', rows: board.in_service },
      { key: 'pending_close', title: '待结单', rows: board.pending_close },
    ];
  });

  async function loadWorkbench() {
    loading.value = true;
    try {
      workbench.value = (await getEsportsCsWorkbench()).data.data || null;
    } catch (err) {
      Message.error(errorText(err, '加载客服工作台失败'));
    } finally {
      loading.value = false;
    }
  }

  // ── 会员优先预约处理──
  const bookingLoading = ref(false);
  const bookings = ref<PriorityBooking[]>([]);

  async function loadBookings() {
    bookingLoading.value = true;
    try {
      bookings.value = (await listPriorityBookings()).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载会员优先预约失败'));
    } finally {
      bookingLoading.value = false;
    }
  }

  // 处理结果只能置为 processed（已处理）或 cancelled（已取消），其余取值后端拒绝。
  async function processBooking(
    record: PriorityBooking,
    status: 'processed' | 'cancelled'
  ) {
    try {
      await processPriorityBooking(record.id, { status });
      Message.success(
        status === 'processed' ? '已标记为已处理' : '已取消该预约意向'
      );
      await loadBookings();
      await loadWorkbench();
    } catch (err) {
      Message.error(
        errorText(err, '处理失败：该预约意向已处理或已取消，请刷新后重试')
      );
    }
  }

  // ── 对账 / 到账核销：工作台内直接查待核验凭证并核销 / 驳回 ──
  const proofLoading = ref(false);
  const proofs = ref<OfflinePaymentProof[]>([]);
  // 订单号筛选（可选）：管理端统一按订单号定位订单，留空不过滤。
  const proofOrderNo = ref('');
  const proofStatus = ref<OfflinePaymentProofStatus>('pending_verification');
  const proofRejectVisible = ref(false);
  const proofRejectTarget = ref<OfflinePaymentProof | null>(null);
  const proofRejectForm = reactive({ resolution: '' });
  const proofStatusMap: Record<OfflinePaymentProofStatus, string> = {
    pending_verification: '待核验',
    verified: '已核销',
    rejected: '已驳回',
  };
  const proofStatusLabel = (value: OfflinePaymentProofStatus) =>
    proofStatusMap[value] || value;
  const proofStatusColor = (value: OfflinePaymentProofStatus) => {
    switch (value) {
      case 'verified':
        return 'green';
      case 'rejected':
        return 'red';
      default:
        return 'orange';
    }
  };

  async function loadProofs() {
    proofLoading.value = true;
    try {
      proofs.value =
        (
          await listOfflinePaymentProofs({
            status: proofStatus.value,
            order_no: proofOrderNo.value.trim() || undefined,
          })
        ).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载到账凭证失败'));
    } finally {
      proofLoading.value = false;
    }
  }

  async function verifyProof(record: OfflinePaymentProof) {
    try {
      await verifyOfflinePaymentProof(record.id);
      Message.success('已核销，订单进入待派单');
      await loadProofs();
      await loadWorkbench();
    } catch (err) {
      Message.error(
        errorText(err, '核销失败：提交人不得自审或订单已不满足核销条件')
      );
    }
  }

  function openProofReject(record: OfflinePaymentProof) {
    proofRejectTarget.value = record;
    proofRejectForm.resolution = '';
    proofRejectVisible.value = true;
  }

  async function submitProofReject() {
    const record = proofRejectTarget.value;
    if (!record) return;
    if (!proofRejectForm.resolution.trim()) {
      Message.warning('请填写驳回原因');
      return;
    }
    try {
      await rejectOfflinePaymentProof(
        record.id,
        proofRejectForm.resolution.trim()
      );
      proofRejectVisible.value = false;
      Message.success('已驳回到账凭证');
      await loadProofs();
    } catch (err) {
      Message.error(errorText(err, '驳回失败：状态已变化'));
    }
  }

  // ── 我的客户 ──
  const customerLoading = ref(false);
  const customers = ref<EsportsCustomer[]>([]);
  const newCustomerName = ref('');

  async function loadCustomers() {
    customerLoading.value = true;
    try {
      customers.value = (await listCustomers()).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载客户失败'));
    } finally {
      customerLoading.value = false;
    }
  }

  async function submitCustomer() {
    try {
      await createCustomer(newCustomerName.value);
      newCustomerName.value = '';
      Message.success('已创建客户');
      await loadCustomers();
    } catch (err) {
      Message.error(errorText(err, '创建客户失败'));
    }
  }

  // ── 客户档案与跟进 ──
  const profileVisible = ref(false);
  const profileSaving = ref(false);
  const profileTarget = ref<EsportsCustomer | null>(null);
  const { displayName, amountText: walletAmount } = useWalletDisplay();
  const profile = ref<CustomerProfileSummary | null>(null);
  watch(
    () => profile.value?.balance_display,
    (display) => {
      rememberWalletDisplay('customer_balance', display);
    }
  );
  const followUps = ref<CustomerFollowUp[]>([]);
  // 历史订单明细：按客户过滤，逐单套用「负责 OR 协作」可见性边界。
  const profileOrders = ref<EsportsOrder[]>([]);
  const profileOrderLoading = ref(false);
  const followSaving = ref(false);
  const profileForm = reactive({
    phone: '',
    birthday: '',
    preference: '',
    tags: [] as string[],
    followStatus: 'new' as CustomerFollowStatus,
    selfOrderEnabled: false,
  });
  const followForm = reactive({
    summary: '',
    channel: 'pc' as FollowChannel,
    nextFollowAt: '',
  });

  async function loadFollowUps(customerId: number) {
    followUps.value =
      (await getEsportsCustomerFollowUps(customerId)).data.data || [];
  }

  // 档案内的历史订单明细：复用订单列表接口的 customer_id 过滤，后端按可见性收敛。
  async function loadProfileOrders(customerId: number) {
    profileOrderLoading.value = true;
    try {
      const result = await listOrders({
        customer_id: customerId,
        page: 1,
        page_size: 20,
      });
      profileOrders.value = result.data.data?.items || [];
    } catch (err) {
      profileOrders.value = [];
      Message.error(errorText(err, '加载客户历史订单失败'));
    } finally {
      profileOrderLoading.value = false;
    }
  }

  async function openProfile(customer: EsportsCustomer) {
    profileTarget.value = customer;
    profileVisible.value = true;
    profile.value = null;
    followUps.value = [];
    profileOrders.value = [];
    try {
      const detail = (await getEsportsCustomerProfile(customer.id)).data.data;
      profile.value = detail;
      profileForm.phone = detail.customer.phone;
      profileForm.birthday = detail.customer.birthday || '';
      profileForm.preference = detail.customer.consumption_preference;
      profileForm.tags = detail.customer.tags || [];
      profileForm.followStatus = detail.customer.follow_status;
      profileForm.selfOrderEnabled = detail.customer.self_order_enabled;
      await Promise.all([
        loadFollowUps(customer.id),
        loadProfileOrders(customer.id),
      ]);
    } catch (err) {
      Message.error(errorText(err, '加载客户档案失败'));
    }
  }

  async function submitProfile() {
    if (!profileTarget.value) return;
    profileSaving.value = true;
    try {
      await updateEsportsCustomerProfile(profileTarget.value.id, {
        phone: profileForm.phone,
        birthday: profileForm.birthday,
        consumption_preference: profileForm.preference,
        tags: profileForm.tags,
        follow_status: profileForm.followStatus,
        self_order_enabled: profileForm.selfOrderEnabled,
      });
      Message.success('档案已保存');
      await loadCustomers();
    } catch (err) {
      Message.error(errorText(err, '保存档案失败'));
    } finally {
      profileSaving.value = false;
    }
  }

  async function submitFollowUp() {
    if (!profileTarget.value) return;
    followSaving.value = true;
    try {
      await createEsportsCustomerFollowUp(profileTarget.value.id, {
        summary: followForm.summary,
        channel: followForm.channel,
        next_follow_at: followForm.nextFollowAt || undefined,
      });
      followForm.summary = '';
      Message.success('已记录跟进');
      await loadFollowUps(profileTarget.value.id);
      await loadCustomers();
    } catch (err) {
      Message.error(errorText(err, '记录跟进失败'));
    } finally {
      followSaving.value = false;
    }
  }

  // ── 历史订单补录──
  // 数据边界（P0-13）：超管可为任意客户补录；非超管只能补录本人负责客户的订单。
  const backfillVisible = ref(false);
  const backfillSubmitting = ref(false);
  const backfillForm = reactive<{
    skuId: number;
    quantity: number;
    unitPriceYuan?: number;
    settledAt: string;
    fulfillmentStatus: 'completed' | 'cancelled';
    reason: string;
    countCsCommission: boolean;
  }>({
    skuId: 0,
    quantity: 1,
    settledAt: '',
    fulfillmentStatus: 'completed',
    reason: '',
    countCsCommission: false,
  });
  const backfillAllowed = computed(
    () =>
      isSuperAdmin.value ||
      (currentAdminId.value > 0 &&
        profileTarget.value?.owner_admin_id === currentAdminId.value)
  );
  const backfillHint = computed(() => {
    if (isSuperAdmin.value) {
      return '超管身份：可为任意客户补录历史订单（责任客服仍记客户归属人，业绩与提成不会错记到补录人名下）。';
    }
    if (backfillAllowed.value) {
      return '非超管：只能为本人负责的客户补录历史订单。';
    }
    return '该客户不归你负责：非超管不能为其补录，请由客户归属客服或超管操作。';
  });

  function openBackfill() {
    if (!backfillAllowed.value) {
      Message.warning('非超管只能为本人负责的客户补录历史订单');
      return;
    }
    backfillForm.skuId = 0;
    backfillForm.quantity = 1;
    backfillForm.unitPriceYuan = undefined;
    backfillForm.settledAt = '';
    backfillForm.fulfillmentStatus = 'completed';
    backfillForm.reason = '';
    backfillForm.countCsCommission = false;
    backfillVisible.value = true;
  }

  async function submitBackfill() {
    const customer = profileTarget.value;
    if (!customer) return;
    if (!Number.isSafeInteger(backfillForm.skuId) || backfillForm.skuId <= 0) {
      Message.warning('请选择商品');
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
    backfillSubmitting.value = true;
    try {
      await backfillOrder(
        {
          customer_id: customer.id,
          product_id: backfillForm.skuId,
          quantity: backfillForm.quantity,
          unit_price_cents:
            backfillForm.unitPriceYuan == null
              ? 0
              : yuanToCents(backfillForm.unitPriceYuan),
          settled_at: new Date(backfillForm.settledAt).toISOString(),
          fulfillment_status: backfillForm.fulfillmentStatus,
          payment_status: 'paid',
          reason,
          count_cs_commission:
            backfillForm.fulfillmentStatus === 'completed' &&
            backfillForm.countCsCommission,
        },
        uuidV4()
      );
      backfillVisible.value = false;
      Message.success('补录成功');
      await loadProfileOrders(customer.id);
      await loadWorkbench();
    } catch (err) {
      Message.error(
        errorText(err, '补录失败：补录原因、成交时间或客户归属不满足要求')
      );
    } finally {
      backfillSubmitting.value = false;
    }
  }

  // ── 客户归属转移──
  // 客服清单复用排单看板口径（listCsPresences 返回 admins），无需另建管理员查询接口。
  const presenceAdmins = ref<CsPresenceList | null>(null);
  const ownerTransferVisible = ref(false);
  const ownerTransferSaving = ref(false);
  const ownerTransferTarget = ref<EsportsCustomer | null>(null);
  const ownerTransferForm = reactive<{
    targetAdminId?: number;
    reason: string;
  }>({ reason: '' });
  const optionPresenceLabel = (presence: string | undefined) => {
    switch (presence) {
      case 'online':
        return '在线';
      case 'busy':
        return '忙碌';
      default:
        return '离线';
    }
  };
  const transferAdminOptions = computed(() =>
    (presenceAdmins.value?.admins || []).filter(
      (admin) => admin.admin_id !== ownerTransferTarget.value?.owner_admin_id
    )
  );

  async function loadPresenceAdmins() {
    try {
      presenceAdmins.value = (await listCsPresences()).data.data || null;
    } catch (err) {
      Message.error(errorText(err, '加载客服清单失败'));
    }
  }

  async function openOwnerTransfer(customer: EsportsCustomer) {
    ownerTransferTarget.value = customer;
    ownerTransferForm.targetAdminId = undefined;
    ownerTransferForm.reason = '';
    ownerTransferVisible.value = true;
    if (!presenceAdmins.value) await loadPresenceAdmins();
  }

  async function submitOwnerTransfer() {
    const customer = ownerTransferTarget.value;
    if (!customer) return;
    if (!ownerTransferForm.targetAdminId) {
      Message.warning('请选择目标客服');
      return;
    }
    if (!ownerTransferForm.reason.trim()) {
      Message.warning('请填写转移原因');
      return;
    }
    ownerTransferSaving.value = true;
    try {
      await transferCustomerOwner(
        customer.id,
        ownerTransferForm.targetAdminId,
        ownerTransferForm.reason.trim()
      );
      ownerTransferVisible.value = false;
      Message.success('客户归属已转移');
      await loadCustomers();
      await loadWorkbench();
      if (profileTarget.value?.id === customer.id) {
        const detail = (await getEsportsCustomerProfile(customer.id)).data.data;
        if (detail) profile.value = detail;
      }
    } catch (err) {
      Message.error(
        errorText(err, '转移失败：目标客服已是归属人或归属已被他人变更')
      );
    } finally {
      ownerTransferSaving.value = false;
    }
  }

  // ── 话术库 ──
  const scriptLoading = ref(false);
  const scripts = ref<CsScript[]>([]);
  const scriptCategory = ref('');
  const scriptVisible = ref(false);
  const scriptTarget = ref<CsScript | null>(null);
  const scriptForm = reactive({
    title: '',
    category: '',
    content: '',
    sortOrder: 0,
  });

  async function loadScripts() {
    scriptLoading.value = true;
    try {
      scripts.value =
        (await getEsportsScripts({ category: scriptCategory.value })).data
          .data || [];
    } catch (err) {
      Message.error(errorText(err, '加载话术失败'));
    } finally {
      scriptLoading.value = false;
    }
  }

  function openScript(target?: CsScript) {
    scriptTarget.value = target || null;
    scriptForm.title = target?.title || '';
    scriptForm.category = target?.category || '';
    scriptForm.content = target?.content || '';
    scriptForm.sortOrder = target?.sort_order || 0;
    scriptVisible.value = true;
  }

  async function submitScript() {
    const payload = {
      title: scriptForm.title,
      category: scriptForm.category,
      content: scriptForm.content,
      sort_order: scriptForm.sortOrder,
    };
    try {
      if (scriptTarget.value) {
        await updateEsportsScript(scriptTarget.value.id, {
          ...payload,
          status: scriptTarget.value.status,
          expected_version: scriptTarget.value.version,
        });
      } else {
        await createEsportsScript(payload);
      }
      scriptVisible.value = false;
      Message.success('话术已保存');
      await loadScripts();
    } catch (err) {
      Message.error(errorText(err, '保存话术失败'));
    }
  }

  async function toggleScript(target: CsScript) {
    const next = target.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      await setEsportsScriptStatus(target.id, next, target.version);
      Message.success('状态已更新');
      await loadScripts();
    } catch (err) {
      Message.error(errorText(err, '更新话术状态失败'));
    }
  }

  // ── 企微自动建档 ──
  const wecomVisible = ref(false);
  const wecomForm = reactive({
    corpId: '',
    externalId: '',
    displayName: '',
    phone: '',
  });

  function openWecomIntake() {
    wecomForm.corpId = '';
    wecomForm.externalId = '';
    wecomForm.displayName = '';
    wecomForm.phone = '';
    wecomVisible.value = true;
  }

  async function submitWecomIntake() {
    try {
      const result = (
        await wecomIntakeCustomer({
          corp_id: wecomForm.corpId,
          external_id: wecomForm.externalId,
          display_name: wecomForm.displayName,
          phone: wecomForm.phone,
        })
      ).data.data;
      wecomVisible.value = false;
      Message.success(result?.created ? '已自动建档' : '已返回既有档案');
      await loadWorkbench();
      await loadCustomers();
    } catch (err) {
      Message.error(errorText(err, '企微建档失败'));
    }
  }

  onMounted(async () => {
    await loadWorkbench();
    await Promise.all([
      loadCustomers(),
      loadScripts(),
      loadProofs(),
      loadBookings(),
    ]);
  });
</script>

<style scoped>
  .toolbar {
    margin-bottom: 12px;
  }

  .summary {
    margin-bottom: 12px;
  }

  .sub-card {
    margin-bottom: 16px;
  }

  .order-tip {
    display: block;
    margin-bottom: 8px;
  }
</style>
