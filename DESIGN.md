# DESIGN.md — OpenHandi

Design system for OpenHandi personal AI assistant.
Inspired by Linear, Vercel, and Apple Human Interface Guidelines.

---

## Philosophy

> Precision over decoration. Every pixel must earn its place.

- **No gradients** on interactive elements. Use solid accent fills only.
- **No glow effects or shadows** on UI components. Use border contrast instead.
- **No emojis.** Use Lucide vector icons exclusively.
- **Language:** All UI copy must be in Spanish.
- **Whitespace is a feature.** Generous internal spacing, tight external spacing.

---

## Color Tokens

| Token               | Value                     | Usage                          |
|---------------------|---------------------------|--------------------------------|
| `--bg-base`         | `#0A0A0A`                 | Page background                |
| `--bg-surface`      | `#111111`                 | Cards, panels, modals          |
| `--bg-elevated`     | `#1A1A1A`                 | Inputs, hover states, code bg  |
| `--border`          | `rgba(255,255,255,0.08)`  | Default borders (1px only)     |
| `--border-strong`   | `rgba(255,255,255,0.14)`  | Focused/active borders         |
| `--text-primary`    | `#FAFAFA`                 | Headings, main content         |
| `--text-secondary`  | `#A1A1AA`                 | Labels, secondary copy         |
| `--text-muted`      | `#52525B`                 | Placeholders, metadata         |
| `--accent`          | `#DC2626`                 | CTA buttons, active indicators |
| `--accent-subtle`   | `rgba(220,38,38,0.08)`    | Active row/item backgrounds    |
| `--accent-border`   | `rgba(220,38,38,0.2)`     | Accent-adjacent borders        |

---

## Typography

- **Font:** `Inter` (Google Fonts) — clean, highly legible sans-serif
- **Monospace:** `JetBrains Mono` / `Fira Code` — used for cron schedules, logs, code
- **Sizes:** `xs`=12px, `sm`=13px, base=15px, `lg`=17px — lean and efficient
- **Weight:** 400 body, 500 labels, 600 headings. Avoid 700 unless display.

---

## Layout

- **App Shell:** Full-bleed, edge-to-edge. No outer margins on the app container.
- **Side Rail:** 220px wide, `--bg-base` background, 1px right border. No shadow.
- **Content Area:** Fills remaining space. Each view handles its own scroll.
- **Max content width:** `max-w-3xl` (768px) for prose/chat. Tables span full width.

---

## Components

### Navigation Items
```
color: var(--text-muted)
hover: bg rgba(255,255,255,0.04), color var(--text-secondary)
active: bg var(--bg-elevated), color var(--text-primary)
border-radius: 6px
padding: 8px 12px
font-size: 14px, font-weight: 500
```

### Buttons
- **btn-primary:** `background: var(--accent)`, white text, 1px border at 50% opacity
- **btn-ghost:** no background, hover adds `rgba(255,255,255,0.05)` bg + border
- **btn-outline:** 1px `var(--border)`, transparent bg, hover darkens border

### Input Fields
- Background: `var(--bg-surface)`, border `var(--border)`, focus ring: `rgba(220,38,38,0.08)`
- Placeholder: `var(--text-muted)`, font-size: `0.875rem`

### Badges
```
.badge:         neutral, border var(--border)
.badge-success: green-300, 15% green border, 6% green bg
.badge-error:   red-300, 15% red border, 6% red bg
.badge-running: blue-300, 15% blue border, 6% blue bg
```

### Chat Messages
- **User:** `bg: var(--bg-elevated)`, `border: 1px solid var(--border-strong)`, radius `12px 12px 4px 12px`
- **Assistant:** No bubble. Text renders directly on the base background.
- **Loading:** Three bouncing dots, colored `var(--text-muted)`

### Chat Input
- Auto-resizing `<textarea>`, max 200px height
- Container: `bg: var(--bg-surface)`, `border: 1px solid var(--border)`, radius `12px`
- Send button: `bg: var(--accent)` when has content, else `var(--bg-elevated)`

### Tables (Tasks Dashboard)
- Full-width, no side padding on container
- Header row: `border-bottom: 1px solid var(--border)`, text `var(--text-muted)`, `text-xs`
- Data rows: `border-bottom: 1px solid var(--border)`, hover `rgba(255,255,255,0.02)`
- Action buttons: hidden, revealed on row `group-hover`

---

## Do / Don't

| Do                                           | Don't                                     |
|----------------------------------------------|-------------------------------------------|
| Use 1px borders only                         | Use `shadow-lg` or box-shadows            |
| Keep backgrounds near-black (`#111`)         | Use glassmorphism heavy `backdrop-blur`   |
| Convey state with color and text only        | Add glowing orbs or radial bg effects     |
| Use tight letter-spacing on uppercase labels | Use gradient text                         |
| Keep interactions instant (<150ms)           | Animate entrance effects >200ms           |
