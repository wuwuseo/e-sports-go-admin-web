<template>
  <div class="container page-container">
    <a-tabs v-model:active-key="mainTab">
      <a-tab-pane key="board" title="派单看板">
        <a-card class="general-card" title="排单看板">
          <a-space class="toolbar" wrap>
            <a-button :loading="loading" @click="load()">刷新</a-button>
            <a-tag color="arcoblue">在线陪玩：{{ onlinePlayers }}</a-tag>
            <a-checkbox v-model="remindPrioritySort" @change="toggleRemindSort"
              >按催单优先级排序</a-checkbox
            >
            <a-typography-text type="secondary" class="hint"
              >状态变更后看板每 5 秒自动刷新一次</a-typography-text
            >
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
                    >*** / {{ record.product_name || '未知商品' }}</template
                  >
                  <template v-else
                    >{{ record.customer_id }} /
                    {{ record.product_name || '未知商品' }}</template
                  >
                </template>
              </a-table-column>
              <a-table-column title="应付金额">
                <template #cell="{ record }">
                  <template v-if="maskedPoolIds.includes(record.id)"
                    >***</template
                  >
                  <template v-else>{{ money(record.payable_cents) }}</template>
                </template>
              </a-table-column>
              <a-table-column title="履约状态">
                <template #cell="{ record }">{{
                  fulfillmentStatusText(record.fulfillment_status)
                }}</template>
              </a-table-column>
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
                  <a-tag
                    v-if="memberPriorityIds.includes(record.id)"
                    color="gold"
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
              <a-table-column title="操作" :width="380">
                <template #cell="{ record }">
                  <a-button type="text" @click="openSeats(record)"
                    >席位</a-button
                  >
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
                    <a-button
                      v-if="record.fulfillment_status === 'pending_close'"
                      type="text"
                      status="success"
                      @click="handleApproveClose(record)"
                      >复核结单</a-button
                    >
                    <a-button
                      v-if="record.fulfillment_status === 'pending_close'"
                      type="text"
                      status="danger"
                      @click="openCloseReject(record)"
                      >驳回结单</a-button
                    >
                    <a-button
                      v-if="record.fulfillment_status === 'in_service'"
                      type="text"
                      status="warning"
                      @click="openAddon(record)"
                      >加钟</a-button
                    >
                  </template>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-card>

        <a-card class="general-card card-block" title="客服坐班状态">
          <a-space class="toolbar" wrap>
            <a-select
              v-model="presenceForm.presence"
              :style="{ width: '140px' }"
              :disabled="!canWritePresence"
              placeholder="坐班状态"
            >
              <a-option
                v-for="option in csPresenceOptions"
                :key="option.value"
                :value="option.value"
                >{{ option.label }}</a-option
              >
            </a-select>
            <a-select
              v-if="isSuperAdmin"
              v-model="presenceForm.adminId"
              :style="{ width: '180px' }"
              placeholder="代打点客服（留空即本人）"
              allow-clear
            >
              <a-option
                v-for="admin in presences?.admins || []"
                :key="admin.admin_id"
                :value="admin.admin_id"
                >{{ admin.nickname || admin.username }}</a-option
              >
            </a-select>
            <a-popconfirm
              v-if="canWritePresence"
              :content="`确认把${presenceTargetLabel}的坐班状态改为「${csPresenceLabel(
                presenceForm.presence
              )}」？`"
              @ok="submitPresence"
            >
              <a-button type="primary" :loading="presenceSaving"
                >更新坐班状态</a-button
              >
            </a-popconfirm>
            <a-button :loading="presencesLoading" @click="loadPresences"
              >刷新在线状态</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="toolbar">
            在线状态以 presence 表为权威，超过
            {{ presences?.offline_timeout_minutes ?? '—' }}
            分钟无活动按离线口径展示；只有超管可代他人打点，客服只能改本人状态。
            人工置为离线后**不会被下一次心跳自动改回在线**（自动上线只对心跳超时被动下线的陪玩生效）。
          </a-typography-text>
          <a-space class="toolbar" wrap>
            <a-tag
              v-for="admin in presences?.admins || []"
              :key="admin.admin_id"
              :color="csPresenceColor(admin.presence)"
              >{{ admin.nickname || admin.username }} ·
              {{ csPresenceLabel(admin.presence) }}</a-tag
            >
            <a-typography-text
              v-if="!(presences?.admins || []).length"
              type="secondary"
              >暂无客服在线档案</a-typography-text
            >
          </a-space>
        </a-card>
      </a-tab-pane>

      <a-tab-pane key="priority" title="优先派单名单">
        <a-card class="general-card card-block" title="优先派单权">
          <a-space class="toolbar" wrap>
            <a-select
              v-model="priorityFilters.game"
              placeholder="游戏分区"
              allow-clear
              :style="{ width: '180px' }"
            >
              <a-option v-for="game in gameOptions" :key="game" :value="game">{{
                game
              }}</a-option>
            </a-select>
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
            <a-button
              v-if="canManagePriority"
              type="primary"
              @click="openPriorityGrant"
              >授予优先派单权</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="toolbar">
            订单进入待派单时只通知本游戏分区名单内的陪玩，**其他人看不到该单**；名单内全部拒绝或超过通知时长（
            <span class="config-value"
              >当前
              {{
                priorityConfigValues[
                  'app.esports.dispatch_priority_notice_minutes'
                ] || '-'
              }}
              分钟</span
            >
            ）后订单才释放到抢单大厅给所有人抢。每游戏每期名额上限取
            <span class="config-value"
              >当前
              {{
                priorityConfigValues['app.esports.dispatch_priority_quota'] ||
                '-'
              }}
              人</span
            >，周期重算任务（
            <span class="config-value">{{
              cronTextOf('esports_rebuild_dispatch_priority') || '-'
            }}</span>
            ），超时释放任务（
            <span class="config-value">{{
              cronTextOf('esports_expire_dispatch_priority_notice') || '-'
            }}</span>
            ）。
            名单的「游戏分区」是**准入校验字段**：必须与启用中的商品分类一致，填错后端直接拒绝。
            连接异常（心跳超时
            <span class="config-value"
              >当前
              {{
                priorityConfigValues[
                  'app.esports.player_heartbeat_timeout_minutes'
                ] || '-'
              }}
              分钟</span
            >且仍在途）的陪玩**不会**进入优先通知名单，也不会被派单。
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
                      canManagePriority &&
                      (record.status === 'active' ||
                        record.status === 'pending')
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
      </a-tab-pane>

      <a-tab-pane key="transfers" title="转单申请">
        <a-card class="general-card card-block" title="陪玩转单申请">
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
              <a-table-column
                data-index="seat_index"
                title="席位"
                :width="70"
              />
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
                  <template
                    v-if="canManageTransfer && record.status === 'pending'"
                  >
                    <a-popconfirm
                      content="确认通过该转单？通过后该席位立即释放为待补位。"
                      @ok="doDecideTransfer(record, true)"
                    >
                      <a-button type="text" status="success">通过</a-button>
                    </a-popconfirm>
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
      </a-tab-pane>
    </a-tabs>

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
          <a-table-column title="来源">
            <template #cell="{ record }">{{
              dispatchSourceText(record.source)
            }}</template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">{{
              dispatchSeatStatusText(record.status)
            }}</template>
          </a-table-column>
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
        <a-form-item label="主陪玩" required>
          <a-space>
            <OwnerSelect
              v-model="teamForm.mainPlayerId"
              owner-type="player"
              :style="{ width: '220px' }"
            />
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
        <a-descriptions-item label="窗口状态">
          <a-tag
            :color="priorityNoticeColor(noticeOrder?.priority_notice_status)"
          >
            {{ priorityNoticeLabel(noticeOrder?.priority_notice_status) }}
          </a-tag>
        </a-descriptions-item>
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
      <a-space class="toolbar" wrap>
        <a-popconfirm
          v-if="
            canOperate &&
            noticeOrder &&
            noticeOrder.priority_notice_status === 'pending'
          "
          content="确认提前释放该订单的优先通知窗口？释放后立即对抢单大厅全部陪玩开放。"
          @ok="releaseNoticeWindow"
        >
          <a-button type="primary" status="danger">提前释放窗口</a-button>
        </a-popconfirm>
        <a-typography-text type="secondary">
          窗口内只通知名单内陪玩；人工指派或固排成队确定陪玩后窗口**立即关闭**，不再计入「通知中」。
        </a-typography-text>
      </a-space>
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
        <a-form-item label="陪玩" required>
          <OwnerSelect
            v-model="assignForm.playerId"
            owner-type="player"
            :style="{ width: '220px' }"
          />
        </a-form-item>
        <a-form-item label="陪玩档期">
          <a-space direction="vertical" fill>
            <a-space>
              <a-button :loading="availabilityLoading" @click="loadAvailability"
                >查该陪玩档期</a-button
              >
              <a-typography-text v-if="availability" type="secondary">
                {{ availability.player_name }}：已占用
                {{ availability.occupied_count }} 段 / 可预约
                {{ availability.available_count }} 段
              </a-typography-text>
            </a-space>
            <a-table
              v-if="(availability?.slots || []).length"
              :data="availability?.slots || []"
              size="small"
              row-key="start"
              :pagination="false"
            >
              <template #columns>
                <a-table-column title="时段">
                  <template #cell="{ record }"
                    >{{ fmtMinute(record.start) }} ~
                    {{ fmtMinute(record.end) }}</template
                  >
                </a-table-column>
                <a-table-column title="状态">
                  <template #cell="{ record }">{{
                    transferStatusText(record.status)
                  }}</template>
                </a-table-column>
                <a-table-column title="可预约">
                  <template #cell="{ record }">{{
                    record.bookable ? '可约' : record.reason || '不可约'
                  }}</template>
                </a-table-column>
              </template>
            </a-table>
          </a-space>
        </a-form-item>
        <a-typography-text type="secondary" class="grant-tip">
          连接异常（protected_abnormal）的陪玩不进候选，人工指派同样会被后端拒绝并给出中文原因。
        </a-typography-text>
        <a-form-item label="候选推荐">
          <a-space direction="vertical" fill>
            <a-space>
              <OwnerSelect
                v-model="preferredPlayerId"
                owner-type="player"
                placeholder="指定陪玩（可空）"
                :style="{ width: '180px' }"
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
                    <a-tag size="small" color="gray">{{
                      presenceLabel(record.presence)
                    }}</a-tag>
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
        <a-form-item label="目标客服" required>
          <AdminSelect
            v-model="transferForm.toAdminId"
            placeholder="搜索并选择目标客服"
          />
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
      v-model:visible="closeRejectVisible"
      title="驳回结单"
      @ok="submitCloseReject"
      @cancel="closeRejectVisible = false"
    >
      <a-form :model="closeRejectForm">
        <a-form-item label="订单">
          <a-typography-text>{{
            closeRejectOrder?.order_no || '—'
          }}</a-typography-text>
        </a-form-item>
        <a-form-item label="驳回原因" required>
          <a-textarea v-model="closeRejectForm.reason" :max-length="255" />
        </a-form-item>
        <a-typography-text type="secondary">
          金额达复核阈值的订单须由非负责客服复核；驳回后订单回到服务中，由陪玩 /
          客服补正后重新结单。
        </a-typography-text>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="addonVisible"
      title="发起加钟"
      @ok="submitAddon"
      @cancel="addonVisible = false"
    >
      <a-form :model="addonForm">
        <a-form-item label="订单">
          <a-typography-text>{{
            addonOrder?.order_no || '—'
          }}</a-typography-text>
        </a-form-item>
        <a-form-item label="追加金额（元）" required>
          <a-input-number
            v-model="addonForm.addedYuan"
            :min="0"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="追加服务量">
          <a-input-number v-model="addonForm.addedUnits" :min="0" />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="addonForm.note" :max-length="255" />
        </a-form-item>
        <a-typography-text type="secondary">
          加钟单由服务中订单的陪玩确认后生效并累加；追加金额在确认后由客服向客户收单。
        </a-typography-text>
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
          <a-select v-model="priorityGrantForm.game" placeholder="选择游戏分区">
            <a-option v-for="game in gameOptions" :key="game" :value="game">{{
              game
            }}</a-option>
          </a-select>
        </a-form-item>
        <a-typography-text type="secondary" class="grant-tip">
          游戏分区取自启用的商品分类（<code>category.game</code>）；填错会被后端**直接拒绝**并提示「找不到对应的启用游戏分区」，不会静默落库。
        </a-typography-text>
        <a-typography-text
          v-if="!gameOptions.length"
          type="warning"
          class="grant-tip"
        >
          未取到任何游戏分区：当前账号可能缺少「查看产品分类」权限，或商品分类里还没有启用分区。请先在商品分类维护游戏分区后再授予。
        </a-typography-text>
        <a-form-item label="陪玩" required>
          <OwnerSelect
            v-model="priorityGrantForm.playerId"
            owner-type="player"
            :style="{ width: '220px' }"
          />
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
  import axios from 'axios';
  import usePermission from '@/hooks/permission';
  import yuanToCents from '@/utils/money';
  import { errorText } from '@/utils/error';
  import { formatYuan } from '@/utils/format';
  import useUserStore from '@/store/modules/user';
  import { getConfigByGroup } from '@/api/config';
  import sseService from '@/services/sse.service';
  import {
    dispatchSeatStatusText,
    dispatchSourceText,
    fulfillmentStatusText,
  } from '../../status-labels';
  import AdminSelect from '../../components/AdminSelect.vue';
  import OwnerSelect from '../../components/OwnerSelect.vue';
  import {
    fetchSkillLevels,
    skillLevelName,
    type SkillLevel,
  } from '../../skill-levels';
  import {
    approveCloseReview,
    assignOrderSeat,
    claimOrder,
    createOrderAddon,
    getDispatchBoard,
    getDispatchCandidates,
    getPlayerAvailability,
    getTeammateCandidates,
    decideSeatTransfer,
    grantDispatchPriority,
    listCategories,
    listCsPresences,
    listDispatchPriority,
    listOrderPriorityNotices,
    listOrderSeats,
    listSeatTransfers,
    publishOrderToGrabHall,
    rejectCloseReview,
    releaseOrderPriority,
    remindOrder,
    revokeDispatchPriority,
    revokeOrderSeat,
    setCsPresence,
    teamDispatch,
    transferOrder,
  } from '../../api';
  import type {
    CsPresence,
    CsPresenceList,
    DispatchBoardSort,
    DispatchCandidate,
    DispatchPriorityGrant,
    DispatchPriorityNotice,
    DispatchPriorityPeriod,
    DispatchPrioritySource,
    DispatchPriorityStatus,
    EsportsProductCategory,
    PlayerAvailabilityView,
    PriorityNoticeItemStatus,
    PriorityNoticeStatus,
    SeatTransferRequest,
    SeatTransferStatus,
    TeammateDispatchCandidate,
    EsportsDispatchBoard,
    EsportsDispatchSeat,
    EsportsOrder,
  } from '../../api';
  // 席位状态映射统一走 status-labels，未知值原样回显。
  const transferStatusMap: Record<string, string> = {
    pending: '待确认',
    approved: '已通过',
    rejected: '已驳回',
    cancelled: '已取消',
  };
  const transferStatusText = (value?: string) =>
    (value && transferStatusMap[value]) || value || '—';

  // 看板订单附带后端返回的负责客服字段。
  type DispatchOrder = EsportsOrder & { responsible_admin_id?: number | null };

  type BucketKey =
    | 'pending_dispatch'
    | 'public_pool'
    | 'grabbing'
    | 'pending_acceptance'
    | 'pending_customer_confirm'
    | 'accepted'
    | 'in_service'
    | 'pending_close'
    | 'abnormal';

  const buckets: Array<{ key: BucketKey; title: string }> = [
    { key: 'pending_dispatch', title: '待派单池' },
    { key: 'public_pool', title: '公共池' },
    { key: 'grabbing', title: '抢单中' },
    { key: 'pending_acceptance', title: '待接单' },
    { key: 'pending_customer_confirm', title: '待客户确认' },
    { key: 'accepted', title: '已接单' },
    { key: 'in_service', title: '服务中' },
    { key: 'pending_close', title: '待结单' },
    { key: 'abnormal', title: '异常' },
  ];

  const { hasButtonPermission, hasAnyPermission } = usePermission();
  const userStore = useUserStore();
  const canOperate = computed(() =>
    hasButtonPermission('esports:dispatch:operate')
  );
  // 优先名单维护与转单确认各有独立按钮码，未分配时回落到排单操作按钮；后端仍兜底鉴权。
  const canManagePriority = computed(
    () =>
      hasButtonPermission('esports:dispatch:priority_manage') ||
      hasButtonPermission('esports:dispatch:operate')
  );
  const canManageTransfer = computed(
    () =>
      hasButtonPermission('esports:dispatch:transfer_manage') ||
      hasButtonPermission('esports:dispatch:operate')
  );
  // 页面顶层的功能页签：看板 / 优先名单 / 转单申请。
  const mainTab = ref('board');

  const loading = ref(false);
  const board = ref<EsportsDispatchBoard | null>(null);
  // 催单优先级排序：后端 sort=remind_priority 时各订单桶按催单优先级降序重排。
  const remindPrioritySort = ref(false);

  async function load(silent = false) {
    loading.value = true;
    try {
      // 只送已声明的枚举值，非法排序由后端 400 兜底。
      const sort: DispatchBoardSort | undefined = remindPrioritySort.value
        ? 'remind_priority'
        : undefined;
      board.value = (await getDispatchBoard(sort)).data.data || null;
    } catch (err) {
      if (!silent) Message.error(errorText(err, '加载看板失败，请稍后重试'));
    } finally {
      loading.value = false;
    }
  }

  // 勾选后立即按新排序重载（非法值由后端 400 兜底，这里只送已声明的枚举值）。
  function toggleRemindSort() {
    load();
  }

  // 会员订单优先：后端已把会员订单置顶，这里只做标记展示。
  const memberPriorityIds = computed(
    () => board.value?.member_priority_order_ids ?? []
  );
  // 公共池脱敏：非超管在公共池看到的订单已被后端掩码客户身份与金额。
  const maskedPoolIds = computed(
    () => board.value?.masked_public_pool_ids ?? []
  );

  // ── 客服坐班在线状态──
  // presence 表是权威口径；看板顶部的 online_players 是陪玩在线数，两者不要混用。
  const presences = ref<CsPresenceList | null>(null);
  const presencesLoading = ref(false);
  const presenceSaving = ref(false);
  const presenceForm = reactive<{ presence: CsPresence; adminId?: number }>({
    presence: 'online',
  });
  const csPresenceOptions: { value: CsPresence; label: string }[] = [
    { value: 'online', label: '坐班在线' },
    { value: 'busy', label: '忙碌' },
    { value: 'offline', label: '离线' },
  ];
  const csPresenceLabel = (value: string | undefined) =>
    csPresenceOptions.find((option) => option.value === value)?.label ||
    value ||
    '—';
  const csPresenceColor = (value: string | undefined) => {
    switch (value) {
      case 'online':
        return 'green';
      case 'busy':
        return 'orangered';
      default:
        return 'gray';
    }
  };
  const isSuperAdmin = computed(() => userStore.isSuperAdmin);
  // 权限码取 app.go 真实声明：presence_write 是 PermAPI 码（权限树类型为 api），
  // 与排单操作按钮码并集，避免非超管账号的按钮被误隐藏；后端仍兜底鉴权。
  const canWritePresence = computed(
    () =>
      hasAnyPermission(['esports:cs:presence_write']) ||
      hasButtonPermission('esports:dispatch:operate')
  );
  const presenceTargetLabel = computed(() => {
    if (!presenceForm.adminId) return '本人';
    const admin = (presences.value?.admins || []).find(
      (item) => item.admin_id === presenceForm.adminId
    );
    return admin
      ? admin.nickname || admin.username
      : `客服 #${presenceForm.adminId}`;
  });

  async function loadPresences() {
    presencesLoading.value = true;
    try {
      presences.value = (await listCsPresences()).data.data || null;
    } catch (err) {
      Message.error(errorText(err, '加载客服在线状态失败'));
    } finally {
      presencesLoading.value = false;
    }
  }

  async function submitPresence() {
    presenceSaving.value = true;
    try {
      await setCsPresence({
        presence: presenceForm.presence,
        admin_id: presenceForm.adminId || undefined,
      });
      Message.success('坐班状态已更新');
      await loadPresences();
    } catch (err) {
      Message.error(errorText(err, '更新坐班状态失败：非超管只能修改本人状态'));
    } finally {
      presenceSaving.value = false;
    }
  }

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

  // ── 派单候选（首版） ──
  const candidates = ref<DispatchCandidate[]>([]);
  const candidatesLoading = ref(false);
  // 指定陪玩：留空（undefined）表示不指定；0 是合法 ID 占位，不能用它当「未填」。
  const preferredPlayerId = ref<number>();

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

  // ── 游戏分区下拉（优先名单的准入口径） ──
  // 后端授予名单时校验 game 必须对上「启用中的商品分类」（category.game），
  // 因此这里直接从商品分类取启用分区，避免手工输入必然被拒的错值。
  const gameOptions = ref<string[]>([]);

  async function loadGameOptions() {
    try {
      const categories = (await listCategories()).data.data || [];
      gameOptions.value = Array.from(
        new Set(
          categories
            .filter((item: EsportsProductCategory) => item.status === 'enabled')
            .map((item: EsportsProductCategory) => item.game)
            .filter(Boolean)
        )
      );
    } catch (err) {
      Message.error(
        errorText(err, '加载游戏分区失败，可直接输入分区名但须与商品分类一致')
      );
    }
  }

  // ── 优先派单权 ──
  const priorityGrants = ref<DispatchPriorityGrant[]>([]);
  const priorityLoading = ref(false);
  // 说明文案里直接展示各项配置的当前值，省去运维来回翻「系统配置」页比对。
  const priorityConfigValues = ref<Record<string, string>>({});
  async function loadPriorityConfigValues() {
    try {
      const { data } = await getConfigByGroup('esports');
      const map: Record<string, string> = {};
      (data.data || []).forEach((item) => {
        map[item.key] = item.value;
      });
      priorityConfigValues.value = map;
    } catch {
      // 读取配置失败不影响派单主流程，说明文案降级为只显示配置键。
    }
  }
  // 说明文案里引用的两个定时任务：调度周期取任务列表的当前值，任务被停用时也能看出来。
  const cronStatus = ref<
    Record<string, { expression: string; enabled: boolean }>
  >({});
  async function loadCronStatus() {
    try {
      const { data } = await axios.get('/api/v1/admin/auth/cron-jobs', {
        params: { page: 1, page_size: 100 },
      });
      const rows = (data.data?.data || []) as {
        name: string;
        expression: string;
        enabled: boolean;
      }[];
      const map: Record<string, { expression: string; enabled: boolean }> = {};
      rows.forEach((row) => {
        map[row.name] = { expression: row.expression, enabled: row.enabled };
      });
      cronStatus.value = map;
    } catch {
      // 拿不到任务列表时文案回落为只显示任务名，不阻塞页面。
    }
  }
  // ponytail: 只翻译本页涉及的两档周期，其余原样显示 cron 表达式；
  // 若将来引用更多任务，改成接 cron 解析库。
  function cronText(expression: string): string {
    if (expression === '0 * * * * *') return '每分钟';
    if (expression === '0 0 1 * * *') return '每日 01:00';
    return expression;
  }
  function cronTextOf(name: string): string {
    const item = cronStatus.value[name];
    if (!item) return '';
    return item.enabled ? cronText(item.expression) : '任务已停用';
  }
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
    playerId: 0,
    period: 'weekly',
    source: 'manual',
    rank: 0,
    nextPeriod: false,
    note: '',
  });

  function openPriorityGrant() {
    priorityGrantForm.game = priorityFilters.game || '';
    priorityGrantForm.playerId = 0;
    priorityGrantForm.period = 'weekly';
    priorityGrantForm.source = 'manual';
    priorityGrantForm.rank = 0;
    priorityGrantForm.nextPeriod = false;
    priorityGrantForm.note = '';
    priorityGrantVisible.value = true;
  }

  async function submitPriorityGrant() {
    if (!priorityGrantForm.game || priorityGrantForm.playerId < 1) {
      Message.warning('请选择游戏分区与陪玩');
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

  // ── 独占优先通知窗口（业务口径） ──
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

  // 订单级窗口状态：pending 才是「通知中」；人工指派 / 固排成队确定陪玩后后端立即闭合。
  const priorityNoticeOptions: {
    value: PriorityNoticeStatus;
    label: string;
  }[] = [
    { value: 'none', label: '无优先窗口' },
    { value: 'pending', label: '通知中' },
    { value: 'released', label: '已释放到大厅' },
    { value: 'accepted', label: '名单内已接单' },
  ];
  const priorityNoticeLabel = (value: PriorityNoticeStatus | undefined) =>
    priorityNoticeOptions.find((option) => option.value === value)?.label ||
    value ||
    '—';
  const priorityNoticeColor = (value: PriorityNoticeStatus | undefined) => {
    switch (value) {
      case 'pending':
        return 'orangered';
      case 'accepted':
        return 'green';
      case 'released':
        return 'gray';
      default:
        return 'arcoblue';
    }
  };

  // 从看板各桶里取最新订单（释放窗口 / 指派后同步抽屉用）。
  function findBoardOrder(orderId: number) {
    const data = board.value as unknown as Record<
      string,
      DispatchOrder[] | undefined
    > | null;
    if (!data) return undefined;
    const rows = buckets.reduce<DispatchOrder[]>(
      (acc, bucket) => acc.concat(data[bucket.key] || []),
      []
    );
    return rows.find((item) => item.id === orderId);
  }

  // 指派 / 固排成队后窗口立即闭合：抽屉开着就同步最新状态与明细。
  async function syncNoticeDrawer(orderId: number) {
    if (!noticesVisible.value || noticeOrder.value?.id !== orderId) return;
    const fresh = findBoardOrder(orderId);
    if (fresh) noticeOrder.value = fresh;
    try {
      notices.value = (await listOrderPriorityNotices(orderId)).data.data || [];
    } catch {
      // 抽屉同步失败不影响主流程，保留原明细。
    }
  }

  async function releaseNoticeWindow() {
    const order = noticeOrder.value;
    if (!order) return;
    try {
      const updated = (
        await releaseOrderPriority(order.id, '客服在通知明细内提前释放')
      ).data.data;
      if (updated) noticeOrder.value = { ...order, ...updated };
      notices.value =
        (await listOrderPriorityNotices(order.id)).data.data || [];
      Message.success('已释放到抢单大厅');
      await load(true);
    } catch (err) {
      Message.error(errorText(err, '释放失败：窗口已结束或状态已变化'));
    }
  }

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

  // ── 陪玩转单 ──
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
  const assignForm = reactive({ seatIndex: 1, playerId: 0 });
  // 固排成队
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

  const money = formatYuan;
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

  // 发布到抢单大厅：没有优先名单的游戏分区由此对全部陪玩开放。
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
    teamForm.mainPlayerId = 0;
    teamCandidates.value = [];
    teamSelected.value = [];
    teamCandidatesLoaded.value = false;
    teamVisible.value = true;
  }

  async function loadTeamCandidates() {
    const order = seatOrder.value;
    if (!order) return;
    if (teamForm.mainPlayerId < 1) {
      Message.warning('请选择有效的主陪玩');
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
      Message.warning('请选择有效的主陪玩');
      return;
    }
    try {
      await teamDispatch(order.id, teamForm.mainPlayerId, teamSelected.value);
      teamVisible.value = false;
      Message.success('已一次成队并发出邀请');
      await reloadSeats();
      await load();
      // 固排成队确定陪玩后优先通知窗口立即闭合。
      await syncNoticeDrawer(order.id);
    } catch (err) {
      Message.error(errorText(err, '成队失败：固排关系、资格或空席位不足'));
    }
  }

  function closeTeamDispatch() {
    teamCandidates.value = [];
    teamSelected.value = [];
    teamCandidatesLoaded.value = false;
  }

  // 技能等级文案走系统配置（配置驱动），拉取失败按编码原样回显。
  const skillLevels = ref<SkillLevel[]>([]);
  const levelLabel = (level: string) =>
    skillLevelName(skillLevels.value, level) || level;
  const presenceLabel = (presence: string) => {
    switch (presence) {
      case 'online':
        return '在线';
      case 'protected_abnormal':
        // P1-01：心跳超时但有在途订单，显示为「连接异常（受保护）」，不是已下线。
        return '连接异常（受保护）';
      default:
        return '离线';
    }
  };

  // ── 指派前查陪玩档期──
  const availability = ref<PlayerAvailabilityView | null>(null);
  const availabilityLoading = ref(false);

  async function loadAvailability() {
    const { playerId } = assignForm;
    if (playerId < 1) {
      Message.warning('请先选择陪玩');
      return;
    }
    availabilityLoading.value = true;
    try {
      availability.value =
        (await getPlayerAvailability(playerId)).data.data || null;
      if (!availability.value) Message.info('该陪玩暂无档期数据');
    } catch (err) {
      availability.value = null;
      Message.error(errorText(err, '加载陪玩档期失败'));
    } finally {
      availabilityLoading.value = false;
    }
  }

  function openAssign(order: DispatchOrder) {
    activeOrder.value = order;
    assignForm.seatIndex = 1;
    assignForm.playerId = 0;
    candidates.value = [];
    preferredPlayerId.value = undefined;
    availability.value = null;
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
      // 指派后优先通知窗口立即闭合，抽屉开着就同步。
      await syncNoticeDrawer(order.id);
    } catch (err) {
      Message.error(
        errorText(
          err,
          '指派失败：陪玩资格不符、连接异常（受保护）、席位不可用或订单状态已变化'
        )
      );
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

  // ── 结单复核：待结单桶可直接复核通过 / 驳回，替代到订单页逐单寻找 ──
  const closeRejectVisible = ref(false);
  const closeRejectOrder = ref<DispatchOrder | null>(null);
  const closeRejectForm = reactive({ reason: '' });

  async function handleApproveClose(order: DispatchOrder) {
    try {
      await approveCloseReview(order.id, '看板复核通过');
      Message.success('已复核通过结单');
      await load();
    } catch (err) {
      Message.error(
        errorText(
          err,
          '复核失败：不得自审、金额未达阈值的订单无需复核或状态已变化'
        )
      );
    }
  }

  function openCloseReject(order: DispatchOrder) {
    closeRejectOrder.value = order;
    closeRejectForm.reason = '';
    closeRejectVisible.value = true;
  }

  async function submitCloseReject() {
    const order = closeRejectOrder.value;
    if (!order) return;
    if (!closeRejectForm.reason.trim()) {
      Message.warning('请填写驳回原因');
      return;
    }
    try {
      await rejectCloseReview(order.id, closeRejectForm.reason.trim());
      closeRejectVisible.value = false;
      Message.success('已驳回结单');
      await load();
    } catch (err) {
      Message.error(errorText(err, '驳回失败：状态已变化'));
    }
  }

  // ── 加钟：服务中订单可直接在看板发起加钟 ──
  const addonVisible = ref(false);
  const addonOrder = ref<DispatchOrder | null>(null);
  const addonSubmitting = ref(false);
  const addonForm = reactive({ addedYuan: 0, addedUnits: 0, note: '' });

  function openAddon(order: DispatchOrder) {
    addonOrder.value = order;
    addonForm.addedYuan = 0;
    addonForm.addedUnits = 0;
    addonForm.note = '';
    addonVisible.value = true;
  }

  async function submitAddon() {
    const order = addonOrder.value;
    if (!order) return;
    if (addonForm.addedYuan <= 0) {
      Message.warning('请填写大于零的追加金额');
      return;
    }
    addonSubmitting.value = true;
    try {
      await createOrderAddon(order.id, {
        added_cents: yuanToCents(addonForm.addedYuan),
        added_units: addonForm.addedUnits,
        note: addonForm.note.trim() || undefined,
      });
      addonVisible.value = false;
      Message.success('已发起加钟，等待陪玩确认');
      await load();
    } catch (err) {
      Message.error(errorText(err, '加钟失败：订单须处于服务中或参数无效'));
    } finally {
      addonSubmitting.value = false;
    }
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

  // 状态变更走 SSE 实时同步：后端任一电竞写操作成功后广播 dispatch_changed，
  // 页面收到即重拉；连接建立/重连成功也补一次，弥补断线期间丢掉的广播。
  // ponytail: 事件只表示「有变化」不带快照，密集写操作靠 500ms 合并节流；
  // 另留 60 秒轻量对账，防止 SSE 长期不可用（代理剥离长连接）时看板僵死。
  let syncTimer: ReturnType<typeof setTimeout> | undefined;
  let fallbackTimer: ReturnType<typeof setInterval> | undefined;
  let offDispatchChange: (() => void) | undefined;
  let offStatusChange: (() => void) | undefined;
  function refreshAll() {
    if (loading.value) return;
    load(true);
    loadPriority();
    loadTransfers();
    loadPresences();
  }
  function scheduleSync() {
    if (syncTimer) return;
    syncTimer = setTimeout(() => {
      syncTimer = undefined;
      refreshAll();
    }, 500);
  }
  onMounted(async () => {
    skillLevels.value = await fetchSkillLevels();
    await load();
    await loadPriority();
    loadPriorityConfigValues();
    loadCronStatus();
    await loadTransfers();
    await loadPresences();
    await loadGameOptions();
    offDispatchChange = sseService.on('dispatch_changed', scheduleSync);
    offStatusChange = sseService.onStatusChange((status) => {
      if (status === 'open') refreshAll();
    });
    // 导航栏已负责建连，这里再调一次是幂等的，防止直接刷新本页时顺序不定。
    sseService.connect();
    fallbackTimer = setInterval(() => {
      if (!loading.value && document.visibilityState === 'visible') {
        load(true);
      }
    }, 60_000);
  });
  onUnmounted(() => {
    if (syncTimer) clearTimeout(syncTimer);
    if (fallbackTimer) clearInterval(fallbackTimer);
    offDispatchChange?.();
    offStatusChange?.();
  });
</script>

<style scoped>
  .card-block {
    margin-top: 16px;
  }

  .toolbar {
    margin-bottom: 16px;
  }

  /* 配置当前值：与配置键区分开，避免和代码块混读。 */
  .config-value {
    color: rgb(var(--primary-6));
    font-weight: 600;
  }

  .grant-tip {
    display: block;
    margin-bottom: 12px;
  }
</style>
