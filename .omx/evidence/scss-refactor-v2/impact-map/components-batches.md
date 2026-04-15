# Components Batches — Impact Map

- Lane owner: `worker-3`
- Comparison base: `5c61c5e4e28ee231744e47046cb73788f6e3a2e9`
- Snapshot head: `7ba25b724688d471805529483baffe95b605d6d6`

## Scope verdict

- **PASS** — changed product-code paths stay within `components/**` for this lane review.
- **PASS** — no components-lane diff was detected under `server/**`, `lib/**`, `prisma/**`, or `app/api/**`.

## Surface map

### 1) Dashboard surfaces

Affected TSX:

- `components/dashboard/AccountBindingPanel.tsx`
- `components/dashboard/AccountSection.tsx`
- `components/dashboard/AdminUsersSection.tsx`
- `components/dashboard/DashboardWorkbench.tsx`
- `components/dashboard/DataSourcesSection.tsx`
- `components/dashboard/ResumesSection.tsx`
- `components/dashboard/TrackingSection.tsx`

Affected styles:

- `components/dashboard/account-binding.module.scss`
- `components/dashboard/admin-users-section.module.scss`
- `components/dashboard/dashboard-workbench.module.scss`

User-visible impact:

- dashboard side/navigation shell
- account binding panel
- admin users section
- resume/data-source/tracking panels

Audit note:

- TSX changes are limited to stylesheet import rewires from `.css` to `.scss`.

### 2) Legal document surface

Affected TSX:

- `components/legal/LegalDocumentPage.tsx`

Affected styles:

- `components/legal/legal-document.module.scss`

User-visible impact:

- legal document page typography/layout shell

Audit note:

- TSX change is limited to stylesheet import rewiring.

### 3) Resume builder editor + workbench surfaces

Affected TSX:

- `components/resume-builder/ResumeBuilderClient.tsx`
- `components/resume-builder/controls/ResumeColorPickerControl/ResumeColorPickerControl.tsx`
- `components/resume-builder/controls/RichTextEditor/RichTextEditor.tsx`
- `components/resume-builder/controls/ToolSliderField/ToolSliderField.tsx`
- `components/resume-builder/layout/ResumeBuilderToolbar/ResumeBuilderToolbar.tsx`
- `components/resume-builder/panels/AIChatPanel/AIChatPanel.tsx`
- `components/resume-builder/panels/HeightDebugPanel/HeightDebugPanel.tsx`
- `components/resume-builder/panels/LayoutAndStylePanel/LayoutAndStylePanel.tsx`
- `components/resume-builder/primitives.tsx`
- `components/resume-builder/workbench/ResumeOverlayWorkbench/ResumeOverlayWorkbench.tsx`
- `components/resume-builder/workbench/ResumePreviewWorkspace/ResumePreviewWorkspace.tsx`
- `components/resume-builder/workbench/ResumeToolRail/ResumeToolRail.tsx`

Affected styles:

- `components/resume-builder/builder-theme.scss`
- `components/resume-builder/controls/ResumeColorPickerControl/ResumeColorPickerControl.module.scss`
- `components/resume-builder/controls/RichTextEditor/RichTextEditor.module.scss`
- `components/resume-builder/controls/ToolSliderField/ToolSliderField.module.scss`
- `components/resume-builder/panels/AIChatPanel/AIChatPanel.module.scss`
- `components/resume-builder/panels/HeightDebugPanel/HeightDebugPanel.module.scss`
- `components/resume-builder/panels/LayoutAndStylePanel/LayoutAndStylePanel.module.scss`
- `components/resume-builder/panels/shared/PanelControlPrimitives.module.scss`
- `components/resume-builder/workbench/ResumeOverlayWorkbench/ResumeOverlayWorkbench.module.scss`
- `components/resume-builder/workbench/ResumePreviewWorkspace/ResumePreviewWorkspace.module.scss`
- `components/resume-builder/workbench/ResumeToolRail/ResumeToolRail.module.scss`
- `components/resume-builder/workbench/workbench-layout.scss`

User-visible impact:

- resume editor left rail / side panels
- preview dock / preview workspace / overlay workbench
- builder toolbar
- builder controls/panels (layout, AI, debug, color picker, rich text)
- basics photo upload / preview control

Audit notes:

- Most TSX edits are stylesheet import swaps and className rewires needed for module ownership.
- `ResumeBuilderClient.tsx` also introduces a new `photoPanelExpanded` local state and a collapsible photo-management shell; this is a **parity-sensitive deviation** from pure className rewiring and needs integrated visual/interaction signoff.
- `ResumeOverlayWorkbench.tsx` + `ResumePreviewWorkspace.tsx` move editor-width/preview-padding styling from root CSS-variable mutation to prop-driven inline styles; this appears presentation-oriented but still needs manual resize parity validation.
- `resume-builder-mono` body-class removal landed in an earlier refactor (`c5be1e3`) and remains relevant when validating builder typography parity against pre-refactor snapshots.

### 4) Additional components SCSS covered by the depth audit

These current SCSS files were included in the components-lane nesting scan even though they are not part of the chosen `base...head` diff slice:

- `components/ChromeWindow/ChromeWindow.module.scss`
- `components/resume-reactive-preview/preview.module.scss`
- `components/resume-reactive-preview/templates/styles/composed-template-renderer.module.scss`
- `components/resume-reactive-preview/templates/styles/headers/header-1.module.scss`
- `components/resume-reactive-preview/templates/styles/headers/header-2.module.scss`
- `components/resume-reactive-preview/templates/styles/headers/header-3.module.scss`
- `components/resume-reactive-preview/templates/styles/headers/header-4.module.scss`
- `components/resume-reactive-preview/templates/styles/headers/header-5.module.scss`
- `components/resume-reactive-preview/templates/styles/headers/header-photo.module.scss`

Reason:

- The plan’s lane boundary is `components/**`, so the current nesting scan was performed over the full current components SCSS surface, not just the chosen diff slice.
