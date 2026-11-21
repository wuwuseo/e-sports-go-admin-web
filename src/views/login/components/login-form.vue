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
          <template #prefix><icon-user /></template>
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
          <template #prefix><icon-lock /></template>
        </a-input-password>
      </a-form-item>

      <a-form-item
        v-if="captchaChallenge?.type === 'image_text'"
        field="captcha"
        :rules="[{ required: true, message: $t('login.form.captcha.errMsg') }]"
        :validate-trigger="['change', 'blur']"
        hide-label
      >
        <div class="captcha-row">
          <a-input
            v-model="userInfo.captcha"
            :placeholder="$t('login.form.captcha.placeholder')"
            size="large"
            class="captcha-input"
            autocomplete="off"
          >
            <template #prefix><icon-safe /></template>
          </a-input>
          <a-tooltip :content="$t('login.form.captcha.refresh')">
            <button
              type="button"
              class="captcha-image captcha-image-button"
              :title="$t('login.form.captcha.refresh')"
              @click="refreshCaptcha"
            >
              <a-spin :loading="captchaLoading">
                <img
                  v-if="captchaImageSrc"
                  :src="captchaImageSrc"
                  :alt="$t('login.form.captcha.refresh')"
                />
                <icon-refresh v-else />
              </a-spin>
            </button>
          </a-tooltip>
        </div>
      </a-form-item>

      <div
        v-else-if="captchaChallenge?.type === 'image_click'"
        class="captcha-click-panel"
      >
        <div class="captcha-click-heading">
          <span>
            {{ $t('login.form.captcha.clickPrompt') }}
            <strong>{{ captchaChallenge.prompt }}</strong>
          </span>
          <a-link @click="clearCaptchaPoints">
            {{ $t('login.form.captcha.clearClicks') }}
          </a-link>
        </div>
        <button
          type="button"
          class="captcha-click-image"
          @click="handleCaptchaImageClick"
        >
          <img :src="captchaImageSrc" :alt="captchaChallenge.prompt" />
          <span
            v-for="(point, index) in captchaPoints"
            :key="`${point.x}-${point.y}-${index}`"
            class="captcha-click-marker"
            :style="{
              left: `${point.x * 100}%`,
              top: `${point.y * 100}%`,
            }"
          >
            {{ index + 1 }}
          </span>
        </button>
        <div class="captcha-click-status">
          {{
            $t('login.form.captcha.clickStatus', {
              current: captchaPoints.length,
              total: captchaChallenge.pointCount,
            })
          }}
          <a-link @click="refreshCaptcha">
            {{ $t('login.form.captcha.refreshShort') }}
          </a-link>
        </div>
      </div>

      <a-alert
        v-else-if="captchaChallenge?.type === 'geetest_gt4'"
        type="info"
        class="captcha-geetest-tip"
      >
        {{ $t('login.form.captcha.geetestTip') }}
      </a-alert>

      <a-alert
        v-else-if="captchaRequired"
        type="error"
        class="captcha-geetest-tip"
      >
        {{ $t('login.form.captcha.unavailable') }}
      </a-alert>

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
  import {
    computed,
    onBeforeUnmount,
    onMounted,
    reactive,
    ref,
    shallowRef,
  } from 'vue';
  import { useRouter } from 'vue-router';
  import { Message } from '@arco-design/web-vue';
  import type { ValidatedError } from '@arco-design/web-vue/es/form/interface';
  import { useI18n } from 'vue-i18n';
  import { useStorage } from '@vueuse/core';
  import { useOAuthStore, useUserStore } from '@/store';
  import useLoading from '@/hooks/loading';
  import { getPublicKey } from '@/api/user';
  import {
    createCaptchaChallenge,
    resolveCaptchaChallenge,
    verifyCaptchaChallenge,
  } from '@/api/captcha';
  import type { ResolvedCaptchaChallenge } from '@/api/captcha';
  import {
    buildAdminOAuthAuthorizeUrl,
    saveOAuthRedirectPath,
  } from '@/utils/oauth';
  import shouldShowProviderLogin from '@/utils/oauth-flow';
  import type { AdminLoginRequest } from '@/types/api';
  import { initGeeTest, normalizeClickPoint } from '../captcha';
  import type {
    CaptchaPoint,
    GeeTestInstance,
    GeeTestValidation,
  } from '../captcha';

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

  const captchaRequired = ref(false);
  const captchaLoading = ref(false);
  const captchaChallenge = ref<ResolvedCaptchaChallenge | null>(null);
  const captchaPoints = ref<CaptchaPoint[]>([]);
  const geetestInstance = shallowRef<GeeTestInstance>();
  const geetestReady = ref(false);
  let geetestReadyPromise: Promise<void> = Promise.resolve();
  let pendingGeeTest:
    | {
        resolve: (validation: GeeTestValidation) => void;
        reject: (error: Error) => void;
      }
    | undefined;

  const captchaImageSrc = computed(() => {
    const challenge = captchaChallenge.value;
    if (!challenge || !('image' in challenge)) return '';
    if (challenge.image.startsWith('data:')) return challenge.image;
    return `data:${challenge.mimeType};base64,${challenge.image}`;
  });

  // 默认不预填任何账号，也不默认勾选「记住密码」：勾选后密码会明文写入
  // localStorage。开发环境保留 admin 预填，避免每次手输。
  const loginConfig = useStorage('login-config', {
    rememberPassword: false,
    username: import.meta.env.DEV ? 'admin' : '',
    password: import.meta.env.DEV ? 'admin' : '',
  });
  const userInfo = reactive({
    username: loginConfig.value.username,
    password: loginConfig.value.password,
    captcha: '',
  });

  function getLoginRedirectPath() {
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
  }

  async function rsaEncrypt(publicKeyPem: string, data: string) {
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
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      cryptoKey,
      new TextEncoder().encode(data)
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }

  function generateNonce() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function rejectPendingGeeTest(error: Error) {
    pendingGeeTest?.reject(error);
    pendingGeeTest = undefined;
  }

  function disposeGeeTest() {
    rejectPendingGeeTest(new Error(t('login.form.captcha.unavailable')));
    geetestInstance.value?.destroy?.();
    geetestInstance.value = undefined;
    geetestReady.value = false;
    geetestReadyPromise = Promise.resolve();
  }

  async function prepareGeeTest(captchaId: string) {
    const instance = await initGeeTest(captchaId);
    geetestInstance.value = instance;
    geetestReady.value = false;
    geetestReadyPromise = new Promise<void>((resolve, reject) => {
      instance.onReady(() => {
        geetestReady.value = true;
        resolve();
      });
      instance.onError(() => {
        const error = new Error(t('login.form.captcha.unavailable'));
        reject(error);
        rejectPendingGeeTest(error);
      });
    });
    instance.onSuccess(() => {
      const validation = instance.getValidate();
      if (!validation) {
        rejectPendingGeeTest(new Error(t('login.form.captcha.wrong')));
        return;
      }
      pendingGeeTest?.resolve(validation);
      pendingGeeTest = undefined;
    });
    instance.onClose?.(() => {
      rejectPendingGeeTest(new Error(t('login.form.captcha.cancelled')));
    });
  }

  async function requestGeeTestValidation() {
    await geetestReadyPromise;
    const instance = geetestInstance.value;
    if (!instance || !geetestReady.value) {
      throw new Error(t('login.form.captcha.unavailable'));
    }
    return new Promise<GeeTestValidation>((resolve, reject) => {
      pendingGeeTest = { resolve, reject };
      try {
        instance.showCaptcha();
      } catch {
        rejectPendingGeeTest(new Error(t('login.form.captcha.unavailable')));
      }
    });
  }

  async function refreshCaptcha() {
    captchaLoading.value = true;
    userInfo.captcha = '';
    captchaPoints.value = [];
    disposeGeeTest();
    try {
      const res = await createCaptchaChallenge();
      const challenge = resolveCaptchaChallenge(res.data.data);
      captchaChallenge.value = challenge;
      captchaRequired.value = Boolean(challenge);
      if (challenge?.type === 'geetest_gt4') {
        await prepareGeeTest(challenge.captchaId);
      }
    } catch {
      captchaRequired.value = true;
      captchaChallenge.value = null;
    } finally {
      captchaLoading.value = false;
    }
  }

  function clearCaptchaPoints() {
    captchaPoints.value = [];
  }

  function handleCaptchaImageClick(event: MouseEvent) {
    const challenge = captchaChallenge.value;
    if (
      challenge?.type !== 'image_click' ||
      captchaPoints.value.length >= challenge.pointCount
    ) {
      return;
    }
    captchaPoints.value.push(
      normalizeClickPoint(
        event.clientX,
        event.clientY,
        (event.currentTarget as HTMLElement).getBoundingClientRect()
      )
    );
  }

  async function verifyCurrentCaptcha() {
    if (!captchaRequired.value) return undefined;
    const challenge = captchaChallenge.value;
    if (!challenge) throw new Error(t('login.form.captcha.unavailable'));

    let response: Record<string, unknown>;
    if (challenge.type === 'image_text') {
      const answer = userInfo.captcha.trim();
      if (!answer) throw new Error(t('login.form.captcha.errMsg'));
      response = { answer };
    } else if (challenge.type === 'image_click') {
      if (captchaPoints.value.length !== challenge.pointCount) {
        throw new Error(t('login.form.captcha.clickIncomplete'));
      }
      response = { points: captchaPoints.value };
    } else {
      response = { ...(await requestGeeTestValidation()) };
    }

    const verified = await verifyCaptchaChallenge(challenge.id, response);
    geetestInstance.value?.reset();
    return verified.data.data.captcha_token;
  }

  async function buildLoginData(values: Record<string, any>) {
    let loginData: AdminLoginRequest = {
      username: values.username,
      password: values.password,
    };
    try {
      const keyRes = await getPublicKey();
      const keyData = keyRes.data.data;
      if (keyData?.public_key) {
        loginData = {
          encrypted_username: await rsaEncrypt(
            keyData.public_key,
            values.username
          ),
          encrypted_password: await rsaEncrypt(
            keyData.public_key,
            values.password
          ),
          key_id: keyData.key_id,
          nonce: generateNonce(),
          timestamp: Math.floor(Date.now() / 1000),
        };
      }
    } catch {
      // eslint-disable-next-line no-console
      console.warn('Failed to get public key, falling back to plain login');
    }
    return loginData;
  }

  async function handleSubmit({
    errors,
    values,
  }: {
    errors: Record<string, ValidatedError> | undefined;
    values: Record<string, any>;
  }) {
    if (loading.value || errors) return;
    setLoading(true);
    errorMessage.value = '';
    try {
      const captchaToken = await verifyCurrentCaptcha();
      await userStore.adminLogin(await buildLoginData(values), captchaToken);
      Message.success(t('login.form.login.success'));

      loginConfig.value.username = loginConfig.value.rememberPassword
        ? values.username
        : '';
      loginConfig.value.password = loginConfig.value.rememberPassword
        ? values.password
        : '';
      if (!userStore.role) userStore.setInfo({ role: 'admin' });
      await router.replace(getLoginRedirectPath());
    } catch (error) {
      errorMessage.value =
        (error as Error).message || t('login.form.login.errMsg');
      if (captchaRequired.value) await refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  function setRememberPassword(value: boolean | (string | number | boolean)[]) {
    loginConfig.value.rememberPassword = value as boolean;
  }

  function handleGithubLogin() {
    const provider = oauthStore.adminGithubProvider;
    if (!provider) return;
    saveOAuthRedirectPath(getLoginRedirectPath());
    window.location.href = buildAdminOAuthAuthorizeUrl(provider.provider);
  }

  onMounted(async () => {
    oauthLoading.value = true;
    try {
      await oauthStore.fetchProviders('admin', true);
    } finally {
      oauthLoading.value = false;
    }
    await refreshCaptcha();
  });
  onBeforeUnmount(disposeGeeTest);
</script>

<style lang="less" scoped>
  .login-form-wrapper {
    width: 100%;
  }

  .login-form-error-msg {
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
  }

  .captcha-row {
    display: flex;
    gap: 10px;
    align-items: center;
    width: 100%;
  }

  .captcha-input {
    flex: 1;
  }

  .captcha-image {
    flex-shrink: 0;
    width: 140px;
    height: 44px;
    overflow: hidden;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }

  .captcha-image-button {
    padding: 0;
    cursor: pointer;
  }

  .captcha-image :deep(.arco-spin),
  .captcha-image :deep(.arco-icon),
  .captcha-image img {
    width: 100%;
    height: 100%;
  }

  .captcha-image img {
    object-fit: cover;
  }

  .captcha-click-panel,
  .captcha-geetest-tip {
    margin-bottom: 20px;
  }

  .captcha-click-heading,
  .captcha-click-status {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    color: var(--color-text-2);
    font-size: 13px;
  }

  .captcha-click-image {
    position: relative;
    display: block;
    width: 100%;
    padding: 0;
    overflow: hidden;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    cursor: crosshair;
  }

  .captcha-click-image img {
    display: block;
    width: 100%;
    height: auto;
  }

  .captcha-click-marker {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    color: #fff;
    font-weight: 600;
    font-size: 12px;
    background: rgb(var(--primary-6));
    border: 2px solid #fff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .captcha-click-status {
    margin-top: 8px;
    margin-bottom: 0;
  }

  .login-form-options {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .login-btn {
    height: 44px;
    font-weight: 600;
    border-radius: 10px;
  }

  .github-login-btn {
    height: 44px;
    border-radius: 10px;
  }
</style>
