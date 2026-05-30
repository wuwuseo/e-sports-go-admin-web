<template>
  <div class="container">
    <a-card
      class="general-card"
      :title="$t('message.preference.title')"
      :loading="loading"
    >
      <a-form
        :model="form"
        :style="{ width: '600px', margin: '0 auto' }"
        layout="vertical"
      >
        <!-- 通知方式 -->
        <a-form-item :label="$t('message.preference.desktopNotify')">
          <a-switch v-model="form.desktop_notify" />
          <template #extra>
            {{ $t('message.preference.desktopNotify.tip') }}
          </template>
        </a-form-item>
        <a-form-item :label="$t('message.preference.soundNotify')">
          <a-switch v-model="form.sound_notify" />
          <template #extra>
            {{ $t('message.preference.soundNotify.tip') }}
          </template>
        </a-form-item>

        <a-divider />

        <!-- 订阅控制 -->
        <a-form-item :label="$t('message.preference.subscribe')">
          <a-space direction="vertical">
            <a-checkbox v-model="form.subscribe_system">
              {{ $t('message.preference.subscribeSystem') }}
            </a-checkbox>
            <a-checkbox v-model="form.subscribe_business">
              {{ $t('message.preference.subscribeBusiness') }}
            </a-checkbox>
            <a-checkbox v-model="form.subscribe_task">
              {{ $t('message.preference.subscribeTask') }}
            </a-checkbox>
          </a-space>
        </a-form-item>

        <a-divider />

        <!-- 勿扰时段 -->
        <a-form-item :label="$t('message.preference.dnd')">
          <a-space>
            <a-time-picker
              v-model="form.do_not_disturb_start"
              :placeholder="$t('message.preference.dnd.start')"
              format="HH:mm"
              style="width: 140px"
            />
            <span>~</span>
            <a-time-picker
              v-model="form.do_not_disturb_end"
              :placeholder="$t('message.preference.dnd.end')"
              format="HH:mm"
              style="width: 140px"
            />
          </a-space>
          <template #extra>
            {{ $t('message.preference.dnd.tip') }}
          </template>
        </a-form-item>

        <a-divider />

        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSave">
              {{ $t('message.preference.save') }}
            </a-button>
            <a-button @click="handleReset">
              {{ $t('message.preference.reset') }}
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, reactive } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { Message } from '@arco-design/web-vue';
  import { storeToRefs } from 'pinia';
  import { useMessageStore } from '@/store';
  import { MessagePreference } from '@/api/message';

  const { t } = useI18n();
  const messageStore = useMessageStore();
  const { preference, preferenceLoading } = storeToRefs(messageStore);

  const loading = preferenceLoading;

  // 本地表单（深拷贝，避免直接改 store）
  const form = reactive<MessagePreference>({
    desktop_notify: true,
    sound_notify: false,
    subscribe_system: true,
    subscribe_business: true,
    subscribe_task: true,
    do_not_disturb_start: '',
    do_not_disturb_end: '',
  });

  const syncFormFromStore = () => {
    const p = preference.value;
    form.desktop_notify = p.desktop_notify;
    form.sound_notify = p.sound_notify;
    form.subscribe_system = p.subscribe_system;
    form.subscribe_business = p.subscribe_business;
    form.subscribe_task = p.subscribe_task;
    form.do_not_disturb_start = p.do_not_disturb_start;
    form.do_not_disturb_end = p.do_not_disturb_end;
  };

  const handleSave = async () => {
    await messageStore.updatePreference({ ...form });
    Message.success(t('message.preference.saveSuccess'));
  };

  const handleReset = () => {
    syncFormFromStore();
  };

  onMounted(async () => {
    await messageStore.fetchPreference();
    syncFormFromStore();
  });
</script>

<style scoped lang="less">
  .container {
    padding: 16px 20px;
  }
</style>
