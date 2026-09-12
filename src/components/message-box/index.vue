<template>
  <a-spin style="display: block" :loading="loading">
    <a-tabs v-model:active-key="messageType" type="rounded" destroy-on-hide>
      <a-tab-pane v-for="item in tabList" :key="item.key">
        <template #title>
          <span>{{ item.title }}{{ formatUnreadLength(item.key) }}</span>
        </template>
        <a-result v-if="!renderList.length" status="404">
          <template #subtitle>{{ $t('messageBox.noContent') }}</template>
        </a-result>
        <List
          v-else
          :render-list="renderList"
          :unread-count="unreadCount"
          @item-click="handleItemClick"
          @all-read="handleAllRead"
        />
      </a-tab-pane>
      <template #extra>
        <a-button type="text" @click="handleAllRead">
          {{ $t('messageBox.allRead') }}
        </a-button>
      </template>
    </a-tabs>
  </a-spin>
</template>

<script lang="ts" setup>
  import { ref, computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { storeToRefs } from 'pinia';
  import { useMessageStore } from '@/store';
  import { MessageRecord, MessageBizType } from '@/api/message';
  import List from './list.vue';

  interface TabItem {
    key: MessageBizType;
    title: string;
  }

  const { t } = useI18n();
  const messageStore = useMessageStore();
  const { list, loading } = storeToRefs(messageStore);

  // 当前激活的 tab，对应消息类型
  const messageType = ref<MessageBizType>('system');

  const tabList: TabItem[] = [
    { key: 'system', title: t('messageBox.tab.title.notice') },
    { key: 'business', title: t('messageBox.tab.title.message') },
    { key: 'task', title: t('messageBox.tab.title.todo') },
  ];

  const renderList = computed<MessageRecord[]>(() =>
    list.value.filter((item) => item.type === messageType.value)
  );

  const unreadCount = computed(
    () => renderList.value.filter((item) => !item.read_at).length
  );

  // 计算指定类型下的未读数
  const formatUnreadLength = (type: MessageBizType) => {
    const count = list.value.filter(
      (item) => item.type === type && !item.read_at
    ).length;
    return count ? `(${count})` : '';
  };

  // 单条 / 多条标记已读
  const handleItemClick = async (items: MessageRecord[]) => {
    const ids = items.filter((item) => !item.read_at).map((item) => item.id);
    if (!ids.length) return;
    await messageStore.markRead(ids);
  };

  // 全部已读（当前用户所有消息）
  const handleAllRead = async () => {
    await messageStore.markAllRead();
  };
</script>

<style scoped lang="less">
  :deep(.arco-popover-popup-content) {
    padding: 0;
  }

  :deep(.arco-list-item-meta) {
    align-items: flex-start;
  }

  :deep(.arco-tabs-nav) {
    padding: 14px 0 12px 16px;
    border-bottom: 1px solid var(--color-neutral-3);
  }

  :deep(.arco-tabs-content) {
    padding-top: 0;

    .arco-result-subtitle {
      color: rgb(var(--gray-6));
    }
  }
</style>
