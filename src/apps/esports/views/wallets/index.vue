<template>
  <div class="container page-container">
    <a-card class="general-card" title="钱包">
      <a-tabs v-model:active-key="activeTab" @change="onTabChange">
        <a-tab-pane
          key="customer_balance"
          :title="displayTitle('customer_balance', '客户余额')"
        />
        <a-tab-pane
          key="player_catfood"
          :title="displayTitle('player_catfood', '陪玩猫粮')"
        />
        <a-tab-pane key="ledger_check" title="账本核验" />
      </a-tabs>

      <template v-if="activeTab !== 'ledger_check'">
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
            <a-table-column title="归属人">
              <template #cell="{ record }">
                <a-space>
                  <component
                    :is="walletIcon(displayOf(record)?.icon)"
                    v-if="walletIcon(displayOf(record)?.icon)"
                  />
                  <a-tooltip
                    v-if="displayOf(record)?.description"
                    :content="displayOf(record).description"
                  >
                    <span>{{ ownerName(record) }}</span>
                  </a-tooltip>
                  <span v-else>{{ ownerName(record) }}</span>
                </a-space>
              </template>
            </a-table-column>
            <a-table-column title="本金">
              <template #cell="{ record }">{{
                amountText(record.principal_cents, record)
              }}</template>
            </a-table-column>
            <a-table-column title="赠送权益">
              <template #cell="{ record }">{{
                amountText(record.bonus_cents, record)
              }}</template>
            </a-table-column>
            <a-table-column title="余额合计">
              <template #cell="{ record }">{{
                amountText(record.balance_cents, record)
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
                <a-button
                  v-if="
                    canRefundQuote && record.account_type === 'customer_balance'
                  "
                  type="text"
                  @click="openRefundQuote(record)"
                  >退款试算</a-button
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

        <div class="hint">
          「退款试算」按充值批次还原可退本金与作废赠送，只读不落库；按归属人（客户）试算，不是按流水。
        </div>
      </template>

      <template v-else>
        <div class="hint">
          批次分摊明细按「账户类型 +
          归属人」查询；对账异常来自账本核验任务写下的 ledger.reconcile_anomaly
          事件，逐条给出类型、账户与明细原因。
        </div>
        <a-space class="toolbar" wrap>
          <a-select
            v-model="ledgerAccountType"
            :style="{ width: '200px' }"
            placeholder="账户类型"
            @change="onLedgerTypeChange"
          >
            <a-option
              :label="displayTitle('customer_balance', '客户余额')"
              value="customer_balance"
            />
            <a-option
              :label="displayTitle('player_catfood', '陪玩猫粮')"
              value="player_catfood"
            />
          </a-select>
          <a-select
            v-model="ledgerAccountId"
            allow-search
            :filter-option="false"
            :loading="ledgerOwnerLoading"
            placeholder="搜索归属人姓名"
            :style="{ width: '240px' }"
            @search="onLedgerOwnerSearch"
            @change="onLedgerOwnerChange"
            @popup-visible-change="onLedgerOwnerPopup"
          >
            <a-option
              v-for="item in ledgerOwners"
              :key="item.id"
              :value="item.id"
              >{{ item.name }}</a-option
            >
          </a-select>
          <a-button
            v-if="canLedgerAllocations"
            :loading="ledgerAllocationsLoading"
            @click="loadLedgerAllocations"
            >查询分摊明细</a-button
          >
          <a-button
            v-if="canReconcileAnomalies"
            :loading="anomaliesLoading"
            @click="loadAnomalies"
            >刷新对账异常</a-button
          >
        </a-space>

        <a-divider>批次分摊明细</a-divider>
        <a-table
          :data="ledgerAllocations"
          :loading="ledgerAllocationsLoading"
          row-key="id"
          :pagination="false"
        >
          <template #columns>
            <a-table-column title="账户" :width="200">
              <template #cell="{ record }">
                {{ record.account_type }} / {{ record.account_id }}
              </template>
            </a-table-column>
            <a-table-column title="消费来源" :width="220">
              <template #cell="{ record }">
                {{ record.consume_source_type }} /
                {{ record.consume_source_id }}
              </template>
            </a-table-column>
            <a-table-column title="动用批次" :width="220">
              <template #cell="{ record }">
                {{ record.batch_source_type }} / {{ record.batch_source_id }}
              </template>
            </a-table-column>
            <a-table-column title="分摊金额">
              <template #cell="{ record }">{{
                money(record.amount_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="时间">
              <template #cell="{ record }">{{
                fmtTime(record.created_at)
              }}</template>
            </a-table-column>
          </template>
        </a-table>

        <a-divider>账本对账异常</a-divider>
        <div class="hint">
          最近 {{ anomalyEvents.length }} 轮核验，累计异常
          {{ anomalyTotal }} 条。
          逐账户余额为负、批次超分摊、分摊引用批次缺失、钱包流水求和与批次账本求和不一致、
          预付账户出账未登记批次都会出现于此。
        </div>
        <a-table
          :data="anomalyRows"
          :loading="anomaliesLoading"
          row-key="rowKey"
          :pagination="{ pageSize: 20 }"
        >
          <template #columns>
            <a-table-column title="发生时间" :width="180">
              <template #cell="{ record }">{{
                fmtTime(record.occurred_at)
              }}</template>
            </a-table-column>
            <a-table-column title="核验事件" :width="220">
              <template #cell="{ record }">{{ record.eventKey }}</template>
            </a-table-column>
            <a-table-column title="异常类型" :width="170">
              <template #cell="{ record }">
                <a-tooltip :content="record.rawKind">
                  <a-tag color="red">{{ record.kind }}</a-tag>
                </a-tooltip>
              </template>
            </a-table-column>
            <a-table-column title="账户" :width="220">
              <template #cell="{ record }">
                {{ record.accountType }} / {{ record.accountId }}
              </template>
            </a-table-column>
            <a-table-column title="明细原因">
              <template #cell="{ record }">{{ record.detail }}</template>
            </a-table-column>
          </template>
        </a-table>
      </template>
    </a-card>

    <a-modal
      v-model:visible="entryVisible"
      :title="entryMode === 'recharge' ? '充值 / 发放' : '余额调整'"
      @ok="submitEntry"
    >
      <a-form :model="entryForm">
        <a-form-item v-if="!entryTarget" label="归属人" required>
          <OwnerSelect
            v-model="entryForm.ownerId"
            :owner-type="ownerTypeOf(accountType)"
            :placeholder="
              activeTab === 'player_catfood'
                ? '搜索陪玩昵称'
                : '搜索客户姓名或手机号'
            "
            @select="onEntryOwnerSelect"
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
          <a-table-column title="类型">
            <template #cell="{ record }">{{
              entryTypeText(record.entry_type)
            }}</template>
          </a-table-column>
          <a-table-column title="本金变动">
            <template #cell="{ record }">{{
              signedByUnit(record.principal_delta_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="赠送变动">
            <template #cell="{ record }">{{
              signedByUnit(record.bonus_delta_cents)
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

      <a-divider>批次分摊明细</a-divider>
      <a-table
        :data="allocations"
        :loading="allocationsLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column title="消费来源">
            <template #cell="{ record }">
              {{ record.consume_source_type }} / {{ record.consume_source_id }}
            </template>
          </a-table-column>
          <a-table-column title="动用批次">
            <template #cell="{ record }">
              {{ record.batch_source_type }} / {{ record.batch_source_id }}
            </template>
          </a-table-column>
          <a-table-column title="分摊金额">
            <template #cell="{ record }">{{
              moneyByUnit(record.amount_cents)
            }}</template>
          </a-table-column>
        </template>
      </a-table>
    </a-drawer>

    <a-drawer
      v-model:visible="refundQuoteVisible"
      :title="refundQuoteTitle"
      width="720px"
      :footer="false"
    >
      <template v-if="refundQuote">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="账户类型">{{
            refundQuote.account_type
          }}</a-descriptions-item>
          <a-descriptions-item label="归属人">{{
            refundQuoteTarget?.display_name || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="可退本金">
            <strong>{{ money(refundQuote.refundable_principal_cents) }}</strong>
          </a-descriptions-item>
          <a-descriptions-item label="作废赠送">{{
            money(refundQuote.forfeited_bonus_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="批次剩余本金">{{
            money(refundQuote.batch_principal_remaining_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="批次剩余赠送">{{
            money(refundQuote.batch_bonus_remaining_cents)
          }}</a-descriptions-item>
          <a-descriptions-item label="试算口径" :span="2">
            {{ refundQuote.basis?.refund_rule || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="分摊口径" :span="2">
            {{ refundQuote.basis?.allocation_rule || '-' }}
          </a-descriptions-item>
        </a-descriptions>

        <a-divider>按批次明细</a-divider>
        <a-table
          :data="refundQuote.batches"
          :loading="refundQuoteLoading"
          row-key="batch_source_id"
          size="small"
          :pagination="false"
        >
          <template #columns>
            <a-table-column title="批次" :width="170">
              <template #cell="{ record }">
                {{ record.batch_source_type }} / {{ record.batch_source_id }}
              </template>
            </a-table-column>
            <a-table-column data-index="fund_batch" title="资金来源批次" />
            <a-table-column title="入账本金">
              <template #cell="{ record }">{{
                money(record.principal_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="入账赠送">
              <template #cell="{ record }">{{
                money(record.bonus_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="已分摊">
              <template #cell="{ record }">{{
                money(record.allocated_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="可退">
              <template #cell="{ record }">{{
                money(record.refundable_cents)
              }}</template>
            </a-table-column>
            <a-table-column title="标记" :width="100">
              <template #cell="{ record }">
                <a-tag v-if="record.over_allocated" color="red">分摊超额</a-tag>
                <a-tag v-else-if="record.bonus_expired" color="orange"
                  >赠送已过期</a-tag
                >
                <a-tag v-else-if="!record.split_known" color="orange"
                  >构成未知</a-tag
                >
                <a-tag v-else color="green">正常</a-tag>
              </template>
            </a-table-column>
          </template>
        </a-table>

        <template v-if="refundQuote.anomalies.length">
          <a-divider>批次异常</a-divider>
          <a-list size="small" :bordered="false">
            <a-list-item
              v-for="(item, index) in refundQuote.anomalies"
              :key="`${item.kind}-${index}`"
            >
              <a-tag color="red">{{ item.kind }}</a-tag>
              {{ item.account_type }}#{{ item.account_id }} · {{ item.detail }}
            </a-list-item>
          </a-list>
        </template>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
  import { walletUnitAmount, walletAmountText } from '@/utils/wallet-display';
  import { uuidV4 } from '@/utils/uuid';
  import {
    computed,
    markRaw,
    onBeforeUnmount,
    onMounted,
    reactive,
    ref,
    type Component,
  } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import { IconGift, IconSafe } from '@arco-design/web-vue/es/icon';
  import usePermission from '@/hooks/permission';
  import yuanToCents from '@/utils/money';
  import { errorText } from '@/utils/error';
  import {
    useWalletDisplay,
    refreshWalletDisplay,
    rememberWalletDisplay,
  } from '../../wallet-display';
  import OwnerSelect from '../../components/OwnerSelect.vue';
  import {
    adjustWallet,
    getWalletRefundQuote,
    listLedgerAllocations,
    listLedgerReconcileAnomalies,
    listWalletTransactions,
    listWallets,
    rechargeWallet,
    rechargeWalletByCampaign,
  } from '../../api';
  import type {
    LedgerAllocation,
    LedgerReconcileAnomaly,
    RechargeRefundQuote,
    WalletAccount,
    WalletAccountType,
    WalletTx,
  } from '../../api';

  const entryTypeMap: Record<string, string> = {
    recharge: '充值',
    consume: '消费核销',
    refund_return: '退款冲回',
    adjust: '调整',
    expire: '赠送过期',
    withdraw: '提现',
  };
  const entryTypeText = (value?: string) =>
    (value && entryTypeMap[value]) || value || '—';

  const { hasButtonPermission } = usePermission();
  // 权限码全部取自 app.go 的 PermAPI / PermButton 声明。
  const canManage = computed(() =>
    hasButtonPermission('esports:wallets:manage')
  );
  const canRefundQuote = computed(() =>
    hasButtonPermission('esports:wallets:refund_quote')
  );
  const canLedgerAllocations = computed(() =>
    hasButtonPermission('esports:wallets:ledger_allocations')
  );
  const canReconcileAnomalies = computed(() =>
    hasButtonPermission('esports:wallets:reconcile_anomalies')
  );

  // 展示口径统一读取带有效期的共享缓存。
  // 配置接口失败（无授权/网络）时回落硬编码文案，不影响页面可用。
  const { displays: displayConfig } = useWalletDisplay();
  const displayTitle = (accountType: WalletAccountType, fallback: string) =>
    displayConfig.value[accountType]?.display_name || fallback;

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

  const activeTab = ref<WalletAccountType | 'ledger_check'>('customer_balance');
  // 账本核验页签没有「账户类型」概念，接口调用回落到客户余额（该页签不会用到）。
  const accountType = computed<WalletAccountType>(() =>
    activeTab.value === 'ledger_check' ? 'customer_balance' : activeTab.value
  );
  const loading = ref(false);
  const accounts = ref<WalletAccount[]>([]);
  const entryVisible = ref(false);
  const entryMode = ref<'recharge' | 'adjust'>('recharge');
  // 充值方式：手动录入（本金 + 赠送）或按活动自动匹配（仅客户余额支持）。
  const rechargeMode = ref<'manual' | 'campaign'>('manual');
  const entryTarget = ref<WalletAccount | null>(null);
  const entryForm = reactive({
    ownerId: 0,
    principalYuan: 0,
    bonusYuan: 0,
    note: '',
  });
  // 新充值 / 调整时下拉选中的归属人姓名，用于确认文案，避免回显数字 ID。
  const entryOwnerName = ref('');
  const entryOwnerLabel = computed(
    () => entryTarget.value?.display_name || entryOwnerName.value || '该归属人'
  );
  const txVisible = ref(false);
  const txLoading = ref(false);
  const transactions = ref<WalletTx[]>([]);
  // 批次分摊明细：每笔消费动用了哪些充值 / 开卡批次。
  const allocations = ref<LedgerAllocation[]>([]);
  const allocationsLoading = ref(false);
  const txTarget = ref<WalletAccount | null>(null);

  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  const signed = (cents: number) =>
    cents > 0 ? `+${money(cents)}` : money(cents);
  // 归属人列展示实际姓名；账户名称仍是钱包展示口径（余额 / 猫粮），不再占用归属人列。
  const ownerName = (record: WalletAccount) =>
    record.display_name || '未命名归属人';
  // 钱包账户类型映射到归属人类型：客户余额归属客户、陪玩猫粮归属陪玩。
  const ownerTypeOf = (type: WalletAccountType): 'customer' | 'player' =>
    type === 'player_catfood' ? 'player' : 'customer';

  // 钱包展示图标映射：后端下发 icon 字符串，映射到 Arco 图标组件；映射不到只显示文字。
  const walletIconMap: Record<string, Component> = {
    wallet: markRaw(IconSafe),
    cat: markRaw(IconGift),
  };
  // 无 icon 字段时回落默认图标（wallet）；后端下发未知 icon 仍只显示文字。
  const walletIcon = (icon?: string): Component | null =>
    icon ? walletIconMap[icon] || null : walletIconMap.wallet;

  // 换算口径与服务端一致，截断到两位小数。
  const fmtByUnit = (cents: number, unitCents?: number) =>
    walletUnitAmount(cents, { unit_cents: unitCents });
  // 表格金额：有展示配置时按单位换算并拼单位名，缺失回落旧 ¥ 逻辑。
  const displayOf = (record: WalletAccount) =>
    displayConfig.value[record.account_type];
  const amountText = (cents: number, record: WalletAccount) =>
    walletAmountText(cents, displayOf(record));
  // 流水金额：按当前账户的展示单位换算，缺失回落 ¥ 逻辑。
  const unitName = () =>
    txTarget.value
      ? displayConfig.value[txTarget.value.account_type].unit_name
      : undefined;
  const moneyByUnit = (cents: number) => {
    const name = unitName();
    return name
      ? `${fmtByUnit(
          cents,
          txTarget.value
            ? displayConfig.value[txTarget.value.account_type].unit_cents
            : undefined
        )} ${name}`
      : money(cents);
  };
  const signedByUnit = (cents: number) => {
    const name = unitName();
    if (!name) return signed(cents);
    const text = `${fmtByUnit(
      cents,
      txTarget.value
        ? displayConfig.value[txTarget.value.account_type].unit_cents
        : undefined
    )} ${name}`;
    return cents > 0 ? `+${text}` : text;
  };
  const txTitle = computed(() =>
    txTarget.value ? `${txTarget.value.display_name} 的流水` : '钱包流水'
  );
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
      await refreshWalletDisplay();
      accounts.value = (await listWallets(accountType.value)).data.data || [];
      accounts.value.forEach((account) => {
        rememberWalletDisplay(account.account_type, account.display);
      });
    } catch {
      Message.error('加载失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  function onEntryOwnerSelect(option: { id: number; name: string } | null) {
    entryOwnerName.value = option?.name || '';
  }

  function openRecharge(record?: WalletAccount) {
    entryMode.value = 'recharge';
    rechargeMode.value = 'manual';
    entryTarget.value = record || null;
    entryForm.ownerId = record?.owner_id || 0;
    entryOwnerName.value = record?.display_name || '';
    entryForm.principalYuan = 0;
    entryForm.bonusYuan = 0;
    entryForm.note = '';
    entryVisible.value = true;
  }

  function openAdjust(record: WalletAccount) {
    entryMode.value = 'adjust';
    entryTarget.value = record;
    entryForm.ownerId = record.owner_id;
    entryOwnerName.value = record.display_name;
    entryForm.principalYuan = 0;
    entryForm.bonusYuan = 0;
    entryForm.note = '';
    entryVisible.value = true;
  }

  async function submitEntry() {
    const ownerId = entryTarget.value?.owner_id || entryForm.ownerId || 0;
    const principalCents = yuanToCents(entryForm.principalYuan);
    const bonusCents = yuanToCents(entryForm.bonusYuan);
    const note = entryForm.note.trim();
    if (ownerId <= 0) {
      Message.warning('请选择归属人');
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
      const ok = await confirmFundsAction(
        `确认按活动为归属人 ${entryOwnerLabel.value} 入账本金 ${money(
          principalCents
        )}？赠送由活动规则自动匹配。`,
        '按活动充值'
      );
      if (!ok) return;
      try {
        await rechargeWalletByCampaign(
          ownerId,
          { principal_cents: principalCents, note },
          uuidV4()
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
    const ok = await confirmFundsAction(
      `确认${entryMode.value === 'adjust' ? '调整' : '充值'}归属人 ${
        entryOwnerLabel.value
      }：本金 ${money(principalCents)}、赠送 ${money(bonusCents)}？${
        entryMode.value === 'adjust' ? '调整会直接改动余额，' : ''
      }操作以管理员身份执行并留痕。`,
      entryMode.value === 'adjust' ? '余额调整' : '钱包充值'
    );
    if (!ok) return;
    try {
      const key = uuidV4();
      if (entryMode.value === 'adjust') {
        await adjustWallet(accountType.value, ownerId, input, key);
      } else {
        await rechargeWallet(accountType.value, ownerId, input, key);
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
    allocationsLoading.value = true;
    try {
      transactions.value =
        (await listWalletTransactions(record.account_type, record.owner_id))
          .data.data || [];
    } catch {
      Message.error('无法获取流水');
    } finally {
      txLoading.value = false;
    }
    try {
      allocations.value =
        (
          await listLedgerAllocations(
            record.account_type,
            String(record.owner_id)
          )
        ).data.data || [];
    } catch {
      allocations.value = [];
    } finally {
      allocationsLoading.value = false;
    }
  }

  // ── 退款额度试算：按充值批次还原可退本金 / 作废赠送，纯只读 ──
  const refundQuoteVisible = ref(false);
  const refundQuoteLoading = ref(false);
  const refundQuote = ref<RechargeRefundQuote | null>(null);
  const refundQuoteTarget = ref<WalletAccount | null>(null);
  const refundQuoteTitle = computed(() =>
    refundQuoteTarget.value
      ? `退款试算 · ${refundQuoteTarget.value.display_name}`
      : '退款试算'
  );

  async function openRefundQuote(record: WalletAccount) {
    // 注意：入参是钱包归属人（客户）ID，不是流水 ID。
    refundQuoteTarget.value = record;
    refundQuote.value = null;
    refundQuoteVisible.value = true;
    refundQuoteLoading.value = true;
    try {
      refundQuote.value =
        (await getWalletRefundQuote(record.owner_id)).data.data || null;
    } catch (err) {
      Message.error(errorText(err, '退款试算失败'));
    } finally {
      refundQuoteLoading.value = false;
    }
  }

  // ── 账本核验（分摊明细 / 对账异常） ──
  const ledgerAccountType = ref<WalletAccountType>('customer_balance');
  // 未选择归属人时必须是 undefined：0 是合法 falsy 值，Arco select 会把它
  // 当成「已选中」渲染成显示文本「0」（归属人 ID 从 1 起，0 只作占位）。
  const ledgerAccountId = ref<number>();
  // 账本查询的归属人下拉取「钱包账户」口径：该接口权限（wallets:list）财务角色已有，
  // 不额外要求客户 / 陪玩列表权限；关键词按账户展示名远程匹配。
  interface LedgerOwnerOption {
    id: number;
    name: string;
  }
  const ledgerOwners = ref<LedgerOwnerOption[]>([]);
  const ledgerOwnerLoading = ref(false);
  const ledgerOwnerSelected = ref<LedgerOwnerOption | null>(null);
  let ledgerOwnerTimer: ReturnType<typeof setTimeout> | undefined;
  let ledgerOwnerToken = 0;

  async function loadLedgerOwners(keyword = '') {
    ledgerOwnerToken += 1;
    const token = ledgerOwnerToken;
    ledgerOwnerLoading.value = true;
    try {
      const rows =
        (await listWallets(ledgerAccountType.value, keyword)).data.data || [];
      if (token !== ledgerOwnerToken) return;
      const options = rows.map((item) => ({
        id: item.owner_id,
        name: item.display_name || '未命名归属人',
      }));
      const current = ledgerOwnerSelected.value;
      if (current && !options.some((item) => item.id === current.id)) {
        options.unshift(current);
      }
      ledgerOwners.value = options;
    } catch {
      if (token === ledgerOwnerToken) ledgerOwners.value = [];
    } finally {
      if (token === ledgerOwnerToken) ledgerOwnerLoading.value = false;
    }
  }

  function onLedgerOwnerSearch(keyword: string) {
    if (ledgerOwnerTimer) clearTimeout(ledgerOwnerTimer);
    ledgerOwnerTimer = setTimeout(() => loadLedgerOwners(keyword.trim()), 250);
  }

  function onLedgerOwnerChange(value: unknown) {
    const id = typeof value === 'number' ? value : 0;
    ledgerOwnerSelected.value =
      ledgerOwners.value.find((item) => item.id === id) || null;
  }

  function onLedgerOwnerPopup(visible: boolean) {
    // 每次展开重置为初始列表，避免上次搜索词把选项过滤得只剩几条。
    if (visible) loadLedgerOwners('');
  }

  function onLedgerTypeChange() {
    ledgerAccountId.value = undefined;
    ledgerOwnerSelected.value = null;
    ledgerOwners.value = [];
    loadLedgerOwners('');
  }

  const ledgerAllocations = ref<LedgerAllocation[]>([]);
  const ledgerAllocationsLoading = ref(false);
  const anomalyEvents = ref<LedgerReconcileAnomaly[]>([]);
  const anomaliesLoading = ref(false);
  const anomalyTotal = computed(() =>
    anomalyEvents.value.reduce((sum, item) => sum + item.anomaly_count, 0)
  );
  // 核验任务写下的异常类型中文标签（code 与后端 ledger_reconcile*.go 一致）。
  const anomalyKindText = (kind: string) =>
    ({
      account_negative_balance: '账户余额为负',
      allocation_batch_missing: '分摊引用批次缺失',
      batch_over_allocated: '批次超分摊',
      wallet_batch_sum_mismatch: '流水求和不一致',
      wallet_outflow_unbooked: '出账未登记批次',
    }[kind] || kind);
  // 把多轮核验事件里的异常摊平成一张表，便于逐条看类型 / 账户 / 明细原因。
  const anomalyRows = computed(() =>
    anomalyEvents.value.flatMap((event) =>
      event.anomalies.map((item, index) => ({
        rowKey: `${event.event_key}-${index}`,
        eventKey: event.event_key,
        occurredAt: event.occurred_at,
        kind: anomalyKindText(item.kind),
        rawKind: item.kind,
        accountType: item.account_type,
        accountId: item.account_id,
        detail: item.detail,
      }))
    )
  );

  async function loadLedgerAllocations() {
    if (!ledgerAccountId.value) {
      Message.warning('请选择归属人后再查询分摊明细');
      return;
    }
    ledgerAllocationsLoading.value = true;
    try {
      ledgerAllocations.value =
        (
          await listLedgerAllocations(
            ledgerAccountType.value,
            String(ledgerAccountId.value)
          )
        ).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载批次分摊明细失败'));
    } finally {
      ledgerAllocationsLoading.value = false;
    }
  }

  async function loadAnomalies() {
    anomaliesLoading.value = true;
    try {
      anomalyEvents.value =
        (await listLedgerReconcileAnomalies(20)).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载账本对账异常失败'));
    } finally {
      anomaliesLoading.value = false;
    }
  }

  // 账本核验页签不加载钱包列表：只有余额 / 猫粮页签才拉账户。
  function onTabChange() {
    rechargeMode.value = 'manual';
    if (activeTab.value === 'ledger_check') {
      if (anomalyEvents.value.length === 0) loadAnomalies();
      if (ledgerOwners.value.length === 0) loadLedgerOwners('');
      return;
    }
    load();
  }

  const fmtTime = (value: string | null | undefined) => {
    if (!value) return '-';
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  onMounted(() => {
    load();
  });

  onBeforeUnmount(() => {
    if (ledgerOwnerTimer) clearTimeout(ledgerOwnerTimer);
  });
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
