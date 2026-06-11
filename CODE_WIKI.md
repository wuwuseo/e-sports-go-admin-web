# Code Wiki - Admin Web 前端项目

> 本文档详细描述了本项目的整体架构、主要模块、路由系统、菜单系统、权限控制、API 层、状态管理和业务页面等核心内容。

---

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术栈](#2-技术栈)
- [3. 项目结构](#3-项目结构)
- [4. 入口与启动流程](#4-入口与启动流程)
- [5. 路由系统](#5-路由系统)
  - [5.1 路由配置文件结构](#51-路由配置文件结构)
  - [5.2 基础路由与常量](#52-基础路由与常量)
  - [5.3 业务路由模块](#53-业务路由模块)
  - [5.4 路由守卫](#54-路由守卫)
- [6. 菜单系统](#6-菜单系统)
  - [6.1 菜单组件](#61-菜单组件)
  - [6.2 菜单树生成逻辑](#62-菜单树生成逻辑)
  - [6.3 服务端菜单（动态菜单）](#63-服务端菜单动态菜单)
- [7. 导航栏（Navbar）](#7-导航栏navbar)
- [8. 权限系统](#8-权限系统)
  - [8.1 权限转换](#81-权限转换)
  - [8.2 权限到路由的映射](#82-权限到路由的映射)
  - [8.3 权限 Hook](#83-权限-hook)
  - [8.4 权限指令 v-permission](#84-权限指令-v-permission)
- [9. 状态管理（Pinia）](#9-状态管理pinia)
  - [9.1 User Store（用户状态）](#91-user-store用户状态)
  - [9.2 App Store（应用状态）](#92-app-store应用状态)
  - [9.3 TabBar Store（标签页状态）](#93-tabbar-store标签页状态)
  - [9.4 其他 Store 模块](#94-其他-store-模块)
- [10. API 层与请求拦截](#10-api-层与请求拦截)
  - [10.1 HTTP 请求拦截器](#101-http-请求拦截器)
  - [10.2 HTTP 响应拦截器](#102-http-响应拦截器)
  - [10.3 用户认证 API](#103-用户认证-api)
  - [10.4 其他 API 模块](#104-其他-api-模块)
- [11. 工具函数](#11-工具函数)
  - [11.1 认证工具（auth.ts）](#111-认证工具authts)
  - [11.2 路由监听器（route-listener.ts）](#112-路由监听器route-listenerts)
- [12. 页面（Views）](#12-页面views)
  - [12.1 登录页](#121-登录页)
  - [12.2 仪表板（Dashboard）](#122-仪表板dashboard)
  - [12.3 消息中心](#123-消息中心)
  - [12.4 系统管理页面](#124-系统管理页面)
- [13. 布局系统](#13-布局系统)
- [14. 国际化（i18n）](#14-国际化i18n)
- [15. 构建与环境配置](#15-构建与环境配置)
- [16. 常用命令](#16-常用命令)
- [17. 登录与鉴权完整流程](#17-登录与鉴权完整流程)

---

## 1. 项目概述

本项目是一个基于 **Vue 3** + **Arco Design Pro** 的后台管理系统前端项目。它提供了一整套完整的后台管理界面，包括：

- 用户认证与管理员登录双模式
- 基于角色与权限码的动态菜单与按钮权限
- 多标签页（Tab Bar）导航
- 响应式布局（支持桌面与移动端）
- 消息中心（支持 SSE 推送）
- 完善的系统管理（用户、管理员、角色、权限、字典、附件、定时任务、操作日志、配置、插件等）
- 暗/亮主题切换与国际化（中英文）

核心设计原则：

- **权限驱动**：菜单和按钮均受权限码控制，admin 角色拥有所有权限
- **模块化解耦**：路由、状态、API、视图分别按业务领域拆分
- **服务端优先**：支持从服务端拉取菜单配置（动态菜单），也支持前端静态路由

---

## 2. 技术栈

| 分类 | 技术 | 版本/说明 |
|------|------|-----------|
| 框架 | Vue | 3.x（Composition API） |
| UI 组件库 | @arco-design/web-vue | Arco Design 组件库 |
| 路由 | vue-router | 4.x |
| 状态管理 | pinia | 2.x |
| 国际化 | vue-i18n | 9.x |
| HTTP 客户端 | axios | 0.24.x |
| 工具库 | @vueuse/core | 9.x（响应式工具） |
| 工具库 | lodash | 4.x |
| 消息 | mitt | 3.x（事件总线） |
| 进度条 | nprogress | 0.2.x |
| 构建 | Vite | 3.x |
| 语言 | TypeScript | 4.9.x |
| 代码规范 | ESLint + Prettier + Stylelint | — |
| Git 钩子 | husky + lint-staged | — |

---

## 3. 项目结构

```
d:\www\admin-web\web\
├── config/                     # Vite 构建配置
│   ├── vite.config.base.ts     # 基础配置
│   ├── vite.config.dev.ts      # 开发配置
│   └── vite.config.prod.ts     # 生产配置
├── src/
│   ├── api/                    # API 接口层（按业务拆分）
│   │   ├── interceptor.ts      # Axios 请求/响应拦截器
│   │   ├── user.ts             # 用户与管理员认证 API
│   │   ├── permission.ts       # 权限 API
│   │   ├── role.ts             # 角色 API
│   │   ├── message.ts          # 消息 API
│   │   ├── dashboard.ts        # 仪表板 API
│   │   ├── config.ts           # 系统配置 API
│   │   ├── dict-data.ts        # 字典数据 API
│   │   ├── attachment.ts       # 附件管理 API
│   │   ├── cron-job.ts         # 定时任务 API
│   │   ├── operation-log.ts    # 操作日志 API
│   │   └── plugin.ts           # 插件 API
│   ├── assets/                 # 静态资源与全局样式
│   │   ├── images/             # 图片资源
│   │   └── style/              # Less 样式
│   ├── components/             # 全局通用组件
│   │   ├── menu/               # 侧边栏/顶部菜单
│   │   │   ├── index.vue       # 菜单渲染组件
│   │   │   └── use-menu-tree.ts# 菜单树生成逻辑 Hook
│   │   ├── navbar/             # 顶部导航栏
│   │   ├── tab-bar/            # 多标签页组件
│   │   ├── message-box/        # 消息通知弹窗
│   │   ├── breadcrumb/         # 面包屑
│   │   ├── chart/              # 图表组件
│   │   ├── footer/             # 页脚
│   │   └── global-setting/     # 全局设置抽屉
│   ├── config/
│   │   └── settings.json       # 应用默认设置（主题、菜单、布局等）
│   ├── directive/              # 自定义 Vue 指令
│   │   └── permission/         # v-permission 权限指令
│   ├── hooks/                  # 组合式 Hook
│   │   ├── permission.ts       # 权限检查 Hook
│   │   ├── user.ts             # 用户相关 Hook
│   │   ├── locale.ts           # 语言切换 Hook
│   │   ├── themes.ts           # 主题切换 Hook
│   │   ├── loading.ts          # 加载状态 Hook
│   │   ├── responsive.ts       # 响应式布局 Hook
│   │   ├── request.ts          # 请求相关 Hook
│   │   ├── chart-option.ts     # 图表配置 Hook
│   │   ├── dict.ts             # 字典 Hook
│   │   ├── visible.ts          # 可见性控制 Hook
│   │   └── sse-message.ts      # SSE 消息推送 Hook
│   ├── layout/                 # 布局组件
│   │   ├── default-layout.vue  # 主布局（导航栏+菜单+内容+页脚）
│   │   └── page-layout.vue     # 页面内容包裹布局
│   ├── locale/                 # 国际化资源
│   │   ├── zh-CN/              # 中文
│   │   ├── en-US/              # 英文
│   │   └── index.ts            # i18n 实例创建
│   ├── router/                 # 路由系统
│   │   ├── index.ts            # 路由实例与注册
│   │   ├── constants.ts        # 路由常量（白名单、默认路由等）
│   │   ├── app-menus/          # 前端静态菜单数据
│   │   ├── guard/              # 路由守卫
│   │   │   ├── index.ts        # 守卫注册入口
│   │   │   ├── userLoginInfo.ts# 用户登录信息守卫
│   │   │   └── permission.ts   # 权限守卫
│   │   └── routes/             # 路由配置
│   │       ├── base.ts         # 基础路由（重定向、404）
│   │       ├── types.ts        # 路由类型定义
│   │       └── modules/        # 按业务拆分的路由模块
│   │           ├── dashboard.ts
│   │           ├── message.ts
│   │           └── system.ts
│   ├── services/               # 长连接/特殊服务
│   │   ├── sse.service.ts      # SSE（Server-Sent Events）长连接服务
│   │   └── config.service.ts   # 配置服务
│   ├── store/                  # Pinia 状态管理
│   │   ├── index.ts            # Store 聚合导出
│   │   ├── mixins/             # Store 混入（如 CRUD 操作）
│   │   └── modules/            # 各业务 Store
│   │       ├── user/           # 用户状态（信息、权限、角色）
│   │       ├── app/            # 应用设置状态
│   │       ├── tab-bar/        # 标签页状态
│   │       ├── role/           # 角色管理
│   │       ├── permission/     # 权限管理
│   │       ├── user-management/# 用户管理
│   │       ├── admin-management/# 管理员管理
│   │       ├── message/        # 消息中心
│   │       ├── config/         # 系统配置
│   │       ├── dict-data/      # 字典数据
│   │       ├── attachment/     # 附件管理
│   │       ├── cron-job/       # 定时任务
│   │       └── operation-log/  # 操作日志
│   ├── types/                  # 全局 TypeScript 类型定义
│   │   ├── api.ts              # API 请求/响应类型
│   │   ├── echarts.ts          # 图表类型
│   │   ├── global.ts           # 全局类型
│   │   └── mock.ts             # Mock 数据类型
│   ├── utils/                  # 工具函数
│   │   ├── auth.ts             # Token 与登录状态管理
│   │   ├── permission-transformer.ts # 权限码标准化工具
│   │   ├── permission-to-route.ts # 权限 → 路由 转换工具
│   │   ├── route-listener.ts   # 路由变更事件总线
│   │   ├── event.ts            # 通用事件工具
│   │   ├── env.ts              # 环境检测
│   │   ├── is.ts               # 类型判断
│   │   ├── json.ts             # JSON 处理
│   │   ├── monitor.ts          # 性能监控
│   │   ├── setup-mock.ts       # Mock 数据配置
│   │   └── index.ts            # 通用工具导出
│   ├── views/                  # 页面视图
│   │   ├── login/              # 登录页
│   │   ├── dashboard/          # 仪表板
│   │   │   └── workplace/      # 工作台
│   │   ├── message/            # 消息中心
│   │   ├── system/             # 系统管理（11 个子页面）
│   │   │   ├── user/
│   │   │   ├── admin/
│   │   │   ├── role/
│   │   │   ├── permission/
│   │   │   ├── dict-data/
│   │   │   ├── config/
│   │   │   ├── attachment/
│   │   │   ├── cron-job/
│   │   │   ├── operation-log/
│   │   │   ├── plugin/
│   │   │   └── third-party-user/
│   │   ├── not-found/          # 404
│   │   └── redirect/           # 重定向过渡页
│   ├── App.vue                 # 根组件
│   ├── main.ts                 # 应用入口
│   └── env.d.ts                # Vite 环境变量类型
├── index.html                  # HTML 入口
├── package.json                # 项目依赖
├── tsconfig.json               # TypeScript 配置
├── .env.development            # 开发环境变量
├── .env.production             # 生产环境变量
└── components.d.ts             # 组件类型声明
```

---

## 4. 入口与启动流程

文件：[src/main.ts](file:///d:/www/admin-web/web/src/main.ts)

应用启动时完成以下工作（按顺序）：

1. **创建 Vue 应用**：`createApp(App)`
2. **注册 UI 库**：`app.use(ArcoVue)`、`app.use(ArcoVueIcon)`
3. **注册路由**：`app.use(router)` — 加载所有路由配置并挂载守卫
4. **注册 Pinia**：`app.use(store)` — 初始化所有状态模块
5. **注册 i18n**：`app.use(i18n)` — 注册国际化
6. **注册全局组件**：`app.use(globalComponents)` — 自动注册 `components/` 下的组件
7. **注册自定义指令**：`app.use(directive)` — 例如 `v-permission`
8. **挂载全局拦截器**：执行 `src/api/interceptor.ts`，注册 Axios 请求/响应拦截器
9. **挂载到 DOM**：`app.mount('#app')`

---

## 5. 路由系统

### 5.1 路由配置文件结构

路由入口：[src/router/index.ts](file:///d:/www/admin-web/web/src/router/index.ts)

路由按业务模块拆分在 `src/router/routes/modules/` 下，通过 `import.meta.glob` 自动加载：

- `dashboard.ts` — 仪表板路由
- `message.ts` — 消息中心路由
- `system.ts` — 系统管理路由（包含 11 个子页面）

### 5.2 基础路由与常量

文件：[src/router/constants.ts](file:///d:/www/admin-web/web/src/router/constants.ts)

| 常量 | 值 | 说明 |
|------|----|------|
| `WHITE_LIST` | `[{ name: 'notFound' }, { name: 'login' }]` | 不需要登录的路由白名单 |
| `DEFAULT_ROUTE_NAME` | `'Workplace'` | 登录后的默认页面路由名 |
| `DEFAULT_ROUTE` | `{ title: 'menu.dashboard.workplace', name: 'Workplace', fullPath: '/dashboard/workplace' }` | 默认路由完整配置 |

文件：[src/router/routes/base.ts](file:///d:/www/admin-web/web/src/router/routes/base.ts)

- `DEFAULT_LAYOUT` — 默认布局组件（懒加载）
- `REDIRECT_MAIN` — `/redirect` 路由，用于标签页刷新的过渡
- `NOT_FOUND_ROUTE` — `/:pathMatch(.*)*` 捕获所有未匹配路由，跳转到 404

### 5.3 业务路由模块

路由类型定义：[src/router/routes/types.ts](file:///d:/www/admin-web/web/src/router/routes/types.ts)

每个路由项支持：`path`、`name`、`meta`、`redirect`、`component`、`children` 等。其中 `meta` 是关键：

```typescript
meta: {
  locale: 'menu.dashboard.workplace',   // 菜单名（i18n key）
  requiresAuth: true,                    // 是否需要登录
  roles: ['*'],                          // 允许的角色；'*' 表示所有
  permissionCode: 'dashboard:workplace', // 权限码（字符串或数组）
  hideInMenu: false,                     // 是否在菜单中隐藏
  order: 0,                              // 菜单排序（越小越靠前）
  icon: 'icon-dashboard',                // 菜单图标
}
```

#### 5.3.1 仪表板路由（dashboard.ts）

文件：[src/router/routes/modules/dashboard.ts](file:///d:/www/admin-web/web/src/router/routes/modules/dashboard.ts)

| 路径 | 路由名 | 页面 | 说明 |
|------|--------|------|------|
| `/dashboard` | `dashboard` | 布局容器 | 父级菜单，不渲染页面 |
| `/dashboard/workplace` | `Workplace` | `views/dashboard/workplace/index.vue` | 工作台页面 |

#### 5.3.2 消息中心路由（message.ts）

文件：[src/router/routes/modules/message.ts](file:///d:/www/admin-web/web/src/router/routes/modules/message.ts)

| 路径 | 路由名 | 页面 | 说明 |
|------|--------|------|------|
| `/message` | `Message` | 布局容器 | 父级菜单 |
| `/message/center` | `MessageCenter` | `views/message/index.vue` | 消息中心列表 |
| `/message/manage` | `MessageManage` | `views/message/manage.vue` | 消息管理 |
| `/message/broadcast` | `MessageBroadcast` | `views/message/broadcast.vue` | 广播消息 |
| `/message/preference` | `MessagePreference` | `views/message/preference.vue` | 消息偏好设置（隐藏菜单） |

#### 5.3.3 系统管理路由（system.ts）

文件：[src/router/routes/modules/system.ts](file:///d:/www/admin-web/web/src/router/routes/modules/system.ts)

| 路径 | 路由名 | 页面 | 说明 |
|------|--------|------|------|
| `/system` | `System` | 布局容器 | 父级菜单 |
| `/system/user` | `SystemUser` | `views/system/user/index.vue` | 用户管理 |
| `/system/third-party-user` | `SystemThirdPartyUser` | `views/system/third-party-user/index.vue` | 第三方用户 |
| `/system/role` | `SystemRole` | `views/system/role/index.vue` | 角色管理 |
| `/system/permission` | `SystemPermission` | `views/system/permission/index.vue` | 权限管理 |
| `/system/attachment` | `SystemAttachment` | `views/system/attachment/index.vue` | 附件管理 |
| `/system/cron-job` | `SystemCronJob` | `views/system/cron-job/index.vue` | 定时任务 |
| `/system/operation-log` | `SystemOperationLog` | `views/system/operation-log/index.vue` | 操作日志 |
| `/system/dict-data` | `SystemDictData` | `views/system/dict-data/index.vue` | 字典数据 |
| `/system/admin` | `SystemAdmin` | `views/system/admin/index.vue` | 管理员管理 |
| `/system/config` | `SystemConfig` | `views/system/config/index.vue` | 系统配置 |
| `/system/plugin` | `SystemPlugin` | `views/system/plugin/index.vue` | 插件管理 |

### 5.4 路由守卫

守卫注册入口：[src/router/guard/index.ts](file:///d:/www/admin-web/web/src/router/guard/index.ts)

共设置 3 个守卫：

1. **页面守卫（route change emitter）** — 触发路由变更事件，供菜单高亮使用
2. **用户登录信息守卫（userLoginInfo.ts）** — 检查 Token、加载用户信息与权限
3. **权限守卫（permission.ts）** — 检查目标路由的访问权限

#### 5.4.1 用户登录信息守卫

文件：[src/router/guard/userLoginInfo.ts](file:///d:/www/admin-web/web/src/router/guard/userLoginInfo.ts)

逻辑流程图：

```
进入 beforeEach 守卫
    │
    ├── 已登录 && 目标是 login 页 → 重定向到 /dashboard/workplace
    │
    ├── 已登录 && userStore.role 已存在 → 放行（加载缓存权限）
    │
    ├── 已登录 && userStore.role 为空 → 请求 /auth/user 获取用户信息
    │                                 → 请求 /menu-permissions + /button-permissions
    │                                 → 成功则放行
    │
    └── 未登录 → 清除本地状态并重定向到 login（带 redirect 参数）
```

#### 5.4.2 权限守卫

文件：[src/router/guard/permission.ts](file:///d:/www/admin-web/web/src/router/guard/permission.ts)

逻辑流程图：

```
进入 beforeEach 守卫
    │
    ├── 路由在 WHITE_LIST 中（login / notFound） → 直接放行
    │
    ├── 未登录 → 清除状态，跳转到 login 页
    │
    ├── 已登录 && 权限正在加载 → 等待（最多 3 秒）
    │
    ├── 已登录 && userStore.role === 'admin' → 直接放行（超管）
    │
    └── 已登录 && 普通用户 → 检查三重条件：
            1. roles 是否包含当前用户角色（或 '*'）
            2. permissionCode（单/多个）是否匹配用户菜单权限
            3. 若未配置 permissionCode，则按路由名检查菜单权限
                → 通过 → 放行
                → 不通过 → 跳转到 notFound
```

---

## 6. 菜单系统

### 6.1 菜单组件

文件：[src/components/menu/index.vue](file:///d:/www/admin-web/web/src/components/menu/index.vue)

核心功能：

- 使用 `useMenuTree()` 获取有权限的菜单树
- 递归渲染子菜单（`a-sub-menu` → `a-menu-item`）
- 点击菜单项触发 `router.push({ name })` 导航
- 监听路由变更，自动高亮当前选中菜单并展开父级
- 支持外部链接检测（`regexUrl` 校验）
- 桌面端支持折叠/展开按钮（通过 `appStore.menuCollapse`）

### 6.2 菜单树生成逻辑

文件：[src/components/menu/use-menu-tree.ts](file:///d:/www/admin-web/web/src/components/menu/use-menu-tree.ts)

核心函数 `useMenuTree()` 返回值：

```
menuTree = computed(() => {
  1. 根据 appStore.menuFromServer 选择数据源：
     - true  →  appStore.appAsyncMenus（服务端返回）
     - false →  appClientMenus（前端静态路由）

  2. 按 meta.order 升序排序

  3. 递归遍历路由：
     - 对每个路由判断是否可访问（canAccessMenu）：
        · role === 'admin' → 通过
        · 否则检查 permissionCode / roles / requiresAuth
     - 过滤掉 meta.hideInMenu === true 的子路由
     - 只保留有子节点或自身可访问的节点
})
```

前端静态菜单数据源：[src/router/app-menus/index.ts](file:///d:/www/admin-web/web/src/router/app-menus/index.ts)

它本质是对 `appRoutes` 和 `appExternalRoutes` 的浅拷贝，仅作为菜单渲染的输入。

### 6.3 服务端菜单（动态菜单）

当 `appStore.menuFromServer === true` 时：

1. 应用启动时调用 `appStore.fetchServerMenuConfig()`
2. 通过 `getUserMenuPermissions()` API 从服务端拉取权限列表
3. 调用 `transformToMenuRoutes()` 将权限对象转换为路由结构
4. 转换结果存入 `appStore.serverMenu`，菜单渲染时使用该数据

权限 → 路由 的转换逻辑见 [第 8.2 节](#82-权限到路由的映射)。

---

## 7. 导航栏（Navbar）

文件：[src/components/navbar/index.vue](file:///d:/www/admin-web/web/src/components/navbar/index.vue)

顶部导航栏从左到右包含以下按钮与功能：

| 元素 | 功能 | 相关 Hook / Store |
|------|------|-------------------|
| Logo + 标题 | 品牌展示 | — |
| 移动端菜单按钮 | 切换侧边抽屉菜单 | `inject('toggleDrawerMenu')` |
| 🔍 搜索按钮 | 占位功能（预留） | — |
| 🌐 语言切换 | 中文 / English | `useLocale()` |
| 🌙/☀️ 主题切换 | 明/暗模式切换 | `useDark()` + `appStore.toggleTheme()` |
| 🔔 消息通知 | 弹出消息中心面板，显示未读数量红点 | `useMessageStore()`、`useSseMessage()` |
| ⛶ 全屏按钮 | 浏览器全屏切换 | `useFullscreen()` |
| 👤 用户头像 | 下拉菜单：消息偏好设置 / 退出登录 | `userStore`、`useUser().logout()` |

消息推送机制：`useSseMessage()` Hook 在 NavBar 加载时启动 SSE 长连接，实时接收服务端消息并更新未读计数。

---

## 8. 权限系统

权限系统采用 **权限码（Permission Code）** 机制，支持两种粒度：

- **菜单权限**：控制侧边栏菜单项是否显示
- **按钮权限**：控制页面内按钮是否可点击/可见

权限码格式示例：
- `system:user`（菜单权限）
- `system:user:add`（按钮权限）
- `dashboard:workplace`（页面访问权限）

### 8.1 权限转换

文件：[src/utils/permission-transformer.ts](file:///d:/www/admin-web/web/src/utils/permission-transformer.ts)

`PermissionTransformer` 类负责将服务端返回的各种权限数据格式统一标准化：

| 方法 | 作用 |
|------|------|
| `extractPermissionCodes(raw)` | 提取权限码数组（支持字符串数组、对象数组、嵌套对象） |
| `normalizePermissions(raw)` | 将权限数据标准化为 `{ role_name, domain, object, action, type }` 结构 |
| `expandPermissionCodes(codes)` | 展开权限码别名（如 `user` → `system:user`） |
| `addPermissionCodeVariants(set, code)` | 为同一个权限码生成多种格式变体（如 `system:user`、`system/user`、`systemuser`），增加容错 |

**权限码别名映射表（PERMISSION_CODE_ALIAS_MAP）**：

| 别名 | 展开路径 |
|------|----------|
| `system` | `/system` |
| `dashboard` | `/dashboard` |
| `workplace` | `/dashboard/workplace` |
| `user` | `/system/user` |
| `admin` | `/system/admin` |
| `role` | `/system/role` |
| `permission` | `/system/permission` |
| `attachment` | `/system/attachment` |
| `cronjob` | `/system/cron-job` |
| `operationlog` | `/system/operation-log` |
| `dictdata` | `/system/dict-data` |
| `config` | `/system/config` |
| `plugin` | `/system/plugin` |
| `message` | `/message` |
| `messagecenter` | `/message/center` |
| `messagemanage` | `/message/manage` |
| `messagebroadcast` | `/message/broadcast` |
| `messagepreference` | `/message/preference` |

### 8.2 权限到路由的映射

文件：[src/utils/permission-to-route.ts](file:///d:/www/admin-web/web/src/utils/permission-to-route.ts)

核心函数 `transformPermissionsToRoutes()`：

1. 过滤出 `type === 'menu'` 的权限
2. 按模块（`object` 的第一段如 `system`、`dashboard`）分组
3. 根据 `PARENT_ROUTE_MAP` 生成父路由（如 `/system`、`/dashboard`）
4. 根据 `OBJECT_TO_PATH_MAP` 生成子路由并匹配对应页面组件
5. 应用 `permissionCode`、`roles`、`locale` 等元信息

**OBJECT_TO_PATH_MAP（权限对象 → 路由与组件）**：

| 权限对象 | 路径 | 路由名 | 组件 |
|----------|------|--------|------|
| `system:user` | `/system/user` | `SystemUser` | user/index.vue |
| `system:thirdpartyuser` | `/system/third-party-user` | `SystemThirdPartyUser` | third-party-user/index.vue |
| `system:role` | `/system/role` | `SystemRole` | role/index.vue |
| `system:permission` | `/system/permission` | `SystemPermission` | permission/index.vue |
| `system:attachment` | `/system/attachment` | `SystemAttachment` | attachment/index.vue |
| `system:cronjob` | `/system/cron-job` | `SystemCronJob` | cron-job/index.vue |
| `system:operationlog` | `/system/operation-log` | `SystemOperationLog` | operation-log/index.vue |
| `system:dictdata` | `/system/dict-data` | `SystemDictData` | dict-data/index.vue |
| `system:admin` | `/system/admin` | `SystemAdmin` | admin/index.vue |
| `system:config` | `/system/config` | `SystemConfig` | config/index.vue |
| `system:plugin` | `/system/plugin` | `SystemPlugin` | plugin/index.vue |
| `dashboard:workplace` | `/dashboard/workplace` | `Workplace` | dashboard/workplace/index.vue |

辅助函数：

- `hasPathInPermissions(path, permissions)` — 检查某路径是否在用户权限中（精确匹配 + 前缀匹配）
- `isPathPermitted(path, permissions)` — 对外暴露的路径权限判断函数

### 8.3 权限 Hook

文件：[src/hooks/permission.ts](file:///d:/www/admin-web/web/src/hooks/permission.ts)

`usePermission()` 返回以下方法：

| 方法 | 作用 |
|------|------|
| `accessRouter(route)` | 检查路由 meta.roles 是否包含当前用户角色（或 '*'） |
| `findFirstPermissionRoute(routers, role)` | 查找用户角色能访问的第一个路由 |
| `hasMenuPermission(code)` | 检查单个菜单权限 |
| `hasButtonPermission(code)` | 检查单个按钮权限 |
| `hasAnyPermission(codes[])` | 检查是否拥有任一权限 |
| `hasAllPermissions(codes[])` | 检查是否拥有所有权限 |
| `async refreshPermissions()` | 重新拉取并刷新用户权限 |

> 所有方法内部都先判断 `userStore.role === 'admin'`，admin 拥有全部权限。

### 8.4 权限指令 v-permission

文件：[src/directive/permission/index.ts](file:///d:/www/admin-web/web/src/directive/permission/index.ts)

在模板中直接使用指令控制元素可见/可用性：

```vue
<!-- 单个权限码，无权限隐藏 -->
<a-button v-permission="'system:user:add'">新增用户</a-button>

<!-- 多个权限码（满足任意一个） -->
<a-button v-permission="['system:user:edit', 'system:user:add']">编辑</a-button>

<!-- 无权限时禁用而非隐藏 -->
<a-button v-permission.disable="'system:user:delete'">删除</a-button>

<!-- 完整配置对象 -->
<a-button v-permission="{
  permission: 'system:user:export',
  mode: 'all',
  strategy: 'disable'
}">导出</a-button>
```

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `permission` | `string \| string[]` | 必填 | 权限码 |
| `mode` | `'any' \| 'all'` | `'any'` | 多个权限码时的匹配策略 |
| `strategy` | `'hide' \| 'disable'` | `'hide'` | 无权限时的处理 |

---

## 9. 状态管理（Pinia）

Store 聚合导出：[src/store/index.ts](file:///d:/www/admin-web/web/src/store/index.ts)

### 9.1 User Store（用户状态）

文件：[src/store/modules/user/index.ts](file:///d:/www/admin-web/web/src/store/modules/user/index.ts)

**State 字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 用户名 |
| `avatar` | `string` | 头像 URL |
| `email` | `string` | 邮箱 |
| `phone` | `string` | 手机号 |
| `accountId` | `string` | 用户/管理员 ID |
| `role` | `string` | 当前用户角色（如 `'admin'`、`'user'`） |
| `menuPermissions` | `string[]` | 用户拥有的菜单权限码列表 |
| `buttonPermissions` | `string[]` | 用户拥有的按钮权限码列表 |
| `permissionsLoading` | `boolean` | 权限是否正在加载中 |
| `isAdmin` | `boolean` | 是否管理员登录 |
| `isSuperAdmin` | `boolean` | 是否超级管理员 |

**核心 Getters**：

| Getter | 作用 |
|--------|------|
| `userInfo` | 返回完整用户信息对象 |
| `hasMenuPermission(code)` | 检查菜单权限（admin 直接通过） |
| `hasButtonPermission(code)` | 检查按钮权限（admin 直接通过） |
| `hasAnyPermission(codes[])` | 任一权限匹配 |
| `hasAllPermissions(codes[])` | 所有权限匹配 |

**核心 Actions**：

| Action | 作用 |
|--------|------|
| `setInfo(partial)` | 部分更新用户信息 |
| `resetInfo()` | 清空用户信息 |
| `processUserRole(roles, defaultRole)` | 从服务端返回的 roles 数组中处理当前角色（包含 `admin` 字符串则为 admin） |
| `async info()` | 调用 `/api/v1/admin/auth/user` 获取用户信息 |
| `async loadPermissions()` | 并行调用 `menu-permissions` 和 `button-permissions` API，通过 `PermissionTransformer` 标准化后存入 state |
| `async refreshPermissions()` | 重新加载权限 |
| `clearPermissions()` | 清空权限数据 |
| `async login(form)` | 用户登录（设置 Token + 加载信息 + 加载权限） |
| `async adminLogin(form)` | 管理员登录（使用 `/admin/public/login` 路径） |
| `async logout()` | 调用登出 API + 清空本地 Token + 移除路由监听 + 清空服务端菜单 + 断开 SSE |
| `logoutCallBack()` | 登出时的本地清理工作（无需调用 API） |

### 9.2 App Store（应用状态）

文件：[src/store/modules/app/index.ts](file:///d:/www/admin-web/web/src/store/modules/app/index.ts)

管理应用的全局设置（菜单模式、主题、布局、设备类型等）。

核心字段（默认值读取自 `src/config/settings.json`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `theme` | `'light' \| 'dark'` | 主题 |
| `device` | `'desktop' \| 'mobile'` | 设备类型 |
| `menu` | `boolean` | 是否显示侧边菜单 |
| `topMenu` | `boolean` | 是否使用顶部菜单模式 |
| `hideMenu` | `boolean` | 是否隐藏菜单（移动端） |
| `menuCollapse` | `boolean` | 菜单是否折叠 |
| `menuWidth` | `number` | 菜单宽度（px） |
| `navbar` | `boolean` | 是否显示导航栏 |
| `footer` | `boolean` | 是否显示页脚 |
| `tabBar` | `boolean` | 是否启用多标签页 |
| `menuFromServer` | `boolean` | 是否从服务端加载菜单 |
| `serverMenu` | `RouteRecordNormalized[]` | 服务端菜单数据缓存 |

核心 Actions：

| Action | 作用 |
|--------|------|
| `updateSettings(partial)` | 部分更新配置 |
| `toggleTheme(dark)` | 切换主题（同时设置 body 的 `arco-theme` 属性） |
| `toggleDevice(device)` | 切换设备标识 |
| `toggleMenu(value)` | 切换菜单显示 |
| `async fetchServerMenuConfig()` | 从服务端拉取菜单权限并转换为路由 |
| `clearServerMenu()` | 清空服务端菜单缓存 |

### 9.3 TabBar Store（标签页状态）

文件：[src/store/modules/tab-bar/index.ts](file:///d:/www/admin-web/web/src/store/modules/tab-bar/index.ts)

管理浏览器顶部的多标签页（类似浏览器标签）。

| State 字段 | 类型 | 说明 |
|------------|------|------|
| `cacheTabList` | `Set<string>` | 需要缓存的路由名集合（keep-alive） |
| `tagList` | `TagProps[]` | 当前打开的标签页数组（每项含 title、name、fullPath、query） |

核心 Actions：

| Action | 作用 |
|--------|------|
| `updateTabList(route)` | 打开新标签页（根据路由信息自动生成） |
| `deleteTag(idx, tag)` | 关闭指定标签页（同时移除 keep-alive 缓存） |
| `addCache(name)` / `deleteCache(tag)` | 单独操作缓存集合 |
| `freshTabList(tags)` | 批量更新标签页 |
| `resetTabList()` | 重置为默认状态（仅保留 Workplace） |

**注意**：`REDIRECT_ROUTE_NAME`（即 `Redirect` 路由）不会被加入标签页列表（黑名单机制）。

### 9.4 其他 Store 模块

| Store | 文件 | 职责 |
|-------|------|------|
| `useRoleStore` | `modules/role/index.ts` | 角色 CRUD、角色-权限分配 |
| `usePermissionStore` | `modules/permission/index.ts` | 权限 CRUD、权限树管理 |
| `useUserManagementStore` | `modules/user-management/index.ts` | 用户列表、用户搜索、用户状态管理 |
| `useAdminManagementStore` | `modules/admin-management/index.ts` | 管理员列表、增删改、状态切换 |
| `useMessageStore` | `modules/message/index.ts` | 消息列表、已读/未读状态、未读总数统计 |
| `useConfigStore` | `modules/config/index.ts` | 系统配置项管理 |
| `useDictDataStore` | `modules/dict-data/index.ts` | 字典数据 CRUD |
| `useAttachmentStore` | `modules/attachment/index.ts` | 附件上传/下载/分组管理 |
| `useCronJobStore` | `modules/cron-job/index.ts` | 定时任务列表、启停、日志查看 |
| `useOperationLogStore` | `modules/operation-log/index.ts` | 操作日志查询与详情 |

各业务 Store 大量复用 `store/mixins/crud.ts` 中定义的通用 CRUD 操作（分页列表、详情、创建、更新、删除、批量删除等）。

---

## 10. API 层与请求拦截

### 10.1 HTTP 请求拦截器

文件：[src/api/interceptor.ts](file:///d:/www/admin-web/web/src/api/interceptor.ts)

请求拦截逻辑：

1. **顶部进度条启动**：非 SSE 请求调用 `NProgress.start()`
2. **Token 注入**：从 `getToken()` 读取 Token，写入请求头 `Authorization: Bearer <token>`
3. **SSE 请求排除**：URL 包含 `/admin/sse/connect` 或 `/admin/auth/sse/ticket` 的请求不触发进度条（避免长连接卡死进度条）

全局超时设置：`axios.defaults.timeout = 300_000`（5 分钟）

### 10.2 HTTP 响应拦截器

成功响应（HTTP 2xx）：

1. 结束顶部进度条
2. 检查业务状态码 `res.code`：
   - `1` 或 `2` → 视为成功，返回完整响应
   - 其他值 → 使用 Arco 的 `Message.error()` 提示，并 reject Promise

失败响应（非 2xx）：

1. 结束顶部进度条
2. **401 未授权**：弹出确认对话框，点击后自动登出并刷新页面（排除 `/auth/user` 接口，避免循环）
3. 其他错误：显示错误消息并 reject

业务成功码约定：`code === 1` 或 `code === 2` 表示成功（服务端可能使用两种不同约定，前端统一兼容）。

### 10.3 用户认证 API

文件：[src/api/user.ts](file:///d:/www/admin-web/web/src/api/user.ts)

**用户端 API（普通用户）**：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/public/login` | 登录 |
| GET | `/api/v1/admin/auth/user` | 获取当前用户信息 |
| PUT | `/api/v1/admin/auth/user` | 更新当前用户信息 |
| PUT | `/api/v1/admin/auth/password` | 修改密码 |
| GET | `/api/v1/admin/auth/user/permissions` | 获取所有权限 |
| GET | `/api/v1/admin/auth/user/menu-permissions` | 获取菜单权限 |
| GET | `/api/v1/admin/auth/user/button-permissions` | 获取按钮权限 |
| POST | `/api/v1/admin/auth/logout` | 登出 |
| GET | `/api/v1/public/public-key` | 获取加密公钥 |

**管理端 API（管理员）**：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/admin/public/login` | 管理员登录 |
| GET | `/api/v1/admin/auth/user` | 获取当前管理员信息 |
| PUT | `/api/v1/admin/auth/user` | 更新当前管理员信息 |
| PUT | `/api/v1/admin/auth/password` | 修改管理员密码 |
| POST | `/api/v1/admin/auth/logout` | 管理员登出 |

**用户管理 API（管理员操作）**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/auth/users` | 用户列表（分页 + 搜索 + 排序） |
| GET | `/api/v1/admin/auth/users/:id` | 用户详情 |
| POST | `/api/v1/admin/auth/users` | 创建用户 |
| PUT | `/api/v1/admin/auth/users/:id` | 更新用户 |
| DELETE | `/api/v1/admin/auth/users/:id` | 删除用户 |
| POST | `/api/v1/admin/auth/users/export` | 导出用户列表 |
| PUT | `/api/v1/admin/auth/users/:id/activate` | 激活用户 |
| PUT | `/api/v1/admin/auth/users/:id/deactivate` | 停用用户 |
| POST | `/api/v1/admin/auth/users/:id/blacklist` | 加入黑名单 |
| DELETE | `/api/v1/admin/auth/users/:id/blacklist` | 移出黑名单 |
| GET | `/api/v1/admin/auth/blacklist` | 黑名单列表 |
| GET | `/api/v1/admin/auth/users/:id/roles` | 查看用户角色 |
| PUT | `/api/v1/admin/auth/users/:id/roles` | 分配用户角色 |
| GET | `/api/v1/admin/auth/users/:id/third-party` | 第三方账号列表 |

**管理员管理 API**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/auth/admins` | 管理员列表 |
| GET | `/api/v1/admin/auth/admins/:id` | 管理员详情 |
| POST | `/api/v1/admin/auth/admins` | 创建管理员 |
| PUT | `/api/v1/admin/auth/admins/:id` | 更新管理员 |
| DELETE | `/api/v1/admin/auth/admins/:id` | 删除管理员 |
| PUT | `/api/v1/admin/auth/admins/:id/activate` | 激活 |
| PUT | `/api/v1/admin/auth/admins/:id/deactivate` | 停用 |
| GET | `/api/v1/admin/auth/admins/:id/roles` | 查看角色 |
| PUT | `/api/v1/admin/auth/admins/:id/roles` | 分配角色 |

**第三方用户管理 API**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/auth/third-party-users` | 列表 |
| DELETE | `/api/v1/admin/auth/third-party-users/:id` | 解绑 |

### 10.4 其他 API 模块

| 模块 | 文件 | 主要接口 |
|------|------|----------|
| 仪表板 | `api/dashboard.ts` | 工作台数据、统计图表数据 |
| 角色 | `api/role.ts` | 角色 CRUD、角色-权限分配 |
| 权限 | `api/permission.ts` | 权限列表、权限树、权限 CRUD |
| 消息 | `api/message.ts` | 消息列表、已读/未读、标记已读、广播 |
| 系统配置 | `api/config.ts` | 配置项列表、增删改查 |
| 字典数据 | `api/dict-data.ts` | 字典 CRUD、字典项管理 |
| 附件管理 | `api/attachment.ts` | 文件上传/下载/删除、分组管理 |
| 定时任务 | `api/cron-job.ts` | 任务 CRUD、启停、手动执行、日志查询 |
| 操作日志 | `api/operation-log.ts` | 日志列表、详情、按模块筛选 |
| 插件 | `api/plugin.ts` | 插件列表、安装/卸载/启用/禁用 |

所有 API 模块遵循统一的响应格式：

```typescript
interface HttpResponse<T> {
  status: number;    // HTTP 状态
  message: string;   // 消息
  code: number;      // 业务状态码（1/2 = 成功）
  data: T;           // 业务数据
}
```

分页响应格式（约定）：

```typescript
interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
```

---

## 11. 工具函数

### 11.1 认证工具（auth.ts）

文件：[src/utils/auth.ts](file:///d:/www/admin-web/web/src/utils/auth.ts)

负责 **Token 存储与校验** 与 **登录模式标识**：

| 函数 | 作用 |
|------|------|
| `getToken()` | 从 localStorage 读取 `token` |
| `setToken(token)` | 写入 `token` 到 localStorage |
| `clearToken()` | 清除 `token` |
| `getRefreshToken()` / `setRefreshToken()` / `clearRefreshToken()` | 刷新 Token 的读写 |
| `isAdminLogin()` | 读取 `is_admin_login` 标志，判断当前是否管理员模式 |
| `setAdminLogin(bool)` | 写入/清除管理员登录标志 |
| `isLogin()` | **核心**：先尝试 JWT exp 校验，若 Token 非 JWT 格式则回退到存在性检查，返回布尔值 |

**Token 校验细节**：`isTokenValid()` 会解析 JWT payload 中的 `exp` 字段与当前时间比较，确保 Token 未过期。若解析失败（如纯随机字符串 token）则降级为"只要 token 存在即视为登录"的兼容模式。

### 11.2 路由监听器（route-listener.ts）

文件：[src/utils/route-listener.ts](file:///d:/www/admin-web/web/src/utils/route-listener.ts)

基于 **mitt** 事件总线实现路由变更广播：

- `setRouteEmitter(route)` — 在路由守卫中调用，发出 `route-change` 事件
- `listenerRouteChange(callback, immediate?)` — 在组件中订阅路由变更，用于菜单高亮、面包屑刷新等
- `removeRouteListener()` — 登出时清理事件总线

---

## 12. 页面（Views）

### 12.1 登录页

路径：[src/views/login/index.vue](file:///d:/www/admin-web/web/src/views/login/index.vue)

组件：
- `components/login-form.vue` — 登录表单（用户名/密码，支持记住我）
- `components/banner.vue` — 左侧品牌宣传横幅

功能：
- 提交表单 → `userStore.login(form)` 或 `userStore.adminLogin(form)`
- 成功后根据 `redirect` query 参数或默认 `/dashboard/workplace` 跳转
- 支持获取公钥加密密码（若后端启用 RSA 加密）

### 12.2 仪表板（Dashboard）

路径：[src/views/dashboard/workplace/index.vue](file:///d:/www/admin-web/web/src/views/dashboard/workplace/index.vue)

包含子组件：
- `components/banner.vue` — 欢迎横幅
- `components/carousel.vue` — 轮播图
- `components/data-panel.vue` — 数据统计面板（卡片式）
- `components/categories-percent.vue` — 分类占比图表
- `components/content-chart.vue` — 内容趋势图表
- `components/popular-content.vue` — 热门内容列表
- `components/recently-visited.vue` — 最近访问记录
- `components/announcement.vue` — 公告/通知
- `components/quick-operation.vue` — 快捷操作入口
- `components/docs.vue` — 帮助文档链接

该页面主要展示运营数据与快捷入口。

### 12.3 消息中心

路径及文件：[src/views/message/](file:///d:/www/admin-web/web/src/views/message/)

| 页面 | 文件 | 功能 |
|------|------|------|
| 消息中心 | `index.vue` | 个人消息列表（通知/私信/待办），支持已读/全部筛选 |
| 消息管理 | `manage.vue` | 管理员视角管理消息（CRUD） |
| 广播消息 | `broadcast.vue` | 发布系统广播消息 |
| 消息偏好 | `preference.vue` | 配置消息推送渠道（站内信/邮件/短信等） |

**消息推送机制**：Nav 中通过 `useSseMessage()` Hook 启动 SSE 长连接，服务端 `sse.service.ts` 负责连接管理与消息分发。到达新消息时更新 `useMessageStore()` 的未读数，驱动 NavBar 红点更新。

### 12.4 系统管理页面

`src/views/system/` 下共 **11 个页面**，每个页面都是一个独立的业务管理单元。通用结构通常为：**顶部工具栏（搜索/筛选/新增按钮）+ 数据表格（分页）+ 抽屉/弹窗表单 + 详情页**。

#### 12.4.1 用户管理（user）

文件：[src/views/system/user/index.vue](file:///d:/www/admin-web/web/src/views/system/user/index.vue)
表单：`components/UserForm.vue`
角色分配：`components/RoleAssign.vue`

**功能与按钮**：

| 按钮/功能 | 说明 | 建议权限码 |
|----------|------|------------|
| 搜索栏 | 按用户名、邮箱、状态、注册时间范围筛选 | — |
| 刷新 | 重新加载列表 | — |
| 新增用户 | 弹出表单，填写基本信息并分配角色 | `system:user:add` |
| 编辑 | 修改用户信息 | `system:user:edit` |
| 启用/停用 | 切换用户 active 状态 | `system:user:toggle` |
| 加入黑名单 | 将用户加入黑名单（禁止登录） | `system:user:blacklist` |
| 移出黑名单 | 解除黑名单限制 | `system:user:unblacklist` |
| 分配角色 | 为用户分配角色集合 | `system:user:assign-role` |
| 删除 | 软删除/硬删除用户 | `system:user:delete` |
| 导出 | 导出用户列表为 Excel | `system:user:export` |

#### 12.4.2 管理员管理（admin）

文件：[src/views/system/admin/index.vue](file:///d:/www/admin-web/web/src/views/system/admin/index.vue)
表单：`components/AdminForm.vue`
角色分配：`components/RoleAssign.vue`

**功能与按钮**：

| 按钮/功能 | 说明 | 建议权限码 |
|----------|------|------------|
| 搜索栏 | 按用户名、状态筛选 | — |
| 新增管理员 | 创建管理员账号 | `system:admin:add` |
| 编辑 | 修改管理员信息 | `system:admin:edit` |
| 启用/停用 | 切换管理员状态 | `system:admin:toggle` |
| 分配角色 | 为管理员分配角色 | `system:admin:assign-role` |
| 重置密码 | 生成新密码并下发 | `system:admin:reset-password` |
| 删除 | 删除管理员 | `system:admin:delete` |

> 注意：超级管理员（`isSuperAdmin === true`）不允许被停用或删除。

#### 12.4.3 角色管理（role）

文件：[src/views/system/role/index.vue](file:///d:/www/admin-web/web/src/views/system/role/index.vue)
表单：`components/RoleForm.vue`
权限分配：`components/PermissionAssign.vue`

**功能与按钮**：

| 按钮/功能 | 说明 | 建议权限码 |
|----------|------|------------|
| 搜索栏 | 按角色名、编码筛选 | — |
| 新增角色 | 创建新角色 | `system:role:add` |
| 编辑 | 修改角色信息 | `system:role:edit` |
| 分配权限 | 树状结构勾选权限，保存到角色 | `system:role:assign-permission` |
| 删除 | 删除角色（需确认未被使用） | `system:role:delete` |

#### 12.4.4 权限管理（permission）

文件：[src/views/system/permission/index.vue](file:///d:/www/admin-web/web/src/views/system/permission/index.vue)
表单：`components/PermissionForm.vue`

**功能与按钮**：

| 按钮/功能 | 说明 | 建议权限码 |
|----------|------|------------|
| 权限树 | 左侧树状结构展示所有权限（菜单/按钮/API） | — |
| 新增权限 | 创建子权限节点 | `system:permission:add` |
| 编辑 | 修改权限码、描述、类型 | `system:permission:edit` |
| 删除 | 删除权限节点（需级联确认） | `system:permission:delete` |
| 刷新权限缓存 | 通知所有在线用户刷新本地权限缓存 | `system:permission:refresh` |

权限类型三选一：`menu`（菜单）/ `button`（按钮）/ `api`（接口）。

#### 12.4.5 字典数据（dict-data）

文件：[src/views/system/dict-data/index.vue](file:///d:/www/admin-web/web/src/views/system/dict-data/index.vue)
表单：`components/DictDataForm.vue`

**功能**：
- 左侧字典类型列表（如 "性别"、"状态"、"优先级"）
- 右侧字典项管理（新增/编辑/删除字典项及对应 label/value/sort）
- 支持按字典类型快速筛选

#### 12.4.6 系统配置（config）

文件：[src/views/system/config/index.vue](file:///d:/www/admin-web/web/src/views/system/config/index.vue)
表单：`components/ConfigForm.vue`

**功能**：
- 配置项列表（key-value 结构）
- 支持按分类筛选（系统配置、安全配置、邮件配置、存储配置等）
- 新增/编辑配置项（key 唯一）
- 批量导入/导出配置

#### 12.4.7 附件管理（attachment）

文件：[src/views/system/attachment/index.vue](file:///d:/www/admin-web/web/src/views/system/attachment/index.vue)
组件：`components/FileUpload.vue`、`components/GroupManager.vue`、`components/AttachmentPreview.vue`

**功能**：
- 文件列表：按分组/类型/时间筛选，展示文件大小、MIME、引用次数
- 文件上传：拖拽上传、分片上传、大文件支持
- 文件预览：图片/PDF/视频在线预览
- 分组管理：创建/重命名/删除分组
- 文件下载/删除/移动到分组

#### 12.4.8 定时任务（cron-job）

文件：[src/views/system/cron-job/index.vue](file:///d:/www/admin-web/web/src/views/system/cron-job/index.vue)
组件：`components/CronJobForm.vue`、`components/LogViewer.vue`

**功能**：
- 任务列表：任务名、Cron 表达式、状态（运行/暂停）、最近一次运行时间、下次运行时间
- 新增/编辑任务：配置任务类、Cron 表达式、参数
- 启动/暂停任务：切换任务调度状态
- 手动执行：立即触发一次任务
- 查看日志：显示任务执行历史日志（开始/结束/耗时/输出）

#### 12.4.9 操作日志（operation-log）

文件：[src/views/system/operation-log/index.vue](file:///d:/www/admin-web/web/src/views/system/operation-log/index.vue)
组件：`components/LogDetail.vue`

**功能**：
- 日志列表：操作人、操作类型、模块、IP、时间、结果
- 按时间范围、模块、操作类型筛选
- 查看详情：请求参数、响应结果、异常堆栈（失败时）
- 导出日志

#### 12.4.10 插件管理（plugin）

文件：[src/views/system/plugin/index.vue](file:///d:/www/admin-web/web/src/views/system/plugin/index.vue)
组件：`components/PluginInstallModal.vue`、`components/PluginDetailDrawer.vue`

**功能**：
- 插件列表：名称、版本、作者、状态（已安装/未安装/已启用/已禁用）
- 安装插件：上传插件包或从市场安装
- 启用/禁用：切换插件运行状态
- 卸载插件：清理插件数据
- 查看详情：插件描述、依赖、配置项

#### 12.4.11 第三方用户（third-party-user）

文件：[src/views/system/third-party-user/index.vue](file:///d:/www/admin-web/web/src/views/system/third-party-user/index.vue)

**功能**：
- 列出所有绑定过的第三方账号（OAuth 来源：如 GitHub/Google/微信等）
- 显示与本地账号的关联关系
- 解绑第三方账号

---

## 13. 布局系统

### 13.1 默认布局（Default Layout）

文件：[src/layout/default-layout.vue](file:///d:/www/admin-web/web/src/layout/default-layout.vue)

布局结构（从上到下、从左到右）：

```
┌──────────────────────────────────────┐
│         NavBar（顶部导航栏）           │
├────────┬─────────────────────────────┤
│ 侧菜单  │  TabBar（多标签页，可选）    │
│ (Sidebar)├─────────────────────────────┤
│         │  PageLayout（页面内容容器）   │
│         ├─────────────────────────────┤
│         │  Footer（页脚，可选）          │
└─────────┴─────────────────────────────┘
```

**关键响应式逻辑**：
- 桌面端：左侧固定菜单，可折叠（宽度由 `appStore.menuWidth` 控制）
- 移动端：默认隐藏菜单，通过 NavBar 中的 `toggleDrawerMenu` 打开抽屉式菜单
- 通过 `@vueuse/core` 的响应式工具检测设备尺寸变化，自动切换 `appStore.device`

**关键样式变量**（Less）：
- `@nav-size-height: 60px` — 顶部导航高度
- 菜单折叠状态：`menuCollapse === true` 时宽度 `48px`，否则 `menuWidth`（默认 220px）

### 13.2 页面布局（Page Layout）

文件：[src/layout/page-layout.vue](file:///d:/www/admin-web/web/src/layout/page-layout.vue)

包裹路由出口（`<router-view>`），配合 `<keep-alive>` 实现标签页缓存。

核心逻辑：
- 使用 `transition` 包裹路由切换动画
- 根据 `tabBarStore.cacheTabList` 决定哪些路由被 keep-alive 缓存
- 支持页面刷新（redirect 到 `/redirect/:path` 再跳转回来，清空缓存）

---

## 14. 国际化（i18n）

入口：[src/locale/index.ts](file:///d:/www/admin-web/web/src/locale/index.ts)

支持语言：
- **简体中文**（`zh-CN`）— 资源在 `locale/zh-CN/settings.ts`
- **English**（`en-US`）— 资源在 `locale/en-US/settings.ts`

语言切换入口：NavBar 中的「🌐」下拉按钮 → `useLocale().changeLocale(locale)`

**使用方式**：

```vue
<!-- 模板中 -->
<a-button>{{ $t('menu.dashboard.workplace') }}</a-button>

<!-- 组合式 API 中 -->
<script setup>
  import { useI18n } from 'vue-i18n';
  const { t } = useI18n();
  const title = t('menu.dashboard');
</script>
```

**常用翻译 key 结构**：

| 前缀 | 用途 | 示例 |
|------|------|------|
| `menu.*` | 菜单项 | `menu.dashboard.workplace` |
| `settings.*` | 设置界面 | `settings.navbar.theme.toDark` |
| `messageBox.*` | 消息中心 | `messageBox.logout` |
| `login.*` | 登录页 | `login.form.userName` |

---

## 15. 构建与环境配置

### 15.1 环境变量

`.env.development`（开发）与 `.env.production`（生产）中可配置：

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE_URL` | API 基础 URL（如 `http://localhost:3000`） |
| `VITE_APP_TITLE` | 页面标题（可选） |

在代码中通过 `import.meta.env.VITE_API_BASE_URL` 访问。

### 15.2 Vite 配置

- `config/vite.config.base.ts` — 基础配置（别名、插件、TSX）
- `config/vite.config.dev.ts` — 开发配置（代理、HMR、sourcemap）
- `config/vite.config.prod.ts` — 生产配置（压缩、分包、gzip、Bundle 可视化）

插件：
- `@vitejs/plugin-vue` — Vue SFC 支持
- `@vitejs/plugin-vue-jsx` — JSX/TSX 支持
- `unplugin-vue-components` — 自动按需引入 Arco 组件
- `vite-plugin-compression` — gzip 压缩
- `vite-plugin-eslint` — 开发时 ESLint 检查
- `rollup-plugin-visualizer` — 生产包大小分析

### 15.3 代码规范

- **ESLint**：`eslint-config-airbnb-base` + TypeScript 插件 + Vue 3 插件
- **Prettier**：统一代码格式，保存时自动格式化
- **Stylelint**：Less/CSS 规范检查
- **Husky + lint-staged**：Git commit 前自动对暂存文件执行 lint/format
- **Commitlint**：遵循 Conventional Commits 规范（如 `feat:`、`fix:`、`docs:`）

---

## 16. 常用命令

```bash
# 安装依赖（推荐 pnpm，也支持 npm/yarn）
pnpm install

# 启动开发服务器
npm run dev

# 生产构建（含 TypeScript 检查）
npm run build

# 生产构建 + 生成 Bundle 分析报告（report.html）
npm run report

# 本地预览生产构建
npm run preview

# 仅运行 TypeScript 类型检查
npm run type:check
```

---

## 17. 登录与鉴权完整流程

以下是一个用户从打开页面到访问受保护页面的完整数据流：

```
用户打开首页 /
  │
  ├── router/index.ts 路由初始化
  │     → 匹配根路由 /，redirect → /login
  │
  ├── 守卫 userLoginInfo.ts 触发
  │     → isLogin() 检查 localStorage token → false
  │     → 停留在 /login
  │
  ├── 用户填写用户名 + 密码 → 提交登录表单
  │     │
  │     ├── userStore.login(form) 被调用
  │     │     → POST /api/v1/public/login
  │     │     → 响应 data.data 中拿到 access_token + refresh_token
  │     │     → setToken() / setRefreshToken() 存入 localStorage
  │     │     → setAdminLogin(false) 标记为普通用户模式
  │     │     → 调用 info() 拉取用户信息（name, email, roles）
  │     │     → 调用 loadPermissions() 拉取 menu + button 权限
  │     │           ├── GET /auth/user/menu-permissions → PermissionTransformer → menuPermissions
  │     │           └── GET /auth/user/button-permissions → PermissionTransformer → buttonPermissions
  │     │
  │     └── 成功 → router.push('/dashboard/workplace')
  │
  ├── 跳转 /dashboard/workplace
  │
  ├── 守卫 permission.ts 触发
  │     → isLogin() → true
  │     → userStore.role !== 'admin'，检查路由 meta.roles + permissionCode
  │     → /dashboard/workplace 的 permissionCode 命中 menuPermissions
  │     → 放行
  │
  ├── Layout 渲染
  │     → NavBar 渲染（欢迎信息 + 用户头像 + 登出按钮）
  │     → Menu 组件通过 useMenuTree() 生成有权限的菜单树
  │     → TabBar 记录当前打开的标签
  │     → PageLayout 包裹 <router-view> 渲染 workplace 页面
  │
  └── 首次访问系统管理页面时（如 /system/user）
        → 守卫再次检查 permissionCode 是否包含 'system:user'
        → 无权限 → 跳转到 NOT_FOUND 或默认页面
        → 有权限 → 渲染用户管理页面
        → 页面内的按钮（如"新增用户"）通过 v-permission 指令检查
           buttonPermissions

```

### 17.1 Token 过期与刷新流程

```
Token 即将过期或已过期（HTTP 401）
  │
  ├── Axios 响应拦截器识别 401
  │     → 排除 /auth/user 接口（避免循环）
  │     → 显示确认对话框："你已被登出，是否重新登录？"
  │
  ├── 用户确认 → userStore.logout()
  │     → 清除 localStorage token
  │     → userStore.resetInfo() / clearPermissions()
  │     → 移除路由监听器，清空服务端菜单缓存
  │     → 断开 SSE 长连接（如果存在）
  │     → window.location.reload() 强制刷新
  │
  └── 用户取消 → 留在当前页面（但后续 API 请求仍会失败）
```

### 17.2 权限刷新流程（热更新）

```
管理员修改了当前用户的角色/权限
  │
  ├── 触发方式
  │     ├── 用户主动点击"刷新权限"按钮 → usePermission().refreshPermissions()
  │     └── SSE 推送"权限已变更"事件 → 自动触发 loadPermissions()
  │
  ├── userStore.loadPermissions()
  │     → 并行拉取 menu-permissions 和 button-permissions
  │     → 经 PermissionTransformer 标准化后更新 state
  │
  └── 响应式更新
        → Pinia 响应式自动触发 useMenuTree() 重新计算
        → 侧边栏菜单即时刷新（隐藏/新增菜单项）
        → 页面内按钮的 v-permission 指令自动重新评估
        → 无需刷新页面
```

---

## 18. 核心模块依赖关系图

```
┌────────────────────────────────────────────────────────────┐
│                          Views（页面）                      │
│  dashboard/workplace  message/*  system/*  login  not-found│
└────────────┬────────────────────────────────────┬──────────┘
             │                                    │
             ▼                                    ▼
┌──────────────────────┐               ┌──────────────────────┐
│     Pinia Store      │               │    Vue Router        │
│  user  app  tab-bar  │               │ routes + guards      │
│  role  permission    │◄──────────────┤ userLoginInfo.ts      │
│  message  config ... │               │ permission.ts        │
└───────┬──────────────┘               └──────────┬───────────┘
        │                                         │
        │                                         ▼
        │                               ┌──────────────────────┐
        │                               │   app-menus +        │
        │                               │   route-listener     │
        │                               └──────────┬───────────┘
        │                                          │
        ▼                                          ▼
┌──────────────────────┐               ┌──────────────────────┐
│      Hooks           │               │      Components      │
│  permission.ts       │               │  menu + navbar       │
│  user.ts             │               │  tab-bar + messageBox│
│  sse-message.ts      │               │  breadcrumb ...      │
│  dict.ts / loading.ts│               └──────────┬───────────┘
└───────┬──────────────┘                          │
        │                                          │
        ▼                                          ▼
┌─────────────────────────────────────────────────────────────┐
│                         Utils                              │
│  auth.ts (Token)  permission-transformer.ts               │
│  permission-to-route.ts  route-listener.ts  event.ts      │
└───────┬─────────────────────────────────────────────┬──────┘
        │                                              │
        ▼                                              ▼
┌──────────────────────┐                    ┌────────────────────┐
│         API          │                    │  Axios Interceptor │
│  user.ts  role.ts   │◄──────────────────►│  request + response │
│  permission.ts ...  │                    │  NProgress + Token  │
└──────────────────────┘                    └────────────────────┘
```

### 18.1 关键模块职责总结

| 模块 | 主要职责 | 不应该做的事 |
|------|----------|--------------|
| **Views** | 页面渲染、表单收集、触发 action、展示数据 | 直接写 axios 调用、硬编码权限码逻辑、操作 localStorage |
| **Store** | 集中管理状态、定义业务 actions、提供 getters | 直接操作 DOM、管理 UI 样式细节 |
| **Hooks** | 组合式函数，封装可复用逻辑（权限检查、SSE、字典等） | 不应该直接访问原生 API |
| **API** | 仅定义接口请求函数、类型定义 | 不应该写业务判断、不操作全局状态 |
| **Router** | 路由声明、守卫逻辑（鉴权、重定向） | 不应该直接获取和处理业务数据 |
| **Utils** | 纯函数/工具类（Token 读写、权限转换、事件总线等） | 不应依赖 Vue 组件或 Pinia store |
| **Components** | 通用 UI 组件（菜单、导航栏、标签页等） | 不应包含业务 API 逻辑，通过 props 传参 |

---

## 19. 快速参考

### 19.1 新增一个业务页面的步骤

以新增"部门管理（department）"为例：

1. **路由配置** — `src/router/routes/modules/system.ts` 中添加：
   ```typescript
   {
     path: 'department',
     name: 'SystemDepartment',
     component: () => import('@/views/system/department/index.vue'),
     meta: {
       locale: 'menu.system.department',
       requiresAuth: true,
       permissionCode: ['system:department', 'department'],
     }
   }
   ```

2. **页面组件** — 创建 `src/views/system/department/index.vue`

3. **API 定义** — （如需要）在 `src/api/` 下新增 `department.ts`

4. **权限码映射** — 在 `src/utils/permission-transformer.ts` 的
   `PERMISSION_CODE_ALIAS_MAP` 中添加：
   ```typescript
   department: ['system:department']
   ```
   在 `src/utils/permission-to-route.ts` 的 `OBJECT_TO_PATH_MAP` 中添加：
   ```typescript
   'system:department': {
     path: '/system/department',
     name: 'SystemDepartment',
     component: () => import('@/views/system/department/index.vue'),
   }
   ```

5. **i18n 文案** — 在 `locale/zh-CN/settings.ts` 中添加
   `menu.system.department: '部门管理'`

### 19.2 权限码命名规范

- **菜单权限**：`{模块}:{页面}` 如 `system:user`
- **按钮权限**：`{模块}:{页面}:{操作}` 如 `system:user:add`
- **API 权限**：`{模块}:{页面}:{接口}` 如 `system:user:list`
- **别名兼容**：简写如 `user` → 自动展开为 `system:user`；路径式如
  `system/user` → 自动标准化为 `system:user`

### 19.3 关键文件速查

| 文件 | 作用 |
|------|------|
| `src/main.ts` | 应用入口 |
| `src/router/index.ts` | 路由实例与基础路由 |
| `src/router/routes/modules/*.ts` | 业务路由（重点关注 `system.ts`） |
| `src/router/guard/permission.ts` | 权限守卫（新增/修改鉴权逻辑） |
| `src/router/guard/userLoginInfo.ts` | 登录状态守卫（token + 用户信息） |
| `src/store/modules/user/index.ts` | 用户状态 + 权限 state |
| `src/store/modules/app/index.ts` | 应用设置 + 服务端菜单逻辑 |
| `src/utils/auth.ts` | Token 读写与校验 |
| `src/utils/permission-transformer.ts` | 权限码标准化 |
| `src/utils/permission-to-route.ts` | 权限 → 路由转换 |
| `src/hooks/permission.ts` | 组合式权限检查函数 |
| `src/directive/permission/index.ts` | v-permission 指令实现 |
| `src/api/interceptor.ts` | Axios 全局拦截器 |
| `src/api/user.ts` | 用户与管理员认证 API |
| `src/components/menu/` | 菜单组件与菜单树生成 |
| `src/components/navbar/index.vue` | 顶部导航栏 |
| `src/layout/default-layout.vue` | 主布局 |

---

> **Code Wiki 版本信息**：基于当前项目代码库生成，涵盖路由系统、菜单系统、权限模型、状态管理、API 层、页面组件结构等核心内容。当路由、权限码、store 结构发生变化时，请同步更新本文档以保证一致性。