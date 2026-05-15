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
        field="email"
        :rules="[
          { required: true, message: $t('login.form.email.errMsg') },
          { type: 'email', message: $t('login.form.email.formatErr') },
        ]"
        :validate-trigger="['change', 'blur']"
        hide-label
      >
        <a-input
          v-model="userInfo.email"
          :placeholder="$t('login.form.email.placeholder')"
          size="large"
        >
          <template #prefix>
            <icon-email />
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
    </a-form>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive } from 'vue';
  import { useRouter } from 'vue-router';
  import { Message } from '@arco-design/web-vue';
  import { ValidatedError } from '@arco-design/web-vue/es/form/interface';
  import { useI18n } from 'vue-i18n';
  import { useStorage } from '@vueuse/core';
  import { useUserStore } from '@/store';
  import useLoading from '@/hooks/loading';
  import { getPublicKey } from '@/api/user';
  import type { LoginRequest } from '@/types/api';

  const router = useRouter();
  const { t } = useI18n();
  const errorMessage = ref('');
  const { loading, setLoading } = useLoading();
  const userStore = useUserStore();

  const loginConfig = useStorage('login-config', {
    rememberPassword: true,
    email: 'admin@example.com',
    password: 'admin',
  });
  const userInfo = reactive({
    email: loginConfig.value.email,
    password: loginConfig.value.password,
  });

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
        let loginData: LoginRequest = {
          email: values.email,
          password: values.password,
        };

        try {
          const keyRes = await getPublicKey();
          const keyData = keyRes.data.data;
          if (keyData && keyData.public_key) {
            const encryptedEmail = await rsaEncrypt(
              keyData.public_key,
              values.email
            );
            const encryptedPassword = await rsaEncrypt(
              keyData.public_key,
              values.password
            );
            const nonce = generateNonce();
            loginData = {
              encrypted_email: encryptedEmail,
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

        // 执行登录
        await userStore.login(loginData);

        Message.success(t('login.form.login.success'));

        // 保存登录配置
        const { rememberPassword } = loginConfig.value;
        const { email, password } = values;
        loginConfig.value.email = rememberPassword ? email : '';
        loginConfig.value.password = rememberPassword ? password : '';

        // 确保用户角色已设置（如果没有设置默认admin）
        if (!userStore.role) {
          userStore.setInfo({ role: 'admin' });
        }

        // 登录成功后直接跳转（不需要 setTimeout，因为 login 内部已经 await 了所有异步操作）
        const { redirect } = router.currentRoute.value.query;
        const redirectValue = redirect as string | undefined;

        // 处理 redirect：如果是有效路径则跳转，否则跳转到工作台
        if (
          redirectValue &&
          redirectValue !== 'undefined' &&
          redirectValue.startsWith('/')
        ) {
          // router.push 可以直接处理带查询参数的完整路径
          await router.push(redirectValue);
        } else {
          // 默认跳转到工作台
          await router.push('/dashboard/workplace');
        }
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
</script>

<style lang="less" scoped>
  .login-form-wrapper {
    width: 100%;
  }

  .login-form {
    &-error-msg {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 14px;
      margin-bottom: 20px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
      font-size: 13px;
      line-height: 1.4;
      animation: shake 0.4s ease;

      .arco-icon {
        font-size: 16px;
        flex-shrink: 0;
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
    font-size: 15px !important;
    font-weight: 600 !important;
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
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }
  }
</style>
