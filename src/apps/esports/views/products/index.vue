<template>
  <div class="container page-container">
    <a-card class="general-card" title="商品">
      <a-tabs v-model:active-key="activeTab" @change="loadActive">
        <a-tab-pane key="products" title="商品" />
        <a-tab-pane key="categories" title="产品分类" />
        <a-tab-pane key="suspensions" title="商品停服" />
      </a-tabs>
      <a-space class="toolbar">
        <a-button :loading="loading" @click="loadActive">刷新</a-button>
        <a-select
          v-if="activeTab === 'suspensions'"
          v-model="suspensionStatusFilter"
          class="status-filter"
          @change="loadActive"
        >
          <a-option value="">全部状态</a-option>
          <a-option value="pending">待审批</a-option>
          <a-option value="approved">已批准待生效</a-option>
          <a-option value="applied">已生效</a-option>
          <a-option value="rejected">已驳回</a-option>
          <a-option value="cancelled">已撤回</a-option>
        </a-select>
        <a-button
          v-if="activeTab === 'products' && canAddProduct"
          type="primary"
          @click="openProduct()"
          >新建商品</a-button
        >
        <a-button
          v-if="activeTab === 'categories' && canManageCategory"
          type="primary"
          @click="openCategory()"
          >新增分类</a-button
        >
        <a-button
          v-if="activeTab === 'suspensions' && canRequestSuspension"
          type="primary"
          @click="openSuspension()"
          >发起停服申请</a-button
        >
      </a-space>

      <a-table
        v-if="activeTab === 'products'"
        :data="skus"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="code" title="编码" />
          <a-table-column data-index="title" title="商品名称" />
          <a-table-column title="产品分类">
            <template #cell="{ record }">{{
              categoryName(record.category_id)
            }}</template>
          </a-table-column>
          <a-table-column title="每份标价">
            <template #cell="{ record }">{{
              money(record.unit_price_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="最低议价">
            <template #cell="{ record }">{{
              money(record.min_unit_price_cents || record.unit_price_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="一份服务量">
            <template #cell="{ record }"
              >{{ record.service_units }}
              {{ record.service_unit_name }}</template
            >
          </a-table-column>
          <a-table-column title="名额（已售/总量）">
            <template #cell="{ record }">{{ quotaText(record) }}</template>
          </a-table-column>
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="productStatusColor(record.status)">{{
                productStatusText(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="180">
            <template #cell="{ record }">
              <a-button
                v-if="canEditProduct"
                type="text"
                @click="openProduct(record)"
                >编辑</a-button
              >
              <a-button
                v-if="canEditProduct && record.status === 'on_sale'"
                type="text"
                status="warning"
                @click="toggleSale(record, 'off_sale')"
                >下架</a-button
              >
              <a-button
                v-if="canEditProduct && record.status === 'off_sale'"
                type="text"
                @click="toggleSale(record, 'on_sale')"
                >上架</a-button
              >
            </template>
          </a-table-column>
        </template>
      </a-table>
      <a-table
        v-else-if="activeTab === 'categories'"
        :data="categories"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="code" title="分类编码" />
          <a-table-column data-index="name" title="分类名" />
          <a-table-column data-index="game" title="关联游戏" />
          <a-table-column data-index="sort_order" title="排序" />
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'enabled' ? 'green' : 'gray'">{{
                record.status === 'enabled' ? '启用' : '停用'
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column v-if="canManageCategory" title="操作">
            <template #cell="{ record }">
              <a-button type="text" @click="openCategory(record)"
                >编辑</a-button
              >
              <a-popconfirm
                content="确认删除该分类？被商品引用的分类无法删除。"
                @ok="removeCategory(record)"
              >
                <a-button type="text" status="danger">删除</a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
      </a-table>

      <a-table
        v-else
        :data="suspensions"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="id" title="ID" :width="70" />
          <a-table-column title="商品">
            <template #cell="{ record }">{{
              skuTitle(record.product_id)
            }}</template>
          </a-table-column>
          <a-table-column data-index="reason" title="停服原因" />
          <a-table-column title="生效方式" :width="110">
            <template #cell="{ record }">{{
              record.effective_mode === 'scheduled' ? '定时生效' : '立即生效'
            }}</template>
          </a-table-column>
          <a-table-column title="生效时间" :width="180">
            <template #cell="{ record }">{{
              fmtTime(record.effective_at)
            }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="130">
            <template #cell="{ record }">
              <a-tag :color="suspensionStatusColor(record.status)">{{
                suspensionStatusText(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="受影响订单" :width="110">
            <template #cell="{ record }">{{
              record.affected_order_count
            }}</template>
          </a-table-column>
          <a-table-column title="审批结论" :width="200">
            <template #cell="{ record }">{{ reviewText(record) }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="200">
            <template #cell="{ record }">
              <a-button
                v-if="canViewSuspensionDetail"
                type="text"
                @click="openSuspensionDetail(record)"
                >详情</a-button
              >
              <a-button
                v-if="record.status === 'pending' && canDecideSuspension"
                type="text"
                @click="openDecision(record)"
                >审批</a-button
              >
              <a-popconfirm
                v-if="record.status === 'pending' && canCancelSuspension"
                content="确认撤回该停服申请？撤回后 商品保持原状。"
                @ok="cancelSuspension(record)"
              >
                <a-button type="text" status="warning">撤回</a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="productVisible"
      :title="productForm.id ? '编辑商品' : '新建商品'"
      :width="720"
      @ok="saveProduct"
    >
      <a-form :model="productForm">
        <a-form-item
          label="商品编码"
          tooltip="按系统配置的前缀 + 全局流水自动生成，创建后不可修改。"
        >
          <a-input
            v-model="productForm.code"
            :max-length="80"
            disabled
            :placeholder="productForm.id ? '' : '保存后自动生成（前缀-流水）'"
          />
        </a-form-item>
        <a-form-item label="商品名称" required>
          <a-input v-model="productForm.title" :max-length="160" />
        </a-form-item>
        <a-form-item label="产品分类">
          <a-select
            :model-value="productForm.category_id ?? undefined"
            allow-clear
            @update:model-value="onCategoryChange"
          >
            <a-option
              v-for="item in categories.filter((c) => c.status === 'enabled')"
              :key="item.id"
              :value="item.id"
              >{{ item.name }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="服务类型" required>
          <a-select v-model="productForm.service_type">
            <a-option value="play">陪玩</a-option>
            <a-option value="teaching">教学</a-option>
            <a-option value="entertainment">娱乐</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="每份标价（元）" required>
          <a-input-number
            :model-value="productForm.unit_price_cents / 100"
            :min="0.01"
            :precision="2"
            @change="onUnitPriceChange"
          />
        </a-form-item>
        <a-form-item label="每份最低议价（元）" required>
          <a-input-number
            :model-value="productForm.min_unit_price_cents / 100"
            :min="0.01"
            :max="productForm.unit_price_cents / 100"
            :precision="2"
            @change="onMinUnitPriceChange"
          />
        </a-form-item>
        <a-form-item
          label="议价免审（%）"
          tooltip="占标价小计的百分比；超过该幅度须异人审批。提交时自动换算为基点保存。"
          required
        >
          <a-input-number
            :model-value="productForm.adjustment_approval_bp / 100"
            :min="0.01"
            :max="100"
            :precision="2"
            :step="1"
            @change="onApprovalBpChange"
          />
        </a-form-item>
        <a-form-item label="一份服务量" required>
          <a-input-number v-model="productForm.service_units" :min="1" />
        </a-form-item>
        <a-form-item label="服务单位" required>
          <a-input v-model="productForm.service_unit_name" :max-length="32" />
        </a-form-item>
        <a-form-item
          label="成本（元）"
          tooltip="成本仅用于毛利口径；留空表示不登记成本，编辑时未改动不会提交该字段。"
        >
          <a-input-number
            :model-value="productForm.cost_yuan ?? undefined"
            :min="0"
            :precision="2"
            allow-clear
            placeholder="未登记"
            @update:model-value="onCostChange"
          />
        </a-form-item>
        <a-form-item label="单次服务时长（分钟）">
          <a-input-number
            v-model="productForm.service_duration_minutes"
            :min="0"
            :max="1440"
          />
        </a-form-item>
        <a-form-item label="所需技能等级">
          <a-select v-model="productForm.required_level">
            <a-option
              v-for="level in skillLevels"
              :key="level.code"
              :value="level.code"
            >
              {{ level.name }}（{{ level.code }}）
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="结单要求"
          tooltip="关联生效结单规则后，该商品订单按规则的条件树与审批流结单。"
        >
          <a-select
            v-model="productForm.close_rule_code"
            allow-clear
            placeholder="不限（按游戏 / 全局规则）"
          >
            <a-option
              v-for="rule in activeCloseRules"
              :key="rule.id"
              :value="rule.code"
            >
              {{ rule.name }}（{{ rule.code }} · v{{ rule.version }}）
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="名额总量（-1 不限量）" required>
          <a-input-number v-model="productForm.quota_total" :min="-1" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="productForm.sort_order" />
        </a-form-item>
        <a-form-item label="服务说明">
          <a-textarea v-model="productForm.description" :max-length="500" />
        </a-form-item>
        <a-form-item
          label="内容图片"
          tooltip="商品详情展示的多张图片；可上传或从附件库选择，按添加顺序展示。"
        >
          <div class="product-content-field">
            <div v-if="productForm.content.length" class="product-content-list">
              <div
                v-for="(src, index) in productForm.content"
                :key="`${src}-${index}`"
                class="product-content-item"
              >
                <img
                  :src="src"
                  alt="商品内容图片"
                  class="product-content-thumb"
                />
                <a-button
                  size="mini"
                  status="danger"
                  @click="removeProductContentImage(index)"
                >
                  移除
                </a-button>
              </div>
            </div>
            <div class="product-content-actions">
              <AttachmentSelector
                accept="image/*"
                multiple
                default-directory="public/esports-product"
                @select="addProductContentImages"
              >
                <template #trigger="{ open }">
                  <a-button @mousedown.prevent @click="open">
                    添加图片
                  </a-button>
                </template>
              </AttachmentSelector>
              <span class="product-content-hint">
                当前 {{ productForm.content.length }} 张（最多 50 张）
              </span>
            </div>
          </div>
        </a-form-item>
        <a-form-item label="状态" required>
          <a-select v-model="productForm.status">
            <a-option value="draft">草稿</a-option>
            <a-option value="on_sale">上架</a-option>
            <a-option v-if="productForm.id" value="off_sale">下架</a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="categoryVisible"
      :title="categoryForm.id ? '编辑分类' : '新增分类'"
      @ok="saveCategory"
    >
      <a-form :model="categoryForm">
        <a-form-item label="分类编码" required>
          <a-input
            v-model="categoryForm.code"
            :disabled="Boolean(categoryForm.id)"
          />
        </a-form-item>
        <a-form-item label="分类名" required>
          <a-input v-model="categoryForm.name" :max-length="120" />
        </a-form-item>
        <a-form-item label="关联游戏">
          <a-input v-model="categoryForm.game" :max-length="120" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="categoryForm.sort_order" />
        </a-form-item>
        <a-form-item label="状态" required>
          <a-select v-model="categoryForm.status">
            <a-option value="enabled">启用</a-option>
            <a-option value="disabled">停用</a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="suspensionVisible"
      title="发起 商品停服申请"
      :width="620"
      @ok="saveSuspension"
    >
      <a-form :model="suspensionForm">
        <a-form-item label="停服商品" required>
          <a-select
            :model-value="suspensionForm.product_id ?? undefined"
            placeholder="仅可对在售商品 发起停服"
            @update:model-value="onSuspensionSkuChange"
          >
            <a-option
              v-for="item in skus.filter((s) => s.status === 'on_sale')"
              :key="item.id"
              :value="item.id"
              >{{ item.title }}（{{ item.code }}）</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="生效方式" required>
          <a-radio-group v-model="suspensionForm.effective_mode">
            <a-radio value="immediate">立即生效（审批通过即下架）</a-radio>
            <a-radio value="scheduled">定时生效</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="suspensionForm.effective_mode === 'scheduled'"
          label="生效时间"
          tooltip="须晚于当前时间，到点由后台任务自动下架。"
          required
        >
          <a-date-picker
            v-model="suspensionForm.effective_at"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
          />
        </a-form-item>
        <a-form-item
          label="停服原因"
          tooltip="提交后同一商品只允许一张进行中申请；受影响订单会生成逐单处置清单。"
          required
        >
          <a-textarea v-model="suspensionForm.reason" :max-length="500" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="decisionVisible"
      title="审批停服申请"
      :width="620"
      @ok="submitDecision"
    >
      <a-form :model="decisionForm">
        <a-form-item label="申请">
          <span v-if="decisionTarget"
            >#{{ decisionTarget.id }} ·
            {{ skuTitle(decisionTarget.product_id) }} · 受影响
            {{ decisionTarget.affected_order_count }} 单</span
          >
        </a-form-item>
        <a-form-item
          label="审批结论"
          tooltip="立即生效的申请通过后立刻下架商品并生成逐单处置清单；定时生效的等到生效时间自动下架。申请人不得自审。"
          required
        >
          <a-radio-group v-model="decisionForm.approve">
            <a-radio :value="true">通过</a-radio>
            <a-radio :value="false">驳回</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="审批理由" required>
          <a-textarea v-model="decisionForm.note" :max-length="500" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="suspensionDetailVisible"
      title="停服申请详情"
      :width="1000"
      :footer="false"
    >
      <a-descriptions :column="3" size="small" bordered>
        <a-descriptions-item label="申请 ID">{{
          detailSuspension?.id ?? '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="商品">{{
          detailSuspension ? skuTitle(detailSuspension.product_id) : '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          {{
            detailSuspension
              ? suspensionStatusText(detailSuspension.status)
              : '-'
          }}
        </a-descriptions-item>
        <a-descriptions-item label="生效方式">{{
          detailSuspension?.effective_mode === 'scheduled'
            ? '定时生效'
            : '立即生效'
        }}</a-descriptions-item>
        <a-descriptions-item label="生效时间">{{
          fmtTime(detailSuspension?.effective_at ?? null)
        }}</a-descriptions-item>
        <a-descriptions-item label="受影响订单">{{
          detailSuspension?.affected_order_count ?? 0
        }}</a-descriptions-item>
        <a-descriptions-item label="原因" :span="3">{{
          detailSuspension?.reason ?? '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="审批人 / 时间" :span="2">{{
          detailSuspension?.reviewed_by_admin_id
            ? `#${detailSuspension.reviewed_by_admin_id} · ${fmtTime(
                detailSuspension.reviewed_at
              )}`
            : '未审批'
        }}</a-descriptions-item>
        <a-descriptions-item label="审批理由">{{
          detailSuspension?.review_note || '-'
        }}</a-descriptions-item>
      </a-descriptions>
      <a-space class="toolbar detail-toolbar">
        <a-tag color="blue"
          >进度：共 {{ detailProgress.total }} · 待处置
          {{ detailProgress.pending }} · 已完成 {{ detailProgress.done }} · 失败
          {{ detailProgress.failed }}</a-tag
        >
      </a-space>
      <a-table
        :data="detailItems"
        row-key="id"
        :pagination="{ pageSize: 10 }"
        size="small"
      >
        <template #columns>
          <a-table-column data-index="order_no" title="订单号" />
          <a-table-column data-index="order_status" title="履约状态" />
          <a-table-column data-index="payment_status" title="支付状态" />
          <a-table-column title="建议处置" :width="120">
            <template #cell="{ record }">{{
              disposalActionText(record.suggested_action)
            }}</template>
          </a-table-column>
          <a-table-column title="处置记录" :width="160">
            <template #cell="{ record }">
              {{ record.action ? disposalActionText(record.action) : '-' }} /
              {{ itemStatusText(record.status) }}
            </template>
          </a-table-column>
          <a-table-column data-index="note" title="说明" />
          <a-table-column title="操作" :width="120">
            <template #cell="{ record }">
              <a-button
                v-if="
                  canDisposeSuspension &&
                  suspensionApplied &&
                  record.status !== 'done'
                "
                type="text"
                @click="openDisposal(record)"
                >处置</a-button
              >
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-modal>

    <a-modal
      v-model:visible="disposalVisible"
      title="受影响订单处置"
      :width="600"
      @ok="submitDisposal"
    >
      <a-form :model="disposalForm">
        <a-form-item label="订单">
          <span v-if="disposalTarget"
            >{{ disposalTarget.order_no }} · 建议
            {{ disposalActionText(disposalTarget.suggested_action) }}</span
          >
        </a-form-item>
        <a-form-item label="处置方式" required>
          <a-radio-group v-model="disposalForm.action">
            <a-radio value="cancel_refund">取消并退款</a-radio>
            <a-radio value="reschedule">改期</a-radio>
            <a-radio value="keep">保留继续服务</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="disposalForm.action === 'reschedule'"
          label="改期后的开始时间"
          tooltip="仅待付款订单可改期，且须晚于当前时间。"
          required
        >
          <a-date-picker
            v-model="disposalForm.start_at"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
          />
        </a-form-item>
        <a-form-item label="处置说明">
          <a-textarea v-model="disposalForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import AttachmentSelector from '@/components/attachment-selector/index.vue';
  import { getAttachmentAccessInfo } from '@/services/attachment-access.service';
  import type { AttachmentResponse } from '@/types/api';
  import yuanToCents from '@/utils/money';
  import { errorText } from '@/utils/error';
  import { formatYuan } from '@/utils/format';
  import { fetchSkillLevels, type SkillLevel } from '../../skill-levels';
  import {
    cancelSkuSuspension,
    createCategory,
    createSku,
    decideSkuSuspension,
    deleteCategory,
    disposeSkuSuspensionOrder,
    getSkuSuspension,
    listCategories,
    listCloseRules,
    listSkus,
    listSkuSuspensions,
    requestSkuSuspension,
    updateCategory,
    updateSku,
  } from '../../api';
  import type {
    CategoryInput,
    EsportsCloseRule,
    EsportsProductCategory,
    EsportsSku,
    EsportsSkuSuspension,
    EsportsSkuSuspensionItem,
    SkuInput,
    SkuSuspensionReport,
    SkuSuspensionStatus,
    SkuSuspensionSuggestedAction,
    SkuUpdateInput,
  } from '../../api';

  type ProductForm = Omit<SkuInput, 'cost_cents'> & {
    id: number;
    cost_yuan: number | null;
    // 内容图片：表单内始终是数组（接口未设置时为 null，回填归一成空数组）。
    content: string[];
  };

  const { hasButtonPermission, hasAnyPermission } = usePermission();
  const canDo = (code: string) =>
    hasButtonPermission(code) || hasAnyPermission([code]);
  const canAddProduct = computed(
    () => canDo('esports:products:create') || canDo('esports:products:add')
  );
  const canEditProduct = computed(
    () => canDo('esports:products:update') || canDo('esports:products:edit')
  );
  const canManageCategory = computed(() =>
    hasButtonPermission('esports:categories:manage')
  );
  const canViewSuspensionDetail = computed(() =>
    canDo('esports:products:suspension_detail')
  );
  const canRequestSuspension = computed(() =>
    canDo('esports:products:suspension_request')
  );
  const canDecideSuspension = computed(() =>
    canDo('esports:products:suspension_decision')
  );
  const canCancelSuspension = computed(() =>
    canDo('esports:products:suspension_cancel')
  );
  const canDisposeSuspension = computed(() =>
    canDo('esports:products:suspension_disposal')
  );

  // 商品门槛下拉的等级选项（配置驱动，在「系统配置」页编辑）。
  const skillLevels = ref<SkillLevel[]>([]);

  const activeTab = ref('products');
  const loading = ref(false);
  const skus = ref<EsportsSku[]>([]);
  const categories = ref<EsportsProductCategory[]>([]);
  const closeRules = ref<EsportsCloseRule[]>([]);
  const activeCloseRules = computed(() =>
    closeRules.value.filter((rule) => rule.status === 'active')
  );
  const suspensions = ref<EsportsSkuSuspension[]>([]);
  const suspensionStatusFilter = ref<SkuSuspensionStatus | ''>('');
  const suspensionReport = ref<SkuSuspensionReport | null>(null);
  const detailSuspension = computed(
    () => suspensionReport.value?.suspension ?? null
  );
  const detailItems = computed<EsportsSkuSuspensionItem[]>(
    () => suspensionReport.value?.items ?? []
  );
  const detailProgress = computed(
    () =>
      suspensionReport.value?.progress ?? {
        total: 0,
        pending: 0,
        done: 0,
        failed: 0,
      }
  );
  const suspensionApplied = computed(
    () => detailSuspension.value?.status === 'applied'
  );
  const productVisible = ref(false);
  const categoryVisible = ref(false);
  const suspensionVisible = ref(false);
  const decisionVisible = ref(false);
  const suspensionDetailVisible = ref(false);
  const disposalVisible = ref(false);

  const emptyProductForm = (): ProductForm => ({
    id: 0,
    code: '',
    title: '',
    service_type: 'play',
    category_id: null,
    description: '',
    content: [],
    unit_price_cents: 1,
    min_unit_price_cents: 1,
    adjustment_approval_bp: 2000,
    service_units: 1,
    service_unit_name: '小时',
    cost_yuan: null,
    service_duration_minutes: 60,
    required_level: 'novice',
    close_rule_code: '',
    quota_total: -1,
    sort_order: 0,
    status: 'draft',
  });
  const productForm = reactive<ProductForm>(emptyProductForm());
  const originalProduct = ref<EsportsSku | null>(null);
  const costBaseline = ref<number | null>(null);
  watch(
    () => productForm.unit_price_cents,
    (price, previous) => {
      if (!productForm.id && productForm.min_unit_price_cents === previous) {
        productForm.min_unit_price_cents = price;
      }
    }
  );

  const emptyCategoryForm = (): CategoryInput & { id: number } => ({
    id: 0,
    code: '',
    name: '',
    game: '',
    sort_order: 0,
    status: 'enabled',
  });
  const categoryForm = reactive(emptyCategoryForm());

  const suspensionForm = reactive<{
    product_id: number | null;
    reason: string;
    effective_mode: 'immediate' | 'scheduled';
    effective_at: string;
  }>({
    product_id: null,
    reason: '',
    effective_mode: 'immediate',
    effective_at: '',
  });
  function onSuspensionSkuChange(value: unknown) {
    suspensionForm.product_id = typeof value === 'number' ? value : null;
  }
  const decisionTarget = ref<EsportsSkuSuspension | null>(null);
  const decisionForm = reactive<{ approve: boolean; note: string }>({
    approve: true,
    note: '',
  });
  const disposalTarget = ref<EsportsSkuSuspensionItem | null>(null);
  const disposalForm = reactive<{
    action: SkuSuspensionSuggestedAction;
    note: string;
    start_at: string;
  }>({ action: 'cancel_refund', note: '', start_at: '' });

  const money = formatYuan;
  const fmtTime = (value: string | null) =>
    value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
  const productStatusText = (status: EsportsSku['status']) =>
    ({ on_sale: '上架', draft: '草稿', off_sale: '下架' }[status]);
  const productStatusColor = (status: EsportsSku['status']) =>
    ({ on_sale: 'green', draft: 'orange', off_sale: 'gray' }[status]);
  const categoryName = (id: number | null) =>
    categories.value.find((item) => item.id === id)?.name || '未分类';
  const quotaText = (record: EsportsSku) =>
    record.quota_total === -1
      ? `不限（已售 ${record.quota_sold}）`
      : `${record.quota_sold}/${record.quota_total}`;
  const suspensionStatusText = (status: SkuSuspensionStatus) =>
    ({
      pending: '待审批',
      approved: '已批准待生效',
      rejected: '已驳回',
      applied: '已生效',
      cancelled: '已撤回',
    }[status]);
  const suspensionStatusColor = (status: SkuSuspensionStatus) =>
    ({
      pending: 'orange',
      approved: 'blue',
      rejected: 'gray',
      applied: 'green',
      cancelled: 'gray',
    }[status]);
  const reviewText = (record: EsportsSkuSuspension) =>
    record.reviewed_by_admin_id
      ? `#${record.reviewed_by_admin_id} · ${fmtTime(record.reviewed_at)}`
      : '未审批';
  const disposalActionText = (action: string) =>
    ({ cancel_refund: '取消并退款', reschedule: '改期', keep: '保留继续服务' }[
      action
    ] || action);
  const itemStatusText = (status: string) =>
    ({ pending: '待处置', done: '已完成', failed: '失败' }[status] || status);
  const skuTitle = (id: number) =>
    skus.value.find((item) => item.id === id)?.title || `#${id}`;
  async function loadActive() {
    loading.value = true;
    try {
      if (activeTab.value === 'products') {
        const [skuResult, categoryResult, ruleResult] = await Promise.all([
          listSkus(),
          listCategories(),
          listCloseRules(),
        ]);
        skus.value = skuResult.data.data || [];
        categories.value = categoryResult.data.data || [];
        closeRules.value = ruleResult.data.data || [];
      } else if (activeTab.value === 'categories') {
        categories.value = (await listCategories()).data.data || [];
      } else {
        const [listResult, skuResult] = await Promise.all([
          listSkuSuspensions(suspensionStatusFilter.value || undefined),
          listSkus(),
        ]);
        suspensions.value = listResult.data.data || [];
        skus.value = skuResult.data.data || [];
      }
    } catch (err) {
      Message.error(errorText(err, '加载失败，请稍后重试'));
    } finally {
      loading.value = false;
    }
  }

  function onCategoryChange(value: unknown) {
    productForm.category_id = typeof value === 'number' ? value : null;
  }
  function onCostChange(value: unknown) {
    productForm.cost_yuan = typeof value === 'number' ? value : null;
  }
  // 价格类字段表单按元录入，落库仍以分保存
  function onUnitPriceChange(value: unknown) {
    productForm.unit_price_cents =
      typeof value === 'number' ? yuanToCents(value) : 0;
  }
  function onMinUnitPriceChange(value: unknown) {
    productForm.min_unit_price_cents =
      typeof value === 'number' ? yuanToCents(value) : 0;
  }
  // 表单按百分比录入，落库仍以基点保存（1% = 100 基点）
  function onApprovalBpChange(value: unknown) {
    productForm.adjustment_approval_bp =
      typeof value === 'number' ? yuanToCents(value) : 0;
  }
  function openProduct(record?: EsportsSku) {
    originalProduct.value = record || null;
    const costYuan =
      typeof record?.cost_cents === 'number' ? record.cost_cents / 100 : null;
    const recordContent = record?.content;
    Object.assign(productForm, emptyProductForm(), record || {}, {
      cost_yuan: costYuan,
      // 接口未设置内容图片时是 null，表单内归一成空数组。
      content: Array.isArray(recordContent) ? [...recordContent] : [],
    });
    if (!record) {
      // 新建商品默认最低档（配置驱动，不一定还是 novice）。
      productForm.required_level = skillLevels.value[0]?.code || 'novice';
    }
    costBaseline.value = costYuan;
    productVisible.value = true;
  }
  // 内容图片（与 CMS 纯图片同规则）：只接受公开附件，保存站内 /uploads/ 路径或绝对地址，
  // 客户端按原顺序直接渲染。
  async function resolveProductContentUrl(item: AttachmentResponse) {
    const access = await getAttachmentAccessInfo(item.id);
    if (!access.public) return '';
    const parsed = new URL(access.url, window.location.origin);
    return parsed.pathname.startsWith('/uploads/')
      ? parsed.pathname
      : access.url;
  }
  async function addProductContentImages(
    selection: AttachmentResponse | AttachmentResponse[]
  ) {
    const items = (Array.isArray(selection) ? selection : [selection]).filter(
      (item) => item?.mime_type?.startsWith('image/')
    );
    const resolved = await Promise.all(
      items.map(async (item) => {
        try {
          const src = await resolveProductContentUrl(item);
          if (!src) {
            Message.error(`「${item.original_name}」不是公开图片，已跳过`);
            return '';
          }
          return src;
        } catch {
          Message.error(`无法获取「${item.original_name}」的访问地址`);
          return '';
        }
      })
    );
    const added = resolved.filter(Boolean);
    if (added.length === 0) return;
    const room = 50 - productForm.content.length;
    if (added.length > room) {
      Message.warning('内容图片最多 50 张，超出部分已忽略');
      productForm.content.push(...added.slice(0, Math.max(room, 0)));
      return;
    }
    productForm.content.push(...added);
  }
  function removeProductContentImage(index: number) {
    productForm.content.splice(index, 1);
  }
  const costCents = (yuan: number | null) =>
    yuan === null ? null : yuanToCents(yuan);
  function productPayload(): SkuUpdateInput {
    const payload: SkuUpdateInput = {
      title: productForm.title.trim(),
      service_type: productForm.service_type,
      category_id: productForm.category_id,
      description: productForm.description.trim(),
      content: [...productForm.content],
      unit_price_cents: productForm.unit_price_cents,
      min_unit_price_cents: productForm.min_unit_price_cents,
      adjustment_approval_bp: productForm.adjustment_approval_bp,
      service_units: productForm.service_units,
      service_unit_name: productForm.service_unit_name.trim(),
      service_duration_minutes: productForm.service_duration_minutes,
      required_level: productForm.required_level,
      close_rule_code: productForm.close_rule_code || '',
      quota_total: productForm.quota_total,
      sort_order: productForm.sort_order,
      status: productForm.status,
    };
    if (productForm.cost_yuan !== costBaseline.value) {
      payload.cost_cents = costCents(productForm.cost_yuan);
    }
    return payload;
  }
  async function saveProduct() {
    if (!productForm.title.trim()) {
      Message.error('请填写商品名称');
      return;
    }
    if (!productForm.service_unit_name.trim()) {
      Message.error('请填写服务单位');
      return;
    }
    if (
      productForm.unit_price_cents < 1 ||
      productForm.min_unit_price_cents < 1 ||
      productForm.min_unit_price_cents > productForm.unit_price_cents
    ) {
      Message.error('最低议价须在 0.01 元与标价之间');
      return;
    }
    if (
      productForm.adjustment_approval_bp < 1 ||
      productForm.adjustment_approval_bp > 10000
    ) {
      Message.error('议价免审须在 0.01%–100% 之间');
      return;
    }
    if (productForm.service_units < 1 || productForm.quota_total < -1) {
      Message.error('请检查服务量与名额总量');
      return;
    }
    if (productForm.cost_yuan !== null && productForm.cost_yuan < 0) {
      Message.error('成本不能为负');
      return;
    }
    try {
      if (productForm.id) {
        await updateSku(productForm.id, productPayload());
      } else {
        const payload: SkuInput = {
          code: productForm.code.trim(),
          ...productPayload(),
        };
        await createSku(payload);
      }
      productVisible.value = false;
      Message.success('已保存商品');
      await loadActive();
    } catch (err) {
      Message.error(errorText(err, '保存商品失败，请检查字段或名额限制'));
    }
  }
  async function toggleSale(record: EsportsSku, status: EsportsSku['status']) {
    openProduct(record);
    productForm.status = status;
    productVisible.value = false;
    await saveProduct();
  }

  // ── 产品分类 ──
  function openCategory(record?: EsportsProductCategory) {
    Object.assign(categoryForm, record ? { ...record } : emptyCategoryForm());
    categoryVisible.value = true;
  }

  async function saveCategory() {
    if (!categoryForm.code.trim() || !categoryForm.name.trim()) {
      Message.error('请填写分类编码与名称');
      return;
    }
    const payload: CategoryInput = {
      code: categoryForm.code,
      name: categoryForm.name,
      game: categoryForm.game,
      sort_order: categoryForm.sort_order,
      status: categoryForm.status,
    };
    try {
      if (categoryForm.id) {
        await updateCategory(categoryForm.id, payload);
      } else {
        await createCategory(payload);
      }
      categoryVisible.value = false;
      Message.success('已保存');
      await loadActive();
    } catch (err) {
      Message.error(errorText(err, '保存分类失败，编码可能已存在'));
    }
  }

  async function removeCategory(record: EsportsProductCategory) {
    try {
      await deleteCategory(record.id);
      Message.success('已删除');
      await loadActive();
    } catch (err) {
      Message.error(errorText(err, '删除失败，分类可能已被商品引用'));
    }
  }

  // ── 商品停服（：申请 → 异人审批 → 逐单处置） ──
  async function openSuspension() {
    Object.assign(suspensionForm, {
      product_id: null,
      reason: '',
      effective_mode: 'immediate',
      effective_at: '',
    });
    if (skus.value.length === 0) {
      try {
        skus.value = (await listSkus()).data.data || [];
      } catch (err) {
        Message.error(errorText(err, '加载商品列表失败'));
        return;
      }
    }
    suspensionVisible.value = true;
  }

  async function saveSuspension() {
    if (!suspensionForm.product_id) {
      Message.error('请选择要停服的商品');
      return;
    }
    const reason = suspensionForm.reason.trim();
    if (!reason) {
      Message.error('请填写停服原因');
      return;
    }
    const scheduled = suspensionForm.effective_mode === 'scheduled';
    if (scheduled && !suspensionForm.effective_at) {
      Message.error('定时生效须选择生效时间');
      return;
    }
    if (scheduled && new Date(suspensionForm.effective_at) <= new Date()) {
      Message.error('生效时间须晚于当前时间');
      return;
    }
    try {
      await requestSkuSuspension(suspensionForm.product_id, {
        reason,
        effective_mode: suspensionForm.effective_mode,
        effective_at: scheduled
          ? new Date(suspensionForm.effective_at).toISOString()
          : undefined,
      });
      suspensionVisible.value = false;
      Message.success('已提交停服申请，等待异人审批');
      await loadActive();
    } catch (err) {
      Message.error(
        errorText(
          err,
          '发起失败：仅可对在售商品 发起，且同一商品 只允许一张进行中申请'
        )
      );
    }
  }

  async function loadSuspensionDetail(id: number) {
    try {
      suspensionReport.value = (await getSkuSuspension(id)).data.data;
    } catch (err) {
      Message.error(errorText(err, '加载停服详情失败'));
    }
  }

  function openDecision(record: EsportsSkuSuspension) {
    decisionTarget.value = record;
    Object.assign(decisionForm, { approve: true, note: '' });
    decisionVisible.value = true;
  }

  async function submitDecision() {
    if (!decisionTarget.value) return;
    const note = decisionForm.note.trim();
    if (!note) {
      Message.error('请填写审批理由');
      return;
    }
    try {
      await decideSkuSuspension(decisionTarget.value.id, {
        approve: decisionForm.approve,
        note,
      });
      decisionVisible.value = false;
      Message.success('已提交审批结论');
      await loadActive();
    } catch (err) {
      Message.error(errorText(err, '审批失败：申请人不得自审，或状态已变化'));
    }
  }

  async function cancelSuspension(record: EsportsSkuSuspension) {
    try {
      await cancelSkuSuspension(record.id);
      Message.success('已撤回停服申请');
      await loadActive();
    } catch (err) {
      Message.error(errorText(err, '撤回失败：申请已审批或状态已变化'));
    }
  }

  async function openSuspensionDetail(record: EsportsSkuSuspension) {
    suspensionReport.value = null;
    await loadSuspensionDetail(record.id);
    suspensionDetailVisible.value = true;
  }

  function openDisposal(item: EsportsSkuSuspensionItem) {
    disposalTarget.value = item;
    Object.assign(disposalForm, {
      action: item.suggested_action,
      note: '',
      start_at: '',
    });
    disposalVisible.value = true;
  }

  async function submitDisposal() {
    const suspension = detailSuspension.value;
    const item = disposalTarget.value;
    if (!suspension || !item) return;
    const reschedule = disposalForm.action === 'reschedule';
    if (reschedule && !disposalForm.start_at) {
      Message.error('改期须选择新的开始时间');
      return;
    }
    if (reschedule && new Date(disposalForm.start_at) <= new Date()) {
      Message.error('改期时间须晚于当前时间');
      return;
    }
    try {
      await disposeSkuSuspensionOrder(suspension.id, item.order_id, {
        action: disposalForm.action,
        note: disposalForm.note.trim(),
        start_at: reschedule
          ? new Date(disposalForm.start_at).toISOString()
          : undefined,
      });
      disposalVisible.value = false;
      Message.success('已提交处置');
      await loadSuspensionDetail(suspension.id);
      await loadActive();
    } catch (err) {
      Message.error(
        errorText(err, '处置失败：已开工订单不可直接取消，可改选改期或保留')
      );
      await loadSuspensionDetail(suspension.id);
    }
  }

  onMounted(() => {
    loadActive();
    // 表单下拉需要等级选项：进入页面即拉取，不等到打开表单。
    fetchSkillLevels().then((items) => {
      skillLevels.value = items;
    });
  });
</script>

<style scoped>
  .toolbar {
    margin-bottom: 16px;
  }

  .status-filter {
    width: 160px;
  }

  .detail-toolbar {
    margin-top: 12px;
  }

  .product-content-field {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .product-content-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .product-content-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
  }

  .product-content-thumb {
    width: 132px;
    height: 96px;
    object-fit: cover;
    background-color: var(--color-fill-2);
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
  }

  .product-content-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .product-content-hint {
    color: var(--color-text-3);
    font-size: 12px;
  }
</style>
