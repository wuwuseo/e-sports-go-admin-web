# 项目规则（Project Rules）

> 本文件记录在本仓库内进行任何代码修改时必须遵守的约定。AI 助手与开发者在执行任务时应自动遵循。

## 1. 交流与注释语言

- 默认使用中文进行所有交流。
- 代码中的变量、函数、类名等使用英文，但**注释必须使用中文**。
- 错误信息和调试信息优先使用中文解释。

## 2. 终端与命令规范

- 优先使用 PowerShell，使用 PowerShell 的正确语法。
- 命令分隔符使用 `;`，**禁止使用 `&&`**。
- 工作目录默认为：`d:\www\admin-web\web`。

## 3. 修改后自动格式化（重要）

每次修改 `.ts`、`.tsx`、`.js`、`.jsx`、`.vue`、`.less`、`.css` 等文件后，**必须自动执行格式化与 lint 修复**，以避免出现 vite-plugin-eslint 的告警（如 `prettier/prettier`、`no-console`、`@typescript-eslint/no-unused-vars` 等）。

### 推荐执行方式

按文件类型选择对应命令（在 `d:\www\admin-web\web` 目录下运行）：

- TypeScript / JavaScript 文件（`.ts`、`.tsx`、`.js`、`.jsx`）：

  ```powershell
  npx prettier --write "<文件相对路径>" ; npx eslint --fix "<文件相对路径>"
  ```

- Vue 单文件组件（`.vue`）：

  ```powershell
  npx stylelint --fix "<文件相对路径>" ; npx prettier --write "<文件相对路径>" ; npx eslint --fix "<文件相对路径>"
  ```

- 样式文件（`.less`、`.css`）：

  ```powershell
  npx stylelint --fix "<文件相对路径>" ; npx prettier --write "<文件相对路径>"
  ```

### 批量格式化（可选）

如果一次修改了多个文件，可以使用 glob 一次性处理：

```powershell
npx prettier --write "src/**/*.{ts,tsx,js,jsx,vue,less,css}" ; npx eslint --fix "src/**/*.{ts,tsx,js,jsx,vue}"
```

### 规则要点

- 修改完代码 → **立即运行**对应的格式化命令，再交付结果。
- 不要让 `prettier/prettier`、`no-console`、`no-unused-vars` 等 ESLint 告警保留在代码中。
- 调试用的 `console.xxx` 请在提交前移除；如确需保留，使用 `// eslint-disable-next-line no-console` 显式声明。
- 未使用的导入、变量必须删除。

## 4. 与 lint-staged 的关系

仓库已配置 husky + lint-staged，会在 `git commit` 时自动对暂存文件执行 prettier / eslint / stylelint。
本规则要求在**修改后立刻**执行格式化，而不是等到提交时，避免开发期间被 vite-plugin-eslint 的告警刷屏。
