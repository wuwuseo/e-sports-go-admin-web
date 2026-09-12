<template>
  <a-list :bordered="false">
    <a-list-item
      v-for="item in renderList"
      :key="item.id"
      action-layout="vertical"
      :style="{ opacity: item.read_at ? 0.5 : 1 }"
    >
      <template #extra>
        <a-tag v-if="item.level === 'error'" color="red">紧急</a-tag>
        <a-tag v-else-if="item.level === 'warning'" color="orange">警告</a-tag>
        <a-tag v-else-if="item.level === 'info'" color="blue">通知</a-tag>
      </template>
      <div class="item-wrap" @click="onItemClick(item)">
        <a-list-item-meta>
          <template v-if="item.avatar" #avatar>
            <a-avatar shape="circle">
              <img v-if="item.avatar" :src="item.avatar" />
              <icon-desktop v-else />
            </a-avatar>
          </template>
          <template #title>
            <a-space :size="4">
              <span>{{ item.title }}</span>
              <a-typography-text v-if="item.subTitle" type="secondary">
                {{ item.subTitle }}
              </a-typography-text>
            </a-space>
          </template>
          <template #description>
            <div>
              <a-typography-paragraph :ellipsis="{ rows: 1 }">
                {{ item.content }}
              </a-typography-paragraph>
              <a-typography-text class="time-text">
                {{ formatTime(item.created_at) }}
              </a-typography-text>
            </div>
          </template>
        </a-list-item-meta>
      </div>
    </a-list-item>
    <template #footer>
      <a-space
        fill
        :size="0"
        :class="{ 'add-border-top': renderList.length < showMax }"
      >
        <div class="footer-wrap">
          <a-link @click="allRead">{{ $t('messageBox.allRead') }}</a-link>
        </div>
        <div class="footer-wrap">
          <a-link @click="goCenter">{{ $t('messageBox.viewMore') }}</a-link>
        </div>
      </a-space>
    </template>
    <div
      v-if="renderList.length && renderList.length < 3"
      :style="{ height: (showMax - renderList.length) * 86 + 'px' }"
    ></div>
  </a-list>
</template>

<script lang="ts" setup>
  import { PropType } from 'vue';
  import { useRouter } from 'vue-router';
  import { MessageRecord } from '@/api/message';

  defineProps({
    renderList: {
      type: Array as PropType<MessageRecord[]>,
      required: true,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
  });
  const emit = defineEmits(['itemClick', 'allRead']);

  const router = useRouter();

  // 格式化时间显示
  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // 全部已读：交给父组件统一处理
  const allRead = () => {
    emit('allRead');
  };

  // 单条点击 -> 标记已读
  const onItemClick = (item: MessageRecord) => {
    if (!item.read_at) {
      emit('itemClick', [item]);
    }
  };

  const showMax = 3;

  const goCenter = () => {
    router.push({ name: 'MessageCenter' });
  };
</script>

<style scoped lang="less">
  :deep(.arco-list) {
    .arco-list-item {
      min-height: 86px;
      border-bottom: 1px solid rgb(var(--gray-3));
    }

    .arco-list-item-extra {
      position: absolute;
      right: 20px;
    }

    .arco-list-item-meta-content {
      flex: 1;
    }

    .item-wrap {
      cursor: pointer;
    }

    .time-text {
      color: rgb(var(--gray-6));
      font-size: 12px;
    }

    .arco-empty {
      display: none;
    }

    .arco-list-footer {
      height: 50px;
      padding: 0;
      line-height: 50px;
      border-top: none;

      .arco-space-item {
        width: 100%;
        border-right: 1px solid rgb(var(--gray-3));

        &:last-child {
          border-right: none;
        }
      }

      .add-border-top {
        border-top: 1px solid rgb(var(--gray-3));
      }
    }

    .footer-wrap {
      text-align: center;
    }

    .arco-typography {
      margin-bottom: 0;
    }

    .add-border {
      border-top: 1px solid rgb(var(--gray-3));
    }
  }
</style>
