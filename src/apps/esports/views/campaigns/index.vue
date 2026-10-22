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
          <a-table-column title="奖励账户">
            <template #cell="{ record }">{{
              targetAccountLabel(record.target_account_type)
            }}</template>
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
        <a-form-item label="类型" required>
          <a-select v-model="form.activityType">
            <a-option value="full_gift">满赠</a-option>
            <a-option value="ladder">阶梯</a-option>
            <a-option value="limited">限时</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="奖励发放账户"
          tooltip="猫粮奖励只能发给陪玩受众；客户余额活动不接受陪玩受众。"
          required
        >
          <a-select
            v-model="form.targetAccountType"
            @change="onTargetAccountChange"
          >
            <a-option value="customer_balance">客户余额</a-option>
            <a-option value="player_catfood">陪玩猫粮</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="阶梯档位" required>
          <div class="tier-editor">
            <table class="tier-table">
              <thead>
                <tr>
                  <th scope="col">充值门槛（元）</th>
                  <th scope="col">赠送金额（元）</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(tier, index) in form.tiers" :key="index">
                  <td>
                    <a-input-number
                      v-model="tier.thresholdYuan"
                      class="tier-input"
                      :min="0"
                      :precision="2"
                    />
                  </td>
                  <td>
                    <a-input-number
                      v-model="tier.bonusYuan"
                      class="tier-input"
                      :min="0"
                      :precision="2"
                    />
                  </td>
                  <td>
                    <a-button
                      type="text"
                      status="danger"
                      :disabled="form.tiers.length <= 1"
                      @click="removeTier(index)"
                      >删除</a-button
                    >
                  </td>
                </tr>
              </tbody>
            </table>
            <a-button type="dashed" long class="tier-add" @click="addTier"
              >添加档位</a-button
            >
          </div>
        </a-form-item>
        <a-form-item label="叠加规则" required>
          <a-select v-model="form.stackRule">
            <a-option value="stack">可叠加</a-option>
            <a-option value="exclusive">互斥</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="适用客户" required>
          <a-select v-model="form.audience" @change="onAudienceChange">
            <a-option value="all">全部客户</a-option>
            <a-option value="new_customer">新客</a-option>
            <a-option value="specified">指定客户</a-option>
            <a-option value="player">指定陪玩（猫粮奖励）</a-option>
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
        <a-form-item
          v-if="form.audience === 'player'"
          label="指定陪玩 ID"
          required
        >
          <a-input-tag
            v-model="form.audiencePlayerIds"
            placeholder="输入陪玩档案 ID，回车添加"
            allow-clear
          />
        </a-form-item>
        <a-form-item
          label="赠送有效期"
          tooltip="单位：天。0 或留空表示赠送永久有效，不会被到期作废。"
        >
          <a-input-number v-model="form.bonusValidDays" :min="0" />
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

  // 奖励目标账户（§11.2-01）与陪玩受众在 app.go / 后端 campaignInput 已支持，
  // api.ts 的 RechargeCampaign / CampaignInput 尚未声明这两个字段（本轮不改 api.ts），
  // 因此按扩展交集类型读取，提交时单独带上。
  type CampaignExt = RechargeCampaign & {
    target_account_type?: 'customer_balance' | 'player_catfood';
    audience_player_ids?: number[];
  };
  type CampaignTargetAccount = 'customer_balance' | 'player_catfood';
  type CampaignAudienceExt = CampaignAudience | 'player';

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
    player: '指定陪玩',
  };
  const targetAccountMap: Record<string, string> = {
    customer_balance: '客户余额',
    player_catfood: '陪玩猫粮',
  };
  const targetAccountLabel = (value?: string) =>
    (value && targetAccountMap[value]) || targetAccountMap.customer_balance;
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
    const playerIds = (record as CampaignExt).audience_player_ids || [];
    if ((record.audience as string) === 'player' && playerIds.length)
      return `${label}（${playerIds.join('、')}）`;
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
    activityType: CampaignActivityType;
    tiers: CampaignTierForm[];
    stackRule: CampaignStackRule;
    audience: CampaignAudienceExt;
    audienceCustomerIds: string[];
    audiencePlayerIds: string[];
    targetAccountType: CampaignTargetAccount;
    bonusValidDays: number;
    startsAt?: number;
    endsAt?: number;
  }>({
    name: '',
    activityType: 'full_gift',
    tiers: [{ thresholdYuan: 0, bonusYuan: 0 }],
    stackRule: 'exclusive',
    audience: 'all',
    audienceCustomerIds: [],
    audiencePlayerIds: [],
    targetAccountType: 'customer_balance',
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

  // 账户类型与受众互斥约束（后端 validateCampaignInput）：猫粮只能发陪玩，
  // 客户余额活动不接受陪玩受众；切换时任一侧自动纠正，避免提交后才 400。
  function onTargetAccountChange() {
    if (form.targetAccountType === 'player_catfood') {
      if (form.audience !== 'player' && form.audience !== 'all')
        form.audience = 'player';
    } else if (form.audience === 'player') {
      form.audience = 'all';
    }
  }

  function onAudienceChange() {
    if (form.audience === 'player') {
      form.targetAccountType = 'player_catfood';
    } else if (form.targetAccountType === 'player_catfood') {
      form.targetAccountType = 'customer_balance';
    }
  }

  function openCreate() {
    formTarget.value = null;
    form.name = '';
    form.activityType = 'full_gift';
    form.tiers = [{ thresholdYuan: 0, bonusYuan: 0 }];
    form.stackRule = 'exclusive';
    form.audience = 'all';
    form.audienceCustomerIds = [];
    form.audiencePlayerIds = [];
    form.targetAccountType = 'customer_balance';
    form.bonusValidDays = 0;
    form.startsAt = undefined;
    form.endsAt = undefined;
    formVisible.value = true;
  }

  function openEdit(record: RechargeCampaign) {
    const ext = record as CampaignExt;
    formTarget.value = record;
    form.name = record.name;
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
    form.audiencePlayerIds = (ext.audience_player_ids || []).map((id) =>
      String(id)
    );
    form.targetAccountType =
      ext.target_account_type === 'player_catfood'
        ? 'player_catfood'
        : 'customer_balance';
    form.bonusValidDays = record.bonus_valid_days;
    form.startsAt = record.starts_at
      ? new Date(record.starts_at).getTime()
      : undefined;
    form.endsAt = record.ends_at
      ? new Date(record.ends_at).getTime()
      : undefined;
    formVisible.value = true;
  }

  function buildInput():
    | (Omit<CampaignInput, 'code'> & {
        audience_player_ids: number[];
        target_account_type: CampaignTargetAccount;
      })
    | null {
    const name = form.name.trim();
    if (!name) {
      Message.warning('请填写名称');
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
    if (form.audience === 'player' && !form.audiencePlayerIds.length) {
      Message.warning('请填写指定陪玩 ID');
      return null;
    }
    // 与后端同一套自洽校验：猫粮奖励只能配陪玩 / 全部受众，客户余额不接受陪玩受众。
    if (form.targetAccountType === 'player_catfood') {
      if (form.audience !== 'player' && form.audience !== 'all') {
        Message.warning(
          '陪玩猫粮奖励只能发给陪玩受众（含「指定陪玩」或「全部」）'
        );
        return null;
      }
    } else if (form.audience === 'player') {
      Message.warning('客户余额活动不接受陪玩受众，请改选「陪玩猫粮」账户');
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
      name,
      activity_type: form.activityType,
      tiers,
      // 受众取值为 api.ts 的 CampaignAudience 之外新增的 player，故此处显式断言；
      // 后端 campaignInput.Audience 已接受 player（§11.2-01）。
      audience: form.audience as CampaignAudience,
      audience_customer_ids:
        form.audience === 'specified'
          ? form.audienceCustomerIds
              .map((id) => Number(id))
              .filter((id) => id > 0)
          : [],
      audience_player_ids:
        form.audience === 'player'
          ? form.audiencePlayerIds
              .map((id) => Number(id))
              .filter((id) => id > 0)
          : [],
      target_account_type: form.targetAccountType,
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
      Message.error(errorText(err, '提交失败：版本已变化或参数无效'));
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

  .tier-editor {
    width: 100%;
    min-width: 0;
  }

  .tier-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }

  .tier-table th,
  .tier-table td {
    padding: 8px;
    border: 1px solid var(--color-border-2);
  }

  .tier-table th {
    font-weight: 500;
    text-align: left;
    background: var(--color-fill-2);
  }

  .tier-table th:last-child {
    width: 72px;
  }

  .tier-input {
    width: 100%;
  }

  .tier-add {
    margin-top: 8px;
  }
</style>
