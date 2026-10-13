<template>
  <div class="container page-container">
    <a-card class="general-card" title="充值活动">
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
        <a-button v-if="canManage" type="primary" @click="openCreate"
          >新建活动</a-button
        >
      </a-space>

      <a-table
        :data="items"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="name" title="名称" />
          <a-table-column data-index="code" title="编码" />
          <a-table-column title="类型">
            <template #cell="{ record }">{{
              activityLabel(record.activity_type)
            }}</template>
          </a-table-column>
          <a-table-column title="阶梯档位">
            <template #cell="{ record }">{{ tiersText(record) }}</template>
          </a-table-column>
          <a-table-column title="叠加规则">
            <template #cell="{ record }">{{
              stackLabel(record.stack_rule)
            }}</template>
          </a-table-column>
          <a-table-column title="适用客户">
            <template #cell="{ record }">{{ audienceText(record) }}</template>
          </a-table-column>
          <a-table-column title="活动期">
            <template #cell="{ record }">{{ periodText(record) }}</template>
          </a-table-column>
          <a-table-column title="赠送有效期">
            <template #cell="{ record }">{{
              bonusValidText(record.bonus_valid_days)
            }}</template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)">{{
                statusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column data-index="version" title="版本" :width="70" />
          <a-table-column title="操作" :width="220">
            <template #cell="{ record }">
              <template v-if="canManage && record.status !== 'ended'">
                <a-button
                  v-if="record.status === 'draft' || record.status === 'paused'"
                  type="text"
                  status="success"
                  @click="changeStatus(record, 'active')"
                  >启用</a-button
                >
                <a-button
                  v-if="record.status === 'active'"
                  type="text"
                  @click="changeStatus(record, 'paused')"
                  >暂停</a-button
                >
                <a-button
                  type="text"
                  status="danger"
                  @click="changeStatus(record, 'ended')"
                  >结束</a-button
                >
                <a-button type="text" @click="openEdit(record)">编辑</a-button>
              </template>
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="formVisible"
      :title="formTarget ? '编辑活动' : '新建活动'"
      :width="680"
      @ok="submitForm"
      @cancel="formVisible = false"
    >
      <a-form :model="form">
        <a-form-item label="名称" required>
          <a-input v-model="form.name" :max-length="120" />
        </a-form-item>
        <a-form-item label="编码" required>
          <a-input
            v-model="form.code"
            :max-length="48"
            :disabled="!!formTarget"
          />
        </a-form-item>
        <a-form-item label="类型" required>
          <a-select v-model="form.activityType">
            <a-option value="full_gift">满赠</a-option>
            <a-option value="ladder">阶梯</a-option>
            <a-option value="limited">限时</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="阶梯档位（元）" required>
          <div
            v-for="(tier, index) in form.tiers"
            :key="index"
            class="tier-row"
          >
            <a-input-number
              v-model="tier.thresholdYuan"
              :min="0"
              :precision="2"
              placeholder="门槛（满）"
            />
            <a-input-number
              v-model="tier.bonusYuan"
              :min="0"
              :precision="2"
              placeholder="赠送额"
            />
            <a-button
              type="text"
              status="danger"
              :disabled="form.tiers.length <= 1"
              @click="removeTier(index)"
              >删除</a-button
            >
          </div>
          <a-button type="dashed" long @click="addTier">添加档位</a-button>
        </a-form-item>
        <a-form-item label="叠加规则" required>
          <a-select v-model="form.stackRule">
            <a-option value="stack">可叠加</a-option>
            <a-option value="exclusive">互斥</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="适用客户" required>
          <a-select v-model="form.audience">
            <a-option value="all">全部客户</a-option>
            <a-option value="new_customer">新客</a-option>
            <a-option value="specified">指定客户</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="form.audience === 'specified'"
          label="指定客户 ID"
          required
        >
          <a-input-tag
            v-model="form.audienceCustomerIds"
            placeholder="输入客户档案 ID，回车添加"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="赠送有效期（天）">
          <a-input-number v-model="form.bonusValidDays" :min="0" />
          <div class="hint">0 或留空表示赠送永久有效，不会被到期作废</div>
        </a-form-item>
        <a-form-item label="活动开始时间" required>
          <a-date-picker
            v-model="form.startsAt"
            show-time
            format="YYYY-MM-DD HH:mm"
            value-format="timestamp"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="活动结束时间" required>
          <a-date-picker
            v-model="form.endsAt"
            show-time
            format="YYYY-MM-DD HH:mm"
            value-format="timestamp"
            style="width: 100%"
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
    createCampaign,
    listCampaigns,
    setCampaignStatus,
    updateCampaign,
  } from '../../api';
  import type {
    CampaignActivityType,
    CampaignAudience,
    CampaignInput,
    CampaignStackRule,
    CampaignStatus,
    RechargeCampaign,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canManage = computed(() =>
    hasButtonPermission('esports:campaigns:manage')
  );

  const loading = ref(false);
  const statusFilter = ref('');
  const items = ref<RechargeCampaign[]>([]);

  const statusOptions = [
    { value: 'draft', label: '草稿' },
    { value: 'active', label: '生效中' },
    { value: 'paused', label: '已暂停' },
    { value: 'ended', label: '已结束' },
  ];
  const statusMap: Record<string, string> = {
    draft: '草稿',
    active: '生效中',
    paused: '已暂停',
    ended: '已结束',
  };
  const statusColorMap: Record<string, string> = {
    draft: 'gray',
    active: 'green',
    paused: 'orange',
    ended: 'gray',
  };
  const activityMap: Record<string, string> = {
    full_gift: '满赠',
    ladder: '阶梯',
    limited: '限时',
  };
  const stackMap: Record<string, string> = {
    stack: '可叠加',
    exclusive: '互斥',
  };
  const audienceMap: Record<string, string> = {
    all: '全部客户',
    new_customer: '新客',
    specified: '指定客户',
  };
  const statusLabel = (value: string) => statusMap[value] || value;
  const statusColor = (value: string) => statusColorMap[value] || 'gray';
  const activityLabel = (value: string) => activityMap[value] || value;
  const stackLabel = (value: string) => stackMap[value] || value;
  const audienceLabel = (value: string) => audienceMap[value] || value;

  // 金额以「分」存储，展示时换算为「元」并去掉多余小数。
  const yuanText = (cents: number) => String(cents / 100);
  const pad = (value: number) => String(value).padStart(2, '0');
  // 本地时区展示到分钟。
  const fmtMinute = (value: string) => {
    if (!value) return '-';
    const d = new Date(value);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const tiersText = (record: RechargeCampaign) =>
    record.tiers.length
      ? record.tiers
          .map(
            (tier) =>
              `满${yuanText(tier.threshold_cents)}送${yuanText(
                tier.bonus_cents
              )}`
          )
          .join('、')
      : '-';
  const audienceText = (record: RechargeCampaign) => {
    const label = audienceLabel(record.audience);
    if (record.audience === 'specified' && record.audience_customer_ids.length)
      return `${label}（${record.audience_customer_ids.join('、')}）`;
    return label;
  };
  const periodText = (record: RechargeCampaign) =>
    `${fmtMinute(record.starts_at)} ~ ${fmtMinute(record.ends_at)}`;
  const bonusValidText = (days: number) => (days > 0 ? `${days} 天` : '永久');
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  interface CampaignTierForm {
    thresholdYuan: number;
    bonusYuan: number;
  }

  const formVisible = ref(false);
  const formTarget = ref<RechargeCampaign | null>(null);
  const form = reactive<{
    name: string;
    code: string;
    activityType: CampaignActivityType;
    tiers: CampaignTierForm[];
    stackRule: CampaignStackRule;
    audience: CampaignAudience;
    audienceCustomerIds: string[];
    bonusValidDays: number;
    startsAt?: number;
    endsAt?: number;
  }>({
    name: '',
    code: '',
    activityType: 'full_gift',
    tiers: [{ thresholdYuan: 0, bonusYuan: 0 }],
    stackRule: 'exclusive',
    audience: 'all',
    audienceCustomerIds: [],
    bonusValidDays: 0,
    startsAt: undefined,
    endsAt: undefined,
  });

  async function load() {
    loading.value = true;
    try {
      items.value = (await listCampaigns(statusFilter.value)).data.data || [];
    } catch {
      Message.error('加载充值活动失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  const addTier = () => form.tiers.push({ thresholdYuan: 0, bonusYuan: 0 });
  const removeTier = (index: number) => {
    if (form.tiers.length > 1) form.tiers.splice(index, 1);
  };

  function openCreate() {
    formTarget.value = null;
    form.name = '';
    form.code = '';
    form.activityType = 'full_gift';
    form.tiers = [{ thresholdYuan: 0, bonusYuan: 0 }];
    form.stackRule = 'exclusive';
    form.audience = 'all';
    form.audienceCustomerIds = [];
    form.bonusValidDays = 0;
    form.startsAt = undefined;
    form.endsAt = undefined;
    formVisible.value = true;
  }

  function openEdit(record: RechargeCampaign) {
    formTarget.value = record;
    form.name = record.name;
    form.code = record.code;
    form.activityType = record.activity_type;
    form.tiers = record.tiers.map((tier) => ({
      thresholdYuan: tier.threshold_cents / 100,
      bonusYuan: tier.bonus_cents / 100,
    }));
    form.stackRule = record.stack_rule;
    form.audience = record.audience;
    form.audienceCustomerIds = record.audience_customer_ids.map((id) =>
      String(id)
    );
    form.bonusValidDays = record.bonus_valid_days;
    form.startsAt = record.starts_at
      ? new Date(record.starts_at).getTime()
      : undefined;
    form.endsAt = record.ends_at
      ? new Date(record.ends_at).getTime()
      : undefined;
    formVisible.value = true;
  }

  function buildInput(): CampaignInput | null {
    const name = form.name.trim();
    const code = form.code.trim();
    if (!name || !code) {
      Message.warning('请填写名称与编码');
      return null;
    }
    if (!form.tiers.length) {
      Message.warning('至少需要一个阶梯档位');
      return null;
    }
    const tiers = form.tiers.map((tier) => ({
      threshold_cents: Math.round((tier.thresholdYuan || 0) * 100),
      bonus_cents: Math.round((tier.bonusYuan || 0) * 100),
    }));
    for (let i = 1; i < tiers.length; i += 1) {
      if (tiers[i].threshold_cents <= tiers[i - 1].threshold_cents) {
        Message.warning('阶梯门槛须严格递增');
        return null;
      }
    }
    if (form.audience === 'specified' && !form.audienceCustomerIds.length) {
      Message.warning('请填写指定客户 ID');
      return null;
    }
    if (!form.startsAt || !form.endsAt) {
      Message.warning('请填写活动开始与结束时间');
      return null;
    }
    if (form.endsAt <= form.startsAt) {
      Message.warning('结束时间须晚于开始时间');
      return null;
    }
    return {
      code,
      name,
      activity_type: form.activityType,
      tiers,
      audience: form.audience,
      audience_customer_ids:
        form.audience === 'specified'
          ? form.audienceCustomerIds
              .map((id) => Number(id))
              .filter((id) => id > 0)
          : [],
      stack_rule: form.stackRule,
      bonus_valid_days: form.bonusValidDays || 0,
      starts_at: new Date(form.startsAt).toISOString(),
      ends_at: new Date(form.endsAt).toISOString(),
    };
  }

  async function submitForm() {
    const input = buildInput();
    if (!input) return;
    const target = formTarget.value;
    try {
      if (target) {
        // 编码创建后不可变，编辑保持原值提交。
        await updateCampaign(target.id, {
          ...input,
          code: target.code,
          expected_version: target.version,
        });
      } else {
        await createCampaign(input);
      }
      formVisible.value = false;
      Message.success(target ? '已更新活动' : '已创建活动');
      await load();
    } catch (err) {
      Message.error(errorText(err, '提交失败：编码重复、版本已变化或参数无效'));
    }
  }

  async function changeStatus(
    record: RechargeCampaign,
    status: CampaignStatus
  ) {
    try {
      await setCampaignStatus(record.id, record.version, status);
      Message.success('已更新状态');
      await load();
    } catch (err) {
      Message.error(errorText(err, '状态更新失败：版本已变化或状态不允许'));
    }
  }

  onMounted(load);
</script>

<style scoped>
  .toolbar {
    margin-bottom: 16px;
  }

  .tier-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  .hint {
    margin-top: 4px;
    color: var(--color-text-3);
    font-size: 12px;
  }
</style>
