<template>
  <a-card class="oauth-config" title="GitHub OAuth 配置" :bordered="false">
    <a-alert type="info" style="margin-bottom: 16px">
      Callback URL 固定为前端 OAuth 回调路由，请在 GitHub OAuth App 中保持一致。
    </a-alert>

    <a-spin :loading="loading" style="width: 100%">
      <a-form :model="form" layout="vertical">
        <a-form-item label="Client ID">
          <a-input
            v-model="form.client_id"
            placeholder="请输入 GitHub Client ID"
          />
        </a-form-item>
        <a-form-item label="Client Secret">
          <a-input-password
            v-model="form.client_secret"
            placeholder="********"
            allow-clear
          />
          <a-checkbox v-model="clearSecret" style="margin-top: 8px">
            清除已设置的 Client Secret
          </a-checkbox>
        </a-form-item>
        <a-form-item label="Callback URL">
          <a-input :model-value="callbackUrl" readonly />
        </a-form-item>
        <a-form-item label="管理员回跳 URL">
          <a-input
            v-model="form.admin_redirect_url"
            placeholder="/dashboard/workplace"
          />
        </a-form-item>
        <a-form-item label="启用状态">
          <a-switch v-model="form.enabled" />
        </a-form-item>
      </a-form>

      <a-collapse style="margin-bottom: 16px">
        <a-collapse-item key="user" header="普通用户端 OAuth 高级配置">
          <a-alert type="warning">
            本次仅实现管理员 GitHub 登录，普通用户端配置保留由后端历史数据展示。
          </a-alert>
        </a-collapse-item>
      </a-collapse>

      <a-button type="primary" :loading="saving" @click="handleSave">
        保存 OAuth 配置
      </a-button>
    </a-spin>
  </a-card>
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import {
    getOAuthProviderConfig,
    updateOAuthProviderConfig,
  } from '@/api/oauth';
  import {
    getOAuthCallbackUrl,
    normalizeOAuthRedirectPath,
  } from '@/utils/oauth';

  const loading = ref(false);
  const saving = ref(false);
  const clearSecret = ref(false);
  const callbackUrl = getOAuthCallbackUrl();

  const form = reactive({
    provider: 'github',
    client_id: '',
    client_secret: '',
    callback_url: callbackUrl,
    admin_redirect_url: '/dashboard/workplace',
    enabled: false,
  });

  const loadConfig = async () => {
    loading.value = true;
    try {
      const res = await getOAuthProviderConfig('github');
      const { data } = res.data;
      form.client_id = data.client_id || '';
      form.client_secret = data.client_secret ? '********' : '';
      form.callback_url = data.callback_url || callbackUrl;
      form.admin_redirect_url = normalizeOAuthRedirectPath(
        data.admin_redirect_url || undefined
      );
      form.enabled = Boolean(data.enabled);
    } finally {
      loading.value = false;
    }
  };

  const handleSave = () => {
    Modal.confirm({
      title: '确认保存 OAuth 配置？',
      content: clearSecret.value
        ? '本次保存会清除现有 Client Secret。'
        : '保存后登录页展示会根据启用状态变化。',
      async onOk() {
        saving.value = true;
        try {
          await updateOAuthProviderConfig('github', {
            client_id: form.client_id,
            client_secret:
              form.client_secret && form.client_secret !== '********'
                ? form.client_secret
                : undefined,
            callback_url: callbackUrl,
            admin_redirect_url: normalizeOAuthRedirectPath(
              form.admin_redirect_url || undefined
            ),
            enabled: form.enabled,
            clear_secret: clearSecret.value,
          });
          Message.success('OAuth 配置保存成功');
          clearSecret.value = false;
          await loadConfig();
        } finally {
          saving.value = false;
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
