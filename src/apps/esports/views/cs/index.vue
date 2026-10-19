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

          <a-table
            v-for="pool in pools"
            :key="pool.key"
            :data="pool.rows"
            row-key="id"
            :pagination="{ pageSize: 5 }"
            :title="pool.title"
            class="sub-card"
          >
            <template #columns>
              <a-table-column data-index="order_no" title="订单号" />
              <a-table-column data-index="customer_id" title="客户 ID" />
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

          <a-table
            :data="workbench?.order_pool?.public_pool || []"
            row-key="id"
            :pagination="{ pageSize: 5 }"
            title="公共池（脱敏摘要）"
            class="sub-card"
          >
            <template #columns>
              <a-table-column data-index="order_no" title="订单号" />
              <a-table-column
                data-index="fulfillment_status"
                title="履约状态"
              />
            </template>
          </a-table>

          <a-divider>对账 / 到账核销（§4.2 / §4.3）</a-divider>
          <a-space class="toolbar" wrap>
            <a-input-number
              v-model="proofOrderId"
              :min="0"
              placeholder="订单 ID（可选）"
              :style="{ width: '160px' }"
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
            :data="proofs"
            :loading="proofLoading"
            row-key="id"
            :pagination="{ pageSize: 5 }"
            class="sub-card"
          >
            <template #columns>
              <a-table-column data-index="proof_no" title="凭证号" />
              <a-table-column title="关联订单">
                <template #cell="{ record }">#{{ record.order_id }}</template>
              </a-table-column>
              <a-table-column data-index="channel" title="渠道" />
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
              <a-table-column title="操作" :width="90">
                <template #cell="{ record }">
                  <a-button type="text" @click="openProfile(record)"
                    >档案</a-button
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
          <a-descriptions-item label="当前余额">{{
            moneyText(profile.balance_cents)
          }}</a-descriptions-item>
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
        <a-typography-text type="secondary" class="order-tip">
          仅展示当前账号可见的订单（负责或已授权协作），越权订单不会出现在此明细中。
        </a-typography-text>
        <a-table
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
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    createCustomer,
    createEsportsCustomerFollowUp,
    createEsportsScript,
    getEsportsCsWorkbench,
    getEsportsCustomerFollowUps,
    getEsportsCustomerProfile,
    getEsportsScripts,
    listCustomers,
    listOfflinePaymentProofs,
    listOrders,
    rejectOfflinePaymentProof,
    setEsportsScriptStatus,
    updateEsportsCustomerProfile,
    updateEsportsScript,
    verifyOfflinePaymentProof,
    wecomIntakeCustomer,
  } from '../../api';
  import type {
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
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canManage = computed(() => hasButtonPermission('esports:cs:manage'));
  // 核销 / 驳回（§4.3-04）：与财务核销权限对齐，服务端仍是唯一防线。
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
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  // ── 工作台 ──
  const loading = ref(false);
  const workbench = ref<CsWorkbench | null>(null);
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

  // ── 对账 / 到账核销（§4.2 / §4.3）：工作台内直接查待核验凭证并核销 / 驳回 ──
  const proofLoading = ref(false);
  const proofs = ref<OfflinePaymentProof[]>([]);
  const proofOrderId = ref(0);
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
            order_id: proofOrderId.value > 0 ? proofOrderId.value : undefined,
          })
        ).data.data || [];
      if (!proofs.value.length) {
        Message.info('没有符合条件的到账凭证');
      }
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
  const profile = ref<CustomerProfileSummary | null>(null);
  const followUps = ref<CustomerFollowUp[]>([]);
  // 历史订单明细（§8.2-02）：按客户过滤，逐单套用「负责 OR 协作」可见性边界。
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
    await Promise.all([loadCustomers(), loadScripts(), loadProofs()]);
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
