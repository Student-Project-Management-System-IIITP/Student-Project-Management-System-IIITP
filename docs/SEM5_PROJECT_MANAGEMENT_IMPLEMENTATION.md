# Sem 5 Project Management Feature - Complete Implementation List

This document provides a comprehensive list of all features, changes, and implementations for the Sem 5 Project Management system. Use this as a reference for implementing similar features for Sem 6.

---

## Table of Contents
1. [Backend API Endpoints](#backend-api-endpoints)
2. [Database Operations & Field Changes](#database-operations--field-changes)
3. [Frontend Features & Components](#frontend-features--components)
4. [UI/UX Improvements](#uiux-improvements)
5. [Edge Cases & Validations](#edge-cases--validations)
6. [Error Handling](#error-handling)
7. [Data Synchronization](#data-synchronization)

---

## Backend API Endpoints

### 1. Group Management Endpoints

#### 1.1 Get Groups (with Search)
- **Endpoint**: `GET /admin/groups`
- **Query Parameters**:
  - `semester`: Filter by semester (default: 5)
  - `status`: Filter by group status
  - `search`: Search term (searches group name, member details, leader details, allocated faculty)
- **Features**:
  - Populates `contactNumber` for members and leader to enable phone number search
  - Searches across: group name, member name/MIS/email/phone, leader name/MIS/email/phone, allocated faculty name
  - Returns groups with populated members, leader, project, and allocatedFaculty

#### 1.2 Get Group Details
- **Endpoint**: `GET /admin/groups/:groupId`
- **Features**:
  - Returns full group details with populated data
  - Includes validation status
  - Returns statistics (active members, pending invites, etc.)

#### 1.3 Add Member to Group
- **Endpoint**: `POST /admin/groups/:groupId/members`
- **Request Body**:
  ```json
  {
    "studentId": "student_id",
    "role": "member" | "leader",
    "reason": "optional reason",
    "force": false
  }
  ```
- **Database Changes**:
  - Adds member to `Group.members` array with `isActive: true`
  - Updates `Student.groupMemberships` array
  - Updates `Student.groupId` if student doesn't have one
  - Removes student from old group if `force: true`
  - Updates group `minMembers`/`maxMembers` dynamically if needed
  - Updates group name if leader is added
  - Syncs invitation statuses in both group and student records
- **Validations**:
  - Admin can add members regardless of group status
  - Dynamically adjusts `minMembers`/`maxMembers` to bypass validation constraints
  - Handles duplicate members
  - Validates student exists and is in correct semester

#### 1.4 Remove Member from Group
- **Endpoint**: `DELETE /admin/groups/:groupId/members/:studentId`
- **Request Body**:
  ```json
  {
    "reason": "optional reason",
    "handleProject": true,
    "force": false
  }
  ```
- **Database Changes**:
  - Sets `member.isActive = false` in `Group.members` array
  - Removes from `Student.groupMemberships` array (only Sem 5 membership)
  - Clears `Student.groupId` if it points to this group
  - Removes related invitations from `Student.invites` array
  - If removing leader: assigns new leader (first active member)
  - Updates group name based on new leader
  - If only 2 members remain: shows specific error message
  - If only 1 member remains: automatically disbands group
  - Dynamically adjusts `minMembers`/`maxMembers` to allow removal
  - If `handleProject: true`: cancels project for removed member
- **Validations**:
  - Admin can remove members regardless of group status
  - Prevents removal if only 2 members remain (suggests disband instead)
  - Automatically disbands if removing would leave only 1 member

#### 1.5 Change Group Leader
- **Endpoint**: `PUT /admin/groups/:groupId/leader`
- **Request Body**:
  ```json
  {
    "newLeaderId": "student_id",
    "reason": "optional reason"
  }
  ```
- **Database Changes**:
  - Updates `Group.leader` field
  - Updates `member.role` from 'leader' to 'member' for old leader
  - Updates `member.role` from 'member' to 'leader' for new leader
  - Updates `Group.name` based on new leader's name
  - Updates `Student.groupMemberships[].role` for both students

#### 1.6 Disband Group
- **Endpoint**: `DELETE /admin/groups/:groupId/disband`
- **Request Body**:
  ```json
  {
    "reason": "optional reason"
  }
  ```
- **Database Changes** (All operations in MongoDB transaction):
  - **FacultyPreference Collection**:
    - Deletes all `FacultyPreference` documents where `group = groupId` and `semester = 5`
  - **Project Collection**:
    - Deletes the Sem 5 Minor Project 2 `Project` document if it exists and is linked to the group
  - **Student Collection** (for each active member):
    - Removes Sem 5 Minor Project 2 entry from `currentProjects` array (only if linked to disbanded group's project)
    - Removes Sem 5 group membership from `groupMemberships` array (only for this specific group)
    - Clears `groupId` field if it points to the disbanded group
    - Removes any pending invitations related to this group from `invites` array
  - **Group Collection**:
    - **Deletes the Group document completely** (not just marking as disbanded)
- **Validations**:
  - Only works for Semester 5 groups
  - Validates group exists and is not already deleted
  - Ensures only Sem 5 related data is removed from students

#### 1.7 Allocate Faculty to Group
- **Endpoint**: `POST /admin/groups/:groupId/allocate-faculty`
- **Request Body**:
  ```json
  {
    "facultyId": "faculty_id"
  }
  ```
- **Database Changes** (All in transaction):
  - **Group Collection**:
    - Sets `Group.allocatedFaculty = facultyId`
    - Changes `Group.status` from 'complete' to 'locked' (if status was 'complete')
  - **Project Collection** (if project exists):
    - Sets `Project.faculty = facultyId`
    - Changes `Project.status` from 'registered' to 'faculty_allocated'
    - Sets `Project.allocatedBy = 'admin_allocation'`
  - **Student Collection** (for each active member):
    - Updates `currentProjects[].status` from 'registered' to 'active' (for the project linked to this group)
  - **FacultyPreference Collection** (if exists):
    - Sets `FacultyPreference.allocatedFaculty = facultyId`
    - Sets `FacultyPreference.allocatedBy = 'admin_allocation'`
    - Sets `FacultyPreference.status = 'allocated'`
    - Sets `FacultyPreference.allocatedAt = new Date()`
- **Validations**:
  - Group must not already have an allocated faculty
  - Faculty must exist
  - Only works if group has a registered project

#### 1.8 Deallocate Faculty from Group
- **Endpoint**: `DELETE /admin/groups/:groupId/deallocate-faculty`
- **Database Changes** (All in transaction, reverts allocation changes):
  - **Group Collection**:
    - Sets `Group.allocatedFaculty = null`
    - Changes `Group.status` from 'locked' to 'complete' (if status was 'locked')
  - **Project Collection** (if project exists):
    - Sets `Project.faculty = null`
    - Changes `Project.status` from 'faculty_allocated' to 'registered'
    - Removes `Project.allocatedBy` field
  - **Student Collection**:
    - **Note**: Does NOT change `currentProjects[].status` (remains 'active' as project is still registered)
  - **FacultyPreference Collection** (if exists):
    - Sets `FacultyPreference.allocatedFaculty = null`
    - Removes `FacultyPreference.allocatedBy` field
    - Sets `FacultyPreference.status = 'pending'`
    - Removes `FacultyPreference.allocatedAt` field
- **Validations**:
  - Group must have an allocated faculty
  - Only works if group has a registered project

---

## Database Operations & Field Changes

### Collections Modified

#### 1. Group Collection
- **Fields Modified**:
  - `allocatedFaculty`: Set/cleared during faculty allocation/deallocation
  - `status`: Changes between 'complete' ↔ 'locked' based on faculty allocation
  - `name`: Updated when leader changes
  - `members[].isActive`: Set to `false` when member is removed
  - `members[].role`: Updated when leader changes
  - `minMembers`/`maxMembers`: Dynamically adjusted during admin operations to bypass validation
- **Operations**:
  - Complete deletion (not just marking as disbanded)
  - Member addition/removal
  - Leader assignment

#### 2. Project Collection
- **Fields Modified**:
  - `faculty`: Set/cleared during faculty allocation/deallocation
  - `status`: Changes between 'registered' ↔ 'faculty_allocated'
  - `allocatedBy`: Set to 'admin_allocation' or removed
- **Operations**:
  - Complete deletion when group is disbanded (only Sem 5 Minor Project 2)

#### 3. Student Collection
- **Fields Modified**:
  - `currentProjects[]`: 
    - Entry removed when group is disbanded (only Sem 5 Minor Project 2)
    - `status` changed from 'registered' to 'active' when faculty allocated
    - **Note**: Status remains 'active' when faculty deallocated (project still registered)
  - `groupMemberships[]`:
    - Entry added when member added to group
    - Entry removed when member removed or group disbanded (only Sem 5 related)
  - `groupId`: 
    - Set when student joins group
    - Cleared when student leaves or group disbanded
  - `invites[]`:
    - Entries removed when member removed or group disbanded (only for this group)
- **Operations**:
  - Atomic group membership operations
  - Invitation cleanup

#### 4. FacultyPreference Collection
- **Fields Modified**:
  - `allocatedFaculty`: Set/cleared during faculty allocation/deallocation
  - `allocatedBy`: Set to 'admin_allocation' or removed
  - `status`: Changes between 'pending' ↔ 'allocated'
  - `allocatedAt`: Set or removed
- **Operations**:
  - Complete deletion when group is disbanded (only Sem 5 related)

### Transaction Usage
- All group management operations use MongoDB transactions for data consistency
- `disbandGroup`, `allocateFacultyToGroup`, `deallocateFacultyFromGroup` use explicit sessions
- `addMemberToGroup`, `removeMemberFromGroup`, `changeGroupLeader` use `session.withTransaction()`

---

## Frontend Features & Components

### 1. Manage Projects Page (`ManageProjects.jsx`)

#### 1.1 Search Functionality
- **Features**:
  - Real-time search with 500ms debounce
  - Searches: group name, member name/MIS/email/phone, leader name/MIS/email/phone, allocated faculty name
  - Removed "All Status" dropdown
  - Backend-side search (no client-side filtering)
- **Implementation**:
  - Uses `searchTimeoutRef` for debouncing
  - Passes `search` parameter to `adminAPI.getGroups()`

#### 1.2 Group List Display
- **Layout**: Card-based design (compact)
- **Information Displayed**:
  - Group name with status badge
  - Member count (active/total)
  - Allocation status badge (✓ Allocated / Not Allocated)
  - Project information card (if registered):
    - Project title
    - Project type
  - Faculty information card (if allocated):
    - Faculty name
    - Department and designation
  - Members list with full details:
    - Name with leader badge
    - MIS number
    - Branch
    - Email address
    - All in single line with centered details
- **Features**:
  - Click to select group and view details
  - Highlighted selected group
  - Hover effects

#### 1.3 Group Details Sidebar
- **Sections**:
  - Group Info (name, description, status, member count)
  - Members List with actions:
    - "Transfer Leadership" button (for non-leaders)
    - "Remove" button
    - Loading states for all actions
  - Project Info (if registered)
  - Faculty Section:
    - Shows allocate/deallocate buttons only if project is registered
    - Warning message if no project registered
    - Faculty details if allocated
  - Validation Status
  - Disband Group button (Sem 5 only)

#### 1.4 Add Member Modal
- **Features**:
  - 2-step process:
    - Step 1: Search and select students
    - Step 2: Configure role and reason
  - Real-time student search
  - Shows student availability status:
    - Available (green badge)
    - In this group (blue badge)
    - In other group (red badge, disabled)
  - Multi-select functionality
  - Displays: name, MIS, branch, email, status
  - Sorted: available students first
- **Implementation**:
  - Uses `students` state loaded from API
  - Client-side filtering and sorting
  - `selectedStudentsForAdd` state for selected students

#### 1.5 Remove Member Modal
- **Features**:
  - Confirmation dialog
  - Shows member name
  - Warning if removing leader
  - Loading state during removal

#### 1.6 Change Leader Modal
- **Features**:
  - Lists all active members (except current leader)
  - Shows member name and MIS
  - Click to select new leader
  - Loading state during change
  - Pre-selects member if clicked from member list

#### 1.7 Disband Group Modal
- **Features**:
  - Warning message with list of actions
  - Optional reason textarea
  - Confirmation required
  - Loading state during disband

#### 1.8 Allocate Faculty Modal
- **Features**:
  - Searchable faculty list
  - Search by: name, email, phone, department, designation
  - Sort options: Name, Department, Designation
  - Displays: name, faculty ID, department, designation, mode, email, phone
  - Debounced search (300ms)
  - Fallback to `getFaculty` if `searchFaculties` fails
  - Client-side filtering and sorting as fallback
  - Loading states
- **Implementation**:
  - Uses `loadAvailableFaculty()` function
  - Auto-loads when modal opens
  - Resets search/sort when modal closes

#### 1.9 Loading States
- **All Actions Have Loading States**:
  - Add Member: "Adding..." with spinner
  - Remove Member: "Removing..." with spinner
  - Transfer Leadership: Spinner in modal buttons
  - Disband Group: "Disbanding..." with spinner
  - Allocate Faculty: Loading in modal
  - Deallocate Faculty: "Deallocating..." with spinner
- **Implementation**:
  - Separate state variables for each action
  - Disabled buttons during operations
  - Visual feedback with spinners

#### 1.10 Toast Notifications
- **Success Messages**:
  - Add Member: "Successfully added X student(s) as leader/member to the group"
  - Remove Member: "Successfully removed [Name] from the group"
  - Change Leader: "Leadership transferred successfully. [Name] is now the group leader."
  - Disband Group: "Group '[Name]' has been disbanded successfully. All members, projects, and faculty preferences have been removed."
  - Allocate Faculty: "Faculty allocated to group successfully"
  - Deallocate Faculty: "Faculty deallocated from group successfully"
- **Error Messages**:
  - Specific error messages from backend
  - Fallback generic messages
  - Shows failed student names when adding multiple members

---

## UI/UX Improvements

### 1. Group Cards
- **Design**: Compact card layout
- **Features**:
  - Gradient header with group icon
  - Status badges
  - Color-coded sections (blue for project, green for faculty)
  - Member details in compact format
  - Hover effects
  - Selection highlighting

### 2. Member Display
- **Layout**: Single-line layout
- **Features**:
  - Name with fixed width (140-180px)
  - Leader badge (styled, not emoji)
  - Details (MIS, Branch, Email) centered
  - All details visible without truncation
  - Proper spacing and alignment

### 3. Buttons
- **Improvements**:
  - Replaced emoji buttons (👑, ✕) with styled buttons
  - "Transfer Leadership" button (indigo)
  - "Remove" button (red)
  - Consistent styling with hover effects
  - Loading states with spinners

### 4. Headings
- Changed "Groups" to "Projects/Groups"
- "Group Details" remains the same

### 5. Faculty Section
- Conditional display based on project registration
- Warning message if no project
- Clear allocation status

---

## Edge Cases & Validations

### 1. Group Status Handling
- Admin can add/remove members regardless of group status
- Dynamically adjusts `minMembers`/`maxMembers` to bypass validation
- Handles `locked` and `finalized` groups

### 2. Member Count Edge Cases
- Only 2 members remaining: Shows specific error suggesting disband
- Only 1 member remaining: Automatically disbands group
- Last member removal: Disbands group automatically

### 3. Leader Removal
- Automatically assigns new leader (first active member)
- Updates group name based on new leader
- Handles case where leader is the only member

### 4. Project Registration
- Faculty allocation/deallocation only available if project is registered
- Shows warning message if no project
- Prevents allocation attempts without project

### 5. Duplicate Members
- Prevents adding same student twice
- Handles students already in other groups (with force option)

### 6. Semester Validation
- Disband only works for Semester 5 groups
- Only removes Sem 5 related data from students
- Validates semester matches before operations

### 7. Faculty Allocation Edge Cases
- Prevents allocating if faculty already allocated
- Requires project to be registered
- Handles missing FacultyPreference records

---

## Error Handling

### 1. Backend Error Handling
- Transaction rollback on errors
- Specific error messages for different scenarios
- Validation errors with clear messages
- 404 errors for missing resources
- 400 errors for invalid operations

### 2. Frontend Error Handling
- `handleApiError()` utility for consistent error handling
- Toast notifications for errors
- Loading state cleanup on errors
- Modal state management on errors

### 3. Network Error Handling
- Retry logic consideration
- Fallback mechanisms (e.g., `getFaculty` if `searchFaculties` fails)
- User-friendly error messages

---

## Data Synchronization

### 1. Group-Student Synchronization
- `Group.members` ↔ `Student.groupMemberships`
- `Group.leader` ↔ `Student.groupMemberships[].role`
- `Group.name` updates when leader changes
- `Student.groupId` synced with group membership

### 2. Group-Project Synchronization
- `Group.project` ↔ `Project.group`
- `Group.allocatedFaculty` ↔ `Project.faculty`
- Project deletion when group disbanded

### 3. Faculty Allocation Synchronization
- `Group.allocatedFaculty` ↔ `Project.faculty` ↔ `FacultyPreference.allocatedFaculty`
- Status synchronization: `Group.status` ↔ `Project.status` ↔ `FacultyPreference.status`
- Student `currentProjects[].status` updated on allocation

### 4. Invitation Synchronization
- `Group.invites` ↔ `Student.invites`
- Status synced in both locations
- Cleanup on member removal/disband

---

## API Functions (Frontend)

### Added to `adminAPI`:
```javascript
getGroups(params)              // With search support
getGroupDetails(groupId)
addMemberToGroup(groupId, data)
removeMemberFromGroup(groupId, studentId, data)
changeGroupLeader(groupId, data)
disbandGroup(groupId, data)
allocateFacultyToGroup(groupId, data)
deallocateFacultyFromGroup(groupId)
searchFaculties(params)        // New function
```

---

## State Management (Frontend)

### State Variables Added:
- `loading`, `groups`, `selectedGroup`
- `showAddMemberModal`, `showRemoveMemberModal`, `showChangeLeaderModal`, `showDisbandModal`
- `showAllocateFacultyModal`
- `memberToRemove`, `disbandReason`
- `addingMember`, `removingMember`, `changingLeader`, `disbandingGroup`
- `allocatingFaculty`, `deallocatingFaculty`
- `availableFaculty`, `loadingFaculty`, `facultySearchTerm`, `facultySortBy`
- `students`, `studentsLoading`, `studentsLoaded`
- `searchTerm`, `studentSearchTerm`
- `selectedStudentsForAdd`, `addMemberForm`, `addStep`
- `searchTimeoutRef`, `facultySearchTimeoutRef`

---

## Key Implementation Notes for Sem 6

1. **Transaction Usage**: All critical operations use MongoDB transactions
2. **Data Cleanup**: Complete deletion (not just marking) for disbanded groups
3. **Semester-Specific**: Always validate and only modify data for the specific semester
4. **Dynamic Validation**: Adjust `minMembers`/`maxMembers` during admin operations
5. **Status Synchronization**: Keep Group, Project, FacultyPreference, and Student in sync
6. **Edge Case Handling**: Handle all edge cases (last member, leader removal, etc.)
7. **UI Feedback**: Loading states and toast notifications for all operations
8. **Search Functionality**: Backend-side search for better performance
9. **Conditional Features**: Show features only when prerequisites are met (e.g., project registration)

---

## Files Modified

### Backend:
- `backend/controllers/adminController.js` - All group management functions
- `backend/routes/adminRoutes.js` - All routes
- `backend/models/Group.js` - `isReadyForAllocation()` method updated

### Frontend:
- `frontend/src/pages/admin/ManageProjects.jsx` - Complete rewrite
- `frontend/src/utils/api.js` - New API functions
- `frontend/src/components/common/Navbar.jsx` - Minor Project 2 link logic
- `frontend/src/pages/student/MinorProject2Registration.jsx` - Member count validation
- `frontend/src/hooks/useGroupManagement.js` - Member count fixes
- `frontend/src/pages/student/MajorProject1Registration.jsx` - Member count fixes

---

## Testing Checklist

- [ ] Add member to group (various statuses)
- [ ] Remove member from group (leader, regular member, last member)
- [ ] Change group leader
- [ ] Disband group (with/without project, with/without faculty)
- [ ] Allocate faculty (with project registered)
- [ ] Deallocate faculty
- [ ] Search groups by various criteria
- [ ] Faculty allocation without project (should show warning)
- [ ] Member count edge cases (1, 2 members)
- [ ] Transaction rollback on errors
- [ ] Data cleanup verification after disband

---

## Future Considerations for Sem 6

1. Similar structure but for Major Project 1 (Sem 6)
2. May have different project types
3. May have different group size requirements
4. May have different faculty allocation workflow
5. Consider continuation projects from Sem 5
6. May need different validation rules

---

**Last Updated**: Based on current implementation
**Version**: 1.0

