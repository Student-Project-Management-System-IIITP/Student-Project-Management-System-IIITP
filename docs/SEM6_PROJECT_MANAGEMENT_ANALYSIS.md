# Sem 6 Minor Project 3 - Project Management Feature Analysis

## Overview
This document analyzes what can be reused from Sem 5 project management implementation and identifies exceptions/restrictions for Sem 6.

---

## Database Structure for Sem 6

### Question: New Documents or Updated Documents?

**Answer: It Depends on Project Type**

#### Scenario 1: Continuation Project (Continuing Sem 5 Project)
- **Group**: **SAME document UPDATED**
  - `Group.semester`: Changed from `5` → `6`
  - `Group.academicYear`: Updated to new academic year
  - `Group.status`: Reset to `'open'`
  - `Group.project`: Cleared (Sem 5 project reference removed)
  - **Function**: `migrateGroupToSem6()` updates existing group
  
- **Project**: **NEW document CREATED**
  - New `Project` document with:
    - `semester: 6`
    - `projectType: 'minor3'`
    - `isContinuation: true`
    - `previousProject: <Sem5ProjectId>`
    - Same title, description, domain from Sem 5
    - Same `group` reference (now Sem 6 group)
    - Same `faculty` (carried over from Sem 5)
    - `status: 'faculty_allocated'` (if faculty was allocated) or `'registered'`
  
- **Sem 5 Project**: **UPDATED**
  - `Project.status`: Changed to `'completed'`
  - `Project.endDate`: Set to current date

#### Scenario 2: New Project (Not Continuing Sem 5 Project)
- **Group**: **NEW document CREATED**
  - New `Group` document with:
    - `semester: 6`
    - `name: "<Sem5GroupName> (Sem 6)"`
    - Same members, leader, faculty from Sem 5
    - `status: 'open'`
    - **Function**: `createNewGroupForSem6()` creates new group
  
- **Project**: **NEW document CREATED**
  - New `Project` document with:
    - `semester: 6`
    - `projectType: 'minor3'`
    - `isContinuation: false`
    - `previousProject: null`
    - New title, domain (user input)
    - New `group` reference
    - Same `faculty` (carried over from Sem 5)
    - `status: 'faculty_allocated'` (if faculty was allocated) or `'registered'`
  
- **Sem 5 Project**: **UPDATED**
  - `Project.status`: Changed to `'completed'`
  - `Project.endDate`: Set to current date

#### Student Collection Changes
- **For Continuation**:
  - Sem 5 `groupMemberships[].isActive`: Set to `false`
  - New Sem 6 `groupMemberships[]` entry added with `semester: 6, isActive: true`
  - Sem 5 `currentProjects[].status`: Changed to `'completed'`
  - New Sem 6 `currentProjects[]` entry added with `semester: 6, status: 'active'`
  
- **For New Project**:
  - Similar to continuation, but new group membership created

---

## What Can Be Reused from Sem 5?

### ✅ Fully Reusable Features

#### 1. **Search Functionality**
- ✅ Backend search endpoint (`GET /admin/groups` with `search` parameter)
- ✅ Frontend search input with debouncing
- ✅ Search across: group name, member details, leader details, allocated faculty
- **No changes needed** - works for any semester

#### 2. **Group List Display (Cards)**
- ✅ Card-based layout
- ✅ Status badges
- ✅ Member count display
- ✅ Project information display
- ✅ Faculty information display
- ✅ Member details display
- **Minor change**: Filter by `semester: 6` instead of `semester: 5`

#### 3. **Group Details Sidebar**
- ✅ Group info display
- ✅ Members list with details
- ✅ Project info display
- ✅ Faculty section
- ✅ Validation status
- **Minor change**: Semester-specific logic

#### 4. **Add Member Modal**
- ✅ 2-step process
- ✅ Student search
- ✅ Availability status display
- ✅ Multi-select
- ✅ Role selection
- **No changes needed** - works for any semester

#### 5. **Remove Member Modal**
- ✅ Confirmation dialog
- ✅ Leader removal handling
- ✅ Loading states
- **No changes needed** - works for any semester

#### 6. **Change Leader Modal**
- ✅ Member selection
- ✅ Loading states
- ✅ Group name update
- **No changes needed** - works for any semester

#### 7. **Allocate/Deallocate Faculty Modal**
- ✅ Faculty search
- ✅ Sort functionality
- ✅ Loading states
- ✅ Conditional display (only if project registered)
- **No changes needed** - works for any semester

#### 8. **Loading States & Toast Notifications**
- ✅ All loading states
- ✅ Success/error toast messages
- **No changes needed**

#### 9. **Backend Core Logic**
- ✅ Transaction handling
- ✅ Data synchronization
- ✅ Error handling
- ✅ Validation logic
- **Minor changes**: Semester-specific checks

---

## Exceptions & Restrictions for Sem 6

### 🚫 Critical Restrictions

#### 1. **Group Creation - NOT ALLOWED**
- **Sem 5**: Students can create new groups
- **Sem 6**: Students **CANNOT** create new groups
- **Reason**: Sem 6 groups must continue from Sem 5 groups
- **Impact on Admin Features**:
  - ❌ **DO NOT** show "Create Group" option for Sem 6
  - ❌ **DO NOT** allow admin to create new groups for Sem 6
  - ✅ Only allow managing existing groups that were migrated/created from Sem 5

#### 2. **Disband Group - RESTRICTED**
- **Critical Issue**: If admin disbands a Sem 6 group, students cannot create a new group
- **Current Sem 5 Implementation**: 
  - Deletes group completely
  - Removes all member data
  - Students can create new group after disband
  
- **Sem 6 Required Changes**:
  - **Option A**: **Prevent disbanding** Sem 6 groups entirely
    - Show warning: "Cannot disband Sem 6 groups. Students cannot create new groups in Sem 6."
    - Hide/disable disband button for Sem 6
  
  - **Option B**: **Restricted disbanding** with special handling
    - Allow disbanding only if:
      - Group has no registered project, OR
      - All members have been removed (empty group)
    - After disbanding:
      - Mark group as disbanded but **DO NOT DELETE**
      - Keep group document for reference
      - Students remain without group (cannot create new one)
      - Admin can manually add students to other existing Sem 6 groups
  
  - **Option C**: **Soft disband** (recommended)
    - Instead of deleting, mark as `disbanded`
    - Keep all data for audit
    - Students cannot rejoin or create new groups
    - Admin can manually reassign students to other groups

#### 3. **Add Member - RESTRICTED**
- **Sem 5**: Can add any student in Sem 5
- **Sem 6**: Can only add students who:
  - Are currently in Sem 6
  - **Were in a Sem 5 group** (have Sem 5 group membership)
  - **Do not already have a Sem 6 group**
- **Validation Required**:
  ```javascript
  // Check if student has Sem 5 group membership
  const hasSem5Group = student.groupMemberships.some(
    gm => gm.semester === 5 && gm.isActive === false // Inactive means completed Sem 5
  );
  
  // Check if student already in Sem 6 group
  const inSem6Group = student.groupMemberships.some(
    gm => gm.semester === 6 && gm.isActive === true
  );
  
  if (!hasSem5Group) {
    // Cannot add - student wasn't in Sem 5 group
  }
  
  if (inSem6Group) {
    // Cannot add - already in Sem 6 group
  }
  ```

#### 4. **Remove Member - RESTRICTED**
- **Sem 5**: Can remove members freely
- **Sem 6**: 
  - Can remove members, but:
    - If removing would leave group empty → **Prevent disbanding** (see restriction #2)
    - If removing last member → **Cannot disband**, must add another member first
  - **Special Case**: If removing all members, group becomes "orphaned"
    - Keep group document
    - Mark as inactive or special status
    - Allow admin to add new members later

#### 5. **Faculty Allocation - AUTOMATIC**
- **Sem 5**: Faculty allocation is manual (admin or faculty choice)
- **Sem 6**: Faculty is **automatically carried over** from Sem 5
  - When group is migrated/created, `allocatedFaculty` is copied
  - When project is registered, `Project.faculty` is set from group
  - **Admin can still deallocate/reallocate**, but initial allocation is automatic
- **Impact**: 
  - Show faculty info as "Carried over from Sem 5"
  - Allow deallocation/reallocation if needed
  - But default is automatic

#### 6. **Project Registration - LEADER ONLY**
- **Sem 5**: Group leader registers project
- **Sem 6**: **Only group leader can register** (already implemented)
- **Impact on Admin**: 
  - Admin cannot register project on behalf of group
  - Must wait for leader to register
  - Can see registration status

#### 7. **Group Status Transitions**
- **Sem 5**: `forming` → `complete` → `locked` (on faculty allocation) → `finalized`
- **Sem 6**: 
  - Group starts as `'open'` after migration
  - Can transition to `'complete'` → `'locked'` (on faculty allocation)
  - **Cannot be `'finalized'`** (different workflow)
  - **Cannot be `'disbanded'`** (see restriction #2)

---

## Required Changes for Sem 6 Implementation

### Backend Changes

#### 1. **Update `disbandGroup` Function**
```javascript
// Add semester check
if (group.semester === 6) {
  // Option A: Prevent disbanding
  return res.status(400).json({
    success: false,
    message: 'Cannot disband Sem 6 groups. Students cannot create new groups in Sem 6. Please remove members individually or contact system administrator.'
  });
  
  // Option B: Soft disband (recommended)
  // Mark as disbanded but don't delete
  group.status = 'disbanded';
  group.isActive = false;
  // Keep all data for reference
  // Don't delete group document
  // Don't delete project (mark as cancelled)
  // Keep student memberships for audit
}
```

#### 2. **Update `addMemberToGroup` Function**
```javascript
// Add Sem 6 validation
if (group.semester === 6) {
  // Check if student has Sem 5 group membership
  const sem5Membership = student.groupMemberships.find(
    gm => gm.semester === 5
  );
  
  if (!sem5Membership) {
    return res.status(400).json({
      success: false,
      message: 'Student must have been in a Sem 5 group to join Sem 6 group'
    });
  }
  
  // Check if student already in Sem 6 group
  const sem6Membership = student.groupMemberships.find(
    gm => gm.semester === 6 && gm.isActive
  );
  
  if (sem6Membership && sem6Membership.group.toString() !== groupId) {
    return res.status(400).json({
      success: false,
      message: 'Student is already in another Sem 6 group'
    });
  }
}
```

#### 3. **Update `removeMemberFromGroup` Function**
```javascript
// Add Sem 6 validation
if (group.semester === 6) {
  const activeMembers = group.members.filter(m => m.isActive);
  
  // Prevent removing last member (would create orphaned group)
  if (activeMembers.length === 1) {
    return res.status(400).json({
      success: false,
      message: 'Cannot remove last member from Sem 6 group. Students cannot create new groups in Sem 6. Please add another member first or contact system administrator.'
    });
  }
  
  // If removing would leave only 1 member, warn admin
  if (activeMembers.length === 2 && memberToRemove.isActive) {
    // Allow but show warning
    // Consider: Should we prevent this too?
  }
}
```

#### 4. **Update `getGroups` Function**
```javascript
// Ensure Sem 6 groups are properly filtered
// For continuation: groups with semester: 6
// For new projects: groups with semester: 6 (created from Sem 5)
// Exclude Sem 5 groups that haven't been migrated
```

#### 5. **Faculty Allocation - Automatic on Registration**
- Faculty is already carried over during group migration/project registration
- Admin can still manually allocate/deallocate if needed
- **No changes needed** to allocate/deallocate functions (they work the same)

### Frontend Changes

#### 1. **Disband Group Button - Conditional Display**
```javascript
// In ManageProjects.jsx
{semester === 5 && selectedGroup.status !== 'disbanded' && (
  <button onClick={() => setShowDisbandModal(true)}>
    Disband Group
  </button>
)}

{semester === 6 && (
  <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
    <div className="font-medium mb-1">⚠️ Disbanding Restricted</div>
    <div>Sem 6 groups cannot be disbanded as students cannot create new groups. 
    Please remove members individually if needed.</div>
  </div>
)}
```

#### 2. **Add Member Modal - Filter Students**
```javascript
// Filter students for Sem 6
if (semester === 6) {
  // Only show students who:
  // 1. Are in Sem 6
  // 2. Have Sem 5 group membership (completed)
  // 3. Are not already in a Sem 6 group
  const availableStudents = students.filter(student => {
    const hasSem5Group = student.groupMemberships?.some(
      gm => gm.semester === 5
    );
    const inSem6Group = student.groupMemberships?.some(
      gm => gm.semester === 6 && gm.isActive
    );
    return student.semester === 6 && hasSem5Group && !inSem6Group;
  });
}
```

#### 3. **Remove Member - Warning for Sem 6**
```javascript
// In remove member modal
{semester === 6 && activeMembers.length <= 2 && (
  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
    <p className="text-sm text-yellow-800">
      ⚠️ Warning: Removing this member will leave only {activeMembers.length - 1} member(s). 
      Students cannot create new groups in Sem 6, so please ensure you have a replacement member ready.
    </p>
  </div>
)}
```

#### 4. **Faculty Section - Show "Carried Over" Status**
```javascript
// In faculty info section
{selectedGroup.allocatedFaculty && semester === 6 && (
  <div className="text-xs text-blue-600 italic mb-1">
    Carried over from Sem 5
  </div>
)}
```

#### 5. **Group List - Show Continuation Status**
```javascript
// In group cards
{group.project?.isContinuation && (
  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
    Continuation Project
  </span>
)}
```

---

## Features That Need Modification

### 1. **Disband Group**
- **Sem 5**: Full deletion with cleanup
- **Sem 6**: 
  - **Option A**: Completely prevent (recommended for safety)
  - **Option B**: Soft disband (mark as disbanded, keep data)
  - **Option C**: Restricted disband (only if no project registered)

### 2. **Add Member**
- **Sem 5**: Any student in Sem 5
- **Sem 6**: Only students with Sem 5 group history, not in Sem 6 group

### 3. **Remove Member**
- **Sem 5**: Can remove freely, can disband if needed
- **Sem 6**: Cannot remove if it would leave group empty/orphaned

### 4. **Group Status**
- **Sem 5**: Can be `finalized`, `disbanded`
- **Sem 6**: Cannot be `finalized`, restricted `disbanded`

---

## Database Field Differences

### Group Collection
- **Sem 5**: `semester: 5`
- **Sem 6**: `semester: 6` (updated from 5 or new document)
- **Both**: Same structure, different semester value

### Project Collection
- **Sem 5**: `projectType: 'minor2'`, `semester: 5`
- **Sem 6**: `projectType: 'minor3'`, `semester: 6`
- **Sem 6 Continuation**: `isContinuation: true`, `previousProject: <Sem5ProjectId>`
- **Sem 6 New**: `isContinuation: false`, `previousProject: null`

### Student Collection
- **Sem 5**: `groupMemberships[]` with `semester: 5, isActive: true`
- **Sem 6**: 
  - Sem 5 membership: `semester: 5, isActive: false` (inactive)
  - Sem 6 membership: `semester: 6, isActive: true` (active)
- **Both**: Same structure, different semester values

---

## Implementation Checklist for Sem 6

### Backend
- [ ] Update `disbandGroup` to prevent/restrict for Sem 6
- [ ] Update `addMemberToGroup` to validate Sem 5 group history
- [ ] Update `removeMemberFromGroup` to prevent last member removal
- [ ] Update `getGroups` to properly filter Sem 6 groups
- [ ] Ensure faculty carryover is automatic (already implemented)
- [ ] Add validation for Sem 6-specific rules

### Frontend
- [ ] Conditionally hide/disable disband button for Sem 6
- [ ] Filter students in "Add Member" modal for Sem 6
- [ ] Add warnings in "Remove Member" modal for Sem 6
- [ ] Show "Carried over from Sem 5" for faculty
- [ ] Show continuation project badge
- [ ] Update semester filter to show Sem 6 groups
- [ ] Add Sem 6-specific help text/warnings

### Testing
- [ ] Test disband prevention for Sem 6
- [ ] Test adding member with/without Sem 5 history
- [ ] Test removing last member (should be prevented)
- [ ] Test faculty carryover
- [ ] Test continuation vs new project scenarios
- [ ] Test group migration (continuation)
- [ ] Test new group creation (new project)

---

## Key Differences Summary

| Feature | Sem 5 | Sem 6 |
|---------|-------|-------|
| **Group Creation** | ✅ Allowed | ❌ Not Allowed |
| **Disband Group** | ✅ Full deletion | 🚫 Prevented/Restricted |
| **Add Member** | Any Sem 5 student | Only with Sem 5 history |
| **Remove Last Member** | ✅ Allowed (disbands) | ❌ Prevented |
| **Faculty Allocation** | Manual | Automatic (carried over) |
| **Project Registration** | Leader registers | Leader registers (same) |
| **Group Document** | New document | Updated (continuation) or New (new project) |
| **Project Document** | New document | Always new document |
| **Group Status** | Can be finalized/disbanded | Cannot be finalized, restricted disbanded |

---

## Recommended Approach

### For Disbanding (Critical Issue)
**Recommendation: Option A - Prevent Disbanding**

1. **Completely prevent disbanding** Sem 6 groups in admin UI
2. Show clear warning message explaining why
3. If admin needs to "disband":
   - Remove all members individually
   - Group becomes empty but remains in system
   - Admin can add new members later
   - Or mark group as inactive manually

**Rationale**: 
- Students cannot create new groups in Sem 6
- Disbanding would leave students without options
- Better to keep group structure and allow member management

### For Add Member
- Filter students to only those with Sem 5 group history
- Show clear indication why some students are unavailable
- Allow adding students from other Sem 6 groups (with force flag)

### For Remove Member
- Prevent removing if it would leave group empty
- Show warning if removing would leave only 1-2 members
- Suggest adding replacement member first

---

## Migration Notes

When implementing Sem 6 features:
1. **Reuse 90% of Sem 5 code** - most features work the same
2. **Add semester checks** - `if (semester === 6) { ... }`
3. **Add validation** - Sem 5 group history checks
4. **Restrict operations** - Disband, last member removal
5. **Update UI** - Conditional buttons, warnings, help text

---

**Last Updated**: Based on current Sem 5 implementation
**Version**: 1.0

