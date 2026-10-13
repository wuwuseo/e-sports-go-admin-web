<template>
  <div class="container page-container">
    <a-card class="general-card" title="钱包">
      <a-tabs v-model:active-key="activeTab" @change="onTabChange">
        <a-tab-pane key="customer_balance" title="客户余额" />
        <a-tab-pane key="player_catfood" title="陪玩猫粮" />
      </a-tabs>
      <a-space class="toolbar">
        <a-button :loading="loading" @click="load">刷新</a-button>
        <a-button v-if="canManage" type="primary" @click="openRecharge()"
          >为归属人充值</a-button
        >
      </a-space>

      <a-table
        :data="accounts"
        :loading="loading"
        row-key="owner_id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="owner_id" title="归属人 ID" />
          <a-table-column data-index="display_name" title="名称" />
          <a-table-column title="本金">
            <template #cell="{ record }">{{
              money(record.principal_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="赠送权益">
            <template #cell="{ record }">{{
              money(record.bonus_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="余额合计">
            <template #cell="{ record }">{{
              money(record.balance_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'active' ? 'green' : 'gray'">{{
                record.status === 'active' ? '正常' : '冻结'
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作">
            <template #cell="{ record }">
              <a-button type="text" @click="showTransactions(record)"
                >流水</a-button
              >
              <template v-if="canManage">
                <a-button type="text" @click="openRecharge(record)"
                  >充值</a-button
                >
                <a-button type="text" @click="openAdjust(record)"
                  >调整</a-button
                >
              </template>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="entryVisible"
      :title="entryMode === 'recharge' ? '充值 / 发放' : '余额调整'"
      @ok="submitEntry"
    >
      <a-form :model="entryForm">
        <a-form-item v-if="!entryTarget" label="归属人 ID" required>
          <a-input-number
            v-model="entryForm.ownerId"
            :min="1"
            :help="
              activeTab === 'player_catfood' ? '填陪玩档案 ID' : '填客户档案 ID'
            "
          />
        </a-form-item>
        <a-form-item v-else label="归属人">
          <a-input :model-value="entryTarget.display_name" disabled />
        </a-form-item>
        <a-form-item
          v-if="entryMode === 'recharge' && activeTab === 'customer_balance'"
          label="充值方式"
        >
          <a-radio-group v-model="rechargeMode">
            <a-radio value="manual">手动录入</a-radio>
            <a-radio value="campaign">按活动自动匹配</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="本金（元，调整可填负数）" required>
          <a-input-number v-model="entryForm.principalYuan" :precision="2" />
        </a-form-item>
        <a-form-item
          v-if="entryMode !== 'recharge' || rechargeMode === 'manual'"
          label="赠送权益（元，调整可填负数）"
        >
          <a-input-number v-model="entryForm.bonusYuan" :precision="2" />
        </a-form-item>
        <a-form-item v-else label="赠送权益">
          <div class="hint">
            赠送金额由后端按当前生效的充值活动自动匹配（阶梯取最高档、多活动按叠加规则）
          </div>
        </a-form-item>
        <a-form-item
          :label="entryMode === 'adjust' ? '调整原因（必填）' : '备注'"
          :required="entryMode === 'adjust'"
        >
          <a-textarea v-model="entryForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:visible="txVisible"
      :title="txTitle"
      width="620px"
      :footer="false"
    >
      <a-table
        :data="transactions"
        :loading="txLoading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="entry_type" title="类型" />
          <a-table-column title="本金变动">
            <template #cell="{ record }">{{
              signed(record.principal_delta_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="赠送变动">
            <template #cell="{ record }">{{
              signed(record.bonus_delta_cents)
            }}</template>
          </a-table-column>
          <a-table-column data-index="note" title="说明" />
          <a-table-column title="活动赠送" :width="200">
            <template #cell="{ record }">
              <div
                v-if="record.entry_type === 'recharge' && record.rule_snapshot"
              >
                <div>活动：{{ snapshotNames(record.rule_snapshot) }}</div>
                <div>赠送：{{ snapshotBonus(record.rule_snapshot) }}</div>
                <div>到期：{{ snapshotExpires(record.rule_snapshot) }}</div>
              </div>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column data-index="created_at" title="时间" />
        </template>
      </a-table>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    adjustWallet,
    listWalletTransactions,
    listWallets,
    rechargeWallet,
    rechargeWalletByCampaign,
  } from '../../api';
  import type { WalletAccount, WalletAccountType, WalletTx } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canManage = computed(() =>
    hasButtonPermission('esports:wallets:manage')
  );

  const activeTab = ref<WalletAccountType>('customer_balance');
  const loading = ref(false);
  const accounts = ref<WalletAccount[]>([]);
  const entryVisible = ref(false);
  const entryMode = ref<'recharge' | 'adjust'>('recharge');
  // 充值方式：手动录入（本金 + 赠送）或按活动自动匹配（仅客户余额支持）。
  const rechargeMode = ref<'manual' | 'campaign'>('manual');
  const entryTarget = ref<WalletAccount | null>(null);
  const entryForm = reactive({
    ownerId: 1,
    principalYuan: 0,
    bonusYuan: 0,
    note: '',
  });
  const txVisible = ref(false);
  const txLoading = ref(false);
  const transactions = ref<WalletTx[]>([]);
  const txTarget = ref<WalletAccount | null>(null);

  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  const signed = (cents: number) =>
    cents > 0 ? `+${money(cents)}` : money(cents);
  const txTitle = computed(() =>
    txTarget.value ? `${txTarget.value.display_name} 的流水` : '钱包流水'
  );
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };
  // 活动快照摘要（按活动充值的流水才有 rule_snapshot）。
  const snapshotNames = (snapshot: Record<string, unknown> | null) => {
    const campaigns = (snapshot?.campaigns || []) as { name?: string }[];
    return (
      campaigns
        .map((item) => item.name)
        .filter(Boolean)
        .join('、') || '-'
    );
  };
  const snapshotBonus = (snapshot: Record<string, unknown> | null) =>
    money(Number(snapshot?.total_bonus_cents) || 0);
  const snapshotExpires = (snapshot: Record<string, unknown> | null) =>
    snapshot?.bonus_expires_at ? String(snapshot.bonus_expires_at) : '永久';

  async function load() {
    loading.value = true;
    try {
      accounts.value = (await listWallets(activeTab.value)).data.data || [];
    } catch {
      Message.error('加载失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  // 切换页签时重置充值方式并加载（陪玩猫粮不支持充值活动）。
  function onTabChange() {
    rechargeMode.value = 'manual';
    load();
  }

  function openRecharge(record?: WalletAccount) {
    entryMode.value = 'recharge';
    rechargeMode.value = 'manual';
    entryTarget.value = record || null;
    entryForm.ownerId = record?.owner_id || 1;
    entryForm.principalYuan = 0;
    entryForm.bonusYuan = 0;
    entryForm.note = '';
    entryVisible.value = true;
  }

  function openAdjust(record: WalletAccount) {
    entryMode.value = 'adjust';
    entryTarget.value = record;
    entryForm.ownerId = record.owner_id;
    entryForm.principalYuan = 0;
    entryForm.bonusYuan = 0;
    entryForm.note = '';
    entryVisible.value = true;
  }

  async function submitEntry() {
    const ownerId = entryTarget.value?.owner_id || entryForm.ownerId;
    const principalCents = Math.round(entryForm.principalYuan * 100);
    const bonusCents = Math.round(entryForm.bonusYuan * 100);
    const note = entryForm.note.trim();
    if (!ownerId) {
      Message.warning('请填写归属人 ID');
      return;
    }
    // 按活动自动匹配：仅客户余额，只填本金，赠送由后端按活动规则计算。
    const useCampaign =
      entryMode.value === 'recharge' &&
      rechargeMode.value === 'campaign' &&
      activeTab.value === 'customer_balance';
    if (useCampaign) {
      if (principalCents <= 0) {
        Message.warning('请填写大于 0 的本金');
        return;
      }
      try {
        await rechargeWalletByCampaign(
          ownerId,
          { principal_cents: principalCents, note },
          crypto.randomUUID()
        );
        entryVisible.value = false;
        Message.success('已按活动入账');
        await load();
      } catch (err) {
        Message.error(errorText(err, '提交失败：请检查活动配置或账户状态'));
      }
      return;
    }
    const input = {
      principal_cents: principalCents,
      bonus_cents: bonusCents,
      note,
    };
    if (principalCents + bonusCents === 0) {
      Message.warning('本金与赠送不能同时为 0');
      return;
    }
    try {
      const key = crypto.randomUUID();
      if (entryMode.value === 'adjust') {
        await adjustWallet(activeTab.value, ownerId, input, key);
      } else {
        await rechargeWallet(activeTab.value, ownerId, input, key);
      }
      entryVisible.value = false;
      Message.success('已入账');
      await load();
    } catch {
      Message.error('提交失败：金额不合法、余额不足或重复提交');
    }
  }

  async function showTransactions(record: WalletAccount) {
    txTarget.value = record;
    txVisible.value = true;
    txLoading.value = true;
    try {
      transactions.value =
        (await listWalletTransactions(activeTab.value, record.owner_id)).data
          .data || [];
    } catch {
      Message.error('无法获取流水');
    } finally {
      txLoading.value = false;
    }
  }

  onMounted(load);
</script>

<style scoped>
  .toolbar {
    margin-bottom: 16px;
  }

  .hint {
    color: var(--color-text-3);
    font-size: 12px;
  }
</style>
