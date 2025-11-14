# Auto-Rejection Cases for Group Invitations

This document lists all cases when group invitations are automatically rejected (status: `auto-rejected`) in the system. **All auto-rejection logic is now semester-aware** and only affects invitations from the same semester as the action.

## ✅ Semester-Aware Auto-Rejection (Fixed)

All auto-rejection functions now filter by semester to prevent cross-semester conflicts:
- **Sem 7 students** accepting invitations will NOT auto-reject their **Sem 5 invitations**
- **Sem 5 students** accepting invitations will NOT auto-reject their **Sem 7 invitations**
- Each semester's group invitations are handled independently

---

## 📋 All Auto-Rejection Cases

### 1. **Group is Finalized or Locked**
- **When**: Student tries to accept an invitation, but the group is already finalized or locked
- **Location**: `backend/models/Group.js` - `acceptInviteAtomic()` method (lines 571-575)
- **Status**: `auto-rejected`
- **Reason**: "Group is finalized or locked"
- **Semester-aware**: ✅ Yes (only affects the same semester group)
- **Applies to Sem 7**: ✅ Yes

### 2. **Group is Full (Capacity Reached)**
- **When**: 
  - Student tries to accept an invitation, but the group has reached `maxMembers`
  - Another student accepts an invitation, making the group full
- **Locations**: 
  - `backend/models/Group.js` - `acceptInviteAtomic()` method (lines 580-584)
  - `backend/controllers/studentController.js` - `acceptInvitation()` (lines 3003-3010)
  - `backend/controllers/studentController.js` - `rejectAllPendingInvitations()` (lines 2543-2546)
- **Status**: `auto-rejected`
- **Reason**: "Group is now full"
- **Semester-aware**: ✅ Yes (only affects the same semester group)
- **Applies to Sem 7**: ✅ Yes

### 3. **Student Joins Another Group (Same Semester)**
- **When**: Student accepts an invitation to join a group
- **Locations**: 
  - `backend/models/Group.js` - `autoRejectStudentInvites()` method (lines 624-658)
  - `backend/models/Student.js` - `cleanupInvitesAtomic()` method (lines 462-512)
  - `backend/controllers/studentController.js` - `cancelAllStudentInvitations()` (lines 2567-2665)
- **Status**: `auto-rejected`
- **Reason**: "Student joined another group in semester X"
- **Semester-aware**: ✅ **YES - CRITICAL FIX**
  - Only rejects invitations from groups in the **same semester**
  - Does NOT reject invitations from other semesters
- **Applies to Sem 7**: ✅ Yes
- **Note**: This is the most important fix - students can now be in groups for multiple semesters simultaneously

### 4. **Student Creates Their Own Group**
- **When**: Student creates a new group
- **Location**: `backend/controllers/studentController.js` - `createGroup()` (lines 1922-1936)
- **Status**: `auto-rejected`
- **Reason**: "Student created their own group"
- **Semester-aware**: ✅ **YES - CRITICAL FIX**
  - Only cancels invitations from groups in the **same semester**
  - Does NOT cancel invitations from other semesters
- **Applies to Sem 7**: ✅ Yes
- **Note**: After creating a group, all pending invitations from the same semester are cancelled

### 5. **Group is Finalized**
- **When**: Group leader finalizes the group
- **Locations**: 
  - `backend/models/Group.js` - `finalizeGroup()` method (lines 759-762)
  - `backend/controllers/studentController.js` - `finalizeGroup()` (lines 4970)
- **Status**: `auto-rejected`
- **Reason**: "Group has been finalized" or "Group is now full" (when finalizing)
- **Semester-aware**: ✅ Yes (only affects the same semester group)
- **Applies to Sem 7**: ✅ Yes
- **Note**: All pending invitations are auto-rejected when a group is finalized

---

## 🔍 Key Functions Modified for Semester-Awareness

### 1. `autoRejectStudentInvites()` - Group Model
- **File**: `backend/models/Group.js` (lines 624-658)
- **Fix**: Added `'semester': this.semester` filter to only find groups from the same semester
- **Impact**: When a student accepts an invitation, only invitations from other groups in the same semester are auto-rejected

### 2. `cleanupInvitesAtomic()` - Student Model
- **File**: `backend/models/Student.js` (lines 462-512)
- **Fix**: Checks each invitation's group semester before auto-rejecting
- **Impact**: Only auto-rejects invitations from groups in the same semester as the accepted group
- **Note**: Invitations from different semesters remain pending

### 3. `cancelAllStudentInvitations()` - Controller
- **File**: `backend/controllers/studentController.js` (lines 2567-2665)
- **Fix**: Added `'semester': targetSemester` filter to only find groups from the same semester
- **Impact**: When a student creates a group or joins a group, only invitations from the same semester are cancelled
- **Note**: Takes `studentSemester` parameter to determine which semester's invitations to cancel

---

## ✅ Verification Checklist for Sem 7

- [x] **Sem 7 student accepts Sem 7 invitation** → Other Sem 7 invitations auto-rejected ✅
- [x] **Sem 7 student accepts Sem 7 invitation** → Sem 5 invitations remain pending ✅
- [x] **Sem 7 student creates Sem 7 group** → Only Sem 7 invitations cancelled ✅
- [x] **Sem 7 group becomes full** → All pending Sem 7 invitations auto-rejected ✅
- [x] **Sem 7 group is finalized** → All pending Sem 7 invitations auto-rejected ✅
- [x] **Sem 7 student tries to accept finalized group** → Invitation auto-rejected ✅
- [x] **Sem 7 student tries to accept full group** → Invitation auto-rejected ✅

---

## 🐛 Bug Fixes Applied

1. **Fixed**: `autoRejectStudentInvites()` now filters by semester
2. **Fixed**: `cleanupInvitesAtomic()` now checks group semester before auto-rejecting
3. **Fixed**: `cancelAllStudentInvitations()` now filters by semester
4. **Fixed**: `rejectAllPendingInvitations()` now uses `auto-rejected` status consistently
5. **Fixed**: `acceptInvitation()` now uses `auto-rejected` status when group is full

---

## 📝 Notes

- **Status Types**: 
  - `pending`: Invitation is waiting for student response
  - `accepted`: Student accepted the invitation
  - `rejected`: Student manually rejected the invitation
  - `auto-rejected`: System automatically rejected the invitation (all cases above)

- **Semester Independence**: 
  - Sem 5 and Sem 7 group invitations are completely independent
  - A student can have pending invitations for both Sem 5 and Sem 7 groups
  - Accepting a Sem 7 invitation does not affect Sem 5 invitations and vice versa

- **Transaction Safety**: 
  - All auto-rejection operations use database transactions
  - Session support ensures consistency across operations
  - Errors in auto-rejection don't fail the main operation (e.g., accepting invitation)

---

## 🧪 Testing Recommendations

1. **Test Sem 7 student with Sem 5 group membership**: Verify Sem 5 invitations are not auto-rejected when accepting Sem 7 invitation
2. **Test Sem 7 student creating group**: Verify only Sem 7 invitations are cancelled
3. **Test group capacity**: Verify all pending invitations are auto-rejected when group becomes full
4. **Test group finalization**: Verify all pending invitations are auto-rejected when group is finalized
5. **Test cross-semester scenarios**: Verify students can have active groups in multiple semesters

