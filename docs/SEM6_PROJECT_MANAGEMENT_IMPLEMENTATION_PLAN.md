# Sem 6 Minor Project 3 - Project Management Implementation Plan

## Overview
This document outlines the step-by-step implementation plan for Sem 6 project management features, addressing all edge cases and semester-specific requirements.

---

## Key Decisions & Clarifications

### 1. Disband Group for Sem 6 ✅
**Decision**: Allow disbanding with the understanding that members can be added to other groups.

**Logic**:
- Disband group → Free all members
- Members can be added to other Sem 6 groups
- If group becomes empty after disbanding → Delete the group document
- **Edge Cases**: See section below

### 2. Add/Remove Member ✅
**Decision**: Allow add/remove member operations.

**Validation**:
- Since we create **new documents** for Sem 6 (not reuse Sem 5 documents), history is maintained
- Removing last member = same as disband (orphaned group)
- **Edge Cases**: See section below

### 3. Faculty Allocation/Deallocation ✅
**Decision**: Same as Sem 5 - fully functional.

### 4. Search Functionality 🔄
**Decision**: **DO NOT** reuse exact Sem 5 search. Implement semester-specific search matching group formation invite search.

**Requirements**:
- **Sem 5 & 6**: Show all students
- **Sem 7**: Show only coursework students (disable 6-month internship students)
- **Sem 8**: Show Type 1 and Type 2 students, further divided by internship/coursework
- Match the logic from `getAvailableStudents` in `studentController.js`

### 5. Other Features ✅
**Decision**: Same as Sem 5 (Change Leader, etc.)

---

## Edge Cases Analysis

### Edge Case 1: Disband Group with Registered Project
**Scenario**: Group has registered project, admin disbands group.

**Current Sem 5 Behavior**:
- Deletes project
- Removes faculty preferences
- Deletes group
- Cleans up student records

**Sem 6 Required Behavior**:
- Same cleanup as Sem 5
- **BUT**: After cleanup, members are "free" and can be added to other groups
- If project was registered:
  - Delete Sem 6 project (not Sem 5 project)
  - Remove Sem 6 faculty preferences (not Sem 5)
  - Clean up Sem 6 student records (not Sem 5)
  - **Critical**: Ensure we're only deleting Sem 6 data, not Sem 5 data

**Implementation**:
```javascript
// In disbandGroup function
if (group.semester === 6) {
  // Only delete Sem 6 project
  if (group.project) {
    const project = await Project.findById(group.project).session(session);
    if (project && project.semester === 6) {
      // Delete Sem 6 project
      await Project.findByIdAndDelete(project._id, { session });
    }
  }
  
  // Only remove Sem 6 faculty preferences
  await FacultyPreference.deleteMany({
    group: groupId,
    semester: 6
  }).session(session);
  
  // Clean up Sem 6 student records only
  // Remove Sem 6 groupMemberships, not Sem 5
  // Remove Sem 6 currentProjects, not Sem 5
}
```

### Edge Case 2: Disband Group with No Members
**Scenario**: Group has no active members (all removed).

**Behavior**:
- If group has 0 active members → Delete group immediately
- No need to clean up member records (already cleaned)
- Still need to clean up project/faculty preferences if exists

**Implementation**:
```javascript
const activeMembers = group.members.filter(m => m.isActive);
if (activeMembers.length === 0) {
  // Group is already empty, just delete it
  // Clean up project and faculty preferences
  // Then delete group
}
```

### Edge Case 3: Disband Group with Members in Other Groups
**Scenario**: Admin disbands group, but some members are already in other groups.

**Behavior**:
- This shouldn't happen (members can't be in multiple groups)
- But if it does (data inconsistency):
  - Remove from disbanded group
  - Keep them in their other group
  - Log warning

### Edge Case 4: Add Member Who Was in Disbanded Group
**Scenario**: Student was in disbanded group, admin adds them to new group.

**Validation**:
- Check if student has Sem 5 group history (required for Sem 6)
- Check if student is already in another Sem 6 group
- If both checks pass → Allow addition

**Implementation**:
```javascript
// Check Sem 5 group history
const hasSem5Group = student.groupMemberships.some(
  gm => gm.semester === 5
);

if (!hasSem5Group) {
  throw new Error('Student must have been in a Sem 5 group to join Sem 6 group');
}

// Check if already in Sem 6 group
const inSem6Group = student.groupMemberships.some(
  gm => gm.semester === 6 && gm.isActive
);

if (inSem6Group && inSem6Group.group.toString() !== groupId) {
  throw new Error('Student is already in another Sem 6 group');
}
```

### Edge Case 5: Remove Last Member from Group
**Scenario**: Admin removes last member from Sem 6 group.

**Behavior**:
- Same as disbanding
- Remove member → Group becomes empty → Delete group
- Clean up project/faculty preferences

**Implementation**:
```javascript
if (activeMembers.length === 1 && memberToRemove.isActive) {
  // Removing last member = disbanding group
  // Perform same cleanup as disbandGroup
  // Then delete group
}
```

### Edge Case 6: Add Member to Group with Registered Project
**Scenario**: Group has registered project, admin adds new member.

**Behavior**:
- Add member to group
- Add member to project (if project exists)
- Update student's `currentProjects` array
- Update student's `groupMemberships` array

**Implementation**:
```javascript
// After adding member to group
if (group.project) {
  const project = await Project.findById(group.project).session(session);
  if (project) {
    // Add student to project's group members (if needed)
    // Update student's currentProjects
    student.currentProjects.push({
      project: project._id,
      semester: 6,
      status: project.status === 'faculty_allocated' ? 'active' : 'registered',
      role: 'member'
    });
  }
}
```

### Edge Case 7: Remove Member from Group with Registered Project
**Scenario**: Group has registered project, admin removes member.

**Behavior**:
- Remove member from group
- Update project (if project exists)
- Update student's `currentProjects` (mark as cancelled or remove)
- Update student's `groupMemberships`

**Implementation**:
```javascript
// After removing member from group
if (group.project) {
  const project = await Project.findById(group.project).session(session);
  if (project) {
    // Update student's currentProjects
    const projectIndex = student.currentProjects.findIndex(cp => 
      cp.project.toString() === project._id.toString() && cp.semester === 6
    );
    if (projectIndex !== -1) {
      student.currentProjects[projectIndex].status = 'cancelled';
      // Or remove entirely? Need to decide
    }
  }
}
```

### Edge Case 8: Search - Sem 7 Students in Sem 6 Context
**Scenario**: Admin managing Sem 6 groups, but search shows Sem 7 students.

**Behavior**:
- Search should only show Sem 6 students
- Filter by `semester: 6` in search query
- Apply Sem 6-specific filters (Sem 5 group history)

### Edge Case 9: Search - Sem 8 Type 1/Type 2 Students
**Scenario**: Admin managing Sem 8 groups, search should show Type 1 students only.

**Behavior**:
- For Sem 8: Only show Type 1 students (can join groups)
- Type 2 students should be disabled/grayed out
- Show eligibility status in search results

---

## Implementation Phases

### Phase 1: Update Disband Group for Sem 6
**Goal**: Allow disbanding Sem 6 groups with proper cleanup.

**Tasks**:
1. Update `disbandGroup` function to handle Sem 6
2. Add semester check (allow Sem 5 and Sem 6)
3. Ensure only Sem 6 data is deleted (not Sem 5)
4. Handle empty group deletion
5. Test edge cases

**Files to Modify**:
- `backend/controllers/adminController.js` - `disbandGroup` function

**Key Changes**:
```javascript
// Remove Sem 5 restriction
if (group.semester !== 5 && group.semester !== 6) {
  throw new Error('This endpoint is only for Semester 5 and 6 groups');
}

// For Sem 6, only delete Sem 6 data
if (group.semester === 6) {
  // Delete Sem 6 project only
  // Remove Sem 6 faculty preferences only
  // Clean up Sem 6 student records only
}
```

**Testing Checklist**:
- [ ] Disband Sem 6 group with no project
- [ ] Disband Sem 6 group with registered project
- [ ] Disband Sem 6 group with faculty allocated
- [ ] Disband empty Sem 6 group
- [ ] Verify Sem 5 data is not affected
- [ ] Verify members can be added to other groups after disband

---

### Phase 2: Update Add Member for Sem 6
**Goal**: Allow adding members to Sem 6 groups with proper validation.

**Tasks**:
1. Update `addMemberToGroup` function
2. Add Sem 6 validation (Sem 5 group history check)
3. Handle project updates when adding member
4. Update student records correctly

**Files to Modify**:
- `backend/controllers/adminController.js` - `addMemberToGroup` function

**Key Changes**:
```javascript
// Add Sem 6 validation
if (group.semester === 6) {
  // Check Sem 5 group history
  const hasSem5Group = student.groupMemberships.some(
    gm => gm.semester === 5
  );
  
  if (!hasSem5Group) {
    throw new Error('Student must have been in a Sem 5 group to join Sem 6 group');
  }
  
  // Check if already in Sem 6 group
  const inSem6Group = student.groupMemberships.some(
    gm => gm.semester === 6 && gm.isActive && 
    gm.group.toString() !== groupId
  );
  
  if (inSem6Group) {
    throw new Error('Student is already in another Sem 6 group');
  }
}

// After adding member, update project if exists
if (group.project && group.semester === 6) {
  // Add student to project
  // Update student's currentProjects
}
```

**Testing Checklist**:
- [ ] Add member with Sem 5 history
- [ ] Add member without Sem 5 history (should fail)
- [ ] Add member already in another Sem 6 group (should fail)
- [ ] Add member to group with project
- [ ] Add member to group without project

---

### Phase 3: Update Remove Member for Sem 6
**Goal**: Allow removing members from Sem 6 groups with proper handling.

**Tasks**:
1. Update `removeMemberFromGroup` function
2. Handle last member removal (same as disband)
3. Handle project updates when removing member
4. Update student records correctly

**Files to Modify**:
- `backend/controllers/adminController.js` - `removeMemberFromGroup` function

**Key Changes**:
```javascript
// For Sem 6, handle last member removal
if (group.semester === 6 && activeMembers.length === 1) {
  // Same as disbanding
  // Clean up project/faculty preferences
  // Delete group
  // Update student records
}

// After removing member, update project if exists
if (group.project && group.semester === 6) {
  // Update student's currentProjects
  // Mark project entry as cancelled or remove
}
```

**Testing Checklist**:
- [ ] Remove member from group with multiple members
- [ ] Remove last member (should disband group)
- [ ] Remove member from group with project
- [ ] Remove member from group without project
- [ ] Verify student records updated correctly

---

### Phase 4: Implement Semester-Specific Search
**Goal**: Implement search functionality matching group formation invite search.

**Tasks**:
1. Create new search endpoint or update existing one
2. Implement semester-specific filters:
   - Sem 5 & 6: All students
   - Sem 7: Only coursework students
   - Sem 8: Type 1 students only
3. Add eligibility flags in response
4. Update frontend to show disabled students

**Files to Create/Modify**:
- `backend/controllers/adminController.js` - New `searchStudentsForGroup` function
- `frontend/src/pages/admin/ManageProjects.jsx` - Update Add Member modal

**Key Implementation**:
```javascript
// New function: searchStudentsForGroup
const searchStudentsForGroup = async (req, res) => {
  const { groupId, search, semester } = req.query;
  
  const group = await Group.findById(groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  
  const targetSemester = semester || group.semester;
  
  // Base query
  const searchQuery = {
    semester: targetSemester,
    degree: group.degree // Match degree
  };
  
  // Add search term
  if (search) {
    // Search by name, MIS, email, phone
  }
  
  // Get students
  const students = await Student.find(searchQuery)
    .populate('user', 'email')
    .limit(50);
  
  // Apply semester-specific filters
  const studentsWithEligibility = await Promise.all(
    students.map(async (student) => {
      let isEligible = true;
      let eligibilityReason = null;
      
      if (targetSemester === 7) {
        // Check coursework eligibility
        const eligibility = checkSem7CourseworkEligibility(student);
        isEligible = eligibility.eligible;
        eligibilityReason = eligibility.reason;
      } else if (targetSemester === 8) {
        // Check Type 1 eligibility
        const studentType = student.getSem8StudentType();
        isEligible = studentType === 'type1';
        eligibilityReason = isEligible ? null : 'Only Type 1 students can join groups';
      } else if (targetSemester === 6) {
        // Check Sem 5 group history
        const hasSem5Group = student.groupMemberships.some(
          gm => gm.semester === 5
        );
        isEligible = hasSem5Group;
        eligibilityReason = isEligible ? null : 'Student must have been in a Sem 5 group';
        
        // Check if already in Sem 6 group
        const inSem6Group = student.groupMemberships.some(
          gm => gm.semester === 6 && gm.isActive
        );
        if (inSem6Group) {
          isEligible = false;
          eligibilityReason = 'Student is already in a Sem 6 group';
        }
      }
      
      return {
        ...student.toObject(),
        isEligible,
        eligibilityReason
      };
    })
  );
  
  res.json({
    success: true,
    data: studentsWithEligibility
  });
};
```

**Frontend Changes**:
```javascript
// In Add Member modal
{students.map(student => (
  <div 
    key={student._id}
    className={student.isEligible ? '' : 'opacity-50 cursor-not-allowed'}
  >
    {student.fullName}
    {!student.isEligible && (
      <span className="text-xs text-red-600">
        {student.eligibilityReason}
      </span>
    )}
  </div>
))}
```

**Testing Checklist**:
- [ ] Search Sem 5 students (should show all)
- [ ] Search Sem 6 students (should show only with Sem 5 history)
- [ ] Search Sem 7 students (should show only coursework)
- [ ] Search Sem 8 students (should show only Type 1)
- [ ] Verify disabled students are shown but not selectable
- [ ] Verify eligibility reasons are displayed

---

### Phase 5: Faculty Allocation/Deallocation (No Changes)
**Goal**: Ensure faculty allocation/deallocation works for Sem 6.

**Tasks**:
1. Verify existing functions work for Sem 6
2. Test allocation/deallocation
3. Ensure Sem 6 project updates correctly

**Files to Check**:
- `backend/controllers/adminController.js` - `allocateFacultyToGroup`, `deallocateFacultyFromGroup`

**Testing Checklist**:
- [ ] Allocate faculty to Sem 6 group
- [ ] Deallocate faculty from Sem 6 group
- [ ] Verify project status updates
- [ ] Verify student currentProjects updates

---

### Phase 6: Other Features (No Changes)
**Goal**: Verify other features work for Sem 6.

**Tasks**:
1. Test Change Leader
2. Test Group Details display
3. Test all UI components

**Testing Checklist**:
- [ ] Change leader works
- [ ] Group details show correctly
- [ ] All UI components render properly

---

## Database Operations Summary

### Disband Group (Sem 6)
1. **Group**: Delete group document
2. **Project**: Delete Sem 6 project (if exists)
3. **FacultyPreference**: Delete Sem 6 preferences (if exists)
4. **Student**:
   - Remove Sem 6 `groupMemberships[]` entry
   - Remove Sem 6 `currentProjects[]` entry
   - Remove Sem 6 `invites[]` entry
   - **Keep Sem 5 data intact**

### Add Member (Sem 6)
1. **Group**: Add member to `members[]` array
2. **Student**: 
   - Add Sem 6 `groupMemberships[]` entry
   - If project exists: Add Sem 6 `currentProjects[]` entry
3. **Project**: Update if needed (add member reference)

### Remove Member (Sem 6)
1. **Group**: Mark member as inactive in `members[]` array
2. **Student**:
   - Mark Sem 6 `groupMemberships[]` as inactive
   - If project exists: Update Sem 6 `currentProjects[]` status to 'cancelled'
3. **Project**: Update if needed
4. **If last member**: Perform disband operations

---

## API Endpoints

### Existing Endpoints (Update for Sem 6)
- `DELETE /admin/groups/:groupId/disband` - Update to allow Sem 6
- `POST /admin/groups/:groupId/members/:studentId` - Update validation
- `DELETE /admin/groups/:groupId/members/:studentId` - Update handling
- `POST /admin/groups/:groupId/allocate-faculty` - Verify works
- `DELETE /admin/groups/:groupId/deallocate-faculty` - Verify works

### New Endpoints
- `GET /admin/groups/:groupId/search-students` - Semester-specific search

---

## Frontend Changes

### ManageProjects.jsx Updates
1. **Disband Button**: Show for Sem 6 (with warning)
2. **Add Member Modal**: 
   - Use new search endpoint
   - Show eligibility status
   - Disable ineligible students
3. **Remove Member Modal**: 
   - Show warning for last member
   - Handle Sem 6-specific cases
4. **Group Details**: Show Sem 6-specific info

---

## Testing Strategy

### Unit Tests
- Test disband logic for Sem 6
- Test add/remove member validation
- Test search filters

### Integration Tests
- Test full disband flow
- Test add member flow
- Test remove member flow
- Test search functionality

### Manual Testing
- Test all edge cases
- Test UI interactions
- Test error handling

---

## Rollout Plan

1. **Phase 1**: Disband Group (1-2 days)
2. **Phase 2**: Add Member (1-2 days)
3. **Phase 3**: Remove Member (1 day)
4. **Phase 4**: Search Functionality (2-3 days)
5. **Phase 5**: Faculty Allocation (verification only)
6. **Phase 6**: Other Features (verification only)

**Total Estimated Time**: 5-8 days

---

## Risk Mitigation

### Risk 1: Accidentally Deleting Sem 5 Data
**Mitigation**: 
- Always check `semester` field before operations
- Use explicit semester filters in queries
- Add validation checks

### Risk 2: Data Inconsistency
**Mitigation**:
- Use MongoDB transactions
- Validate state before operations
- Add rollback mechanisms

### Risk 3: Performance Issues
**Mitigation**:
- Use pagination in search
- Index database fields
- Optimize queries

---

## Success Criteria

1. ✅ Admin can disband Sem 6 groups
2. ✅ Members can be added to other groups after disband
3. ✅ Admin can add/remove members with proper validation
4. ✅ Search shows correct students based on semester
5. ✅ All edge cases handled correctly
6. ✅ No Sem 5 data is affected
7. ✅ UI is intuitive and provides proper feedback

---

**Last Updated**: Based on user requirements and codebase analysis
**Version**: 1.0

