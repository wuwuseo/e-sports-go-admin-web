<template>
  <div class="container page-container">
    <a-card class="general-card" title="等级配置">
      <a-space class="toolbar">
        <a-button :loading="loading" @click="load">刷新</a-button>
        <a-button v-if="canManage" type="primary" @click="openCreate"
          >新建等级</a-button
        >
      </a-space>

      <a-table
        :data="items"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="code" title="编码" />
          <a-table-column data-index="name" title="名称" />
          <a-table-column title="成长值门槛">
            <template #cell="{ record }">{{
              thresholdText(record.growth_threshold)
            }}</template>
          </a-table-column>
          <a-table-column title="折扣">
            <template #cell="{ record }">{{
              discountText(record.discount_bps)
            }}</template>
          </a-table-column>
          <a-table-column title="会员订单优先">
            <template #cell="{ record }">{{
              priorityText(record.priority_dispatch)
            }}</template>
          </a-table-column>
          <a-table-column title="储值卡赠送比例">
            <template #cell="{ record }">{{
              percentText(record.prepay_bonus_bps)
            }}</template>
          </a-table-column>
          <a-table-column data-index="sort_order" title="排序" :width="70" />
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'enabled' ? 'green' : 'gray'">{{
                statusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column data-index="version" title="版本" :width="70" />
          <a-table-column title="操作" :width="180">
            <template #cell="{ record }">
              <template v-if="canManage">
                <a-button type="text" @click="openEdit(record)">编辑</a-button>
                <a-button
                  type="text"
                  :status="record.status === 'enabled' ? 'danger' : 'success'"
                  @click="changeStatus(record)"
                  >{{ record.status === 'enabled' ? '停用' : '启用' }}</a-button
                >
              </template>
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="客户会员">
      <a-space class="toolbar">
        <a-input-number
          v-model="customerId"
          :min="1"
          placeholder="客户 ID"
          :style="{ width: '160px' }"
        />
        <a-button type="primary" :loading="memberLoading" @click="queryMember"
          >查询</a-button
        >
        <a-button
          v-if="canManage && member"
          type="outline"
          @click="openLevelAdjust"
          >手动调级</a-button
        >
      </a-space>

      <template v-if="member">
        <a-space class="summary" size="large" wrap>
          <span
            >当前等级：{{ member.level_name }}（{{ member.level_code }}）</span
          >
          <span>折扣：{{ discountText(member.discount_bps) }}</span>
          <span>累计成长值：{{ member.growth_total }}</span>
          <span>待降级：{{ pendingText(member) }}</span>
        </a-space>

        <a-card title="成长值流水" :bordered="true" class="sub-card">
          <a-table
            :data="member.ledger"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column title="变动">
                <template #cell="{ record }">{{
                  signed(record.delta)
                }}</template>
              </a-table-column>
              <a-table-column title="来源类型">
                <template #cell="{ record }">{{
                  sourceLabel(record.source_type)
                }}</template>
              </a-table-column>
              <a-table-column data-index="source_id" title="来源单号">
                <template #cell="{ record }">{{
                  record.source_id || '-'
                }}</template>
              </a-table-column>
              <a-table-column data-index="note" title="备注">
                <template #cell="{ record }">{{ record.note || '-' }}</template>
              </a-table-column>
              <a-table-column title="时间">
                <template #cell="{ record }">{{
                  fmtMinute(record.created_at)
                }}</template>
              </a-table-column>
            </template>
          </a-table>
        </a-card>

        <a-card title="手动调级记录" :bordered="true" class="sub-card">
          <a-table
            :data="member.overrides"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="level_code" title="等级" />
              <a-table-column data-index="reason" title="原因" />
              <a-table-column title="操作人">
                <template #cell="{ record }">{{
                  record.operator_id ?? '-'
                }}</template>
              </a-table-column>
              <a-table-column title="时间">
                <template #cell="{ record }">{{
                  fmtMinute(record.created_at)
                }}</template>
              </a-table-column>
            </template>
          </a-table>
        </a-card>
      </template>
    </a-card>

    <a-modal
      v-model:visible="formVisible"
      :title="formTarget ? '编辑等级' : '新建等级'"
      :width="680"
      @ok="submitForm"
      @cancel="formVisible = false"
    >
      <a-form :model="form">
        <a-form-item label="编码" required>
          <a-input
            v-model="form.code"
            :max-length="48"
            :disabled="!!formTarget"
          />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model="form.name" :max-length="120" />
        </a-form-item>
        <a-form-item label="成长值门槛（元）" required>
          <a-input-number v-model="form.growthYuan" :min="0" :precision="2" />
          <div class="hint">按累计消费金额计，消费 1 元计 1 元成长值</div>
        </a-form-item>
        <a-form-item label="折扣（折）" required>
          <a-input-number
            v-model="form.discountZhe"
            :min="0"
            :max="10"
            :precision="2"
          />
          <div class="hint">如 9.5 表示 9.5 折；填 10 表示原价不打折</div>
        </a-form-item>
        <a-form-item label="会员订单优先">
          <a-switch v-model="form.priorityDispatch" />
        </a-form-item>
        <a-form-item label="储值卡赠送比例（%）">
          <a-input-number
            v-model="form.prepayBonusPercent"
            :min="0"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="form.sortOrder" :min="0" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="levelVisible"
      title="手动调级"
      @ok="submitLevelAdjust"
      @cancel="levelVisible = false"
    >
      <a-form :model="levelForm">
        <a-form-item label="目标等级" required>
          <a-select v-model="levelForm.levelCode" placeholder="选择等级">
            <a-option
              v-for="level in items"
              :key="level.code"
              :value="level.code"
              >{{ level.name }}（{{ level.code }}）</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="调级原因" required>
          <a-textarea v-model="levelForm.reason" :max-length="255" />
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
    createMemberLevel,
    getCustomerMember,
    listMemberLevels,
    setCustomerMemberLevel,
    setMemberLevelStatus,
    updateMemberLevel,
  } from '../../api';
  import type {
    CustomerMemberDetail,
    MemberLevel,
    MemberLevelInput,
    MemberGrowthSourceType,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canManage = computed(() =>
    hasButtonPermission('esports:members:manage')
  );

  // ── 等级配置 ──
  const loading = ref(false);
  const items = ref<MemberLevel[]>([]);

  const statusMap: Record<string, string> = {
    enabled: '启用',
    disabled: '停用',
  };
  const sourceMap: Record<MemberGrowthSourceType, string> = {
    order: '结单计提',
    after_sale: '售后退款冲回',
    manual: '手动调整',
    gift: '礼物打赏',
  };
  const statusLabel = (value: string) => statusMap[value] || value;
  const sourceLabel = (value: MemberGrowthSourceType) =>
    sourceMap[value] || value;
  const priorityText = (value: boolean) => (value ? '是' : '否');
  // 成长值门槛与金额同单位（分），展示时换算为「元」。
  const thresholdText = (value: number) => `${value / 100} 元`;
  // 折扣基点换算为「折」，10000 基点（10 折）即原价。
  const discountText = (value: number) =>
    value === 10000 ? '原价' : `${value / 1000} 折`;
  // 储值卡赠送比例基点（100 = 1%）换算为百分比。
  const percentText = (value: number) => `${value / 100}%`;
  const signed = (value: number) => (value > 0 ? `+${value}` : String(value));
  const pad = (value: number) => String(value).padStart(2, '0');
  // 本地时区展示到分钟。
  const fmtMinute = (value: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const pendingText = (detail: CustomerMemberDetail) =>
    detail.pending_level_code
      ? `${detail.pending_level_code}（${fmtMinute(detail.downgrade_after)}）`
      : '-';
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  const formVisible = ref(false);
  const formTarget = ref<MemberLevel | null>(null);
  const form = reactive({
    code: '',
    name: '',
    growthYuan: 0,
    discountZhe: 10,
    priorityDispatch: false,
    prepayBonusPercent: 0,
    sortOrder: 0,
  });

  async function load() {
    loading.value = true;
    try {
      items.value = (await listMemberLevels()).data.data || [];
    } catch {
      Message.error('加载会员等级失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  function openCreate() {
    formTarget.value = null;
    form.code = '';
    form.name = '';
    form.growthYuan = 0;
    form.discountZhe = 10;
    form.priorityDispatch = false;
    form.prepayBonusPercent = 0;
    form.sortOrder = 0;
    formVisible.value = true;
  }

  function openEdit(record: MemberLevel) {
    formTarget.value = record;
    form.code = record.code;
    form.name = record.name;
    form.growthYuan = record.growth_threshold / 100;
    form.discountZhe = record.discount_bps / 1000;
    form.priorityDispatch = record.priority_dispatch;
    form.prepayBonusPercent = record.prepay_bonus_bps / 100;
    form.sortOrder = record.sort_order;
    formVisible.value = true;
  }

  function buildInput(): MemberLevelInput | null {
    const name = form.name.trim();
    const code = form.code.trim();
    if (!name || !code) {
      Message.warning('请填写名称与编码');
      return null;
    }
    return {
      code,
      name,
      growth_threshold: Math.round((form.growthYuan || 0) * 100),
      discount_bps: Math.round((form.discountZhe || 0) * 1000),
      priority_dispatch: form.priorityDispatch,
      prepay_bonus_bps: Math.round((form.prepayBonusPercent || 0) * 100),
      sort_order: form.sortOrder || 0,
    };
  }

  async function submitForm() {
    const input = buildInput();
    if (!input) return;
    const target = formTarget.value;
    try {
      if (target) {
        // 编码创建后不可变，编辑保持原值提交。
        await updateMemberLevel(target.id, {
          ...input,
          code: target.code,
          expected_version: target.version,
        });
      } else {
        await createMemberLevel(input);
      }
      formVisible.value = false;
      Message.success(target ? '已更新等级' : '已创建等级');
      await load();
    } catch (err) {
      Message.error(errorText(err, '提交失败：编码重复、版本已变化或参数无效'));
    }
  }

  async function changeStatus(record: MemberLevel) {
    const next = record.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      await setMemberLevelStatus(record.id, record.version, next);
      Message.success('已更新状态');
      await load();
    } catch (err) {
      Message.error(errorText(err, '状态更新失败：版本已变化或状态不允许'));
    }
  }

  // ── 客户会员 ──
  const customerId = ref<number | undefined>(undefined);
  const member = ref<CustomerMemberDetail | null>(null);
  const memberLoading = ref(false);

  async function queryMember() {
    const id = customerId.value;
    if (!id) {
      Message.warning('请填写客户 ID');
      return;
    }
    memberLoading.value = true;
    try {
      member.value = (await getCustomerMember(id)).data.data;
    } catch (err) {
      member.value = null;
      Message.error(errorText(err, '查询客户会员信息失败'));
    } finally {
      memberLoading.value = false;
    }
  }

  const levelVisible = ref(false);
  const levelForm = reactive({ levelCode: '', reason: '' });

  function openLevelAdjust() {
    if (!member.value) return;
    levelForm.levelCode = member.value.level_code;
    levelForm.reason = '';
    levelVisible.value = true;
  }

  async function submitLevelAdjust() {
    const current = member.value;
    if (!current) return;
    const reason = levelForm.reason.trim();
    if (!levelForm.levelCode) {
      Message.warning('请选择目标等级');
      return;
    }
    if (!reason) {
      Message.warning('请填写调级原因');
      return;
    }
    try {
      member.value = (
        await setCustomerMemberLevel(
          current.customer_id,
          levelForm.levelCode,
          reason
        )
      ).data.data;
      levelVisible.value = false;
      Message.success('已调整会员等级');
    } catch (err) {
      Message.error(errorText(err, '调级失败：等级不存在或参数无效'));
    }
  }

  onMounted(load);
</script>

<style scoped>
  .toolbar {
    margin-bottom: 16px;
  }

  .summary {
    margin-bottom: 16px;
  }

  .sub-card {
    margin-bottom: 16px;
  }

  .hint {
    margin-top: 4px;
    color: var(--color-text-3);
    font-size: 12px;
  }
</style>
