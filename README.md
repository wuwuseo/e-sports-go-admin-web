# Admin Web

> 基于 Vue 3 + TypeScript + Vite + Arco Design Pro 的中后台管理系统前端项目。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.5-brightgreen.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-3.x-blue.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178C6.svg)](https://www.typescriptlang.org/)

---

## 目录

- [项目概览](#项目概览)
- [功能特性](#功能特性)
- [系统要求](#系统要求)
- [安装说明](#安装说明)
- [使用指南](#使用指南)
- [配置选项](#配置选项)
- [项目结构](#项目结构)
- [依赖列表](#依赖列表)
- [开发规范](#开发规范)
- [贡献指南](#贡献指南)
- [许可证](#许可证)
- [联系方式](#联系方式)

---

## 项目概览

**Admin Web** 是一个基于 [Arco Design Pro](https://arco.design/) 的企业级中后台管理系统前端模板，采用 Vue 3 Composition API + TypeScript + Vite 技术栈构建。项目内置了用户认证、权限控制、动态路由、国际化、主题切换、Mock 数据、SSE 实时消息、附件管理等常见后台业务能力，适合作为业务系统的基础脚手架。

主要技术栈：

- **核心框架**：Vue 3.5 + TypeScript 4.9
- **构建工具**：Vite 3.x
- **UI 组件库**：@arco-design/web-vue 2.58
- **状态管理**：Pinia 2.x
- **路由**：Vue Router 4.x
- **HTTP 请求**：Axios
- **图表可视化**：ECharts + vue-echarts
- **国际化**：vue-i18n 9.x
- **工具库**：@vueuse/core、lodash、dayjs

---

## 功能特性

- **认证与权限**：登录认证、Token 管理、基于角色的访问控制（RBAC）、动态路由、按钮级权限指令
- **多布局支持**：默认布局、页面级布局，支持菜单折叠、面包屑、多标签页
- **国际化**：内置中文（zh-CN）与英文（en-US），支持模块化语言包扩展
- **主题切换**：支持明暗主题切换
- **业务模块**：
  - 仪表盘（工作台、数据可视化）
  - 系统管理：用户、角色、权限、部门、字典、配置、定时任务
  - 消息中心：消息管理、广播、订阅偏好
  - 操作日志、第三方用户、附件管理、插件管理
- **请求处理**：统一的请求/响应拦截器、错误处理、Loading 状态钩子
- **实时通信**：基于 SSE（Server-Sent Events）的消息推送
- **Mock 数据**：内置 Mock.js，便于前端独立联调
- **构建优化**：Gzip 压缩、图片压缩、依赖可视化分析
- **代码质量**：ESLint + Prettier + Stylelint + Husky + lint-staged + commitlint

---

## 系统要求

| 工具     | 版本要求                                           |
| -------- | -------------------------------------------------- |
| Node.js  | >= 14.0                                            |
| 包管理器 | pnpm（推荐）/ npm                                  |
| 浏览器   | 现代浏览器（Chrome、Edge、Firefox、Safari 最新版） |

> 项目根目录下提供了 `pnpm-lock.yaml` 与 `pnpm-workspace.yaml`，推荐使用 **pnpm** 进行依赖管理。

---

## 安装说明

### 1. 克隆项目

```powershell
git clone <repository-url>
cd web
```

### 2. 安装依赖

推荐使用 pnpm：

```powershell
pnpm install
```

也可使用 npm：

```powershell
npm install
```

### 3. 配置环境变量

在项目根目录下编辑 `.env.development` 与 `.env.production`，配置后端 API 地址：

```dotenv
# .env.development
VITE_API_BASE_URL=http://localhost:8080/api
```

### 4. 启动开发服务器

```powershell
npm run dev
```

启动后访问终端提示的本地地址（默认 `http://localhost:5173`）。

---

## 使用指南

### 可用脚本

| 命令                        | 说明                                        |
| --------------------------- | ------------------------------------------- |
| `npm run dev`               | 启动开发服务器（使用 `vite.config.dev.ts`） |
| `npm run build`             | 类型检查 + 生产环境构建                     |
| `npm run preview`           | 构建并预览生产产物                          |
| `npm run report`            | 构建并生成依赖分析报告                      |
| `npm run report:skip-check` | 跳过类型检查直接生成依赖分析报告            |
| `npm run type:check`        | 仅执行 TypeScript 类型检查                  |
| `npm run lint-staged`       | 对暂存文件执行 lint                         |

### 开发流程示例

```powershell
# 1. 安装依赖
pnpm install

# 2. 启动开发
npm run dev

# 3. 修改代码后格式化（项目规则要求）
npx prettier --write "src/**/*.{ts,tsx,js,jsx,vue,less,css}" ; npx eslint --fix "src/**/*.{ts,tsx,js,jsx,vue}"

# 4. 类型检查
npm run type:check

# 5. 生产构建
npm run build
```

> ⚠️ 在 PowerShell 中请使用 `;` 作为命令分隔符，**禁止使用 `&&`**。

---

## 配置选项

### 环境变量

环境变量文件位于项目根目录：

- `.env.development`：开发环境
- `.env.production`：生产环境

| 变量名              | 说明              |
| ------------------- | ----------------- |
| `VITE_API_BASE_URL` | 后端 API 基础地址 |

### 应用配置

应用全局配置位于 [settings.json](file:///d:/www/admin-web/web/src/config/settings.json)，可调整菜单、布局、主题等选项。

### Vite 构建配置

构建配置文件位于 `config/` 目录：

- [vite.config.base.ts](file:///d:/www/admin-web/web/config/vite.config.base.ts) — 通用基础配置
- [vite.config.dev.ts](file:///d:/www/admin-web/web/config/vite.config.dev.ts) — 开发环境配置
- [vite.config.prod.ts](file:///d:/www/admin-web/web/config/vite.config.prod.ts) — 生产环境配置

插件配置位于 [config/plugin/](file:///d:/www/admin-web/web/config/plugin)，包含 Arco 按需引入、Gzip 压缩、图片压缩、依赖可视化等。

### 代码规范配置

| 文件                   | 作用                |
| ---------------------- | ------------------- |
| `.eslintrc.js`         | ESLint 规则         |
| `.prettierrc.js`       | Prettier 格式化规则 |
| `.stylelintrc.js`      | 样式 lint 规则      |
| `commitlint.config.js` | Git 提交信息规范    |
| `tsconfig.json`        | TypeScript 编译配置 |

---

## 项目结构

```text
web/
├── config/                # Vite 构建配置
├── src/
│   ├── api/               # 后端接口封装
│   ├── assets/            # 静态资源（图片、样式）
│   ├── components/        # 全局通用组件
│   ├── config/            # 应用全局配置
│   ├── directive/         # 自定义指令（如 v-permission）
│   ├── hooks/             # 组合式函数（locale、theme、request 等）
│   ├── layout/            # 布局组件
│   ├── locale/            # 国际化语言包
│   ├── router/            # 路由配置与守卫
│   ├── services/          # 业务服务（SSE、附件等）
│   ├── store/             # Pinia 状态管理
│   ├── types/             # 全局类型声明
│   ├── utils/             # 工具函数
│   ├── views/             # 业务页面
│   ├── App.vue
│   └── main.ts
├── .env.development
├── .env.production
├── index.html
├── package.json
└── tsconfig.json
```

更详细的架构与模块说明请查看 [CODE_WIKI.md](file:///d:/www/admin-web/web/CODE_WIKI.md) 与 `.qoder/repowiki/` 目录下的文档。

---

## 依赖列表

### 运行时依赖

| 依赖                     | 版本        | 用途               |
| ------------------------ | ----------- | ------------------ |
| `vue`                    | ^3.5.33     | 核心框架           |
| `vue-router`             | ^4.6.4      | 路由               |
| `pinia`                  | ^2.3.1      | 状态管理           |
| `@arco-design/web-vue`   | ^2.58.0     | UI 组件库          |
| `axios`                  | ^0.24.0     | HTTP 客户端        |
| `vue-i18n`               | ^9.14.4     | 国际化             |
| `echarts`、`vue-echarts` | ^5.6 / ^6.7 | 图表               |
| `@vueuse/core`           | ^9.13.0     | 组合式工具集       |
| `dayjs`                  | ^1.11.20    | 日期处理           |
| `lodash`                 | ^4.18.1     | 工具函数           |
| `mitt`                   | ^3.0.1      | 事件总线           |
| `nprogress`              | ^0.2.0      | 顶部加载条         |
| `query-string`           | ^8.2.0      | URL 查询字符串解析 |
| `sortablejs`             | ^1.15.7     | 拖拽排序           |

### 开发依赖（节选）

| 依赖                                              | 用途                |
| ------------------------------------------------- | ------------------- |
| `vite`                                            | 构建工具            |
| `@vitejs/plugin-vue`、`-vue-jsx`                  | Vue 与 JSX 支持     |
| `vue-tsc`、`typescript`                           | 类型检查与 TS 编译  |
| `eslint` 系列                                     | JS/TS/Vue 代码 lint |
| `prettier`、`stylelint`                           | 代码与样式格式化    |
| `husky`、`lint-staged`、`@commitlint/*`           | Git 钩子与提交规范  |
| `mockjs`                                          | Mock 数据           |
| `vite-plugin-compression`、`vite-plugin-imagemin` | 资源压缩            |
| `rollup-plugin-visualizer`                        | 依赖体积分析        |

完整依赖请见 [package.json](file:///d:/www/admin-web/web/package.json)。

---

## 开发规范

本项目内置了完整的代码质量保障流程，请遵循以下约定：

1. **语言**：所有交流与代码注释使用中文，变量/函数/类名使用英文。
2. **终端**：使用 PowerShell，命令分隔符使用 `;`，禁止使用 `&&`。
3. **修改即格式化**：每次修改 `.ts`、`.tsx`、`.js`、`.jsx`、`.vue`、`.less`、`.css` 后，立即运行格式化与 lint 修复。
4. **提交规范**：遵循 Conventional Commits（由 commitlint 强制校验）。
5. **预提交检查**：husky 会在 `git commit` 时自动对暂存文件执行 prettier / eslint / stylelint。

更多细节请阅读：

- [.trae/rules/project_rules.md](file:///d:/www/admin-web/web/.trae/rules/project_rules.md) — 项目规则
- [AGENTS.md](file:///d:/www/admin-web/web/AGENTS.md) — Agent 协作约定

### 格式化命令示例

```powershell
# 单文件
npx prettier --write "src/views/login/index.vue" ; npx eslint --fix "src/views/login/index.vue"

# 批量
npx prettier --write "src/**/*.{ts,tsx,js,jsx,vue,less,css}" ; npx eslint --fix "src/**/*.{ts,tsx,js,jsx,vue}"
```

---

## 贡献指南

欢迎贡献代码与建议！请按以下流程提交：

1. **Fork** 本仓库并克隆到本地。
2. 基于 `main` 分支创建特性分支：
   ```powershell
   git checkout -b feat/your-feature
   ```
3. 编码并按规范执行格式化与类型检查：
   ```powershell
   npx prettier --write "<改动文件>" ; npx eslint --fix "<改动文件>"
   npm run type:check
   ```
4. 提交变更，遵循 Conventional Commits 规范：
   ```powershell
   git commit -m "feat(module): 添加 XXX 功能"
   ```
   常用 type：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`chore`。
5. 推送分支并发起 Pull Request，描述清楚改动内容、动机与影响范围。
6. 通过 Code Review 与 CI 检查后由维护者合并。

### 提交前检查清单

- [ ] 代码已通过 `npm run type:check`
- [ ] 改动文件已格式化（prettier / eslint / stylelint）
- [ ] 没有保留 `console.log` 等调试代码
- [ ] 已删除未使用的导入与变量
- [ ] 提交信息符合 Conventional Commits

---

## 许可证

本项目基于 **MIT License** 开源，详见 [LICENSE](file:///d:/www/admin-web/web/LICENSE) 文件。

```text
Copyright (c) 2026 五五

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction ...
```

---

## 联系方式

如有问题、建议或合作意向，欢迎通过以下方式联系：

- **Issue 反馈**：在仓库的 Issues 中提交 Bug 报告或功能请求
- **Pull Request**：欢迎贡献代码改进
- **维护者**：五五

> 在提交 Issue 前，建议先查阅 `.qoder/repowiki/zh/content/` 下的项目文档以及 [CODE_WIKI.md](file:///d:/www/admin-web/web/CODE_WIKI.md)。
