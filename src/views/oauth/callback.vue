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
    parseOAuthCallbackQuery,
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

  const goLogin = () => {
    router.replace({ name: 'login' });
  };

  const clearSensitiveQuery = () => {
    window.history.replaceState({}, '', route.path);
  };

  onMounted(async () => {
    const callback = parseOAuthCallbackQuery(route.query);
    clearSensitiveQuery();

    if (callback.kind === 'error') {
      errorMessage.value = formatOAuthErrorMessage(callback.code);
      Message.error(errorMessage.value);
      loading.value = false;
      return;
    }

    if (callback.kind === 'bound') {
      Message.success('GitHub 身份绑定成功');
      loading.value = false;
      await router.replace({ path: consumeOAuthRedirectPath() });
      return;
    }

    try {
      const res = await exchangeOAuthCode({ code: callback.code });
      await userStore.initAdminSession(res.data.data);
      await router.replace({ path: consumeOAuthRedirectPath() });
    } catch (err) {
      errorMessage.value = formatOAuthErrorMessage(
        (err as any)?.response?.data?.message || (err as Error).message
      );
      Message.error(errorMessage.value);
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
