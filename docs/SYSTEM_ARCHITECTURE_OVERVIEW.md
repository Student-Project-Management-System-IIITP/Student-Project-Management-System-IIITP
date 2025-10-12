# Student Project Management System - Architecture Overview

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Database Architecture](#database-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Real-time Chat System](#real-time-chat-system)
6. [API Endpoints](#api-endpoints)
7. [Authentication & Authorization](#authentication--authorization)
8. [Key Features by Semester](#key-features-by-semester)

---

## 🎯 System Overview

**Technology Stack:**
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose ODM
- **Frontend:** React.js with Vite
- **Real-time:** Socket.IO
- **Authentication:** JWT (JSON Web Tokens)
- **Styling:** TailwindCSS

**Project Structure:**
```
Student-Project-Management-System-IIITP/
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # Business logic
│   ├── middleware/      # Auth, error handling
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── services/        # Socket.IO service
│   ├── utils/           # Helper functions
│   └── server.js        # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # React context (Auth)
│   │   ├── pages/       # Page components
│   │   ├── utils/       # API utilities
│   │   └── App.jsx      # Main app component
│   └── public/
└── docs/                # Documentation
```

---

## 🗄️ Database Architecture

### Core Models

#### 1. **User Model** (`User.js`)
Base authentication model for all users.

**Schema:**
```javascript
{
  email: String (unique, required),
  password: String (hashed, required),
  role: String (enum: ['student', 'faculty', 'admin']),
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Key Methods:**
- `comparePassword()` - Password verification
- `toSafeObject()` - Returns user without password
- `getRoleData()` - Fetches role-specific data

---

#### 2. **Student Model** (`Student.js`)
Extended profile for students with comprehensive tracking.

**Schema:**
```javascript
{
  user: ObjectId (ref: 'User'),
  fullName: String,
  degree: String (enum: ['B.Tech', 'M.Tech']),
  semester: Number (1-8),
  misNumber: String (unique, 9 digits),
  collegeEmail: String (unique),
  contactNumber: String,
  branch: String (enum: ['CSE', 'ECE']),
  academicYear: String (format: YYYY-YY),
  
  // Project Management
  currentProjects: [{
    project: ObjectId (ref: 'Project'),
    role: String (enum: ['leader', 'member', 'solo']),
    semester: Number,
    status: String,
    joinedAt: Date
  }],
  
  // Group Management
  groupId: ObjectId (ref: 'Group'),
  groupMemberships: [{
    group: ObjectId (ref: 'Group'),
    role: String (enum: ['leader', 'member']),
    semester: Number,
    isActive: Boolean,
    joinedAt: Date
  }],
  
  // Invitation Tracking
  invites: [{
    group: ObjectId (ref: 'Group'),
    role: String,
    invitedBy: ObjectId (ref: 'Student'),
    invitedAt: Date,
    status: String (enum: ['pending', 'accepted', 'rejected', 'auto-rejected'])
  }],
  
  // Internship History
  internshipHistory: [{
    type: String (enum: ['summer', 'winter', '6month']),
    company: String,
    position: String,
    location: String,
    startDate: Date,
    endDate: Date,
    duration: String,
    stipend: Number,
    status: String,
    semester: Number
  }],
  
  // Semester Status
  semesterStatus: {
    canFormGroups: Boolean,
    canJoinProjects: Boolean,
    canApplyInternships: Boolean,
    hasCompletedPreviousProject: Boolean,
    isDoingInternship: Boolean,
    internshipSemester: Number
  }
}
```

**Key Methods:**
- `addCurrentProject()` - Add project to student
- `addGroupMembership()` - Join a group
- `addGroupMembershipAtomic()` - Atomic group join with session
- `cleanupInvitesAtomic()` - Auto-reject other invites
- `leaveGroupAtomic()` - Leave group with transaction
- `updateGroupRoleAtomic()` - Change role in group
- `getDashboardData()` - Get student dashboard info
- `getInternshipEligibility()` - Check internship eligibility
- `checkGraduationEligibility()` - Check graduation status
- `getFinalProjectPortfolio()` - Get complete project history

---

#### 3. **Faculty Model** (`Faculty.js`)
Faculty member profiles.

**Schema:**
```javascript
{
  user: ObjectId (ref: 'User'),
  fullName: String,
  email: String,
  phone: String,
  facultyId: String (unique, format: FAC###),
  department: String (enum: ['CSE', 'ECE', 'ASH']),
  mode: String (enum: ['Regular', 'Adjunct', 'On Lien']),
  designation: String (enum: ['HOD', 'Assistant Professor', ...]),
  isRetired: Boolean,
  retirementDate: Date
}
```

---

#### 4. **Project Model** (`Project.js`)
Comprehensive project tracking across all semesters.

**Schema:**
```javascript
{
  // Basic Info
  title: String,
  description: String,
  projectType: String (enum: ['minor1', 'minor2', 'minor3', 'major1', 'major2', 'internship1', 'internship2']),
  
  // Associations
  student: ObjectId (ref: 'Student'),
  group: ObjectId (ref: 'Group'),
  faculty: ObjectId (ref: 'Faculty'),
  
  // Faculty Preferences (Sem 5+)
  facultyPreferences: [{
    faculty: ObjectId (ref: 'Faculty'),
    priority: Number (1-10)
  }],
  
  // Academic Info
  semester: Number (1-8),
  academicYear: String,
  status: String (enum: ['registered', 'faculty_allocated', 'active', 'completed', 'cancelled']),
  
  // Project Continuation
  isContinuation: Boolean,
  previousProject: ObjectId (ref: 'Project'),
  
  // Internship Details
  isInternship: Boolean,
  companyDetails: {
    name: String,
    location: String,
    duration: String,
    stipend: Number,
    supervisor: String,
    contactEmail: String
  },
  
  // Timeline
  startDate: Date,
  endDate: Date,
  submissionDeadline: Date,
  
  // Deliverables
  deliverables: [{
    name: String,
    description: String,
    deadline: Date,
    isRequired: Boolean,
    submitted: Boolean,
    submittedAt: Date,
    filePath: String,
    fileType: String (enum: ['ppt', 'pdf', 'doc', 'video', 'other']),
    fileSize: Number,
    filename: String,
    originalName: String,
    uploadVersion: Number,
    uploadedBy: ObjectId (ref: 'User'),
    versionHistory: [{
      filename: String,
      filePath: String,
      uploadedAt: Date
    }],
    // Sem 4 specific
    presentationDate: Date,
    presentationVenue: String,
    panelMembers: [String]
  }],
  
  // Evaluation
  grade: String,
  feedback: String,
  evaluatedBy: ObjectId (ref: 'Faculty'),
  evaluatedAt: Date,
  
  // Faculty Allocation (Sem 5+)
  allocatedBy: String (enum: ['faculty_choice', 'admin_allocation']),
  currentFacultyIndex: Number (0-9),
  allocationHistory: [{
    faculty: ObjectId (ref: 'Faculty'),
    priority: Number,
    action: String (enum: ['presented', 'passed', 'chosen']),
    timestamp: Date,
    comments: String
  }]
}
```

**Key Methods:**
- **Sem 4:**
  - `submitPPT()` - Submit presentation
  - `schedulePresentation()` - Schedule presentation
  - `getSem4Status()` - Get Sem 4 status
  
- **Sem 5+ Faculty Allocation:**
  - `supportsFacultyAllocation()` - Check if supports allocation
  - `getCurrentFaculty()` - Get current faculty in queue
  - `presentToCurrentFaculty()` - Present to faculty
  - `facultyChoose()` - Faculty accepts project
  - `facultyPass()` - Faculty passes project
  - `getAllocationStatus()` - Get allocation status
  
- **Progress Tracking:**
  - `getProgress()` - Get completion percentage
  - `isOnTrack()` - Check if on schedule
  - `getProjectAnalytics()` - Comprehensive analytics
  - `calculatePerformanceScore()` - Performance metrics
  - `getRiskLevel()` - Risk assessment
  
- **File Management:**
  - `getAllUploads()` - Get all uploaded files
  - `getUploadsByType()` - Filter by file type

---

#### 5. **Group Model** (`Group.js`)
Group formation and management (Sem 5+).

**Schema:**
```javascript
{
  name: String,
  description: String,
  
  // Members
  members: [{
    student: ObjectId (ref: 'Student'),
    role: String (enum: ['leader', 'member']),
    joinedAt: Date,
    isActive: Boolean,
    inviteStatus: String (enum: ['accepted', 'pending', 'rejected', 'auto-rejected'])
  }],
  
  // Invitations
  invites: [{
    student: ObjectId (ref: 'Student'),
    role: String,
    invitedBy: ObjectId (ref: 'Student'),
    invitedAt: Date,
    status: String,
    respondedAt: Date
  }],
  
  // Project & Faculty
  project: ObjectId (ref: 'Project'),
  allocatedFaculty: ObjectId (ref: 'Faculty'),
  facultyPreferences: [{
    faculty: ObjectId (ref: 'Faculty'),
    priority: Number (1-5)
  }],
  
  // Academic Info
  semester: Number,
  academicYear: String,
  
  // Group Settings
  isActive: Boolean,
  maxMembers: Number (default: 5),
  minMembers: Number (default: 4),
  status: String (enum: ['invitations_sent', 'open', 'locked', 'finalized', 'disbanded']),
  
  // Leadership
  leader: ObjectId (ref: 'Student'),
  createdBy: ObjectId (ref: 'Student'),
  
  // Finalization
  finalizedAt: Date,
  finalizedBy: ObjectId (ref: 'Student')
}
```

**Key Methods:**
- `addMember()` - Add member to group
- `removeMember()` - Remove member
- `changeLeader()` - Transfer leadership
- `addInvite()` - Send invitation
- `acceptInviteAtomic()` - Accept with transaction
- `rejectInvite()` - Reject invitation
- `transferLeadership()` - Transfer leader role
- `finalizeGroup()` - Lock group composition
- `allowMemberLeave()` - Member leaves group
- `canStudentJoin()` - Check if student can join
- `isReadyForAllocation()` - Check if ready for faculty

---

#### 6. **Message Model** (`Message.js`)
Real-time chat messages for project communication.

**Schema:**
```javascript
{
  project: ObjectId (ref: 'Project', indexed),
  sender: ObjectId (ref: 'User'),
  senderModel: String (enum: ['Student', 'Faculty']),
  senderName: String,
  message: String (max: 2000 chars),
  
  // Read Status
  isRead: Boolean,
  readBy: [{
    user: ObjectId (ref: 'User'),
    readAt: Date
  }],
  
  // Attachments
  attachments: [{
    filename: String,
    url: String,
    fileType: String,
    uploadedAt: Date
  }],
  
  createdAt: Date (indexed)
}
```

**Indexes:**
- `{ project: 1, createdAt: -1 }` - Fast message retrieval
- `{ sender: 1, createdAt: -1 }` - Sender history

**Key Methods:**
- `markAsRead()` - Mark message as read
- `getProjectMessages()` - Get messages for project
- `getUnreadCount()` - Count unread messages

---

#### 7. **SystemConfig Model** (`SystemConfig.js`)
System-wide configuration settings.

**Schema:**
```javascript
{
  key: String (unique),
  value: Schema.Types.Mixed,
  description: String,
  category: String (enum: ['sem4', 'sem5', 'sem6', 'sem7', 'sem8', 'general']),
  isEditable: Boolean,
  lastModifiedBy: ObjectId (ref: 'User'),
  lastModifiedAt: Date
}
```

---

## 🔧 Backend Architecture

### Server Setup (`server.js`)
```javascript
// Core Components:
- Express.js server
- MongoDB connection via Mongoose
- Socket.IO for real-time communication
- CORS enabled
- JWT authentication middleware
- Error handling middleware
```

### Routes Structure

**Main Router** (`routes/index.js`):
```
/ (home)
/auth/* (authentication)
/admin/* (admin operations)
/student/* (student operations)
/faculty/* (faculty operations)
/projects/* (shared project routes)
```

### Controllers

1. **authController.js** - Authentication & user management
2. **studentController.js** - Student operations (141KB - largest)
3. **facultyController.js** - Faculty operations
4. **adminController.js** - Admin operations
5. **projectController.js** - Project management

### Services

**SocketService** (`services/socketService.js`):
- Real-time WebSocket connections
- Project chat rooms
- Group activity notifications
- Typing indicators
- Connection management

**Key Socket Events:**
```javascript
// Connection
- 'connection' - User connects
- 'disconnect' - User disconnects

// Group Events
- 'join_group_rooms' - Join group rooms
- 'group_invitation' - New invitation
- 'invitation_accepted' - Invitation accepted
- 'membership_change' - Member joins/leaves
- 'leadership_transfer' - Leader changed
- 'group_finalized' - Group locked

// Chat Events
- 'join_project_room' - Join project chat
- 'leave_project_room' - Leave chat
- 'new_message' - New message broadcast
- 'typing' - Typing indicator
- 'user_typing' - User is typing
```

---

## 🎨 Frontend Architecture

### Technology Stack
- **React 18** with Hooks
- **React Router v6** for navigation
- **Context API** for state management
- **TailwindCSS** for styling
- **Socket.IO Client** for real-time
- **React Hot Toast** for notifications

### Project Structure
```
frontend/src/
├── components/
│   ├── common/          # Shared components
│   └── ...
├── context/
│   └── AuthContext.jsx  # Authentication context
├── pages/
│   ├── auth/            # Login, Register
│   ├── student/         # Student pages
│   ├── faculty/         # Faculty pages
│   ├── admin/           # Admin pages
│   └── shared/          # Shared pages (ProjectDetails)
├── utils/
│   └── api.js           # API client
└── App.jsx              # Main app
```

### API Client (`utils/api.js`)

**Base Configuration:**
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

**API Modules:**
1. **authAPI** - Authentication
2. **studentAPI** - Student operations
3. **facultyAPI** - Faculty operations
4. **adminAPI** - Admin operations
5. **projectAPI** - Project operations (Note: Currently missing from api.js)

**Key Features:**
- JWT token management (localStorage)
- Automatic token injection
- Error handling
- Response parsing

---

## 💬 Real-time Chat System

### Architecture

**Backend (Socket.IO Server):**
```javascript
// Location: backend/services/socketService.js

Features:
- JWT authentication middleware
- Room-based messaging (project rooms)
- User connection tracking
- Typing indicators
- Message broadcasting
```

**Frontend (Socket.IO Client):**
```javascript
// Location: frontend/src/pages/shared/ProjectDetails.jsx

Features:
- Auto-connect with JWT token
- Join/leave project rooms
- Real-time message updates
- Typing indicators
- Auto-scroll to latest message
```

### Chat Flow

1. **Connection:**
   ```
   User opens ProjectDetails page
   → Socket connects with JWT token
   → Server authenticates
   → User joins project room
   ```

2. **Sending Message:**
   ```
   User types message
   → Emit 'typing' event
   → Submit message via API
   → API saves to database
   → Socket broadcasts 'new_message' to room
   → All users receive update
   ```

3. **Receiving Message:**
   ```
   Socket receives 'new_message' event
   → Verify project ID matches
   → Add to messages array
   → Auto-scroll to bottom
   ```

### Message Model Integration

**Database Storage:**
- Messages stored in MongoDB via Message model
- Indexed by project and timestamp
- Supports read receipts
- Attachment support (planned)

**Real-time Sync:**
- Socket.IO broadcasts to all room members
- Optimistic UI updates (sender sees immediately)
- Fallback to API polling if socket fails

---

## 🔐 Authentication & Authorization

### JWT Authentication Flow

1. **Login:**
   ```
   User submits credentials
   → Server validates
   → Generate JWT token
   → Return token + user data
   → Client stores in localStorage
   ```

2. **Authenticated Requests:**
   ```
   Client includes token in header:
   Authorization: Bearer <token>
   
   → Server validates token
   → Extract user ID and role
   → Attach to request
   → Process request
   ```

3. **Role-based Access:**
   ```javascript
   User roles: 'student', 'faculty', 'admin'
   
   Middleware checks:
   - Token validity
   - User role
   - Resource ownership
   - Permission level
   ```

### Protected Routes

**Frontend:**
- Private routes require authentication
- Role-based route access
- Redirect to login if unauthorized

**Backend:**
- Middleware: `auth.js`
- Role verification
- Resource ownership checks

---

## 📚 Key Features by Semester

### Semester 4 (Minor Project 1)
**Type:** Individual project
**Features:**
- Solo project registration
- PPT upload with versioning
- Presentation scheduling
- Faculty evaluation
- Status tracking

**Key APIs:**
- `POST /student/projects` - Register project
- `POST /student/projects/:id/submit-ppt` - Upload PPT
- `DELETE /student/projects/:id/remove-ppt` - Remove PPT
- `GET /student/projects/:id/sem4-status` - Get status

---

### Semester 5 (Minor Project 2)
**Type:** Group project with faculty allocation
**Features:**
- Group formation (4-5 members)
- Invitation system
- Leadership management
- Faculty preference selection (up to 10)
- Sequential faculty allocation
- Real-time group updates via Socket.IO

**Key APIs:**
- `POST /student/groups` - Create group
- `POST /student/groups/:id/invite` - Send invitations
- `POST /student/groups/:id/invite/:inviteId/accept` - Accept invite
- `POST /student/groups/:id/finalize` - Finalize group
- `POST /student/projects/:id/faculty-preferences` - Submit preferences
- `GET /faculty/groups/unallocated` - View available groups
- `POST /faculty/groups/:id/choose` - Choose group
- `POST /faculty/groups/:id/pass` - Pass group

**Faculty Allocation Algorithm:**
```
1. Group submits faculty preferences (priority 1-10)
2. System presents to faculty in order
3. Faculty can:
   - Choose (allocate to self)
   - Pass (move to next faculty)
4. If all pass → Admin manual allocation
```

---

### Semester 6 (Minor Project 3)
**Type:** Project continuation or new project
**Features:**
- Continue previous project
- Advanced milestone tracking
- Progress analytics
- Performance scoring

---

### Semester 7 (Major Project 1 / Internship)
**Type:** Choice between major project or 6-month internship
**Features:**
- Internship registration
- Company details tracking
- Major project continuation
- Eligibility checks

---

### Semester 8 (Major Project 2)
**Type:** Final year project
**Features:**
- Graduation eligibility check
- Complete portfolio view
- Achievement tracking
- Final evaluation

---

## 🔄 Real-time Features Summary

### Socket.IO Events

**Group Management:**
- `group_invitation` - New invitation received
- `invitation_accepted` - Member joined
- `invitation_rejected` - Invitation declined
- `membership_change` - Member left/joined
- `leadership_transfer` - Leader changed
- `group_finalized` - Group locked
- `capacity_update` - Member count changed

**Project Chat:**
- `join_project_room` - Join chat room
- `leave_project_room` - Leave chat room
- `new_message` - New message received
- `typing` - User typing
- `user_typing` - Typing indicator
- `message_updated` - Message edited

---

## 📊 Database Indexes

**Performance Optimizations:**

```javascript
// Student
{ branch: 1 }
{ semester: 1 }
{ semester: 1, academicYear: 1 }
{ 'groupMemberships.group': 1 }

// Project
{ student: 1, semester: 1 }
{ projectType: 1, semester: 1 }
{ status: 1, semester: 1 }
{ faculty: 1, status: 1 }

// Group
{ semester: 1, academicYear: 1 }
{ status: 1, semester: 1 }
{ 'members.student': 1 }
{ allocatedFaculty: 1, status: 1 }

// Message
{ project: 1, createdAt: -1 }
{ sender: 1, createdAt: -1 }
```

---

## 🚀 API Endpoint Summary

### Authentication
- `POST /auth/login` - User login
- `POST /auth/signup/student` - Student registration
- `POST /auth/signup/faculty` - Faculty registration
- `POST /auth/signup/admin` - Admin registration
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update profile
- `PUT /auth/change-password` - Change password

### Student Operations
- `GET /student/dashboard` - Dashboard data
- `GET /student/profile` - Student profile
- `PUT /student/profile` - Update profile
- `POST /student/projects` - Register project
- `GET /student/projects/:id` - Get project details
- `POST /student/projects/:id/submit-ppt` - Upload PPT
- `POST /student/groups` - Create group
- `GET /student/groups` - Get my groups
- `POST /student/groups/:id/invite` - Send invitations
- `POST /student/groups/:id/invite/:inviteId/accept` - Accept invite
- `POST /student/groups/:id/finalize` - Finalize group
- `POST /student/projects/:id/faculty-preferences` - Submit preferences

### Faculty Operations
- `GET /faculty/dashboard` - Dashboard data
- `GET /faculty/groups/unallocated` - View available groups
- `GET /faculty/groups/allocated` - My allocated groups
- `POST /faculty/groups/:id/choose` - Choose group
- `POST /faculty/groups/:id/pass` - Pass group
- `GET /faculty/groups/:id` - Group details

### Admin Operations
- `GET /admin/dashboard` - Dashboard data
- `GET /admin/sem4/registrations` - Sem 4 registrations
- `GET /admin/sem5/registrations` - Sem 5 registrations
- `GET /admin/groups` - All groups
- `POST /admin/groups/:id/allocate` - Force allocate faculty
- `GET /admin/system-config` - Get configurations
- `PUT /admin/system-config/:key` - Update configuration

### Project Operations (Shared)
- `GET /projects/:id` - Get project details
- `GET /projects/:id/messages` - Get chat messages
- `POST /projects/:id/messages` - Send message

---

## 🔮 Future Enhancements

### Chat System
- [ ] Message editing
- [ ] Message deletion
- [ ] File attachments
- [ ] Emoji reactions
- [ ] Read receipts
- [ ] Message search
- [ ] Chat history export

### Group Management
- [ ] Group chat (separate from project chat)
- [ ] Member activity tracking
- [ ] Group analytics
- [ ] Conflict resolution system

### Project Management
- [ ] Gantt chart visualization
- [ ] Milestone reminders
- [ ] Automated deadline notifications
- [ ] Project templates
- [ ] Peer review system

### Analytics
- [ ] Student performance dashboard
- [ ] Faculty workload analytics
- [ ] Project success metrics
- [ ] Trend analysis

---

## 📝 Notes for Future Development

### Current Commit State
- **Commit:** `2e14110` - "Added chat feature in project details page"
- **Status:** Chat feature implemented but API endpoints may need verification
- **Missing:** `chatAPI` was removed from `api.js` - needs to be re-added or integrated into `projectAPI`

### Known Issues
1. Chat API endpoints not defined in `frontend/src/utils/api.js`
2. Need to verify backend routes for chat messages
3. Socket.IO authentication needs testing
4. Message persistence verification needed

### Recommended Next Steps
1. Add chat API endpoints to `api.js`
2. Create backend routes for chat operations
3. Test real-time message delivery
4. Implement message read receipts
5. Add file attachment support
6. Create admin chat monitoring

---

## 🎓 Conclusion

This system provides a comprehensive platform for managing student projects across all semesters (4-8) with:
- ✅ Role-based access control
- ✅ Real-time communication
- ✅ Complex group formation
- ✅ Faculty allocation system
- ✅ Progress tracking
- ✅ File management
- ✅ Analytics and reporting

The architecture is scalable, maintainable, and follows modern web development best practices.

---

**Last Updated:** 2025-10-10
**Version:** 1.0
**Commit:** 2e14110
