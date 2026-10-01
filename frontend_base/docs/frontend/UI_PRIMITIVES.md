# UI Primitive Policy

IsKool uses shadcn/ui and Base UI deliberately. The goal is not to mix primitive systems randomly.

## Current Decision

Existing shadcn/ui components remain the owner for current production surfaces. Base UI is installed and available for future components where its primitives provide a clear accessibility or interaction advantage.

## Ownership Matrix

| Category | Current Owner | Notes |
| --- | --- | --- |
| Button | shadcn/ui | Existing visual language and variants. |
| Dialog | shadcn/ui | Keep one dialog system for now. |
| AlertDialog | shadcn/ui | Use for destructive confirmations. |
| Dropdown/Menu | shadcn/ui | Used by sidebar, profile, context switcher. |
| Popover | shadcn/ui | Existing component present. |
| Tooltip | shadcn/ui | Existing component present. |
| Tabs | shadcn/ui | Existing component present. |
| Select | shadcn/ui | Existing form usage. |
| Combobox | Base UI candidate | Use only when a real combobox workflow is implemented. |
| Checkbox | shadcn/ui | Existing forms. |
| Radio | shadcn/ui | Existing component present. |
| Switch | shadcn/ui | Existing settings pages. |
| Toast | shadcn/ui/Sonner | Existing sonner integration. |
| Sheet/Drawer | shadcn/ui | Sidebar/mobile patterns currently depend on it. |
| Form controls | shadcn/ui + React Hook Form | Keep field-level accessibility. |
| Command palette | cmdk + shadcn Dialog | Rewired to IsKool navigation. |
| Date picker | shadcn calendar | Existing component present; validate for mobile before finance/admissions use. |

## Rules

- Do not build a second modal/menu/select implementation without documenting why.
- Do not wrap every primitive. Add abstractions only for IsKool semantics or repeated behavior.
- Keep accessibility behavior from primitives intact.
- Server authorization and RLS are never replaced by disabled controls or hidden navigation.
