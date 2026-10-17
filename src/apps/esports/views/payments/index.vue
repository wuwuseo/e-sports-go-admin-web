<template>
  <div class="container">
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
                v-if="canManage"
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
        <a-button type="primary" @click="openAccountCreate"
          >提交收款账户</a-button
        >
      </a-space>
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
                v-if="record.status === 'pending_review' && canManage"
                type="text"
                @click="openAccountReview(record)"
                >审核</a-button
              >
              <a-button
                v-else-if="record.status === 'active' && canManage"
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

    <a-card class="general-card" title="待核验收款（§4.2 财务核验前不派单）">
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
        <a-button type="primary" @click="openProofCreate"
          >提交到账凭证</a-button
        >
      </a-space>
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
          <a-table-column title="操作" :width="170">
            <template #cell="{ record }">
              <template v-if="record.status === 'pending_verification'">
                <a-button type="text" @click="verifyProof(record)"
                  >核销</a-button
                >
                <a-button
                  type="text"
                  status="danger"
                  @click="openProofReject(record)"
                  >驳回</a-button
                >
              </template>
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
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
      v-model:visible="proofRejectVisible"
      title="驳回到账凭证"
      @ok="submitProofReject"
      @cancel="proofRejectVisible = false"
    >
      <a-form :model="proofRejectForm">
        <a-form-item label="驳回原因" required>
          <a-textarea
            v-model="proofRejectForm.resolution"
            :max-length="255"
            :auto-size="{ minRows: 2 }"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    createPaymentAccount,
    disablePaymentAccount,
    fetchReadiness,
    listOfflinePaymentProofs,
    listPaymentAccounts,
    listPaymentChannels,
    rejectOfflinePaymentProof,
    reviewPaymentAccount,
    setPaymentChannelStatus,
    submitOfflinePaymentProof,
    verifyOfflinePaymentProof,
  } from '../../api';
  import type {
    OfflinePaymentProof,
    OfflinePaymentProofStatus,
    PaymentAccount,
    PaymentAccountStatus,
    PaymentChannel,
    PaymentChannelView,
    ReadinessReport,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canManage = computed(() =>
    hasButtonPermission('esports:payments:manage')
  );

  const yuan = (value: number) => `¥${(value / 100).toFixed(2)}`;
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

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
    try {
      await setPaymentChannelStatus(record.channel, !record.enabled);
      Message.success(record.enabled ? '已停用该收款方式' : '已启用该收款方式');
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
      Message.error(errorText(err, '提交失败：主体/账号重复或参数无效'));
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
      Message.error(errorText(err, '审核失败：提交人不得自审或状态已变化'));
    }
  }

  async function disableAccount(record: PaymentAccount) {
    try {
      await disablePaymentAccount(record.id);
      Message.success('已停用该收款账户');
      await loadAccounts();
      await loadChannels();
    } catch (err) {
      Message.error(errorText(err, '停用失败，请刷新后重试'));
    }
  }

  // ── 待核验收款 ──
  const proofs = ref<OfflinePaymentProof[]>([]);
  const proofsLoading = ref(false);
  const proofFilterStatus = ref<OfflinePaymentProofStatus>();

  async function loadProofs() {
    proofsLoading.value = true;
    try {
      proofs.value =
        (await listOfflinePaymentProofs({ status: proofFilterStatus.value }))
          .data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载待核验收款失败'));
    } finally {
      proofsLoading.value = false;
    }
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
    try {
      await verifyOfflinePaymentProof(record.id);
      Message.success('已核销，订单进入待派单');
      await loadProofs();
    } catch (err) {
      Message.error(
        errorText(err, '核销失败：提交人不得自审或订单已不满足核销条件')
      );
    }
  }

  const proofRejectVisible = ref(false);
  const proofRejectTarget = ref<OfflinePaymentProof | null>(null);
  const proofRejectForm = reactive({ resolution: '' });

  function openProofReject(record: OfflinePaymentProof) {
    proofRejectTarget.value = record;
    proofRejectForm.resolution = '';
    proofRejectVisible.value = true;
  }

  async function submitProofReject() {
    const target = proofRejectTarget.value;
    if (!target) return;
    if (!proofRejectForm.resolution.trim()) {
      Message.warning('驳回必须填写原因');
      return;
    }
    try {
      await rejectOfflinePaymentProof(
        target.id,
        proofRejectForm.resolution.trim()
      );
      proofRejectVisible.value = false;
      Message.success('已驳回');
      await loadProofs();
    } catch (err) {
      Message.error(errorText(err, '驳回失败：提交人不得自审或状态已变化'));
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

  .readiness-banner {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }

  .readiness-banner .muted {
    color: var(--color-text-3);
    font-size: 12px;
  }

  .hint {
    margin-bottom: 12px;
    color: var(--color-text-3);
    font-size: 12px;
  }
</style>
