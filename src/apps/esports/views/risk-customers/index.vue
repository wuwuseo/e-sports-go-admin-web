<template>
  <div class="container page-container">
    <a-card class="general-card" title="风险客户">
      <a-space class="toolbar">
        <a-button :loading="loading" @click="load">刷新</a-button>
      </a-space>
      <a-typography-text type="secondary" class="tip">
        高频退款客户由系统自动标记为「疑似滥用复核」——只标记复核、不自动处罚，受理与申诉入口照常；
        「限制自助下单」只能由管理员人工设置，设置后该客户的自助下单会被拦截（提示联系客服或先预付）。
      </a-typography-text>
      <a-table
        :data="customers"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="display_name" title="客户" />
          <a-table-column data-index="owner_admin_id" title="归属客服" />
          <a-table-column title="风险状态">
            <template #cell="{ record }">
              <a-tag :color="riskColor(record.risk_status)">{{
                riskLabel(record.risk_status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="标记原因">
            <template #cell="{ record }">{{
              record.risk_reason || '—'
            }}</template>
          </a-table-column>
          <a-table-column data-index="risk_marked_at" title="标记时间" />
          <a-table-column title="操作" :width="180">
            <template #cell="{ record }">
              <a-button v-if="canMark" type="text" @click="openMark(record)"
                >标记 / 修改</a-button
              >
              <a-popconfirm
                v-if="canMark && record.risk_status !== 'normal'"
                content="解除后该客户恢复为正常状态（不再标记复核 / 不再拦截自助下单），确认继续？"
                @ok="doClear(record)"
              >
                <a-button type="text" status="success">解除</a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="markVisible"
      title="标记客户风险"
      @ok="submitMark"
      @cancel="markVisible = false"
    >
      <a-form :model="markForm">
        <a-form-item label="客户" required>
          <OwnerSelect
            v-model="markForm.customerId"
            owner-type="customer"
            :initial-label="markForm.customerName"
            placeholder="搜索客户姓名或手机号"
          />
        </a-form-item>
        <a-form-item label="风险状态" required>
          <a-select v-model="markForm.status">
            <a-option value="watch">疑似滥用复核（不拦截自助）</a-option>
            <a-option value="restricted">限制自助下单</a-option>
            <a-option value="normal">正常</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="原因" :required="markForm.status !== 'normal'">
          <a-textarea
            v-model="markForm.reason"
            :max-length="255"
            placeholder="如：近 30 天退款 4 次，疑似恶意退款"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { errorText } from '@/utils/error';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import { listRiskCustomers, markCustomerRisk } from '../../api';
  import OwnerSelect from '../../components/OwnerSelect.vue';
  import type { CustomerRiskStatus, EsportsCustomer } from '../../api';

  const riskLabels: Record<CustomerRiskStatus, string> = {
    normal: '正常',
    watch: '疑似滥用复核',
    restricted: '限制自助下单',
  };
  const riskLabel = (value: CustomerRiskStatus) => riskLabels[value] || value;
  const riskColor = (value: CustomerRiskStatus) => {
    if (value === 'restricted') return 'red';
    if (value === 'watch') return 'orange';
    return 'green';
  };
  const { hasButtonPermission } = usePermission();
  const canMark = computed(() => hasButtonPermission('esports:risk:manage'));

  const loading = ref(false);
  const customers = ref<EsportsCustomer[]>([]);
  const markVisible = ref(false);
  const markForm = reactive<{
    customerId: number;
    customerName: string;
    status: CustomerRiskStatus;
    reason: string;
  }>({ customerId: 0, customerName: '', status: 'watch', reason: '' });

  async function load() {
    loading.value = true;
    try {
      customers.value = (await listRiskCustomers()).data.data || [];
    } catch {
      Message.error('加载风险客户失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  function openMark(record: EsportsCustomer) {
    markForm.customerId = record.id;
    markForm.customerName = record.display_name;
    markForm.status =
      record.risk_status === 'normal' ? 'watch' : record.risk_status;
    markForm.reason = record.risk_reason;
    markVisible.value = true;
  }

  async function submitMark() {
    if (!markForm.customerId) {
      Message.warning('请选择客户');
      return;
    }
    if (markForm.status !== 'normal' && !markForm.reason.trim()) {
      Message.warning('标记风险须填写原因');
      return;
    }
    try {
      await markCustomerRisk(
        markForm.customerId,
        markForm.status,
        markForm.reason.trim()
      );
      markVisible.value = false;
      Message.success('已保存风险标记');
      await load();
    } catch (err) {
      Message.error(errorText(err, '保存失败：标记风险须填写原因'));
    }
  }

  async function doClear(record: EsportsCustomer) {
    try {
      await markCustomerRisk(record.id, 'normal', '');
      Message.success('已解除风险标记');
      await load();
    } catch (err) {
      Message.error(errorText(err, '解除失败，请刷新后重试'));
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
