# Codex Working Memory (User-Specified)

更新时间：2026-04-02

## 强制规则

1. 在 `template-5`（侧边栏模板）中：
- 侧边栏背景必须挂在 `aside` 内部伪元素（`t5Sidebar::before`），不要挂在 `root::before`。
- 侧边栏默认高度按整页高度展示。
- 左侧内容区默认只保留右侧内边距（不保留上/下/左内边距，除非用户明确要求）。

2. `getPreviewActionProps` 的使用规则：
- **不要**先写 `className` 再 `...getPreviewActionProps(...)`。
- 必须把样式类通过 `getPreviewActionProps` 的第三个参数传入。
- 如需多个类，用 `helpers.cx(...)` 组合后作为第三参数传入。

3. 组合化模板规则：
- 模板支持 `header/aside` 与 `section` 样式解耦组合。
- `template-5` 默认是“新 aside + section-1（template-1 的 section 风格）”。

4. Debug 规则：
- `template-5` 需要支持高度 debug。
- 赭红侧边栏模式下，高度计算只以右侧内容流（`data-template9-flow`）为准。

## 执行约束

- 每次改动 `template-5` 相关布局前，先检查本文件规则是否被破坏。
- 改完后至少运行一次 `npx tsc --noEmit`。
