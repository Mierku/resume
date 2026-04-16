# Resume Builder Agent Guide

本目录的样式与组件维护请遵守以下规则（重点是 SCSS 分层与可维护性）。

## 1) 样式分层（必须）

`ResumeBuilderClient.tsx` 是全局样式唯一入口，按顺序导入：

1. `builder.scss`（全局基础层）
2. `workbench/workbench-layout.scss`（工作台布局与主题覆盖）
3. 页面级/组件级全局样式（如 `ResumeBuilderClient.scss`、`ResumeBuilderToolbar.scss` 等）
4. 各组件 `*.module.scss`（局部样式）

`builder.scss` 内再次分层：

- `styles/tokens.scss`：主题变量 / 语义变量（只放 token，不写业务组件外观）
- `styles/side-panel-base.scss`：侧栏控件基线（输入框、placeholder、card 等）
- `styles/menu-scroll-shell.scss`：通用菜单/滚动容器基线
- `styles/motion-reduce.scss`：`prefers-reduced-motion` 统一降级

## 2) SCSS 写法规范

- 全局选择器统一挂在 `.resume-builder-scope` 下，避免泄漏到站点其它页面。
- 类名前缀统一使用 `resume-`（状态类除外，如 `is-*`）。
- 嵌套层级建议 **不超过 3 层**；超过时拆分为独立类。
- 禁止在组件样式里硬编码大量颜色，优先使用 token：`var(--builder-*)` / `var(--control-*)`。
- 状态样式用修饰类：`.is-active` / `.is-disabled`，避免写长链路选择器。
- 响应式写法保持“就近声明”：媒体查询跟随组件块，避免文件尾部大杂烩。

## 3) 何时用 global.scss / module.scss

- **module.scss**：组件私有结构样式（默认优先）
- **global scss**：跨组件共享 class（例如 `resume-scroll-shell`、`resume-item-menu-*`）或历史兼容 class

新增全局 class 前先确认是否已经存在同义 class，避免重复实现。

## 4) 变更前后检查

每次改动后至少执行：

- `pnpm exec tsc --noEmit`
- `pnpm exec sass --no-source-map <changed-scss-file>`

如改动到全局样式入口，再补做页面回归（工具栏、左侧工具栏、编辑面板、预览区）。
