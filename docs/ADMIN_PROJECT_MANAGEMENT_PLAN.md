# Admin Project Management Feature - Implementation Plan

## Overview

This document outlines a comprehensive project management feature for admins that allows them to make any changes to projects across all semesters, supporting both solo and group projects while respecting semester-specific rules and constraints.

## Feature Goals

1. **Complete Project Control**: Admin can modify any aspect of any project
2. **Group Management**: Add/remove members, change leaders, manage group structure
3. **Faculty Allocation**: Allocate/deallocate faculty to projects and groups
4. **Semester-Aware**: Respects semester-specific rules and constraints
5. **Data Integrity**: Maintains referential integrity across all related entities
6. **Audit Trail**: Tracks all changes made by admin

---

## Core Capabilities

### 1. Project Information Management

#### 1.1 View Project Details
- **Endpoint**: `GET /admin/projects/:projectId`
- **Features**:
  - Complete project information with all populated relationships
  - Student(s) information (solo or group members)
  - Faculty information
  - Group information (if applicable)
  - Deliverables and submission status
  - Timeline and deadlines
  - Allocation history
  - Continuation chain (if applicable)
  - Semester-specific metadata

#### 1.2 Update Project Basic Information
- **Endpoint**: `PUT /admin/projects/:projectId`
- **Editable Fields**:
  - Title
  - Description
  - Domain
  - Project Type (with validation)
  - Semester (with validation)
  - Academic Year
  - Status
  - Start Date / End Date
  - Submission Deadline
- **Validations**:
  - Project type must be valid for the semester
  - Status transitions must be logical
  - Dates must be valid

#### 1.3 Change Project Type
- **Endpoint**: `PUT /admin/projects/:projectId/type`
- **Features**:
  - Change project type (e.g., minor1 → minor2)
  - Validate semester compatibility
  - Handle group requirements (add/remove group if needed)
  - Update faculty allocation requirements
- **Constraints**:
  - Cannot change to incompatible types
  - Must handle group transitions properly

#### 1.4 Change Project Semester
- **Endpoint**: `PUT /admin/projects/:projectId/semester`
- **Features**:
  - Move project to different semester
  - Update academic year if needed
  - Validate student semester compatibility
  - Update group semester if applicable
- **Constraints**:
  - Student must be eligible for target semester
  - Group members must be eligible
  - Project type must be valid for target semester

---

### 2. Group Management

#### 2.1 View Group Details
- **Endpoint**: `GET /admin/groups/:groupId`
- **Features**:
  - Complete group information
  - All members with roles
  - Leader information
  - Project association
  - Faculty allocation
  - Invitation history
  - Group status and timeline

#### 2.2 Add Member to Group
- **Endpoint**: `POST /admin/groups/:groupId/members`
- **Request Body**:
  ```json
  {
    "studentId": "student_id",
    "role": "member" | "leader",
    "force": false
  }
  ```
- **Features**:
  - Add student to group
  - Validate group capacity (min/max members)
  - Check student eligibility (semester, existing projects)
  - Handle role assignment
  - Update group status if needed
  - Create/update project for new member if group has project
- **Validations**:
  - Group must not be finalized/locked
  - Student must be in same semester
  - Student must not be in another group for same semester
  - Group must have available slots
  - If making leader, handle existing leader

#### 2.3 Remove Member from Group
- **Endpoint**: `DELETE /admin/groups/:groupId/members/:studentId`
- **Request Body**:
  ```json
  {
    "reason": "optional reason",
    "handleProject": true
  }
  ```
- **Features**:
  - Remove student from group
  - Handle leader removal (assign new leader or disband)
  - Update group status
  - Handle project association:
    - If `handleProject: true`: Remove from project, update project status
    - If `handleProject: false`: Keep in project but mark inactive
  - Update student's groupMemberships
  - Clean up invitations
- **Validations**:
  - Cannot remove if group is finalized (unless force)
  - Must maintain minimum members (or disband)
  - Handle project deliverables if member has submissions

#### 2.4 Change Group Leader
- **Endpoint**: `PUT /admin/groups/:groupId/leader`
- **Request Body**:
  ```json
  {
    "newLeaderId": "student_id"
  }
  ```
- **Features**:
  - Change group leader
  - Update member roles
  - Validate new leader is active member
- **Validations**:
  - New leader must be active member
  - Group must not be disbanded

#### 2.5 Update Group Information
- **Endpoint**: `PUT /admin/groups/:groupId`
- **Editable Fields**:
  - Name
  - Description
  - Min/Max Members (with validation)
  - Status
  - Semester
  - Academic Year
- **Validations**:
  - Member count must be within new min/max
  - Status transitions must be valid
  - Semester changes must update all members

#### 2.6 Disband Group
- **Endpoint**: `DELETE /admin/groups/:groupId`
- **Request Body**:
  ```json
  {
    "reason": "optional reason",
    "handleProjects": true,
    "handleMembers": "remove" | "keep"
  }
  ```
- **Features**:
  - Mark group as disbanded
  - Handle associated project:
    - Cancel project
    - Or transfer to solo projects
  - Handle members:
    - Remove from group
    - Update student records
  - Clean up invitations
- **Validations**:
  - Cannot disband if group has active deliverables
  - Must handle project properly

---

### 3. Faculty Allocation Management

#### 3.1 Allocate Faculty to Project
- **Endpoint**: `POST /admin/projects/:projectId/allocate-faculty`
- **Request Body**:
  ```json
  {
    "facultyId": "faculty_id",
    "force": false,
    "reason": "optional reason"
  }
  ```
- **Features**:
  - Allocate faculty to solo project
  - Update project status to 'faculty_allocated'
  - Record allocation history
  - Update student's currentProjects status
  - Handle faculty preferences (mark as allocated)
- **Validations**:
  - Faculty must exist and be active
  - Project must be in valid state
  - For Sem 5+ projects, validate faculty allocation workflow

#### 3.2 Allocate Faculty to Group
- **Endpoint**: `POST /admin/groups/:groupId/allocate-faculty`
- **Request Body**:
  ```json
  {
    "facultyId": "faculty_id",
    "force": false,
    "reason": "optional reason"
  }
  ```
- **Features**:
  - Allocate faculty to group
  - Update group's allocatedFaculty
  - If group has project, allocate to project too
  - Update all group members' currentProjects
  - Record allocation history
- **Validations**:
  - Faculty must exist and be active
  - Group must be complete/finalized
  - Group must have project (or create one)

#### 3.3 Deallocate Faculty
- **Endpoint**: `DELETE /admin/projects/:projectId/faculty`
- **Endpoint**: `DELETE /admin/groups/:groupId/faculty`
- **Request Body**:
  ```json
  {
    "reason": "optional reason",
    "resetStatus": true
  }
  ```
- **Features**:
  - Remove faculty allocation
  - Reset project/group status if needed
  - Update allocation history
  - Update student records
- **Validations**:
  - Cannot deallocate if project has active deliverables
  - Must handle status transitions properly

#### 3.4 Update Faculty Preferences
- **Endpoint**: `PUT /admin/projects/:projectId/faculty-preferences`
- **Request Body**:
  ```json
  {
    "preferences": [
      { "facultyId": "id1", "priority": 1 },
      { "facultyId": "id2", "priority": 2 }
    ]
  }
  ```
- **Features**:
  - Update faculty preferences for project
  - Reset allocation workflow if needed
  - Validate preferences (unique priorities, valid faculty)
- **Validations**:
  - Max 10 preferences
  - Priorities must be unique
  - Faculty must exist

---

### 4. Student-Project Association Management

#### 4.1 Add Student to Project
- **Endpoint**: `POST /admin/projects/:projectId/students`
- **Request Body**:
  ```json
  {
    "studentId": "student_id",
    "role": "solo" | "leader" | "member"
  }
  ```
- **Features**:
  - Add student to solo project (convert to group if needed)
  - Add student to group project
  - Create project if doesn't exist
  - Update student's currentProjects
  - Handle group membership if group project
- **Validations**:
  - Student must be eligible for project semester
  - Student must not have conflicting project
  - Project type must support multiple students (or convert)

#### 4.2 Remove Student from Project
- **Endpoint**: `DELETE /admin/projects/:projectId/students/:studentId`
- **Request Body**:
  ```json
  {
    "reason": "optional reason",
    "handleGroup": true,
    "handleDeliverables": "keep" | "remove"
  }
  ```
- **Features**:
  - Remove student from project
  - If solo project: Cancel or transfer project
  - If group project: Remove from group
  - Handle deliverables
  - Update student records
- **Validations**:
  - Cannot remove if student has submitted deliverables (unless force)
  - Must handle group properly

#### 4.3 Change Project Owner (Solo Projects)
- **Endpoint**: `PUT /admin/projects/:projectId/owner`
- **Request Body**:
  ```json
  {
    "newStudentId": "student_id"
  }
  ```
- **Features**:
  - Transfer solo project to different student
  - Update both students' records
  - Handle deliverables transfer
- **Validations**:
  - New student must be eligible
  - Project must be solo

---

### 5. Project Continuation Management

#### 5.1 Link Projects (Create Continuation)
- **Endpoint**: `POST /admin/projects/:projectId/continue`
- **Request Body**:
  ```json
  {
    "previousProjectId": "project_id",
    "preserveFaculty": true,
    "preserveGroup": true
  }
  ```
- **Features**:
  - Link project as continuation of another
  - Set isContinuation flag
  - Preserve faculty if requested
  - Preserve group if requested
  - Update continuation chain
- **Validations**:
  - Previous project must be completed
  - Semesters must be sequential
  - Project types must be compatible

#### 5.2 Unlink Continuation
- **Endpoint**: `DELETE /admin/projects/:projectId/continuation`
- **Features**:
  - Remove continuation link
  - Update isContinuation flag
  - Preserve other project data
- **Validations**:
  - Must handle dependent projects

---

### 6. Project Status Management

#### 6.1 Update Project Status
- **Endpoint**: `PUT /admin/projects/:projectId/status`
- **Request Body**:
  ```json
  {
    "status": "registered" | "faculty_allocated" | "active" | "completed" | "cancelled",
    "reason": "optional reason",
    "force": false
  }
  ```
- **Features**:
  - Change project status
  - Validate status transitions
  - Update related entities (students, groups)
  - Set completion dates if needed
- **Validations**:
  - Status transitions must be logical
  - Cannot complete without deliverables (unless force)
  - Must update all related records

#### 6.2 Bulk Status Update
- **Endpoint**: `PUT /admin/projects/bulk-status`
- **Request Body**:
  ```json
  {
    "projectIds": ["id1", "id2"],
    "status": "completed",
    "reason": "optional"
  }
  ```
- **Features**:
  - Update multiple projects at once
  - Validate all projects
  - Batch update related records
- **Validations**:
  - All projects must be valid
  - All status transitions must be valid

---

### 7. Deliverables Management

#### 7.1 View Project Deliverables
- **Endpoint**: `GET /admin/projects/:projectId/deliverables`
- **Features**:
  - List all deliverables
  - Show submission status
  - Show file information
  - Show version history

#### 7.2 Add Deliverable
- **Endpoint**: `POST /admin/projects/:projectId/deliverables`
- **Request Body**:
  ```json
  {
    "name": "Deliverable Name",
    "description": "Description",
    "deadline": "2024-12-31",
    "isRequired": true
  }
  ```
- **Features**:
  - Add new deliverable to project
  - Set deadline and requirements

#### 7.3 Update Deliverable
- **Endpoint**: `PUT /admin/projects/:projectId/deliverables/:deliverableId`
- **Features**:
  - Update deliverable information
  - Change deadline
  - Mark as submitted/unsubmitted
  - Update file information

#### 7.4 Remove Deliverable
- **Endpoint**: `DELETE /admin/projects/:projectId/deliverables/:deliverableId`
- **Features**:
  - Remove deliverable
  - Handle file deletion if needed
- **Validations**:
  - Cannot remove if submitted (unless force)

---

### 8. Advanced Operations

#### 8.1 Merge Groups
- **Endpoint**: `POST /admin/groups/merge`
- **Request Body**:
  ```json
  {
    "sourceGroupId": "group1_id",
    "targetGroupId": "group2_id",
    "preserveProjects": true
  }
  ```
- **Features**:
  - Merge two groups
  - Combine members
  - Handle projects (merge or keep separate)
  - Update all references
- **Validations**:
  - Groups must be in same semester
  - Combined members must not exceed max
  - Must handle projects properly

#### 8.2 Split Group
- **Endpoint**: `POST /admin/groups/:groupId/split`
- **Request Body**:
  ```json
  {
    "newGroupMembers": ["student1_id", "student2_id"],
    "newGroupName": "New Group Name",
    "handleProject": "split" | "keep" | "create_new"
  }
  ```
- **Features**:
  - Split group into two groups
  - Distribute members
  - Handle project (split, keep with one, or create new)
  - Create new group with proper structure
- **Validations**:
  - Both groups must meet min member requirement
  - Must handle project properly

#### 8.3 Convert Solo to Group Project
- **Endpoint**: `POST /admin/projects/:projectId/convert-to-group`
- **Request Body**:
  ```json
  {
    "groupName": "Group Name",
    "members": ["student1_id", "student2_id"],
    "leaderId": "student1_id"
  }
  ```
- **Features**:
  - Convert solo project to group project
  - Create new group
  - Add members
  - Update project association
  - Handle faculty allocation
- **Validations**:
  - Project type must support groups
  - Members must be eligible
  - Must meet group size requirements

#### 8.4 Convert Group to Solo Project
- **Endpoint**: `POST /admin/projects/:projectId/convert-to-solo`
- **Request Body**:
  ```json
  {
    "selectedStudentId": "student_id",
    "handleOtherMembers": "remove" | "create_projects"
  }
  ```
- **Features**:
  - Convert group project to solo
  - Select student to keep project
  - Handle other members (remove or create new projects)
  - Disband or update group
- **Validations**:
  - Project type must support solo
  - Must handle all members properly

---

### 9. Search and Filtering

#### 9.1 Advanced Project Search
- **Endpoint**: `GET /admin/projects/search`
- **Query Parameters**:
  - `semester`, `projectType`, `status`, `faculty`, `student`, `academicYear`
  - `hasGroup`, `isContinuation`, `isInternship`
  - `dateRange`, `deadlineRange`
  - `search` (text search in title/description)
- **Features**:
  - Comprehensive filtering
  - Text search
  - Date range filtering
  - Pagination
  - Sorting

#### 9.2 Advanced Group Search
- **Endpoint**: `GET /admin/groups/search`
- **Query Parameters**:
  - `semester`, `status`, `faculty`, `academicYear`
  - `minMembers`, `maxMembers`, `hasProject`
  - `search` (text search in name/description)
- **Features**:
  - Comprehensive filtering
  - Member count filtering
  - Pagination
  - Sorting

---

### 10. Audit and History

#### 10.1 View Project History
- **Endpoint**: `GET /admin/projects/:projectId/history`
- **Features**:
  - Show all changes made to project
  - Who made changes (admin)
  - When changes were made
  - What changed (before/after)
  - Reason for changes

#### 10.2 View Group History
- **Endpoint**: `GET /admin/groups/:groupId/history`
- **Features**:
  - Show all changes made to group
  - Member additions/removals
  - Leader changes
  - Status changes
  - Faculty allocation changes

#### 10.3 Admin Activity Log
- **Endpoint**: `GET /admin/activity-log`
- **Query Parameters**:
  - `adminId`, `action`, `entityType`, `dateRange`
- **Features**:
  - Track all admin actions
  - Filter by admin, action type, entity
  - Date range filtering
  - Export capability

---

## Implementation Details

### Database Schema Changes

#### 1. AdminActivityLog Model
```javascript
{
  admin: ObjectId (ref: Admin),
  action: String, // 'project_updated', 'member_added', etc.
  entityType: String, // 'project', 'group', 'student'
  entityId: ObjectId,
  changes: {
    field: String,
    oldValue: Mixed,
    newValue: Mixed
  }[],
  reason: String,
  metadata: Object,
  timestamp: Date
}
```

#### 2. Project History Tracking
- Add `changeHistory` array to Project model
- Track all modifications with timestamps

#### 3. Group History Tracking
- Add `changeHistory` array to Group model
- Track member changes, status changes, etc.

### Backend Implementation

#### Controller Structure
```
backend/controllers/
  adminProjectManagementController.js
    - Project Management
    - Group Management
    - Faculty Allocation
    - Student Association
    - Continuation Management
    - Status Management
    - Deliverables Management
    - Advanced Operations
```

#### Service Layer
```
backend/services/
  projectManagementService.js
    - Validation logic
    - Business rules
    - Transaction management
    - Data integrity checks
```

#### Validation Layer
```
backend/validators/
  projectManagementValidator.js
    - Semester-specific validations
    - Project type validations
    - Group size validations
    - Faculty allocation validations
```

### Frontend Implementation

#### Page Structure
```
frontend/src/pages/admin/
  ProjectManagement/
    ProjectList.jsx          # List all projects with filters
    ProjectDetail.jsx        # Detailed project view/edit
    ProjectEdit.jsx          # Edit project form
    GroupManagement.jsx       # Group management interface
    FacultyAllocation.jsx    # Faculty allocation interface
    BulkOperations.jsx       # Bulk operations interface
    HistoryViewer.jsx         # View change history
```

#### Components
```
frontend/src/components/admin/
  projectManagement/
    ProjectCard.jsx
    ProjectForm.jsx
    GroupMemberList.jsx
    FacultySelector.jsx
    StatusBadge.jsx
    DeliverableManager.jsx
    HistoryTimeline.jsx
```

### API Routes

```javascript
// Project Management
GET    /admin/projects/:projectId
PUT    /admin/projects/:projectId
PUT    /admin/projects/:projectId/type
PUT    /admin/projects/:projectId/semester
POST   /admin/projects/:projectId/students
DELETE /admin/projects/:projectId/students/:studentId
PUT    /admin/projects/:projectId/owner
PUT    /admin/projects/:projectId/status
PUT    /admin/projects/bulk-status

// Group Management
GET    /admin/groups/:groupId
PUT    /admin/groups/:groupId
POST   /admin/groups/:groupId/members
DELETE /admin/groups/:groupId/members/:studentId
PUT    /admin/groups/:groupId/leader
DELETE /admin/groups/:groupId
POST   /admin/groups/merge
POST   /admin/groups/:groupId/split

// Faculty Allocation
POST   /admin/projects/:projectId/allocate-faculty
DELETE /admin/projects/:projectId/faculty
POST   /admin/groups/:groupId/allocate-faculty
DELETE /admin/groups/:groupId/faculty
PUT    /admin/projects/:projectId/faculty-preferences

// Continuation Management
POST   /admin/projects/:projectId/continue
DELETE /admin/projects/:projectId/continuation

// Deliverables
GET    /admin/projects/:projectId/deliverables
POST   /admin/projects/:projectId/deliverables
PUT    /admin/projects/:projectId/deliverables/:deliverableId
DELETE /admin/projects/:projectId/deliverables/:deliverableId

// Conversions
POST   /admin/projects/:projectId/convert-to-group
POST   /admin/projects/:projectId/convert-to-solo

// Search
GET    /admin/projects/search
GET    /admin/groups/search

// History
GET    /admin/projects/:projectId/history
GET    /admin/groups/:groupId/history
GET    /admin/activity-log
```

---

## Semester-Specific Rules

### Sem 4 (Minor Project 1)
- **Solo projects only**
- No groups allowed
- No faculty allocation
- Can update: title, description, status, deliverables
- Cannot: add members, allocate faculty, convert to group

### Sem 5 (Minor Project 2)
- **Group projects only**
- Requires 4-5 members
- Faculty allocation required
- Can: add/remove members, allocate faculty, change leader
- Cannot: convert to solo (unless special case)

### Sem 6 (Minor Project 3)
- **Group projects**
- Can continue from Sem 5
- Same group structure
- Same faculty (usually)
- Can: modify group, change continuation link

### Sem 7 (Major Project 1 / Internship)
- **Group or Solo**
- Group projects: 4-5 members
- Solo projects: internship1
- Faculty allocation required
- Can: convert between solo/group (with validations)

### Sem 8 (Major Project 2)
- **Group or Solo**
- Can continue from Sem 7
- Type 1 students: Solo coursework
- Type 2 students: Group major2
- Complex continuation rules

### M.Tech Specific Rules
- Sem 1: Solo minor1 with faculty preferences
- Sem 2: Solo minor2, can continue from Sem 1
- Sem 3-4: Internship or coursework choice

---

## Validation Rules

### General Validations
1. **Student Eligibility**
   - Student must be in correct semester
   - Student must not have conflicting project
   - Student must meet prerequisites

2. **Group Validations**
   - Min/max member constraints
   - Leader must be active member
   - All members must be in same semester
   - Members cannot be in multiple groups for same semester

3. **Faculty Validations**
   - Faculty must be active
   - Faculty allocation must follow workflow (Sem 5+)
   - Cannot deallocate if project is active

4. **Project Type Validations**
   - Project type must be valid for semester
   - Solo vs group constraints
   - Continuation compatibility

5. **Status Transitions**
   - Logical status progression
   - Cannot skip required states
   - Completion requires deliverables (unless force)

---

## Error Handling

### Common Error Scenarios
1. **Validation Errors**: Return 400 with detailed error messages
2. **Not Found**: Return 404 with entity information
3. **Conflict**: Return 409 with conflict details
4. **Permission**: Return 403 if operation not allowed
5. **Server Error**: Return 500 with error details (logged)

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {
      "field": "specific field error",
      "constraints": ["constraint1", "constraint2"]
    }
  }
}
```

---

## Security Considerations

1. **Authentication**: All endpoints require admin authentication
2. **Authorization**: Verify admin has permission for operation
3. **Input Validation**: Sanitize all inputs
4. **Transaction Safety**: Use database transactions for multi-step operations
5. **Audit Logging**: Log all changes for accountability
6. **Rate Limiting**: Prevent abuse of bulk operations

---

## Testing Strategy

### Unit Tests
- Validation functions
- Business logic functions
- Model methods

### Integration Tests
- API endpoints
- Database operations
- Transaction handling

### E2E Tests
- Complete workflows
- Semester-specific scenarios
- Error handling

### Test Scenarios
1. Add member to group (success and failure cases)
2. Remove member from group
3. Allocate faculty to project
4. Convert solo to group
5. Change project semester
6. Update project status
7. Handle continuation projects
8. Bulk operations

---

## Performance Considerations

1. **Database Indexing**: Index all frequently queried fields
2. **Pagination**: Implement pagination for list endpoints
3. **Caching**: Cache frequently accessed data
4. **Batch Operations**: Optimize bulk operations
5. **Lazy Loading**: Load related data only when needed

---

## UI/UX Considerations

1. **Confirmation Dialogs**: For destructive operations
2. **Undo Capability**: Where possible, allow undo
3. **Real-time Updates**: Show changes immediately
4. **Bulk Selection**: Allow selecting multiple items
5. **Filters**: Comprehensive filtering options
6. **Search**: Fast search across all fields
7. **History View**: Easy access to change history
8. **Validation Feedback**: Clear error messages
9. **Loading States**: Show progress for long operations
10. **Success Notifications**: Confirm successful operations

---

## Implementation Phases

### Phase 1: Core Project Management (Week 1-2)
- View and update project information
- Update project status
- Basic student association

### Phase 2: Group Management (Week 2-3)
- Add/remove members
- Change leader
- Update group information

### Phase 3: Faculty Allocation (Week 3-4)
- Allocate/deallocate faculty
- Update preferences
- Handle allocation workflow

### Phase 4: Advanced Operations (Week 4-5)
- Convert solo/group
- Merge/split groups
- Continuation management

### Phase 5: Deliverables & History (Week 5-6)
- Deliverables management
- History tracking
- Audit logging

### Phase 6: UI/UX Polish (Week 6-7)
- Frontend implementation
- User experience improvements
- Testing and bug fixes

---

## Future Enhancements

1. **Bulk Import/Export**: CSV import/export for projects
2. **Templates**: Project templates for quick creation
3. **Notifications**: Notify students/faculty of changes
4. **Reports**: Generate reports on project changes
5. **Workflow Automation**: Automated status transitions
6. **Conflict Resolution**: UI for resolving conflicts
7. **Version Control**: Track project versions
8. **Backup/Restore**: Backup and restore project states

---

## Conclusion

This comprehensive project management feature will give admins complete control over projects while maintaining data integrity and respecting semester-specific rules. The phased implementation approach ensures steady progress with testing at each stage.

