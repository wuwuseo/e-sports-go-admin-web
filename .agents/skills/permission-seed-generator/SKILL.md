---
name: permission-seed-generator
description: Generate RBAC permission seed data (menu / api / button) from this project's route modules. Use when the user asks to generate or refresh permission seed data, create RBAC permissions from menu configuration, sync permissions with routes, or initialize permission data for role-based access control. Chinese triggers include "生成权限种子数据", "权限种子", "根据菜单/路由生成权限", "RBAC 权限初始化", "权限数据同步".
---

# Permission Seed Generator

Generates the permission seed file used by the admin console's RBAC system. It reads the route
modules under `src/router/routes/modules/`, then derives a three-level permission tree per menu:

```
menu  (one per route)
├── api     list / create / update / delete
└── button  add / edit / delete
```

## When to Use This Skill

- A new route module or menu page was added and permissions must be seeded for it.
- The user asks to "generate permission seed data", "根据菜单生成权限", or to initialize RBAC data.
- Permission codes in the backend/DB drifted from the current route configuration.
- Setting up a fresh environment that needs baseline permission rows.

Do **not** use it to edit individual permission rows by hand — edit
`src/data/permission-seed.ts` directly in that case.

## Prerequisites

| Item | Expected |
| --- | --- |
| Route sources | `src/router/routes/modules/*.ts` (each file exports an `AppRouteRecordRaw`) |
| Output file | `src/data/permission-seed.ts` |
| Runtime | Node.js (no extra dependencies) |

## Workflow

1. **Inspect the inputs.** Read `src/router/routes/modules/*.ts` and note new or removed pages, and
   how each route's `meta.permissionCode` and `meta.locale` are written.
2. **Preview without writing.** Always dry-run first and check the route/permission counts:

   ```bash
   node .agents/skills/permission-seed-generator/scripts/generate-seed.js --dry-run
   ```

3. **Write to a scratch file** and diff it against the committed seed file:

   ```bash
   node .agents/skills/permission-seed-generator/scripts/generate-seed.js --out /tmp/permission-seed.ts
   ```

   The existing `src/data/permission-seed.ts` is a **local, git-ignored** artifact
   (`/src/data/permission-seed.ts` is listed in `.gitignore`) and it has been curated by hand: ids
   are stable and codes follow `meta.permissionCode` (e.g. `messagecenter`, `thirdpartyuser`)
   rather than the derived `kebab → colon` form. Treat the generator output as a baseline and
   **merge into the existing file**, never blind-copy over it.
4. **Apply the change.** Either edit `src/data/permission-seed.ts` with the merged result, or
   overwrite it deliberately with `--force` when a full regeneration is really intended.
5. **Verify.** Run the type check and confirm the module still compiles:

   ```bash
   npm run type:check
   ```

## Command Reference

```bash
node .agents/skills/permission-seed-generator/scripts/generate-seed.js [options]
```

| Flag | Meaning |
| --- | --- |
| `--dry-run` | Parse routes and print the summary; write nothing |
| `--out <path>` | Write to a custom path instead of `src/data/permission-seed.ts` |
| `--routes-dir <path>` | Override the route source directory |
| `--force` | Allow overwriting an existing output file |
| `--help` | Print usage |

The script prints route count and generated permission count, plus `OK` / `FAILED` at the end.

## Output Contract

The generated file matches the shape already used in the repo:

```typescript
import type { SysPermissionType } from '@/types/api';

interface PermissionSeedItem {
  id: number;
  name: string;              // Display name
  code: string;              // Permission code, e.g. 'role:list'
  type: SysPermissionType;   // 'menu' | 'api' | 'button'
  domain: string;            // Domain / tenant identifier
  path?: string;             // API endpoint path
  method?: string;           // HTTP method
  menu_path?: string;        // Route path for menu permissions
  component?: string;        // Vue component path
  icon?: string;             // Menu icon
  parent_id?: number | null; // Parent permission id
  sort_order?: number;       // Display order
  is_common?: boolean;       // Visible to all roles
  status: number;            // 1 = enabled, 0 = disabled
  description?: string;
}
```

Keep this header intact so the file stays type-compatible with the admin console.

## Permission Model

- **menu** — one per route, `parent_id: null`, carries `menu_path` + `component`, `is_common` is true
  for dashboard-style pages reachable by every role.
- **api** — four rows per menu (`list` GET, `create` POST, `update` PUT, `delete` DELETE), `parent_id`
  pointing at the menu id.
- **button** — three rows per menu (`add`, `edit`, `delete`) for UI-level gating.

Ids are assigned sequentially; menus are emitted first, then all api rows, then all button rows.
Because child rows point at menu ids, never renumber one group without regenerating the rest.

## Guardrails

- The skill writes a source file. Dry-run first; when the target file already exists, the script
  refuses to overwrite unless `--force` is passed — do not pass `--force` until the diff has been
  reviewed.
- Do not change existing `id` values: role-permission assignments in the database reference them.
- Do not hand-edit generated ids to "make them pretty"; keep them stable and append new rows.
- Route files are parsed with regular expressions, not the TypeScript AST. Dynamic or computed
  `path` / `name` values are skipped — add those permissions manually and note it in the summary.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Route directory not found` | Wrong cwd-independent root or missing modules dir | Pass `--routes-dir` explicitly |
| `Found 0 routes` | Route files do not use literal `path:` / `name:` strings | Add literal values or seed those pages by hand |
| Output refused | Target file exists | Review the diff, then pass `--force` or use `--out` |
| Type check fails after applying | Header/`type` field drifted from `SysPermissionType` | Restore the header shown in Output Contract |
