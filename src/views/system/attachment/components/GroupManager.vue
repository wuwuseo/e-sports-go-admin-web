<template>
  <div class="group-manager">
    <div class="group-header">
      <a-button long type="outline" size="small" @click="handleCreate">
        <template #icon><icon-plus /></template>
        {{ $t('system.attachment.group.create') }}
      </a-button>
    </div>
    <div class="group-list">
      <div
        class="group-item"
        :class="{ active: activeGroupId === undefined }"
        @click="$emit('select', undefined)"
      >
        <icon-folder />
        <span class="group-name">{{ $t('system.attachment.group.all') }}</span>
      </div>
      <div
        v-for="group in groups"
        :key="group.id"
        class="group-item"
        :class="{ active: activeGroupId === group.id }"
        @click="$emit('select', group.id)"
      >
        <icon-folder />
        <span class="group-name">{{ group.name }}</span>
        <span class="group-actions" @click.stop>
          <a-button type="text" size="mini" @click="$emit('edit', group)">
            <icon-edit />
          </a-button>
          <a-popconfirm
            :content="$t('system.attachment.group.deleteConfirm')"
            @ok="$emit('delete', group)"
          >
            <a-button type="text" size="mini" status="danger">
              <icon-delete />
            </a-button>
          </a-popconfirm>
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { AttachmentGroupResponse } from '@/types/api';

  defineProps<{
    groups: AttachmentGroupResponse[];
    activeGroupId?: number;
  }>();

  const emit = defineEmits<{
    (e: 'select', id?: number): void;
    (e: 'create'): void;
    (e: 'edit', group: AttachmentGroupResponse): void;
    (e: 'delete', group: AttachmentGroupResponse): void;
  }>();

  const handleCreate = () => {
    emit('create');
  };
</script>

<script lang="ts">
  export default {
    name: 'GroupManager',
  };
</script>

<style lang="less" scoped>
  .group-manager {
    min-height: 400px;
    padding-right: 16px;
    border-right: 1px solid var(--color-border);
  }

  .group-header {
    margin-bottom: 12px;
  }

  .group-list {
    .group-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: var(--color-fill-2);

        .group-actions {
          opacity: 1;
        }
      }

      &.active {
        color: rgb(var(--primary-6));
        background-color: rgb(var(--primary-1));
      }

      .group-name {
        flex: 1;
        margin-left: 8px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .group-actions {
        display: flex;
        align-items: center;
        opacity: 0;
        transition: opacity 0.2s;
      }
    }
  }
</style>
