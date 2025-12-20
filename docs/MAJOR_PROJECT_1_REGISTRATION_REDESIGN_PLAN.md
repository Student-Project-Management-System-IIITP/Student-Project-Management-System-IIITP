# Major Project 1 Registration Page - Complete Redesign Plan

## Overview
This document outlines the complete redesign plan for the Major Project 1 registration page, making it consistent with the Sem 5 Minor Project 2 registration page design system and layout structure.

## Current State Analysis

### Current Structure
- **Layout**: Single-column, centered layout (`max-w-4xl mx-auto`)
- **Steps**: 
  - Type 1 (Group): Step 3 (Group Verification) → Step 4 (Project Details) → Step 5 (Faculty Preferences)
  - Type 2 (Solo): Step 1 (Project Details) → Step 2 (Faculty Preferences)
- **Design**: Traditional form layout with large headers, progress indicator at top
- **Right Sidebar**: None - all content in single column
- **Icons**: Mix of SVG icons and emojis
- **Spacing**: Large padding and margins, lots of whitespace

### Issues Identified
1. No 2-column layout - all content cramped in single column
2. Excessive whitespace and margins
3. Large headers taking up too much vertical space
4. No right sidebar with helpful information
5. Member cards in Step 3 are too verbose and take up too much space
6. Project details form (Step 4) uses horizontal layout instead of vertical stacking
7. Faculty preferences section lacks equal-height containers and proper scrolling
8. Missing Feather Icons - using SVG and emojis instead
9. No independent scrolling columns
10. Progress indicator is separate from main content

## Target Design (Based on Sem 5 Minor Project 2 Registration)

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Header (Compact: Title, Subtitle, Close Button)             │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│  LEFT COLUMN (65%)       │  RIGHT COLUMN (35%)              │
│  - Step Card             │  - Registration Progress          │
│  - Step Content          │  - About Major Project 1         │
│  - Navigation Buttons     │  - Tips/Checklist                 │
│                          │                                  │
│  (Scrollable)            │  (Scrollable)                     │
│                          │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

### Key Design Principles
1. **2-Column Layout**: 65:35 ratio (left:right) with independent scrolling
2. **Full-Width Utilization**: Remove side margins, use 100% screen width
3. **Compact Headers**: Minimal header strip at top
4. **Feather Icons**: Replace all SVG icons and emojis with Feather Icons
5. **Card-Based Design**: All sections in cards with consistent styling
6. **Independent Scrolling**: Each column scrolls independently
7. **No Page-Level Scrolling**: Main container has `overflow-hidden`, only columns scroll
8. **Consistent Spacing**: Use `gap-3` or `gap-4` between sections
9. **Modern Color Scheme**: Use primary, secondary, success, warning, error, info, neutral colors

## Detailed Component Redesign

### 1. Page Structure

#### Main Container
```jsx
<Layout>
  <div className="min-h-[calc(100vh-64px)] bg-surface-200 overflow-hidden flex flex-col">
    {/* Header */}
    {/* Main Content Grid */}
  </div>
</Layout>
```

#### Header (Compact)
- **Height**: Minimal (`py-3 px-4`)
- **Content**: 
  - Title: "Major Project 1 – Registration" (or "Major Project 2 – Registration" for Sem 8)
  - Subtitle: Brief description
  - Close button (FiX icon) - icon only
- **Styling**: `bg-white border-b border-neutral-200`

#### Main Content Grid
```jsx
<div className="flex-1 min-h-0 w-full">
  <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 flex-1 min-h-0 px-3 py-3">
    {/* Left Column */}
    {/* Right Column */}
  </div>
</div>
```

#### Left Column (65%)
- **Width**: `flex-[0.65]` (or `lg:col-span-8` if using grid)
- **Scrolling**: `overflow-y-auto custom-scrollbar h-full min-h-0`
- **Padding**: `pr-1` (for scrollbar spacing)
- **Content**:
  - Step Card (current step content)
  - Navigation buttons (Back/Next/Submit)

#### Right Column (35%)
- **Width**: `flex-[0.35]` (or `lg:col-span-4` if using grid)
- **Scrolling**: `overflow-y-auto custom-scrollbar h-full min-h-0`
- **Padding**: `pl-1` (for scrollbar spacing)
- **Margin**: `mt-4 lg:mt-0` (spacing on mobile)
- **Content**:
  - Registration Progress Card
  - About Major Project 1 Card
  - Tips/Reminders Card

### 2. Step 3: Group Member Verification (Type 1 Only)

#### Current Issues
- Large centered header
- Verbose member cards with lots of fields
- Group size summary in separate card
- Large "Important Note" banner

#### Redesign
- **Remove**: Large centered header
- **Compact Header**: "Step 3 · Group Member Verification" with short description
- **Group Size Summary**: Slim card with FiUsers icon, showing `current / required range`
- **Read-only Notice**: Compact FiInfo note (similar to Sem 5)
- **Member Cards**: 
  - Inline, compact design
  - Avatar with initial or FiStar/FiUser icon
  - Name, MIS number, Branch in one line
  - Email and Contact in second line (if needed)
  - Leader badge inline with name
  - Remove redundant labels and borders
- **Styling**: `bg-white border border-neutral-200 rounded-lg px-3 py-2.5`

### 3. Step 4: Project Details

#### Current Issues
- Large centered header
- Title and Domain in horizontal layout
- Large form inputs
- Custom domain input styling inconsistent

#### Redesign
- **Remove**: Large centered header
- **Compact Header**: "Step 4 · Project Details" with short description
- **Input Layout**: Stack vertically (`space-y-5`)
  - Title input (full width)
  - Domain dropdown (full width)
  - Custom domain input (if "Other" selected)
- **Input Styling**: 
  - Smaller padding (`px-3 py-2.5`)
  - Neutral colors
  - Compact error messages (`text-xs`)
- **Dropdown**: Custom SVG arrow, `appearance-none`, `overflow-visible` parent
- **Tip**: Short text tip about "TBD" instead of emoji

### 4. Step 5: Faculty Preferences

#### Current Issues
- Instructions card too large
- Two-column layout but unequal heights
- No proper scrolling containers
- Using SVG icons instead of Feather Icons
- Missing icons in some places

#### Redesign
- **Instructions Card**: More compact with FiInfo icon
- **Equal Height Sections**: 
  - Both "Your Preferences" and "Available Faculty" use `h-[22rem]`
  - `flex flex-col` structure
  - Headers and search are `flex-shrink-0`
  - Lists are `flex-1 min-h-0 overflow-y-auto`
- **Icons**:
  - FiUsers for preferences header
  - FiUser for available faculty header
  - FiChevronUp/FiChevronDown for move buttons
  - FiX for remove button
  - FiSearch for search input
  - FiPlus for add faculty
  - FiLoader for loading states
  - FiUserPlus for empty state
  - FiAlertTriangle for warnings
- **Search Input**: Icon inside input field
- **Spacing**: Reduced (`gap-4`, `space-y-3`)
- **Remove**: Bottom message about selecting exactly X preferences

### 5. Right Column Cards

#### Registration Progress Card
- **Header**: FiTarget icon, "Step X of 5" (or "Step X of 2" for Type 2)
- **Content**: 
  - List of steps with FiCheckCircle for completed
  - Current step highlighted
  - Pending steps shown as empty circles
- **Styling**: `bg-white rounded-lg border border-neutral-200 shadow-sm`

#### About Major Project 1 Card
- **Header**: FiInfo icon, "About Major Project 1 Registration"
- **Content**: 
  - Key points about the registration process
  - Group requirements (for Type 1)
  - Faculty allocation process
- **Styling**: `bg-info-50 border border-info-200 rounded-lg`
- **Important**: Should NOT stretch to bottom (remove `flex-1`)

#### Tips/Reminders Card
- **Header**: FiAlertCircle or FiZap icon, "Tips & Reminders"
- **Content**: 
  - Dynamic tips based on current step
  - Best practices
  - Common mistakes to avoid
- **Styling**: `bg-warning-50 border border-warning-200 rounded-lg`

### 6. Step Card (Left Column)

#### Structure
```jsx
<div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
  <div className="px-4 py-3 border-b border-neutral-200">
    <h2 className="text-sm font-semibold text-neutral-900">
      Step {currentStep} · {Step Name}
    </h2>
    <p className="text-xs text-neutral-600 mt-0.5">
      {Short description}
    </p>
  </div>
  <div className="px-4 py-3 flex-1 min-h-0 overflow-visible">
    {/* Step Content */}
  </div>
</div>
```

### 7. Navigation Buttons

#### Location
- At the bottom of the left column step card
- Or as a separate section below the step card

#### Styling
- Compact buttons (`px-4 py-2.5`)
- Primary color for Next/Submit
- Neutral for Back/Cancel
- Icons where appropriate (FiArrowLeft for Back)

### 8. Restoration Banner

#### Current
- Large banner with close button
- Takes up significant space

#### Redesign
- Compact info banner (`bg-info-50 border border-info-200`)
- Auto-dismiss after 5 seconds
- Smaller text (`text-xs`)
- FiInfo icon

### 9. Group Information Banner (Type 1 Only)

#### Current
- Large green banner with emoji
- Takes up space before form

#### Redesign
- Move to right column (if space allows)
- Or make more compact
- Use FiCheckCircle icon instead of emoji
- Smaller text

### 10. Progress Indicator

#### Current
- Separate section above form
- Takes up vertical space

#### Redesign
- **Option 1**: Remove entirely (progress shown in right column)
- **Option 2**: Compact horizontal bar in header
- **Option 3**: Small indicator in right column only

## Implementation Checklist

### Phase 1: Layout Structure
- [ ] Wrap component in Layout
- [ ] Create 2-column flex layout (65:35)
- [ ] Set up independent scrolling for both columns
- [ ] Remove page-level scrolling
- [ ] Create compact header
- [ ] Ensure 100% width utilization

### Phase 2: Left Column - Step 3
- [ ] Redesign group member verification
- [ ] Create compact member cards
- [ ] Add group size summary card
- [ ] Replace emojis with Feather Icons
- [ ] Improve spacing and layout

### Phase 3: Left Column - Step 4
- [ ] Redesign project details form
- [ ] Stack inputs vertically
- [ ] Improve input styling
- [ ] Fix dropdown arrows
- [ ] Add compact tip

### Phase 4: Left Column - Step 5
- [ ] Redesign faculty preferences section
- [ ] Create equal-height containers
- [ ] Add proper scrolling
- [ ] Replace all icons with Feather Icons
- [ ] Improve search and filter UI
- [ ] Remove bottom message

### Phase 5: Right Column
- [ ] Create Registration Progress card
- [ ] Create About Major Project 1 card
- [ ] Create Tips/Reminders card
- [ ] Ensure cards don't stretch
- [ ] Add proper icons

### Phase 6: General Improvements
- [ ] Replace all SVG icons with Feather Icons
- [ ] Update color scheme
- [ ] Improve spacing consistency
- [ ] Add custom scrollbar styling
- [ ] Test responsive behavior
- [ ] Ensure no functionality is broken

### Phase 7: Validation & Testing
- [ ] Test all steps work correctly
- [ ] Verify form persistence
- [ ] Test validation logic
- [ ] Check responsive design
- [ ] Verify scrolling behavior
- [ ] Test with both Type 1 and Type 2 (Sem 8)

## Special Considerations

### Sem 8 Type 2 (Solo Projects)
- Only 2 steps: Project Details → Faculty Preferences
- No group verification step
- Right column should reflect solo project context
- Progress tracker shows 2 steps instead of 5

### Sem 8 Type 1 (Group Projects)
- Same structure as Sem 7 Major Project 1
- 3 steps: Group Verification → Project Details → Faculty Preferences
- Right column should mention Sem 8 Major Project 2

### Validation Logic
- Keep existing validation logic intact
- Ensure validation messages are clear
- Maintain access control checks

### Form Persistence
- Keep localStorage persistence
- Use semester-specific keys
- Clear on successful submission

## Icons to Use

### Feather Icons Required
- `FiCheckCircle` - Completed steps, success states
- `FiInfo` - Information, notices
- `FiTarget` - Progress tracking
- `FiUsers` - Groups, members
- `FiUser` - Individual users
- `FiStar` - Leader role
- `FiMail` - Email
- `FiPhone` - Contact number
- `FiFileText` - Documents, forms
- `FiChevronUp` - Move up
- `FiChevronDown` - Move down
- `FiX` - Close, remove
- `FiPlus` - Add
- `FiSearch` - Search
- `FiLoader` - Loading states
- `FiUserPlus` - Add user
- `FiAlertTriangle` - Warnings
- `FiAlertCircle` - Alerts
- `FiHash` - MIS numbers
- `FiArrowLeft` - Back navigation
- `FiZap` - Tips, quick actions

## Color Scheme

### Primary Colors
- `primary-50` to `primary-900` - Main actions, links
- `blue-50` to `blue-900` - Information, primary actions

### Status Colors
- `success-50` to `success-900` - Success states, completed
- `warning-50` to `warning-900` - Warnings, tips
- `error-50` to `error-900` - Errors, required fields
- `info-50` to `info-900` - Information, notices

### Neutral Colors
- `neutral-50` to `neutral-900` - Text, borders, backgrounds
- `surface-50` to `surface-900` - Page backgrounds

## Responsive Behavior

### Mobile (< 1024px)
- Stack columns vertically
- Full width for both columns
- Maintain scrolling within each section
- Compact spacing

### Desktop (>= 1024px)
- 2-column layout (65:35)
- Independent scrolling
- Optimal spacing

## Success Criteria

1. ✅ Layout matches Sem 5 Minor Project 2 registration page
2. ✅ All icons are Feather Icons (no SVG, no emojis)
3. ✅ Both columns scroll independently
4. ✅ No page-level scrolling
5. ✅ 100% width utilization
6. ✅ Compact, modern design
7. ✅ All functionality preserved
8. ✅ Responsive design works
9. ✅ Form persistence works
10. ✅ Validation works correctly

## Notes

- This redesign should maintain all existing functionality
- Focus on visual consistency with Sem 5 registration page
- Ensure accessibility is not compromised
- Test thoroughly with both Sem 7 and Sem 8 scenarios
- Consider Type 1 and Type 2 differences for Sem 8

