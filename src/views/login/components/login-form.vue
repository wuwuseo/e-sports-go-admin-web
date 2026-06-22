<template>
  <div class="login-form-wrapper">
    <div v-if="errorMessage" class="login-form-error-msg">
      <icon-close-circle-fill />
      <span>{{ errorMessage }}</span>
    </div>
    <a-form
      ref="loginForm"
      :model="userInfo"
      class="login-form"
      layout="vertical"
      @submit="handleSubmit"
    >
      <a-form-item
        field="username"
        :rules="[{ required: true, message: $t('login.form.username.errMsg') }]"
        :validate-trigger="['change', 'blur']"
        hide-label
      >
        <a-input
          v-model="userInfo.username"
          :placeholder="$t('login.form.username.placeholder')"
          size="large"
        >
          <template #prefix>
            <icon-user />
          </template>
        </a-input>
      </a-form-item>
      <a-form-item
        field="password"
        :rules="[{ required: true, message: $t('login.form.password.errMsg') }]"
        :validate-trigger="['change', 'blur']"
        hide-label
      >
        <a-input-password
          v-model="userInfo.password"
          :placeholder="$t('login.form.password.placeholder')"
          allow-clear
          size="large"
        >
          <template #prefix>
            <icon-lock />
          </template>
        </a-input-password>
      </a-form-item>
      <div class="login-form-options">
        <a-checkbox
          :model-value="loginConfig.rememberPassword"
          @change="setRememberPassword"
        >
          {{ $t('login.form.rememberPassword') }}
        </a-checkbox>
      </div>
      <a-button
        type="primary"
        html-type="submit"
        long
        :loading="loading"
        size="large"
        class="login-btn"
      >
        {{ $t('login.form.login') }}
      </a-button>
      <a-divider v-if="showGithubLogin" margin="18px">
        {{ $t('login.form.oauth.divider') }}
      </a-divider>
      <a-button
        v-if="showGithubLogin"
        long
        size="large"
        class="github-login-btn"
        :loading="oauthLoading"
        @click="handleGithubLogin"
      >
        <template #icon><icon-github /></template>
        {{ $t('login.form.github') }}
      </a-button>
    </a-form>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref, reactive } from 'vue';
  import { useRouter } from 'vue-router';
  import { Message } from '@arco-design/web-vue';
  import { ValidatedError } from '@arco-design/web-vue/es/form/interface';
  import { useI18n } from 'vue-i18n';
  import { useStorage } from '@vueuse/core';
  import { useOAuthStore, useUserStore } from '@/store';
  import useLoading from '@/hooks/loading';
  import { getPublicKey } from '@/api/user';
  import { saveOAuthRedirectPath } from '@/utils/oauth';
  import shouldShowProviderLogin from '@/utils/oauth-flow';
  import type { AdminLoginRequest } from '@/types/api';

  const router = useRouter();
  const { t } = useI18n();
  const errorMessage = ref('');
  const { loading, setLoading } = useLoading();
  const userStore = useUserStore();
  const oauthStore = useOAuthStore();
  const oauthLoading = ref(false);
  const showGithubLogin = computed(() =>
    shouldShowProviderLogin(oauthStore.adminGithubProvider)
  );

  const loginConfig = useStorage('login-config', {
    rememberPassword: true,
    username: 'admin',
    password: 'admin',
  });
  const userInfo = reactive({
    username: loginConfig.value.username,
    password: loginConfig.value.password,
  });

  const getLoginRedirectPath = () => {
    const { redirect } = router.currentRoute.value.query;
    const redirectValue = Array.isArray(redirect) ? redirect[0] : redirect;

    if (
      redirectValue &&
      redirectValue !== 'undefined' &&
      redirectValue.startsWith('/')
    ) {
      return redirectValue;
    }

    return '/dashboard/workplace';
  };

  // RSA 加密函数
  async function rsaEncrypt(
    publicKeyPem: string,
    data: string
  ): Promise<string> {
    const pemContents = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s/g, '');
    const binaryKey = Uint8Array.from(atob(pemContents), (c) =>
      c.charCodeAt(0)
    );

    const cryptoKey = await window.crypto.subtle.importKey(
      'spki',
      binaryKey.buffer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );

    const encoded = new TextEncoder().encode(data);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      cryptoKey,
      encoded
    );

    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }

  // 生成随机 nonce
  function generateNonce(): string {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  const handleSubmit = async ({
    errors,
    values,
  }: {
    errors: Record<string, ValidatedError> | undefined;
    values: Record<string, any>;
  }) => {
    if (loading.value) return;
    if (!errors) {
      setLoading(true);
      errorMessage.value = '';
      try {
        let loginData: AdminLoginRequest = {
          username: values.username,
          password: values.password,
        };

        try {
          const keyRes = await getPublicKey();
          const keyData = keyRes.data.data;
          if (keyData && keyData.public_key) {
            const encryptedUsername = await rsaEncrypt(
              keyData.public_key,
              values.username
            );
            const encryptedPassword = await rsaEncrypt(
              keyData.public_key,
              values.password
            );
            const nonce = generateNonce();
            loginData = {
              encrypted_username: encryptedUsername,
              encrypted_password: encryptedPassword,
              key_id: keyData.key_id,
              nonce,
              timestamp: Math.floor(Date.now() / 1000),
            };
          }
        } catch (e) {
          // 获取公钥失败，降级为明文登录
          // eslint-disable-next-line no-console
          console.warn('Failed to get public key, falling back to plain login');
        }

        // 执行管理员登录
        await userStore.adminLogin(loginData);

        Message.success(t('login.form.login.success'));

        // 保存登录配置
        const { rememberPassword } = loginConfig.value;
        const { username, password } = values;
        loginConfig.value.username = rememberPassword ? username : '';
        loginConfig.value.password = rememberPassword ? password : '';

        // 确保用户角色已设置（如果没有设置默认admin）
        if (!userStore.role) {
          userStore.setInfo({ role: 'admin' });
        }

        await router.replace(getLoginRedirectPath());
      } catch (err) {
        errorMessage.value = (err as Error).message;
      } finally {
        setLoading(false);
      }
    }
  };
  const setRememberPassword = (
    value: boolean | (string | number | boolean)[]
  ) => {
    loginConfig.value.rememberPassword = value as boolean;
  };

  const handleGithubLogin = () => {
    const provider = oauthStore.adminGithubProvider;
    if (!provider?.authorize_url) return;
    saveOAuthRedirectPath(getLoginRedirectPath());
    window.location.href = provider.authorize_url;
  };

  onMounted(async () => {
    oauthLoading.value = true;
    try {
      await oauthStore.fetchProviders('admin', true);
    } finally {
      oauthLoading.value = false;
    }
  });
</script>

<style lang="less" scoped>
  .login-form-wrapper {
    width: 100%;
  }

  .login-form {
    &-error-msg {
      display: flex;
      gap: 6px;
      align-items: center;
      margin-bottom: 20px;
      padding: 10px 14px;
      color: #dc2626;
      font-size: 13px;
      line-height: 1.4;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      animation: shake 0.4s ease;

      .arco-icon {
        flex-shrink: 0;
        font-size: 16px;
      }
    }

    &-options {
      display: flex;
      justify-content: flex-start;
      margin-bottom: 24px;
    }
  }

  .login-btn {
    height: 44px !important;
    font-weight: 600 !important;
    font-size: 15px !important;
    letter-spacing: 0.03em;
    border-radius: 10px !important;
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }

    25% {
      transform: translateX(-4px);
    }

    75% {
      transform: translateX(4px);
    }
  }

  // 暗色模式
  body[arco-theme='dark'] & {
    .login-form-error-msg {
      color: #fca5a5;
      background: rgb(239 68 68 / 10%);
      border-color: rgb(239 68 68 / 30%);
    }
  }
</style>
