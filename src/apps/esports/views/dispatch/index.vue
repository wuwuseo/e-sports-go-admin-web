<template>
  <div class="container page-container">
    <a-card class="general-card" title="排单看板">
      <a-space class="toolbar">
        <a-button :loading="loading" @click="load()">刷新</a-button>
        <a-tag color="arcoblue">在线陪玩：{{ onlinePlayers }}</a-tag>
      </a-space>

      <a-tabs v-model:active-key="activeBucket">
        <a-tab-pane
          v-for="bucket in buckets"
          :key="bucket.key"
          :title="`${bucket.title}（${countOf(bucket.key)}）`"
        />
      </a-tabs>

      <a-table
        :data="currentOrders"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="order_no" title="订单号" />
          <a-table-column title="客户 / 商品">
            <template #cell="{ record }">
              <template v-if="maskedPoolIds.includes(record.id)"
                >*** / {{ record.sku_id }}</template
              >
              <template v-else
                >{{ record.customer_id }} / {{ record.sku_id }}</template
              >
            </template>
          </a-table-column>
          <a-table-column title="应付金额">
            <template #cell="{ record }">
              <template v-if="maskedPoolIds.includes(record.id)">***</template>
              <template v-else>{{ money(record.payable_cents) }}</template>
            </template>
          </a-table-column>
          <a-table-column data-index="fulfillment_status" title="履约状态" />
          <a-table-column title="优先通知">
            <template #cell="{ record }">
              <template v-if="record.priority_notice_status === 'pending'">
                <a-tag color="orangered"
                  >通知中 · 至
                  {{ fmtMinute(record.priority_notice_until) }}</a-tag
                >
              </template>
              <template
                v-else-if="record.priority_notice_status === 'accepted'"
              >
                <a-tag color="green">名单内已接单</a-tag>
              </template>
              <template
                v-else-if="record.priority_notice_status === 'released'"
              >
                <a-tag color="gray">已释放到大厅</a-tag>
              </template>
              <span v-else>—</span>
            </template>
          </a-table-column>
          <a-table-column title="会员优先" :width="100">
            <template #cell="{ record }">
              <a-tag v-if="memberPriorityIds.includes(record.id)" color="gold"
                >会员优先</a-tag
              >
              <span v-else>—</span>
            </template>
          </a-table-column>
          <a-table-column title="负责客服">
            <template #cell="{ record }">{{
              record.responsible_admin_id || '—'
            }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="300">
            <template #cell="{ record }">
              <a-button type="text" @click="openSeats(record)">席位</a-button>
              <a-button
                v-if="record.priority_notice_status !== 'none'"
                type="text"
                @click="openNotices(record)"
                >通知明细</a-button
              >
              <template v-if="canOperate">
                <a-button
                  v-if="
                    record.fulfillment_status === 'pending_dispatch' &&
                    !record.responsible_admin_id
                  "
                  type="text"
                  status="success"
                  @click="handleClaim(record)"
                  >认领</a-button
                >
                <a-button type="text" @click="openAssign(record)"
                  >指派</a-button
                >
                <a-button
                  v-if="record.priority_notice_status === 'pending'"
                  type="text"
                  status="danger"
                  @click="handleReleasePriority(record)"
                  >释放到大厅</a-button
                >
                <a-button
                  v-if="
                    record.fulfillment_status === 'pending_dispatch' &&
                    record.priority_notice_status !== 'pending' &&
                    record.required_seats === 1
                  "
                  type="text"
                  status="warning"
                  @click="handlePublishGrab(record)"
                  >发布抢单</a-button
                >
                <a-button type="text" @click="openTransfer(record)"
                  >转单</a-button
                >
                <a-button type="text" @click="openRemind(record)"
                  >催单</a-button
                >
              </template>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card card-block" title="优先派单权（§5.4）">
      <a-space class="toolbar" wrap>
        <a-input
          v-model="priorityFilters.game"
          placeholder="游戏分区"
          :style="{ width: '180px' }"
        />
        <a-select
          v-model="priorityFilters.status"
          placeholder="状态"
          allow-clear
          :style="{ width: '140px' }"
        >
          <a-option
            v-for="option in priorityStatusOptions"
            :key="option.value"
            :value="option.value"
            >{{ option.label }}</a-option
          >
        </a-select>
        <a-button :loading="priorityLoading" @click="loadPriority"
          >查询</a-button
        >
        <a-button v-if="canOperate" type="primary" @click="openPriorityGrant"
          >授予优先派单权</a-button
        >
      </a-space>
      <a-typography-text type="secondary" class="toolbar">
        订单进入待派单时只通知本游戏分区名单内的陪玩，**其他人看不到该单**；名单内全部拒绝或超过通知时长（
        <code>app.esports.dispatch_priority_notice_minutes</code>
        ）后订单才释放到抢单大厅给所有人抢。每游戏每期名额上限取
        <code>app.esports.dispatch_priority_quota</code>，周期重算任务
        <code>esports_rebuild_dispatch_priority</code>，超时释放任务
        <code>esports_expire_dispatch_priority_notice</code>。
      </a-typography-text>
      <a-table
        :data="priorityGrants"
        :loading="priorityLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column data-index="game" title="游戏分区" />
          <a-table-column data-index="player_id" title="陪玩" :width="80" />
          <a-table-column data-index="period" title="周期" :width="100" />
          <a-table-column title="生效区间">
            <template #cell="{ record }"
              >{{ fmtMinute(record.period_start) }} ~
              {{ fmtMinute(record.period_end) }}</template
            >
          </a-table-column>
          <a-table-column data-index="rank" title="排名" :width="70" />
          <a-table-column title="获得方式">
            <template #cell="{ record }">{{
              prioritySourceLabel(record.source)
            }}</template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="priorityStatusColor(record.status)">{{
                priorityStatusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column data-index="note" title="备注" />
          <a-table-column title="操作" :width="100">
            <template #cell="{ record }">
              <a-button
                v-if="
                  canOperate &&
                  (record.status === 'active' || record.status === 'pending')
                "
                type="text"
                status="danger"
                @click="openPriorityRevoke(record)"
                >移出名单</a-button
              >
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card card-block" title="陪玩转单申请（§5.7）">
      <a-space class="toolbar" wrap>
        <a-select
          v-model="transferFilters.status"
          placeholder="状态"
          allow-clear
          :style="{ width: '160px' }"
        >
          <a-option
            v-for="option in transferStatusOptions"
            :key="option.value"
            :value="option.value"
            >{{ option.label }}</a-option
          >
        </a-select>
        <a-button :loading="transfersLoading" @click="loadTransfers"
          >查询</a-button
        >
      </a-space>
      <a-typography-text type="secondary" class="toolbar">
        陪玩接单后未开始服务时方可发起转单；**确认前席位与订单状态都不变**，确认通过才释放该席位为待补位。
        已开始服务的转单属售后补履约范畴，不在此处理。
      </a-typography-text>
      <a-table
        :data="transfers"
        :loading="transfersLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column data-index="order_id" title="订单" :width="90" />
          <a-table-column data-index="seat_index" title="席位" :width="70" />
          <a-table-column data-index="player_id" title="陪玩" :width="80" />
          <a-table-column data-index="reason" title="转单原因" />
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="transferStatusColor(record.status)">{{
                transferStatusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="处理时间">
            <template #cell="{ record }">{{
              fmtMinute(record.decided_at)
            }}</template>
          </a-table-column>
          <a-table-column data-index="decision_note" title="处理备注" />
          <a-table-column title="操作" :width="140">
            <template #cell="{ record }">
              <template v-if="canOperate && record.status === 'pending'">
                <a-button
                  type="text"
                  status="success"
                  @click="doDecideTransfer(record, true)"
                  >通过</a-button
                >
                <a-button
                  type="text"
                  status="danger"
                  @click="openTransferReject(record)"
                  >驳回</a-button
                >
              </template>
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-drawer
      v-model:visible="seatsVisible"
      :title="`订单 ${seatOrder?.order_no || ''} 的席位`"
      width="720px"
      :footer="false"
    >
      <a-space
        v-if="canOperate && (seatOrder?.required_seats ?? 0) > 1"
        class="toolbar"
      >
        <a-button type="primary" @click="openTeamDispatch">固排成队</a-button>
        <a-typography-text type="secondary">
          勾选主陪玩及其固排，一次占满空席位（按席位序依次邀请）
        </a-typography-text>
      </a-space>
      <a-table
        :data="seats"
        :loading="seatsLoading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="seat_index" title="席位" />
          <a-table-column title="陪玩 ID">
            <template #cell="{ record }">{{
              record.player_id || '—'
            }}</template>
          </a-table-column>
          <a-table-column data-index="source" title="来源" />
          <a-table-column data-index="status" title="状态" />
          <a-table-column title="邀请过期">
            <template #cell="{ record }">{{
              record.expires_at || '—'
            }}</template>
          </a-table-column>
          <a-table-column title="回应时间">
            <template #cell="{ record }">{{
              record.responded_at || '—'
            }}</template>
          </a-table-column>
          <a-table-column title="操作">
            <template #cell="{ record }">
              <a-button
                v-if="canOperate && record.status === 'invited'"
                type="text"
                status="danger"
                @click="openRevoke(record)"
                >撤回</a-button
              >
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-drawer>

    <a-modal
      v-model:visible="teamVisible"
      title="固排成队"
      :ok-button-props="{ disabled: teamSelected.length === 0 }"
      @ok="submitTeamDispatch"
      @cancel="closeTeamDispatch"
    >
      <a-form :model="teamForm" layout="vertical">
        <a-form-item label="主陪玩档案 ID" required>
          <a-space>
            <a-input-number v-model="teamForm.mainPlayerId" :min="1" />
            <a-button type="outline" @click="loadTeamCandidates"
              >加载固排</a-button
            >
          </a-space>
        </a-form-item>
        <a-form-item v-if="teamCandidatesLoaded">
          <a-typography-text v-if="teamCandidates.length === 0" type="secondary"
            >该主陪玩在本单无可成队的固排（须已建立固排且资格/在线/分区/等级满足）</a-typography-text
          >
          <a-checkbox-group v-else v-model="teamSelected">
            <a-checkbox
              v-for="c in teamCandidates"
              :key="c.player_id"
              :value="c.player_id"
            >
              {{ c.display_name }}（{{ levelLabel(c.level) }} ·
              {{ presenceLabel(c.presence) }}）
            </a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:visible="noticesVisible"
      :title="`订单 ${noticeOrder?.order_no || ''} 的优先通知`"
      width="560px"
      :footer="false"
    >
      <a-descriptions :column="1" size="small" bordered class="toolbar">
        <a-descriptions-item label="游戏分区">{{
          noticeOrder?.priority_game || '—'
        }}</a-descriptions-item>
        <a-descriptions-item label="通知截止">{{
          fmtMinute(noticeOrder?.priority_notice_until)
        }}</a-descriptions-item>
        <a-descriptions-item label="释放原因">{{
          noticeOrder?.priority_release_reason || '—'
        }}</a-descriptions-item>
      </a-descriptions>
      <a-table
        :data="notices"
        :loading="noticesLoading"
        row-key="id"
        :pagination="false"
      >
        <template #columns>
          <a-table-column data-index="player_id" title="陪玩" :width="80" />
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="noticeStatusColor(record.status)">{{
                noticeStatusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="通知时间">
            <template #cell="{ record }">{{
              fmtMinute(record.notified_at)
            }}</template>
          </a-table-column>
          <a-table-column title="回应时间">
            <template #cell="{ record }">{{
              fmtMinute(record.responded_at)
            }}</template>
          </a-table-column>
          <a-table-column data-index="decline_reason" title="拒绝原因" />
        </template>
      </a-table>
    </a-drawer>

    <a-modal
      v-model:visible="assignVisible"
      title="指派席位"
      @ok="submitAssign"
    >
      <a-form :model="assignForm">
        <a-form-item label="席位序号" required>
          <a-input-number v-model="assignForm.seatIndex" :min="1" />
        </a-form-item>
        <a-form-item label="陪玩档案 ID" required>
          <a-input-number v-model="assignForm.playerId" :min="1" />
        </a-form-item>
        <a-form-item label="候选推荐（§5.5）">
          <a-space direction="vertical" fill>
            <a-space>
              <a-input-number
                v-model="preferredPlayerId"
                placeholder="指定陪玩 ID（可空）"
                :min="0"
              />
              <a-button :loading="candidatesLoading" @click="loadCandidates"
                >按规则排序</a-button
              >
            </a-space>
            <a-table
              v-if="candidates.length"
              :data="candidates"
              size="small"
              row-key="player_id"
              :pagination="false"
            >
              <template #columns>
                <a-table-column title="陪玩">
                  <template #cell="{ record }">
                    {{ record.player_id }} · {{ record.display_name }}
                    <a-tag v-if="record.preferred" size="small" color="arcoblue"
                      >指定</a-tag
                    >
                    <a-tag
                      v-if="record.from_priority_notice"
                      size="small"
                      color="orangered"
                      >优先通知内</a-tag
                    >
                  </template>
                </a-table-column>
                <a-table-column title="评分">
                  <template #cell="{ record }">{{
                    record.rating_insufficient
                      ? '样本不足'
                      : record.rating_average.toFixed(1)
                  }}</template>
                </a-table-column>
                <a-table-column title="在途席位">
                  <template #cell="{ record }">{{
                    record.active_seats
                  }}</template>
                </a-table-column>
                <a-table-column title="选择" :width="80">
                  <template #cell="{ record }">
                    <a-button
                      type="text"
                      @click="assignForm.playerId = record.player_id"
                      >填入</a-button
                    >
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </a-space>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="revokeVisible"
      title="撤回席位邀请"
      @ok="submitRevoke"
    >
      <a-form :model="revokeForm">
        <a-form-item label="撤回原因（必填）" required>
          <a-textarea v-model="revokeForm.reason" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="transferVisible"
      title="转单"
      @ok="submitTransfer"
    >
      <a-form :model="transferForm">
        <a-form-item label="目标客服 ID" required>
          <a-input-number v-model="transferForm.toAdminId" :min="1" />
        </a-form-item>
        <a-form-item label="转单原因（必填）" required>
          <a-textarea v-model="transferForm.reason" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="remindVisible" title="催单" @ok="submitRemind">
      <a-form :model="remindForm">
        <a-form-item label="催单级别" required>
          <a-radio-group v-model="remindForm.level">
            <a-radio :value="1">一级</a-radio>
            <a-radio :value="2">二级</a-radio>
            <a-radio :value="3">三级</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model="remindForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="priorityGrantVisible"
      title="授予优先派单权"
      @ok="submitPriorityGrant"
      @cancel="priorityGrantVisible = false"
    >
      <a-form :model="priorityGrantForm">
        <a-form-item label="游戏分区" required>
          <a-input v-model="priorityGrantForm.game" :max-length="64" />
        </a-form-item>
        <a-form-item label="陪玩档案 ID" required>
          <a-input-number v-model="priorityGrantForm.playerId" :min="1" />
        </a-form-item>
        <a-form-item label="周期" required>
          <a-select v-model="priorityGrantForm.period">
            <a-option value="daily">日</a-option>
            <a-option value="weekly">周</a-option>
            <a-option value="biweekly">半月</a-option>
            <a-option value="monthly">月</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="获得方式" required>
          <a-select v-model="priorityGrantForm.source">
            <a-option value="manual">人工指定</a-option>
            <a-option value="ranking">排名制</a-option>
            <a-option value="points">积分制</a-option>
            <a-option value="threshold">达标制</a-option>
            <a-option value="rotation">轮换制</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="名单排名（越小越靠前）">
          <a-input-number v-model="priorityGrantForm.rank" :min="0" />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model="priorityGrantForm.nextPeriod"
            >预生成下一期名单</a-checkbox
          >
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="priorityGrantForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="priorityRevokeVisible"
      title="移出优先派单权名单"
      @ok="submitPriorityRevoke"
      @cancel="priorityRevokeVisible = false"
    >
      <a-form :model="priorityRevokeForm">
        <a-form-item label="移出原因" required>
          <a-textarea v-model="priorityRevokeForm.reason" :max-length="255" />
        </a-form-item>
        <a-typography-text type="secondary">
          移出后名额立即释放，可录入他人；本期剩余时间该陪玩不再享受派单排序加权。
        </a-typography-text>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="transferRejectVisible"
      title="驳回转单申请"
      @ok="submitTransferReject"
      @cancel="transferRejectVisible = false"
    >
      <a-form :model="transferRejectForm">
        <a-form-item label="驳回原因" required>
          <a-textarea v-model="transferRejectForm.note" :max-length="255" />
        </a-form-item>
        <a-typography-text type="secondary">
          驳回后席位与订单状态都不变，该陪玩仍需履约；如需强制撤单请用「席位 →
          撤回」。
        </a-typography-text>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    assignOrderSeat,
    claimOrder,
    getDispatchBoard,
    getDispatchCandidates,
    getTeammateCandidates,
    decideSeatTransfer,
    grantDispatchPriority,
    listDispatchPriority,
    listOrderPriorityNotices,
    listOrderSeats,
    listSeatTransfers,
    publishOrderToGrabHall,
    releaseOrderPriority,
    remindOrder,
    revokeDispatchPriority,
    revokeOrderSeat,
    teamDispatch,
    transferOrder,
  } from '../../api';
  import type {
    DispatchCandidate,
    DispatchPriorityGrant,
    DispatchPriorityNotice,
    DispatchPriorityPeriod,
    DispatchPrioritySource,
    DispatchPriorityStatus,
    PriorityNoticeItemStatus,
    SeatTransferRequest,
    SeatTransferStatus,
    TeammateDispatchCandidate,
    EsportsDispatchBoard,
    EsportsDispatchSeat,
    EsportsOrder,
  } from '../../api';

  // 看板订单附带后端返回的负责客服字段。
  type DispatchOrder = EsportsOrder & { responsible_admin_id?: number | null };

  type BucketKey =
    | 'pending_dispatch'
    | 'public_pool'
    | 'grabbing'
    | 'pending_acceptance'
    | 'accepted'
    | 'in_service'
    | 'pending_close'
    | 'abnormal';

  const buckets: Array<{ key: BucketKey; title: string }> = [
    { key: 'pending_dispatch', title: '待派单池' },
    { key: 'public_pool', title: '公共池' },
    { key: 'grabbing', title: '抢单中' },
    { key: 'pending_acceptance', title: '待接单' },
    { key: 'accepted', title: '已接单' },
    { key: 'in_service', title: '服务中' },
    { key: 'pending_close', title: '待结单' },
    { key: 'abnormal', title: '异常' },
  ];

  const { hasButtonPermission } = usePermission();
  const canOperate = computed(() =>
    hasButtonPermission('esports:dispatch:operate')
  );

  const loading = ref(false);
  const board = ref<EsportsDispatchBoard | null>(null);

  async function load(silent = false) {
    loading.value = true;
    try {
      board.value = (await getDispatchBoard()).data.data || null;
    } catch {
      if (!silent) Message.error('加载看板失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  // 会员订单优先（§10.4）：后端已把会员订单置顶，这里只做标记展示。
  const memberPriorityIds = computed(
    () => board.value?.member_priority_order_ids ?? []
  );
  // 公共池脱敏（§5.1 / §8.2）：非超管在公共池看到的订单已被后端掩码客户身份与金额。
  const maskedPoolIds = computed(
    () => board.value?.masked_public_pool_ids ?? []
  );
  const activeBucket = ref<BucketKey>('pending_dispatch');
  const seatsVisible = ref(false);
  const seatsLoading = ref(false);
  const seats = ref<EsportsDispatchSeat[]>([]);
  const seatOrder = ref<DispatchOrder | null>(null);
  const activeOrder = ref<DispatchOrder | null>(null);
  const activeSeat = ref<EsportsDispatchSeat | null>(null);

  const pad = (value: number) => String(value).padStart(2, '0');
  const fmtMinute = (value: string | null | undefined) => {
    if (!value) return '—';
    const d = new Date(value);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  // ── 派单候选（§5.5 首版） ──
  const candidates = ref<DispatchCandidate[]>([]);
  const candidatesLoading = ref(false);
  const preferredPlayerId = ref<number>(0);

  async function loadCandidates() {
    const order = activeOrder.value;
    if (!order) return;
    candidatesLoading.value = true;
    try {
      candidates.value =
        (
          await getDispatchCandidates(
            order.id,
            preferredPlayerId.value || undefined
          )
        ).data.data?.candidates || [];
      if (!candidates.value.length) {
        Message.info('当前没有满足硬性条件的候选陪玩');
      }
    } catch (err) {
      Message.error(errorText(err, '加载派单候选失败'));
    } finally {
      candidatesLoading.value = false;
    }
  }

  // ── 优先派单权（§5.4） ──
  const priorityGrants = ref<DispatchPriorityGrant[]>([]);
  const priorityLoading = ref(false);
  const priorityFilters = reactive<{
    game: string;
    status?: DispatchPriorityStatus;
  }>({ game: '' });
  const priorityStatusOptions: {
    value: DispatchPriorityStatus;
    label: string;
  }[] = [
    { value: 'pending', label: '待生效' },
    { value: 'active', label: '生效中' },
    { value: 'revoked', label: '已移出' },
    { value: 'expired', label: '已过期' },
  ];
  const prioritySourceMap: Record<DispatchPrioritySource, string> = {
    manual: '人工指定',
    ranking: '排名制',
    points: '积分制',
    threshold: '达标制',
    rotation: '轮换制',
  };
  const priorityStatusLabel = (value: DispatchPriorityStatus) =>
    priorityStatusOptions.find((option) => option.value === value)?.label ||
    value;
  const prioritySourceLabel = (value: DispatchPrioritySource) =>
    prioritySourceMap[value] || value;
  const priorityStatusColor = (value: DispatchPriorityStatus) => {
    switch (value) {
      case 'active':
        return 'green';
      case 'pending':
        return 'arcoblue';
      case 'revoked':
        return 'orangered';
      default:
        return 'gray';
    }
  };

  async function loadPriority() {
    priorityLoading.value = true;
    try {
      priorityGrants.value =
        (
          await listDispatchPriority({
            game: priorityFilters.game || undefined,
            status: priorityFilters.status || undefined,
          })
        ).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载优先派单权名单失败'));
    } finally {
      priorityLoading.value = false;
    }
  }

  const priorityGrantVisible = ref(false);
  const priorityGrantForm = reactive<{
    game: string;
    playerId: number;
    period: DispatchPriorityPeriod;
    source: DispatchPrioritySource;
    rank: number;
    nextPeriod: boolean;
    note: string;
  }>({
    game: '',
    playerId: 1,
    period: 'weekly',
    source: 'manual',
    rank: 0,
    nextPeriod: false,
    note: '',
  });

  function openPriorityGrant() {
    priorityGrantForm.game = priorityFilters.game || '';
    priorityGrantForm.playerId = 1;
    priorityGrantForm.period = 'weekly';
    priorityGrantForm.source = 'manual';
    priorityGrantForm.rank = 0;
    priorityGrantForm.nextPeriod = false;
    priorityGrantForm.note = '';
    priorityGrantVisible.value = true;
  }

  async function submitPriorityGrant() {
    if (!priorityGrantForm.game || priorityGrantForm.playerId < 1) {
      Message.warning('请填写游戏分区与陪玩档案 ID');
      return;
    }
    try {
      await grantDispatchPriority({
        game: priorityGrantForm.game,
        player_id: priorityGrantForm.playerId,
        period: priorityGrantForm.period,
        source: priorityGrantForm.source,
        rank: priorityGrantForm.rank,
        next_period: priorityGrantForm.nextPeriod,
        note: priorityGrantForm.note,
      });
      priorityGrantVisible.value = false;
      Message.success('已录入优先派单权名单');
      await loadPriority();
    } catch (err) {
      Message.error(errorText(err, '录入失败：名额已满或该陪玩本期已在名单中'));
    }
  }

  const priorityRevokeVisible = ref(false);
  const priorityRevokeForm = reactive({ id: 0, reason: '' });

  function openPriorityRevoke(record: DispatchPriorityGrant) {
    priorityRevokeForm.id = record.id;
    priorityRevokeForm.reason = '';
    priorityRevokeVisible.value = true;
  }

  async function submitPriorityRevoke() {
    if (!priorityRevokeForm.reason) {
      Message.warning('请填写移出原因');
      return;
    }
    try {
      await revokeDispatchPriority(
        priorityRevokeForm.id,
        priorityRevokeForm.reason
      );
      priorityRevokeVisible.value = false;
      Message.success('已移出名单');
      await loadPriority();
    } catch (err) {
      Message.error(errorText(err, '移出失败：状态已变化'));
    }
  }

  // ── 独占优先通知窗口（§5.4 业务口径） ──
  const noticesVisible = ref(false);
  const noticesLoading = ref(false);
  const notices = ref<DispatchPriorityNotice[]>([]);
  const noticeOrder = ref<DispatchOrder | null>(null);
  const noticeStatusOptions: {
    value: PriorityNoticeItemStatus;
    label: string;
  }[] = [
    { value: 'notified', label: '待回应' },
    { value: 'accepted', label: '已接单' },
    { value: 'declined', label: '已拒绝' },
    { value: 'expired', label: '已作废' },
  ];
  const noticeStatusLabel = (value: PriorityNoticeItemStatus) =>
    noticeStatusOptions.find((option) => option.value === value)?.label ||
    value;
  const noticeStatusColor = (value: PriorityNoticeItemStatus) => {
    switch (value) {
      case 'notified':
        return 'orangered';
      case 'accepted':
        return 'green';
      case 'declined':
        return 'red';
      default:
        return 'gray';
    }
  };

  async function openNotices(order: DispatchOrder) {
    noticeOrder.value = order;
    notices.value = [];
    noticesVisible.value = true;
    noticesLoading.value = true;
    try {
      notices.value =
        (await listOrderPriorityNotices(order.id)).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载优先通知明细失败'));
    } finally {
      noticesLoading.value = false;
    }
  }

  // ── 陪玩转单（§5.7） ──
  const transfers = ref<SeatTransferRequest[]>([]);
  const transfersLoading = ref(false);
  const transferFilters = reactive<{ status?: SeatTransferStatus }>({});
  const transferStatusOptions: { value: SeatTransferStatus; label: string }[] =
    [
      { value: 'pending', label: '待确认' },
      { value: 'approved', label: '已通过' },
      { value: 'rejected', label: '已驳回' },
      { value: 'cancelled', label: '已撤回' },
    ];
  const transferStatusLabel = (value: SeatTransferStatus) =>
    transferStatusOptions.find((option) => option.value === value)?.label ||
    value;
  const transferStatusColor = (value: SeatTransferStatus) => {
    switch (value) {
      case 'pending':
        return 'orangered';
      case 'approved':
        return 'green';
      case 'rejected':
        return 'red';
      default:
        return 'gray';
    }
  };

  async function loadTransfers() {
    transfersLoading.value = true;
    try {
      transfers.value =
        (
          await listSeatTransfers({
            status: transferFilters.status || undefined,
          })
        ).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载转单申请失败'));
    } finally {
      transfersLoading.value = false;
    }
  }

  async function doDecideTransfer(
    record: SeatTransferRequest,
    approve: boolean
  ) {
    try {
      await decideSeatTransfer(record.id, approve);
      Message.success(
        approve ? '已通过转单，席位已释放为待补位' : '已驳回转单'
      );
      await loadTransfers();
      await load();
    } catch (err) {
      Message.error(errorText(err, '处理失败：状态已变化或席位已不可转'));
    }
  }

  const transferRejectVisible = ref(false);
  const transferRejectForm = reactive({ id: 0, note: '' });

  function openTransferReject(record: SeatTransferRequest) {
    transferRejectForm.id = record.id;
    transferRejectForm.note = '';
    transferRejectVisible.value = true;
  }

  async function submitTransferReject() {
    if (!transferRejectForm.note) {
      Message.warning('请填写驳回原因');
      return;
    }
    try {
      await decideSeatTransfer(
        transferRejectForm.id,
        false,
        transferRejectForm.note
      );
      transferRejectVisible.value = false;
      Message.success('已驳回转单');
      await loadTransfers();
    } catch (err) {
      Message.error(errorText(err, '驳回失败：状态已变化'));
    }
  }

  const assignVisible = ref(false);
  const assignForm = reactive({ seatIndex: 1, playerId: 1 });
  // 固排成队（§5.3）
  const teamVisible = ref(false);
  const teamForm = reactive({ mainPlayerId: 1 });
  const teamCandidates = ref<TeammateDispatchCandidate[]>([]);
  const teamSelected = ref<number[]>([]);
  const teamCandidatesLoaded = ref(false);
  const revokeVisible = ref(false);
  const revokeForm = reactive({ reason: '' });
  const transferVisible = ref(false);
  const transferForm = reactive({ toAdminId: 1, reason: '' });
  const remindVisible = ref(false);
  const remindForm = reactive({ level: 1, note: '' });

  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  const onlinePlayers = computed(() => board.value?.online_players ?? 0);
  const currentOrders = computed<DispatchOrder[]>(
    () => board.value?.[activeBucket.value] || []
  );
  const countOf = (key: BucketKey) => board.value?.[key]?.length ?? 0;

  // 客服提前释放到大厅：名单仍未回应时也可以立即对所有人开放。
  async function handleReleasePriority(order: DispatchOrder) {
    try {
      await releaseOrderPriority(order.id, '客服提前释放');
      Message.success('已释放到抢单大厅');
      await load();
    } catch (err) {
      Message.error(errorText(err, '释放失败：窗口已结束或状态已变化'));
    }
  }

  // 发布到抢单大厅（§5.2 / §5.6）：没有优先名单的游戏分区由此对全部陪玩开放。
  async function handlePublishGrab(order: DispatchOrder) {
    try {
      await publishOrderToGrabHall(order.id, '客服发布到抢单大厅');
      Message.success('已发布到抢单大厅');
      await load();
    } catch (err) {
      Message.error(
        errorText(err, '发布失败：仅已付款待派单的单陪玩订单可发布')
      );
    }
  }

  async function openSeats(order: DispatchOrder) {
    seatOrder.value = order;
    seatsVisible.value = true;
    seatsLoading.value = true;
    try {
      seats.value = (await listOrderSeats(order.id)).data.data || [];
    } catch {
      Message.error('无法获取席位信息');
    } finally {
      seatsLoading.value = false;
    }
  }

  async function reloadSeats() {
    if (seatOrder.value) await openSeats(seatOrder.value);
  }

  function openTeamDispatch() {
    teamForm.mainPlayerId = 1;
    teamCandidates.value = [];
    teamSelected.value = [];
    teamCandidatesLoaded.value = false;
    teamVisible.value = true;
  }

  async function loadTeamCandidates() {
    const order = seatOrder.value;
    if (!order) return;
    if (teamForm.mainPlayerId < 1) {
      Message.warning('请填写有效的主陪玩档案 ID');
      return;
    }
    try {
      teamCandidates.value =
        (await getTeammateCandidates(order.id, teamForm.mainPlayerId)).data
          .data || [];
      teamSelected.value = [];
      teamCandidatesLoaded.value = true;
    } catch {
      Message.error('加载固排失败：订单状态已变化或主陪玩无效');
    }
  }

  async function submitTeamDispatch() {
    const order = seatOrder.value;
    if (!order) return;
    if (teamForm.mainPlayerId < 1) {
      Message.warning('请填写有效的主陪玩档案 ID');
      return;
    }
    try {
      await teamDispatch(order.id, teamForm.mainPlayerId, teamSelected.value);
      teamVisible.value = false;
      Message.success('已一次成队并发出邀请');
      await reloadSeats();
      await load();
    } catch (err) {
      Message.error(errorText(err, '成队失败：固排关系、资格或空席位不足'));
    }
  }

  function closeTeamDispatch() {
    teamCandidates.value = [];
    teamSelected.value = [];
    teamCandidatesLoaded.value = false;
  }

  const levelLabel = (level: string) =>
    ({ novice: '新手', skilled: '熟练', senior: '资深', mentor: '导师' }[
      level
    ] || level);
  const presenceLabel = (presence: string) =>
    presence === 'online' ? '在线' : '离线';

  function openAssign(order: DispatchOrder) {
    activeOrder.value = order;
    assignForm.seatIndex = 1;
    assignForm.playerId = 1;
    candidates.value = [];
    preferredPlayerId.value = 0;
    assignVisible.value = true;
  }

  async function submitAssign() {
    const order = activeOrder.value;
    if (!order) return;
    if (assignForm.playerId < 1 || assignForm.seatIndex < 1) {
      Message.warning('请填写有效的席位序号与陪玩 ID');
      return;
    }
    try {
      await assignOrderSeat(
        order.id,
        assignForm.seatIndex,
        assignForm.playerId
      );
      assignVisible.value = false;
      Message.success('已指派并发出邀请');
      await load();
    } catch {
      Message.error('指派失败：陪玩资格不符、席位不可用或订单状态已变化');
    }
  }

  function openRevoke(seat: EsportsDispatchSeat) {
    activeSeat.value = seat;
    revokeForm.reason = '';
    revokeVisible.value = true;
  }

  async function submitRevoke() {
    const seat = activeSeat.value;
    if (!seat) return;
    if (!revokeForm.reason.trim()) {
      Message.warning('请填写撤回原因');
      return;
    }
    try {
      await revokeOrderSeat(
        seat.order_id,
        seat.seat_index,
        revokeForm.reason.trim()
      );
      revokeVisible.value = false;
      Message.success('已撤回邀请');
      await reloadSeats();
      await load();
    } catch {
      Message.error('撤回失败：席位状态已变化');
    }
  }

  async function handleClaim(order: DispatchOrder) {
    try {
      await claimOrder(order.id);
      Message.success('已认领订单');
      await load();
    } catch {
      Message.error('认领失败：订单已被他人认领');
    }
  }

  function openTransfer(order: DispatchOrder) {
    activeOrder.value = order;
    transferForm.toAdminId = 1;
    transferForm.reason = '';
    transferVisible.value = true;
  }

  async function submitTransfer() {
    const order = activeOrder.value;
    if (!order) return;
    if (transferForm.toAdminId < 1 || !transferForm.reason.trim()) {
      Message.warning('请填写目标客服与转单原因');
      return;
    }
    try {
      await transferOrder(
        order.id,
        transferForm.toAdminId,
        transferForm.reason.trim()
      );
      transferVisible.value = false;
      Message.success('已转单');
      await load();
    } catch {
      Message.error('转单失败：订单已结束或状态已变化');
    }
  }

  function openRemind(order: DispatchOrder) {
    activeOrder.value = order;
    remindForm.level = 1;
    remindForm.note = '';
    remindVisible.value = true;
  }

  async function submitRemind() {
    const order = activeOrder.value;
    if (!order) return;
    try {
      await remindOrder(order.id, remindForm.level, remindForm.note.trim());
      remindVisible.value = false;
      Message.success('已催单');
    } catch {
      Message.error('催单失败：订单已结束或备注过长');
    }
  }

  let refreshTimer: ReturnType<typeof setInterval> | undefined;
  onMounted(async () => {
    await load();
    await loadPriority();
    await loadTransfers();
    refreshTimer = setInterval(() => {
      if (!loading.value && document.visibilityState === 'visible') {
        load(true);
      }
    }, 15_000);
  });
  onUnmounted(() => {
    if (refreshTimer) clearInterval(refreshTimer);
  });
</script>

<style scoped>
  .card-block {
    margin-top: 16px;
  }

  .toolbar {
    margin-bottom: 16px;
  }
</style>
