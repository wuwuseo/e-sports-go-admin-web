<template>
  <a-card class="oauth-config" title="GitHub OAuth 配置" :bordered="false">
    <a-alert type="info" style="margin-bottom: 16px">
      GitHub OAuth App 的 Authorization callback URL 应填写后端 Callback
      URL；管理员授权完成后，后端再跳回前端管理员回跳 URL。
    </a-alert>

    <a-spin :loading="loading" style="width: 100%">
      <a-form :model="form" layout="vertical">
        <a-form-item label="显示名称">
          <a-input v-model="form.display_name" placeholder="GitHub" />
        </a-form-item>
        <a-form-item label="Client ID">
          <a-input
            v-model="form.client_id"
            placeholder="请输入 GitHub Client ID"
          />
        </a-form-item>
        <a-form-item label="Client Secret">
          <a-input-password
            v-model="form.client_secret"
            :disabled="clearSecret"
            placeholder="未修改时保留现有密钥"
            allow-clear
          />
          <a-checkbox v-model="clearSecret" style="margin-top: 8px">
            清除已配置的 Client Secret
          </a-checkbox>
        </a-form-item>
        <a-form-item label="后端 Callback URL">
          <a-input
            v-model="form.callback_url"
            placeholder="https://api.example.com/api/v1/public/oauth/github/callback"
          />
        </a-form-item>
        <a-form-item label="管理员回跳 URL">
          <a-input
            v-model="form.admin_redirect_url"
            placeholder="https://admin.example.com/oauth/callback"
          />
        </a-form-item>
        <a-form-item label="启用管理员 GitHub 登录">
          <a-switch v-model="form.admin_enabled" />
        </a-form-item>
      </a-form>

      <a-collapse style="margin-bottom: 16px">
        <a-collapse-item key="user" header="普通用户端 OAuth 高级配置">
          <a-form :model="form" layout="vertical">
            <a-form-item label="普通用户回跳 URL">
              <a-input
                v-model="form.user_redirect_url"
                placeholder="留空表示不配置普通用户端回跳"
              />
            </a-form-item>
            <a-form-item label="启用普通用户 GitHub 登录">
              <a-switch v-model="form.user_enabled" />
            </a-form-item>
          </a-form>
        </a-collapse-item>
      </a-collapse>

      <a-space>
        <a-button type="primary" :loading="saving" @click="handleSave">
          保存 OAuth 配置
        </a-button>
        <a-button
          v-if="configExists"
          status="danger"
          :loading="deleting"
          @click="handleDelete"
        >
          删除配置
        </a-button>
      </a-space>
    </a-spin>
  </a-card>
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import {
    deleteOAuthProviderConfig,
    getOAuthProviderConfig,
    updateOAuthProviderConfig,
  } from '@/api/oauth';
  import {
    buildOAuthProviderCallbackUrl,
    getOAuthCallbackUrl,
  } from '@/utils/oauth';

  const defaultCallbackUrl = buildOAuthProviderCallbackUrl('github');
  const defaultAdminRedirectUrl = getOAuthCallbackUrl();
  const loading = ref(false);
  const saving = ref(false);
  const deleting = ref(false);
  const clearSecret = ref(false);
  const configExists = ref(false);

  const form = reactive({
    provider: 'github',
    display_name: 'GitHub',
    client_id: '',
    client_secret: '',
    callback_url: defaultCallbackUrl,
    user_redirect_url: '',
    admin_redirect_url: defaultAdminRedirectUrl,
    user_enabled: false,
    admin_enabled: false,
  });

  const resetForm = () => {
    Object.assign(form, {
      provider: 'github',
      display_name: 'GitHub',
      client_id: '',
      client_secret: '',
      callback_url: defaultCallbackUrl,
      user_redirect_url: '',
      admin_redirect_url: defaultAdminRedirectUrl,
      user_enabled: false,
      admin_enabled: false,
    });
    clearSecret.value = false;
    configExists.value = false;
  };

  const loadConfig = async () => {
    loading.value = true;
    try {
      const res = await getOAuthProviderConfig('github');
      const { data } = res.data;
      Object.assign(form, {
        provider: data.provider,
        display_name: data.display_name || 'GitHub',
        client_id: data.client_id || '',
        client_secret: data.secret_configured ? '********' : '',
        callback_url: data.callback_url || defaultCallbackUrl,
        user_redirect_url: data.user_redirect_url || '',
        admin_redirect_url: data.admin_redirect_url || defaultAdminRedirectUrl,
        user_enabled: Boolean(data.user_enabled),
        admin_enabled: Boolean(data.admin_enabled),
      });
      clearSecret.value = false;
      configExists.value = true;
    } catch {
      resetForm();
    } finally {
      loading.value = false;
    }
  };

  const handleSave = () => {
    Modal.confirm({
      title: '确认保存 OAuth 配置？',
      content: clearSecret.value
        ? '本次保存会清除现有 Client Secret，并使依赖密钥的 OAuth 登录不可用。'
        : '保存后，登录页会根据管理员端配置是否完整且启用来显示 GitHub 登录。',
      async onOk() {
        saving.value = true;
        try {
          await updateOAuthProviderConfig('github', {
            provider: 'github',
            display_name: form.display_name.trim() || 'GitHub',
            client_id: form.client_id.trim(),
            client_secret:
              !clearSecret.value &&
              form.client_secret &&
              form.client_secret !== '********'
                ? form.client_secret
                : undefined,
            clear_secret: clearSecret.value,
            callback_url: form.callback_url.trim(),
            user_redirect_url: form.user_redirect_url.trim(),
            admin_redirect_url: form.admin_redirect_url.trim(),
            user_enabled: form.user_enabled,
            admin_enabled: form.admin_enabled,
          });
          Message.success('OAuth 配置保存成功');
          await loadConfig();
        } finally {
          saving.value = false;
        }
      },
    });
  };

  const handleDelete = () => {
    Modal.warning({
      title: '确认删除 GitHub OAuth 配置？',
      content:
        '删除后登录页将不再显示 GitHub 登录，已有身份绑定记录不会被删除。',
      hideCancel: false,
      async onOk() {
        deleting.value = true;
        try {
          await deleteOAuthProviderConfig('github');
          resetForm();
          Message.success('OAuth 配置已删除');
        } finally {
          deleting.value = false;
        }
      },
    });
  };

  onMounted(loadConfig);
</script>

<style lang="less" scoped>
  .oauth-config {
    max-width: 720px;
  }
</style>
