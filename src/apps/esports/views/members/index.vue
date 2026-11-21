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
          <a-table-column title="专属客服">
            <template #cell="{ record }">{{
              priorityText(record.dedicated_cs)
            }}</template>
          </a-table-column>
          <a-table-column title="优先预约">
            <template #cell="{ record }">{{
              priorityText(record.priority_booking)
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
          <a-table-column title="操作" :width="240">
            <template #cell="{ record }">
              <template v-if="canManage">
                <a-button type="text" @click="openEdit(record)">编辑</a-button>
                <a-popconfirm
                  :content="
                    record.status === 'enabled'
                      ? '确认停用该会员等级？停用后该等级不再参与取级。'
                      : '确认启用该会员等级？'
                  "
                  @ok="changeStatus(record)"
                >
                  <a-button
                    type="text"
                    :status="record.status === 'enabled' ? 'danger' : 'success'"
                    >{{
                      record.status === 'enabled' ? '停用' : '启用'
                    }}</a-button
                  >
                </a-popconfirm>
                <!-- 删除等级：后端 DELETE /admin/member-levels/:id（app.go:592）
                     仅允许删除「已停用且未被客户引用」的等级，其余情况后端返回中文冲突提示。 -->
                <a-popconfirm
                  v-if="record.status === 'disabled' && canDeleteLevel"
                  content="仅未被客户引用的停用等级可删除，否则请改用停用。"
                  @ok="removeLevel(record)"
                >
                  <a-button type="text" status="danger">删除</a-button>
                </a-popconfirm>
              </template>
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="客户会员">
      <a-space class="toolbar">
        <OwnerSelect
          v-model="customerId"
          owner-type="customer"
          placeholder="搜索并选择客户"
          :style="{ width: '180px' }"
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
          <span>调级覆盖：{{ overrideText(member) }}</span>
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

    <a-card class="general-card" title="专属预约（会员优先预约）">
      <a-space class="toolbar">
        <a-input-number
          v-model="bookingLimit"
          :min="1"
          :max="200"
          placeholder="条数"
          :style="{ width: '120px' }"
        />
        <a-button type="primary" :loading="bookingLoading" @click="loadBookings"
          >刷新预约</a-button
        >
      </a-space>
      <a-tabs v-model:active-key="bookingTab">
        <a-tab-pane key="pending" title="待处理预约">
          <a-table
            :data="bookings"
            :loading="bookingLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="id" title="意向 ID" :width="90" />
              <a-table-column title="客户">
                <template #cell="{ record }"
                  >{{ record.customer_name }}（{{
                    record.customer_id
                  }}）</template
                >
              </a-table-column>
              <a-table-column title="会员等级">
                <template #cell="{ record }"
                  >{{ record.member_level_name || '未定级' }}（{{
                    record.member_level_code || '-'
                  }}）</template
                >
              </a-table-column>
              <a-table-column title="指定陪玩">
                <template #cell="{ record }"
                  >{{ record.player_name }}（{{ record.player_id }}）</template
                >
              </a-table-column>
              <a-table-column title="期望时段">
                <template #cell="{ record }">{{
                  fmtMinute(record.requested_start_at)
                }}</template>
              </a-table-column>
              <a-table-column title="备注">
                <template #cell="{ record }">{{ record.note || '-' }}</template>
              </a-table-column>
              <a-table-column title="状态" :width="90">
                <template #cell="{ record }">
                  <a-tag :color="bookingStatusColor(record.status)">{{
                    bookingStatusText(record.status)
                  }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="提交时间">
                <template #cell="{ record }">{{
                  fmtMinute(record.created_at)
                }}</template>
              </a-table-column>
              <a-table-column title="操作" :width="120">
                <template #cell="{ record }">
                  <a-button type="text" @click="inspectAvailability(record)"
                    >查档期</a-button
                  >
                </template>
              </a-table-column>
            </template>
          </a-table>
          <div class="hint"
            >预约意向按会员等级置顶（等级越高越靠前），非超管只看本人归属客户的意向。
            客服确认后在报单链路转正式订单；「已处理 /
            已取消」处理入口后端尚未注册管理端路由，当前仅提供查询与档期查看。</div
          >
        </a-tab-pane>
        <a-tab-pane key="availability" title="陪玩档期">
          <a-space class="toolbar" wrap>
            <OwnerSelect
              v-model="availabilityPlayerId"
              owner-type="player"
              placeholder="搜索并选择陪玩"
              :style="{ width: '180px' }"
            />
            <a-date-picker
              v-model="availabilityFrom"
              value-format="YYYY-MM-DD"
              placeholder="开始日期"
              :style="{ width: '150px' }"
            />
            <a-date-picker
              v-model="availabilityTo"
              value-format="YYYY-MM-DD"
              placeholder="结束日期"
              :style="{ width: '150px' }"
            />
            <a-select
              v-model="availabilitySlotMinutes"
              :style="{ width: '150px' }"
            >
              <a-option :value="30">30 分钟 / 档</a-option>
              <a-option :value="60">60 分钟 / 档</a-option>
              <a-option :value="90">90 分钟 / 档</a-option>
              <a-option :value="120">120 分钟 / 档</a-option>
            </a-select>
            <a-button
              type="primary"
              :loading="availabilityLoading"
              @click="queryAvailability"
              >查询档期</a-button
            >
          </a-space>
          <template v-if="availability">
            <a-space class="summary" size="large" wrap>
              <span
                >陪玩：{{ availability.player_name }}（{{
                  availability.player_id
                }}）</span
              >
              <span>可约 {{ availability.available_count }} 档</span>
              <span>已占用 {{ availability.occupied_count }} 档</span>
              <span>档期粒度：{{ availability.slot_minutes }} 分钟</span>
            </a-space>
            <a-table
              :data="availability.slots"
              row-key="start"
              :pagination="{ pageSize: 10 }"
              size="small"
            >
              <template #columns>
                <a-table-column title="时段">
                  <template #cell="{ record }"
                    >{{ fmtMinute(record.start) }} ~
                    {{ fmtMinute(record.end) }}</template
                  >
                </a-table-column>
                <a-table-column title="状态" :width="110">
                  <template #cell="{ record }">{{
                    bookingStatusText(record.status)
                  }}</template>
                </a-table-column>
                <a-table-column title="可预约" :width="90">
                  <template #cell="{ record }">
                    <a-tag :color="record.bookable ? 'green' : 'gray'">{{
                      record.bookable ? '可约' : '不可约'
                    }}</a-tag>
                  </template>
                </a-table-column>
                <a-table-column title="占用原因">
                  <template #cell="{ record }">{{
                    record.reason || '-'
                  }}</template>
                </a-table-column>
                <a-table-column title="关联订单" :width="180">
                  <template #cell="{ record }">{{
                    record.order_no || '-'
                  }}</template>
                </a-table-column>
              </template>
            </a-table>
          </template>
          <div class="hint"
            >档期来自陪玩排期与已接订单；会员期望时段不可约时据此改约或指派其他陪玩。</div
          >
        </a-tab-pane>
      </a-tabs>
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
        <a-form-item
          label="成长值门槛（元）"
          tooltip="按累计消费金额计，消费 1 元计 1 元成长值"
          required
        >
          <a-input-number v-model="form.growthYuan" :min="0" :precision="2" />
        </a-form-item>
        <a-form-item
          label="折扣（折）"
          tooltip="如 9.5 表示 9.5 折；填 10 表示原价不打折"
          required
        >
          <a-input-number
            v-model="form.discountZhe"
            :min="0"
            :max="10"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="会员订单优先">
          <a-switch v-model="form.priorityDispatch" />
        </a-form-item>
        <a-form-item
          label="专属客服"
          tooltip="客户绑定固定负责客服、不参与轮转"
        >
          <a-switch v-model="form.dedicatedCs" />
        </a-form-item>
        <a-form-item
          label="优先预约"
          tooltip="会员预约意向在客服工作台置顶处理"
        >
          <a-switch v-model="form.priorityBooking" />
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
        <div class="hint"
          >手动调级写入只增覆盖记录并立即生效，覆盖期内成长值重算不会把它顶回；覆盖期长度由系统配置
          app.esports.member_override_guard_days 决定（默认 90
          天），后端手动调级接口暂不支持逐次指定覆盖期。</div
        >
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import yuanToCents, { scaleToInt } from '@/utils/money';
  import { errorText } from '@/utils/error';
  import OwnerSelect from '../../components/OwnerSelect.vue';
  import {
    createMemberLevel,
    deleteMemberLevel,
    getCustomerMember,
    getPlayerAvailability,
    listMemberLevels,
    listPriorityBookings,
    setCustomerMemberLevel,
    setMemberLevelStatus,
    updateMemberLevel,
  } from '../../api';
  import type {
    CustomerMemberDetail,
    MemberLevel,
    MemberLevelInput,
    MemberGrowthSourceType,
    PlayerAvailabilityView,
    PriorityBooking,
  } from '../../api';

  const { hasButtonPermission, hasAnyPermission } = usePermission();
  const canManage = computed(() =>
    hasButtonPermission('esports:members:manage')
  );
  // 删除等级：权限码取自 app.go 的 PermAPI 声明（esports:members:level_delete，
  // 只有 API 授权、无同名按钮），按「按钮码 || 同码 API 授权」并集判断。
  const canDeleteLevel = computed(
    () =>
      hasButtonPermission('esports:members:level_delete') ||
      hasAnyPermission([
        'esports:members:level_delete',
        'esports:members:level_status',
        'esports:members:manage',
      ])
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
  // 后端 memberView 已返回手动调级覆盖状态（P1-10）：覆盖期内 override_active=true，
  // 到期由惰性判定回落；api.ts 的 CustomerMemberDetail 尚未收录这三个字段，页面侧就地补齐。
  type MemberDetail = CustomerMemberDetail & {
    override_level_code?: string;
    override_expires_at?: string | null;
    override_active?: boolean;
  };
  const overrideText = (detail: MemberDetail) =>
    detail.override_active
      ? `${detail.override_level_code}（覆盖至 ${fmtMinute(
          detail.override_expires_at ?? null
        )}）`
      : '无生效覆盖';
  const formVisible = ref(false);
  const formTarget = ref<MemberLevel | null>(null);
  const form = reactive({
    code: '',
    name: '',
    growthYuan: 0,
    discountZhe: 10,
    priorityDispatch: false,
    dedicatedCs: false,
    priorityBooking: false,
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
    form.dedicatedCs = false;
    form.priorityBooking = false;
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
    form.dedicatedCs = record.dedicated_cs;
    form.priorityBooking = record.priority_booking;
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
      growth_threshold: yuanToCents(form.growthYuan || 0),
      discount_bps: scaleToInt(form.discountZhe || 0, 1000),
      priority_dispatch: form.priorityDispatch,
      dedicated_cs: form.dedicatedCs,
      priority_booking: form.priorityBooking,
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

  // 删除等级：后端只允许删除「已停用且未被客户引用」的等级
  // （启用中 → 「该会员等级启用中，不能删除，请先停用」；
  //   仍被客户当前 / 待生效等级引用 → 「该会员等级仍被客户引用，不能删除，请改用停用」），
  // 失败按 errorText 原样透出后端中文提示。
  async function removeLevel(record: MemberLevel) {
    try {
      await deleteMemberLevel(record.id);
      Message.success('已删除等级');
      await load();
    } catch (err) {
      Message.error(
        errorText(
          err,
          '删除失败：仅未被客户引用的停用等级可删除，否则请改用停用'
        )
      );
    }
  }

  // ── 客户会员 ──
  const customerId = ref<number | undefined>(undefined);
  const member = ref<MemberDetail | null>(null);
  const memberLoading = ref(false);

  async function queryMember() {
    const id = customerId.value;
    if (!id) {
      Message.warning('请选择客户');
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

  // ── 专属预约（会员优先预约，） ──
  const bookingTab = ref('pending');
  const bookingLimit = ref(50);
  const bookings = ref<PriorityBooking[]>([]);
  const bookingLoading = ref(false);
  const bookingStatusMap: Record<string, string> = {
    pending: '待处理',
    processed: '已处理',
    cancelled: '已取消',
  };
  const bookingStatusColorMap: Record<string, string> = {
    pending: 'orange',
    processed: 'green',
    cancelled: 'gray',
  };
  const bookingStatusText = (value: string) => bookingStatusMap[value] || value;
  const bookingStatusColor = (value: string) =>
    bookingStatusColorMap[value] || 'gray';

  async function loadBookings() {
    bookingLoading.value = true;
    try {
      bookings.value =
        (await listPriorityBookings(bookingLimit.value)).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载专属预约失败'));
    } finally {
      bookingLoading.value = false;
    }
  }

  // ── 陪玩档期可用性：会员约前 / 客服派单前查看可约时段 ──
  const availability = ref<PlayerAvailabilityView | null>(null);
  const availabilityLoading = ref(false);
  const availabilityPlayerId = ref<number | undefined>(undefined);
  const availabilityFrom = ref<string | undefined>(undefined);
  const availabilityTo = ref<string | undefined>(undefined);
  const availabilitySlotMinutes = ref(60);

  // 日期选择器按本地时区补全为 RFC3339；结束日期取当日 23:59:59 以覆盖整天。
  const dayStart = (value: string) =>
    new Date(`${value}T00:00:00`).toISOString();
  const dayEnd = (value: string) => new Date(`${value}T23:59:59`).toISOString();

  async function queryAvailability() {
    const playerId = availabilityPlayerId.value;
    if (!playerId) {
      Message.warning('请选择陪玩');
      return;
    }
    availabilityLoading.value = true;
    try {
      availability.value = (
        await getPlayerAvailability(playerId, {
          from: availabilityFrom.value
            ? dayStart(availabilityFrom.value)
            : undefined,
          to: availabilityTo.value ? dayEnd(availabilityTo.value) : undefined,
          slot_minutes: availabilitySlotMinutes.value,
        })
      ).data.data;
    } catch (err) {
      availability.value = null;
      Message.error(errorText(err, '查询陪玩档期失败：陪玩不存在或参数无效'));
    } finally {
      availabilityLoading.value = false;
    }
  }

  // 从预约意向直接查看该陪玩的档期，切到档期页签。
  function inspectAvailability(record: PriorityBooking) {
    availabilityPlayerId.value = record.player_id;
    bookingTab.value = 'availability';
    queryAvailability();
  }

  onMounted(async () => {
    await load();
    await loadBookings();
  });
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
