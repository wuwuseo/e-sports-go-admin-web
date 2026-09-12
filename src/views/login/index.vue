<template>
  <div class="login-page">
    <div class="login-brand-bar">
      <span class="brand-mark" />
      <span class="brand-name">管理系统</span>
    </div>
    <div class="login-card">
      <div class="login-logo">
        <icon-settings />
      </div>
      <h2 class="login-title">欢迎回来</h2>
      <p class="login-subtitle">请登录您的账户以继续</p>
      <LoginForm />
    </div>
    <div class="login-copyright">Copyright © 2026 Admin System</div>
  </div>
</template>

<script lang="ts" setup>
  import LoginForm from './components/login-form.vue';
</script>

<style lang="less" scoped>
  .login-page {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--space-8) var(--space-6);
    overflow: hidden;
    background: var(--bg-subtle);

    // 极淡品牌色晕染：左上蓝、右下紫
    &::before {
      position: absolute;
      width: 100%;
      height: 100%;
      background: radial-gradient(
          ellipse 55% 55% at 12% 8%,
          rgb(37 99 235 / 7%),
          transparent 65%
        ),
        radial-gradient(
          ellipse 50% 50% at 90% 92%,
          rgb(124 58 237 / 6%),
          transparent 65%
        );
      content: '';
      pointer-events: none;
    }
  }

  .login-brand-bar {
    position: absolute;
    top: var(--space-5);
    left: var(--space-6);
    z-index: 1;
    display: flex;
    gap: var(--space-2);
    align-items: center;
    color: var(--color-text-1);
    font-weight: 700;
    font-size: 14px;
  }

  .brand-mark {
    width: 18px;
    height: 18px;
    background: var(--gradient-primary);
    border-radius: var(--radius-sm);
  }

  .login-card {
    position: relative;
    z-index: 1;
    width: 400px;
    max-width: 100%;
    padding: var(--space-10);
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xl);
    box-shadow: 0 12px 32px -16px rgb(15 23 42 / 18%);
    animation: login-card-in 0.3s ease;
  }

  .login-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    margin: 0 auto;
    color: #fff;
    font-size: 18px;
    background: var(--gradient-primary);
    border-radius: var(--radius-lg);
  }

  .login-title {
    margin: var(--space-3) 0 0;
    color: var(--color-text-1);
    font-weight: 700;
    font-size: 20px;
    text-align: center;
  }

  .login-subtitle {
    margin: 0 0 var(--space-6);
    color: var(--color-text-3);
    font-size: 14px;
    text-align: center;
  }

  .login-copyright {
    position: absolute;
    bottom: var(--space-4);
    z-index: 1;
    color: var(--color-text-4);
    font-size: 12px;
  }

  @keyframes login-card-in {
    from {
      transform: translateY(12px);
      opacity: 0;
    }

    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  // 暗色模式适配
  body[arco-theme='dark'] & {
    &::before {
      background: radial-gradient(
          ellipse 55% 55% at 12% 8%,
          rgb(37 99 235 / 12%),
          transparent 65%
        ),
        radial-gradient(
          ellipse 50% 50% at 90% 92%,
          rgb(124 58 237 / 10%),
          transparent 65%
        );
    }

    .login-card {
      box-shadow: 0 12px 32px -16px rgb(0 0 0 / 50%);
    }
  }

  // 移动端（<576px）：品牌行居中置于卡片上方，卡片自适应宽度
  @media (max-width: 576px) {
    .login-brand-bar {
      position: static;
      order: -1;
      margin-bottom: var(--space-4);
    }

    .login-card {
      padding: var(--space-6) var(--space-5);
    }
  }
</style>
