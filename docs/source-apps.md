# 前端源码功能集

`admin-web` 的源码功能集与 go-admin 的 `internal/apps/<code>` 一起发布。后端提供菜单和权限元数据；前端在构建时收录页面文件，登录后只为当前用户有权访问的功能集注册路由。后端的 `component` 是本地页面标识，不是远程脚本地址。

## 目录与命名

一个功能集使用一个目录，目录名与后端 `App.Code` 完全一致：

```text
src/apps/demo/
├── api.ts
├── views/
│   └── index.vue
└── locale/
    ├── zh-CN.ts
    └── en-US.ts
```

页面路径约定为 `src/apps/<code>/views/<page>.vue`，对应后端菜单权限的 `Component: "<code>/<page>"`。例如 `demo/index` 对应 `src/apps/demo/views/index.vue`。子页面也可用 `demo/items/index`。页面、API 和翻译文件都放在功能集目录内；通用组件仍放在 `src/components/`。

## 后端契约

| 后端字段 | 前端用途 |
| --- | --- |
| `Code` | 功能集目录名及权限码前缀 |
| `MenuPath` | 管理端页面路由；必须是 `/<code>` 或其子路径 |
| `Component` | 本地页面标识；必须以 `<code>/` 开头且对应实际 `.vue` 文件 |
| `Name`、`Icon`、`SortOrder`、`Parent` | 后端菜单元数据；前端按 `Icon`、`SortOrder`、`Parent` 展示图标、排序与层级，文案由语言包提供，翻译键为 `menu.app.<权限码中的冒号改为点>` |
| `PermButton.Code` | 页面按钮权限码，例如 `demo:items:add` |
| `PermAPI` | 后端接口鉴权；前端不以隐藏按钮代替接口鉴权 |

菜单容器可以不声明 `Component`，但必须有可访问的子页面。若菜单自身有子菜单，当前菜单组件将其渲染为容器，不提供父菜单页面的点击入口。需要父页面入口时，应另建一个子菜单权限。公开和普通用户鉴权 API 不会自动成为管理端菜单。

后端示例 `demo:menu` 的 `/demo`、`demo/index` 可直接接入。其 `GET /api/v1/demo/items` 返回原始数组，因此示例的 `api.ts` 按数组类型解析。只有已经编译进前端的页面才能加载；新增或改动页面后须重新构建并发布 `admin-web`。

## 加载流程

1. 登录或刷新页面时获取 `/api/v1/admin/auth/user/permissions` 混合权限树，保留菜单节点的 `code`、`menu_path`、`component` 和父子关系。
2. `src/router/source-apps.ts` 只接受启用的菜单节点，并从 Vite 收录的本地页面表中查找组件。路径不合规、页面缺失或与现有静态路由冲突的菜单不会注册；图标只接受 `icon-` 开头的组件名。
3. 用 Vue Router 添加页面路由，同时将菜单合并到现有管理端菜单。按钮节点只用于按钮权限判断，API 节点不生成页面。
4. 权限变化时重新同步，退出登录时移除功能集路由及菜单。页面权限仍由后端控制；前端路由和按钮控制只负责界面体验。

新增功能集后运行 `pnpm run type:check`、`pnpm run test:unit -- src/router/source-apps.test.ts` 和 `pnpm run build`，并分别验证有权限、无权限、菜单 `status=0` 和直接访问页面路径的情况。若后端将已播种的功能集设为 `Enabled=false`，还需确保其旧菜单权限不再出现在用户权限树中，否则前端无法仅凭权限树识别禁用状态。
