# Internship 1 Registration Page - Complete Redesign Plan

## Current State Analysis

### Current Structure
1. **Layout**: Single-column layout with `max-w-4xl` container
2. **Steps**: 2-step form
   - Step 1: Project Details (Title, Domain)
   - Step 2: Faculty Preferences (Select 1-5 faculty)
3. **Components**:
   - Eligibility status banner
   - Window status banner
   - Progress indicator (horizontal)
   - Step content in white card
   - Information card at bottom
4. **Faculty Selection**:
   - Two-column layout (Your Preferences | Available Faculty)
   - Search and filter functionality
   - Add/remove/reorder faculty preferences
   - Scrollable lists

### Issues Identified
1. ❌ Old single-column layout (not matching new design system)
2. ❌ Large whitespace and margins
3. ❌ No proper scrolling management (page-level scrolling)
4. ❌ SVG icons instead of Feather Icons
5. ❌ Information card at bottom (should be in right sidebar)
6. ❌ Progress indicator not integrated well
7. ❌ No compact header with close button
8. ❌ Faculty selection sections not equal height
9. ❌ Old color scheme and styling
10. ❌ No restoration banner for form state
11. ❌ Bottom message about selecting preferences (should be removed)

---

## Proposed Redesign

### Overall Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Header (Compact)                                             │
│ [← Back] Internship 1 Registration • Solo Project          │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ Main Content Area (2-Column Grid)                            │
│                                                               │
│ ┌──────────────────────┐  ┌──────────────────────┐          │
│ │ LEFT COLUMN (65%)    │  │ RIGHT COLUMN (35%)   │          │
│ │                      │  │                      │          │
│ │ • Restoration Banner │  │ • Registration       │          │
│ │   (if applicable)    │  │   Progress           │          │
│ │                      │  │                      │          │
│ │ • Eligibility Status │  │ • About Internship 1  │          │
│ │   Banner            │  │                      │          │
│ │                      │  │ • Tips & Guidelines  │          │
│ │ • Window Status     │  │                      │          │
│ │   Banner            │  │ • Important Notes    │          │
│ │                      │  │                      │          │
│ │ • Step Card         │  │                      │          │
│ │   ┌──────────────┐  │  │                      │          │
│ │   │ Step Header  │  │  │                      │          │
│ │   │ Step Content │  │  │                      │          │
│ │   │              │  │  │                      │          │
│ │   │ [Step 1/2]   │  │  │                      │          │
│ │   │              │  │  │                      │          │
│ │   └──────────────┘  │  │                      │          │
│ │                      │  │                      │          │
│ │ [Scrollable]         │  │ [Scrollable]         │          │
│ └──────────────────────┘  └──────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Layout Specifications

**Main Container:**
- `h-[calc(100vh-64px)]` - Fixed height accounting for navbar
- `bg-surface-200` - Background color
- `overflow-hidden` - Prevent page-level scrolling
- `flex flex-col` - Column layout

**Header:**
- Compact header strip
- Back button (FiArrowLeft)
- Title: "Internship 1 Registration" or "Internship 2 Registration"
- Subtitle: "Solo Project • Faculty Mentored"
- Close button (FiX) - navigates to dashboard

**Main Content Grid:**
- `lg:grid lg:grid-cols-12 gap-3 lg:gap-4 flex-1 min-h-0`
- Left Column: `lg:col-span-8` or `flex-[0.65]` (65% width)
- Right Column: `lg:col-span-4` or `flex-[0.35]` (35% width)
- Both columns: `h-full min-h-0 overflow-y-auto custom-scrollbar`

---

## Left Column Content

### 1. Restoration Banner (Conditional)
- **When**: Form data exists in localStorage
- **Style**: `bg-info-50 border border-info-200 rounded-lg p-3`
- **Content**: 
  - Icon: `FiInfo`
  - Message: "We found your previous progress. Click to restore."
  - Button: "Restore Previous Data"
- **Action**: Restore form state from localStorage

### 2. Eligibility Status Banner
- **Style**: 
  - Eligible: `bg-success-50 border border-success-200`
  - Not Eligible: `bg-error-50 border border-error-200`
- **Content**:
  - Icon: `FiCheckCircle` (success) or `FiAlertCircle` (error)
  - Title: "Eligible for Internship 1" or "Not Eligible"
  - Reason (if provided)
- **Position**: Top of left column

### 3. Window Status Banner (Conditional)
- **When**: Registration window is closed
- **Style**: `bg-warning-50 border border-warning-200 rounded-lg p-3`
- **Content**:
  - Icon: `FiAlertTriangle`
  - Message: "The registration window is currently closed. Please contact admin for more information."

### 4. Step Card
- **Container**: `bg-white rounded-xl shadow-sm border border-neutral-200`
- **Header Section**:
  - `px-4 py-3 border-b border-neutral-200`
  - Title: "Step X · [Step Name]"
  - Description: Short subtitle
- **Content Section**:
  - `px-4 py-3 flex-1 min-h-0 overflow-visible`
  - Contains step-specific content

#### Step 1: Project Details
- **Title Input**:
  - Label: "Proposed Title *"
  - Input: `px-3 py-2.5 border border-neutral-300 rounded-lg`
  - Placeholder: "Enter your proposed project title (you can write 'TBD' if not decided yet)"
  - Validation: Required, min 2 chars, max 200 chars
  - Tip: "Note: You can write 'TBD' if not decided yet. This can be changed later."

- **Domain Dropdown**:
  - Label: "Domain *"
  - Select: `px-3 py-2.5 border border-neutral-300 rounded-lg appearance-none`
  - Custom SVG arrow (downward)
  - Options: Same as current (Web Development, Mobile App, etc.)
  - Custom Domain Input (when "Other" selected):
    - Label: "Specify Domain *"
    - Input: Same styling as title
    - Required when "Other" is selected

- **Action Buttons**:
  - Cancel: `px-4 py-2.5 text-neutral-700 bg-white border border-neutral-300`
  - Continue: `px-4 py-2.5 bg-primary-600 text-white`
  - Disabled state for Continue when custom domain is empty

#### Step 2: Faculty Preferences
- **Instructions Card** (Compact):
  - `bg-info-50 border border-info-200 rounded-lg p-3 mb-4`
  - Icon: `FiInfo`
  - Title: "How to Select Faculty Preferences"
  - Bullet points:
    1. Browse Faculty: Use search or filter
    2. Add Faculty: Click to add to preferences
    3. Reorder: Use ↑ ↓ arrows
    4. Remove: Click × button
    5. Complete: Select exactly {limit} faculty
  - Warning: "⚠️ Required: You must select exactly {limit} faculty preferences"

- **Two-Column Layout**:
  - `grid grid-cols-1 lg:grid-cols-2 gap-4`
  - **Left: Your Preferences**
    - Header: "Your Preferences ({count}/{limit})"
    - Complete badge: Green checkmark when complete
    - Container: `h-[22rem] flex flex-col`
    - Header: `flex-shrink-0`
    - List: `flex-1 min-h-0 overflow-y-auto custom-scrollbar`
    - Empty State:
      - Icon: `FiUserPlus`
      - Message: "No faculty selected yet"
      - Instruction: "Click on faculty members from the right panel"
      - Warning: "⚠️ You need to select exactly {limit} faculty members"
    - Preference Cards:
      - Compact design: `px-3 py-2.5 bg-white border border-neutral-200 rounded-lg`
      - Number badge (1, 2, 3...)
      - Faculty name (with prefix)
      - Department
      - Actions: Move up/down (FiChevronUp/Down), Remove (FiX)
  
  - **Right: Available Faculty**
    - Header: "Available Faculty"
    - Container: `h-[22rem] flex flex-col`
    - Search/Filter Row: `flex-shrink-0`
      - Search Input: `px-3 py-2 border border-neutral-300 rounded-lg`
      - Search Icon: `FiSearch` inside input
      - Department Filter: Dropdown with custom arrow
    - Faculty List: `flex-1 min-h-0 overflow-y-auto custom-scrollbar`
    - Faculty Cards:
      - `px-3 py-2 bg-white border border-neutral-200 rounded-lg cursor-pointer hover:border-primary-300`
      - Faculty name (with prefix)
      - Department
      - Add icon: `FiPlus` or `FiUserPlus`

- **Action Buttons**:
  - Back: `px-4 py-2.5 text-neutral-700 bg-white border border-neutral-300`
  - Complete Registration: `px-6 py-3 bg-primary-600 text-white`
  - Disabled when preferences count ≠ limit or window closed
  - Loading state: `FiLoader` spinner

- **Remove Bottom Message**: 
  - Remove the conditional message at bottom: "Please select exactly {limit} faculty preferences..."

---

## Right Column Content

### 1. Registration Progress Card
- **Style**: `bg-surface-100 rounded-xl p-4 border border-neutral-200`
- **Header**:
  - Icon: `FiTarget`
  - Title: "Registration Progress"
  - Subtitle: "Step {current} of 2"
- **Progress Steps**:
  - Step 1: Project Details
    - Icon: `FiCheckCircle` (if completed) or empty circle
    - Title: "Project Details"
    - Status: "Completed" or "Pending"
  - Step 2: Faculty Preferences
    - Icon: `FiCheckCircle` (if completed) or empty circle
    - Title: "Faculty Preferences"
    - Status: "Completed" or "Pending"
- **Visual Progress Bar**: Thin progress bar showing completion percentage

### 2. About Internship 1 Card
- **Style**: `bg-info-50 rounded-xl p-4 border border-info-200`
- **Header**:
  - Icon: `FiInfo`
  - Title: "About Internship 1"
- **Content** (Bullet points):
  - Type: Solo project under faculty mentor
  - Eligibility: Students who have not completed approved 2-month summer internship
  - Faculty Preferences: Select exactly {limit} faculty members
  - Duration: Continues throughout Semester 7 (or Semester 8 for Sem 8 students)
  - Next Steps: After registration, faculty allocation will be processed based on preferences

### 3. Tips & Guidelines Card
- **Style**: `bg-surface-100 rounded-xl p-4 border border-neutral-200`
- **Header**:
  - Icon: `FiAlertCircle` or `FiZap`
  - Title: "Tips & Guidelines"
- **Content** (Dynamic based on current step):
  - **Step 1 Tips**:
    - Write a clear, descriptive title
    - You can use "TBD" if title is not finalized
    - Choose a domain that matches your project focus
    - Title and domain can be updated later
  - **Step 2 Tips**:
    - Research faculty expertise before selecting
    - Consider faculty availability and workload
    - Order preferences by priority (1 = highest)
    - You can reorder preferences before submitting

### 4. Important Notes Card
- **Style**: `bg-warning-50 rounded-xl p-4 border border-warning-200`
- **Header**:
  - Icon: `FiAlertTriangle`
  - Title: "Important Notes"
- **Content**:
  - Registration window may have time restrictions
  - Faculty allocation is based on preferences and availability
  - You will be notified once a faculty member is assigned
  - Project details can be updated after registration
  - Contact admin if you have questions

---

## Design System

### Color Scheme
- **Primary**: Blue (`primary-600`, `primary-50`, etc.)
- **Success**: Green (`success-600`, `success-50`)
- **Warning**: Yellow/Orange (`warning-600`, `warning-50`)
- **Error**: Red (`error-600`, `error-50`)
- **Info**: Blue (`info-600`, `info-50`)
- **Neutral**: Gray (`neutral-100`, `neutral-200`, etc.)
- **Surface**: Light gray (`surface-100`, `surface-200`)

### Typography
- **Headers**: `text-lg font-semibold` or `text-xl font-bold`
- **Body**: `text-sm` or `text-base`
- **Small Text**: `text-xs`
- **Labels**: `text-xs font-medium text-neutral-600`

### Icons (Feather Icons)
- `FiArrowLeft` - Back button
- `FiX` - Close button
- `FiInfo` - Information
- `FiCheckCircle` - Success/completed
- `FiAlertCircle` - Warning/error
- `FiAlertTriangle` - Important warning
- `FiTarget` - Progress/registration
- `FiUserPlus` - Add faculty
- `FiChevronUp` / `FiChevronDown` - Move preference
- `FiSearch` - Search
- `FiLoader` - Loading spinner
- `FiFileText` - Project details
- `FiUsers` - Faculty preferences
- `FiZap` - Tips

### Spacing
- **Gap between sections**: `gap-3` or `space-y-3`
- **Card padding**: `p-4` or `px-4 py-3`
- **Input padding**: `px-3 py-2.5`
- **Button padding**: `px-4 py-2.5` or `px-6 py-3`

### Borders & Shadows
- **Cards**: `border border-neutral-200 rounded-xl shadow-sm`
- **Inputs**: `border border-neutral-300 rounded-lg`
- **Hover**: `hover:border-primary-300 hover:shadow-md`

---

## Key Improvements

1. ✅ **2-Column Layout**: Matches other redesigned forms (Minor Project 2, Major Project 1)
2. ✅ **Independent Scrolling**: Both columns scroll independently, no page-level scrolling
3. ✅ **Compact Header**: Modern header with back/close buttons
4. ✅ **Feather Icons**: Replace all SVG icons with Feather Icons
5. ✅ **Equal Height Sections**: Faculty selection sections have equal heights (`h-[22rem]`)
6. ✅ **Better Organization**: Information moved to right sidebar
7. ✅ **Consistent Styling**: Matches new design system
8. ✅ **Form State Management**: localStorage restoration banner
9. ✅ **Removed Redundancy**: Bottom message removed, cleaner UI
10. ✅ **Responsive Design**: Works on mobile and desktop

---

## Implementation Checklist

### Phase 1: Layout Structure
- [ ] Update main container to fixed height with overflow-hidden
- [ ] Create 2-column grid layout (65:35 ratio)
- [ ] Add compact header with back/close buttons
- [ ] Implement independent scrolling for both columns

### Phase 2: Left Column
- [ ] Add restoration banner (conditional)
- [ ] Update eligibility status banner styling
- [ ] Update window status banner styling
- [ ] Redesign Step 1 (Project Details) card
- [ ] Redesign Step 2 (Faculty Preferences) card
- [ ] Implement equal-height faculty selection sections
- [ ] Replace all SVG icons with Feather Icons

### Phase 3: Right Column
- [ ] Create Registration Progress card
- [ ] Create About Internship 1 card
- [ ] Create Tips & Guidelines card (dynamic)
- [ ] Create Important Notes card

### Phase 4: Styling & Polish
- [ ] Apply consistent color scheme
- [ ] Update typography
- [ ] Add hover effects and transitions
- [ ] Ensure responsive design
- [ ] Test form validation and submission
- [ ] Test localStorage restoration

### Phase 5: Testing
- [ ] Test on different screen sizes
- [ ] Test form submission flow
- [ ] Test faculty selection and reordering
- [ ] Test window status handling
- [ ] Test eligibility validation
- [ ] Verify no functionality is broken

---

## Notes

1. **Semester Support**: This form supports both Sem 7 Internship 1 and Sem 8 Internship 1/2. Ensure labels and routes are handled correctly.

2. **Faculty Preference Limit**: Dynamic from system config (`sem7.internship1.facultyPreferenceLimit` or `sem8.internship1.facultyPreferenceLimit` or `sem8.internship2.facultyPreferenceLimit`).

3. **Window Status**: Registration window status is checked and displayed. Form submission is disabled when window is closed.

4. **Form State**: Consider implementing localStorage persistence for form data (title, domain, preferences) to allow restoration.

5. **Validation**: Ensure all validation logic is preserved and works with new layout.

6. **Accessibility**: Maintain keyboard navigation and screen reader support.

---

## Reference Files

- `frontend/src/pages/student/MinorProject2Registration.jsx` - 2-column layout reference
- `frontend/src/pages/student/MajorProject1Registration.jsx` - Similar form structure
- `frontend/src/pages/student/InternshipApplicationForm.jsx` - Solo project form reference

---

## Expected Outcome

A modern, consistent, and user-friendly Internship 1 Registration form that:
- Matches the design language of other redesigned forms
- Provides clear guidance and information
- Has proper scrolling and layout management
- Uses Feather Icons consistently
- Maintains all existing functionality
- Improves user experience significantly

