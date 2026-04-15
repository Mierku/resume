# Gate G0 Visual Report

Status: `DRAFT`

## Capture contract

- Viewport: `1440x900`
- Themes: `light`, `dark`
- Areas: `header`, `toolbar`, `toolbar-panels`, `right-editor`, `tabs-sorting`
- Naming: `{area}-{state}-{theme}.png`

## Baseline capture table

| Area | State set | Light | Dark | Notes |
| --- | --- | --- | --- | --- |
| header | default, title-edit | PENDING | PENDING | Needs title-edit state for I-01. |
| toolbar | default, hover, active, disabled | PENDING | PENDING | Align with rapid-click path from I-02. |
| toolbar-panels | closed, open, repeated-toggle | PENDING | PENDING | Include panel shadow/layer state. |
| right-editor | default, focus, validation, blur | PENDING | PENDING | Cover editor input + blur state. |
| tabs-sorting | default, selected, dragging, drop-target | PENDING | PENDING | Include first/last drag edge cases. |

## Threshold reminder

- G0 is completeness-only.
- Later visual gates (G1, G3) require per-image diff `<= 0.50%`.
