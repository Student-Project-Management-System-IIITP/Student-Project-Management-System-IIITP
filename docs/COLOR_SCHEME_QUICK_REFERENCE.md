# Color Scheme Quick Reference Guide

## Quick Color Lookup

### Primary Actions (Buttons, Links, Active States)
```jsx
// Primary Button
className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white"

// Primary Link
className="text-primary-600 hover:text-primary-700"

// Active Navigation
className="bg-primary-600 text-white"
```

### Secondary Actions
```jsx
// Secondary Button
className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300"

// Secondary Link
className="text-secondary-600 hover:text-secondary-700"
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

// Neutral (Not Uploaded, Completed-neutral)
className="bg-neutral-100 text-neutral-700"

// Special (Faculty Allocated)
className="bg-purple-100 text-purple-700"
```

### Backgrounds
```jsx
// Page Background
className="bg-neutral-50"

// Card Background
className="bg-white"

// Input Background
className="bg-white" or "bg-neutral-50"

// Hover Background
className="hover:bg-neutral-100" or "hover:bg-primary-50"
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
className="text-neutral-900"

// Heading (H2, H3)
className="text-neutral-800"

// Body Text
className="text-neutral-600"

// Secondary Text
className="text-neutral-500"

// Muted Text
className="text-neutral-400"

// Placeholder
className="placeholder-neutral-400"
```

### Buttons
```jsx
// Primary
<button className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg transition-colors">
  Primary Button
</button>

// Secondary
<button className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 font-medium px-4 py-2 rounded-lg transition-colors">
  Secondary Button
</button>

// Success
<button className="bg-success-500 hover:bg-success-600 text-white font-medium px-4 py-2 rounded-lg transition-colors">
  Success Button
</button>

// Danger
<button className="bg-error-500 hover:bg-error-600 text-white font-medium px-4 py-2 rounded-lg transition-colors">
  Danger Button
</button>

// Ghost/Text
<button className="text-primary-600 hover:bg-primary-50 font-medium px-4 py-2 rounded-lg transition-colors">
  Ghost Button
</button>
```

### Cards
```jsx
<div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 hover:shadow-md transition-shadow">
  {/* Card content */}
</div>
```

### Input Fields
```jsx
<input 
  className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-700 placeholder-neutral-400"
  placeholder="Enter text..."
/>
```

### Tables
```jsx
// Table Header
<thead className="bg-neutral-100">
  <tr>
    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 border-b border-neutral-200">
      Header
    </th>
  </tr>
</thead>

// Table Row
<tbody>
  <tr className="hover:bg-primary-50 border-b border-neutral-200">
    <td className="px-4 py-3 text-sm text-neutral-600">
      Content
    </td>
  </tr>
</tbody>
```

### Alerts
```jsx
// Success Alert
<div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-lg">
  Success message
</div>

// Error Alert
<div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
  Error message
</div>

// Warning Alert
<div className="bg-warning-50 border border-warning-200 text-warning-700 px-4 py-3 rounded-lg">
  Warning message
</div>

// Info Alert
<div className="bg-info-50 border border-info-200 text-info-700 px-4 py-3 rounded-lg">
  Info message
</div>
```

### Loading States
```jsx
// Spinner
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>

// Skeleton
<div className="animate-pulse bg-neutral-200 rounded"></div>
```

### Navigation
```jsx
// Navbar
<nav className="bg-neutral-800 text-white">
  {/* Nav items */}
</nav>

// Active Nav Item
<Link className="bg-primary-600 text-white px-3 py-2 rounded">
  Active
</Link>

// Inactive Nav Item
<Link className="text-neutral-300 hover:text-white hover:bg-neutral-700 px-3 py-2 rounded">
  Inactive
</Link>
```

## Common Patterns

### Card with Hover Effect
```jsx
<div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 hover:shadow-md hover:border-primary-200 transition-all cursor-pointer">
  {/* Content */}
</div>
```

### Form Group
```jsx
<div className="mb-4">
  <label className="block text-sm font-medium text-neutral-700 mb-2">
    Label
  </label>
  <input 
    className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
    type="text"
  />
</div>
```

### Status Badge with Icon
```jsx
<div className="inline-flex items-center gap-2 bg-success-100 text-success-700 px-3 py-1 rounded-full text-sm font-medium">
  <CheckIcon className="w-4 h-4" />
  Active
</div>
```

### Modal
```jsx
<div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50">
  <div className="bg-white rounded-lg shadow-xl border border-neutral-200 max-w-md w-full p-6">
    {/* Modal content */}
  </div>
</div>
```

## Color Replacement Cheat Sheet

When updating existing code, use this mapping:

| Find | Replace With |
|------|--------------|
| `bg-blue-50` | `bg-primary-50` |
| `bg-blue-100` | `bg-primary-100` |
| `bg-blue-500` | `bg-primary-500` |
| `bg-blue-600` | `bg-primary-600` |
| `bg-blue-700` | `bg-primary-700` |
| `text-blue-600` | `text-primary-600` |
| `text-blue-700` | `text-primary-700` |
| `bg-gray-50` | `bg-neutral-50` |
| `bg-gray-100` | `bg-neutral-100` |
| `bg-gray-200` | `bg-neutral-200` |
| `bg-gray-300` | `bg-neutral-300` |
| `text-gray-600` | `text-neutral-600` |
| `text-gray-700` | `text-neutral-700` |
| `text-gray-800` | `text-neutral-800` |
| `border-gray-200` | `border-neutral-200` |
| `border-gray-300` | `border-neutral-300` |
| `bg-slate-800` | `bg-neutral-800` |
| `text-slate-300` | `text-neutral-300` |
| `bg-green-100` | `bg-success-100` |
| `text-green-800` | `text-success-700` |
| `bg-red-100` | `bg-error-100` |
| `text-red-800` | `text-error-700` |
| `bg-yellow-100` | `bg-warning-100` |
| `text-yellow-800` | `text-warning-700` |

## Notes

- Always use semantic color names (primary, success, error) instead of color names (blue, green, red)
- Maintain consistent spacing: use Tailwind's spacing scale (p-4, p-6, gap-4, etc.)
- Use transition classes for interactive elements: `transition-colors`, `transition-shadow`, etc.
- Ensure proper contrast ratios for accessibility
- Test hover and active states on all interactive elements

