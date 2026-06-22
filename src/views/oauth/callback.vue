<template>
  <div class="oauth-callback">
    <a-result :status="resultStatus" :title="title" :subtitle="subtitle">
      <template #extra>
        <a-button type="primary" @click="goLogin">返回登录页</a-button>
      </template>
    </a-result>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { Message } from '@arco-design/web-vue';
  import { exchangeOAuthCode } from '@/api/oauth';
  import { useUserStore } from '@/store';
  import {
    consumeOAuthRedirectPath,
    formatOAuthErrorMessage,
  } from '@/utils/oauth';

  const route = useRoute();
  const router = useRouter();
  const userStore = useUserStore();

  const loading = ref(true);
  const errorMessage = ref('');

  const resultStatus = computed(() => (errorMessage.value ? 'error' : 'info'));
  const title = computed(() =>
    errorMessage.value ? 'GitHub 授权失败' : '正在完成 GitHub 登录'
  );
  const subtitle = computed(
    () => errorMessage.value || '请稍候，正在初始化会话'
  );

  const firstQueryValue = (value: unknown) => {
    if (Array.isArray(value)) return value[0];
    return typeof value === 'string' ? value : undefined;
  };

  const goLogin = () => {
    router.replace({ name: 'login' });
  };

  onMounted(async () => {
    const code = firstQueryValue(route.query.code);
    const provider = firstQueryValue(route.query.provider) || 'github';
    const error = firstQueryValue(route.query.error);

    if (error) {
      errorMessage.value = formatOAuthErrorMessage(error);
      Message.error(errorMessage.value);
      loading.value = false;
      return;
    }

    if (!code) {
      errorMessage.value = '缺少 OAuth 授权码';
      Message.error(errorMessage.value);
      loading.value = false;
      return;
    }

    try {
      const res = await exchangeOAuthCode({
        code,
        provider,
        subject_type: 'admin',
        redirect_uri: `${window.location.origin}/oauth/callback`,
      });
      await userStore.initAdminSession(res.data.data);
      await router.replace({ path: consumeOAuthRedirectPath() });
    } catch (err) {
      errorMessage.value = formatOAuthErrorMessage(
        (err as any)?.response?.data?.code || (err as Error).message
      );
      Message.error(errorMessage.value);
      await router.replace({ path: '/oauth/callback' });
    } finally {
      loading.value = false;
    }
  });
</script>

<style lang="less" scoped>
  .oauth-callback {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--color-bg-1);
  }
</style>
