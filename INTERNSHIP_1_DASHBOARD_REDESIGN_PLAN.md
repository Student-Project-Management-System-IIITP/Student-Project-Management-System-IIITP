# Internship 1 Dashboard Complete Redesign Plan

## Overview
The Internship 1 dashboard needs a complete redesign similar to the Major Project 1 dashboard, but adapted for a **solo project workflow** (no groups). The dashboard must handle two distinct paths:
1. **Summer Internship Application Path**: For students who have completed a 2-month summer internship
2. **Internship 1 Solo Project Path**: For students who need to register a solo project under a faculty member

---

## Current State Analysis

### Current Issues
1. **Layout**: Single-column layout with basic cards, not utilizing screen space efficiently
2. **No Progress Tracker**: Missing visual progress indicator
3. **Path Selection**: Basic two-card selection, not integrated into main dashboard
4. **Information Density**: Limited information displayed, lots of empty space
5. **No Sidebars**: Missing left and right sidebars for additional context
6. **Status Display**: Basic status badges without detailed context
7. **Navigation**: Basic back button, no integrated navigation

### Current Features to Preserve
- Path selection (summer internship vs. solo project)
- Summer internship application status display
- Internship 1 project registration flow
- Track change notifications
- Admin remarks display
- Project dashboard redirect when project exists

---

## Proposed 3-Column Layout

### Layout Structure
```
┌───────────────────────────── ────────────────────────────────┐
│ Header: Internship 1 | Back to Dashboard                     │
├──────────┬─────────────────────────────┬─────────────────────┤
│          │                             │                     │
│  LEFT    │        CENTER               │      RIGHT          │
│ SIDEBAR  │        COLUMN               │     SIDEBAR         │
│ (2 cols) │       (7 cols)              │    (3 cols)         │
│          │                             │                     │
│ •Progress│ • Path Selection            │ • About Internship 1│
│   Tracker│ • Application Status        │ • Workflow Steps    │
│ • Quick  │ • Project Registration      │ • Tips & Reminders  │
│   Stats  │ • Project Dashboard Card    │ • Important Notes   │
│ • Your   │ • Action Buttons            │                     │
│   Status │                             │                     │
│          │                             │                     │
└──────────┴─────────────────────────────┴─────────────────────┘
```

### Column Specifications
- **Left Sidebar**: `lg:col-span-2` (16.67% width)
- **Center Column**: `lg:col-span-7` (58.33% width)
- **Right Sidebar**: `lg:col-span-3` (25% width)
- **Container**: `h-[calc(100vh-64px)] overflow-hidden flex flex-col`
- **Scrolling**: Each column independently scrollable with `overflow-y-auto custom-scrollbar min-h-0`

---

## Left Sidebar Components

### 1. Progress Tracker Card
**Purpose**: Show current progress in the Internship 1 workflow

**Dynamic Steps Based on Path**:

#### Path 1: Summer Internship Application
```
1. Choose Internship 1 Path
   ✓ Selected: Already completed internship

2. Fill Internship 1 Form
   ✓ Form submitted and approved
   OR
   ⚠ Update required - Review admin remarks
   OR
   ⏳ Submit internship details and evidence

3. Update Form (Admin Remarks) [Conditional]
   ⚠ Review and address admin feedback
   (Only shown if status === 'needs_info')

4. Internship 1 Approved
   ✓ Application verified and approved
   OR
   ⏳ Pending admin verification
```

#### Path 2: Internship 1 Solo Project
```
1. Choose Internship 1 Path
   ✓ Selected: Project under faculty

2. Register Internship 1 Project
   ✓ Registered
   OR
   ⏳ Register project details and submit faculty preferences

3. Submit Faculty Preferences
   ✓ Preferences submitted
   OR
   ⏳ Select preferred faculty members
   (Note: This is combined with registration step)

4. Faculty Allocated
   ✓ Faculty guide assigned
   OR
   ⏳ Waiting for faculty allocation
```

**Styling**:
- Card: `bg-surface-100 rounded-xl p-4 border border-neutral-200`
- Header: `FiClock` icon + "Internship 1 Progress" title
- Steps: Same design as Major Project 1 (checkmarks, current step indicator, empty circles)
- Status text: `text-[11px] text-neutral-600`

### 2. Quick Stats Card
**Purpose**: Display key metrics at a glance

**Stats to Display**:
- **Path Selected**: "Summer Application" or "Solo Project"
- **Application Status**: "Submitted", "Approved", "Update Required", etc. (for summer path)
- **Project Status**: "Registered", "Not Registered" (for solo path)
- **Faculty Status**: "Allocated", "Pending" (for solo path)

**Styling**:
- Card: `bg-white rounded-xl p-4 border border-neutral-200 shadow-sm`
- Header: `FiTrendingUp` icon + "Quick Stats" title
- Stats: Key-value pairs with `text-xs` font sizes

### 3. Your Status Card
**Purpose**: Show student's current role/status in the process

**Content**:
- **For Summer Application Path**:
  - Status: "Application Submitted" / "Approved" / "Update Required"
  - Next Action: Dynamic based on status
- **For Solo Project Path**:
  - Status: "Project Registered" / "Not Registered"
  - Faculty: "Allocated" / "Pending"
  - Next Action: Dynamic based on status

**Styling**:
- Card: `bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200`
- Header: `FiUser` icon + "Your Status" title
- Content: Compact, informative text

---

## Center Column Components

### 1. Header Section
**Content**:
- Title: "Internship 1"
- Subtitle: "Manage your solo internship requirement"
- Back Button: Link to `/dashboard/student`
- Status Badge: If project exists, show project status

**Styling**:
- Compact header with gradient background
- Status badge positioned on the right

### 2. Path Selection Cards (When No Path Selected)
**Purpose**: Allow student to choose their Internship 1 path

**Card 1: Summer Internship Application**
- Icon: `FiCheckCircle` (green)
- Title: "I have completed 2-month internship"
- Description: "Submit your summer internship evidence and completion certificate"
- Action: Navigate to application form or show existing application

**Card 2: Solo Project Registration**
- Icon: `FiFileText` (blue)
- Title: "I haven't completed internship"
- Description: "Register for Internship 1 solo project under a faculty mentor"
- Action: Navigate to registration form

**Styling**:
- Two-column grid on large screens
- Clickable cards with hover effects
- Gradient borders and backgrounds

### 3. Summer Internship Application Status Card (Path 1)
**Purpose**: Display application status and details

**Content Sections**:

#### Status Banner
- **Approved**: Green success banner with `FiCheckCircle`
- **Update Required**: Yellow warning banner with `FiAlertTriangle`
- **Submitted**: Blue info banner with `FiInfo`
- **Rejected**: Red error banner with `FiXCircle`
- **Track Change Notification**: Amber banner if track was changed

#### Application Details Grid
- **Company Information**:
  - Company Name
  - Location
  - Duration (Start - End dates)
  - Mode (onsite/remote/hybrid)
- **Manager/Contact Details**:
  - Manager Name
  - Email Address
  - Contact Number
- **Nature of Work**: Text description
- **Stipend Information**: Yes/No + Amount
- **Documents**: Completion certificate link

#### Admin Remarks Section
- Display if status is `needs_info`, `verified_fail`, or `absent`
- Styled as info box with `FiInfo` icon

#### Action Buttons
- **Update Application**: If status is `needs_info`
- **View Application Details**: If status is `submitted` or `approved`
- **Register for Project**: If status is `verified_fail` or `absent` (track change)

**Styling**:
- Card: `bg-white rounded-xl border border-neutral-200 shadow-sm`
- Header: Gradient background with status badge
- Sections: Organized with clear spacing
- Buttons: Primary color scheme

### 4. Internship 1 Project Registration Card (Path 2 - No Project)
**Purpose**: Guide student to register their solo project

**Content**:
- **Header**: "Register Internship 1 Project"
- **Description**: "Register for a solo internship project under a faculty mentor"
- **Eligibility Check**: Show warning if not eligible
- **Action Button**: "Register Internship 1 Project" (links to registration form)

**Styling**:
- Card: `bg-white rounded-xl border border-neutral-200 shadow-sm`
- Header: Gradient background (orange/amber theme)
- Button: Primary color with icon

### 5. Internship 1 Project Dashboard Card (Path 2 - Project Exists)
**Purpose**: Display registered project details and link to full dashboard

**Content**:
- **Header**: "Project Dashboard" with "Open Dashboard" button
- **Project Details**:
  - Project Title
  - Domain
  - Faculty Guide (with prefix, or "Pending Allocation")
  - Status Badge
- **Track Change Notification**: If applicable

**Styling**:
- Card: `bg-white rounded-xl border border-neutral-200 shadow-sm`
- Header: Gradient background (purple/indigo theme)
- Details: Organized with labels and values
- Button: Link to `/projects/{projectId}`

### 6. Waiting for Faculty Allocation Card
**Purpose**: Inform student that faculty allocation is pending

**Content**:
- Success message: "Project Registered Successfully"
- Project details summary
- Waiting message: "Waiting for Faculty Allocation"
- Note: "Faculty members review and choose projects based on your preferences"

**Styling**:
- Card: `bg-success-50 border border-success-200`
- Icons: `FiCheckCircle`, `FiClock`

---

## Right Sidebar Components

### 1. About Internship 1 Card
**Purpose**: Explain what Internship 1 is

**Content**:
- **Type**: Solo project under faculty mentor
- **Eligibility**: Students who have not completed an approved 2-month summer internship
- **Duration**: Continues throughout Semester 7
- **Faculty Preferences**: Select preferred faculty members (number from config)
- **Next Steps**: After registration, faculty allocation will be processed

**Styling**:
- Card: `bg-info-50 rounded-xl p-4 border border-info-200`
- Header: `FiInfo` icon + "About Internship 1" title
- Content: Bullet points with `text-sm` font

### 2. Workflow Steps Card
**Purpose**: Explain the Internship 1 process

**Content**:
- **Step 1**: Choose your path (Summer Application or Solo Project)
- **Step 2**: 
  - For Summer Application: Submit evidence and wait for admin review
  - For Solo Project: Register project and submit faculty preferences
- **Step 3**: 
  - For Summer Application: Admin reviews and approves/rejects
  - For Solo Project: Wait for faculty allocation
- **Step 4**: 
  - For Summer Application: If approved, no project needed
  - For Solo Project: Faculty allocated, project active

**Styling**:
- Card: `bg-white rounded-xl p-4 border border-neutral-200 shadow-sm`
- Header: `FiTarget` icon + "Workflow Steps" title
- Steps: Numbered list with icons

### 3. Tips & Reminders Card
**Purpose**: Provide dynamic tips based on current state

**Dynamic Tips**:

#### No Path Selected
- Choose your path based on whether you've completed a summer internship
- Summer internship applications require completion certificate
- Solo projects require faculty preferences

#### Summer Application Path
- Ensure all details are accurate before submission
- Upload completion certificate as proof
- Respond promptly to admin requests for updates

#### Solo Project Path - No Project
- Register your project as soon as possible
- Select faculty preferences carefully
- Project title should be clear and descriptive

#### Solo Project Path - Project Registered, No Faculty
- Faculty allocation is based on your preferences
- Faculty members review and choose projects
- You'll be notified when a faculty member chooses your project

#### Solo Project Path - Faculty Allocated
- Schedule regular meetings with your faculty guide
- Work on project deliverables throughout the semester
- Submit deliverables on time

**Styling**:
- Card: `bg-warning-50 rounded-xl p-4 border border-warning-200`
- Header: `FiAlertCircle` icon + "Tips & Reminders" title
- Tips: Bullet points with `FiZap` icons

### 4. Important Notes Card
**Purpose**: General reminders and important information

**Content**:
- Internship 1 is a solo project (no groups)
- Faculty allocation is not guaranteed
- Project must be completed within the semester
- Deliverables must be submitted on time
- Track changes by admin may affect your path

**Styling**:
- Card: `bg-surface-100 rounded-xl p-4 border border-neutral-200`
- Header: `FiAlertTriangle` icon + "Important Notes" title
- Notes: Bullet points with `text-xs` font

---

## Design System

### Color Scheme
- **Primary**: Orange/Amber theme (different from Major Project 1's blue)
- **Success**: Green
- **Warning**: Yellow/Amber
- **Error**: Red
- **Info**: Blue
- **Neutral**: Gray

### Icons (Feather Icons)
- `FiClock`: Progress tracker, time-related
- `FiCheckCircle`: Completed steps, success
- `FiAlertCircle`: Warnings, tips
- `FiInfo`: Information, about sections
- `FiFileText`: Projects, documents
- `FiUser`: Status, user-related
- `FiTrendingUp`: Stats
- `FiTarget`: Workflow, goals
- `FiAlertTriangle`: Important notes
- `FiZap`: Tips, quick actions
- `FiUserCheck`: Faculty allocation
- `FiXCircle`: Rejections, errors

### Typography
- **Headers**: `text-lg font-bold`
- **Titles**: `text-sm font-semibold`
- **Body**: `text-sm` or `text-xs`
- **Labels**: `text-xs font-medium uppercase tracking-wide`
- **Status Text**: `text-[11px] text-neutral-600`

### Spacing
- **Card Padding**: `p-4` or `p-5`
- **Section Gap**: `space-y-4` or `space-y-3`
- **Column Gap**: `gap-3` or `gap-4`

---

## State Management

### Key States to Track
1. **Selected Path**: `'summer'` | `'project'` | `null`
2. **Summer Application**: `summerApp` object or `null`
3. **Internship 1 Project**: `internship1Project` object or `null`
4. **Loading States**: `isLoading`, `sem7Loading`
5. **Track Change**: Boolean flag for track changes

### Conditional Rendering Logic
```javascript
// Determine what to show in center column
if (internship1Project && !isCancelled) {
  // Show Project Dashboard Card
} else if (hasSummerApp && !isRejectedDueToTrackChange) {
  // Show Summer Application Status Card
} else if (!selectedPath) {
  // Show Path Selection Cards
} else if (selectedPath === 'summer') {
  // Show Summer Application Form/Status
} else if (selectedPath === 'project') {
  // Show Project Registration Card
}
```

---

## Key Differences from Major Project 1 Dashboard

1. **No Group Sections**: All group-related components removed
2. **Two Distinct Paths**: Must handle both summer application and solo project paths
3. **No Group Dashboard**: Direct link to project dashboard only
4. **Different Progress Tracker**: Steps vary based on selected path
5. **Application Status**: Complex status handling for summer internship applications
6. **Track Change Logic**: Handle admin-initiated track changes
7. **Solo Project Focus**: All messaging emphasizes solo nature

---

## Implementation Checklist

### Phase 1: Layout Structure
- [ ] Create 3-column grid layout
- [ ] Implement independent scrolling for each column
- [ ] Add header with back button
- [ ] Ensure no navbar overlap

### Phase 2: Left Sidebar
- [ ] Implement progress tracker with dynamic steps
- [ ] Create quick stats card
- [ ] Add your status card
- [ ] Style all cards consistently

### Phase 3: Center Column
- [ ] Implement path selection cards
- [ ] Create summer application status card
- [ ] Create project registration card
- [ ] Create project dashboard card
- [ ] Add track change notifications
- [ ] Implement action buttons

### Phase 4: Right Sidebar
- [ ] Create "About Internship 1" card
- [ ] Create "Workflow Steps" card
- [ ] Create "Tips & Reminders" card with dynamic content
- [ ] Create "Important Notes" card

### Phase 5: State Management
- [ ] Implement path selection logic
- [ ] Handle track change detection
- [ ] Manage loading states
- [ ] Implement conditional rendering

### Phase 6: Styling & Polish
- [ ] Apply consistent color scheme
- [ ] Replace all emojis with Feather Icons
- [ ] Ensure responsive design
- [ ] Add hover effects and transitions
- [ ] Test scrolling behavior

### Phase 7: Integration
- [ ] Integrate with `useSem7Project` hook
- [ ] Connect to registration form
- [ ] Link to project dashboard
- [ ] Test all navigation flows

---

## Notes

1. **No Groups**: This dashboard is purely for solo projects, so all group-related UI should be removed
2. **Path Persistence**: Consider storing selected path in localStorage for better UX
3. **Status Updates**: Ensure real-time status updates when admin reviews applications
4. **Faculty Prefixes**: Always use `formatFacultyName()` for faculty display
5. **Error Handling**: Gracefully handle API errors and loading states
6. **Accessibility**: Ensure all interactive elements are keyboard accessible

---

## Future Enhancements (Optional)

1. **Application Timeline**: Visual timeline showing application submission and review dates
2. **Faculty Preference Display**: Show selected faculty preferences in project card
3. **Deliverables Preview**: Show upcoming deliverables in project card
4. **Notifications**: Real-time notifications for status changes
5. **Document Viewer**: Inline document viewer for completion certificates

---

## Conclusion

This redesign will transform the Internship 1 dashboard into a modern, informative, and user-friendly interface that clearly guides students through their Internship 1 journey, whether they choose the summer application path or the solo project path. The 3-column layout maximizes information density while maintaining clarity, and the dynamic progress tracker provides clear visual feedback on the student's current status.

