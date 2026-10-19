<template>
  <div class="container page-container">
    <a-card class="general-card" title="页面装修">
      <a-space class="toolbar" wrap>
        <!-- 首页版本 / 渠道选择（§16.2-02）：切换后编辑与发布目标随之改变。 -->
        <a-select
          v-model="channel"
          :style="{ width: '200px' }"
          placeholder="选择首页版本"
          @change="onChannelChange"
        >
          <a-option
            v-for="item in pageDocs"
            :key="item.channel"
            :value="item.channel"
          >
            {{ channelLabel(item.channel) }}（{{
              item.published_version_no
                ? `生效 v${item.published_version_no}`
                : '未发布'
            }}）
          </a-option>
        </a-select>
        <a-tag color="arcoblue">{{ channelLabel(channel) }}</a-tag>
        <a-tag :color="statusColor(doc.status)">{{
          statusLabel(doc.status)
        }}</a-tag>
        <span class="hint"
          >草稿版本 {{ doc.draft_version }} · 生效版本
          {{ doc.published_version_no || '未发布' }}</span
        >
        <a-button :loading="loading" @click="load">刷新</a-button>
        <a-button :loading="saving" type="primary" @click="saveDraft"
          >保存草稿</a-button
        >
        <a-button @click="previewVisible = true">预览</a-button>
        <!-- 发布申请 → 异人审核（§16.4 / §16.5）：运营提交申请，有发布权限者审核，回滚同权限。 -->
        <a-button v-if="canSubmit" :loading="publishing" @click="publishNow"
          >提交发布</a-button
        >
        <a-date-picker
          v-if="canSubmit"
          v-model="scheduledAt"
          show-time
          placeholder="定时发布时间"
          :style="{ width: '200px' }"
        />
        <a-button
          v-if="canSubmit"
          :loading="publishing"
          @click="publishScheduled"
          >定时发布</a-button
        >
        <a-select
          v-if="canRollback"
          v-model="rollbackVersion"
          placeholder="回滚到版本"
          allow-clear
          :style="{ width: '160px' }"
        >
          <a-option
            v-for="version in versions"
            :key="version.id"
            :value="version.version_no"
            >v{{ version.version_no }}（{{
              statusLabel(version.status)
            }}）</a-option
          >
        </a-select>
        <a-button v-if="canRollback" :loading="publishing" @click="rollback"
          >回滚</a-button
        >
      </a-space>

      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="design" title="装修">
          <div class="designer">
            <div class="palette">
              <div class="section-title">组件库</div>
              <!-- 组件库按分类分组并标注用途 / 适用数据源（§16.2-03）。 -->
              <template v-for="group in componentGroups" :key="group.title">
                <div class="palette-group">{{ group.title }}</div>
                <div
                  v-for="item in group.items"
                  :key="item.type"
                  class="palette-item"
                >
                  <a-button long @click="addComponent(item.type)">{{
                    item.label
                  }}</a-button>
                  <div class="palette-usage">{{ item.usage }}</div>
                  <div class="palette-source"
                    >数据源：{{ item.dataSource }}</div
                  >
                </div>
              </template>
            </div>

            <div class="canvas">
              <div class="section-title"
                >手机画布（{{ components.length }}）· 拖拽排序</div
              >
              <a-empty
                v-if="!components.length"
                description="从左侧组件库添加组件"
              />
              <div
                v-for="(component, index) in components"
                :key="index"
                class="canvas-item"
                :class="{
                  'active': index === selectedIndex,
                  'drag-over': index === dragOverIndex,
                }"
                draggable="true"
                @dragstart="onDragStart(index, $event)"
                @dragover.prevent="dragOverIndex = index"
                @drop.prevent="onDrop(index)"
                @dragend="onDragEnd"
                @click="selectComponent(index)"
              >
                <span class="drag-handle">⠿</span>
                <span class="canvas-label">{{
                  componentLabel(component.type)
                }}</span>
                <a-switch
                  v-model="component.visible"
                  size="small"
                  @click.stop
                />
                <a-space @click.stop>
                  <a-button
                    size="mini"
                    :disabled="index === 0"
                    @click="move(index, -1)"
                    >上移</a-button
                  >
                  <a-button
                    size="mini"
                    :disabled="index === components.length - 1"
                    @click="move(index, 1)"
                    >下移</a-button
                  >
                  <a-button size="mini" @click="duplicate(index)"
                    >复制</a-button
                  >
                  <a-button size="mini" status="danger" @click="remove(index)"
                    >删除</a-button
                  >
                </a-space>
              </div>
            </div>

            <div class="inspector">
              <div class="section-title">属性</div>
              <a-empty
                v-if="selectedIndex < 0"
                description="选中组件后编辑属性"
              />
              <template v-else>
                <a-descriptions :column="1" size="small">
                  <a-descriptions-item label="类型">{{
                    componentLabel(components[selectedIndex].type)
                  }}</a-descriptions-item>
                </a-descriptions>
                <a-empty
                  v-if="!currentSchema.length"
                  description="该组件无自由属性"
                />
                <div
                  v-for="field in currentSchema"
                  :key="field.key"
                  class="prop-field"
                >
                  <label class="prop-label">{{ field.label }}</label>

                  <a-input
                    v-if="field.kind === 'text'"
                    :model-value="stringField(field.key)"
                    :placeholder="field.placeholder"
                    @update:model-value="(v) => setField(field.key, v)"
                  />

                  <a-textarea
                    v-else-if="field.kind === 'textarea'"
                    :model-value="stringField(field.key)"
                    :placeholder="field.placeholder"
                    :auto-size="{ minRows: 2, maxRows: 5 }"
                    @update:model-value="(v) => setField(field.key, v)"
                  />

                  <a-input-number
                    v-else-if="field.kind === 'number'"
                    :model-value="numberField(field.key)"
                    :min="field.min"
                    :max="field.max"
                    @update:model-value="(v) => setField(field.key, v)"
                  />

                  <input
                    v-else-if="field.kind === 'color'"
                    type="color"
                    class="prop-color"
                    :value="stringField(field.key) || '#165dff'"
                    @input="onColorInput(field.key, $event)"
                  />

                  <a-input
                    v-else-if="field.kind === 'numberList'"
                    :model-value="stringField(field.key)"
                    placeholder="例如 1,2,3"
                    @update:model-value="(v) => setField(field.key, v)"
                  />

                  <div v-else-if="field.kind === 'images'" class="prop-images">
                    <div
                      v-for="(url, i) in imageList()"
                      :key="i"
                      class="prop-image-row"
                    >
                      <a-input
                        :model-value="url"
                        placeholder="https:// 或站内 /path"
                        @update:model-value="(v) => updateImage(i, v)"
                      />
                      <a-button size="mini" @click="openCropperForImages(i)"
                        >裁剪</a-button
                      >
                      <a-button
                        size="mini"
                        status="danger"
                        @click="removeImage(i)"
                        >删</a-button
                      >
                    </div>
                    <a-space>
                      <a-button size="mini" type="outline" @click="addImage"
                        >添加图片</a-button
                      >
                      <a-button
                        size="mini"
                        type="outline"
                        @click="openCropperForImages(-1)"
                        >上传裁剪</a-button
                      >
                    </a-space>
                  </div>

                  <div v-else-if="field.kind === 'navItems'" class="prop-nav">
                    <div
                      v-for="(item, i) in navItemList()"
                      :key="i"
                      class="prop-nav-row"
                    >
                      <a-input
                        :model-value="item.name"
                        placeholder="名称"
                        @update:model-value="(v) => updateNavItem(i, 'name', v)"
                      />
                      <a-input
                        :model-value="item.icon"
                        placeholder="图标：https:// 或 icon-code"
                        @update:model-value="(v) => updateNavItem(i, 'icon', v)"
                      />
                      <a-select
                        :model-value="item.target"
                        :style="{ width: '120px' }"
                        @update:model-value="
                          (v) =>
                            updateNavItem(
                              i,
                              'target',
                              typeof v === 'string' ? v : ''
                            )
                        "
                      >
                        <a-option
                          v-for="opt in navTargetOptions"
                          :key="opt.value"
                          :value="opt.value"
                          >{{ opt.label }}</a-option
                        >
                      </a-select>
                      <!-- 顺序即数组顺序，客户端按该顺序渲染宫格（§16.3-04）。 -->
                      <a-button
                        size="mini"
                        :disabled="i === 0"
                        @click="moveNavItem(i, -1)"
                        >上移</a-button
                      >
                      <a-button
                        size="mini"
                        :disabled="i === navItemList().length - 1"
                        @click="moveNavItem(i, 1)"
                        >下移</a-button
                      >
                      <a-button
                        size="mini"
                        status="danger"
                        @click="removeNavItem(i)"
                        >删</a-button
                      >
                    </div>
                    <a-button size="mini" type="outline" @click="addNavItem"
                      >添加导航项</a-button
                    >
                    <div class="palette-usage">
                      图标支持 https:// 图片地址、站内
                      /path，或客户端内置图标短标识（如 icon-cs）。
                    </div>
                  </div>
                </div>
                <div class="prop-hint">属性实时写入草稿，保存草稿后生效</div>
              </template>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="versions" title="发布记录">
          <!-- 版本差异视图（§16.2-07）：任选两版查看组件级差异。 -->
          <a-space class="toolbar" wrap>
            <a-select
              v-model="diffLeftNo"
              placeholder="版本 A"
              :style="{ width: '150px' }"
              allow-clear
            >
              <a-option
                v-for="item in versions"
                :key="item.id"
                :value="item.version_no"
                >v{{ item.version_no }}</a-option
              >
            </a-select>
            <a-select
              v-model="diffRightNo"
              placeholder="版本 B"
              :style="{ width: '150px' }"
              allow-clear
            >
              <a-option
                v-for="item in versions"
                :key="item.id"
                :value="item.version_no"
                >v{{ item.version_no }}</a-option
              >
            </a-select>
            <a-button @click="swapDiffVersions">对调</a-button>
            <a-typography-text type="secondary">
              {{
                diffSummary ||
                '选择两个版本后展示新增 / 删除 / 变更的组件级差异'
              }}
            </a-typography-text>
          </a-space>
          <a-table
            v-if="diffRows.length"
            :data="diffRows"
            row-key="key"
            :pagination="false"
            size="small"
            class="sub-card"
          >
            <template #columns>
              <a-table-column data-index="position" title="位置" :width="70" />
              <a-table-column title="差异类型" :width="100">
                <template #cell="{ record }">
                  <a-tag :color="diffColor(record.kind)">{{
                    diffKindLabel(record.kind)
                  }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column data-index="component" title="组件" />
              <a-table-column data-index="detail" title="变更明细" />
            </template>
          </a-table>
          <a-table :data="versions" row-key="id" :pagination="{ pageSize: 10 }">
            <template #columns>
              <a-table-column title="版本">
                <template #cell="{ record }">v{{ record.version_no }}</template>
              </a-table-column>
              <a-table-column title="状态">
                <template #cell="{ record }">
                  <a-tag :color="statusColor(record.status)">{{
                    statusLabel(record.status)
                  }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="发布方式">
                <template #cell="{ record }">{{
                  record.publish_mode === 'scheduled' ? '定时' : '立即'
                }}</template>
              </a-table-column>
              <a-table-column title="发布人">
                <template #cell="{ record }">{{
                  publisherLabel(record.published_by)
                }}</template>
              </a-table-column>
              <a-table-column title="目标渠道">
                <template #cell="{ record }">{{
                  channelLabel(record.channel)
                }}</template>
              </a-table-column>
              <a-table-column title="发布/计划时间">
                <template #cell="{ record }">{{
                  fmtTime(record.published_at || record.scheduled_at)
                }}</template>
              </a-table-column>
              <a-table-column title="回滚来源">
                <template #cell="{ record }">{{
                  record.rollback_from_version_no
                    ? `v${record.rollback_from_version_no}`
                    : '-'
                }}</template>
              </a-table-column>
              <a-table-column data-index="note" title="备注" />
              <a-table-column data-index="created_at" title="生成时间">
                <template #cell="{ record }">{{
                  fmtTime(record.created_at)
                }}</template>
              </a-table-column>
              <a-table-column title="操作">
                <template #cell="{ record }">
                  <template v-if="record.status === 'pending_review'">
                    <a-space v-if="canReview">
                      <a-button
                        size="mini"
                        type="primary"
                        :loading="publishing"
                        @click="approvePublish(record.id)"
                        >通过</a-button
                      >
                      <a-button
                        size="mini"
                        status="danger"
                        :loading="publishing"
                        @click="rejectPublish(record.id)"
                        >驳回</a-button
                      >
                    </a-space>
                    <span v-else>-</span>
                  </template>
                  <span v-else>-</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="assets" title="素材库">
          <a-space class="toolbar" wrap>
            <a-input
              v-model="assetForm.name"
              placeholder="素材名称"
              :style="{ width: '160px' }"
            />
            <a-input
              v-model="assetForm.url"
              placeholder="https:// 或站内 /path"
              :style="{ width: '280px' }"
            />
            <a-input-number
              v-model="assetForm.width"
              placeholder="宽"
              :min="1"
              :max="4096"
              :style="{ width: '100px' }"
            />
            <a-input-number
              v-model="assetForm.height"
              placeholder="高"
              :min="1"
              :max="4096"
              :style="{ width: '100px' }"
            />
            <a-button type="primary" @click="createAsset">新增素材</a-button>
            <a-button @click="openCropperForAsset">上传并裁剪</a-button>
          </a-space>
          <a-table :data="assets" row-key="id" :pagination="{ pageSize: 10 }">
            <template #columns>
              <a-table-column data-index="name" title="名称" />
              <a-table-column data-index="url" title="地址" />
              <a-table-column title="尺寸">
                <template #cell="{ record }"
                  >{{ record.width }}×{{ record.height }}</template
                >
              </a-table-column>
              <a-table-column title="操作">
                <template #cell="{ record }">
                  <a-button
                    size="mini"
                    status="danger"
                    @click="removeAsset(record.id)"
                    >删除</a-button
                  >
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 真实预览（手机画布，复用客户端渲染规则） -->
    <a-modal
      v-model:visible="previewVisible"
      :footer="false"
      :width="420"
      title="手机端预览"
    >
      <PagePreview :components="components" />
    </a-modal>

    <!-- 图片上传裁剪 -->
    <ImageCropper
      :visible="cropperVisible"
      @confirm="onCropperConfirm"
      @cancel="cropperVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import { getAdmins } from '@/api/user';
  import { uploadAttachment } from '@/api/attachment';
  import { getAttachmentAccessInfo } from '@/services/attachment-access.service';
  import {
    PAGE_CHANNEL_CUSTOMER_HOME,
    createEsportsPageAsset,
    deleteEsportsPageAsset,
    getEsportsPage,
    getEsportsPageAssets,
    getEsportsPages,
    getEsportsPageVersions,
    publishEsportsPage,
    reviewEsportsPagePublish,
    rollbackEsportsPage,
    saveEsportsPageDraft,
  } from '../../api';
  import type {
    PageAsset,
    PageComponent,
    PageComponentType,
    PageDocument,
    PageVersion,
  } from '../../api';
  import ImageCropper from '../../components/page-designer/ImageCropper.vue';
  import PagePreview from '../../components/page-designer/PagePreview.vue';

  // ── 可视化属性面板 schema（§16.2） ──
  type PropFieldKind =
    | 'text'
    | 'textarea'
    | 'number'
    | 'color'
    | 'numberList'
    | 'images'
    | 'navItems';

  interface PropField {
    key: string;
    label: string;
    kind: PropFieldKind;
    placeholder?: string;
    min?: number;
    max?: number;
  }

  interface NavItemDraft {
    name: string;
    target: string;
    // 图标（§16.3-04）：https:// / 站内 /path / 内置图标短标识（如 icon-cs）。
    icon: string;
  }

  // 组件库分组与用途 / 数据源说明（§16.2-03）：与后端 pagePropsWhitelist 的键保持一一对应。
  interface ComponentMeta {
    type: PageComponentType;
    label: string;
    usage: string;
    dataSource: string;
  }
  interface ComponentGroup {
    title: string;
    items: ComponentMeta[];
  }

  const componentGroups: ComponentGroup[] = [
    {
      title: '基础',
      items: [
        {
          type: 'search',
          label: '顶部搜索',
          usage: '首页顶部搜索入口，可配占位文案、热门词与搜索范围',
          dataSource: '手动配置（占位文案 / 热门词 / 范围）',
        },
        {
          type: 'notice',
          label: '公告条',
          usage: '滚动公告，可配图标、文字颜色与生效有效期',
          dataSource: '手动配置（文本）',
        },
        {
          type: 'carousel',
          label: '轮播图',
          usage: '顶部轮播，可配图片、切换间隔与生效有效期',
          dataSource: '素材库 / 手动配置图片地址',
        },
      ],
    },
    {
      title: '内容与商品',
      items: [
        {
          type: 'category',
          label: '游戏/服务分类',
          usage: '分类导航，可配标题、分类项、展示数量与布局',
          dataSource: '商品分类（服务端分类数据）',
        },
        {
          type: 'product_list',
          label: '商品/套餐列表',
          usage: '商品列表，可配标题、数量、指定 SKU 与排序 / 筛选',
          dataSource: '在售 SKU（可取数规则 rule_code）',
        },
        {
          type: 'player_recommend',
          label: '陪玩推荐',
          usage: '陪玩推荐位，可按游戏、等级、在线与可预约筛选',
          dataSource: '陪玩档案（资质 / 在线状态）',
        },
        {
          type: 'activity',
          label: '活动专区',
          usage: '活动图片与展示时间，可关联指定活动',
          dataSource: '活动（campaign）',
        },
      ],
    },
    {
      title: '入口',
      items: [
        {
          type: 'quick_nav',
          label: '快捷导航宫格',
          usage: '宫格入口，逐项配置名称 / 图标 / 跳转目标，顺序即展示顺序',
          dataSource: '手动配置（客户端已注册页面）',
        },
        {
          type: 'member_entry',
          label: '会员/余额入口',
          usage: '会员与余额入口，可配标题、副标题与展示样式',
          dataSource: '会员等级 / 钱包余额',
        },
        {
          type: 'support_entry',
          label: '客服与订单入口',
          usage: '客服与订单入口，可配图标、文案与位置',
          dataSource: '手动配置（跳转已注册页面）',
        },
      ],
    },
  ];
  const componentTypes: ComponentMeta[] = componentGroups.flatMap(
    (group) => group.items
  );

  const navTargetOptions: { label: string; value: string }[] = [
    { label: '商品分类', value: 'category' },
    { label: '我的订单', value: 'orders' },
    { label: '储值卡', value: 'prepay_card' },
    { label: '会员', value: 'member' },
    { label: '联系客服', value: 'support' },
  ];

  const propSchemas: Record<PageComponentType, PropField[]> = {
    search: [{ key: 'placeholder', label: '搜索占位文案', kind: 'text' }],
    carousel: [
      { key: 'images', label: '轮播图片', kind: 'images' },
      {
        key: 'interval',
        label: '轮播间隔（毫秒）',
        kind: 'number',
        min: 1000,
        max: 30000,
      },
    ],
    notice: [
      { key: 'text', label: '公告文本', kind: 'textarea' },
      { key: 'color', label: '文字颜色', kind: 'color' },
    ],
    quick_nav: [{ key: 'items', label: '导航项', kind: 'navItems' }],
    category: [
      { key: 'title', label: '标题', kind: 'text' },
      { key: 'items', label: '分类项', kind: 'navItems' },
    ],
    product_list: [
      { key: 'title', label: '标题', kind: 'text' },
      {
        key: 'limit',
        label: '展示数量（0 不限）',
        kind: 'number',
        min: 0,
        max: 50,
      },
      { key: 'sku_ids', label: '指定 SKU（逗号分隔）', kind: 'numberList' },
      { key: 'empty_text', label: '空数据兜底文案', kind: 'text' },
    ],
    player_recommend: [
      { key: 'title', label: '标题', kind: 'text' },
      { key: 'empty_text', label: '空数据兜底文案', kind: 'textarea' },
    ],
    activity: [
      { key: 'title', label: '标题', kind: 'text' },
      { key: 'campaign_id', label: '关联活动 ID', kind: 'number', min: 1 },
      { key: 'empty_text', label: '空数据兜底文案', kind: 'textarea' },
    ],
    member_entry: [{ key: 'title', label: '标题', kind: 'text' }],
    support_entry: [],
  };

  // 首页版本 / 渠道（§16.2-02）：默认客户自助端首页，可由 GET /admin/pages 返回的文档切换。
  const channel = ref(PAGE_CHANNEL_CUSTOMER_HOME);
  const pageDocs = ref<PageDocument[]>([]);
  const channelLabels: Record<string, string> = {
    [PAGE_CHANNEL_CUSTOMER_HOME]: '客户自助端首页',
  };
  const channelLabel = (value: string) => channelLabels[value] || value;
  const loading = ref(false);
  const saving = ref(false);
  const publishing = ref(false);
  const activeTab = ref('design');
  const previewVisible = ref(false);
  const cropperVisible = ref(false);

  // 发布权限（§16.5）：运营提交发布申请，有发布权限者（异人）审核发布，回滚同权限。
  const { hasButtonPermission } = usePermission();
  const canSubmit = computed(() =>
    hasButtonPermission('esports:pages:publish_submit')
  );
  const canReview = computed(() =>
    hasButtonPermission('esports:pages:publish_review')
  );
  const canRollback = computed(() =>
    hasButtonPermission('esports:pages:rollback_btn')
  );

  const doc = ref<PageDocument>({
    channel: channel.value,
    status: 'draft',
    draft_version: 0,
    published_version_no: 0,
    updated_by: 0,
  });
  const components = ref<PageComponent[]>([]);
  const versions = ref<PageVersion[]>([]);
  const assets = ref<PageAsset[]>([]);
  const selectedIndex = ref(-1);
  const scheduledAt = ref<number>();
  const rollbackVersion = ref<number>();
  // 发布记录的两版差异选择（§16.2-07）：由版本号定位到该版 config.components 逐组件比对。
  const diffLeftNo = ref<number>();
  const diffRightNo = ref<number>();
  // 发布人昵称映射（§16.2-07）：published_by 是管理员 ID，取后台管理员列表回填展示名。
  const adminNames = ref<Record<number, string>>({});
  const publisherLabel = (adminId: number) =>
    adminId ? adminNames.value[adminId] || `#${adminId}` : '—';

  const componentLabel = (type: PageComponentType) =>
    componentTypes.find((item) => item.type === type)?.label || type;

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    pending: '待发布',
    pending_review: '待审核',
    published: '已发布',
    scheduled: '定时待发布',
    history: '历史版本',
  };
  const statusLabel = (value: string) => statusLabels[value] || value;
  const statusColors: Record<string, string> = {
    published: 'green',
    pending: 'orange',
    pending_review: 'arcoblue',
    scheduled: 'orange',
  };
  const statusColor = (value: string) => statusColors[value] || 'gray';

  const fmtTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : '-';
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  const assetForm = reactive({ name: '', url: '', width: 0, height: 0 });

  // ── 可视化属性表单（就地编辑，提交时组装为 props） ──
  const form = reactive<Record<string, unknown>>({});

  const currentSchema = computed<PropField[]>(() => {
    if (selectedIndex.value < 0) return [];
    return propSchemas[components.value[selectedIndex.value].type] || [];
  });

  function deserializeField(field: PropField, raw: unknown): unknown {
    switch (field.kind) {
      case 'number':
        return typeof raw === 'number' ? raw : undefined;
      case 'images':
        return Array.isArray(raw)
          ? raw.filter((v): v is string => typeof v === 'string')
          : [];
      case 'navItems':
        return Array.isArray(raw)
          ? raw.map((v) => {
              const o = (v ?? {}) as Record<string, unknown>;
              return {
                name: typeof o.name === 'string' ? o.name : '',
                target: typeof o.target === 'string' ? o.target : '',
                icon: typeof o.icon === 'string' ? o.icon : '',
              };
            })
          : [];
      case 'numberList':
        return Array.isArray(raw) ? raw.map((v) => String(v)).join(',') : '';
      default:
        return typeof raw === 'string' ? raw : '';
    }
  }

  function serializeField(field: PropField, value: unknown): unknown {
    switch (field.kind) {
      case 'text':
      case 'textarea':
      case 'color': {
        const s = typeof value === 'string' ? value.trim() : '';
        return s === '' ? undefined : s;
      }
      case 'number': {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        return undefined;
      }
      case 'numberList': {
        const s = typeof value === 'string' ? value : '';
        const nums = s
          .split(/[,，\s]+/)
          .map((p) => parseInt(p, 10))
          .filter((n) => Number.isInteger(n) && n > 0);
        return nums.length ? nums : undefined;
      }
      case 'images': {
        const list = (Array.isArray(value) ? value : []).filter(
          (v): v is string => typeof v === 'string' && v !== ''
        );
        return list.length ? list : undefined;
      }
      case 'navItems': {
        const list = (Array.isArray(value) ? value : [])
          .map((v) => (v ?? {}) as NavItemDraft)
          .filter((v) => typeof v.name === 'string' && v.name.trim() !== '');
        return list.length
          ? list.map((v) => {
              // 顺序即数组顺序（§16.3-04）：宫格按此顺序渲染；图标留空不写入，避免存空串。
              const icon = typeof v.icon === 'string' ? v.icon.trim() : '';
              return {
                name: v.name.trim(),
                target: v.target || '',
                ...(icon ? { icon } : {}),
              };
            })
          : undefined;
      }
      default:
        return undefined;
    }
  }

  function loadForm(index: number) {
    const comp = components.value[index];
    const props = comp.props || {};
    Object.keys(form).forEach((k) => delete form[k]);
    (propSchemas[comp.type] || []).forEach((field) => {
      form[field.key] = deserializeField(field, props[field.key]);
    });
  }

  function syncForm() {
    if (selectedIndex.value < 0) return;
    const comp = components.value[selectedIndex.value];
    const props: Record<string, unknown> = {};
    currentSchema.value.forEach((field) => {
      const serialized = serializeField(field, form[field.key]);
      if (serialized !== undefined) props[field.key] = serialized;
    });
    components.value[selectedIndex.value] = { ...comp, props };
  }

  function stringField(key: string): string {
    const v = form[key];
    return typeof v === 'string' ? v : '';
  }
  function numberField(key: string): number | undefined {
    const v = form[key];
    return typeof v === 'number' ? v : undefined;
  }
  function setField(key: string, value: unknown) {
    form[key] = value;
    syncForm();
  }
  function onColorInput(key: string, event: Event) {
    setField(key, (event.target as HTMLInputElement).value);
  }

  function imageList(): string[] {
    const v = form.images;
    return Array.isArray(v) ? (v as string[]) : [];
  }
  function setImages(list: string[]) {
    form.images = list;
    syncForm();
  }
  function addImage() {
    setImages([...imageList(), '']);
  }
  function updateImage(index: number, url: string) {
    const list = imageList();
    list[index] = url;
    setImages(list);
  }
  function removeImage(index: number) {
    const list = imageList();
    list.splice(index, 1);
    setImages(list);
  }

  function navItemList(): NavItemDraft[] {
    const v = form.items;
    return Array.isArray(v) ? (v as NavItemDraft[]) : [];
  }
  function setNavItems(list: NavItemDraft[]) {
    form.items = list;
    syncForm();
  }
  function addNavItem() {
    setNavItems([...navItemList(), { name: '', target: 'orders', icon: '' }]);
  }
  function updateNavItem(
    index: number,
    key: 'name' | 'target' | 'icon',
    value: string
  ) {
    const list = navItemList();
    list[index] = { ...list[index], [key]: value };
    setNavItems(list);
  }
  // 调整宫格顺序（§16.3-04）：数组顺序即客户端渲染顺序。
  function moveNavItem(index: number, delta: number) {
    const target = index + delta;
    const list = navItemList();
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    setNavItems(list);
  }
  function removeNavItem(index: number) {
    const list = navItemList();
    list.splice(index, 1);
    setNavItems(list);
  }

  // ── 拖拽排序（HTML5 原生 drag，纵向模块编排） ──
  const dragOverIndex = ref(-1);
  let dragIndex = -1;

  function onDragStart(index: number, event: DragEvent) {
    dragIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }
  function onDrop(target: number) {
    if (dragIndex < 0 || dragIndex === target) {
      dragOverIndex.value = -1;
      return;
    }
    const list = components.value;
    const [item] = list.splice(dragIndex, 1);
    list.splice(target, 0, item);
    selectedIndex.value = target;
    dragOverIndex.value = -1;
  }
  function onDragEnd() {
    dragIndex = -1;
    dragOverIndex.value = -1;
  }

  // ── 图片上传裁剪（复用附件上传 + canvas 裁剪） ──
  let cropperCallback: ((blob: Blob) => void) | null = null;
  function openCropper(callback: (blob: Blob) => void) {
    cropperCallback = callback;
    cropperVisible.value = true;
  }
  function onCropperConfirm(blob: Blob) {
    cropperVisible.value = false;
    cropperCallback?.(blob);
  }

  async function uploadImageBlob(
    blob: Blob,
    name: string
  ): Promise<string | null> {
    try {
      const file = new File([blob], name, {
        type: blob.type || 'image/png',
      });
      const res = await uploadAttachment(file, undefined, 'esports-page');
      const { attachment } = res.data.data;
      if (!attachment) {
        Message.error('上传失败，未返回附件');
        return null;
      }
      const access = await getAttachmentAccessInfo(attachment.id);
      if (access.public === false) {
        Message.warning('素材为私有文件，访问地址有时效，建议使用公开目录');
      }
      return access.url;
    } catch (err) {
      Message.error(errorText(err, '图片上传失败'));
      return null;
    }
  }

  function blobDimensions(
    blob: Blob
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }

  function openCropperForImages(index: number) {
    openCropper(async (blob) => {
      const url = await uploadImageBlob(blob, `carousel-${Date.now()}.png`);
      if (!url) return;
      const list = imageList();
      if (index >= 0 && index < list.length) {
        list[index] = url;
        setImages(list);
      } else {
        setImages([...list, url]);
      }
    });
  }

  function openCropperForAsset() {
    openCropper(async (blob) => {
      const name = `素材-${Date.now()}.png`;
      const url = await uploadImageBlob(blob, name);
      if (!url) return;
      const dims = await blobDimensions(blob);
      assetForm.name = name;
      assetForm.url = url;
      assetForm.width = dims.width || 1;
      assetForm.height = dims.height || 1;
    });
  }

  // ── 加载与组件操作 ──
  // 加载装修文档列表（§16.2-02）：作为「首页版本 / 渠道」下拉的数据源；选中渠道不在列表中时
  // 追加当前渠道，避免下拉为空导致无法编辑。
  const loadPageDocs = async () => {
    try {
      const items = (await getEsportsPages()).data.data || [];
      const known = items.some((item) => item.channel === channel.value);
      pageDocs.value = known
        ? items
        : [
            ...items,
            {
              channel: channel.value,
              status: 'draft' as const,
              draft_version: 0,
              published_version_no: 0,
              updated_by: 0,
            },
          ];
    } catch (err) {
      pageDocs.value = [];
      Message.error(errorText(err, '加载首页版本列表失败'));
    }
  };

  // 发布人昵称（§16.2-07）：取后台管理员列表建立 ID → 展示名映射，取不到时回落 #ID。
  const loadAdminNames = async () => {
    try {
      const result = await getAdmins({ page: 1, page_size: 200 });
      const names: Record<number, string> = {};
      (result.data.data?.data || []).forEach((admin) => {
        names[admin.id] = admin.username || `#${admin.id}`;
      });
      adminNames.value = names;
    } catch {
      adminNames.value = {};
    }
  };

  const load = async () => {
    loading.value = true;
    try {
      const [page, versionList, assetList] = await Promise.all([
        getEsportsPage(channel.value),
        getEsportsPageVersions(channel.value),
        getEsportsPageAssets(),
      ]);
      doc.value = page.data.data.document;
      components.value = page.data.data.components;
      versions.value = versionList.data.data;
      assets.value = assetList.data.data;
      selectedIndex.value = -1;
      diffLeftNo.value = undefined;
      diffRightNo.value = undefined;
      await loadPageDocs();
    } catch (err) {
      Message.error(errorText(err, '加载装修配置失败'));
    } finally {
      loading.value = false;
    }
  };

  // 切换渠道 / 首页版本：编辑与发布目标随 channel 改变，重新拉取该渠道的文档、版本与素材。
  const onChannelChange = () => {
    selectedIndex.value = -1;
    load();
  };

  // ── 发布记录版本差异（§16.2-07）：按组件位置比对，列出新增 / 删除 / 变更与变更字段 ──
  const componentsOf = (versionNo?: number): PageComponent[] => {
    if (!versionNo) return [];
    const version = versions.value.find(
      (item) => item.version_no === versionNo
    );
    return version?.config?.components || [];
  };
  const diffRows = computed(() => {
    if (!diffLeftNo.value || !diffRightNo.value) return [];
    const left = componentsOf(diffLeftNo.value);
    const right = componentsOf(diffRightNo.value);
    const rows: {
      key: string;
      position: number;
      kind: 'added' | 'removed' | 'changed';
      component: string;
      detail: string;
    }[] = [];
    const max = Math.max(left.length, right.length);
    for (let i = 0; i < max; i += 1) {
      const a = left[i];
      const b = right[i];
      const position = i + 1;
      if (!a && b) {
        rows.push({
          key: `a-${i}`,
          position,
          kind: 'added',
          component: componentLabel(b.type),
          detail: `版本 B 新增组件（可见：${b.visible ? '是' : '否'}）`,
        });
      } else if (a && !b) {
        rows.push({
          key: `r-${i}`,
          position,
          kind: 'removed',
          component: componentLabel(a.type),
          detail: '版本 B 已删除该组件',
        });
      } else if (a && b) {
        if (a.type !== b.type) {
          rows.push({
            key: `t-${i}`,
            position,
            kind: 'changed',
            component: componentLabel(b.type),
            detail: `组件类型由 ${componentLabel(a.type)} 改为 ${componentLabel(
              b.type
            )}`,
          });
        } else {
          const changedKeys: string[] = [];
          if (a.visible !== b.visible) {
            changedKeys.push(
              `显隐 ${a.visible ? '显示' : '隐藏'} → ${
                b.visible ? '显示' : '隐藏'
              }`
            );
          }
          const propsA = a.props || {};
          const propsB = b.props || {};
          const keys = new Set([
            ...Object.keys(propsA),
            ...Object.keys(propsB),
          ]);
          keys.forEach((key) => {
            if (JSON.stringify(propsA[key]) !== JSON.stringify(propsB[key])) {
              changedKeys.push(
                `${key}: ${JSON.stringify(
                  propsA[key] ?? null
                )} → ${JSON.stringify(propsB[key] ?? null)}`
              );
            }
          });
          if (changedKeys.length) {
            rows.push({
              key: `c-${i}`,
              position,
              kind: 'changed',
              component: componentLabel(b.type),
              detail: changedKeys.join('；'),
            });
          }
        }
      }
    }
    return rows;
  });
  const diffSummary = computed(() => {
    if (!diffLeftNo.value || !diffRightNo.value) return '';
    const added = diffRows.value.filter((row) => row.kind === 'added').length;
    const removed = diffRows.value.filter(
      (row) => row.kind === 'removed'
    ).length;
    const changed = diffRows.value.filter(
      (row) => row.kind === 'changed'
    ).length;
    return diffRows.value.length
      ? `v${diffLeftNo.value} → v${diffRightNo.value}：新增 ${added}、删除 ${removed}、变更 ${changed} 个组件`
      : `v${diffLeftNo.value} 与 v${diffRightNo.value} 的组件配置一致`;
  });
  const diffKindLabel = (kind: string) => {
    switch (kind) {
      case 'added':
        return '新增';
      case 'removed':
        return '删除';
      default:
        return '变更';
    }
  };
  const diffColor = (kind: string) => {
    switch (kind) {
      case 'added':
        return 'green';
      case 'removed':
        return 'red';
      default:
        return 'orange';
    }
  };
  const swapDiffVersions = () => {
    const left = diffLeftNo.value;
    diffLeftNo.value = diffRightNo.value;
    diffRightNo.value = left;
  };

  const selectComponent = (index: number) => {
    selectedIndex.value = index;
    loadForm(index);
  };
  const addComponent = (type: PageComponentType) => {
    components.value.push({ type, visible: true });
    selectComponent(components.value.length - 1);
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    const list = components.value;
    [list[index], list[target]] = [list[target], list[index]];
    selectedIndex.value = target;
  };
  const duplicate = (index: number) => {
    const copy = JSON.parse(
      JSON.stringify(components.value[index])
    ) as PageComponent;
    components.value.splice(index + 1, 0, copy);
    selectComponent(index + 1);
  };
  const remove = (index: number) => {
    components.value.splice(index, 1);
    selectedIndex.value = -1;
  };

  const saveDraft = async () => {
    saving.value = true;
    try {
      const res = await saveEsportsPageDraft(
        channel.value,
        components.value,
        doc.value.draft_version
      );
      doc.value = { ...doc.value, ...res.data.data };
      Message.success('草稿已保存');
    } catch (err) {
      Message.error(errorText(err, '保存草稿失败，请刷新后重试'));
    } finally {
      saving.value = false;
    }
  };

  const publishNow = async () => {
    publishing.value = true;
    try {
      await publishEsportsPage(channel.value, { mode: 'immediate' });
      Message.success('已提交发布申请，待审核');
      await load();
    } catch (err) {
      Message.error(errorText(err, '发布失败'));
    } finally {
      publishing.value = false;
    }
  };

  const publishScheduled = async () => {
    if (!scheduledAt.value) {
      Message.warning('请选择定时发布时间');
      return;
    }
    publishing.value = true;
    try {
      await publishEsportsPage(channel.value, {
        mode: 'scheduled',
        scheduled_at: new Date(scheduledAt.value).toISOString(),
      });
      Message.success('已提交定时发布申请，待审核');
      await load();
    } catch (err) {
      Message.error(errorText(err, '定时发布失败'));
    } finally {
      publishing.value = false;
    }
  };

  const rollback = async () => {
    if (!rollbackVersion.value) {
      Message.warning('请选择回滚目标版本');
      return;
    }
    publishing.value = true;
    try {
      await rollbackEsportsPage(channel.value, rollbackVersion.value);
      Message.success('已回滚');
      rollbackVersion.value = undefined;
      await load();
    } catch (err) {
      Message.error(errorText(err, '回滚失败'));
    } finally {
      publishing.value = false;
    }
  };

  const approvePublish = async (versionId: number) => {
    publishing.value = true;
    try {
      await reviewEsportsPagePublish(channel.value, versionId, true);
      Message.success('已通过发布');
      await load();
    } catch (err) {
      Message.error(errorText(err, '审核失败'));
    } finally {
      publishing.value = false;
    }
  };
  const rejectPublish = async (versionId: number) => {
    publishing.value = true;
    try {
      await reviewEsportsPagePublish(
        channel.value,
        versionId,
        false,
        '不符合发布规范'
      );
      Message.success('已驳回发布申请');
      await load();
    } catch (err) {
      Message.error(errorText(err, '驳回失败'));
    } finally {
      publishing.value = false;
    }
  };

  const createAsset = async () => {
    const name = assetForm.name.trim();
    const url = assetForm.url.trim();
    if (!name) {
      Message.warning('请填写素材名称');
      return;
    }
    if (!url) {
      Message.warning('请填写素材地址');
      return;
    }
    if (!/^https:\/\//i.test(url) && !url.startsWith('/')) {
      Message.warning('素材地址仅支持 https 链接或站内相对路径（以 / 开头）');
      return;
    }
    const { width, height } = assetForm;
    if (width < 1 || width > 4096 || height < 1 || height > 4096) {
      Message.warning('素材尺寸须在 1~4096 之间');
      return;
    }
    try {
      await createEsportsPageAsset({
        name,
        url,
        width,
        height,
      });
      assetForm.name = '';
      assetForm.url = '';
      assetForm.width = 0;
      assetForm.height = 0;
      assets.value = (await getEsportsPageAssets()).data.data;
      Message.success('素材已登记');
    } catch (err) {
      Message.error(errorText(err, '新增素材失败'));
    }
  };
  const removeAsset = async (id: number) => {
    try {
      await deleteEsportsPageAsset(id);
      assets.value = (await getEsportsPageAssets()).data.data;
      Message.success('素材已删除');
    } catch (err) {
      Message.error(errorText(err, '删除素材失败'));
    }
  };

  onMounted(async () => {
    await Promise.all([load(), loadAdminNames()]);
  });
</script>

<style scoped>
  .toolbar {
    margin-bottom: 12px;
  }

  .hint {
    color: var(--color-text-3);
  }

  .designer {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .palette {
    flex: none;
    width: 180px;
  }

  .palette-item {
    margin-bottom: 8px;
  }

  .palette-group {
    margin: 10px 0 6px;
    color: var(--color-text-2);
    font-weight: 600;
    font-size: 12px;
    border-bottom: 1px solid var(--color-border-2);
  }

  .palette-usage {
    margin-top: 2px;
    color: var(--color-text-3);
    font-size: 12px;
    line-height: 1.4;
  }

  .palette-source {
    color: var(--color-text-3);
    font-size: 12px;
    line-height: 1.4;
  }

  .canvas {
    flex: 1;
    min-width: 280px;
  }

  .canvas-item {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
    padding: 8px 12px;
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    cursor: pointer;
  }

  .canvas-item.active {
    border-color: rgb(var(--primary-6));
  }

  .canvas-item.drag-over {
    background: var(--color-primary-light-1);
    border-color: rgb(var(--primary-6));
  }

  .drag-handle {
    color: var(--color-text-3);
    cursor: grab;
    user-select: none;
  }

  .canvas-label {
    flex: 1;
    font-weight: 500;
  }

  .inspector {
    flex: none;
    width: 300px;
  }

  .section-title {
    margin: 8px 0;
    color: var(--color-text-3);
    font-weight: 500;
  }

  .sub-card {
    margin-bottom: 12px;
  }

  .prop-field {
    margin-bottom: 10px;
  }

  .prop-label {
    display: block;
    margin-bottom: 4px;
    color: var(--color-text-2);
    font-size: 12px;
  }

  .prop-color {
    width: 100%;
    height: 32px;
    padding: 2px;
    background: none;
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    cursor: pointer;
  }

  .prop-images,
  .prop-nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .prop-image-row,
  .prop-nav-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .prop-image-row .arco-input,
  .prop-nav-row .arco-input {
    flex: 1;
  }

  .prop-hint {
    margin-top: 8px;
    color: var(--color-text-3);
    font-size: 12px;
  }
</style>
