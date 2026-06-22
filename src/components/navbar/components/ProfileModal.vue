<template>
  <a-modal
    :visible="visible"
    :title="$t('navbar.profile.title')"
    :mask-closable="false"
    unmount-on-close
    :ok-loading="loading"
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane key="profile" title="基本资料">
        <a-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          layout="vertical"
        >
          <a-form-item field="avatar" :label="$t('navbar.profile.avatar')">
            <AttachmentSelector
              v-model="selectedAvatar"
              accept="image/*"
              @select="handleAvatarSelect"
            >
              <template #trigger="{ open }">
                <div
                  v-if="avatarPreviewUrl"
                  class="profile-avatar-trigger profile-avatar-image-trigger"
                  @click="open"
                >
                  <img :src="avatarPreviewUrl" alt="avatar" />
                </div>
                <a-avatar
                  v-else
                  :size="64"
                  class="profile-avatar-trigger"
                  @click="open"
                >
                  <icon-user />
                </a-avatar>
              </template>
            </AttachmentSelector>
          </a-form-item>
          <a-form-item field="username" :label="$t('navbar.profile.username')">
            <a-input v-model="formData.username" />
          </a-form-item>
          <a-form-item field="email" :label="$t('navbar.profile.email')">
            <a-input v-model="formData.email" />
          </a-form-item>
          <a-form-item field="phone" :label="$t('navbar.profile.phone')">
            <a-input v-model="formData.phone" />
          </a-form-item>
        </a-form>
      </a-tab-pane>
      <a-tab-pane key="login-methods" title="登录方式">
        <a-spin :loading="oauthLoading" style="width: 100%">
          <a-list :data="oauthStore.identities" bordered>
            <template #empty>
              <a-empty description="暂未绑定 GitHub 身份" />
            </template>
            <template #item="{ item }">
              <a-list-item>
                <a-list-item-meta
                  :title="getOAuthProviderLabel(item.provider)"
                  :description="item.openid"
                >
                  <template #avatar>
                    <a-avatar
                      v-if="item.avatar_url"
                      :image-url="item.avatar_url"
                    />
                    <a-avatar v-else>{{
                      getOAuthProviderLabel(item.provider).charAt(0)
                    }}</a-avatar>
                  </template>
                </a-list-item-meta>
                <template #actions>
                  <a-popconfirm
                    content="确认解绑该登录方式？"
                    @ok="handleUnbindOAuth(item.id)"
                  >
                    <a-button type="text" status="danger">解绑</a-button>
                  </a-popconfirm>
                </template>
              </a-list-item>
            </template>
          </a-list>
          <a-button
            type="primary"
            style="margin-top: 16px"
            @click="handleBindGithub"
          >
            绑定 GitHub 身份
          </a-button>
        </a-spin>
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, reactive, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { FormInstance } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useOAuthStore, useUserStore } from '@/store';
  import { bindOAuthIdentity, unbindCurrentOAuthIdentity } from '@/api/oauth';
  import { updateCurrentUser, updateCurrentAdmin } from '@/api/user';
  import { resolveAttachmentAccessUrl } from '@/services/attachment-access.service';
  import AttachmentSelector from '@/components/attachment-selector/index.vue';
  import type { AttachmentResponse } from '@/types/api';
  import { isAdminLogin } from '@/utils/auth';
  import {
    getOAuthCallbackUrl,
    getOAuthProviderLabel,
    saveOAuthRedirectPath,
  } from '@/utils/oauth';

  defineProps<{
    visible: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
  }>();

  const { t } = useI18n();

  const userStore = useUserStore();
  const oauthStore = useOAuthStore();
  const formRef = ref<FormInstance>();
  const loading = ref(false);
  const oauthLoading = ref(false);
  const activeTab = ref('profile');
  const selectedAvatar = ref<AttachmentResponse | null>(null);

  const formData = reactive({
    username: '',
    email: '',
    phone: '',
    avatar: '',
  });

  const avatarPreviewUrl = ref('');
  let avatarPreviewRequestId = 0;

  const resolveAvatarPreview = async (value: string) => {
    avatarPreviewRequestId += 1;
    const requestId = avatarPreviewRequestId;

    if (!value) {
      avatarPreviewUrl.value = '';
      return;
    }

    if (value.startsWith('http')) {
      avatarPreviewUrl.value = value;
      return;
    }

    if (/^\d+$/.test(value)) {
      try {
        const url = await resolveAttachmentAccessUrl(Number(value));
        if (requestId === avatarPreviewRequestId) {
          avatarPreviewUrl.value = url;
        }
      } catch {
        if (requestId === avatarPreviewRequestId) {
          avatarPreviewUrl.value = '';
        }
      }
      return;
    }

    avatarPreviewUrl.value = '';
  };

  watch(
    () => formData.avatar,
    (value) => {
      resolveAvatarPreview(value);
    },
    { immediate: true }
  );

  const rules = {
    username: [
      { required: true, message: t('navbar.profile.usernameRequired') },
    ],
  };

  const loadOAuthIdentities = async () => {
    oauthLoading.value = true;
    try {
      await oauthStore.fetchCurrentIdentities();
    } finally {
      oauthLoading.value = false;
    }
  };

  const initFormData = () => {
    formData.username = userStore.name || '';
    formData.email = userStore.email || '';
    formData.phone = userStore.phone || '';
    formData.avatar = userStore.avatar || '';
    activeTab.value = 'profile';
    selectedAvatar.value = null;
    loadOAuthIdentities();
  };

  // 暴露初始化方法供父组件调用
  defineExpose({ initFormData });

  const handleCancel = () => {
    emit('update:visible', false);
  };

  const handleAvatarSelect = (
    attachment: AttachmentResponse | AttachmentResponse[]
  ) => {
    const nextAttachment = Array.isArray(attachment)
      ? attachment[0]
      : attachment;

    formData.avatar = String(nextAttachment.id);
    selectedAvatar.value = nextAttachment;
  };

  const handleBindGithub = async () => {
    const res = await bindOAuthIdentity('github', getOAuthCallbackUrl());
    saveOAuthRedirectPath(window.location.pathname || '/dashboard/workplace');
    window.location.href = res.data.data.authorize_url;
  };

  const handleUnbindOAuth = async (id: number) => {
    await unbindCurrentOAuthIdentity(id);
    Message.success('解绑成功');
    await loadOAuthIdentities();
  };

  const handleOk = async () => {
    if (activeTab.value !== 'profile') {
      emit('update:visible', false);
      return;
    }

    const valid = await formRef.value?.validate();
    if (valid) return;

    loading.value = true;
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        avatar: formData.avatar,
      };

      if (isAdminLogin()) {
        await updateCurrentAdmin(payload);
      } else {
        await updateCurrentUser(payload);
      }

      // 刷新 store 中的用户信息
      if (isAdminLogin()) {
        await userStore.loadAdminInfo();
      } else {
        await userStore.info();
      }

      Message.success(t('navbar.profile.saveSuccess'));
      emit('update:visible', false);
    } finally {
      loading.value = false;
    }
  };
</script>

<style lang="less" scoped>
  .profile-avatar-trigger {
    overflow: hidden;
    border: 1px solid var(--color-border-2);
    cursor: pointer;

    &:hover {
      border-color: rgb(var(--primary-6));
    }

    &.profile-avatar-image-trigger {
      width: 64px;
      height: 64px;
      border-radius: 50%;

      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }
</style>
