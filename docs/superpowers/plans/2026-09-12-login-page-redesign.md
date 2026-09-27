# 登录页重设计（极简浅色卡片）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 `docs/superpowers/specs/2026-09-12-login-page-redesign-design.md` 将登录页重构为"极简浅色卡片 + 极淡晕染背景"，业务逻辑零改动。

**Architecture:** 只重写页面壳层 `src/views/login/index.vue`（模板 + 脚本 + 样式），表单组件 `login-form.vue` 保持原样；删除无引用的旧模板遗留 `banner.vue`。视觉全部复用 `src/assets/style/design-system.less` 既有令牌与 Arco 组件全局增强。

**Tech Stack:** Vue 3 `<script setup>` + Arco Design Vue（图标全局注册，无需 import）+ Less（scoped）+ 既有设计令牌。

## Global Constraints

- 不新增任何 npm 依赖；不引入新组件库。
- 不新增全局样式变量；颜色/圆角/间距/阴影优先用 `design-system.less` 令牌（`--bg-subtle`、`--bg-elevated`、`--border-subtle`、`--gradient-primary`、`--color-text-*`、`--radius-*`、`--space-*`）；光晕与卡片投影允许一次性内联 rgba。
- `login-form.vue` 的 `<script>` 逻辑零改动；本计划对其模板/样式也不做改动（现有样式已兼容新皮肤，如实测发现轻微间距问题，只允许改样式且逐条记录）。
- 登录壳层文案维持硬编码中文："管理系统"、"欢迎回来"、"请登录您的账户以继续"、"Copyright © 2026 Admin System"。
- 壳层不引入 `@/components/footer`（组件文件保留，`default-layout.vue` 仍在使用）。
- 代码提交需用户明确批准（AGENTS.md 审批协议）；执行前先与用户确认是否逐任务提交。
- 终端命令用 `;` 连接（仓库规则）。
- 验证命令：`npm run type:check`（vue-tsc）、`npm run test:unit`（vitest run）、`npm run build`。

---

### Task 1: 删除死代码 banner.vue

**Files:**
- Delete: `src/views/login/components/banner.vue`

**Interfaces:**
- Consumes: 无（该文件当前无任何引用）
- Produces: 无（纯删除）

- [ ] **Step 1: 确认无引用后删除文件**

先验证无引用（预期无输出）：

```bash
grep -rn "components/banner\|banner.vue" "D:/www/admin-web/web/src"
```

确认无引用后删除：

```bash
rm "D:/www/admin-web/web/src/views/login/components/banner.vue"
```

- [ ] **Step 2: 验证类型与单测不受影响**

```bash
npm run type:check ; npm run test:unit
```

Expected: type:check 无错误退出；vitest 全部用例通过（`login-form.test.ts`、`captcha.test.ts` 不受影响）。

- [ ] **Step 3: Commit（需用户已批准提交）**

```bash
git add -A
git commit -m "chore(login): remove unused banner component"
```

---

### Task 2: 重写登录页壳层 index.vue

**Files:**
- Modify（整文件重写）: `src/views/login/index.vue`

**Interfaces:**
- Consumes: `./components/login-form.vue` 默认导出（不变）；Arco 全局图标 `<icon-settings />`（无需 import）
- Produces: 登录路由 `/login` 的页面壳层（路由注册不变，无对外接口变化）

- [ ] **Step 1: 用以下完整内容重写 `src/views/login/index.vue`**

```vue
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
      inset: 0;
      content: '';
      pointer-events: none;
      background:
        radial-gradient(
          ellipse 55% 55% at 12% 8%,
          rgba(37, 99, 235, 0.07),
          transparent 65%
        ),
        radial-gradient(
          ellipse 50% 50% at 90% 92%,
          rgba(124, 58, 237, 0.06),
          transparent 65%
        );
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
    box-shadow: 0 12px 32px -16px rgba(15, 23, 42, 0.18);
    animation: loginCardIn 0.3s ease;
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

  @keyframes loginCardIn {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  // 暗色模式适配
  body[arco-theme='dark'] & {
    &::before {
      background:
        radial-gradient(
          ellipse 55% 55% at 12% 8%,
          rgba(37, 99, 235, 0.12),
          transparent 65%
        ),
        radial-gradient(
          ellipse 50% 50% at 90% 92%,
          rgba(124, 58, 237, 0.1),
          transparent 65%
        );
    }

    .login-card {
      box-shadow: 0 12px 32px -16px rgba(0, 0, 0, 0.5);
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
```

要点核对（对照 spec）：
- 页面背景 `--bg-subtle` + 两团光晕（暗色下提高不透明度）✓
- 卡片 400px / `--radius-xl` / `--border-subtle` / 内边距 40px（`--space-10`）/ 柔和投影 ✓
- 品牌行左上角，`<576px` 静态居中于卡片上方 ✓
- 版权行替代 Footer 组件 ✓
- 仅保留 0.3s `loginCardIn` 入场动画 ✓
- 无粒子、无特性胶囊、无 `--gradient-login`、无 Footer 引用 ✓

- [ ] **Step 2: 格式化并 lint 修复**

```bash
npx prettier --write "src/views/login/index.vue" ; npx eslint --fix "src/views/login/index.vue"
```

Expected: 两个命令均无报错退出（prettier 可能只报告已格式化）。

- [ ] **Step 3: 类型检查**

```bash
npm run type:check
```

Expected: 退出码 0，无 vue-tsc 错误。

- [ ] **Step 4: 单元测试**

```bash
npm run test:unit
```

Expected: 全部用例通过（`login-form.test.ts`、`captcha.test.ts`；本次改动不涉及被测逻辑）。

- [ ] **Step 5: 生产构建**

```bash
npm run build
```

Expected: vue-tsc 通过且 vite 构建成功产出 dist。

- [ ] **Step 6: 浏览器可视化验证（三种形态）**

1. 后台启动开发服务器：`npm run dev`（后台运行，从输出解析本地地址，通常 `http://localhost:5173/`）。
2. 用 browser-use 技能打开登录页并截图：
   - 桌面浅色（默认）——核对：光晕极淡、白卡居中、品牌在左上、版权在底部、按钮为渐变主色；
   - 暗色模式——执行 `document.body.setAttribute('arco-theme', 'dark')` 后截图，核对卡面/边框/文字切换；
   - 移动端——将视口宽度调到 375px 后截图，核对品牌行居中于卡片上方、卡片宽度 `calc(100% - 48px)`。
3. 表单交互抽查：输入错误凭据提交出现红色错误条（样式未破坏）；GitHub 按钮按后端配置条件显示。
4. 验证完成后停止开发服务器。

Expected: 三张截图与 `docs/superpowers/specs/2026-09-12-login-page-redesign-design.md` 第 3-5 节一致；无样式错乱、无控制台报错。

- [ ] **Step 7: Commit（需用户已批准提交）**

```bash
git add src/views/login/index.vue
git commit -m "feat(login): redesign minimal light login page"
```

---

## 计划自审记录

- **Spec 覆盖:** spec §3 布局 → Task 2 Step 1 模板；§4 视觉（含暗色令牌表、按钮走全局渐变、唯一入场动画）→ Task 2 Step 1 样式；§5 响应式 → Task 2 Step 1 媒体查询 + Step 6 移动端截图；§6 验证码/OAuth 皮肤 → 无代码改动（login-form 现有样式已兼容），Task 2 Step 6 交互抽查兜底；§7 文件清单 → Task 1（banner.vue、.gitignore 已完成）+ Task 2（index.vue、login-form 无改动）；§8 验证计划 → Step 2-6。
- **占位符扫描:** 无 TBD/TODO；所有代码步骤均给出完整代码与预期输出。
- **命名一致性:** `LoginForm` 导入路径、`<icon-settings />` 全局组件、令牌变量名与 `design-system.less` 一致。
