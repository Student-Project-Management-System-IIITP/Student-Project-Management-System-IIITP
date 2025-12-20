# Sem 8 Dashboard Improvement Plan

## Current Structure Analysis

### Student Types
1. **Type 1 Students** (completed 6-month internship in Sem 7):
   - Auto-enrolled in 'coursework' track
   - Must complete: Major Project 2 (group) + Internship 2 (solo project or summer internship evidence)
   
2. **Type 2 Students** (did coursework in Sem 7):
   - Can choose between:
     - **Option A**: 6-Month Internship track
     - **Option B**: Major Project 2 track (solo) + Internship 2

### Current Dashboard Sections
- **Left Sidebar**: Welcome card, Quick Actions (if any)
- **Center Column**: "Semester 8 Status" card with:
  - Track Choice Status (for Type 2)
  - Major Project 2 Status
  - Internship 2 Status (Type 1 only)
  - 6-Month Internship Application Status (Type 2, internship track)
  - Quick Actions section
- **Right Sidebar**: Currently minimal content

## Improvement Plan

### 1. Left Sidebar Enhancements

#### A. Progress Trackers (Similar to Sem 7)
Add dynamic progress trackers based on student type and track:

**For Type 1 Students:**
- **Major Project 2 Progress Tracker**:
  1. Create Group
  2. Finalize Group
  3. Register Major Project 2
  4. Faculty Allocated
- **Internship 2 Progress Tracker** (if eligible):
  1. Choose Internship 2 Path (project vs summer evidence)
  2. Register/Submit
  3. Faculty Allocated (if project)
  4. Admin Review (if summer evidence)

**For Type 2 Students - Internship Track:**
- **6-Month Internship Progress Tracker**:
  1. Choose Track
  2. Submit 6-Month Internship Application
  3. Internship Verification
  4. Internship Active

**For Type 2 Students - Major Project 2 Track:**
- **Major Project 2 Progress Tracker** (solo):
  1. Choose Track
  2. Register Major Project 2
  3. Faculty Allocated
- **Internship 2 Progress Tracker** (if eligible):
  1. Register Internship 2
  2. Faculty Allocated (if project)
  3. Admin Review (if summer evidence)

#### B. Quick Stats Card
- Semester number
- Projects count
- Track status
- Current step indicator

### 2. Center Column Enhancements

#### A. "Semester 8 Status" Section (Similar to Sem 7)
Restructure to match Sem 7 style:

**Track Choice Status Section** (Type 2 only):
- Show selected/finalized track with status badge
- Display admin remarks if track choice needs_info
- Show track change notifications if applicable
- Info box explaining current status and next steps

**Major Project 2 Status Section**:
- Enhanced status display with badges
- Project details when registered
- Faculty allocation status
- Group information (Type 1 only)
- Action buttons/links

**Internship 2 Status Section** (Type 1 only):
- Status badges
- Project details or summer application status
- Admin remarks for needs_info status
- Action buttons/links

**6-Month Internship Application Status** (Type 2, internship track):
- Enhanced status display
- Application details
- Admin remarks prominently displayed for needs_info
- Verification status

**Quick Actions Section**:
- Improved button styling
- Better organization
- Context-aware actions

### 3. Right Sidebar Enhancements

#### A. Workflow Information Sections

**For Type 1 Students:**
- **"About Semester 8"**: Explains Type 1 requirements
- **"Major Project 2 Workflow"**: Step-by-step process
- **"Internship 2 Workflow"**: Explains project vs summer evidence options
- **"Tips & Reminders"**: Dynamic tips based on current state
- **"Important Notes"**: General reminders

**For Type 2 Students - Internship Track:**
- **"6-Month Internship Track"**: Details about the track
- **"Application Process"**: Step-by-step application process
- **"Verification Process"**: What happens after submission
- **"Tips & Guidelines"**: Helpful tips
- **"Important Notes"**: Track-specific reminders

**For Type 2 Students - Major Project 2 Track:**
- **"Major Project 2 Track"**: Details about solo project
- **"Registration Process"**: Step-by-step registration
- **"Faculty Allocation"**: How faculty is assigned
- **"Internship 2 Requirement"**: Information about Internship 2
- **"Tips & Guidelines"**: Helpful tips
- **"Important Notes"**: Track-specific reminders

#### B. Dynamic Content Based on State
- Show relevant information based on:
  - Student type
  - Track choice
  - Project registration status
  - Faculty allocation status
  - Application status

### 4. Specific Improvements

#### A. Track Choice Display (Type 2)
- Similar to Sem 7 track choice display
- Show status badges
- Display admin remarks prominently
- Show track change notifications

#### B. Admin Remarks Display
- For needs_info statuses:
  - Prominent yellow alert boxes
  - Clear "Admin Has Requested More Information" heading
  - Admin remarks in highlighted boxes
  - Display in both status section and quick actions

#### C. Progress Indicators
- Use same design as Sem 7
- Checkmarks for completed steps
- Current step highlighting
- Upcoming steps in neutral color

#### D. Status Badges
- Consistent with Sem 7 styling
- Color-coded (success, error, warning, info)
- Clear status text

### 5. Implementation Details

#### A. Progress Tracker Functions
Create separate functions in `useSem8Project.js`:
- `getMajorProject2ProgressSteps()` - For both Type 1 and Type 2
- `getInternship2ProgressSteps()` - For Type 1 and Type 2 (if eligible)
- `getSixMonthInternshipProgressSteps()` - For Type 2, internship track

#### B. Status Section Structure
- Match Sem 7 structure:
  - Track Choice Status (if applicable)
  - Project Status sections
  - Application Status sections
  - Quick Actions

#### C. Right Sidebar Content
- Use same card styling as Sem 7
- Feather Icons for consistency
- Dynamic content based on state
- Scrollable sections

### 6. Cases to Handle

#### Type 1 Students:
1. No group formed → Show "Create Group" guidance
2. Group formed but not finalized → Show "Finalize Group" guidance
3. Group finalized, no project → Show "Register Major Project 2" guidance
4. Project registered, no faculty → Show "Waiting for Faculty" status
5. Faculty allocated → Show active project status
6. Internship 2 eligible → Show Internship 2 options
7. Internship 2 registered → Show Internship 2 status

#### Type 2 Students - No Track Chosen:
1. Show track selection guidance
2. Explain both options
3. Show "Choose Track" button

#### Type 2 Students - Internship Track:
1. No application → Show "Submit Application" guidance
2. Application submitted → Show pending status
3. needs_info → Show admin remarks prominently
4. Verification pending → Show verification status
5. Verified → Show success status

#### Type 2 Students - Major Project 2 Track:
1. No project → Show "Register Project" guidance
2. Project registered, no faculty → Show "Waiting for Faculty" status
3. Faculty allocated → Show active project status
4. Internship 2 eligible → Show Internship 2 options
5. Internship 2 registered → Show Internship 2 status

### 7. Design Consistency

- Use same color scheme as Sem 7
- Same card styling (rounded-xl, borders, shadows)
- Same icon usage (Feather Icons)
- Same spacing and typography
- Same scrollable column structure
- Same progress tracker design

### 8. Files to Modify

1. `frontend/src/pages/student/Dashboard.jsx`:
   - Add Sem 8 progress trackers in left sidebar (after Sem 7 trackers, around line 1712)
   - Restructure Sem 8 status section in center column (currently starts at line 2400)
   - Add right sidebar content for Sem 8 (after Sem 7 overview card, around line 3600)
   - Improve quick actions for Sem 8
   - Add admin remarks display for needs_info statuses (similar to Sem 7)

2. `frontend/src/hooks/useSem8Project.js`:
   - Add `getMajorProject2ProgressSteps()` function (similar to `getMajorProject1ProgressSteps()`)
   - Add `getInternship2ProgressSteps()` function (similar to `getInternship1ProgressSteps()`)
   - Add `getSixMonthInternshipProgressSteps()` function (for Type 2, internship track)
   - Ensure proper status checks using group/project data as fallback (similar to Sem 7)

### 9. Layout Structure

**Current Layout:**
- Left Sidebar: `lg:col-span-2` - Welcome, Quick Actions, Progress Trackers (Sem 4, 5, 6, 7)
- Center Column: `lg:col-span-8` - Main content, Status cards
- Right Sidebar: `lg:col-span-2` - Your Project, Evaluation Schedule (Sem 4), Sem 7 Overview

**Sem 8 Additions:**
- Left Sidebar: Add Sem 8 progress trackers (similar to Sem 7)
- Center Column: Improve "Semester 8 Status" card structure
- Right Sidebar: Add "Semester 8 Overview" card (similar to Sem 7 Overview)

### 9. Testing Checklist

- [ ] Type 1 student with no group
- [ ] Type 1 student with group but not finalized
- [ ] Type 1 student with finalized group, no project
- [ ] Type 1 student with project, no faculty
- [ ] Type 1 student with faculty allocated
- [ ] Type 1 student with Internship 2 eligible
- [ ] Type 1 student with Internship 2 registered
- [ ] Type 2 student with no track choice
- [ ] Type 2 student on internship track, no application
- [ ] Type 2 student on internship track, needs_info status
- [ ] Type 2 student on internship track, verified
- [ ] Type 2 student on major2 track, no project
- [ ] Type 2 student on major2 track, project registered
- [ ] Type 2 student on major2 track, faculty allocated
- [ ] Admin remarks display for all needs_info cases
- [ ] Progress trackers show correct steps
- [ ] Right sidebar shows relevant content
- [ ] Quick actions are context-aware

