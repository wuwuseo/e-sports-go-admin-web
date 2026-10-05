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
        <a-form-item label="内容格式">
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
          <div class="cms-rich-wrap">
            <a-space class="cms-rich-toolbar">
              <a-button
                size="small"
                @mousedown.prevent
                @click="formatRich('bold')"
                ><b>B</b></a-button
              >
              <a-button
                size="small"
                @mousedown.prevent
                @click="formatRich('italic')"
                ><i>I</i></a-button
              >
              <a-button
                size="small"
                @mousedown.prevent
                @click="formatRich('insertUnorderedList')"
                >列表</a-button
              >
              <a-button
                size="small"
                @mousedown.prevent
                @click="formatRich('formatBlock', 'h2')"
                >标题</a-button
              >
            </a-space>
            <div
              ref="richEditor"
              class="cms-rich-editor"
              contenteditable="true"
              role="textbox"
              aria-label="富文本内容"
              @input="syncRich"
              @paste="pastePlainText"
            />
          </div>
        </a-form-item>
        <a-form-item
          v-if="contentForm.format === 'image'"
          label="图片"
          required
        >
          <div class="cms-image-field">
            <a-input
              v-model="contentForm.image"
              placeholder="图片 URL 或选择公开图片附件"
            />
            <AttachmentSelector
              accept="image/*"
              default-directory="public/cms"
              @select="selectImage"
            />
            <img
              v-if="contentForm.image"
              :src="contentForm.image"
              :alt="contentForm.title"
              class="cms-image-preview"
            />
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
  import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { AttachmentResponse } from '@/types/api';
  import AttachmentSelector from '@/components/attachment-selector/index.vue';
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
  const richEditor = ref<HTMLDivElement | null>(null);
  const contentForm = reactive<CmsContentInput>({
    title: '',
    kind: 'article',
    format: 'markdown',
    content: '',
    image: '',
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
        image: '',
        category_id: 0,
        status: 0,
      }
    );
    contentVisible.value = true;
  };

  watch([contentVisible, () => contentForm.format], async () => {
    if (contentVisible.value && contentForm.format === 'html') {
      await nextTick();
      if (richEditor.value) richEditor.value.innerHTML = contentForm.content;
    }
  });

  const syncRich = () => {
    contentForm.content = richEditor.value?.innerHTML || '';
  };
  const formatRich = (command: string, value?: string) => {
    richEditor.value?.focus();
    document.execCommand(command, false, value);
    syncRich();
  };
  const pastePlainText = (event: ClipboardEvent) => {
    event.preventDefault();
    document.execCommand(
      'insertText',
      false,
      event.clipboardData?.getData('text/plain') || ''
    );
    syncRich();
  };

  const selectImage = async (
    selection: AttachmentResponse | AttachmentResponse[]
  ) => {
    const item = Array.isArray(selection) ? selection[0] : selection;
    if (!item?.mime_type.startsWith('image/')) return;
    try {
      const access = await getAttachmentAccessInfo(item.id);
      if (!access.public) {
        Message.error('请选择公开图片附件');
        return;
      }
      const parsed = new URL(access.url, window.location.origin);
      contentForm.image = parsed.pathname.startsWith('/uploads/')
        ? parsed.pathname
        : access.url;
    } catch {
      Message.error('无法获取图片访问地址');
    }
  };

  const saveContent = async () => {
    if (!contentForm.title.trim()) {
      Message.warning('请输入标题');
      return false;
    }
    if (
      contentForm.format === 'image'
        ? !contentForm.image.trim()
        : !contentForm.content.trim()
    ) {
      Message.warning(
        contentForm.format === 'image' ? '请选择图片' : '请输入内容'
      );
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

  .cms-rich-wrap,
  .cms-image-field {
    width: 100%;
  }

  .cms-rich-toolbar {
    margin-bottom: 8px;
  }

  .cms-rich-editor {
    min-height: 260px;
    padding: 12px;
    overflow: auto;
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    outline: none;
  }

  .cms-rich-editor:focus {
    border-color: rgb(var(--primary-6));
  }

  .cms-image-field {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cms-image-preview {
    max-width: 320px;
    max-height: 240px;
    object-fit: contain;
  }
</style>
