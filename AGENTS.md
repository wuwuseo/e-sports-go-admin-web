# AGENTS.md

> 本文件面向在本仓库中工作的 AI 代理与自动化工具，说明项目定位、硬性规则、代码地图、常见变更流程与验收标准。
> 人类开发者同样可以把它当作快速上手清单。完整的架构说明见 [CODE_WIKI.md](CODE_WIKI.md)，功能集接入契约见 [docs/source-apps.md](docs/source-apps.md)。

---

## 1. 项目定位

- 本仓库 `go-admin-web` 是电竞陪玩报单系统（EsportsPartner）的**管理端前端**，配套后端为同工作区的 `go-admin`（Go + Fiber，默认监听 `127.0.0.1:9501`）。
- 技术栈：Vue 3.5 + TypeScript 4.9 + Vite 3.2 + Arco Design Vue 2.58 + Pinia + Vue Router 4。
- 接口统一以 `/api/v1` 开头；开发环境通过 Vite 代理（`/api`、`/api/v1/admin/sse`）转发到后端。
- 构建产物 `dist/` 需同步到后端 `go-admin/web/dist`，由 `//go:embed` 打进二进制。**只改前端源码而不重新构建、不重新编译后端，线上不会生效。**

---

## 2. 硬性规则（必须遵守）

### 2.1 语言与风格

- 与用户交流、代码注释、提交说明一律使用**中文**；变量、函数、类名、文件名使用英文。
- 新增代码沿用既有风格：Composition API + `<script setup lang="ts">`、2 空格缩进、单引号、行宽 80、LF 换行（见 `.prettierrc.js`）。
- ESLint 基于 airbnb-base + `@typescript-eslint` + `vue3-recommended` + `prettier`，`prettier/prettier` 以 warning 级别出现但**不允许保留**。

### 2.2 终端

- 使用 PowerShell，命令分隔符用 `;`，**禁止使用 `&&`**。
- 工作目录：`d:\www\EsportsPartner\go-admin-web`。
- 包管理器优先 pnpm（存在 `pnpm-lock.yaml`、`.npmrc`）；脚本仍通过 `npm run <script>` 调用。

### 2.3 修改后立即格式化

每次修改源码文件后，立刻执行对应命令（不要等到提交）：

| 文件类型                            | 命令                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `.ts` `.tsx` `.js` `.jsx`           | `npx prettier --write "<文件>" ; npx eslint --fix "<文件>"`                              |
| `.vue`                              | `npx stylelint --fix "<文件>" ; npx prettier --write "<文件>" ; npx eslint --fix "<文件>"` |
| `.less` `.css`                      | `npx stylelint --fix "<文件>" ; npx prettier --write "<文件>"`                           |

批量处理：

```powershell
npx prettier --write "src/**/*.{ts,tsx,js,jsx,vue,less,css}" ; npx eslint --fix "src/**/*.{ts,tsx,js,jsx,vue}"
```

### 2.4 不要触碰的内容

- `dist/`、`node_modules/`、`pnpm-lock.yaml`：构建产物与锁文件，除非任务明确要求安装/升级依赖。
- `components.d.ts`：由 unplugin-vue-components 生成，禁止手工编辑。
- `go-admin/web/dist`：属于后端仓库，仅在用户明确要求「发布/同步产物」时才改动。
- `.env.*`、`src/config/settings.json`：涉及环境与默认行为，修改前需确认意图。
- 大范围重构、无关注释/命名调整、顺手删除"看起来没用"的代码：一律不做，除非用户明确要求。

### 2.5 Git 与安全

- 未经用户明确要求，不执行 `git commit`、`git push`、`git reset --hard`、分支删除等操作。
- 忽略 `dist`、构建日志、临时脚本；不提交密钥、Token、内网地址等敏感信息。
- 验证命令失败时，先报告失败原因，不要反复重跑同一条命令；不要用 `--no-verify` 或关闭 lint 规则来"通过"检查。

---

## 3. 代码地图

| 路径                  | 职责                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| `src/main.ts`         | 应用入口：注册 Arco、路由、Pinia、i18n、全局组件、指令、请求拦截器    |
| `src/api/`            | 接口封装（`interceptor.ts` 为 axios 拦截器与 NProgress），按业务分文件 |
| `src/api/interceptor.ts` | Token 注入、统一响应解包、错误提示、并发进度条、SSE 请求排除        |
| `src/router/`         | 静态路由（`routes/modules`）、守卫（`guard/`）、功能集路由注入        |
| `src/router/source-apps.ts` | 依据后端权限树动态注册 `src/apps/*` 页面路由并生成菜单          |
| `src/store/modules/`  | Pinia：`user`（登录/权限）、`app`、`tab-bar`、`permission` 等         |
| `src/hooks/`          | `permission`（权限判断）、`request`、`themes`、`locale`、`sse-message`、`dict` 等 |
| `src/directive/permission` | `v-permission` 按钮级权限指令                                   |
| `src/components/`     | 全局组件（菜单、导航栏、标签页、图表、附件选择器、富文本编辑器等）      |
| `src/layout/`         | `default-layout.vue`（主布局）、`page-layout.vue`（页面容器）        |
| `src/views/`          | 系统页面：登录、OAuth 回调、工作台、消息中心、系统管理、404           |
| `src/apps/<code>/`    | 源码功能集（`esports`、`cms`、`demo`），含 `api.ts`、`views`、`locale`  |
| `src/services/`       | SSE 连接、系统配置、附件访问等服务                                    |
| `src/locale/`         | 国际化入口与语言包（zh-CN / en-US，按模块拆分）                       |
| `src/types/`          | `api.ts`（接口模型）、全局类型声明                                     |
| `src/utils/`          | `auth`、`permission-transformer`、`oauth`、`route-listener` 等工具    |
| `config/`             | Vite 基础/开发/生产配置与插件（Arco 按需、gzip、imagemin、visualizer）  |

### 关键链路速查

- **登录鉴权**：`views/login/index.vue` → `api/user.ts`（`/api/v1/public/login`）→ `store/modules/user.ts` 保存 Token → `router/guard/permission.ts` 校验登录态并加载用户信息与权限树（`/api/v1/admin/auth/user/permissions`）。
- **权限判定**：`store` 中权限集合 → `hooks/permission.ts`（`hasMenuPermission` / `hasAnyPermission`）→ 守卫按 `meta.permissionCode` 拦截；`role === 'admin'` 直接放行。
- **动态菜单/路由**：后端权限树中 `type === 'menu'` 且 `status === 1` 的节点，由 `router/source-apps.ts` 解析 `menu_path` 与 `component`，映射到构建期收录的 `src/apps/<code>/views/**.vue`。
- **按钮权限**：`v-permission="'esports:order:add'"` 或 `usePermission()`；前端隐藏按钮**不替代**后端接口鉴权。
- **请求与进度条**：SSE 相关 URL 不触发 NProgress，避免长连接导致进度条卡死（新增拦截逻辑时注意保留该判断）。

---

## 4. 常见变更流程

### 4.1 新增/修改系统管理页面（`src/views/system`）

1. 在 `src/api/` 新增或扩展接口函数，请求/响应类型写入 `src/types/api.ts`；
2. 在 `src/views/system/<module>/` 下新增页面，复用 `page-layout`、Arco 的 `a-table`、`a-form`、`a-modal` 等既有模式；
3. 在 `src/router/routes/modules/` 注册静态路由（`meta.locale`、`meta.icon`、`meta.permissionCode`）；
4. 在 `src/locale/zh-CN.ts` 与 `src/locale/en-US.ts`（模块化文案在 `zh-CN/*.ts` / `en-US/*.ts`）同步补齐文案，**键名成对存在**；
5. 若需状态复用，在 `src/store/modules/` 增加模块并在 `src/store/index.ts` 导出。

### 4.2 新增/修改功能集页面（`src/apps/<code>`）

- 目录名必须与后端 `App.Code` 完全一致；页面路径 `src/apps/<code>/views/<page>.vue` 对应后端 `Component: "<code>/<page>"`；
- 菜单文案键为 `menu.app.<权限码中的冒号改为点>`，写入功能集自身的 `locale/zh-CN.ts`、`locale/en-US.ts`；
- `menu_path` 必须是 `/<code>` 或其子路径，`icon` 只接受 `icon-` 开头的名称，否则菜单会被静默丢弃；
- 只有构建期收录的页面才能加载，新增页面后须重新构建产物。

### 4.3 新增接口封装

- 使用 `import axios from 'axios'` 直接调用，路径写全 `/api/v1/...`；
- 返回值统一为 `ApiResponse<T>` / `PaginatedResponse<T>`（见 `src/types/api.ts`），不要自造包装结构；
- 复用 `interceptor.ts` 的错误处理，不要在每个 API 里重复 `try/catch` 弹提示。

### 4.4 新增单元测试

- 位置与源码同目录：`xxx.test.ts` / `xxx.spec.ts`，走 Vitest（`environment: 'node'`，`globals: false`，需显式 `import { describe, it, expect } from 'vitest'`）；
- 纯逻辑优先（权限转换、OAuth 流程、路由构造、请求封装），不要为组件快照写无意义测试；
- 运行：`npm run test:unit` 或 `npm run test:unit -- src/router/source-apps.test.ts`。

---

## 5. 验证矩阵

| 改动类型                    | 至少执行                                                       |
| --------------------------- | -------------------------------------------------------------- |
| 任意 TS/Vue 源码             | 格式化命令 + `npm run type:check`                              |
| 路由、权限、功能集、store    | 上述 + `npm run test:unit`                                     |
| 构建配置、依赖、入口文件     | 上述 + `npm run build`（或 `npm run report:skip-check` 快速验证） |
| 样式/布局                    | 格式化命令 + 浏览器实际查看（Vite 开发服务器）                 |
| 需要交付产物                 | `npm run build`，产物同步后端并重新编译后端                    |

验收标准：命令退出码为 0；不新增 lint/type 错误；控制台无 `prettier/prettier`、`no-unused-vars`、`no-console` 告警；行为与用户诉求一致。

---

## 6. 常见陷阱

1. **看到旧页面**：`dist` 未重新构建，或后端未重新编译/重启（`//go:embed` 在编译期固化）。
2. **接口 404/跨域**：`VITE_API_BASE_URL` 非空时请求直连该地址，不再走 Vite 代理；开发期建议留空。
3. **进度条卡死**：新增请求链路涉及 SSE 时，需在 `interceptor.ts` 的 `isSseRequest` 中排除。
4. **菜单不显示**：检查后端权限节点 `status`、`menu_path` 前缀、`component` 是否与 `src/apps/**` 实际文件对应、语言包键是否缺失。
5. **单页功能集菜单丢失**：菜单 `children` 为空数组时须按叶子节点处理，仅有单测通过不足以证明可用，需在浏览器验证侧边栏。
6. **权限判定失效**：`meta.permissionCode` 与权限树 code 必须一致；`admin` 角色会跳过权限判断，测试非管理员账号才能复现。
7. **命令串联报错**：PowerShell 不认识 `&&`，改用 `;`。
8. **误改生成文件**：`components.d.ts`、`dist/**`、锁文件不属于业务代码。

---

## 7. 沟通与交付

- 开工前先确认影响范围（页面 / 路由 / 权限 / 接口 / 语言包），不确定时提问而不是猜测。
- 汇报保持简洁：改了哪些文件、关键行为、执行的验证命令及结果、遗留风险。
- 不夸大结论：未运行验证就不要声称"已完成/已修复"；跳过某项检查要显式说明原因。

### 交付前检查清单

- [ ] 改动范围与需求一致，无顺手重构、无无关注释与空行调整
- [ ] 已按文件类型执行格式化 / lint 修复
- [ ] `npm run type:check` 通过（涉及测试时 `npm run test:unit` 通过）
- [ ] 涉及构建配置或发布的改动已跑 `npm run build`
- [ ] 新增文案已同时补齐 `zh-CN` 与 `en-US`
- [ ] 未提交、未推送、未执行破坏性 Git 操作（除非用户明确要求）
- [ ] 未改动 `dist/`、锁文件、生成文件与后端仓库产物

---

## 8. 参考文档

- [README.md](README.md) — 安装、脚本、目录与集成说明
- [CODE_WIKI.md](CODE_WIKI.md) — 路由、菜单、权限、状态管理、API 层详解
- [docs/source-apps.md](docs/source-apps.md) — 前端功能集接入契约
- [.trae/rules/project_rules.md](.trae/rules/project_rules.md) — 仓库原始开发规则
