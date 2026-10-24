# CODE_WIKI — go-admin-web

> 本文档描述 `go-admin-web`（电竞陪玩报单系统管理端）的整体架构、路由与菜单、权限模型、状态管理、API 层、页面与业务功能集的实现细节。
> 内容以仓库当前代码为准，涉及结论均可在对应文件中核对。安装与命令使用说明见 [README.md](README.md)。

---

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术栈](#2-技术栈)
- [3. 项目结构](#3-项目结构)
- [4. 入口与启动流程](#4-入口与启动流程)
- [5. 路由系统](#5-路由系统)
- [6. 菜单系统](#6-菜单系统)
- [7. 权限系统](#7-权限系统)
- [8. 状态管理（Pinia）](#8-状态管理pinia)
- [9. API 层与请求拦截](#9-api-层与请求拦截)
- [10. 服务层](#10-服务层)
- [11. 认证与登录](#11-认证与登录)
- [12. 页面（views）](#12-页面views)
- [13. 业务功能集（apps）](#13-业务功能集apps)
- [14. 布局与全局组件](#14-布局与全局组件)
- [15. 国际化](#15-国际化)
- [16. 主题](#16-主题)
- [17. 构建与环境配置](#17-构建与环境配置)
- [18. 测试](#18-测试)
- [19. 常用命令](#19-常用命令)
- [20. 关键流程时序](#20-关键流程时序)
- [21. 现状与注意事项](#21-现状与注意事项)
- [22. 快速参考](#22-快速参考)

---

## 1. 项目概述

`go-admin-web` 是与同工作区 `go-admin`（Go + Fiber，默认 `127.0.0.1:9501`）配套的管理端前端，负责三类事情：

1. **后台管理**：登录认证、系统管理（用户/管理员/角色/权限/部门/字典/配置/任务/日志/附件/插件等）、消息中心；
2. **业务运营**：电竞陪玩业务功能集 `src/apps/esports`（商品、订单、报单、排单、钱包、结算、售后、会员、礼物、考核、报表、页面装修、客服工作台等；原「储值卡」已于 2026-10-20 由产品决定移除，对应视图与接口已删除）；
3. **权限驱动装配**：后端下发混合权限树，前端据此生成菜单、注册功能集路由、控制按钮可见性。

设计上的几个关键选择：

- **前后端分离 + 后端托管产物**：前端构建出 `dist/`，后端用 `//go:embed web/dist` 打包进二进制，因此**前端改动必须重新构建并重新编译后端**才生效。
- **两套路由来源**：`src/views` 走静态路由表（`meta.permissionCode` 事后过滤）；`src/apps` 走运行时动态注册（后端权限树节点 → `router.addRoute`）。
- **权限码多形态兼容**：权限判定同时接受 `system:user`、`/system/user`、`systemuser`、路由 `name` 等多种写法，用于消化后端历史数据。

---

## 2. 技术栈

| 分类          | 技术                                   | 版本        |
| ------------- | -------------------------------------- | ----------- |
| 框架          | Vue（Composition API，支持 TSX）       | ^3.5.33     |
| 构建          | Vite                                   | ^3.2.11     |
| 语言          | TypeScript                             | ^4.9.5      |
| UI            | @arco-design/web-vue、@arco-plugins/vite-vue | ^2.58.0 / ^1.4.6 |
| 路由          | vue-router（`createWebHistory`）       | ^4.6.4      |
| 状态          | pinia                                  | ^2.3.1      |
| 国际化        | vue-i18n                               | ^9.14.4     |
| HTTP          | axios                                  | ^0.24.0     |
| 图表          | echarts / vue-echarts                  | ^5.6.0 / ^6.7.3 |
| 工具          | @vueuse/core、lodash、dayjs、mitt、nprogress、sortablejs、query-string | — |
| 测试          | vitest                                 | 0.34.6      |
| 代码质量      | ESLint(airbnb-base) + Prettier + Stylelint + husky + lint-staged + commitlint | — |

---

## 3. 项目结构

```text
go-admin-web/
├── config/
│   ├── vite.config.base.ts      # 别名、SVG Loader、Arco 样式按需、Less 变量注入
│   ├── vite.config.dev.ts       # ESLint 插件、/api 与 /api/v1/admin/sse 代理
│   ├── vite.config.prod.ts      # gzip、imagemin、visualizer、manualChunks
│   ├── plugin/                  # arcoResolver / arcoStyleImport / compress / imagemin / visualizer
│   └── utils/
├── docs/source-apps.md          # 功能集接入契约
├── src/
│   ├── api/                     # 20 个业务 API 文件 + interceptor.ts（含 6 个 *.test.ts）
│   ├── apps/                    # 源码功能集：esports / cms / demo
│   ├── assets/                  # 图片、Less 样式（global.less、design-system.less、breakpoint.less）
│   ├── components/              # 全局组件：menu、navbar、tab-bar、breadcrumb、footer、
│   │                            # global-setting、message-box、chart、attachment-selector、rich-text-editor
│   ├── config/settings.json     # 运行时默认设置（主题、布局、菜单、标签页等）
│   ├── directive/permission/    # v-permission 指令
│   ├── hooks/                   # 11 个组合式函数
│   ├── layout/                  # default-layout.vue、page-layout.vue
│   ├── locale/                  # i18n 入口与语言包（zh-CN / en-US）
│   ├── router/                  # 路由、守卫、app-menus、source-apps、server-menu
│   ├── services/                # sse / attachment-access / config
│   ├── store/                   # Pinia：index.ts + modules/ + mixins/
│   ├── types/                   # api.ts、global.ts、axios.d.ts、mock.ts、echarts.ts
│   ├── utils/                   # auth、oauth、permission-transformer、permission-to-route、
│   │                            # route-listener、json、event、is、monitor 等
│   ├── views/                   # login、oauth、dashboard、message、system、not-found、redirect
│   ├── App.vue                  # a-config-provider（语言） + router-view
│   └── main.ts                  # 应用装配入口
├── .env.development             # VITE_API_BASE_URL=（留空走代理）
├── .env.production              # 空文件
├── index.html
├── package.json
├── tsconfig.json                # @/* → src/*，target/module ES2020，strict
└── vitest.config.ts             # Node 环境，include src/**/*.{test,spec}.{ts,tsx}
```

---

## 4. 入口与启动流程

`src/main.ts` 的装配顺序：

```text
createApp(App)
  → app.use(ArcoVue) / ArcoVueIcon     // 全量注册 Arco 与图标
  → app.use(router)                    // 创建路由并安装守卫
  → app.use(store)                     // createPinia()
  → app.use(i18n)                      // 默认 zh-CN，fallback en-US
  → app.use(globalComponents)          // Chart / Breadcrumb / AttachmentSelector / RichTextEditor
  → app.use(directive)                 // v-permission
  → app.mount('#app')
```

- 请求拦截器通过 `import '@/api/interceptor'` 的副作用安装（`src/main.ts:16`）。
- 全局样式在入口引入：`@/assets/style/global.less`、`@/assets/style/design-system.less`；Arco 组件样式由 `@arco-plugins/vite-vue` 按需注入（`config/plugin/arcoStyleImport.ts`）。
- `// import './mock';` 已注释，`src/mock/` 目录不存在，**Mock 当前未启用**。
- `src/App.vue` 使用 `<a-config-provider :locale>` 联动 i18n 与 Arco 组件语言，并渲染 `router-view`。

---

## 5. 路由系统

### 5.1 文件结构与注册顺序

| 文件 | 作用 |
| --- | --- |
| `src/router/index.ts` | `createRouter` + 静态路由装配 + `createRouteGuard` |
| `src/router/routes/index.ts` | `import.meta.glob('./modules/*.ts')` 收集静态业务路由；注册权限别名 |
| `src/router/routes/modules/` | `dashboard.ts`、`message.ts`、`system.ts` |
| `src/router/routes/base.ts` | `REDIRECT_MAIN`、`NOT_FOUND_ROUTE`、`DEFAULT_LAYOUT` |
| `src/router/routes/types.ts` | `AppRouteRecordRaw` |
| `src/router/typings.d.ts` | 扩展 `RouteMeta` |
| `src/router/constants.ts` | `WHITE_LIST`、`NOT_FOUND`、`REDIRECT_ROUTE_NAME`、`DEFAULT_ROUTE_NAME`、`DEFAULT_ROUTE` |
| `src/router/guard/` | `index.ts`（组合守卫）、`userLoginInfo.ts`、`permission.ts` |
| `src/router/app-menus/index.ts` | 把静态路由拍平成侧边栏菜单（`appClientMenus`） |
| `src/router/source-apps.ts` | 功能集动态路由与菜单生成 |
| `src/router/routes/server-menu.ts` | 「服务端菜单模式」路由拉取（默认关闭） |

`createRouter` 的 routes 顺序（`src/router/index.ts:11-41`）：

1. `/` → 重定向 `login`
2. `/login`（`meta.requiresAuth: false`）
3. `/oauth/callback`（`meta.requiresAuth: false`）
4. `...appRoutes`（dashboard / message / system）
5. `REDIRECT_MAIN`（`/redirect`、`/redirect/:path`，`hideInMenu`）
6. `NOT_FOUND_ROUTE`（`/:pathMatch(.*)*`，name `notFound`）

> `src/router/routes/index.ts` 还会 glob `./externalModules/*.ts`，但该目录不存在，因此 `appExternalRoutes` 恒为空数组。

### 5.2 静态业务路由

**dashboard**（`src/router/routes/modules/dashboard.ts`）

| path | name | component | meta 关键项 |
| --- | --- | --- | --- |
| `/dashboard` | `dashboard` | `DEFAULT_LAYOUT` | `locale: menu.dashboard`、`icon: icon-dashboard`、`order: 0`、`permissionCode: ['/dashboard','/dashboard/workplace']` |
| `/dashboard/workplace` | `Workplace` | `views/dashboard/workplace/index.vue` | `locale: menu.dashboard.workplace`、`roles: ['*']`、`permissionCode: '/dashboard/workplace'` |

**message**（`src/router/routes/modules/message.ts`，父级 `/message`，`icon-message`，`order: 3`）

| 子 path | name | 页面 | permissionCode |
| --- | --- | --- | --- |
| `center` | `MessageCenter` | `views/message/index.vue` | `['/message/center','messagecenter']` |
| `manage` | `MessageManage` | `views/message/manage.vue` | `['/message/manage','messagemanage']` |
| `broadcast` | `MessageBroadcast` | `views/message/broadcast.vue` | `['/message/broadcast','messagebroadcast']` |
| `preference` | `MessagePreference` | `views/message/preference.vue` | `['/message/preference','messagepreference']`，`hideInMenu: true` |

**system**（`src/router/routes/modules/system.ts`，父级 `/system`，`icon-settings`，`order: 2`，`permissionCode: ['/system','unknown']`）

| 子 path | name | 组件（`@/views/system/...`） | permissionCode |
| --- | --- | --- | --- |
| `user` | `SystemUser` | `user/index.vue` | `['/system/user','user']` |
| `third-party-user` | `SystemThirdPartyUser` | `third-party-user/index.vue` | `['/system/third-party-user','thirdpartyuser']` |
| `role` | `SystemRole` | `role/index.vue` | `['/system/role','role']` |
| `permission` | `SystemPermission` | `permission/index.vue` | `['/system/permission','permission']` |
| `department` | `SystemDepartment` | `department/index.vue` | `['/system/department','system:department','department']` |
| `attachment` | `SystemAttachment` | `attachment/index.vue` | `['/system/attachment','attachment']` |
| `cron-job` | `SystemCronJob` | `cron-job/index.vue` | `['/system/cron-job','cronjob']` |
| `queue-job` | `SystemQueueJob` | `queue-job/index.vue` | `['/system/queue-job','queuejob']` |
| `slide` | `SystemSlide` | `slide/index.vue` | `['/system/slide','system:slide','slide']` |
| `operation-log` | `SystemOperationLog` | `operation-log/index.vue` | `['/system/operation-log','operationlog']` |
| `login-log` | `SystemLoginLog` | `login-log/index.vue` | `['/system/login-log','loginlog']` |
| `dict-data` | `SystemDictData` | `dict-data/index.vue` | `['/system/dict-data','dictdata']` |
| `admin` | `SystemAdmin` | `admin/index.vue` | `['/system/admin','admin']` |
| `config` | `SystemConfig` | `config/index.vue` | `['/system/config','config']` |
| `plugin` | `SystemPlugin` | `plugin/index.vue` | `['/system/plugin','plugin']` |
| `captcha` | `SystemCaptcha` | `captcha/index.vue` | `['/system/captcha','system:captcha','captcha']` |

所有子路由均带 `requiresAuth: true`；`permissionCode` 数组写法用于兼容「新路径式 code」与「旧对象式 code」。

### 5.3 路由守卫

`createRouteGuard` 依序安装三层（`src/router/guard/index.ts`）：

1. **页面守卫**：`setRouteEmitter(to)`，向 `utils/route-listener` 发布路由变更（菜单高亮、TabBar 收集都依赖它）。
2. **登录信息守卫**（`guard/userLoginInfo.ts`）：`NProgress.start()` → 未登录跳 `login?redirect=` → 已登录则 `loadAdminInfo()/info()` + `loadPermissions()` → 同步功能集路由 `syncSourceAppRoutes` → `appStore.setSourceAppMenus(menus)`；若刚注册的路由改变了当前路径的匹配结果，执行 `next({ path: to.fullPath, replace: true })` 重新匹配。
3. **权限守卫**（`guard/permission.ts`）：白名单或 `meta.requiresAuth === false` 直接放行 → `isLogin()` → 等待 `permissionsLoading` 结束（最多 3s）→ 角色为 `admin` 直接放行 → 校验 `meta.roles` → 校验 `meta.permissionCode`（数组走 `hasAnyPermission`，字符串走 `hasMenuPermission`）→ 不通过跳 `notFound`。

`WHITE_LIST = [{ name: 'notFound' }, { name: 'login' }]`（`src/router/constants.ts`）。

`RouteMeta` 支持字段（`src/router/typings.d.ts`）：

| 字段 | 含义 |
| --- | --- |
| `requiresAuth` | 是否需要登录，`false` 时守卫直接放行 |
| `roles` | 允许的角色；含 `'*'` 表示不限制 |
| `permissionCode` | `string \| string[]`，命中任一即可访问 |
| `locale` | 菜单/面包屑 i18n key |
| `icon` | 菜单图标名（`icon-*`） |
| `hideInMenu` / `hideChildrenInMenu` | 自身/子级不出现在菜单 |
| `order` | 菜单排序（升序） |
| `activeMenu` | 指定高亮的菜单 key |
| `noAffix` | 不固定为 TabBar 首页签 |
| `ignoreCache` | 不进入 `keep-alive` 缓存 |

---

## 6. 菜单系统

### 6.1 数据来源

`src/components/menu/use-menu-tree.ts` 组装菜单：

```text
appStore.menuFromServer ? appStore.appAsyncMenus : appClientMenus
  + appStore.sourceAppMenus
```

- `appClientMenus`：静态路由拍平（`src/router/app-menus/index.ts`），只保留 `name/path/meta/redirect/children`。
- `appAsyncMenus`：全局设置开启「服务端菜单」后，由 `fetchServerMenuRoutes()` 拉取并 `setServerMenu(routes)`。
- `sourceAppMenus`：功能集动态菜单，登录/刷新权限时写入，登出时清空。

### 6.2 过滤、排序与层级

- 排序：顶层及递归子级按 `meta.order` 升序。
- 可见性 `canAccessMenu`：`role === 'admin'` 全通过 → `roles` 校验 → `permissionCode` 校验 → `roles.includes('*')` → `requiresAuth && name` 时用 `route.name` 当权限码 → 默认可见。
- 空 `children: []` 视为叶子节点（功能集单页菜单依赖此规则，否则会被丢弃）。
- `hideInMenu` 的节点自身不显示；`hideChildrenInMenu` 只显示父级条目；父级保留条件为「自身可见」或「存在可见子级」。

### 6.3 渲染

`src/components/menu/index.vue`（TSX）：

- 递归渲染 `a-sub-menu` / `a-menu-item`；图标用 `h(compile('<icon-x/>'))` 运行时编译 `meta.icon`。
- 文案 `t(meta.locale)`；静态页用 `menu.<module>.<page>`，功能集用 `menu.app.<code 冒号转点>`。
- `mode` 由 `appStore.topMenu` 决定横向/纵向；折叠状态回写 `appStore.updateSettings({ menuCollapse })`。
- 外链通过 `regexUrl` 识别，使用 `openWindow` 打开而不走 router。
- 路由变化时 `listenerRouteChange` 结合 `findMenuOpenKeys` 自动展开祖先链，`selectedKey = activeMenu || name`。

### 6.4 服务端菜单模式

`src/router/routes/server-menu.ts` 的 `fetchServerMenuRoutes()`：

1. 取 `/api/v1/admin/auth/user/permissions` → `PermissionTransformer.normalizePermissions`；
2. 只保留 `type === 'menu'` 的节点；
3. `src/utils/permission-to-route.ts` 通过 `OBJECT_TO_PATH_MAP`（仅覆盖 `system:*`、`dashboard:*`）与别名表把权限对象映射成路由，并按用户权限过滤；
4. 结果写入 `appStore.setServerMenu(routes)`。

该能力默认关闭（`settings.json` 的 `menuFromServer: false`），仅在全局设置抽屉里开启时触发；功能集菜单不受该开关影响。

---

## 7. 权限系统

### 7.1 权限树获取与存储

- 接口：`GET /api/v1/admin/auth/user/permissions`（`src/api/permission.ts`、`src/api/user.ts` 各有一份实现），返回 `ApiResponse<SysPermissionTreeNode[]>`。
- 存储位置：`src/store/modules/user/index.ts`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `permissionTree` | `SysPermissionTreeNode[]` | 原始混合权限树（菜单/按钮/API） |
| `permissions` | `PermissionResponse[]` | 归一化后的权限列表，按 `type:action:object` 去重 |
| `permissionCodes` | `string[]` | 由 `PermissionTransformer.extractPermissionCodes` 展开的可用 code 集合（**数组，非 Set**） |
| `permissionsLoading` | `boolean` | 加载中标记，权限守卫会等待其结束 |
| `role` / `isAdmin` / `isSuperAdmin` | — | 角色与管理员标记 |

`SysPermissionTreeNode`（`src/types/api.ts`）关键字段：

| 字段 | 说明 |
| --- | --- |
| `id` / `parent_id` | 树结构 |
| `name` | 展示名 |
| `code` | 权限码，如 `esports:orders`、`system:user` |
| `type` | `'menu' \| 'button' \| 'api'` |
| `domain` | 业务域（请求时传 `default`） |
| `path` + `method` | API 型节点 |
| `menu_path` + `component` + `icon` | 菜单型节点 |
| `sort_order` | 排序 |
| `status` | `1` 启用，`0` 禁用（动态路由只接受 `1`） |
| `is_common` | 通用权限 |
| `children` | 子节点 |

### 7.2 `PermissionTransformer`

`src/utils/permission-transformer.ts` 承担三件事：

1. **归一化**：`normalizePermissions` 支持「树节点数组」「字符串数组」「`{ data / permissions }` 包裹」三种输入；字符串会转成 `{ object, action: 'access', type: 'button' }`。
2. **code 变体展开**：同一权限同时登记 `system:user`、`system/user`、`/system/user`、`systemuser`（末段去 `-`）等形式，兼容历史数据。
3. **别名注册**：`registerRouteAliases(routes)` 把路由 `meta.permissionCode`、路径段、路由 `name` 互相登记为别名；`router/routes/index.ts` 启动时执行，并额外注册 `unknown → /system`。

### 7.3 判定 API

`user store` 提供，`src/hooks/permission.ts` 仅做转发：

| 方法 | 规则 |
| --- | --- |
| `hasPermissionByType(code, type?)` | `role === 'admin'` 直接 true；否则查 `permissionCodes`，再按类型过滤 |
| `hasMenuPermission(code)` | 上述 + 要求存在菜单型权限 |
| `hasButtonPermission(code)` | 上述 + 要求存在按钮型权限 |
| `hasAnyPermission(codes[])` | 任一命中 |
| `hasAllPermissions(codes[])` | 全部命中 |

### 7.4 `v-permission` 指令

`src/directive/permission/index.ts`，支持三种绑定值：

```vue
<a-button v-permission="'esports:orders:reprice'">改价</a-button>
<a-button v-permission="['esports:orders:reprice','esports:orders:cancel']">操作</a-button>
<a-button v-permission="{ permission: 'esports:orders:cancel', mode: 'all', strategy: 'disable' }">取消</a-button>
```

- `mode`：`any`（默认）/ `all`；
- `strategy`：`hide`（默认，移除 DOM）或 `disable`（加 `disabled` / `is-disabled` / `pointer-events:none`，并禁用内部表单控件），`v-permission.disable` 修饰符等价于 `strategy: 'disable'`；
- `admin` 角色恒为有权限；`mounted` 与 `updated` 均会重新判定。

### 7.5 功能集动态路由（`source-apps.ts`）

`src/router/source-apps.ts` 把权限树中的菜单节点映射成路由：

**节点准入条件**

1. `type === 'menu'` 且 `status === 1`；
2. `code` 以 `:` 前缀段作为 `appCode`，须匹配 `^[a-z][a-z0-9]*$`，且不在保留字 `admin/public/user/plugin/attachments/auth` 中；
3. `code` 必须以 `${appCode}:` 开头；
4. `menu_path` 必须匹配 `^/${appCode}(?:/[a-z0-9][a-z0-9-]*)*$`；
5. 声明了 `component` 时，必须能解析到构建期收录的 `src/apps/<appCode>/views/<rest>.vue`（`import.meta.glob('../apps/*/views/**/*.vue')`），否则整条菜单丢弃。

**生成结果**

- 每个 appCode 一条 `/{appCode}` 的 `DEFAULT_LAYOUT` 壳路由 + 扁平子路由（path 去掉 appCode 前缀）；
- 菜单节点 `name` 为 `SourceApp:<code>` / `SourceAppMenu:<code>`，`meta.locale = menu.app.<code 冒号转点>`，`icon` 仅接受 `^icon-[a-z0-9-]+$`，`order = sort_order`，`permissionCode = menu_path`；
- 父子关系按 `parent_id` 组装，跨 appCode 时提升为根节点；
- 无页面且无子菜单的节点会被递归剪除。

**同步与清理**

- `syncSourceAppRoutes(router, tree)`：用 `JSON.stringify(tree)` 做签名比对，未变化直接复用；变化时先 `clearSourceAppRoutes()`，再用现有路由 path 集合过滤冲突项后 `router.addRoute`，返回 `{ menus, changed }`。
- `refreshSourceAppRoutes(tree)`：权限刷新后调用（`user store` 的 `refreshPermissions`）。
- `clearSourceAppRoutes()`：登出时调用，逐个执行路由移除函数。

> 安全约束：`component` 只是本地页面标识，前端只解析构建期收录的 `.vue` 文件，不执行服务端提供的任意代码。

---

## 8. 状态管理（Pinia）

### 8.1 模块一览

`src/store/index.ts` 创建 `pinia` 并命名导出 9 个 store：

`useAppStore`、`useUserStore`、`useTabBarStore`、`useRoleStore`、`usePermissionStore`、`useUserManagementStore`、`useAdminManagementStore`、`useMessageStore`、`useOAuthStore`。

未聚合的模块（`attachment`、`config`、`cron-job`、`dict-data`、`operation-log`、`sys-permission`）由页面按 `@/store/modules/<name>` 深层引入。

| 模块 | 职责与关键状态 |
| --- | --- |
| `app` | 全局 UI 设置（展开自 `settings.json`）：`theme/navbar/menu/topMenu/hideMenu/menuCollapse/footer/tabBar/menuWidth/themeColor/device/globalSettings/menuFromServer/serverMenu/sourceAppMenus`；`updateSettings/toggleTheme/toggleDevice/toggleMenu/setServerMenu/setSourceAppMenus` |
| `user` | 当前会话身份与权限（见 8.2） |
| `tab-bar` | `tagList: TagProps[]`、`cacheTabList: Set<string>`；`updateTabList/deleteTag/freshTabList/resetTabList` |
| `permission` | 权限**管理后台**数据（非当前用户）：`permissions/allPermissions/userPermissions/total/permissionTree`，`cache` 为 `Map` + 5 分钟 TTL，`buildPermissionTree/updateTreeCheckState` |
| `role` | 角色 CRUD、启停、`saveRolePermissions`、`fetchAllRoles` |
| `user-management` | 前台用户 CRUD、启停、黑名单、角色分配、导出、第三方用户 |
| `admin-management` | 管理员 CRUD（手写，未用 mixin）、启停、角色分配 |
| `message` | 消息列表/未读统计/偏好；`pushIncoming` 供 SSE 写入 |
| `oauth` | OAuth providers、当前身份；getter `adminGithubProvider` |
| `attachment` / `config` / `cron-job` / `dict-data` / `operation-log` | 对应业务域的列表与 CRUD 状态 |
| `sys-permission` | 后端权限树编辑（`SysPermissionTreeNode`），节点 key、勾选态计算 |

`src/store/mixins/crud.ts` 提供 `createCrudActions` 等工厂，统一 `items/total/currentItem/loading` 与 `fetchList/fetchDetail/create/update/delete`，多数业务模块复用它。

### 8.2 user store

- 普通登录 `login()`：`userLogin` → 写 token/refresh_token → `setAdminLogin(false)` → `info()` → `loadPermissions()`，异常时清空凭证。
- 管理员登录 `adminLogin(form, captchaToken)`：`POST /api/v1/admin/public/login`（带 `X-Captcha-Token`）→ `initAdminSession(tokenData)`：写 token/refresh_token、`setAdminLogin(true)`、`loadAdminInfo()`、`loadPermissions()`。
- 角色归一化 `processUserRole`：`roles` 含 `admin`（忽略大小写）即视为超管角色。
- 权限加载 `loadPermissions()`：`getUserPermissions({ domain: 'default' })` → `permissionTree` → `normalizePermissions` 去重 → `permissionCodes`；失败时清空三项。
- 权限刷新 `refreshPermissions()`：重新加载权限树，并 `refreshSourceAppRoutes` + `appStore.setSourceAppMenus`。
- 登出 `logoutCallBack()`：重置用户信息与权限、清 token、`setAdminLogin(false)`、移除路由监听、清服务端菜单与功能集菜单、`clearSourceAppRoutes()`、断开 SSE、重置消息 store。

### 8.3 app store 与设置持久化

- state 是 `src/config/settings.json` 的浅拷贝，改设置只影响当前会话；**项目没有引入 pinia 持久化插件**。
- 实际会被持久化到 `localStorage` 的只有：`token` / `refresh_token` / `is_admin_login`（`utils/auth.ts`）、`arco-locale`（语言）、`arco-theme`（暗色，vueuse `useDark` 写入）、`sse_last_event_id`（SSE 断点续传）。
- 想在默认配置中固化设置，应修改 `src/config/settings.json`（全局设置抽屉的「复制配置」就是为此准备的）。

### 8.4 TabBar 与缓存

- 默认关闭（`settings.json` 的 `tabBar: false`）；`default-layout.vue` 以 `v-if="appStore.tabBar"` 渲染。
- `components/tab-bar/index.vue` 监听路由变更，非 `noAffix` 且未存在的路径会 `updateTabList(route)`；`name === 'Redirect'` 不加入页签。
- `meta.ignoreCache` 为真的页面不进入 `cacheTabList`（不缓存）；其余页面由 `layout/page-layout.vue` 的 `<keep-alive :include="tabBarStore.getCacheList">` 缓存。
- 右键菜单支持：重新加载、关闭当前、关闭左侧、关闭右侧、关闭其它、关闭全部。

---

## 9. API 层与请求拦截

### 9.1 请求拦截（`src/api/interceptor.ts`）

| 项目 | 实现 |
| --- | --- |
| baseURL | 仅当 `VITE_API_BASE_URL` 非空时设置，否则使用同源相对路径（开发期走 Vite 代理） |
| 超时 | `axios.defaults.timeout = 300_000`（5 分钟，兼顾大文件上传） |
| 鉴权 | 每次请求从 `localStorage` 读取 token，写入 `Authorization: Bearer <token>` |
| 进度条 | `NProgress` + 模块级 `activeRequestCount`，并发请求只在首个开始、末个结束 |
| SSE 排除 | URL 命中 `/admin/sse/connect`、`/admin/auth/sse/ticket`、`/admin/auth/sse/` 时不启动进度条（避免长连接导致进度条卡死） |

### 9.2 响应拦截

- **成功判定**：HTTP 2xx 且业务 `code` 为 `1` 或 `2`；其它数值 code 视为业务失败，弹 `Message.error`（`silentError: true` 的请求静默）并 `reject`。非数字 code（如部分裸结构响应）不会被拦截。
- **返回值**：返回**完整 `AxiosResponse`**，不解包。业务代码统一取 `res.data.data`，或按接口实际结构取 `res.data`。
- **HTTP 401**：弹 `Modal.error`，确认后 `userStore.logout()` 并 `window.location.reload()`；`/api/v1/admin/auth/user`（用于探测登录态）被排除。
- **其它错误**：`Message.error({ content: res.message || error.message })`。
- **`silentError`**：`src/types/axios.d.ts` 扩展的自定义配置项，attachment / captcha / oauth 部分接口使用。

### 9.3 API 文件清单

所有接口以 `/api/v1` 开头（`api/dashboard.ts` 为模板遗留例外）。

| 文件 | 业务域与代表接口 |
| --- | --- |
| `user.ts` | 登录/登出、token、当前用户与管理员、改密、公钥、用户 CRUD/启停/导出、角色分配、黑名单、第三方用户 |
| `permission.ts` | Casbin 权限 CRUD、全部权限、用户权限树 |
| `sys-permission.ts` | 系统权限元数据（菜单/按钮/API）CRUD 与树查询 |
| `role.ts` | 角色 CRUD/启停、角色权限查询与覆盖式保存 |
| `department.ts` | 部门树与 CRUD |
| `dict-data.ts` | 字典 CRUD、按 type 取值 |
| `config.ts` | 配置 CRUD、按 key/group 查询、分组列表 |
| `cron-job.ts` | 定时任务 CRUD/启停/立即执行/日志（含 tail） |
| `queue-job.ts` | 队列能力与概览、暂停/恢复、任务入队/重试/取消/删除、原始消息 |
| `attachment.ts` | 附件列表/上传/分片上传/分片状态/取消、访问 URL、移动、批量删除、分组 CRUD |
| `message.ts` | 消息列表/详情/已读/未读/批量删除/清空、未读数、偏好、广播、SSE ticket |
| `login-log.ts` / `operation-log.ts` | 登录日志、操作日志（只读） |
| `plugin.ts` | 插件列表/详情/安装/启停/卸载 |
| `slides.ts` | 轮播图 CRUD |
| `oauth.ts` | 公共 OAuth providers、code 换取登录态、当前身份绑定/解绑、管理员身份、provider 配置 |
| `captcha.ts` | 验证码挑战/校验、验证码设置、provider 测试与更新、场景更新 |
| `dashboard.ts` | 模板遗留的工作台假数据接口（`/api/content-data`、`/api/popular/list`） |
| `interceptor.ts` | axios 拦截器与进度条 |

### 9.4 核心类型（`src/types/api.ts`）

| 类型 | 结构 |
| --- | --- |
| `ApiResponse<T>` | `{ code: number; message: string; data: T }` |
| `PaginatedResponse<T>` | `{ data: T[]; page: number; total: number }` |
| `TokenResponse` | `{ access_token, refresh_token, token_type, expires_in }` |
| `LoginRequest` / `AdminLoginRequest` | 明文 `username/password` 或 RSA 加密字段 `encrypted_username/encrypted_password/key_id/nonce/timestamp` |
| `PublicKeyResponse` | `{ key_id, public_key, rotate_cycle }` |
| `SysPermissionTreeNode` | 见 7.1 |
| `PermissionResponse` | Casbin 四元组 `{ role_name, domain, object, action, type }` |
| `AttachmentAccessUrlResponse` | `{ url, expires_in, mode?, public?, disk?, driver? }` |
| `QueueCapabilities` / `QueueOverview` / `QueueTaskResponse` | 队列任务中心相关结构 |

### 9.5 关于 Token 刷新

`refreshToken()`、`adminRefreshToken()` 与 `getRefreshToken()` 均已定义，`refresh_token` 在登录时写入、登出时清除，但**拦截器与业务代码中没有自动刷新逻辑**：遇到 401 一律走强制登出弹窗。改动认证行为时需同步评估后端契约。

---

## 10. 服务层

### 10.1 SSE 消息服务（`src/services/sse.service.ts`）

- 单例 `sseService`，状态机 `idle | connecting | open | reconnecting | closed`。
- 连接流程：`POST /api/v1/admin/auth/sse/ticket` 取一次性 ticket（5 分钟有效）→ `new EventSource('/api/v1/admin/sse/connect?ticket=...&lastEventId=...')`。
- 事件类型：`message`、`system`、`unread_count`、`message_deleted`、`ready`、`heartbeat`、`error`；`ready`/`heartbeat` 只用于内部维护，不向业务监听器分发。
- 断线重连：指数退避 `[1s, 2s, 4s, 8s, 16s, 30s]`；主动 `disconnect()` 后不再重连。
- 心跳超时：40s（服务端 25s 心跳），收到任意事件即重置计时器，超时按断线处理。
- 断点续传：最近事件 ID 存 `localStorage['sse_last_event_id']`，重连时作为 `lastEventId` 传入。
- HMR 时自动断开连接。
- 调用方：`src/hooks/sse-message.ts`（navbar 内启动），订阅后写入 `useMessageStore` 并弹 `Notification`。

### 10.2 附件访问服务（`src/services/attachment-access.service.ts`）

- 负责把附件 id 换成可访问 URL：`getAttachmentAccessInfo` / `resolveAttachmentAccessUrl`。
- 内存缓存 + 并发请求去重（同一附件同时只发一次请求）；过期前 30s 提前刷新，公开资源永久缓存。
- URL 归一化：绝对地址原样返回，相对路径按 `window.location.origin` 补全。
- 错误语义：401 → 「登录或访问凭证过期」，404 → 「文件不存在」。

### 10.3 配置服务（`src/services/config.service.ts`）

- 读取后端动态配置并带默认值兜底，模块级缓存 `configCache`。
- 分片上传相关默认值：`attachment.chunk_threshold = 10MB`、`attachment.chunk_size = 5MB`；接口失败或类型校验不通过时回落到默认值。

---

## 11. 认证与登录

### 11.1 凭证存储（`src/utils/auth.ts`）

| key | 用途 |
| --- | --- |
| `token` | access token |
| `refresh_token` | refresh token（当前只存取，无自动刷新） |
| `is_admin_login` | 当前会话是否为管理员（`'1'` 表示是） |

- `isLogin()`：优先解析 JWT `exp` 判断过期；非 JWT 格式时只要有 token 即视为已登录。
- `isAdminLogin()`：与 token 无关，仅看 `is_admin_login`。

### 11.2 管理员登录流程

1. 页面挂载时 `fetchProviders('admin', true)`（OAuth 入口）与 `refreshCaptcha()`（按需拉取验证码）。
2. 提交表单：`verifyCurrentCaptcha()` 得到 `captcha_token`。
3. `getPublicKey()` 取后端公钥，用 WebCrypto `RSA-OAEP/SHA-256` 加密用户名与密码，提交 `encrypted_username/encrypted_password/key_id/nonce/timestamp`；取公钥失败时降级明文 `username/password`。
4. `adminLogin(data, captchaToken)` → `POST /api/v1/admin/public/login`，`captcha_token` 通过 `X-Captcha-Token` 头传递。
5. 成功后 `initAdminSession()`：写 token、标记管理员会话、`loadAdminInfo()`、`loadPermissions()`。
6. 跳转 `route.query.redirect`（须以 `/` 开头），否则回 `/dashboard/workplace`。

### 11.3 验证码

`src/api/captcha.ts`（场景常量 `admin_login`）：

- `createCaptchaChallenge()` → `POST /api/v1/public/captcha/challenges`；
- `resolveCaptchaChallenge()` 归一化为三种挑战：`image_text`（输入答案）、`image_click`（归一化坐标点选）、`geetest_gt4`（极验 v4）；
- `verifyCaptchaChallenge(id, response)` → `POST /api/v1/public/captcha/verifications`，返回 `captcha_token`；
- `src/views/login/captcha.ts` 负责懒加载 `gt4.js`（幂等）、初始化极验实例、把点击坐标换算为 0~1 比例。

后端未开启验证码时（`required = false`）不渲染验证码区域；验证码接口异常时按「需要验证码」处理并提示不可用。

### 11.4 OAuth（GitHub）

- 登录页按钮仅在 `shouldShowProviderLogin()` 为真时展示，当前实现只接受 `github`。
- 跳转前把回跳路径写入 `sessionStorage['oauth_redirect_path']`，然后整页跳转 `/api/v1/public/oauth/admin/{provider}/authorize`。
- 回调落地页 `/oauth/callback`（无需登录）：
  1. `parseOAuthCallbackQuery` 解析出 `login`（带一次性 code）、`bound`、`error` 三类结果；
  2. 立即用 `history.replaceState` 清除 URL 中的敏感 query；
  3. `login` → `POST /api/v1/public/oauth/exchange` 换取 token → `initAdminSession()` → 跳回安全回跳路径；
  4. `bound` 只提示绑定成功，不建立会话；`error` 使用 `OAUTH_ERROR_MESSAGES` 映射中文文案展示。
- 回跳路径安全校验：必须以 `/` 开头、不能是 `//` 或 `scheme:` 形式，默认 `/dashboard/workplace`。

### 11.5 登出

`src/hooks/user.ts` 按 `isAdminLogin()` 分流 `adminLogout()` / `logout()`，最终都进入 `logoutCallBack()`（见 8.2），同时清理路由、菜单、SSE 与消息状态。

---

## 12. 页面（views）

### 12.1 登录

- `views/login/index.vue`：布局壳（品牌区 + 登录卡片 + 版权），业务在 `components/login-form.vue`。
- 交互：账号密码登录、可选 OAuth 按钮、记住账号（`useStorage('login-config')`）、失败提示、验证码自动刷新。
- 同目录 `captcha.ts` + `*.test.ts`（验证码工具与登录表单的单测）。

### 12.2 工作台

`/dashboard/workplace`：`index.vue` 目前仅保留容器与组件 `name`；`components/` 下的 announcement、banner、carousel、categories-percent、content-chart、data-panel、docs、popular-content、quick-operation、recently-visited 为模板遗留组件，当前未被引用。
`api/dashboard.ts` 对应的 `/api/content-data`、`/api/popular/list` 也不是本项目后端接口。

### 12.3 消息中心

| 页面 | 路径 | 功能 |
| --- | --- | --- |
| 消息中心 | `/message/center` | 全部/系统/业务/任务 Tab，关键字、级别、已读状态、时间范围筛选，批量已读/未读/删除、全部已读、条件清空、未读统计 |
| 消息管理 | `/message/manage` | 管理视角的表格、详情弹窗、单条/批量删除、条件清空 |
| 广播 | `/message/broadcast` | 类型/级别/标题/正文/富文本、目标范围 `all/users/roles`，提交后显示投递人数 |
| 订阅偏好 | `/message/preference` | 桌面通知与声音、三类订阅、免打扰时段（`hideInMenu`，从消息中心入口进入） |

实时消息由 SSE 推送，写入 `useMessageStore` 并触发 `Notification`；navbar 铃铛展示未读数。

### 12.4 系统管理（16 个模块）

| 目录 | 职责 |
| --- | --- |
| `admin` | 管理员账号：列表/详情/新增/编辑/启停/分配角色、GitHub 身份查看与解绑 |
| `user` | 前台用户：列表/详情/新增/编辑/启停/导出、黑名单、角色分配 |
| `third-party-user` | 第三方（OAuth）账号列表与解绑 |
| `role` | 角色 CRUD/启停、按权限树分配权限与数据范围 |
| `permission` | 系统权限树维护（code、menu_path、component、icon、排序、状态） |
| `department` | 部门树的新增/编辑/删除 |
| `attachment` | 附件库：上传、分片上传（状态/取消）、访问地址、移动分组、批量删除、分组 CRUD |
| `cron-job` | 定时任务 CRUD/启停/立即执行/运行日志 |
| `queue-job` | 队列能力与概览、暂停/恢复、任务入队/重试/取消/删除、原始消息 |
| `config` | 配置中心（按 group 分组，字符串/数组/二维表三种结构），内嵌 OAuth provider 配置 |
| `captcha` | 人机验证配置：provider 参数、连通性测试、场景开关与 TTL |
| `plugin` | 插件安装/启停/卸载/详情 |
| `slide` | 轮播图 CRUD（图片、跳转、排序、状态） |
| `dict-data` | 数据字典 CRUD 与按类型取值 |
| `login-log` | 登录日志（只读） |
| `operation-log` | 操作日志（只读） |

> 当前没有「重置他人密码」功能，只有自助改密（`changePassword` / `changeAdminPassword`）。

### 12.5 其它

- `views/oauth/callback.vue`：OAuth 回调落地页（见 11.4）。
- `views/redirect/index.vue`：TabBar「重新加载」使用的中间页，触发组件重建。
- `views/not-found/index.vue`：404 页，权限不足也跳转到这里。

---

## 13. 业务功能集（apps）

### 13.1 结构与契约

```text
src/apps/<code>/
├── api.ts              # 该功能集的接口封装与类型
├── views/<page>.vue    # 页面，路径与后端 Component: "<code>/<page>" 对应
├── components/         # 功能集内部组件（可选）
└── locale/zh-CN.ts     # 菜单与页面文案，键 menu.app.<code 冒号转点>
    locale/en-US.ts
```

规则要点（完整契约见 [docs/source-apps.md](docs/source-apps.md)）：

- 目录名必须与后端 `App.Code` 完全一致；
- 页面只从构建期 `import.meta.glob` 收录的本地文件加载；
- `menu_path` 必须是 `/<code>` 或其子路径；`icon` 只接受 `icon-` 前缀；
- 菜单文案由前端语言包提供，后端只给 `code`、`icon`、`sort_order`、`parent_id`；
- 新增页面需重新构建发布，并重新编译后端才能生效。

### 13.2 esports（电竞陪玩业务）

入口：`src/apps/esports/api.ts`（344 个导出类型/接口、306 个 `export const|function` 导出、291 处 `axios` 调用，2026-10-24 实测）、`views/` 下 **18** 个页面（原 19 个，「储值卡」页已随该功能移除）、`components/close-condition-designer`（结单条件设计器）、`components/page-designer`（页面装修设计器与预览）。

| 页面目录 | 业务范围 |
| --- | --- |
| `products` | 商品管理（单一商品模型：每件一个价格/服务量/结单规则/库存、固定一人服务；content 内容图片多选）与分类 |
| `orders` | 订单中心：改价与报价预览、调价审批、改约、取消/恢复、渠道成本、协作者、结单审批 |
| `reports` | 报单录单：选/建客户、选商品、下单、年龄校验与复核 |
| `wallets` | 钱包账户与流水、充值（含活动充值）、人工调账、分账明细 |
| `dispatch` | 排单：派单板与席位、抢单大厅、转单/撤座/组队派单、优先级授权、席位转移、催单 |
| `players` | 陪玩账号：CRUD、在线状态、等级与资质 |
| `aftersales` | 售后工单、售后方案、执行/驳回/撤回、履约补单 |
| `settlements` | 结算单、结算周期、佣金规则与回滚、客服佣金、提现审核与打款、陪玩追回 |
| `campaigns` | 充值活动：活动 CRUD、类型/人群/叠加规则/阶梯 |
| `members` | 会员等级、成长值、客户等级查询与手动设定 |
| `gifts` | 礼物配置与启停、礼物订单与退款、送礼/争议审核、礼物意向、榜单 |
| `assessments` | 考核单与打分、考核规则与权重、陪玩评分、申诉审核、玩家评价 |
| `stats` | 报表：老板概览、财务、客服绩效、派单效率、售后质量，支持导出 |
| `pages` | 页面装修：草稿、预览、发布与审核、版本回滚、素材管理 |
| `cs` | 客服工作台：总览、客户画像、跟进记录、话术库、企微客户接入 |
| `close-forms` | 结单表单：模板/字段/版本、提交规则、结单审批流 |
| `risk-customers` | 风险客户名单与风险等级标记（`normal/watch/restricted`） |
| `payments` | 支付渠道与收款账户、线下支付凭证审核、就绪检查 |

> `payments` 在 `esports` 语言包中暂无对应菜单文案键，是否显示取决于后端权限树是否下发该菜单。

### 13.3 cms 与 demo

| 功能集 | 页面 | API |
| --- | --- | --- |
| `cms` | 单页三 Tab：文章 / 单页 / 分类；支持搜索、筛选、分页、内容与分类增删改 | `/api/v1/cms/admin` 下的内容与分类接口 |
| `demo` | 最小示例：ID + 标题表格 + 刷新按钮 | `GET /api/v1/demo/items` |

### 13.4 views 与 apps 的差异

| 维度 | `src/views`（静态路由） | `src/apps`（功能集） |
| --- | --- | --- |
| 注册时机 | 应用启动时写死在 `routes/modules` | 登录后按权限树 `router.addRoute` 动态注册 |
| 菜单来源 | `appClientMenus`（静态路由拍平） | `sourceAppMenus`（权限树生成） |
| 访问控制 | `meta.permissionCode` / `meta.roles` | 节点 `status`、`code` 前缀、`menu_path`、`component` |
| 文案 | `src/locale` 汇总 | 各功能集自带 `locale/*.ts`，glob 自动合并 |
| 生命周期 | 常驻 | 权限变化时重建，登出时移除 |

---

## 14. 布局与全局组件

### 14.1 布局

`src/layout/default-layout.vue`：

```text
a-layout.layout
├─ NavBar                          v-if="navbar"
└─ a-layout
   ├─ a-layout-sider → Menu       v-if="menu && !topMenu"，v-show="!hideMenu"
   ├─ a-drawer → Menu             移动端（hideMenu）
   └─ a-layout-content
      ├─ TabBar                   v-if="tabBar"
      ├─ PageLayout               内容区
      └─ Footer                   v-if="footer"
```

- 菜单宽度：折叠 48px，展开取 `appStore.menuWidth`（默认 220）。
- 依据 navbar/sider 是否存在动态计算内容区内边距；sider `breakpoint="xl"`。
- `useResponsive(true)` 初始化设备类型；监听 `userStore.role` 变化，若新角色无权访问当前路由则跳 404。

`src/layout/page-layout.vue`：`router-view` + 淡入过渡；`meta.ignoreCache` 的页面用 `:key="route.fullPath"` 强制重建，其余页面用 `<keep-alive :include="tabBarStore.getCacheList">`。

### 14.2 组件

**手动全局注册**（`src/components/index.ts`，`main.ts` 中 `app.use`）：

| 组件 | 说明 |
| --- | --- |
| `Chart` | `vue-echarts` 封装，`nextTick` 后渲染 |
| `Breadcrumb` | 接收 `items: string[]`，走 `$t` |
| `AttachmentSelector` | 附件选择器 |
| `RichTextEditor` | 富文本编辑器 |

该文件同时按需注册 ECharts 模块（CanvasRenderer、Bar/Line/Pie/Radar Chart、Grid/Tooltip/Legend/DataZoom/Graphic）。

**布局级组件**（在 `default-layout.vue` 中显式引入）：`navbar`、`menu`、`tab-bar`、`footer`、`breadcrumb`、`message-box`、`global-setting`。

- `navbar`：logo、顶部菜单、语言切换、暗色切换、消息铃铛（未读数 + 消息盒 popover）、全屏、用户下拉（个人信息、修改密码、消息偏好、退出登录）；内部启动 `useSseMessage()`。
- `message-box`：`system/business/task` 三个 Tab，点击条目 `markRead`，支持全部已读。
- `global-setting`：可调整 `navbar/menu/topMenu/footer/tabBar/menuFromServer/menuWidth/colorWeak`，支持复制当前配置到剪贴板以便写入 `settings.json`。**该组件当前未被 `default-layout.vue` 引用**，属于可独立挂载的设置能力。

---

## 15. 国际化

- 入口 `src/locale/index.ts`：`createI18n({ locale: localStorage['arco-locale'] || 'zh-CN', fallbackLocale: 'en-US', legacy: false })`，导出 `LOCALE_OPTIONS`。
- 语言包合并：`src/locale/zh-CN.ts` / `en-US.ts` 把全局 `menu.*`、`navbar.*`、各页面与组件的 `locale/*.ts`，以及 `import.meta.glob('../apps/*/locale/zh-CN.ts', { eager: true })` 收集的功能集文案合并为一个**扁平 key 对象**。
- 新增词条：
  - 页面级：同目录 `locale/zh-CN.ts` 与 `en-US.ts` 各加 key，并在 `src/locale/zh-CN.ts`、`en-US.ts` 中 import + 展开；
  - 功能集：写入 `src/apps/<code>/locale/*.ts`，由 glob 自动收集；
  - 全局通用：直接加在 `src/locale/zh-CN.ts` 顶层。
- 切换与持久化：`hooks/locale.ts` 的 `changeLocale` 更新 i18n 实例并写 `localStorage['arco-locale']`。
- Arco 组件语言由 `App.vue` 的 `<a-config-provider :locale>` 映射。

---

## 16. 主题

- 切换入口在 navbar：vueuse `useDark({ selector: 'body', attribute: 'arco-theme', valueDark: 'dark', valueLight: 'light', storageKey: 'arco-theme' })`，回调里同步 `appStore.toggleTheme(dark)`。
- `app` store 的 `theme` 字段是镜像值；暗色实际通过 `body[arco-theme='dark']` 生效。
- 暗色持久化依赖 `localStorage['arco-theme']`；其余设置项不持久化（见 8.3）。
- 样式约定：暗色样式集中写在 `src/assets/style/design-system.less` 的 `body[arco-theme='dark']` 作用域，页面内使用 `body[arco-theme='dark'] &`。
- `hooks/chart-option.ts` 把 `isDark` 注入 ECharts option，图表随主题切换。
- `themeColor` 存在于设置中，但当前没有运行时写入 CSS 变量的实现。

---

## 17. 构建与环境配置

### 17.1 环境变量

| 变量 | 作用 |
| --- | --- |
| `VITE_API_BASE_URL` | axios baseURL；留空则同源相对路径，开发期由 Vite 代理转发 |

`.env.development` 为空值，`.env.production` 为空文件。

### 17.2 Vite 配置

`config/vite.config.base.ts`：

- 别名：`@` → `src`，`assets` → `src/assets`，`vue-i18n` 指向 cjs 构建，`vue` 指向 `vue/dist/vue.esm-bundler.js`；
- `vite-svg-loader`、`@vitejs/plugin-vue`、`@vitejs/plugin-vue-jsx`；
- Less `modifyVars` 注入 `src/assets/style/breakpoint.less`；
- Arco 样式按需：`config/plugin/arcoStyleImport.ts`。

`config/vite.config.dev.ts`：

- `vite-plugin-eslint`（include `src/**/*.{ts,tsx,vue}`）；
- 代理 `/api` → `http://127.0.0.1:9501`，超时 5 分钟；
- 代理 `/api/v1/admin/sse` → 同地址，`proxyTimeout: 0`、`timeout: 0`，并移除 `content-length`、设置 `no-cache` / `x-accel-buffering: no`，保证事件实时下发。

`config/vite.config.prod.ts`：

- `gzip` 压缩、`imagemin`、`rollup-plugin-visualizer`（`REPORT=true` 时生成报告）；
- `manualChunks`：`arco`（Arco 组件库）、`chart`（echarts/vue-echarts）、`vue`（vue/router/pinia/vueuse/i18n）；
- `chunkSizeWarningLimit: 2000`。

### 17.3 代码规范与 Git 钩子

| 配置文件 | 内容 |
| --- | --- |
| `.eslintrc.js` | airbnb-base + `@typescript-eslint` + `vue3-recommended` + `prettier`；`prettier/prettier` 为 warning |
| `.prettierrc.js` | 2 空格、单引号、`printWidth: 80`、`endOfLine: lf`、`vueIndentScriptAndStyle: true` |
| `.stylelintrc.js` | standard + rational-order + recommended-vue |
| `commitlint.config.js` | `@commitlint/config-conventional` |
| `.husky/pre-commit` | `npm run lint-staged`（stylelint → prettier → eslint 按文件类型） |
| `.husky/commit-msg` | `pnpm commitlint --edit` |

`package.json` 的 `lint-staged`：`*.{js,ts,jsx,tsx}` → prettier + eslint；`*.vue` → stylelint + prettier + eslint；`*.{less,css}` → stylelint + prettier。

---

## 18. 测试

- 配置：`vitest.config.ts`，`environment: 'node'`、`globals: false`、`include: ['src/**/*.{test,spec}.{ts,tsx}']`，别名 `@` → `src`。
- 测试文件分布在：`src/api/*.test.ts`（attachment、captcha、oauth、queue-job、third-party-user、user）、`src/router/source-apps.test.ts`、`src/utils/oauth*.test.ts`、`src/views/login/*.test.ts`。
- 约定：显式 `import { describe, it, expect, vi } from 'vitest'`（`globals: false`）；以纯逻辑测试为主（接口封装、权限转换、OAuth 流程、路由构造、登录表单）。
- 命令：`npm run test:unit`，或 `npm run test:unit -- src/router/source-apps.test.ts`。

> `source-apps.test.ts` 只覆盖路由构造，不覆盖侧边栏菜单过滤；单页功能集的菜单可见性需要浏览器实测。

---

## 19. 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发服务器（`config/vite.config.dev.ts`，默认端口 5173，自动打开浏览器） |
| `npm run build` | `vue-tsc --noEmit` + 生产构建，产物 `dist/` |
| `npm run preview` | 构建后本地预览（`--host`） |
| `npm run report` | 构建 + 依赖体积报告 |
| `npm run report:skip-check` | 跳过类型检查，仅构建 + 报告 |
| `npm run type:check` | `vue-tsc --noEmit --skipLibCheck` |
| `npm run test:unit` | Vitest 单测 |
| `npm run lint-staged` | 对暂存文件执行 lint-staged |

---

## 20. 关键流程时序

### 20.1 管理员登录

```text
LoginForm
  → createCaptchaChallenge / verifyCaptchaChallenge   （按需）
  → getPublicKey → RSA-OAEP 加密用户名密码
  → POST /api/v1/admin/public/login（X-Captcha-Token）
  → initAdminSession：setToken / setRefreshToken / setAdminLogin(true)
  → loadAdminInfo()（GET /admin/auth/user）
  → loadPermissions()（GET /admin/auth/user/permissions）
  → router.replace(redirect || /dashboard/workplace)
```

### 20.2 一次受保护导航

```text
router.beforeEach
  ① setRouteEmitter(to)
  ② userLoginInfo 守卫
      未登录 → /login?redirect=...
      已登录 → 确保用户信息 + 权限树就绪
             → syncSourceAppRoutes(router, permissionTree)   // 变化时 addRoute
             → appStore.setSourceAppMenus(menus)
             → 若路由匹配变化 → next({ path, replace: true })
  ③ permission 守卫
      白名单 / requiresAuth:false → 放行
      role === 'admin' → 放行
      roles 校验 → permissionCode 校验 → 不通过跳 notFound
```

### 20.3 SSE 消息

```text
navbar 挂载 → useSseMessage()
  → sseService.connect()
      → POST /admin/auth/sse/ticket
      → EventSource(/admin/sse/connect?ticket=...&lastEventId=...)
  → 事件分发：
      message / system      → messageStore.pushIncoming + Notification
      unread_count          → 更新未读统计
      message_deleted       → 本地移除并扣减未读数
      heartbeat / ready     → 仅维护连接状态
  → 断线 → 退避重连（1s→30s），lastEventId 续传
  → 登出 / 卸载 → disconnect()
```

### 20.4 权限热更新

```text
userStore.refreshPermissions()
  → loadPermissions()
  → refreshSourceAppRoutes(permissionTree)   // 重建功能集路由
  → appStore.setSourceAppMenus(menus)        // 侧边栏同步
```

---

## 21. 现状与注意事项

以下均为当前代码事实，改动相关逻辑时需一并评估：

1. **没有自动刷新 Token**：`refreshToken` / `adminRefreshToken` 与 `refresh_token` 存取已具备，但没有 401 静默刷新与请求重放；401 直接弹强制登出。
2. **响应不解包**：拦截器返回完整 `AxiosResponse`，业务层自行取 `res.data.data`；新增 API 时保持一致。
3. **业务码约定**：`code === 1` 或 `2` 视为成功，其余数值为失败；非数字 code 的响应不会被拦截（如 `api/message.ts`、`api/dashboard.ts` 的部分裸结构）。
4. **成功码与 HTTP 状态双重依赖**：后端返回 2xx 但业务码失败时，前端会 `reject` 并弹提示，调用方需要 `try/catch`。
5. **`getUserPermissions` 重复定义**：`api/user.ts` 与 `api/permission.ts` 各有一份实现，路径相同。
6. **`global-setting` 未挂载**：组件完整但未被 `default-layout.vue` 引用。
7. **工作台为模板遗留**：页面容器为空，子组件与 `api/dashboard.ts` 的接口均未接入真实后端。
8. **`appExternalRoutes` 恒为空**：`src/router/routes/externalModules/` 目录不存在。
9. **`components.d.ts` 为生成文件**：由 unplugin-vue-components 生成，不应手工编辑；`config/plugin/arcoResolver.ts` 当前未被 base 配置引用。
10. **设置不持久化**：除主题与语言外，布局设置刷新后回到 `settings.json`。
11. **TabBar 默认关闭**：需在设置中开启后才会渲染与缓存页面。
12. **无重置他人密码**：只有自助改密接口。
13. **功能集页面需重新构建**：`import.meta.glob` 在构建期固定页面表，新增/删除 `.vue` 后必须重新构建，并重新编译后端产物。
14. **SSE 排除依赖字符串匹配**：后端调整 SSE 路径时需同步修改 `src/api/interceptor.ts`。

---

## 22. 快速参考

### 22.1 新增一个静态业务页面

1. `src/views/<module>/index.vue` 新建页面；
2. `src/api/<module>.ts` 增加接口，类型写入 `src/types/api.ts`；
3. `src/router/routes/modules/system.ts` 增加子路由（`meta.locale`、`meta.icon`、`meta.permissionCode`、`requiresAuth`）；
4. `src/locale/zh-CN.ts` 与 `en-US.ts` 补文案（页面内文案放 `locale/zh-CN.ts` 并在顶层 import + 展开）；
5. 需要状态复用时在 `src/store/modules/` 增加模块并在 `store/index.ts` 导出。

### 22.2 新增一个功能集

1. 创建 `src/apps/<code>/`（`api.ts`、`views/*.vue`、`locale/*.ts`）；
2. 后端 `internal/apps/<code>` 播种菜单权限：`Code = <code>:xxx`、`MenuPath = /<code>/...`、`Component = <code>/<page>`；
3. `locale` 中补齐 `menu.app.<code 冒号转点>` 文案；
4. 运行 `npm run type:check`、`npm run test:unit`、`npm run build`；
5. 浏览器验证：有权限、无权限、`status=0`、单页功能集菜单可见、直接访问页面路径。

### 22.3 权限码命名

- 功能集：`<appCode>:<模块>[:<动作>]`，例如 `esports:orders:reprice`；
- 系统模块：`system:<模块>` 或历史短码 `user` / `role`；
- 菜单节点通过 `menu_path` 与 `component` 关联页面；按钮节点只用于 `v-permission` / `usePermission` 判断；
- 前端隐藏按钮不构成安全边界，接口鉴权仍在后端。

### 22.4 关键文件速查

| 关注点 | 文件 |
| --- | --- |
| 应用装配 | `src/main.ts`、`src/App.vue` |
| 请求/响应/进度条 | `src/api/interceptor.ts` |
| 登录态存储 | `src/utils/auth.ts` |
| 路由注册与守卫 | `src/router/index.ts`、`src/router/guard/*` |
| 静态路由 | `src/router/routes/modules/*.ts` |
| 动态路由/菜单 | `src/router/source-apps.ts`、`src/components/menu/use-menu-tree.ts` |
| 权限判定 | `src/store/modules/user/index.ts`、`src/hooks/permission.ts`、`src/utils/permission-transformer.ts` |
| 按钮权限 | `src/directive/permission/index.ts` |
| 全局设置 | `src/config/settings.json`、`src/store/modules/app/index.ts` |
| 消息与 SSE | `src/api/message.ts`、`src/services/sse.service.ts`、`src/hooks/sse-message.ts` |
| 业务功能集 | `src/apps/esports/api.ts`、`src/apps/esports/views/*` |
| 国际化 | `src/locale/index.ts`、`src/locale/zh-CN.ts`、`src/apps/*/locale/*.ts` |
| 构建配置 | `config/vite.config.base.ts`、`config/vite.config.dev.ts`、`config/vite.config.prod.ts` |
