# e-sports-go-admin-web

> 电竞陪玩报单系统（EsportsPartner）的管理端前端，基于 Vue 3 + TypeScript + Vite + Arco Design Vue 构建。

[![Vue](https://img.shields.io/badge/Vue-3.5-brightgreen.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-3.2-blue.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178C6.svg)](https://www.typescriptlang.org/)
[![Arco Design](https://img.shields.io/badge/Arco%20Design-2.58-165DFF.svg)](https://arco.design/vue)

---

## 目录

- [项目简介](#项目简介)
- [技术栈](#技术栈)
- [功能特性](#功能特性)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [可用脚本](#可用脚本)
- [项目结构](#项目结构)
- [配置说明](#配置说明)
- [与后端集成](#与后端集成)
- [功能集（源码扩展）](#功能集源码扩展)
- [开发规范](#开发规范)
- [测试](#测试)
- [相关文档](#相关文档)

---

## 项目简介

本仓库是同工作区 `e-sports-go-admin`（Go + Fiber）后端配套的管理端前端，承担以下职责：

- 管理员/用户登录认证、图形与行为验证码、OAuth 单点登录回调；
- 基于后端返回的混合权限树动态注册路由、生成菜单、控制按钮权限；
- 提供系统管理后台（用户、管理员、角色、权限、部门、字典、配置、定时任务、队列任务、日志、附件、插件等）；
- 承载业务功能集：电竞陪玩业务（`src/apps/esports`）、内容管理与示例（`src/apps/cms`、`src/apps/demo`）。

构建产物输出到 `dist/`，由后端通过 `//go:embed web/dist` 打包进 `go-admin` 二进制，因此**前端更新后需要重新构建并重新编译/重启后端**才能生效。

---

## 技术栈

| 分类       | 技术                            | 版本     |
| ---------- | ------------------------------- | -------- |
| 框架       | Vue（Composition API + TSX）    | ^3.5.33  |
| 构建工具   | Vite                            | ^3.2.11  |
| 语言       | TypeScript                      | ^4.9.5   |
| UI 组件库  | @arco-design/web-vue            | ^2.58.0  |
| 路由       | vue-router                      | ^4.6.4   |
| 状态管理   | pinia                           | ^2.3.1   |
| 国际化     | vue-i18n                        | ^9.14.4  |
| HTTP       | axios                           | ^0.24.0  |
| 图表       | echarts / vue-echarts           | ^5.6 / ^6.7 |
| 工具库     | @vueuse/core、lodash、dayjs     | —        |
| 其它       | mitt、nprogress、sortablejs     | —        |

---

## 功能特性

### 认证与权限

- 登录页支持验证码（图片文字、图片点选、极验 GT4），验证码配置由后端下发；
- JWT Token 管理、令牌刷新、修改密码；
- OAuth 授权回调页（`src/views/oauth/callback.vue`）；
- 基于权限树的 RBAC：菜单、路由、按钮三级控制，按钮权限通过 `v-permission` 指令与 `usePermission` 判断。

### 布局与交互

- 默认布局 + 页面级布局，支持侧边菜单/顶部菜单、菜单折叠、面包屑、多标签页（Tab Bar）；
- 明暗主题切换、主题色配置、全局设置抽屉、响应式适配（桌面/移动端）；
- 国际化：中文（zh-CN）与英文（en-US），按模块拆分语言包。

### 系统管理

`src/views/system` 下的模块：用户管理、管理员管理、角色管理、权限管理、部门管理、字典数据、参数配置、定时任务、队列任务、验证码设置、附件管理、登录日志、操作日志、插件管理、轮播图、第三方用户。

### 业务功能集（`src/apps/esports`）

商品、订单、报单、排单、陪玩、钱包、售后、结算、充值活动、会员等级、礼物、考核、报表、页面装修、客服工作台、结单表单、风险客户。

> 「储值卡」已于 2026-10-20 由产品决定移除，对应页面（`views/stored-value`）与接口封装已删除，详见 [CODE_WIKI.md](CODE_WIKI.md) 与工作区根目录《审核报告》附录 B.5。

### 消息与实时通信

- 消息中心：消息列表、消息管理、广播、订阅偏好；
- 基于 SSE 的实时推送（`src/services/sse.service.ts`、`src/hooks/sse-message.ts`），开发代理已针对 SSE 关闭缓冲与超时。

### 工程能力

- 统一请求/响应拦截、错误提示、并发安全的顶部进度条；
- 单元测试（Vitest）；
- ESLint + Prettier + Stylelint + husky + lint-staged + commitlint；
- 生产构建压缩（gzip）、图片压缩、依赖体积可视化、手动分包。

---

## 环境要求

| 项目       | 要求                                                    |
| ---------- | ------------------------------------------------------- |
| Node.js    | >= 14（建议 18 LTS 及以上）                             |
| 包管理器   | pnpm（推荐，仓库含 `pnpm-lock.yaml`）/ npm              |
| 后端服务   | `e-sports-go-admin`，开发环境默认监听 `http://127.0.0.1:9501`    |
| 浏览器     | Chrome / Edge / Firefox / Safari 最新版                 |

---

## 快速开始

### 1. 安装依赖

```powershell
pnpm install
```

### 2. 配置环境变量

`.env.development` 与 `.env.production` 位于项目根目录：

```dotenv
# .env.development
VITE_API_BASE_URL=
```

开发环境留空即可，请求会走 Vite 代理；如需直连其它后端地址，填入完整 API 根地址（如 `http://127.0.0.1:9501`）。

### 3. 启动开发服务器

```powershell
npm run dev
```

开发服务器默认自动打开浏览器（Vite 默认端口 `5173`），并将以下请求代理到 `http://127.0.0.1:9501`：

- `/api` — 普通 REST 接口（超时 5 分钟，支持大文件上传）；
- `/api/v1/admin/sse` — SSE 长连接（禁用缓冲、无超时）。

因此请先启动 `e-sports-go-admin` 后端，否则登录与接口请求会失败。

### 4. 生产构建

```powershell
npm run build
```

产物输出到 `dist/`，随后需要复制到后端 `go-admin/web/dist` 并重新编译/重启服务（见[与后端集成](#与后端集成)）。

> PowerShell 下命令串联请使用 `;`，不要使用 `&&`。

---

## 可用脚本

| 命令                       | 说明                                                    |
| -------------------------- | ------------------------------------------------------- |
| `npm run dev`              | 启动开发服务器（`config/vite.config.dev.ts`）           |
| `npm run build`            | 类型检查（`vue-tsc --noEmit`）+ 生产构建                |
| `npm run preview`          | 构建后本地预览生产产物（`--host`）                      |
| `npm run report`           | 构建并生成依赖体积分析报告（`REPORT=true`）             |
| `npm run report:skip-check`| 跳过类型检查，仅构建并生成分析报告                      |
| `npm run type:check`       | 仅执行类型检查（`--skipLibCheck`）                      |
| `npm run test:unit`        | 运行 Vitest 单元测试                                    |
| `npm run lint-staged`      | 对暂存文件执行 prettier / eslint / stylelint            |
| `npm run prepare`          | 安装 husky Git 钩子                                     |

---

## 项目结构

```text
go-admin-web/
├── config/                      # Vite 构建配置
│   ├── vite.config.base.ts      # 通用配置（别名、Less、SVG）
│   ├── vite.config.dev.ts       # 开发配置（ESLint 插件、API/SSE 代理）
│   ├── vite.config.prod.ts      # 生产配置（压缩、分包、图片压缩、体积分析）
│   └── plugin/                  # Arco 按需引入、gzip、imagemin、visualizer
├── docs/
│   └── source-apps.md           # 前端功能集（源码扩展）接入规范
├── src/
│   ├── api/                     # 接口封装（含拦截器、各业务 API 与单测）
│   ├── apps/                    # 业务功能集：esports / cms / demo
│   ├── assets/                  # 图片、全局样式（Less）
│   ├── components/              # 全局组件（菜单、导航栏、标签页、图表、附件选择器等）
│   ├── config/settings.json     # 应用默认设置（主题、布局、菜单等）
│   ├── directive/               # 自定义指令（v-permission）
│   ├── hooks/                   # 组合式函数（权限、请求、主题、SSE、字典等）
│   ├── layout/                  # 默认布局与页面布局
│   ├── locale/                  # 国际化语言包（zh-CN / en-US）
│   ├── router/                  # 路由、守卫、动态菜单、功能集路由注入
│   ├── services/                # SSE、配置、附件访问等服务
│   ├── store/                   # Pinia 状态管理
│   ├── types/                   # 全局类型与接口类型
│   ├── utils/                   # 鉴权、权限转换、OAuth、工具函数
│   ├── views/                   # 页面：登录、工作台、消息中心、系统管理
│   ├── App.vue
│   └── main.ts                  # 应用入口
├── .env.development
├── .env.production
├── index.html
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 配置说明

### 环境变量

| 变量名              | 说明                                                       |
| ------------------- | ---------------------------------------------------------- |
| `VITE_API_BASE_URL` | axios 基础地址；留空则使用同源 + 开发代理                  |

### 应用设置

`src/config/settings.json` 控制默认主题、菜单模式、布局、标签页等；运行时可在「全局设置」抽屉中修改。

### 构建配置

- 别名：`@` → `src`，`assets` → `src/assets`；
- Less 全局注入 `src/assets/style/breakpoint.less` 中的断点变量；
- 生产环境手动分包：`arco`、`chart`、`vue` 三个 vendor chunk。

### 代码规范配置

| 文件                   | 作用                |
| ---------------------- | ------------------- |
| `.eslintrc.js`         | ESLint 规则         |
| `.prettierrc.js`       | Prettier 格式化规则 |
| `.stylelintrc.js`      | 样式 lint 规则      |
| `commitlint.config.js` | 提交信息规范        |
| `tsconfig.json`        | TypeScript 配置     |
| `vitest.config.ts`     | 单元测试配置        |

---

## 与后端集成

1. 前端统一使用 `/api/v1/...` 接口前缀，登录成功后由请求拦截器附加 `Authorization: Bearer <token>`；
2. 构建产物 `dist/` 需同步到后端 `go-admin/web/dist` 目录；
3. `e-sports-go-admin` 通过 `//go:embed web/dist` 嵌入静态资源，**替换产物后必须重新编译并重启后端**，否则浏览器仍会加载旧代码；
4. 开发阶段推荐直接使用 `npm run dev` + Vite 代理联调，无需重复编译后端。

---

## 功能集（源码扩展）

`src/apps/<code>` 是「前后端一起发布」的源码功能集，与后端 `internal/apps/<code>` 一一对应。约定要点：

```text
src/apps/demo/
├── api.ts
├── views/
│   └── index.vue
└── locale/
    ├── zh-CN.ts
    └── en-US.ts
```

- 页面路径 `src/apps/<code>/views/<page>.vue` 对应后端菜单的 `Component: "<code>/<page>"`；
- 菜单由后端权限树下发，`src/router/source-apps.ts` 只从构建期收录的本地页面中解析组件，不合规的路径/页面不会注册；
- 菜单文案取自语言包 `menu.app.<权限码冒号改点>`，`Icon`、`SortOrder`、`Parent` 由后端控制；
- 新增功能集后需重新构建发布，并运行 `type:check`、`test:unit`、`build` 验证。

完整契约与验证清单见 [docs/source-apps.md](docs/source-apps.md)。

---

## 开发规范

1. 交流与代码注释使用中文，变量/函数/类名使用英文；
2. 终端使用 PowerShell，命令分隔符用 `;`，禁止 `&&`；
3. 修改 `.ts`、`.tsx`、`.js`、`.jsx`、`.vue`、`.less`、`.css` 后立即格式化：

   ```powershell
   # TS / JS
   npx prettier --write "<文件>" ; npx eslint --fix "<文件>"

   # Vue
   npx stylelint --fix "<文件>" ; npx prettier --write "<文件>" ; npx eslint --fix "<文件>"

   # Less / CSS
   npx stylelint --fix "<文件>" ; npx prettier --write "<文件>"
   ```

4. 提交信息遵循 Conventional Commits（`feat`、`fix`、`docs`、`refactor`、`perf`、`test`、`chore` 等），由 commitlint 校验；
5. husky + lint-staged 会在 `git commit` 时自动对暂存文件执行 stylelint / prettier / eslint；
6. 不要保留调试用 `console.*`、未使用的导入与变量。

详细约定见 [.trae/rules/project_rules.md](.trae/rules/project_rules.md) 与 [AGENTS.md](AGENTS.md)。

---

## 测试

```powershell
npm run test:unit
npm run test:unit -- src/router/source-apps.test.ts
```

测试文件位于 `src/**/*.{test,spec}.{ts,tsx}`，使用 Vitest（Node 环境），覆盖接口封装、权限转换、OAuth 流程、路由构造与登录表单等逻辑。

---

## 相关文档

- [CODE_WIKI.md](CODE_WIKI.md) — 架构、路由、菜单、权限、API 层与状态管理详解
- [docs/source-apps.md](docs/source-apps.md) — 功能集接入规范
- [AGENTS.md](AGENTS.md) — 仓库 AI 协作约定
- [.trae/rules/project_rules.md](.trae/rules/project_rules.md) — 项目开发规则

---

## 许可证

本项目采用 MIT License，详见 `package.json` 中的 `license` 字段。
