# Color Scheme Quick Reference Guide

## New Color Palette (Teal + Indigo + Warm Neutrals)

### Primary Colors (Teal - Main Actions)
```
primary-50:  #F0FDFA  - Ultra light backgrounds
primary-100: #CCFBF1  - Light backgrounds, badges
primary-200: #99F6E4  - Borders, hover states
primary-500: #14B8A6  - Main primary color
primary-600: #0D9488  - Primary hover
primary-700: #0F766E  - Primary pressed/active
```

### Secondary Colors (Indigo - Accents)
```
secondary-50:  #EEF2FF  - Light backgrounds
secondary-100: #E0E7FF  - Badges, subtle backgrounds
secondary-500: #6366F1  - Secondary actions
secondary-600: #4F46E5  - Secondary hover
secondary-700: #4338CA  - Secondary pressed
```

### Neutral Colors (Warm Grays)
```
neutral-50:  #FAFAF9  - Very light backgrounds
neutral-100: #F5F5F4  - Light backgrounds
neutral-200: #E7E5E4  - Borders, dividers
neutral-300: #D6D3D1  - Input borders
neutral-400: #A8A29E  - Placeholder text
neutral-500: #78716C  - Secondary text
neutral-600: #57534E  - Body text
neutral-700: #44403C  - Headings
neutral-800: #292524  - Dark backgrounds (navbar)
neutral-900: #1C1917  - Darkest
```

### Surface Colors (Cream/Warm Whites)
```
surface-50:  #FFFFFE  - Pure white
surface-100: #FEFDFB  - Card backgrounds
surface-200: #FBF9F7  - Page backgrounds
surface-300: #F7F5F3  - Section backgrounds
surface-400: #F0EEEC  - Hover states
```

### Accent Colors (Amber - Highlights)
```
accent-50:  #FFFBEB  - Light backgrounds
accent-100: #FEF3C7  - Badges
accent-500: #F59E0B  - Main accent
accent-600: #D97706  - Hover
accent-700: #B45309  - Pressed
```

---

## Quick Color Lookup

### Primary Actions (Buttons, Links)
```jsx
// Primary Button
className="bg-primary-600 hover:bg-primary-700 text-white"

// Primary Link
className="text-primary-600 hover:text-primary-700"

// Primary Badge
className="bg-primary-100 text-primary-700"
```

### Secondary Actions
```jsx
// Secondary Button
className="bg-surface-100 hover:bg-surface-200 text-neutral-700 border border-neutral-300"

// Secondary Badge
className="bg-secondary-100 text-secondary-700"
```

### Status Badges
```jsx
// Success (Active, Completed, Approved)
className="bg-success-100 text-success-700"

// Error (Error, Cancelled, Rejected)
className="bg-error-100 text-error-700"

// Warning (Pending, Submitted)
className="bg-warning-100 text-warning-700"

// Info (Registered, Scheduled)
className="bg-info-100 text-info-700"

// Neutral (Not Uploaded, Default)
className="bg-neutral-100 text-neutral-700"

// Accent (Special highlights)
className="bg-accent-100 text-accent-700"
```

### Backgrounds
```jsx
// Page Background
className="bg-surface-200"

// Card Background
className="bg-surface-100"

// Section Background (alternate)
className="bg-surface-300"

// Navbar Background
className="bg-neutral-800"

// Hero Gradient
className="bg-gradient-to-br from-surface-200 via-primary-50 to-secondary-50"
```

### Borders
```jsx
// Default Border
className="border border-neutral-200"

// Input Border
className="border border-neutral-300"

// Focus Border
className="border-primary-500 ring-2 ring-primary-100"
```

### Text Colors
```jsx
// Heading (H1)
className="text-neutral-800"

// Heading (H2, H3)
className="text-neutral-700"

// Body Text
className="text-neutral-600"

// Secondary Text
className="text-neutral-500"

// Muted Text
className="text-neutral-400"
```

---

## Component Patterns

### Cards
```jsx
// Standard Card
<div className="bg-surface-100 rounded-2xl p-6 shadow-sm border border-neutral-200">
  {/* Content */}
</div>

// Card with Hover Effect
<div className="bg-surface-100 rounded-2xl p-6 shadow-sm hover:shadow-lg border border-neutral-200 transition-all duration-300 hover:-translate-y-1">
  {/* Content */}
</div>
```

### Buttons
```jsx
// Primary
<button className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-600/20">
  Primary Button
</button>

// Secondary
<button className="px-6 py-3 bg-surface-100 hover:bg-surface-200 text-neutral-700 font-semibold rounded-xl border border-neutral-300 transition-all">
  Secondary Button
</button>

// Ghost
<button className="px-6 py-3 text-primary-600 hover:bg-primary-50 font-semibold rounded-xl transition-all">
  Ghost Button
</button>
```

### Icon Containers
```jsx
// Primary Icon
<div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
  <Icon className="w-6 h-6 text-white" />
</div>

// Secondary Icon
<div className="w-12 h-12 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center shadow-lg shadow-secondary-500/20">
  <Icon className="w-6 h-6 text-white" />
</div>

// Accent Icon
<div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent-500/20">
  <Icon className="w-6 h-6 text-white" />
</div>
```

### Badges/Pills
```jsx
// Primary Badge
<span className="text-xs font-semibold text-primary-700 bg-primary-100 px-3 py-1 rounded-full">
  Badge
</span>

// Secondary Badge
<span className="text-xs font-semibold text-secondary-700 bg-secondary-100 px-3 py-1 rounded-full">
  Badge
</span>

// Accent Badge
<span className="text-xs font-semibold text-accent-700 bg-accent-100 px-3 py-1 rounded-full">
  Badge
</span>
```

### Gradient Sections
```jsx
// Hero Gradient (Light)
<section className="bg-gradient-to-br from-surface-200 via-primary-50 to-secondary-50">
  {/* Content */}
</section>

// CTA Gradient (Dark)
<section className="bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700">
  {/* Content */}
</section>
```

---

## Role-Based Color Associations

| Role | Primary Color | Usage |
|------|--------------|-------|
| Students | `primary` (Teal) | Student portal, projects |
| Faculty | `secondary` (Indigo) | Faculty dashboard, evaluations |
| Admin | `accent` (Amber) | Admin controls, management |

---

## Color Contrast Guidelines

### Dark Text on Light Backgrounds
- Use `text-neutral-800` for headings
- Use `text-neutral-600` for body text
- Use `text-neutral-500` for secondary text
- Use `text-neutral-400` for muted/placeholder

### Light Text on Dark Backgrounds
- Use `text-white` for primary text
- Use `text-white/90` for secondary text
- Use `text-white/70` for muted text
- Use `text-neutral-300` for links

### Card vs Background Contrast
- Page background: `surface-200` (#FBF9F7)
- Card background: `surface-100` (#FEFDFB)
- This creates subtle but visible separation

---

## Notes

- Primary (Teal) is fresh and professional - use for main actions
- Secondary (Indigo) adds depth - use for accents and faculty
- Accent (Amber) draws attention - use sparingly for admin/highlights
- Surface colors are warm creams - softer than pure white
- Neutral colors are warm grays - less cold than blue-grays
- Use gradients for icon containers and CTAs to add polish
- Shadow colors should use the primary color (e.g., `shadow-primary-500/20`)
