<template>
  <div class="container page-container">
    <a-card class="general-card" title="考核权重配置">
      <a-space class="toolbar" wrap>
        <a-select
          v-model="rulesType"
          :style="{ width: '160px' }"
          @change="loadRules"
        >
          <a-option
            v-for="item in assessmentTypes"
            :key="item.value"
            :value="item.value"
            >{{ item.label }}</a-option
          >
        </a-select>
        <a-button :loading="ruleLoading" @click="loadRules">加载</a-button>
        <span class="hint"
          >各维度权重以基点表示，合计须为 10000（即 100%）</span
        >
      </a-space>
      <a-table
        :data="weightRows"
        :loading="ruleLoading"
        row-key="dimension"
        :pagination="false"
      >
        <template #columns>
          <a-table-column title="维度">
            <template #cell="{ record }">{{
              dimensionLabel(record.dimension)
            }}</template>
          </a-table-column>
          <a-table-column title="权重（基点）">
            <template #cell="{ record }">
              <a-input-number
                v-model="record.weight_bp"
                :min="1"
                :max="10000"
                :disabled="!canManage"
              />
            </template>
          </a-table-column>
          <a-table-column title="占比">
            <template #cell="{ record }">{{
              `${(record.weight_bp / 100).toFixed(2)}%`
            }}</template>
          </a-table-column>
        </template>
      </a-table>
      <a-space class="toolbar">
        <span>合计：{{ weightTotal }} 基点</span>
        <a-button
          v-if="canManage"
          type="primary"
          :loading="ruleSaving"
          @click="saveRules"
          >保存配置</a-button
        >
      </a-space>
    </a-card>

    <a-card class="general-card" title="考核任务">
      <a-space class="toolbar" wrap>
        <a-input-number
          v-model="assessFilterPlayerId"
          :min="1"
          placeholder="陪玩 ID"
          :style="{ width: '140px' }"
        />
        <a-select
          v-model="assessFilterStatus"
          placeholder="状态"
          allow-clear
          :style="{ width: '150px' }"
        >
          <a-option value="pending">待分配考官</a-option>
          <a-option value="scheduled">已约考核</a-option>
          <a-option value="passed">通过</a-option>
          <a-option value="failed">不通过</a-option>
        </a-select>
        <a-select
          v-model="assessFilterType"
          placeholder="考核类型"
          allow-clear
          :style="{ width: '160px' }"
        >
          <a-option
            v-for="item in assessmentTypes"
            :key="item.value"
            :value="item.value"
            >{{ item.label }}</a-option
          >
        </a-select>
        <a-button
          type="primary"
          :loading="assessLoading"
          @click="loadAssessments"
          >查询</a-button
        >
        <a-button v-if="canManage" type="outline" @click="openCreate"
          >新建考核</a-button
        >
      </a-space>

      <a-table
        :data="assessments"
        :loading="assessLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column data-index="task_no" title="任务号" :width="220" />
          <a-table-column title="陪玩" :width="90">
            <template #cell="{ record }">{{ record.player_id }}</template>
          </a-table-column>
          <a-table-column title="类型">
            <template #cell="{ record }">{{
              typeLabel(record.assessment_type)
            }}</template>
          </a-table-column>
          <a-table-column title="目标等级">
            <template #cell="{ record }">{{
              levelLabel(record.target_level)
            }}</template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)">{{
                statusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="总分" :width="80">
            <template #cell="{ record }">{{
              record.status === 'passed' || record.status === 'failed'
                ? record.total_score
                : '-'
            }}</template>
          </a-table-column>
          <a-table-column title="申诉">
            <template #cell="{ record }">{{
              appealLabel(record.appeal_status)
            }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="280">
            <template #cell="{ record }">
              <a-button type="text" @click="openDetail(record)">详情</a-button>
              <template v-if="canManage">
                <a-button
                  v-if="record.status === 'pending'"
                  type="text"
                  @click="openAssign(record)"
                  >分配考官</a-button
                >
                <a-button
                  v-if="
                    record.status === 'pending' || record.status === 'scheduled'
                  "
                  type="text"
                  status="success"
                  @click="openScore(record)"
                  >打分</a-button
                >
                <a-button
                  v-if="record.appeal_status === 'pending'"
                  type="text"
                  status="warning"
                  @click="openAppealReview(record)"
                  >复核申诉</a-button
                >
              </template>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="客户评价">
      <a-space class="toolbar" wrap>
        <a-input-number
          v-model="reviewFilterPlayerId"
          :min="1"
          placeholder="陪玩 ID"
          :style="{ width: '140px' }"
        />
        <a-input-number
          v-model="reviewFilterOrderId"
          :min="1"
          placeholder="订单 ID"
          :style="{ width: '140px' }"
        />
        <a-select
          v-model="reviewFilterStatus"
          placeholder="状态"
          allow-clear
          :style="{ width: '150px' }"
        >
          <a-option value="normal">正常</a-option>
          <a-option value="disputed">争议</a-option>
          <a-option value="invalid">无效</a-option>
        </a-select>
        <a-button type="primary" :loading="reviewLoading" @click="loadReviews"
          >查询</a-button
        >
        <a-button v-if="canManage" type="outline" @click="openRecord"
          >客服代录</a-button
        >
      </a-space>

      <a-table
        :data="reviews"
        :loading="reviewLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column title="订单" :width="90">
            <template #cell="{ record }">{{ record.order_id }}</template>
          </a-table-column>
          <a-table-column title="客户 / 陪玩" :width="140">
            <template #cell="{ record }"
              >{{ record.customer_id }} → {{ record.player_id }}</template
            >
          </a-table-column>
          <a-table-column title="评分" :width="70">
            <template #cell="{ record }">{{ record.rating }}</template>
          </a-table-column>
          <a-table-column data-index="comment" title="评价" />
          <a-table-column title="来源" :width="110">
            <template #cell="{ record }">{{
              record.verified ? '客户自助' : '客服代录（未验证）'
            }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="100">
            <template #cell="{ record }">
              <a-tag :color="reviewStatusColor(record.status)">{{
                reviewStatusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="220">
            <template #cell="{ record }">
              <template v-if="canManage">
                <a-button
                  v-if="record.status !== 'normal'"
                  type="text"
                  @click="changeReviewStatus(record, 'normal')"
                  >标记正常</a-button
                >
                <a-button
                  v-if="record.status !== 'disputed'"
                  type="text"
                  status="warning"
                  @click="changeReviewStatus(record, 'disputed')"
                  >标记争议</a-button
                >
                <a-button
                  v-if="record.status !== 'invalid'"
                  type="text"
                  status="danger"
                  @click="changeReviewStatus(record, 'invalid')"
                  >标记无效</a-button
                >
              </template>
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="评价申诉（§7.5-05）">
      <a-space class="toolbar" wrap>
        <a-select
          v-model="reviewAppealStatusFilter"
          placeholder="状态"
          allow-clear
          :style="{ width: '150px' }"
        >
          <a-option value="pending">待复核</a-option>
          <a-option value="approved">申诉成立</a-option>
          <a-option value="rejected">申诉驳回</a-option>
        </a-select>
        <a-button
          type="primary"
          :loading="reviewAppealLoading"
          @click="loadReviewAppeals"
          >查询</a-button
        >
      </a-space>
      <div class="hint">
        陪玩 /
        客户对客户评价提出申诉后进入待复核；通过则重判评价（恢复原状态），驳回维持原判。
      </div>
      <a-table
        :data="reviewAppeals"
        :loading="reviewAppealLoading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #columns>
          <a-table-column data-index="id" title="申诉 ID" :width="90" />
          <a-table-column title="评价" :width="90">
            <template #cell="{ record }">{{ record.review_id }}</template>
          </a-table-column>
          <a-table-column title="申诉人" :width="150">
            <template #cell="{ record }"
              >{{ appellantTypeLabel(record.appellant_type) }} #{{
                record.appellant_id
              }}</template
            >
          </a-table-column>
          <a-table-column title="订单" :width="90">
            <template #cell="{ record }">{{ record.order_id }}</template>
          </a-table-column>
          <a-table-column data-index="reason" title="申诉理由" />
          <a-table-column title="状态" :width="110">
            <template #cell="{ record }">
              <a-tag :color="reviewAppealStatusColor(record.status)">{{
                reviewAppealStatusLabel(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column
            data-index="created_at"
            title="提交时间"
            :width="190"
          />
          <a-table-column title="操作" :width="120">
            <template #cell="{ record }">
              <a-button
                v-if="canManage && record.status === 'pending'"
                type="text"
                status="warning"
                @click="openReviewAppeal(record)"
                >复核</a-button
              >
              <span v-else>—</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card class="general-card" title="陪玩综合评分">
      <a-space class="toolbar">
        <a-input-number
          v-model="ratingPlayerId"
          :min="1"
          placeholder="陪玩 ID"
          :style="{ width: '140px' }"
        />
        <a-button :loading="ratingLoading" @click="loadRating">查询</a-button>
      </a-space>
      <a-descriptions v-if="rating" :column="5" bordered size="medium">
        <a-descriptions-item label="陪玩 ID">{{
          rating.player_id
        }}</a-descriptions-item>
        <a-descriptions-item label="综合评分">{{
          rating.insufficient ? '样本不足' : rating.average.toFixed(2)
        }}</a-descriptions-item>
        <a-descriptions-item label="有效样本数">{{
          rating.sample_count
        }}</a-descriptions-item>
        <a-descriptions-item label="是否样本不足">{{
          rating.insufficient ? '是' : '否'
        }}</a-descriptions-item>
        <a-descriptions-item label="规则版本">{{
          rating.rule_version
        }}</a-descriptions-item>
      </a-descriptions>
    </a-card>

    <a-modal
      v-model:visible="createVisible"
      title="新建考核任务"
      @ok="submitCreate"
      @cancel="createVisible = false"
    >
      <a-form :model="createForm">
        <a-form-item label="陪玩 ID" required>
          <a-input-number v-model="createForm.player_id" :min="1" />
        </a-form-item>
        <a-form-item label="考核类型" required>
          <a-select v-model="createForm.assessment_type">
            <a-option
              v-for="item in assessmentTypes"
              :key="item.value"
              :value="item.value"
              >{{ item.label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item
          label="目标等级"
          tooltip="入职默认「新手」；升级 / 抽查 / 复考须指定目标等级"
        >
          <a-select v-model="createForm.target_level" allow-clear>
            <a-option
              v-for="item in playerLevels"
              :key="item.value"
              :value="item.value"
              >{{ item.label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="createForm.note" :max-length="500" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="assignVisible"
      title="分配考官"
      @ok="submitAssign"
      @cancel="assignVisible = false"
    >
      <a-form :model="assignForm">
        <a-form-item label="考官（管理员 ID）" required>
          <a-input-number v-model="assignForm.examiner_admin_id" :min="1" />
        </a-form-item>
        <a-form-item label="约定考核时间">
          <a-date-picker
            v-model="assignForm.scheduled_at"
            show-time
            value-format="YYYY-MM-DDTHH:mm:ss[Z]"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="scoreVisible"
      title="考核打分"
      :width="720"
      @ok="submitScore"
      @cancel="scoreVisible = false"
    >
      <div class="hint">
        逐维度打分（0~100），评语与依据必填；最终总分按权重加权计算。
      </div>
      <a-table
        :data="scoreRows"
        row-key="dimension"
        :pagination="false"
        size="small"
      >
        <template #columns>
          <a-table-column title="维度" :width="130">
            <template #cell="{ record }">{{
              dimensionLabel(record.dimension)
            }}</template>
          </a-table-column>
          <a-table-column title="权重" :width="90">
            <template #cell="{ record }">{{ record.weightText }}</template>
          </a-table-column>
          <a-table-column title="得分" :width="140">
            <template #cell="{ record }">
              <a-input-number v-model="record.score" :min="0" :max="100" />
            </template>
          </a-table-column>
          <a-table-column title="评语与依据">
            <template #cell="{ record }">
              <a-input v-model="record.comment" :max-length="500" />
            </template>
          </a-table-column>
        </template>
      </a-table>
      <a-form :model="scoreForm" class="score-note">
        <a-form-item label="考核结论备注">
          <a-input v-model="scoreForm.note" :max-length="500" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="appealVisible"
      title="复核申诉"
      @ok="submitAppealReview"
      @cancel="appealVisible = false"
    >
      <a-form :model="appealForm">
        <a-form-item label="申诉理由">
          <div class="hint">{{ appealTarget?.appeal_reason || '—' }}</div>
        </a-form-item>
        <a-form-item label="复核结论" required>
          <a-radio-group v-model="appealForm.decision">
            <a-radio value="approve">申诉成立（改判结论）</a-radio>
            <a-radio value="reject">维持原结论</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="复核说明">
          <a-input v-model="appealForm.note" :max-length="500" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="reviewAppealVisible"
      title="复核评价申诉"
      @ok="submitReviewAppeal"
      @cancel="reviewAppealVisible = false"
    >
      <a-form :model="reviewAppealForm">
        <a-form-item label="申诉理由">
          <div class="hint">{{ reviewAppealTarget?.reason || '—' }}</div>
        </a-form-item>
        <a-form-item label="复核结论" required>
          <a-radio-group v-model="reviewAppealForm.decision">
            <a-radio value="approve">申诉成立（重判评价）</a-radio>
            <a-radio value="reject">驳回申诉（维持原判）</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="复核说明">
          <a-input v-model="reviewAppealForm.note" :max-length="500" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="recordVisible"
      title="客服代录评价"
      @ok="submitRecord"
      @cancel="recordVisible = false"
    >
      <a-form :model="recordForm">
        <a-form-item label="订单 ID" required>
          <a-input-number v-model="recordForm.order_id" :min="1" />
        </a-form-item>
        <a-form-item label="客户 ID" required>
          <a-input-number v-model="recordForm.customer_id" :min="1" />
        </a-form-item>
        <a-form-item label="陪玩 ID" required>
          <a-input-number v-model="recordForm.player_id" :min="1" />
        </a-form-item>
        <a-form-item label="评分（1~5）" required>
          <a-input-number v-model="recordForm.rating" :min="1" :max="5" />
        </a-form-item>
        <a-form-item label="评价内容">
          <a-input v-model="recordForm.comment" :max-length="500" />
        </a-form-item>
      </a-form>
      <div class="hint">代录评价标记为未验证，不计入陪玩综合评分。</div>
    </a-modal>

    <a-modal
      v-model:visible="detailVisible"
      title="考核详情"
      :width="720"
      :footer="false"
      @cancel="detailVisible = false"
    >
      <template v-if="detail">
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="任务号">{{
            detail.assessment.task_no
          }}</a-descriptions-item>
          <a-descriptions-item label="陪玩 ID">{{
            detail.assessment.player_id
          }}</a-descriptions-item>
          <a-descriptions-item label="类型">{{
            typeLabel(detail.assessment.assessment_type)
          }}</a-descriptions-item>
          <a-descriptions-item label="目标等级">{{
            levelLabel(detail.assessment.target_level)
          }}</a-descriptions-item>
          <a-descriptions-item label="状态">{{
            statusLabel(detail.assessment.status)
          }}</a-descriptions-item>
          <a-descriptions-item label="总分">{{
            detail.assessment.total_score
          }}</a-descriptions-item>
          <a-descriptions-item label="考官">{{
            detail.assessment.examiner_admin_id ?? '未分配'
          }}</a-descriptions-item>
          <a-descriptions-item label="结论备注">{{
            detail.assessment.note || '—'
          }}</a-descriptions-item>
        </a-descriptions>
        <a-table
          :data="detail.scores"
          row-key="id"
          :pagination="false"
          size="small"
          class="detail-table"
        >
          <template #columns>
            <a-table-column title="维度">
              <template #cell="{ record }">{{
                dimensionLabel(record.dimension)
              }}</template>
            </a-table-column>
            <a-table-column title="权重" :width="90">
              <template #cell="{ record }">{{
                `${(record.weight_bp / 100).toFixed(2)}%`
              }}</template>
            </a-table-column>
            <a-table-column title="得分" :width="80">
              <template #cell="{ record }">{{ record.score }}</template>
            </a-table-column>
            <a-table-column data-index="comment" title="评语" />
          </template>
        </a-table>
        <a-descriptions
          v-if="detail.appeal"
          :column="1"
          bordered
          size="small"
          class="detail-table"
        >
          <a-descriptions-item label="申诉理由">{{
            detail.appeal.reason
          }}</a-descriptions-item>
          <a-descriptions-item label="申诉结论">{{
            detail.appeal.status
          }}</a-descriptions-item>
          <a-descriptions-item label="复核说明">{{
            detail.appeal.review_note || '—'
          }}</a-descriptions-item>
        </a-descriptions>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    assignAssessment,
    createAssessment,
    getAssessmentDetail,
    getPlayerRating,
    listAssessmentRules,
    listAssessments,
    listPlayerReviewAppeals,
    listPlayerReviews,
    recordPlayerReview,
    reviewAssessmentAppeal,
    reviewPlayerReviewAppeal,
    scoreAssessment,
    setAssessmentRules,
    setPlayerReviewStatus,
  } from '../../api';
  import type {
    Assessment,
    AssessmentDetail,
    AssessmentDimension,
    AssessmentStatus,
    AssessmentType,
    AssessmentWeightInput,
    EsportsPlayerReviewAppeal,
    PlayerLevel,
    PlayerRating,
    PlayerReview,
    ReviewStatus,
  } from '../../api';

  const { hasButtonPermission } = usePermission();
  const canManage = computed(() =>
    hasButtonPermission('esports:assessments:manage')
  );

  const assessmentTypes: { value: AssessmentType; label: string }[] = [
    { value: 'entry', label: '入职' },
    { value: 'upgrade', label: '升级' },
    { value: 'spot_check', label: '抽查复核' },
    { value: 'retry', label: '复考' },
  ];
  const playerLevels: { value: PlayerLevel; label: string }[] = [
    { value: 'novice', label: '新手' },
    { value: 'skilled', label: '熟练' },
    { value: 'senior', label: '资深' },
    { value: 'mentor', label: '导师' },
  ];
  const dimensions: AssessmentDimension[] = [
    'game_skill',
    'teaching',
    'attitude',
    'communication',
    'compliance',
    'stability',
  ];
  const dimensionMap: Record<AssessmentDimension, string> = {
    game_skill: '游戏技能',
    teaching: '教学能力',
    attitude: '服务态度',
    communication: '沟通能力',
    compliance: '合规意识',
    stability: '稳定性',
  };
  const typeMap: Record<AssessmentType, string> = {
    entry: '入职',
    upgrade: '升级',
    spot_check: '抽查复核',
    retry: '复考',
  };
  const statusMap: Record<AssessmentStatus, string> = {
    pending: '待分配考官',
    scheduled: '已约考核',
    passed: '通过',
    failed: '不通过',
  };
  const statusColorMap: Record<AssessmentStatus, string> = {
    pending: 'gray',
    scheduled: 'blue',
    passed: 'green',
    failed: 'red',
  };
  const appealMap: Record<string, string> = {
    none: '—',
    pending: '待复核',
    approved: '申诉成立',
    rejected: '申诉驳回',
  };
  const levelMap: Record<string, string> = {
    novice: '新手',
    skilled: '熟练',
    senior: '资深',
    mentor: '导师',
  };
  const reviewStatusMap: Record<ReviewStatus, string> = {
    normal: '正常',
    disputed: '争议',
    invalid: '无效',
  };
  const reviewStatusColorMap: Record<ReviewStatus, string> = {
    normal: 'green',
    disputed: 'orange',
    invalid: 'red',
  };

  const dimensionLabel = (value: AssessmentDimension) =>
    dimensionMap[value] || value;
  const typeLabel = (value: AssessmentType) => typeMap[value] || value;
  const statusLabel = (value: AssessmentStatus) => statusMap[value] || value;
  const statusColor = (value: AssessmentStatus) =>
    statusColorMap[value] || 'gray';
  const appealLabel = (value: string) => appealMap[value] || value;
  const levelLabel = (value: string) => levelMap[value] || value || '—';
  const reviewStatusLabel = (value: ReviewStatus) =>
    reviewStatusMap[value] || value;
  const reviewStatusColor = (value: ReviewStatus) =>
    reviewStatusColorMap[value] || 'gray';
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  // ── 权重配置 ──
  const rulesType = ref<AssessmentType>('entry');
  const ruleLoading = ref(false);
  const ruleSaving = ref(false);
  const weightRows = ref<(AssessmentWeightInput & { version?: number })[]>(
    dimensions.map((dimension) => ({ dimension, weight_bp: 0 }))
  );
  const weightTotal = computed(() =>
    weightRows.value.reduce((sum, row) => sum + (row.weight_bp || 0), 0)
  );

  async function loadRules() {
    ruleLoading.value = true;
    try {
      const rows = (await listAssessmentRules(rulesType.value)).data.data || [];
      const byDimension = new Map(
        rows.map((row) => [row.dimension, row.weight_bp])
      );
      weightRows.value = dimensions.map((dimension) => ({
        dimension,
        weight_bp: byDimension.get(dimension) || 0,
      }));
    } catch (err) {
      Message.error(errorText(err, '加载权重配置失败'));
    } finally {
      ruleLoading.value = false;
    }
  }

  async function saveRules() {
    if (weightTotal.value !== 10000) {
      Message.error('各维度权重合计须为 10000 基点');
      return;
    }
    ruleSaving.value = true;
    try {
      await setAssessmentRules(
        rulesType.value,
        weightRows.value.map((row) => ({
          dimension: row.dimension,
          weight_bp: row.weight_bp,
        }))
      );
      Message.success('权重配置已保存');
      await loadRules();
    } catch (err) {
      Message.error(
        errorText(err, '保存失败：权重合计须为 10000 且覆盖全部维度')
      );
    } finally {
      ruleSaving.value = false;
    }
  }

  // ── 考核任务 ──
  const assessLoading = ref(false);
  const assessments = ref<Assessment[]>([]);
  const assessFilterPlayerId = ref<number>();
  const assessFilterStatus = ref<AssessmentStatus>();
  const assessFilterType = ref<AssessmentType>();

  async function loadAssessments() {
    assessLoading.value = true;
    try {
      assessments.value =
        (
          await listAssessments({
            player_id: assessFilterPlayerId.value,
            status: assessFilterStatus.value,
            assessment_type: assessFilterType.value,
            limit: 100,
          })
        ).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载考核任务失败'));
    } finally {
      assessLoading.value = false;
    }
  }

  const createVisible = ref(false);
  const createForm = reactive({
    player_id: 0,
    assessment_type: 'entry' as AssessmentType,
    target_level: undefined as PlayerLevel | undefined,
    note: '',
  });

  function openCreate() {
    Object.assign(createForm, {
      player_id: 0,
      assessment_type: 'entry',
      target_level: undefined,
      note: '',
    });
    createVisible.value = true;
  }

  async function submitCreate() {
    try {
      await createAssessment({
        player_id: createForm.player_id,
        assessment_type: createForm.assessment_type,
        target_level: createForm.target_level,
        note: createForm.note,
      });
      Message.success('考核任务已创建');
      createVisible.value = false;
      await loadAssessments();
    } catch (err) {
      Message.error(errorText(err, '创建失败：陪玩不存在或目标等级无效'));
    }
  }

  const assignVisible = ref(false);
  const assignTarget = ref<Assessment | null>(null);
  const assignForm = reactive({
    examiner_admin_id: 0,
    scheduled_at: undefined as string | undefined,
  });

  function openAssign(record: Assessment) {
    assignTarget.value = record;
    Object.assign(assignForm, {
      examiner_admin_id: 0,
      scheduled_at: undefined,
    });
    assignVisible.value = true;
  }

  async function submitAssign() {
    if (!assignTarget.value) return;
    try {
      await assignAssessment(
        assignTarget.value.id,
        assignForm.examiner_admin_id,
        assignForm.scheduled_at ?? null
      );
      Message.success('已分配考官');
      assignVisible.value = false;
      await loadAssessments();
    } catch (err) {
      Message.error(errorText(err, '分配失败：任务状态已变化或考官无效'));
    }
  }

  const scoreVisible = ref(false);
  const scoreTarget = ref<Assessment | null>(null);
  const scoreForm = reactive({ note: '' });
  const scoreRows = ref<
    {
      dimension: AssessmentDimension;
      weightText: string;
      score: number;
      comment: string;
    }[]
  >([]);

  async function openScore(record: Assessment) {
    scoreTarget.value = record;
    scoreForm.note = '';
    let weightByDimension = new Map<AssessmentDimension, number>();
    try {
      const rows =
        (await listAssessmentRules(record.assessment_type)).data.data || [];
      weightByDimension = new Map(
        rows.map((row) => [row.dimension, row.weight_bp])
      );
    } catch (err) {
      Message.error(errorText(err, '加载权重配置失败'));
    }
    scoreRows.value = dimensions.map((dimension) => ({
      dimension,
      weightText: weightByDimension.has(dimension)
        ? `${((weightByDimension.get(dimension) || 0) / 100).toFixed(2)}%`
        : '等权',
      score: 0,
      comment: '',
    }));
    scoreVisible.value = true;
  }

  async function submitScore() {
    if (!scoreTarget.value) return;
    if (scoreRows.value.some((row) => !row.comment.trim())) {
      Message.error('每个维度的评语与依据必填');
      return;
    }
    try {
      await scoreAssessment(
        scoreTarget.value.id,
        scoreRows.value.map((row) => ({
          dimension: row.dimension,
          score: row.score,
          comment: row.comment,
        })),
        scoreForm.note
      );
      Message.success('打分完成');
      scoreVisible.value = false;
      await loadAssessments();
    } catch (err) {
      Message.error(errorText(err, '打分失败：维度不全、评语缺失或状态已变化'));
    }
  }

  const appealVisible = ref(false);
  const appealTarget = ref<(Assessment & { appeal_reason?: string }) | null>(
    null
  );
  const appealForm = reactive({
    decision: 'approve' as 'approve' | 'reject',
    note: '',
  });

  async function openAppealReview(record: Assessment) {
    appealTarget.value = { ...record };
    appealForm.decision = 'approve';
    appealForm.note = '';
    try {
      const detail = (await getAssessmentDetail(record.id)).data.data;
      if (appealTarget.value) {
        appealTarget.value.appeal_reason = detail?.appeal?.reason;
      }
    } catch (err) {
      Message.error(errorText(err, '加载申诉详情失败'));
    }
    appealVisible.value = true;
  }

  async function submitAppealReview() {
    if (!appealTarget.value) return;
    try {
      await reviewAssessmentAppeal(
        appealTarget.value.id,
        appealForm.decision,
        appealForm.note
      );
      Message.success('申诉复核完成');
      appealVisible.value = false;
      await loadAssessments();
    } catch (err) {
      Message.error(errorText(err, '复核失败：申诉状态已变化'));
    }
  }

  const detailVisible = ref(false);
  const detail = ref<AssessmentDetail | null>(null);

  async function openDetail(record: Assessment) {
    try {
      detail.value = (await getAssessmentDetail(record.id)).data.data;
      detailVisible.value = true;
    } catch (err) {
      Message.error(errorText(err, '加载考核详情失败'));
    }
  }

  // ── 客户评价 ──
  const reviewLoading = ref(false);
  const reviews = ref<PlayerReview[]>([]);
  const reviewFilterPlayerId = ref<number>();
  const reviewFilterOrderId = ref<number>();
  const reviewFilterStatus = ref<ReviewStatus>();

  async function loadReviews() {
    reviewLoading.value = true;
    try {
      reviews.value =
        (
          await listPlayerReviews({
            player_id: reviewFilterPlayerId.value,
            order_id: reviewFilterOrderId.value,
            status: reviewFilterStatus.value,
          })
        ).data.data || [];
    } catch (err) {
      Message.error(errorText(err, '加载评价失败'));
    } finally {
      reviewLoading.value = false;
    }
  }

  async function changeReviewStatus(
    record: PlayerReview,
    status: ReviewStatus
  ) {
    try {
      await setPlayerReviewStatus(record.id, status);
      Message.success('评价状态已更新');
      await loadReviews();
    } catch (err) {
      Message.error(errorText(err, '状态更新失败'));
    }
  }

  const recordVisible = ref(false);
  const recordForm = reactive({
    order_id: 0,
    customer_id: 0,
    player_id: 0,
    rating: 5,
    comment: '',
  });

  function openRecord() {
    Object.assign(recordForm, {
      order_id: 0,
      customer_id: 0,
      player_id: 0,
      rating: 5,
      comment: '',
    });
    recordVisible.value = true;
  }

  async function submitRecord() {
    try {
      await recordPlayerReview({
        order_id: recordForm.order_id,
        customer_id: recordForm.customer_id,
        player_id: recordForm.player_id,
        rating: recordForm.rating,
        comment: recordForm.comment,
      });
      Message.success('已代录评价');
      recordVisible.value = false;
      await loadReviews();
    } catch (err) {
      Message.error(errorText(err, '代录失败：陪玩不存在或参数无效'));
    }
  }

  // ── 综合评分 ──
  const ratingPlayerId = ref<number>();
  const ratingLoading = ref(false);
  const rating = ref<PlayerRating | null>(null);

  async function loadRating() {
    if (!ratingPlayerId.value) {
      Message.error('请输入陪玩 ID');
      return;
    }
    ratingLoading.value = true;
    try {
      rating.value =
        (await getPlayerRating(ratingPlayerId.value)).data.data || null;
    } catch (err) {
      Message.error(errorText(err, '加载综合评分失败'));
    } finally {
      ratingLoading.value = false;
    }
  }

  // ── 评价申诉（§7.5-05）：/player-review-appeals 列表 + 复核决定 ──
  // 两条路由（esports:assessments:review_appeals_list / review_appeal_decide）在 app.go 里
  // 只有 PermAPI 权限码，因此沿用考核管理按钮权限 esports:assessments:manage（已在报告注明）。
  const reviewAppealLoading = ref(false);
  const reviewAppeals = ref<EsportsPlayerReviewAppeal[]>([]);
  const reviewAppealStatusFilter = ref<string>();

  const reviewAppealStatusLabels: Record<string, string> = {
    pending: '待复核',
    approved: '申诉成立',
    rejected: '申诉驳回',
  };
  const reviewAppealStatusLabel = (value: string) =>
    reviewAppealStatusLabels[value] || value;
  const reviewAppealStatusColor = (value: string) => {
    if (value === 'approved') return 'green';
    if (value === 'rejected') return 'red';
    return 'orange';
  };
  const appellantTypeLabels: Record<string, string> = {
    player: '陪玩',
    customer: '客户',
  };
  const appellantTypeLabel = (value: string) =>
    appellantTypeLabels[value] || value;

  async function loadReviewAppeals() {
    reviewAppealLoading.value = true;
    try {
      reviewAppeals.value =
        (
          await listPlayerReviewAppeals({
            status: reviewAppealStatusFilter.value,
            limit: 100,
          })
        ).data.data || [];
    } catch (err) {
      reviewAppeals.value = [];
      Message.error(errorText(err, '加载评价申诉失败'));
    } finally {
      reviewAppealLoading.value = false;
    }
  }

  const reviewAppealVisible = ref(false);
  const reviewAppealTarget = ref<EsportsPlayerReviewAppeal | null>(null);
  const reviewAppealForm = reactive({
    decision: 'approve' as 'approve' | 'reject',
    note: '',
  });

  function openReviewAppeal(record: EsportsPlayerReviewAppeal) {
    reviewAppealTarget.value = record;
    reviewAppealForm.decision = 'approve';
    reviewAppealForm.note = '';
    reviewAppealVisible.value = true;
  }

  async function submitReviewAppeal() {
    if (!reviewAppealTarget.value) return;
    try {
      await reviewPlayerReviewAppeal(reviewAppealTarget.value.id, {
        decision: reviewAppealForm.decision,
        note: reviewAppealForm.note.trim(),
      });
      Message.success('评价申诉复核完成');
      reviewAppealVisible.value = false;
      await Promise.all([loadReviewAppeals(), loadReviews()]);
    } catch (err) {
      Message.error(
        errorText(err, '复核失败：该申诉可能已被复核或评价状态已变化')
      );
    }
  }

  onMounted(async () => {
    await loadRules();
    await loadAssessments();
    await loadReviews();
    await loadReviewAppeals();
  });
</script>

<style scoped>
  .toolbar {
    margin-bottom: 12px;
  }

  .hint {
    color: var(--color-text-3);
    font-size: 12px;
  }

  .score-note {
    margin-top: 12px;
  }

  .detail-table {
    margin-top: 12px;
  }
</style>
