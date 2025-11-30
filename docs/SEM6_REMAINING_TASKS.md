# Sem 6 Project Management - Remaining Tasks

## ✅ Completed Features

### Phase 1: Disband Group ✅
- ✅ Made dynamic for all semesters (5, 6, 7, 8)
- ✅ Handles empty groups (auto-delete)
- ✅ Deletes project from student history (not just mark cancelled)
- ✅ Semester-specific cleanup (only affects current semester)
- ✅ Frontend modal with member list and Sem 6 warnings

### Phase 2: Add Member ✅
- ✅ Made dynamic for all semesters (5, 6, 7, 8)
- ✅ Sem 6 validation (Sem 5 group history check)
- ✅ Sem 7 validation (coursework eligibility)
- ✅ Sem 8 validation (Type 1 check)
- ✅ Handles project updates when adding member
- ✅ Updates student records correctly

### Phase 3: Remove Member ✅
- ✅ Made dynamic for all semesters (5, 6, 7, 8)
- ✅ Handles last member removal (triggers disband)
- ✅ Deletes project from student history (not just mark cancelled)
- ✅ Handles project updates when removing member
- ✅ Updates student records correctly

### Phase 4: Search Functionality ✅
- ✅ Created new `searchStudentsForGroup` endpoint
- ✅ Sem 6 search filters (Sem 5 group history, not in Sem 6 group)
- ✅ Eligibility flags in response (isEligible, eligibilityReason)
- ✅ Frontend updated to use new search endpoint
- ✅ Frontend shows disabled students with eligibility reasons
- ✅ Debounced search (300ms)

---

## 🔄 Remaining Tasks for Sem 6

### 1. Update `updateGroupInfo` Function
**Status**: ❌ Needs Update  
**Issue**: Hardcoded Sem 5 check (line 4899)

**Current Code**:
```javascript
// 2. Validate group is for Sem 5
if (group.semester !== 5) {
  return res.status(400).json({
    success: false,
    message: 'This endpoint is currently only for Semester 5 groups'
  });
}
```

**Required Change**:
- Remove Sem 5 restriction
- Allow Sem 5, 6, 7, 8
- Keep all validation logic (it's already semester-agnostic)

**File**: `backend/controllers/adminController.js` (line ~4882)

---

### 2. Verify `changeGroupLeader` Function
**Status**: ⚠️ Needs Verification  
**Issue**: Need to check if it has any hardcoded semester checks

**Action**: 
- Check if `changeGroupLeader` uses `group.semester` dynamically
- Verify it works for Sem 6
- Update if needed

**File**: `backend/controllers/adminController.js` (line ~4350)

---

### 3. Verify Faculty Allocation/Deallocation
**Status**: ✅ Likely OK (needs verification)  
**Current Status**:
- `allocateFacultyToGroup`: Uses `group.semester` dynamically ✅
- `deallocateFacultyFromGroup`: Uses `group.semester` dynamically ✅

**Action**: 
- Test allocation/deallocation for Sem 6 groups
- Verify project status updates correctly
- Verify student currentProjects updates correctly

**Files**: 
- `backend/controllers/adminController.js` (lines ~5078, ~5193)

---

### 4. Testing Checklist
**Status**: ⏳ Pending

#### Disband Group
- [ ] Disband Sem 6 group with no project
- [ ] Disband Sem 6 group with registered project
- [ ] Disband Sem 6 group with faculty allocated
- [ ] Disband empty Sem 6 group
- [ ] Verify Sem 5 data is not affected
- [ ] Verify members can be added to other groups after disband

#### Add Member
- [ ] Add member with Sem 5 history to Sem 6 group
- [ ] Add member without Sem 5 history (should fail)
- [ ] Add member already in another Sem 6 group (should fail)
- [ ] Add member to Sem 6 group with project
- [ ] Add member to Sem 6 group without project

#### Remove Member
- [ ] Remove member from Sem 6 group with multiple members
- [ ] Remove last member from Sem 6 group (should disband)
- [ ] Remove member from Sem 6 group with project
- [ ] Remove member from Sem 6 group without project
- [ ] Verify student records updated correctly

#### Search Functionality
- [ ] Search Sem 6 students (should show only with Sem 5 history)
- [ ] Verify disabled students are shown but not selectable
- [ ] Verify eligibility reasons are displayed
- [ ] Test debounced search

#### Faculty Allocation
- [ ] Allocate faculty to Sem 6 group
- [ ] Deallocate faculty from Sem 6 group
- [ ] Verify project status updates
- [ ] Verify student currentProjects updates

#### Other Features
- [ ] Change leader works for Sem 6
- [ ] Group details show correctly for Sem 6
- [ ] All UI components render properly

---

## Summary

### Completed: 4/6 Phases ✅
1. ✅ Disband Group
2. ✅ Add Member
3. ✅ Remove Member
4. ✅ Search Functionality

### Remaining: 2 Items
1. ❌ Update `updateGroupInfo` (remove Sem 5 hardcoding)
2. ⚠️ Verify `changeGroupLeader` (check for hardcoding)

### Verification Needed: 1 Item
1. ⚠️ Test Faculty Allocation/Deallocation for Sem 6

---

**Estimated Time to Complete**: 30-60 minutes

**Priority**: 
- High: `updateGroupInfo` (blocks admin from updating Sem 6 groups)
- Medium: `changeGroupLeader` verification
- Low: Faculty allocation testing (likely works, just needs verification)

