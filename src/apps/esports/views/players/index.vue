<template>
  <div class="container page-container">
    <a-card class="general-card" title="陪玩">
      <a-space class="toolbar">
        <a-button :loading="loading" @click="load">刷新</a-button>
        <a-input-search
          v-model="keyword"
          placeholder="按昵称搜索"
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
          <a-table-column data-index="user_id" title="user_id" />
          <a-table-column data-index="display_name" title="昵称" />
          <a-table-column data-index="qualification" title="资格" />
          <a-table-column data-index="presence" title="在线状态" />
          <a-table-column data-index="version" title="版本" />
          <a-table-column title="操作">
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
        <a-form-item label="用户 ID（user_id）" required>
          <a-input-number v-model="createForm.userId" :min="1" />
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
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    createPlayer,
    getPlayerIdentity,
    listPlayers,
    reviewPlayerIdentity,
    updatePlayer,
  } from '../../api';
  import type {
    EsportsPlayer,
    PlayerIdentityView,
    PlayerPresence,
    PlayerQualification,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canManage = computed(() =>
    hasButtonPermission('esports:players:manage')
  );
  const canReviewIdentity = computed(() =>
    hasButtonPermission('esports:players:identity_review')
  );

  const loading = ref(false);
  const keyword = ref('');
  const players = ref<EsportsPlayer[]>([]);

  const createVisible = ref(false);
  const createForm = reactive({ userId: 1, displayName: '' });
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
      players.value = (await listPlayers(keyword.value)).data.data || [];
    } catch {
      Message.error('加载陪玩列表失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  function openCreate() {
    createForm.userId = 1;
    createForm.displayName = '';
    createVisible.value = true;
  }

  async function submitCreate() {
    if (createForm.userId < 1 || !createForm.displayName.trim()) {
      Message.warning('请填写有效的用户 ID 与昵称');
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
      Message.error('创建失败：用户 ID 已存在或参数无效');
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

  onMounted(load);
</script>

<style scoped>
  .toolbar {
    margin-bottom: 16px;
  }
</style>
