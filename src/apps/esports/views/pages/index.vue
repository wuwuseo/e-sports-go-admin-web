<template>
  <div class="container page-container">
    <a-card class="general-card" title="页面装修">
      <a-space class="toolbar" wrap>
        <a-tag color="arcoblue">客户自助端首页</a-tag>
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
        <!-- 发布审核（待后端）：后端 page_handlers.go 暂无发布审核接口，
             后续若新增「发布申请/审核」能力，在此补「发布申请」按钮，
             并依据版本状态展示审核中 / 已通过 / 已驳回。当前仅透出后端发布校验错误。 -->
        <a-button :loading="publishing" @click="publishNow">发布</a-button>
        <a-date-picker
          v-model="scheduledAt"
          show-time
          placeholder="定时发布时间"
          :style="{ width: '200px' }"
        />
        <a-button :loading="publishing" @click="publishScheduled"
          >定时发布</a-button
        >
        <a-select
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
        <a-button :loading="publishing" @click="rollback">回滚</a-button>
      </a-space>

      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="design" title="装修">
          <div class="designer">
            <div class="palette">
              <div class="section-title">组件库</div>
              <a-button
                v-for="item in componentTypes"
                :key="item.type"
                long
                class="palette-item"
                @click="addComponent(item.type)"
                >{{ item.label }}</a-button
              >
            </div>

            <div class="canvas">
              <div class="section-title"
                >手机画布（{{ components.length }}）</div
              >
              <a-empty
                v-if="!components.length"
                description="从左侧组件库添加组件"
              />
              <div
                v-for="(component, index) in components"
                :key="index"
                class="canvas-item"
                :class="{ active: index === selectedIndex }"
                @click="selectComponent(index)"
              >
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
                <div class="section-title">组件属性（JSON）</div>
                <a-textarea
                  v-model="propsText"
                  :auto-size="{ minRows: 8, maxRows: 16 }"
                  placeholder='例如 {"title":"精选推荐","limit":6}'
                />
                <a-button
                  class="apply"
                  type="primary"
                  size="small"
                  @click="applyProps"
                  >应用属性</a-button
                >
              </template>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="versions" title="发布记录">
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
  </div>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import {
    PAGE_CHANNEL_CUSTOMER_HOME,
    createEsportsPageAsset,
    deleteEsportsPageAsset,
    getEsportsPage,
    getEsportsPageAssets,
    getEsportsPageVersions,
    publishEsportsPage,
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

  const channel = PAGE_CHANNEL_CUSTOMER_HOME;
  const loading = ref(false);
  const saving = ref(false);
  const publishing = ref(false);
  const activeTab = ref('design');

  const doc = ref<PageDocument>({
    channel,
    status: 'draft',
    draft_version: 0,
    published_version_no: 0,
    updated_by: 0,
  });
  const components = ref<PageComponent[]>([]);
  const versions = ref<PageVersion[]>([]);
  const assets = ref<PageAsset[]>([]);
  const selectedIndex = ref(-1);
  const propsText = ref('{}');
  const scheduledAt = ref<number>();
  const rollbackVersion = ref<number>();

  const componentTypes: { type: PageComponentType; label: string }[] = [
    { type: 'search', label: '顶部搜索' },
    { type: 'carousel', label: '轮播图' },
    { type: 'notice', label: '公告条' },
    { type: 'quick_nav', label: '快捷导航宫格' },
    { type: 'category', label: '游戏/服务分类' },
    { type: 'product_list', label: '商品/套餐列表' },
    { type: 'player_recommend', label: '陪玩推荐' },
    { type: 'activity', label: '活动专区' },
    { type: 'member_entry', label: '会员/余额入口' },
    { type: 'support_entry', label: '客服与订单入口' },
  ];
  const componentLabel = (type: PageComponentType) =>
    componentTypes.find((item) => item.type === type)?.label || type;

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    pending: '待发布',
    published: '已发布',
    scheduled: '定时待发布',
    history: '历史版本',
  };
  const statusLabel = (value: string) => statusLabels[value] || value;
  const statusColors: Record<string, string> = {
    published: 'green',
    pending: 'orange',
    scheduled: 'orange',
  };
  const statusColor = (value: string) => statusColors[value] || 'gray';

  const fmtTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : '-';
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  const assetForm = reactive({ name: '', url: '', width: 0, height: 0 });

  const load = async () => {
    loading.value = true;
    try {
      const [page, versionList, assetList] = await Promise.all([
        getEsportsPage(channel),
        getEsportsPageVersions(channel),
        getEsportsPageAssets(),
      ]);
      doc.value = page.data.data.document;
      components.value = page.data.data.components;
      versions.value = versionList.data.data;
      assets.value = assetList.data.data;
      selectedIndex.value = -1;
    } catch (err) {
      Message.error(errorText(err, '加载装修配置失败'));
    } finally {
      loading.value = false;
    }
  };

  const selectComponent = (index: number) => {
    selectedIndex.value = index;
    propsText.value = JSON.stringify(
      components.value[index].props || {},
      null,
      2
    );
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
  const applyProps = () => {
    try {
      const parsed = JSON.parse(propsText.value || '{}');
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('属性须为对象');
      }
      const current = components.value[selectedIndex.value];
      components.value[selectedIndex.value] = {
        ...current,
        props: parsed as Record<string, unknown>,
      };
      Message.success('属性已应用，保存草稿后生效');
    } catch {
      Message.error('属性 JSON 格式无效，需为对象');
    }
  };

  const saveDraft = async () => {
    saving.value = true;
    try {
      const res = await saveEsportsPageDraft(
        channel,
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
      await publishEsportsPage(channel, { mode: 'immediate' });
      Message.success('已发布');
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
      await publishEsportsPage(channel, {
        mode: 'scheduled',
        scheduled_at: new Date(scheduledAt.value).toISOString(),
      });
      Message.success('已排定时发布');
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
      await rollbackEsportsPage(channel, rollbackVersion.value);
      Message.success('已回滚');
      rollbackVersion.value = undefined;
      await load();
    } catch (err) {
      Message.error(errorText(err, '回滚失败'));
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
    // 前端基础校验（§16 素材）：外部链接仅 https，或站内相对路径（以 / 开头），
    // 尺寸 1~4096。与后端 savePageAsset 口径一致（https-only 或站内路径）。
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

  onMounted(load);
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

  .canvas {
    flex: 1;
    min-width: 280px;
  }

  .canvas-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    padding: 8px 12px;
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    cursor: pointer;
  }

  .canvas-item.active {
    border-color: rgb(var(--primary-6));
  }

  .canvas-label {
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

  .apply {
    margin-top: 8px;
  }
</style>
