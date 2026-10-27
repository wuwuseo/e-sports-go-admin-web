<template>
  <div class="container page-container">
    <a-card class="general-card" title="实名认证">
      <a-space class="toolbar" wrap>
        <a-select
          v-model="filters.subjectType"
          placeholder="主体类型"
          allow-clear
          style="width: 140px"
        >
          <a-option value="customer">客户</a-option>
          <a-option value="player">陪玩</a-option>
        </a-select>
        <a-select
          v-model="filters.status"
          placeholder="状态"
          allow-clear
          style="width: 140px"
        >
          <a-option value="pending">待审核</a-option>
          <a-option value="verified">已通过</a-option>
          <a-option value="rejected">已驳回</a-option>
          <a-option value="expired">已失效</a-option>
        </a-select>
        <a-select
          v-model="filters.channel"
          placeholder="渠道"
          allow-clear
          style="width: 160px"
        >
          <a-option
            v-for="item in CHANNELS"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </a-option>
        </a-select>
        <a-button type="primary" :loading="loading" @click="load"
          >查询</a-button
        >
        <a-button v-if="canSubmit" @click="openSubmit">代提交实名</a-button>
      </a-space>
      <a-typography-text type="secondary" class="tip">
        客户与陪玩共用一张实名档案：同一主体重复提交会被拒绝（409），驳回或失效后可重新提交；
        证件号仅保存脱敏值（保留前 6 位与后 4 位），本页不回显原始号码。
        第三方渠道的待审记录超时后由定时任务置为「已失效」，人工审核渠道不超时。
      </a-typography-text>
      <a-table
        :data="records"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column title="主体" :width="200">
            <template #cell="{ record }">
              <a-space>
                <a-tag
                  :color="
                    record.subject_type === 'player' ? 'arcoblue' : 'green'
                  "
                >
                  {{ subjectTypeLabel(record.subject_type) }}
                </a-tag>
                <span>{{ record.subject_name }}</span>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column title="实名信息" :width="220">
            <template #cell="{ record }">
              {{ record.real_name }} · {{ record.id_number_masked }}
            </template>
          </a-table-column>
          <a-table-column title="渠道 / 方式" :width="180">
            <template #cell="{ record }">
              {{ channelLabel(record.channel) }} ·
              {{ methodLabel(record.method) }}
            </template>
          </a-table-column>
          <a-table-column title="状态" :width="110">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)">{{
                statusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="提交人" :width="120">
            <template #cell="{ record }">
              {{
                record.requested_by ? `管理员 #${record.requested_by}` : '本人'
              }}
            </template>
          </a-table-column>
          <a-table-column
            data-index="updated_at"
            title="更新时间"
            :width="180"
          />
          <a-table-column title="操作" :width="180">
            <template #cell="{ record }">
              <a-button type="text" @click="openDetail(record)">详情</a-button>
              <a-button
                v-if="canReview && record.status === 'pending'"
                type="text"
                @click="openReview(record)"
              >
                审核
              </a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-drawer v-model:visible="detailVisible" title="实名档案详情" :width="520">
      <template v-if="detail">
        <a-descriptions :column="1" bordered size="medium">
          <a-descriptions-item label="主体">
            {{ subjectTypeLabel(detail.subject_type) }} ·
            {{ detail.subject_name }}（#{{ detail.subject_id }}）
          </a-descriptions-item>
          <a-descriptions-item label="真实姓名">{{
            detail.real_name
          }}</a-descriptions-item>
          <a-descriptions-item label="证件号">{{
            detail.id_number_masked
          }}</a-descriptions-item>
          <a-descriptions-item label="渠道 / 方式">
            {{ channelLabel(detail.channel) }} ·
            {{ methodLabel(detail.method) }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="statusColor(detail.status)">{{
              statusLabel(detail.status)
            }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="未通过原因">{{
            detail.fail_reason || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="渠道流水号">{{
            detail.provider_ref || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="通过时间">{{
            detail.verified_at || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="提交人">
            {{
              detail.requested_by ? `管理员 #${detail.requested_by}` : '本人'
            }}
          </a-descriptions-item>
        </a-descriptions>

        <a-divider>最近核验流水</a-divider>
        <a-table
          :data="detail.attempts"
          row-key="id"
          :pagination="false"
          size="small"
        >
          <template #columns>
            <a-table-column data-index="created_at" title="时间" :width="170" />
            <a-table-column title="渠道" :width="110">
              <template #cell="{ record }">{{
                channelLabel(record.channel)
              }}</template>
            </a-table-column>
            <a-table-column title="结果" :width="90">
              <template #cell="{ record }">{{
                attemptLabel(record.status)
              }}</template>
            </a-table-column>
            <a-table-column title="说明">
              <template #cell="{ record }">{{
                record.fail_reason || '—'
              }}</template>
            </a-table-column>
          </template>
        </a-table>
      </template>
    </a-drawer>

    <a-modal
      v-model:visible="reviewVisible"
      title="审核实名"
      @ok="submitReview"
    >
      <a-form :model="reviewForm">
        <a-form-item label="结论" required>
          <a-radio-group v-model="reviewForm.approved">
            <a-radio :value="true">通过</a-radio>
            <a-radio :value="false">驳回</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="!reviewForm.approved" label="驳回原因" required>
          <a-textarea
            v-model="reviewForm.rejectReason"
            :max-length="255"
            placeholder="如：姓名与证件号不一致 / 证件照片模糊"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="submitVisible"
      title="代提交实名"
      @ok="submitByAdmin"
    >
      <a-form :model="submitForm">
        <a-form-item label="主体类型" required>
          <a-radio-group v-model="submitForm.subject_type">
            <a-radio value="customer">客户</a-radio>
            <a-radio value="player">陪玩</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="主体 ID" required>
          <a-input-number
            v-model="submitForm.subject_id"
            :min="1"
            placeholder="客户 / 陪玩档案 ID"
          />
        </a-form-item>
        <a-form-item label="真实姓名" required>
          <a-input
            v-model="submitForm.real_name"
            placeholder="与身份证一致的姓名"
          />
        </a-form-item>
        <a-form-item label="身份证号" required>
          <a-input
            v-model="submitForm.id_number"
            placeholder="15 位或 18 位身份证号"
          />
        </a-form-item>
        <a-form-item label="渠道">
          <a-select v-model="submitForm.channel" style="width: 100%">
            <a-option
              v-for="item in CHANNELS"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-typography-text type="secondary" class="tip">
          渠道与方式缺省为「人工审核」：线下收取证件后在此登记，提交后在该主体的档案上继续审核即可。
          证件号仅保存脱敏值，原始号码不落库。
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
    getRealName,
    listRealNames,
    reviewRealName,
    submitRealNameByAdmin,
  } from '../../api';
  import type {
    RealNameChannel,
    RealNameDetail,
    RealNameListParams,
    RealNameRecord,
    RealNameStatus,
    RealNameSubjectType,
  } from '../../api';

  const CHANNELS: { value: RealNameChannel; label: string }[] = [
    { value: 'manual', label: '人工审核' },
    { value: 'third_party', label: '第三方核验' },
    { value: 'wechat', label: '微信' },
    { value: 'alipay', label: '支付宝' },
  ];

  const STATUS_LABELS: Record<RealNameStatus, string> = {
    pending: '待审核',
    verified: '已通过',
    rejected: '已驳回',
    expired: '已失效',
  };
  const ATTEMPT_LABELS: Record<string, string> = {
    pending: '待定',
    passed: '通过',
    failed: '失败',
    abandoned: '已放弃',
  };
  const METHOD_LABELS: Record<string, string> = {
    two_factor: '双要素',
    face: '人脸',
    manual: '人工',
  };

  const statusLabel = (value: RealNameStatus) => STATUS_LABELS[value] || value;
  const statusColor = (value: RealNameStatus) => {
    if (value === 'verified') return 'green';
    if (value === 'rejected') return 'red';
    if (value === 'pending') return 'orange';
    return 'gray';
  };
  const channelLabel = (value: string) =>
    CHANNELS.find((item) => item.value === value)?.label || value;
  const methodLabel = (value: string) => METHOD_LABELS[value] || value;
  const attemptLabel = (value: string) => ATTEMPT_LABELS[value] || value;
  const subjectTypeLabel = (value: string) =>
    value === 'player' ? '陪玩' : '客户';
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  const { hasButtonPermission } = usePermission();
  const canReview = computed(() =>
    hasButtonPermission('esports:realnames:review')
  );
  const canSubmit = computed(() =>
    hasButtonPermission('esports:realnames:submit')
  );

  const loading = ref(false);
  const records = ref<RealNameRecord[]>([]);
  const filters = reactive<{
    subjectType?: RealNameSubjectType;
    status?: RealNameStatus;
    channel?: RealNameChannel;
  }>({});

  const detailVisible = ref(false);
  const detail = ref<RealNameDetail | null>(null);

  const reviewVisible = ref(false);
  const reviewForm = reactive<{
    id: number;
    approved: boolean;
    rejectReason: string;
  }>({ id: 0, approved: true, rejectReason: '' });

  const submitVisible = ref(false);
  const submitForm = reactive({
    subject_type: 'customer' as RealNameSubjectType,
    subject_id: 0,
    real_name: '',
    id_number: '',
    channel: 'manual' as RealNameChannel,
  });

  async function load() {
    loading.value = true;
    try {
      const params: RealNameListParams = {};
      if (filters.subjectType) params.subject_type = filters.subjectType;
      if (filters.status) params.status = filters.status;
      if (filters.channel) params.channel = filters.channel;
      records.value = (await listRealNames(params)).data.data || [];
    } catch {
      Message.error('加载实名档案失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  async function openDetail(record: RealNameRecord) {
    try {
      detail.value = (await getRealName(record.id)).data.data;
      detailVisible.value = true;
    } catch (err) {
      Message.error(errorText(err, '加载详情失败'));
    }
  }

  function openReview(record: RealNameRecord) {
    reviewForm.id = record.id;
    reviewForm.approved = true;
    reviewForm.rejectReason = '';
    reviewVisible.value = true;
  }

  async function submitReview() {
    if (!reviewForm.approved && !reviewForm.rejectReason.trim()) {
      Message.warning('驳回须填写原因');
      return;
    }
    try {
      await reviewRealName(reviewForm.id, {
        approved: reviewForm.approved,
        reject_reason: reviewForm.approved
          ? ''
          : reviewForm.rejectReason.trim(),
      });
      reviewVisible.value = false;
      Message.success(reviewForm.approved ? '已通过实名' : '已驳回实名');
      await load();
    } catch (err) {
      Message.error(errorText(err, '审核失败，请刷新后重试'));
    }
  }

  function openSubmit() {
    submitForm.subject_type = 'customer';
    submitForm.subject_id = 0;
    submitForm.real_name = '';
    submitForm.id_number = '';
    submitForm.channel = 'manual';
    submitVisible.value = true;
  }

  async function submitByAdmin() {
    if (!submitForm.subject_id) {
      Message.warning('请填写主体 ID');
      return;
    }
    if (!submitForm.real_name.trim()) {
      Message.warning('请填写真实姓名');
      return;
    }
    if (!/^(\d{15}|\d{17}[\dXx])$/.test(submitForm.id_number.trim())) {
      Message.warning('请填写正确的身份证号');
      return;
    }
    try {
      await submitRealNameByAdmin({
        subject_type: submitForm.subject_type,
        subject_id: submitForm.subject_id,
        real_name: submitForm.real_name.trim(),
        id_number: submitForm.id_number.trim(),
        channel: submitForm.channel,
      });
      submitVisible.value = false;
      Message.success('已提交，等待审核');
      await load();
    } catch (err) {
      Message.error(errorText(err, '代提交失败，请确认主体是否存在'));
    }
  }

  onMounted(load);
</script>

<style scoped lang="less">
  .toolbar {
    margin-bottom: 12px;
  }

  .tip {
    display: block;
    margin-bottom: 12px;
  }
</style>
