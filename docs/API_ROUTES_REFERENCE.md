# API Routes Reference

## 📋 Base URL

```
Development: http://localhost:3000
Production: [Your production URL]
```

---

## 🔐 Authentication

All protected routes require JWT token in header:
```
Authorization: Bearer <token>
```

---

## 🔑 Authentication Routes

**Base:** `/auth`

### POST /auth/login
Login user and get JWT token.

**Request:**
```json
{
  "email": "student@iiit.ac.in",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "student@iiit.ac.in",
    "role": "student"
  }
}
```

---

### POST /auth/signup/student
Register new student.

**Request:**
```json
{
  "email": "student@iiit.ac.in",
  "password": "password123",
  "fullName": "John Doe",
  "misNumber": "123456789",
  "collegeEmail": "john.doe@iiit.ac.in",
  "contactNumber": "9876543210",
  "branch": "CSE",
  "semester": 4,
  "degree": "B.Tech",
  "academicYear": "2024-25"
}
```

---

### POST /auth/signup/faculty
Register new faculty.

**Request:**
```json
{
  "email": "faculty@iiit.ac.in",
  "password": "password123",
  "fullName": "Dr. Jane Smith",
  "phone": "9876543210",
  "department": "CSE",
  "designation": "Assistant Professor",
  "mode": "Regular"
}
```

---

### GET /auth/profile
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "student@iiit.ac.in",
    "role": "student",
    "profile": {
      "fullName": "John Doe",
      "semester": 4,
      "branch": "CSE"
    }
  }
}
```

---

### PUT /auth/profile
Update user profile.

**Request:**
```json
{
  "fullName": "John Updated Doe",
  "contactNumber": "9876543211"
}
```

---

### PUT /auth/change-password
Change password.

**Request:**
```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass123"
}
```

---

## 👨‍🎓 Student Routes

**Base:** `/student`  
**Auth:** Required (Student role)

### Dashboard & Profile

#### GET /student/dashboard
Get student dashboard data.

**Response:**
```json
{
  "success": true,
  "data": {
    "student": { /* student info */ },
    "currentProjects": [ /* projects */ ],
    "groups": [ /* groups */ ],
    "semesterStatus": { /* status */ }
  }
}
```

---

#### GET /student/profile
Get student profile.

---

#### PUT /student/profile
Update student profile.

---

### Sem 4 - Project Management

#### POST /student/projects
Register new project (Sem 4).

**Request:**
```json
{
  "title": "My Project",
  "description": "Project description",
  "projectType": "minor1",
  "semester": 4
}
```

---

#### GET /student/projects/:projectId
Get project details.

---

#### PUT /student/projects/:projectId
Update project details.

---

#### POST /student/projects/:projectId/submit-ppt
Upload PPT (multipart/form-data).

**Request:**
```
Content-Type: multipart/form-data

file: [PPT file]
submissionNotes: "Final version"
```

---

#### DELETE /student/projects/:projectId/remove-ppt
Remove uploaded PPT.

---

#### GET /student/projects/:projectId/sem4-status
Get Sem 4 project status.

**Response:**
```json
{
  "success": true,
  "status": {
    "pptSubmitted": true,
    "pptFileName": "project.pptx",
    "presentationScheduled": false,
    "isReadyForPresentation": false
  }
}
```

---

### Sem 5 - Group Management

#### POST /student/groups
Create new group.

**Request:**
```json
{
  "name": "Team Alpha",
  "description": "Our awesome team",
  "semester": 5
}
```

---

#### GET /student/groups
Get my groups.

---

#### GET /student/groups/:groupId
Get group details.

---

#### POST /student/groups/:groupId/invite
Send invitations to students.

**Request:**
```json
{
  "studentIds": ["507f...", "507f..."],
  "roles": ["member", "member"]
}
```

---

#### GET /student/groups/invitations
Get my invitations.

**Response:**
```json
{
  "success": true,
  "invitations": [
    {
      "group": { /* group info */ },
      "role": "member",
      "invitedBy": { /* student info */ },
      "status": "pending"
    }
  ]
}
```

---

#### POST /student/groups/:groupId/invite/:inviteId/accept
Accept group invitation.

---

#### POST /student/groups/:groupId/invite/:inviteId/reject
Reject group invitation.

---

#### POST /student/groups/:groupId/leave
Leave group.

---

#### POST /student/groups/:groupId/transfer-leadership
Transfer leadership to another member.

**Request:**
```json
{
  "newLeaderId": "507f1f77bcf86cd799439012"
}
```

---

#### POST /student/groups/:groupId/finalize
Finalize group (lock composition).

---

#### GET /student/groups/available-students
Get students available to join groups.

**Query Params:**
- `semester` - Filter by semester
- `branch` - Filter by branch

---

### Sem 5 - Faculty Preferences

#### POST /student/projects/:projectId/faculty-preferences
Submit faculty preferences.

**Request:**
```json
{
  "preferences": [
    { "faculty": "507f...", "priority": 1 },
    { "faculty": "507f...", "priority": 2 },
    { "faculty": "507f...", "priority": 3 }
  ]
}
```

---

#### GET /student/projects/:projectId/faculty-preferences
Get submitted preferences.

---

#### GET /student/faculty
Get list of available faculty.

---

### Sem 5 - Status Tracking

#### GET /student/projects/:projectId/sem5-status
Get Sem 5 project status.

---

#### GET /student/dashboard/sem5
Get Sem 5 specific dashboard.

---

### File Uploads

#### GET /student/uploads
Get all my uploads.

---

#### GET /student/projects/:projectId/uploads
Get uploads for specific project.

---

#### GET /student/projects/:projectId/uploads/type
Get uploads by type.

**Query Params:**
- `type` - File type (ppt, pdf, doc)

---

## 👨‍🏫 Faculty Routes

**Base:** `/faculty`  
**Auth:** Required (Faculty role)

### Dashboard & Profile

#### GET /faculty/dashboard
Get faculty dashboard.

---

#### GET /faculty/profile
Get faculty profile.

---

#### PUT /faculty/profile
Update faculty profile.

---

### Sem 4 - Evaluation

#### GET /faculty/evaluations/assignments
Get evaluation assignments.

---

#### GET /faculty/students
Get students list.

**Query Params:**
- `semester` - Filter by semester

---

#### GET /faculty/projects
Get projects list.

**Query Params:**
- `semester` - Filter by semester
- `type` - Project type

---

#### POST /faculty/projects/:projectId/evaluate
Evaluate project.

**Request:**
```json
{
  "grade": "A",
  "feedback": "Excellent work!",
  "evaluationDate": "2025-10-10"
}
```

---

### Sem 5 - Group Allocation

#### GET /faculty/groups/unallocated
Get groups awaiting allocation.

**Response:**
```json
{
  "success": true,
  "groups": [
    {
      "id": "507f...",
      "name": "Team Alpha",
      "members": [ /* members */ ],
      "priority": 1,
      "isCurrentTurn": true
    }
  ]
}
```

---

#### GET /faculty/groups/allocated
Get my allocated groups.

---

#### POST /faculty/groups/:groupId/choose
Choose a group (allocate to self).

**Request:**
```json
{
  "comments": "Interesting project topic"
}
```

---

#### POST /faculty/groups/:groupId/pass
Pass on a group (move to next faculty).

**Request:**
```json
{
  "comments": "Not in my area of expertise"
}
```

---

#### GET /faculty/groups/:groupId
Get group details.

---

#### GET /faculty/statistics/sem5
Get Sem 5 statistics.

---

## 👨‍💼 Admin Routes

**Base:** `/admin`  
**Auth:** Required (Admin role)

### Dashboard & Overview

#### GET /admin/dashboard
Get admin dashboard.

---

#### GET /admin/stats
Get system statistics.

---

### User Management

#### GET /admin/users
Get all users.

---

#### GET /admin/students
Get all students.

---

#### GET /admin/faculty
Get all faculty.

---

### Sem 4 Management

#### GET /admin/sem4/registrations
Get Sem 4 registrations.

**Query Params:**
- `page` - Page number
- `limit` - Items per page
- `branch` - Filter by branch

---

#### GET /admin/projects
Get all projects.

**Query Params:**
- `semester` - Filter by semester
- `type` - Project type
- `status` - Project status

---

#### PUT /admin/projects/:projectId/status
Update project status.

**Request:**
```json
{
  "status": "active"
}
```

---

### Sem 5 Management

#### GET /admin/sem5/registrations
Get Sem 5 registrations.

---

#### GET /admin/sem5/allocated-faculty
Get faculty allocation status.

---

#### GET /admin/sem5/non-registered-students
Get students who haven't registered.

---

#### GET /admin/groups
Get all groups.

---

#### GET /admin/groups/sem5
Get Sem 5 groups.

---

#### GET /admin/groups/unallocated
Get unallocated groups.

---

#### POST /admin/groups/:groupId/allocate
Force allocate faculty to group.

**Request:**
```json
{
  "facultyId": "507f1f77bcf86cd799439013"
}
```

---

### System Configuration

#### GET /admin/system-config
Get all system configurations.

**Query Params:**
- `category` - Filter by category (sem4, sem5, general)

---

#### GET /admin/system-config/:key
Get specific configuration.

---

#### PUT /admin/system-config/:key
Update configuration.

**Request:**
```json
{
  "value": 5,
  "description": "Updated value",
  "force": false
}
```

---

#### POST /admin/system-config/initialize
Initialize default configurations.

---

#### GET /admin/statistics/sem5
Get Sem 5 statistics.

---

## 📁 Project Routes (Shared)

**Base:** `/projects`  
**Auth:** Required

### GET /projects/:projectId
Get project details.

**Response:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "507f...",
      "title": "My Project",
      "status": "faculty_allocated",
      "faculty": { /* faculty info */ },
      "group": { /* group info */ }
    },
    "userType": "student"
  }
}
```

---

### GET /projects/:projectId/messages
Get chat messages for project.

**Query Params:**
- `page` - Page number (default: 1)
- `limit` - Messages per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f...",
      "sender": { /* user info */ },
      "senderName": "John Doe",
      "senderModel": "Student",
      "message": "Hello!",
      "createdAt": "2025-10-10T14:30:00.000Z"
    }
  ]
}
```

---

### POST /projects/:projectId/messages
Send message in project chat.

**Request:**
```json
{
  "message": "Hello, team!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f...",
    "message": "Hello, team!",
    "senderName": "John Doe",
    "createdAt": "2025-10-10T14:30:00.000Z"
  }
}
```

---

### PUT /projects/:projectId/messages/:messageId
Edit message (Future).

---

### DELETE /projects/:projectId/messages/:messageId
Delete message (Future).

---

### POST /projects/:projectId/messages/read
Mark messages as read (Future).

---

### GET /projects/:projectId/messages/unread
Get unread message count (Future).

---

## 🔌 Socket.IO Events

**Connection URL:** Same as API base URL  
**Auth:** JWT token in `auth.token` or `query.token`

### Connection Events

```javascript
// Client → Server
socket.emit('join_project_room', projectId)
socket.emit('leave_project_room', projectId)

// Server → Client
socket.on('connected', (data) => { /* connection confirmed */ })
socket.on('joined_project_room', (data) => { /* room joined */ })
```

---

### Chat Events

```javascript
// Client → Server
socket.emit('typing', {
  projectId: "507f...",
  isTyping: true
})

// Server → Client
socket.on('new_message', (data) => {
  // data.message = { sender, message, createdAt, ... }
})

socket.on('user_typing', (data) => {
  // data = { userId, userName, isTyping }
})
```

---

### Group Events

```javascript
// Server → Client
socket.on('group_invitation', (data) => { /* new invitation */ })
socket.on('invitation_accepted', (data) => { /* member joined */ })
socket.on('membership_change', (data) => { /* member left/joined */ })
socket.on('leadership_transfer', (data) => { /* leader changed */ })
socket.on('group_finalized', (data) => { /* group locked */ })
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": { /* additional error info */ }
}
```

---

## 🔒 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized (no token) |
| 403 | Forbidden (wrong role/permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate data) |
| 500 | Internal Server Error |

---

## 🧪 Testing with cURL

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@iiit.ac.in","password":"password123"}'
```

### Get Dashboard (with token)
```bash
curl -X GET http://localhost:3000/student/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Group
```bash
curl -X POST http://localhost:3000/student/groups \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"name":"Team Alpha","description":"Our team","semester":5}'
```

---

## 📝 Notes

1. **Authentication:** All routes except `/auth/login` and `/auth/signup/*` require JWT token
2. **Role-based Access:** Routes are protected by role (student/faculty/admin)
3. **File Uploads:** Use `multipart/form-data` for file uploads
4. **Pagination:** Most list endpoints support `page` and `limit` query params
5. **Socket.IO:** Real-time features require Socket.IO connection with JWT auth

---

**Last Updated:** 2025-10-10  
**Version:** 1.0  
**Commit:** 2e14110
