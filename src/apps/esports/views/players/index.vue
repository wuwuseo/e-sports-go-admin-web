<template>
  <div class="container page-container">
    <a-card class="general-card" title="陪玩">
      <a-space class="toolbar">
        <a-button :loading="loading" @click="load">刷新</a-button>
        <a-input-search
          v-model="keyword"
          placeholder="按昵称 / 用户搜索"
          style="width: 240px"
          allow-clear
          @search="load"
        />
        <a-button v-if="canManage" type="primary" @click="openCreate"
          >新建陪玩</a-button
        >
      </a-space>
      <a-table
        :data="players"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="id" title="ID" />
          <a-table-column title="用户">
            <template #cell="{ record }">
              <div>{{ playerUserName(record) }}</div>
              <div v-if="playerUserMeta(record)" class="user-meta">
                {{ playerUserMeta(record) }}
              </div>
            </template>
          </a-table-column>
          <a-table-column data-index="display_name" title="昵称" />
          <a-table-column data-index="qualification" title="资格" />
          <a-table-column data-index="presence" title="在线状态" />
          <a-table-column title="期望报价">
            <template #cell="{ record }">
              <a-space>
                <span>{{ money(record.expected_price_cents || 0) }}</span>
                <a-tag
                  :color="expectedPriceColor(record.expected_price_status)"
                  >{{ expectedPriceLabel(record.expected_price_status) }}</a-tag
                >
              </a-space>
            </template>
          </a-table-column>
          <a-table-column data-index="version" title="版本" />
          <a-table-column title="操作" :width="330">
            <template #cell="{ record }">
              <a-button v-if="canManage" type="text" @click="openEdit(record)"
                >编辑</a-button
              >
              <a-button
                v-if="canReviewIdentity"
                type="text"
                @click="openIdentity(record)"
                >实名</a-button
              >
              <a-button
                v-if="canManage && record.expected_price_status === 'pending'"
                type="text"
                status="warning"
                @click="openExpectedReview(record)"
                >审核期望报价</a-button
              >
              <a-button v-if="canManage" type="text" @click="openCredit(record)"
                >信用记载</a-button
              >
              <a-button
                v-if="canManage"
                type="text"
                @click="openAvailability(record)"
                >档期</a-button
              >
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="createVisible"
      title="新建陪玩"
      @ok="submitCreate"
      @cancel="createVisible = false"
    >
      <a-form :model="createForm">
        <a-form-item label="用户" required>
          <a-select
            v-model="createForm.userId"
            allow-search
            :filter-option="false"
            :loading="userCandidatesLoading"
            placeholder="搜索用户名 / 昵称 / 手机号"
            @search="onUserCandidateSearch"
            @change="onUserCandidateChange"
            @popup-visible-change="onUserCandidatePopup"
          >
            <a-option
              v-for="item in userCandidates"
              :key="item.id"
              :value="item.id"
              >{{ userCandidateLabel(item) }}</a-option
            >
          </a-select>
          <a-typography-text type="secondary" class="user-tip">
            只列出尚未建陪玩档案的用户；选择后自动带出昵称，可再修改。
          </a-typography-text>
        </a-form-item>
        <a-form-item label="昵称" required>
          <a-input v-model="createForm.displayName" :max-length="120" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="editVisible"
      title="编辑陪玩"
      @ok="submitEdit"
      @cancel="editVisible = false"
    >
      <a-form :model="editForm">
        <a-form-item label="昵称" required>
          <a-input v-model="editForm.displayName" :max-length="120" />
        </a-form-item>
        <a-form-item label="资格" required>
          <a-select v-model="editForm.qualification">
            <a-option value="pending">待定</a-option>
            <a-option value="qualified">合格</a-option>
            <a-option value="suspended">停用</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="在线状态" required>
          <a-select v-model="editForm.presence">
            <a-option value="offline">离线</a-option>
            <a-option value="online">在线</a-option>
            <a-option value="protected_abnormal">保护 / 异常</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="每日接单上限">
          <a-input-number v-model="editForm.dailyLimit" :min="0" />
          <a-typography-text type="secondary"
            >0 表示不限；当日接单达上限后不再接新单（§5.5 /
            §6.4）。</a-typography-text
          >
        </a-form-item>
        <a-form-item label="并发接单上限">
          <a-input-number v-model="editForm.concurrentLimit" :min="0" />
          <a-typography-text type="secondary"
            >0 表示不限；同时可履约席位数上限（§5.5）。</a-typography-text
          >
        </a-form-item>
        <a-form-item label="接单游戏分区">
          <a-input-tag
            v-model="editForm.games"
            placeholder="输入游戏分区后回车（留空为不限）"
            :max-tag-count="10"
          />
          <a-typography-text type="secondary"
            >留空表示不限；填了则只接这些游戏分区的订单（§5.5 /
            §6.4）。</a-typography-text
          >
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      v-model:visible="identityVisible"
      title="陪玩实名认证"
      :footer="false"
      @cancel="identityVisible = false"
    >
      <a-spin :loading="identityLoading" style="width: 100%">
        <a-space direction="vertical" fill>
          <div>
            状态：
            <a-tag v-if="identity?.status" :color="identityStatusColor">
              {{ identityStatusText }}
            </a-tag>
            <a-tag v-else color="gray">未提交</a-tag>
          </div>
          <div>真实姓名：{{ identity?.real_name || '-' }}</div>
          <div>身份证号：{{ identity?.id_number_masked || '-' }}</div>
          <div>提交时间：{{ identity?.created_at || '-' }}</div>
          <div v-if="identity?.reject_reason">
            驳回原因：{{ identity.reject_reason }}
          </div>
          <a-form
            v-if="identity?.status === 'pending_verification'"
            :model="{ rejectReason }"
            style="margin-top: 12px"
          >
            <a-form-item label="驳回原因">
              <a-input
                v-model="rejectReason"
                placeholder="驳回时必填，最多 255 字"
                :max-length="255"
                allow-clear
              />
            </a-form-item>
            <a-space>
              <a-button
                type="primary"
                :loading="identitySubmitting"
                @click="decideIdentity(true)"
                >通过</a-button
              >
              <a-button
                status="danger"
                :loading="identitySubmitting"
                @click="decideIdentity(false)"
                >驳回</a-button
              >
            </a-space>
          </a-form>
        </a-space>
      </a-spin>
    </a-modal>
    <a-modal
      v-model:visible="expectedVisible"
      title="复核陪玩期望报价（§6.1-12）"
      :ok-loading="expectedSubmitting"
      ok-text="确认提交"
      @ok="submitExpectedReview"
      @cancel="expectedVisible = false"
    >
      <a-form :model="expectedForm">
        <a-form-item label="陪玩">
          {{ expectedTarget?.display_name }}（#{{ expectedTarget?.id }}）
        </a-form-item>
        <a-form-item label="申请期望报价">
          {{ money(expectedTarget?.expected_price_cents || 0) }}
        </a-form-item>
        <a-form-item label="提交时间">
          {{ expectedTarget?.expected_price_submitted_at || '—' }}
        </a-form-item>
        <a-form-item label="复核结论" required>
          <a-radio-group v-model="expectedForm.approve">
            <a-radio :value="true">通过（以此作为报价下限参考）</a-radio>
            <a-radio :value="false">驳回</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          label="复核说明"
          :required="expectedForm.approve === false"
        >
          <a-textarea
            v-model="expectedForm.note"
            :max-length="255"
            :auto-size="{ minRows: 2 }"
            placeholder="驳回时必须填写原因"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      v-model:visible="creditVisible"
      title="陪玩信用 / 追偿记载（§13.5）"
      :footer="false"
      width="900px"
      @cancel="creditVisible = false"
    >
      <a-space class="toolbar" wrap>
        <span>{{ creditPlayer?.display_name }}（#{{ creditPlayer?.id }}）</span>
        <a-select
          v-model="creditStatusFilter"
          placeholder="状态"
          allow-clear
          :style="{ width: '150px' }"
          @change="loadCreditEvents"
        >
          <a-option value="recorded">待复核</a-option>
          <a-option value="penalty_applied">已确认责任</a-option>
          <a-option value="cleared">已判定无责</a-option>
        </a-select>
        <a-button :loading="creditLoading" @click="loadCreditEvents"
          >刷新</a-button
        >
      </a-space>
      <a-table
        :data="creditEvents"
        :loading="creditLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column data-index="event_no" title="记载编号" :width="200" />
          <a-table-column data-index="kind" title="类型" :width="110" />
          <a-table-column title="金额" :width="110">
            <template #cell="{ record }">{{
              money(record.amount_cents || 0)
            }}</template>
          </a-table-column>
          <a-table-column data-index="note" title="说明" />
          <a-table-column title="状态" :width="110">
            <template #cell="{ record }">
              <a-tag :color="creditStatusColor(record.status)">{{
                creditStatusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="复核" :width="220">
            <template #cell="{ record }">
              <template v-if="record.status === 'recorded'">
                <a-button
                  type="text"
                  status="danger"
                  @click="openCreditReview(record, 'penalty')"
                  >确认责任</a-button
                >
                <a-button
                  type="text"
                  status="success"
                  @click="openCreditReview(record, 'clear')"
                  >判定无责</a-button
                >
              </template>
              <span v-else>{{ record.review_note || '—' }}</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-modal>
    <a-modal
      v-model:visible="creditReviewVisible"
      title="复核信用记载"
      :ok-loading="creditReviewSubmitting"
      ok-text="确认提交"
      @ok="submitCreditReview"
      @cancel="creditReviewVisible = false"
    >
      <a-form :model="creditReviewForm">
        <a-form-item label="结论">
          {{
            creditReviewForm.action === 'penalty' ? '确认责任' : '判定无责'
          }}（{{ creditTarget?.event_no }}）
        </a-form-item>
        <a-alert
          v-if="creditReviewForm.action === 'penalty'"
          type="warning"
          content="确认责任会给该陪玩记责并暂停接单；提交后不可撤销，请先核对售后责任方与证据。"
        />
        <a-form-item
          label="复核说明"
          :required="creditReviewForm.action === 'penalty'"
        >
          <a-textarea
            v-model="creditReviewForm.note"
            :max-length="255"
            :auto-size="{ minRows: 2 }"
            placeholder="确认责任时必填，会写入复核留痕"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      v-model:visible="availabilityVisible"
      title="陪玩档期可用性（§10.4-04）"
      :footer="false"
      width="900px"
      @cancel="availabilityVisible = false"
    >
      <a-space class="toolbar" wrap>
        <span
          >{{ availability?.player_name }}（#{{
            availability?.player_id
          }}）</span
        >
        <a-range-picker
          v-model="availabilityRange"
          value-format="YYYY-MM-DD"
          :style="{ width: '260px' }"
        />
        <a-select v-model="availabilitySlotMinutes" :style="{ width: '130px' }">
          <a-option :value="30">30 分钟 / 格</a-option>
          <a-option :value="60">60 分钟 / 格</a-option>
          <a-option :value="120">120 分钟 / 格</a-option>
        </a-select>
        <a-button
          type="primary"
          :loading="availabilityLoading"
          @click="loadAvailability"
          >查询</a-button
        >
      </a-space>
      <a-descriptions
        v-if="availability"
        :column="3"
        bordered
        size="small"
        class="toolbar"
      >
        <a-descriptions-item label="可预约格数">{{
          availability.available_count
        }}</a-descriptions-item>
        <a-descriptions-item label="已占用格数">{{
          availability.occupied_count
        }}</a-descriptions-item>
        <a-descriptions-item label="区间">
          {{ availability.from }} ~ {{ availability.to }}
        </a-descriptions-item>
      </a-descriptions>
      <a-table
        :data="availability?.slots || []"
        row-key="start"
        :loading="availabilityLoading"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="start" title="开始" />
          <a-table-column data-index="end" title="结束" />
          <a-table-column title="状态">
            <template #cell="{ record }">{{
              slotStatusLabel(record.status)
            }}</template>
          </a-table-column>
          <a-table-column title="可预约">
            <template #cell="{ record }">
              <a-tag :color="record.bookable ? 'green' : 'gray'">{{
                record.bookable ? '可预约' : '不可预约'
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="说明">
            <template #cell="{ record }">{{
              record.reason || record.order_no || '—'
            }}</template>
          </a-table-column>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    createPlayer,
    getPlayerAvailability,
    getPlayerIdentity,
    listPlayerCreditEvents,
    listPlayers,
    reviewPlayerCreditEvent,
    reviewPlayerExpectedPrice,
    reviewPlayerIdentity,
    searchPlayerUsers,
    updatePlayer,
  } from '../../api';
  import type {
    EsportsPlayer,
    EsportsPlayerCreditEvent,
    PlayerAvailabilityView,
    PlayerCreditEventStatus,
    PlayerIdentityView,
    PlayerPresence,
    PlayerQualification,
    PlayerUserCandidate,
  } from '../../api';

  // 陪玩列表直接返回陪玩档案实体，含期望报价三项（api.ts 的 EsportsPlayer 尚未声明）。
  type PlayerRow = EsportsPlayer & {
    expected_price_cents?: number;
    expected_price_status?: string;
    expected_price_submitted_at?: string | null;
    expected_price_review_note?: string;
  };

  const { hasButtonPermission } = usePermission();
  // 期望报价复核 / 信用记载 / 档期查询三条路由在 app.go 里只有 PermAPI 权限码
  // （esports:players:expected_price_review、esports:players:credit_list、esports:players:credit_review、
  // esports:members:player_availability），hasButtonPermission 只命中 PermButton，
  // 因此与既有「陪玩管理」按钮权限取或，并在报告注明。
  const canManage = computed(() =>
    hasButtonPermission('esports:players:manage')
  );
  const canReviewIdentity = computed(() =>
    hasButtonPermission('esports:players:identity_review')
  );

  const loading = ref(false);
  const keyword = ref('');
  const players = ref<PlayerRow[]>([]);
  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  // 用户列展示关联账号的可读名称，不再显示 user_id。
  const playerUserName = (player: EsportsPlayer) =>
    player.user_display_name ||
    player.user_username ||
    player.user_email ||
    '未知用户';
  const playerUserMeta = (player: EsportsPlayer) => {
    const parts: string[] = [];
    const name = playerUserName(player);
    if (player.user_username && player.user_username !== name) {
      parts.push(player.user_username);
    }
    if (player.user_phone) parts.push(player.user_phone);
    return parts.join(' · ');
  };

  const expectedPriceLabels: Record<string, string> = {
    none: '未提交',
    pending: '待审核',
    approved: '已通过',
    rejected: '已驳回',
  };
  const expectedPriceLabel = (value?: string) =>
    (value && expectedPriceLabels[value]) || value || '未提交';
  const expectedPriceColor = (value?: string) => {
    if (value === 'approved') return 'green';
    if (value === 'rejected') return 'red';
    if (value === 'pending') return 'orange';
    return 'gray';
  };
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  const createVisible = ref(false);
  const createForm = reactive({ userId: 0, displayName: '' });
  // 新建陪玩时的用户候选：远程按关键词搜索，只列出尚未建档案的用户。
  const userCandidates = ref<PlayerUserCandidate[]>([]);
  const userCandidatesLoading = ref(false);
  const selectedUserCandidate = ref<PlayerUserCandidate | null>(null);
  let userCandidateTimer: ReturnType<typeof setTimeout> | undefined;
  let userCandidateToken = 0;
  const userCandidateLabel = (item: PlayerUserCandidate) =>
    item.username && item.username !== item.display_name
      ? `${item.display_name} · ${item.username}`
      : item.display_name;
  const editVisible = ref(false);
  const editTarget = ref<EsportsPlayer | null>(null);
  const editForm = reactive<{
    displayName: string;
    qualification: PlayerQualification;
    presence: PlayerPresence;
    dailyLimit: number;
    concurrentLimit: number;
    games: string[];
  }>({
    displayName: '',
    qualification: 'pending',
    presence: 'offline',
    dailyLimit: 0,
    concurrentLimit: 0,
    games: [],
  });

  async function load() {
    loading.value = true;
    try {
      players.value = ((await listPlayers(keyword.value)).data.data ||
        []) as PlayerRow[];
    } catch {
      Message.error('加载陪玩列表失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  async function loadUserCandidates(keywordValue = '') {
    userCandidateToken += 1;
    const token = userCandidateToken;
    userCandidatesLoading.value = true;
    try {
      const rows = (await searchPlayerUsers(keywordValue)).data.data || [];
      const current = selectedUserCandidate.value;
      if (current && !rows.some((item) => item.id === current.id)) {
        rows.unshift(current);
      }
      userCandidates.value = rows;
    } catch {
      if (token === userCandidateToken) userCandidates.value = [];
    } finally {
      if (token === userCandidateToken) userCandidatesLoading.value = false;
    }
  }

  function onUserCandidateSearch(keywordValue: string) {
    if (userCandidateTimer) clearTimeout(userCandidateTimer);
    userCandidateTimer = setTimeout(
      () => loadUserCandidates(keywordValue.trim()),
      250
    );
  }

  function onUserCandidatePopup(visible: boolean) {
    if (visible) loadUserCandidates('');
  }

  function onUserCandidateChange(value: unknown) {
    const id = typeof value === 'number' ? value : 0;
    const candidate = userCandidates.value.find((item) => item.id === id);
    if (candidate) {
      selectedUserCandidate.value = candidate;
      createForm.displayName = candidate.display_name;
    }
  }

  function openCreate() {
    createForm.userId = 0;
    createForm.displayName = '';
    selectedUserCandidate.value = null;
    userCandidates.value = [];
    loadUserCandidates('');
    createVisible.value = true;
  }

  async function submitCreate() {
    if (!createForm.userId || createForm.userId < 1) {
      Message.warning('请选择用户');
      return;
    }
    if (!createForm.displayName.trim()) {
      Message.warning('请填写昵称');
      return;
    }
    try {
      await createPlayer({
        user_id: createForm.userId,
        display_name: createForm.displayName.trim(),
      });
      createVisible.value = false;
      Message.success('已创建陪玩档案');
      await load();
    } catch {
      Message.error('创建失败：该用户已有陪玩档案或参数无效');
    }
  }

  function openEdit(player: EsportsPlayer) {
    editTarget.value = player;
    editForm.displayName = player.display_name;
    editForm.qualification = player.qualification;
    editForm.presence = player.presence;
    editForm.dailyLimit = player.daily_limit;
    editForm.concurrentLimit = player.concurrent_limit;
    editForm.games = player.games || [];
    editVisible.value = true;
  }

  async function submitEdit() {
    const player = editTarget.value;
    if (!player) return;
    if (!editForm.displayName.trim()) {
      Message.warning('请填写昵称');
      return;
    }
    try {
      await updatePlayer(player.id, {
        display_name: editForm.displayName.trim(),
        qualification: editForm.qualification,
        presence: editForm.presence,
        daily_limit: editForm.dailyLimit,
        concurrent_limit: editForm.concurrentLimit,
        games: editForm.games,
      });
      editVisible.value = false;
      Message.success('已更新陪玩档案');
      await load();
    } catch {
      Message.error('更新失败：档案不存在或参数无效');
    }
  }

  const identityVisible = ref(false);
  const identityLoading = ref(false);
  const identitySubmitting = ref(false);
  const identityPlayer = ref<EsportsPlayer | null>(null);
  const identity = ref<PlayerIdentityView | null>(null);
  const rejectReason = ref('');

  const identityStatusText = computed(() => {
    switch (identity.value?.status) {
      case 'pending_verification':
        return '待审核';
      case 'verified':
        return '已通过';
      case 'rejected':
        return '已驳回';
      default:
        return '未提交';
    }
  });
  const identityStatusColor = computed(() => {
    switch (identity.value?.status) {
      case 'verified':
        return 'green';
      case 'rejected':
        return 'red';
      case 'pending_verification':
        return 'orange';
      default:
        return 'gray';
    }
  });

  async function openIdentity(player: EsportsPlayer) {
    identityPlayer.value = player;
    identity.value = null;
    rejectReason.value = '';
    identityVisible.value = true;
    identityLoading.value = true;
    try {
      identity.value = (await getPlayerIdentity(player.id)).data.data || null;
    } catch {
      Message.error('加载实名认证信息失败');
    } finally {
      identityLoading.value = false;
    }
  }

  async function decideIdentity(approved: boolean) {
    const player = identityPlayer.value;
    if (!player) return;
    if (!approved && !rejectReason.value.trim()) {
      Message.warning('驳回时必须填写原因');
      return;
    }
    identitySubmitting.value = true;
    try {
      await reviewPlayerIdentity(player.id, {
        approved,
        reject_reason: approved ? undefined : rejectReason.value.trim(),
      });
      Message.success(approved ? '实名认证已通过' : '实名认证已驳回');
      await openIdentity(player);
      await load();
    } catch {
      Message.error(approved ? '审核通过失败' : '审核驳回失败');
    } finally {
      identitySubmitting.value = false;
    }
  }

  // ── 期望报价复核（§6.1-12）：待审核才可复核，驳回须填原因。 ──
  const expectedVisible = ref(false);
  const expectedSubmitting = ref(false);
  const expectedTarget = ref<PlayerRow | null>(null);
  const expectedForm = reactive({ approve: true, note: '' });

  function openExpectedReview(record: PlayerRow) {
    expectedTarget.value = record;
    expectedForm.approve = true;
    expectedForm.note = '';
    expectedVisible.value = true;
  }

  async function submitExpectedReview() {
    const player = expectedTarget.value;
    if (!player) return;
    if (!expectedForm.approve && !expectedForm.note.trim()) {
      Message.warning('驳回期望报价须填写原因');
      return;
    }
    expectedSubmitting.value = true;
    try {
      await reviewPlayerExpectedPrice(player.id, {
        approve: expectedForm.approve,
        note: expectedForm.note.trim(),
      });
      expectedVisible.value = false;
      Message.success(
        expectedForm.approve ? '期望报价已通过' : '期望报价已驳回'
      );
      await load();
    } catch (err) {
      Message.error(errorText(err, '复核失败：该期望报价可能已不在待审核状态'));
    } finally {
      expectedSubmitting.value = false;
    }
  }

  // ── 信用 / 追偿记载（§13.5）：罚则确认会给陪玩记责并暂停接单，故走二次确认。 ──
  const creditVisible = ref(false);
  const creditLoading = ref(false);
  const creditPlayer = ref<PlayerRow | null>(null);
  const creditEvents = ref<EsportsPlayerCreditEvent[]>([]);
  const creditStatusFilter = ref<PlayerCreditEventStatus>();

  const creditStatusLabels: Record<PlayerCreditEventStatus, string> = {
    recorded: '待复核',
    penalty_applied: '已确认责任',
    cleared: '已判定无责',
  };
  const creditStatusLabel = (value: PlayerCreditEventStatus) =>
    creditStatusLabels[value] || value;
  const creditStatusColor = (value: PlayerCreditEventStatus) => {
    if (value === 'penalty_applied') return 'red';
    if (value === 'cleared') return 'green';
    return 'orange';
  };

  async function loadCreditEvents() {
    const player = creditPlayer.value;
    if (!player) return;
    creditLoading.value = true;
    try {
      creditEvents.value =
        (
          await listPlayerCreditEvents({
            player_id: player.id,
            status: creditStatusFilter.value,
          })
        ).data.data || [];
    } catch (err) {
      creditEvents.value = [];
      Message.error(errorText(err, '加载信用记载失败，请稍后重试'));
    } finally {
      creditLoading.value = false;
    }
  }

  async function openCredit(player: PlayerRow) {
    creditPlayer.value = player;
    creditEvents.value = [];
    creditStatusFilter.value = undefined;
    creditVisible.value = true;
    await loadCreditEvents();
  }

  const creditReviewVisible = ref(false);
  const creditReviewSubmitting = ref(false);
  const creditTarget = ref<EsportsPlayerCreditEvent | null>(null);
  const creditReviewForm = reactive<{
    action: 'penalty' | 'clear';
    note: string;
  }>({ action: 'penalty', note: '' });

  function openCreditReview(
    record: EsportsPlayerCreditEvent,
    action: 'penalty' | 'clear'
  ) {
    creditTarget.value = record;
    creditReviewForm.action = action;
    creditReviewForm.note = '';
    creditReviewVisible.value = true;
  }

  async function submitCreditReview() {
    const target = creditTarget.value;
    if (!target) return;
    if (
      creditReviewForm.action === 'penalty' &&
      !creditReviewForm.note.trim()
    ) {
      Message.warning('确认责任须填写复核说明');
      return;
    }
    creditReviewSubmitting.value = true;
    try {
      await reviewPlayerCreditEvent(target.id, {
        action: creditReviewForm.action,
        note: creditReviewForm.note.trim(),
      });
      creditReviewVisible.value = false;
      Message.success('信用记载复核已完成');
      await Promise.all([loadCreditEvents(), load()]);
    } catch (err) {
      Message.error(errorText(err, '复核失败：该记载可能已被复核'));
    } finally {
      creditReviewSubmitting.value = false;
    }
  }

  // ── 档期可用性（§10.4-04）：from / to 走 RFC3339，后端按 slot_minutes 切格。 ──
  const availabilityVisible = ref(false);
  const availabilityLoading = ref(false);
  const availability = ref<PlayerAvailabilityView | null>(null);
  const availabilityRange = ref<string[]>([]);
  const availabilitySlotMinutes = ref(60);
  const availabilityPlayer = ref<PlayerRow | null>(null);

  const slotStatusLabels: Record<string, string> = {
    available: '空闲',
    occupied: '已占用',
  };
  const slotStatusLabel = (value: string) => slotStatusLabels[value] || value;

  // YYYY-MM-DD 按业务时区当天零点转 RFC3339；结束日取次日零点（半开区间包含整天）。
  function rangeToIso(value: string, endOfDay: boolean) {
    const date = new Date(`${value}T00:00:00+08:00`);
    if (endOfDay) date.setDate(date.getDate() + 1);
    return date.toISOString();
  }

  async function loadAvailability() {
    const player = availabilityPlayer.value;
    if (!player) return;
    const [from, to] = availabilityRange.value || [];
    availabilityLoading.value = true;
    try {
      availability.value =
        (
          await getPlayerAvailability(player.id, {
            from: from ? rangeToIso(from, false) : undefined,
            to: to ? rangeToIso(to, true) : undefined,
            slot_minutes: availabilitySlotMinutes.value,
          })
        ).data.data || null;
    } catch (err) {
      availability.value = null;
      Message.error(errorText(err, '加载档期失败，请检查时间区间是否合法'));
    } finally {
      availabilityLoading.value = false;
    }
  }

  function openAvailability(player: PlayerRow) {
    availabilityPlayer.value = player;
    availability.value = null;
    availabilityRange.value = [];
    availabilitySlotMinutes.value = 60;
    availabilityVisible.value = true;
    loadAvailability();
  }

  onMounted(load);

  onBeforeUnmount(() => {
    if (userCandidateTimer) clearTimeout(userCandidateTimer);
  });
</script>

<style scoped>
  .toolbar {
    margin-bottom: 16px;
  }

  .user-meta {
    color: var(--color-text-3);
    font-size: 12px;
  }

  .user-tip {
    display: block;
    margin-top: 4px;
  }
</style>
