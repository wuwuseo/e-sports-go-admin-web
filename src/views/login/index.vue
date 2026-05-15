<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="login-bg-overlay"></div>
      <div class="login-bg-particles">
        <span
          v-for="i in 20"
          :key="i"
          class="particle"
          :style="particleStyle(i)"
        />
      </div>
    </div>
    <div class="login-container">
      <div class="login-brand">
        <div class="brand-logo">
          <div class="brand-icon">
            <icon-settings />
          </div>
          <span class="brand-name">管理系统</span>
        </div>
        <div class="brand-tagline">高效 · 安全 · 智能</div>
      </div>
      <div class="login-card-wrapper">
        <div class="login-card">
          <div class="login-card-header">
            <h2 class="login-title">欢迎回来</h2>
            <p class="login-subtitle">请登录您的账户以继续</p>
          </div>
          <LoginForm />
        </div>
        <div class="login-features">
          <div class="feature-item">
            <icon-lock class="feature-icon" />
            <span>加密传输</span>
          </div>
          <div class="feature-divider" />
          <div class="feature-item">
            <icon-safe class="feature-icon" />
            <span>权限管控</span>
          </div>
          <div class="feature-divider" />
          <div class="feature-item">
            <icon-history class="feature-icon" />
            <span>操作审计</span>
          </div>
        </div>
      </div>
    </div>
    <div class="login-footer">
      <Footer />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import Footer from '@/components/footer/index.vue';
  import LoginForm from './components/login-form.vue';

  const particleStyle = (i: number) => ({
    left: `${(i * 7 + 3) % 100}%`,
    top: `${(i * 13 + 7) % 100}%`,
    width: `${((i % 3) + 1) * 3}px`,
    height: `${((i % 3) + 1) * 3}px`,
    animationDelay: `${i * 0.3}s`,
    animationDuration: `${3 + (i % 5)}s`,
    opacity: 0.15 + (i % 3) * 0.1,
  });
</script>

<style lang="less" scoped>
  .login-page {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    overflow: hidden;
    background: var(--gradient-login);
  }

  .login-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;

    &-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(
          ellipse at 20% 50%,
          rgba(37, 99, 235, 0.3) 0%,
          transparent 50%
        ),
        radial-gradient(
          ellipse at 80% 20%,
          rgba(124, 58, 237, 0.2) 0%,
          transparent 50%
        ),
        radial-gradient(
          ellipse at 50% 80%,
          rgba(16, 185, 129, 0.1) 0%,
          transparent 50%
        );
    }

    &-particles {
      position: absolute;
      inset: 0;
    }
  }

  .particle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    animation: float 4s ease-in-out infinite;
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(-20px) scale(1.2);
    }
  }

  .login-container {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
  }

  .login-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .brand-name {
      font-size: 28px;
      font-weight: 700;
      color: white;
      letter-spacing: 0.02em;
    }

    .brand-tagline {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
      letter-spacing: 0.3em;
    }
  }

  .login-card-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .login-card {
    width: 400px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    padding: 40px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    animation: fadeInUp 0.6s ease;

    &-header {
      margin-bottom: 32px;
      text-align: center;
    }
  }

  .login-title {
    font-size: 24px;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 8px;
  }

  .login-subtitle {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }

  .login-features {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 24px;
    padding: 16px 24px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    animation: fadeInUp 0.6s ease 0.2s both;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgba(255, 255, 255, 0.85);
    font-size: 13px;
    font-weight: 500;
  }

  .feature-icon {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
  }

  .feature-divider {
    width: 1px;
    height: 20px;
    background: rgba(255, 255, 255, 0.2);
  }

  .login-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1;

    :deep(.footer) {
      background: transparent !important;
      color: rgba(255, 255, 255, 0.4) !important;
    }
  }

  // 暗色模式支持
  body[arco-theme='dark'] & {
    .login-card {
      background: rgba(30, 41, 59, 0.95);
      border-color: rgba(255, 255, 255, 0.1);

      .login-title {
        color: #f1f5f9;
      }
      .login-subtitle {
        color: #94a3b8;
      }
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
