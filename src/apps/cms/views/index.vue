<template>
  <div class="container page-container">
    <a-card class="general-card" title="内容管理">
      <a-tabs v-model:active-key="activeTab" @change="changeTab">
        <a-tab-pane key="article" title="文章列表" />
        <a-tab-pane key="page" title="单页" />
        <a-tab-pane key="category" title="分类" />
      </a-tabs>

      <template v-if="activeTab !== 'category'">
        <a-space wrap class="cms-toolbar">
          <a-input-search
            v-model="keyword"
            placeholder="搜索标题"
            allow-clear
            style="width: 240px"
            @search="search"
            @press-enter="search"
          />
          <a-select
            v-if="activeTab === 'article'"
            v-model="categoryFilter"
            placeholder="全部分类"
            allow-clear
            style="width: 170px"
            @change="search"
          >
            <a-option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
              >{{ category.name }}</a-option
            >
          </a-select>
          <a-button v-if="canAdd" type="primary" @click="openContent()">
            新增{{ activeTab === 'article' ? '文章' : '单页' }}
          </a-button>
        </a-space>
        <a-table
          :data="contents"
          :loading="loading"
          row-key="id"
          :pagination="pagination"
          @page-change="changePage"
        >
          <template #columns>
            <a-table-column title="标题" data-index="title" :ellipsis="true" />
            <a-table-column
              v-if="activeTab === 'article'"
              title="分类"
              :width="150"
            >
              <template #cell="{ record }">
                {{ categoryName(record.category_id) }}
              </template>
            </a-table-column>
            <a-table-column title="格式" :width="110">
              <template #cell="{ record }">{{
                formatName(record.format)
              }}</template>
            </a-table-column>
            <a-table-column title="状态" :width="110">
              <template #cell="{ record }">
                <a-tag :color="record.status === 1 ? 'green' : 'gray'">
                  {{ record.status === 1 ? '已发布' : '草稿' }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column
              title="更新时间"
              data-index="updated_at"
              :width="185"
            >
              <template #cell="{ record }">{{
                formatDateTime(record.updated_at)
              }}</template>
            </a-table-column>
            <a-table-column title="操作" :width="150">
              <template #cell="{ record }">
                <a-space>
                  <a-button
                    v-if="canEdit"
                    type="text"
                    @click="openContent(record)"
                    >编辑</a-button
                  >
                  <a-popconfirm
                    v-if="canRemove"
                    content="确定删除这条内容吗？"
                    @ok="removeContent(record.id)"
                  >
                    <a-button type="text" status="danger">删除</a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </template>

      <template v-else>
        <a-button
          v-if="canManageCategories"
          type="primary"
          class="cms-toolbar"
          @click="openCategory()"
        >
          新增分类
        </a-button>
        <a-table
          :data="categories"
          :loading="loading"
          row-key="id"
          :pagination="false"
        >
          <template #columns>
            <a-table-column title="名称" data-index="name" />
            <a-table-column title="状态" :width="120">
              <template #cell="{ record }">{{
                record.status === 1 ? '启用' : '停用'
              }}</template>
            </a-table-column>
            <a-table-column title="操作" :width="150">
              <template #cell="{ record }">
                <a-space v-if="canManageCategories">
                  <a-button type="text" @click="openCategory(record)"
                    >编辑</a-button
                  >
                  <a-popconfirm
                    content="确定删除分类吗？分类下有文章时无法删除。"
                    @ok="removeCategory(record.id)"
                  >
                    <a-button type="text" status="danger">删除</a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </template>
    </a-card>

    <a-modal
      v-model:visible="contentVisible"
      :title="editingContentId ? '编辑内容' : '新增内容'"
      :width="900"
      :mask-closable="false"
      :ok-loading="saving"
      @before-ok="saveContent"
    >
      <a-form :model="contentForm" auto-label-width>
        <a-form-item label="标题" required>
          <a-input
            v-model="contentForm.title"
            :max-length="200"
            placeholder="请输入标题"
          />
        </a-form-item>
        <a-form-item v-if="contentForm.kind === 'article'" label="分类">
          <a-select
            v-model="contentForm.category_id"
            placeholder="未分类"
            allow-clear
          >
            <a-option :value="0">未分类</a-option>
            <a-option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="!isEditingContent" label="内容格式">
          <a-radio-group v-model="contentForm.format" type="button">
            <a-radio value="markdown">Markdown</a-radio>
            <a-radio value="html">富文本</a-radio>
            <a-radio value="image">纯图片</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="contentForm.format === 'markdown'"
          label="内容"
          required
        >
          <a-textarea
            v-model="contentForm.content"
            :auto-size="{ minRows: 12, maxRows: 25 }"
            placeholder="输入 Markdown 内容"
          />
        </a-form-item>
        <a-form-item v-if="contentForm.format === 'html'" label="内容" required>
          <RichTextEditor
            v-model="contentForm.content"
            image-directory="public/cms"
          />
        </a-form-item>
        <a-form-item
          v-if="contentForm.format === 'image'"
          label="图片"
          required
        >
          <div class="cms-image-field">
            <div v-if="contentImages.length" class="cms-image-list">
              <div
                v-for="(src, index) in contentImages"
                :key="`${src}-${index}`"
                class="cms-image-item"
              >
                <img
                  :src="src"
                  :alt="contentForm.title"
                  class="cms-image-thumb"
                />
                <a-button
                  size="mini"
                  status="danger"
                  @click="removeContentImage(index)"
                >
                  移除
                </a-button>
              </div>
            </div>
            <div class="cms-image-actions">
              <AttachmentSelector
                accept="image/*"
                multiple
                default-directory="public/cms"
                @select="addContentImages"
              >
                <template #trigger="{ open }">
                  <a-button @mousedown.prevent @click="open">
                    添加图片
                  </a-button>
                </template>
              </AttachmentSelector>
              <span class="cms-image-hint">
                可多选、可重复添加，数量不限；当前 {{ contentImages.length }} 张
              </span>
            </div>
          </div>
        </a-form-item>
        <a-form-item label="状态">
          <a-radio-group v-model="contentForm.status">
            <a-radio :value="0">草稿</a-radio>
            <a-radio :value="1">已发布</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="categoryVisible"
      :title="editingCategoryId ? '编辑分类' : '新增分类'"
      :ok-loading="saving"
      @before-ok="saveCategory"
    >
      <a-form :model="categoryForm" auto-label-width>
        <a-form-item label="名称" required>
          <a-input v-model="categoryForm.name" :max-length="100" />
        </a-form-item>
        <a-form-item label="状态">
          <a-radio-group v-model="categoryForm.status">
            <a-radio :value="1">启用</a-radio>
            <a-radio :value="0">停用</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { AttachmentResponse } from '@/types/api';
  import AttachmentSelector from '@/components/attachment-selector/index.vue';
  import RichTextEditor from '@/components/rich-text-editor/index.vue';
  import { getAttachmentAccessInfo } from '@/services/attachment-access.service';
  import usePermission from '@/hooks/permission';
  import { formatDateTime } from '@/utils';
  import {
    createCategory,
    createContent,
    deleteCategory,
    deleteContent,
    getContent,
    listCategories,
    listContents,
    updateCategory,
    updateContent,
  } from '../api';
  import type {
    CmsCategory,
    CmsContent,
    CmsContentInput,
    CmsKind,
  } from '../api';

  const { hasButtonPermission } = usePermission();
  const canAdd = computed(() => hasButtonPermission('cms:contents:add'));
  const canEdit = computed(() => hasButtonPermission('cms:contents:edit'));
  const canRemove = computed(() => hasButtonPermission('cms:contents:remove'));
  const canManageCategories = computed(() =>
    hasButtonPermission('cms:categories:manage')
  );

  const activeTab = ref<'article' | 'page' | 'category'>('article');
  const keyword = ref('');
  const categoryFilter = ref<number | undefined>();
  const categories = ref<CmsCategory[]>([]);
  const contents = ref<CmsContent[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showTotal: true,
  });
  const contentVisible = ref(false);
  const categoryVisible = ref(false);
  const editingContentId = ref<number | null>(null);
  const editingCategoryId = ref<number | null>(null);
  const contentForm = reactive<CmsContentInput>({
    title: '',
    kind: 'article',
    format: 'markdown',
    content: '',
    category_id: 0,
    status: 0,
  });
  const categoryForm = reactive({ name: '', status: 1 });

  const categoryName = (id: number) =>
    categories.value.find((item) => item.id === id)?.name || '未分类';
  const formatName = (format: string) =>
    ({ markdown: 'Markdown', html: '富文本', image: '纯图片' }[format] ||
    format);

  const loadCategories = async () => {
    try {
      const { data } = await listCategories();
      categories.value = data.data || [];
    } catch {
      categories.value = [];
    }
  };

  const loadContents = async () => {
    if (activeTab.value === 'category') return;
    loading.value = true;
    try {
      const params: Record<string, string | number> = {
        kind: activeTab.value,
        page: pagination.current,
        page_size: pagination.pageSize,
      };
      if (keyword.value.trim()) params.keyword = keyword.value.trim();
      if (activeTab.value === 'article' && categoryFilter.value)
        params.category_id = categoryFilter.value;
      const { data } = await listContents(params);
      contents.value = data.data.list || [];
      pagination.total = data.data.total;
    } catch {
      contents.value = [];
      pagination.total = 0;
    } finally {
      loading.value = false;
    }
  };

  const changeTab = (key: string | number) => {
    activeTab.value = key as typeof activeTab.value;
    pagination.current = 1;
    keyword.value = '';
    categoryFilter.value = undefined;
    if (activeTab.value === 'category') loadCategories();
    else loadContents();
  };
  const search = () => {
    pagination.current = 1;
    loadContents();
  };
  const changePage = (page: number) => {
    pagination.current = page;
    loadContents();
  };

  // 纯图片格式：content 是逗号分隔的图片地址列表，数量不限。
  const parseImageSrcs = (content: string): string[] =>
    content
      .split(',')
      .map((src) => src.trim())
      .filter(Boolean);

  const openContent = async (record?: CmsContent) => {
    editingContentId.value = record?.id || null;
    const item = record ? (await getContent(record.id)).data.data : null;
    Object.assign(
      contentForm,
      item || {
        title: '',
        kind: activeTab.value as CmsKind,
        format: 'markdown',
        content: '',
        category_id: 0,
        status: 0,
      }
    );
    contentVisible.value = true;
  };

  const contentImages = computed(() => parseImageSrcs(contentForm.content));

  // 格式决定 content 的解释方式，编辑时改动会让既有内容失去意义，故禁用。
  const isEditingContent = computed(() => Boolean(editingContentId.value));

  const setContentImages = (srcs: string[]) => {
    contentForm.content = srcs.join(',');
  };

  const removeContentImage = (index: number) => {
    const next = [...contentImages.value];
    next.splice(index, 1);
    setContentImages(next);
  };

  const resolvePublicImageUrl = async (item: AttachmentResponse) => {
    const access = await getAttachmentAccessInfo(item.id);
    if (!access.public) return null;
    const parsed = new URL(access.url, window.location.origin);
    return parsed.pathname.startsWith('/uploads/')
      ? parsed.pathname
      : access.url;
  };

  const addContentImages = async (
    selection: AttachmentResponse | AttachmentResponse[]
  ) => {
    const items = (Array.isArray(selection) ? selection : [selection]).filter(
      (item) => item?.mime_type?.startsWith('image/')
    );
    const resolved = await Promise.all(
      items.map(async (item) => {
        try {
          const src = await resolvePublicImageUrl(item);
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
    setContentImages([...contentImages.value, ...added]);
  };

  const saveContent = async () => {
    if (!contentForm.title.trim()) {
      Message.warning('请输入标题');
      return false;
    }
    const isImageFormat = contentForm.format === 'image';
    if (
      isImageFormat
        ? contentImages.value.length === 0
        : !contentForm.content.trim()
    ) {
      Message.warning(isImageFormat ? '请至少选择一张图片' : '请输入内容');
      return false;
    }
    saving.value = true;
    try {
      const input = {
        ...contentForm,
        category_id: contentForm.category_id || 0,
      };
      if (editingContentId.value)
        await updateContent(editingContentId.value, input);
      else await createContent(input);
      Message.success('保存成功');
      await loadContents();
      return true;
    } catch {
      return false;
    } finally {
      saving.value = false;
    }
  };

  const removeContent = async (id: number) => {
    await deleteContent(id);
    Message.success('删除成功');
    await loadContents();
  };

  const openCategory = (record?: CmsCategory) => {
    editingCategoryId.value = record?.id || null;
    Object.assign(
      categoryForm,
      record
        ? { name: record.name, status: record.status }
        : { name: '', status: 1 }
    );
    categoryVisible.value = true;
  };
  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      Message.warning('请输入分类名称');
      return false;
    }
    saving.value = true;
    try {
      if (editingCategoryId.value)
        await updateCategory(editingCategoryId.value, categoryForm);
      else await createCategory(categoryForm);
      Message.success('保存成功');
      await loadCategories();
      return true;
    } catch {
      return false;
    } finally {
      saving.value = false;
    }
  };
  const removeCategory = async (id: number) => {
    await deleteCategory(id);
    Message.success('删除成功');
    await loadCategories();
  };

  onMounted(() => {
    loadCategories();
    loadContents();
  });
</script>

<style scoped lang="less">
  .cms-toolbar {
    margin-bottom: 16px;
  }

  .cms-image-field {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .cms-image-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .cms-image-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
  }

  .cms-image-thumb {
    width: 132px;
    height: 96px;
    object-fit: cover;
    background-color: var(--color-fill-2);
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
  }

  .cms-image-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .cms-image-hint {
    color: var(--color-text-3);
    font-size: 12px;
  }
</style>
