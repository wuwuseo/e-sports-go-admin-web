<template>
  <div class="container page-container">
    <a-card class="general-card" :title="$t('menu.system.slide')">
      <!-- 筛选栏 -->
      <a-row style="margin-bottom: 20px">
        <a-col :span="24">
          <a-space wrap>
            <a-select
              v-model="searchForm.group_code"
              :placeholder="$t('system.slide.group.placeholder')"
              style="width: 160px"
              allow-clear
            >
              <a-option
                v-for="opt in groupOptions"
                :key="opt.value"
                :value="opt.value"
                :label="opt.label"
              />
            </a-select>
            <a-select
              v-model="searchForm.status"
              :placeholder="$t('system.slide.status.placeholder')"
              style="width: 130px"
              allow-clear
            >
              <a-option :value="1">{{
                $t('system.slide.status.enabled')
              }}</a-option>
              <a-option :value="0">{{
                $t('system.slide.status.disabled')
              }}</a-option>
            </a-select>
            <a-button type="primary" @click="handleSearch">
              <template #icon><icon-search /></template>
              {{ $t('system.slide.search') }}
            </a-button>
            <a-button @click="handleReset">
              <template #icon><icon-refresh /></template>
              {{ $t('system.slide.reset') }}
            </a-button>
          </a-space>
        </a-col>
      </a-row>

      <!-- 操作栏 -->
      <a-row style="margin-bottom: 12px">
        <a-col :span="24">
          <a-space>
            <a-button v-if="canAdd" type="primary" @click="handleCreate">
              <template #icon><icon-plus /></template>
              {{ $t('system.slide.create') }}
            </a-button>
          </a-space>
        </a-col>
      </a-row>

      <!-- 表格 -->
      <a-table
        :data="slideList"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="65" />
          <a-table-column
            :title="$t('system.slide.image')"
            data-index="image"
            :width="120"
          >
            <template #cell="{ record }">
              <a-image
                :src="record.image"
                :alt="record.title"
                width="80"
                height="45"
                fit="cover"
              />
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.slide.title')"
            data-index="title"
            :width="160"
            :ellipsis="true"
            :tooltip="true"
          />
          <a-table-column
            :title="$t('system.slide.group')"
            data-index="group_code"
            :width="120"
          />
          <a-table-column
            :title="$t('system.slide.link')"
            data-index="link"
            :ellipsis="true"
            :tooltip="true"
          />
          <a-table-column
            :title="$t('system.slide.sort')"
            data-index="sort"
            :width="80"
            align="center"
          />
          <a-table-column
            :title="$t('system.slide.status')"
            data-index="status"
            :width="90"
            align="center"
          >
            <template #cell="{ record }">
              <a-switch
                v-if="canEdit"
                :model-value="record.status === 1"
                @change="(value: string | number | boolean) => handleToggleStatus(record, value)"
              />
              <a-tag v-else :color="record.status === 1 ? 'green' : 'red'">
                {{
                  record.status === 1
                    ? $t('system.slide.status.enabled')
                    : $t('system.slide.status.disabled')
                }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.slide.createdAt')"
            data-index="created_at"
            :width="170"
          >
            <template #cell="{ record }">
              {{ formatDateTime(record.created_at) }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.slide.remark')"
            data-index="remark"
            :width="180"
            :ellipsis="true"
            :tooltip="true"
          />
          <a-table-column
            :title="$t('system.slide.operations')"
            :width="140"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-space>
                <a-button
                  v-if="canEdit"
                  type="text"
                  size="small"
                  @click="handleEdit(record)"
                >
                  <template #icon><icon-edit /></template>
                  {{ $t('system.slide.edit') }}
                </a-button>
                <a-popconfirm
                  v-if="canDelete"
                  :content="$t('system.slide.deleteConfirm')"
                  type="warning"
                  @ok="handleDelete(record)"
                >
                  <a-button type="text" size="small" status="danger">
                    <template #icon><icon-delete /></template>
                    {{ $t('system.slide.delete') }}
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <SlideForm
      v-model:visible="formVisible"
      :record="currentSlide"
      @saved="fetchData"
    />
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, onMounted, computed } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { getSlides, updateSlide, deleteSlide } from '@/api/slides';
  import { getDictDataByType } from '@/api/dict-data';
  import type { SlideResponse, DictDataResponse } from '@/types/api';
  import { formatDateTime } from '@/utils';
  import usePermission from '@/hooks/permission';
  import SlideForm from './components/SlideForm.vue';

  const SLIDE_GROUP_DICT_TYPE = 'slide_group';

  const { hasButtonPermission } = usePermission();
  const canAdd = computed(() => hasButtonPermission('slide:add'));
  const canEdit = computed(() => hasButtonPermission('slide:edit'));
  const canDelete = computed(() => hasButtonPermission('slide:delete'));

  const { t } = useI18n();

  const loading = ref(false);
  const slideList = ref<SlideResponse[]>([]);
  const groupOptions = ref<DictDataResponse[]>([]);
  const formVisible = ref(false);
  const currentSlide = ref<SlideResponse | null>(null);
  const currentPage = ref(1);
  const pageSize = ref(10);

  const searchForm = reactive({
    group_code: undefined as string | undefined,
    status: undefined as number | undefined,
  });

  const pagination = reactive({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const loadGroupOptions = async () => {
    const { data: responseData } = await getDictDataByType(
      SLIDE_GROUP_DICT_TYPE
    );
    groupOptions.value = responseData.data || [];
  };

  const fetchData = async () => {
    loading.value = true;
    try {
      const params: Record<string, any> = {
        page: currentPage.value,
        page_size: pageSize.value,
      };
      if (searchForm.group_code) {
        params.group_code = searchForm.group_code;
      }
      if (searchForm.status !== undefined && searchForm.status !== null) {
        params.status = searchForm.status;
      }
      const { data: responseData } = await getSlides(params);
      // 兼容 Swagger 返回的 items 字段和标准 PaginatedResponse 的 data 字段
      const result = responseData.data as any;
      if (result) {
        slideList.value = result.items || result.data || [];
        pagination.total = result.total || 0;
      }
      pagination.current = currentPage.value;
    } finally {
      loading.value = false;
    }
  };

  const handleToggleStatus = async (
    record: SlideResponse,
    value: string | number | boolean
  ) => {
    const nextStatus = value ? 1 : 0;
    await updateSlide(record.id, { status: nextStatus });
    record.status = nextStatus;
    Message.success(
      nextStatus === 1
        ? t('system.slide.message.enableSuccess')
        : t('system.slide.message.disableSuccess')
    );
  };

  const handleSearch = () => {
    currentPage.value = 1;
    fetchData();
  };

  const handleReset = () => {
    searchForm.group_code = undefined;
    searchForm.status = undefined;
    currentPage.value = 1;
    fetchData();
  };

  const handlePageChange = (page: number) => {
    currentPage.value = page;
    fetchData();
  };

  const handlePageSizeChange = (size: number) => {
    pageSize.value = size;
    pagination.pageSize = pageSize.value;
    currentPage.value = 1;
    fetchData();
  };

  const handleCreate = () => {
    currentSlide.value = null;
    formVisible.value = true;
  };

  const handleEdit = (record: SlideResponse) => {
    currentSlide.value = record;
    formVisible.value = true;
  };

  const handleDelete = async (record: SlideResponse) => {
    await deleteSlide(record.id);
    Message.success(t('system.slide.message.deleteSuccess'));
    fetchData();
  };

  onMounted(() => {
    loadGroupOptions();
    fetchData();
  });
</script>

<script lang="ts">
  export default {
    name: 'SystemSlide',
  };
</script>
