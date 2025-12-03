# React Icons Usage Guide

## Installation
React Icons is already installed in the project:
```bash
npm install react-icons
```

## Why React Icons?
- **Consistency**: Single library for all icons across the project
- **Performance**: Tree-shaking support - only imports icons you use
- **Variety**: Includes popular icon sets (Feather, Font Awesome, Material Design, etc.)
- **Flexibility**: Easy to style with Tailwind classes

## Recommended Icon Set: Feather Icons (Fi) ⭐

**Use Feather Icons as the PRIMARY icon set for the entire project.**

```jsx
import { FiEye, FiEyeOff, FiUser, FiMail, FiHome, FiSettings } from 'react-icons/fi';
```

### Why Feather Icons?
- ✨ **Modern & Elegant**: Clean, minimalist design with consistent 24x24 grid
- 🎨 **Beautiful**: Simply beautiful open source icons
- 📦 **Perfect Size**: 280+ carefully crafted icons
- 🔄 **Well-Maintained**: Stable and widely adopted
- 💎 **Industry Standard**: Used by GitHub, Stripe, and many modern applications
- 🎯 **Perfect for Tailwind**: Clean strokes work beautifully with utility-first CSS
- ⚡ **Lightweight**: Small bundle size with excellent performance

## Common Feather Icons

### Authentication & User
```jsx
import { 
  FiEye,            // Show password
  FiEyeOff,         // Hide password
  FiUser,           // User profile
  FiUsers,          // Multiple users/groups
  FiMail,           // Email
  FiLock,           // Password/Security
  FiLogIn,          // Login
  FiLogOut,         // Logout
  FiUserPlus,       // Sign up
  FiShield,         // Security/Admin
} from 'react-icons/fi';
```

### Navigation
```jsx
import { 
  FiHome,           // Home/Dashboard
  FiChevronRight,   // Arrow right
  FiChevronLeft,    // Arrow left
  FiChevronDown,    // Dropdown
  FiArrowRight,     // Next/Continue
  FiArrowLeft,      // Back
  FiMenu,           // Mobile menu
  FiX,              // Close
} from 'react-icons/fi';
```

### Actions
```jsx
import { 
  FiPlus,           // Add/Create
  FiEdit,           // Edit (or FiEdit2, FiEdit3)
  FiTrash2,         // Delete
  FiSave,           // Save
  FiDownload,       // Download
  FiUpload,         // Upload
  FiCopy,           // Copy
  FiCheck,          // Confirm/Done
  FiX,              // Cancel/Close
  FiSearch,         // Search
  FiFilter,         // Filter
  FiRefreshCw,      // Refresh
} from 'react-icons/fi';
```

### Status & Feedback
```jsx
import { 
  FiCheckCircle,    // Success
  FiXCircle,        // Error
  FiAlertCircle,    // Warning
  FiInfo,           // Information
  FiAlertTriangle,  // Alert/Caution
  FiClock,          // Pending/Time
  FiLoader,         // Loading (with spin)
} from 'react-icons/fi';
```

### Files & Documents
```jsx
import { 
  FiFile,           // File
  FiFileText,       // Document
  FiFolder,         // Folder
  FiFolderPlus,     // Add folder
  FiImage,          // Image file
  FiPaperclip,      // Attachment
} from 'react-icons/fi';
```

### Communication
```jsx
import { 
  FiMessageCircle,  // Chat/Comment
  FiBell,           // Notifications
  FiSend,           // Send message
  FiPhone,          // Phone
  FiVideo,          // Video call
} from 'react-icons/fi';
```

### Settings & Configuration
```jsx
import { 
  FiSettings,       // Settings
  FiSliders,        // Preferences/Filters
  FiCalendar,       // Calendar/Date
  FiClock,          // Time
  FiDatabase,       // Data/Storage
  FiServer,         // Server/Backend
} from 'react-icons/fi';
```

## Icon Sizing with Tailwind

```jsx
<FiUser className="w-4 h-4" />    // 16px - Small (inline text)
<FiUser className="w-5 h-5" />    // 20px - Medium (inputs, buttons) ⭐ Default
<FiUser className="w-6 h-6" />    // 24px - Large (cards, headers)
<FiUser className="w-8 h-8" />    // 32px - XL (feature cards)
<FiUser className="w-12 h-12" />  // 48px - 2XL (hero sections)
```

## Color Classes

```jsx
// Neutral (default)
<FiUser className="text-neutral-400" />  // Placeholder/Disabled
<FiUser className="text-neutral-500" />  // Inactive
<FiUser className="text-neutral-600" />  // Default
<FiUser className="text-neutral-700" />  // Active

// Primary (actions, links)
<FiCheck className="text-primary-600" />

// Semantic colors
<FiCheckCircle className="text-success-600" />  // Success
<FiXCircle className="text-error-600" />        // Error
<FiAlertCircle className="text-warning-600" />  // Warning
<FiInfo className="text-info-600" />            // Info
```

## Common Patterns

### Password Toggle (Eye Icons)
```jsx
import { FiEye, FiEyeOff } from 'react-icons/fi';

<button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
>
  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
</button>
```

### Icon Buttons
```jsx
import { FiSettings } from 'react-icons/fi';

<button className="p-2 rounded-lg hover:bg-neutral-100 transition-colors">
  <FiSettings className="w-5 h-5 text-neutral-600" />
</button>
```

### Icon with Text (Button)
```jsx
import { FiArrowRight } from 'react-icons/fi';

<button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg">
  <span>Continue</span>
  <FiArrowRight className="w-5 h-5" />
</button>
```

### Status Badge with Icon
```jsx
import { FiCheckCircle } from 'react-icons/fi';

<div className="flex items-center gap-2 px-3 py-1.5 bg-success-100 text-success-700 rounded-full text-sm">
  <FiCheckCircle className="w-4 h-4" />
  <span>Completed</span>
</div>
```

### Loading Spinner
```jsx
import { FiLoader } from 'react-icons/fi';

<button disabled className="flex items-center gap-2">
  <FiLoader className="w-5 h-5 animate-spin" />
  <span>Loading...</span>
</button>
```

### Search Input
```jsx
import { FiSearch } from 'react-icons/fi';

<div className="relative">
  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
  <input
    type="text"
    className="pl-10 pr-4 py-2 border rounded-lg"
    placeholder="Search..."
  />
</div>
```

### Navigation Item (Active/Inactive)
```jsx
import { FiHome } from 'react-icons/fi';

<Link
  to="/dashboard"
  className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
    isActive ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-50'
  }`}
>
  <FiHome className="w-5 h-5" />
  <span>Dashboard</span>
</Link>
```

## Best Practices

1. **Always use Feather Icons (Fi)** - Don't mix icon sets unless absolutely necessary
2. **Consistent Sizing** - Use `w-5 h-5` (20px) as the default for most UI elements
3. **Semantic Colors** - Match icon colors to their purpose
4. **Add Transitions** - Icons should have hover/active states
5. **Accessibility** - Include `aria-label` for icon-only buttons
6. **Import Specifically** - Only import icons you need for better tree-shaking

## Example: Complete Login Form

```jsx
import React, { useState } from 'react';
import { FiEye, FiEyeOff, FiMail, FiLock, FiArrowRight, FiLoader } from 'react-icons/fi';

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <form className="space-y-4">
      {/* Email Input */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Email Address
        </label>
        <div className="relative">
          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="email"
            className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Enter your email"
          />
        </div>
      </div>

      {/* Password Input */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Password
        </label>
        <div className="relative">
          <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            className="w-full pl-10 pr-12 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
          >
            {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
      >
        {isLoading ? (
          <>
            <FiLoader className="w-5 h-5 animate-spin" />
            <span>Signing In...</span>
          </>
        ) : (
          <>
            <span>Sign In</span>
            <FiArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
};
```

## Icon Stroke Width
Feather icons have a default stroke width of 2px. You can customize with inline styles if needed:

```jsx
<FiUser className="w-6 h-6" style={{ strokeWidth: 1.5 }} />  // Thinner
<FiUser className="w-6 h-6" style={{ strokeWidth: 2.5 }} />  // Thicker
```

## Resources
- [Feather Icons Official Site](https://feathericons.com/)
- [React Icons Documentation](https://react-icons.github.io/react-icons/)
- [Feather Icons Preview in React Icons](https://react-icons.github.io/react-icons/icons/fi/)

## Quick Icon Reference

| Category | Icons |
|----------|-------|
| **Navigation** | FiHome, FiMenu, FiX, FiChevronRight, FiArrowRight |
| **User** | FiUser, FiUsers, FiUserPlus, FiUserCheck |
| **Actions** | FiPlus, FiEdit, FiTrash2, FiSave, FiCheck, FiX |
| **Files** | FiFile, FiFileText, FiFolder, FiDownload, FiUpload |
| **Communication** | FiMail, FiMessageCircle, FiBell, FiPhone |
| **Status** | FiCheckCircle, FiXCircle, FiAlertCircle, FiInfo |
| **Settings** | FiSettings, FiSliders, FiFilter, FiSearch |

## Migration from Other Icon Sets

When updating existing code:
1. Replace emoji icons (👁️, 🙈, etc.) with Feather icons
2. Replace other icon set imports with Feather (Fi) imports
3. Update icon names with `Fi` prefix (e.g., `Eye` → `FiEye`)
4. Keep consistent sizing with Tailwind classes
