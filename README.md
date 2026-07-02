# 🎓 SPMS - Student Project Management System

> **A comprehensive web application designed to automate and streamline the project management process at IIIT Pune**

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [Semester Workflows](#-semester-workflows)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Advanced Features](#-advanced-features)
- [User Roles & Capabilities](#-user-roles--capabilities)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Input Validation](#-input-validation)

---

## 🎯 Project Overview

SPMS (Student Project Management System) is a full-stack web application that automates the entire project lifecycle management for both **B.Tech** and **M.Tech** students at IIIT Pune. The system handles complex workflows across multiple semesters, including project registration, group formation, faculty allocation, real-time collaboration, file management, and evaluation systems.

### Key Highlights

- ✅ **Multi-Semester Support**: Complete workflows for B.Tech (Sem 4-8) and M.Tech (Sem 1-4)
- ✅ **Real-Time Collaboration**: Socket.IO powered chat system with file sharing
- ✅ **Intelligent Group Management**: Dynamic group formation with invitation system
- ✅ **Faculty Allocation System**: Priority-based preference matching with automated allocation
- ✅ **Comprehensive Evaluation**: Multi-criteria scoring system for project evaluation
- ✅ **File Management**: Secure file uploads with preview and download capabilities
- ✅ **Role-Based Access Control**: Secure authentication and authorization for Students, Faculty, and Admins

---

## ✨ Key Features

### 🔐 Authentication & Security
- JWT-based authentication system
- Role-based access control (RBAC)
- Secure password hashing with bcrypt
- Protected API routes with middleware
- CORS configuration
- Input validation and sanitization

### 💬 Real-Time Chat System
- **Socket.IO Integration**: Real-time bidirectional communication
- **Message Features**:
  - Edit messages within 5-minute window
  - Delete own messages
  - Emoji reactions (👍 ❤️ 😊 😂 🎉 🔥 👏 ✅ 💯 🚀)
  - Smart timestamp formatting (Today, Yesterday, Date)
  - Message search functionality
  - Edit history tracking
- **File Attachments**: 
  - Upload up to 3 files per message (10MB each)
  - Support for 28+ file types (PDF, images, videos, code files, archives)
  - File preview with icons
  - Secure download system

### 👥 Group Management
- **Group Formation**: Create groups with 4-5 members
- **Invitation System**: Send/accept/reject group invitations
- **Role Management**: Group leader and member roles
- **Status Tracking**: Real-time group status updates
- **Group Dashboard**: Centralized group information and project details

### 🎓 Faculty Allocation System
- **Preference Selection**: Students select 5 faculty preferences with priorities
- **Automated Allocation**: Intelligent matching algorithm
- **Choose/Pass Workflow**: Faculty can accept or pass allocation requests
- **Auto-Rejection**: Automatic handling of rejected allocations
- **Workload Management**: Track faculty assignments and capacity

### 📊 Project Management
- **Project Registration**: Semester-specific registration forms
- **Project Continuation**: Continue previous semester projects (Sem 6, Sem 8)
- **Status Tracking**: Real-time project status updates
- **Deliverable Submission**: Upload project deliverables
- **Progress Monitoring**: Track project milestones and progress

### 📁 File Management
- **PPT Upload**: Presentation slides upload (Sem 4)
- **Document Upload**: Project reports, certificates, offer letters
- **File Preview**: Visual file type indicators
- **Secure Storage**: Organized file structure by semester and type
- **Download System**: Secure file access control

### 🎯 Internship Management
- **Summer Internship**: Evidence submission and verification (Sem 7)
- **6-Month Internship**: Long-term internship tracking
- **Internship 1**: Solo project alternative for students without summer internship
- **Application Tracking**: Status-based workflow (submitted, needs_info, verified_pass/fail)
- **Document Verification**: Admin review system with remarks

### ⚙️ Admin Features
- **User Management**: Create, update, delete users (Students, Faculty, Admins)
- **System Configuration**: Dynamic semester windows and limits
- **Project Oversight**: Monitor all projects across semesters
- **Allocation Management**: Force faculty allocation and override
- **Track Finalization**: Approve student track selections (Sem 7, Sem 8)
- **Analytics Dashboard**: System-wide statistics and reports

---

## 📚 Semester Workflows

### B.Tech Student Workflows

#### **Semester 4 - Minor Project 1** ✅
- **Project Type**: Solo project
- **Faculty Allocation**: No faculty allocation required
- **Special Features**: 
  - PPT upload for presentation
  - Presentation scheduling by admin
  - Evaluation panel assignment (3 faculty members)
  - Multi-criteria evaluation system
- **Workflow**:
  1. Student registers project
  2. Admin sets evaluation dates
  3. Admin assigns evaluation panel
  4. Student uploads PPT
  5. Faculty evaluates project
  6. Results published

#### **Semester 5 - Minor Project 2** ✅
- **Project Type**: Group project (4-5 members)
- **Faculty Allocation**: Priority-based preference system
- **Special Features**:
  - Group formation with invitations
  - Faculty preference selection (5 preferences)
  - Choose/Pass allocation workflow
  - Group dashboard
- **Workflow**:
  1. Student registers project
  2. Create/join group
  3. Group leader fills project details
  4. Select faculty preferences
  5. Wait for faculty allocation
  6. Faculty accepts/passes allocation
  7. Project begins with allocated faculty

#### **Semester 6 - Minor Project 3** ✅
- **Project Type**: Group project (Same group as Sem 5)
- **Faculty Allocation**: Same faculty as Sem 5 (automatic)
- **Special Features**:
  - Project continuation option
  - New project option
  - Automatic faculty assignment
- **Workflow**:
  1. Student chooses: Continue Sem 5 project OR New project
  2. If continuing: Same faculty automatically assigned
  3. If new: Follow Sem 5 workflow

#### **Semester 7 - Major Project 1 / Internship** ✅
- **Track Selection**: 
  - **Path A**: 6-Month Internship
  - **Path B**: Coursework (Major Project 1 + Internship 1)
- **Special Features**:
  - Track selection interface
  - Summer internship evidence submission
  - Internship 1 solo project (if no summer internship)
  - Major Project 1 group formation
- **Workflow (Coursework Track)**:
  1. Student selects "Coursework" track
  2. Admin finalizes track
  3. **For Summer Internship**:
     - Submit evidence (completion certificate required)
     - Admin reviews and verifies
     - If approved: No Internship 1 needed
     - If rejected: Must do Internship 1 project
  4. **For Internship 1** (if needed):
     - Register solo project
     - Select faculty preferences
     - Wait for allocation
  5. **For Major Project 1**:
     - Form group (4-5 members)
     - Register project
     - Select faculty preferences
     - Wait for allocation

#### **Semester 8 - Major Project 2 / Internship** ✅
- **Track Selection**:
  - **Path A**: Coursework (Major Project 1 + Internship 1 continuation)
  - **Path B**: 6-Month Internship
  - **Path C**: Major Project 2 (New group)
- **Special Features**:
  - Track finalization
  - Project continuation for coursework students
  - New group formation option
- **Workflow**:
  1. Student selects track
  2. Admin finalizes track
  3. Continue with allocated faculty OR form new group

### M.Tech Student Workflows

#### **Semester 1 - Minor Project 1** ✅
- **Project Type**: Solo project
- **Faculty Allocation**: Priority-based preferences
- **Workflow**: Similar to B.Tech Sem 5 (individual)

#### **Semester 2 - Minor Project 2** ✅
- **Project Type**: Solo project
- **Faculty Allocation**: Same faculty as Sem 1 (automatic)
- **Special Features**: Project continuation option

#### **Semester 3 - Major Project 1 / Internship** ✅
- **Track Selection**:
  - **Path A**: 6-Month Internship
  - **Path B**: Major Project 1 (Solo)
- **Workflow**: Similar to B.Tech Sem 7 (individual)

#### **Semester 4 - Major Project 2 / Internship** ✅
- **Track Selection**:
  - **Path A**: 6-Month Internship
  - **Path B**: Major Project 2 (Solo)
- **Workflow**: Similar to B.Tech Sem 8 (individual)

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI library
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **React Query** - Data fetching and caching
- **React Hook Form** - Form management
- **React Hot Toast** - Toast notifications
- **React Icons** - Icon library
- **Date-fns** - Date manipulation

### Backend
- **Node.js** - JavaScript runtime
- **Express.js 5** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Socket.IO** - Real-time bidirectional communication
- **JWT** - JSON Web Tokens for authentication
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **Nodemailer** - Email service (configured)
- **CORS** - Cross-origin resource sharing
- **Express-Validator** - Input validation and sanitization middleware

### Database
- **MongoDB Atlas** - Cloud database hosting
- **Mongoose Schemas** - Data modeling
- **Indexes** - Optimized queries
- **Relationships** - Referenced documents

---

## 🏗️ System Architecture

### Backend Structure
```
backend/
├── config/          # Database configuration
├── controllers/     # Business logic (10 controllers)
├── middleware/      # Authentication, validation, file uploads
├── models/          # Database schemas (13 models)
├── routes/          # API endpoints (10 route files)
├── services/        # Email, Socket.IO services
├── utils/           # Helper functions
└── uploads/         # File storage
    ├── chat/        # Chat attachments
    ├── internships/ # Internship documents
    └── projects/    # Project files
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/  # Reusable UI components
│   ├── pages/       # Page components
│   │   ├── admin/   # Admin pages
│   │   ├── faculty/ # Faculty pages
│   │   ├── student/ # Student pages
│   │   └── shared/  # Shared pages (ProjectDetails)
│   ├── context/     # React context providers
│   ├── hooks/       # Custom React hooks
│   ├── utils/       # Utility functions (API client)
│   └── App.jsx      # Main app component
```

### Database Models
- **User** - Base user model
- **Student** - Student-specific data
- **Faculty** - Faculty information
- **Admin** - Admin accounts
- **Project** - Project details
- **Group** - Group information
- **FacultyPreference** - Preference tracking
- **Message** - Chat messages
- **InternshipApplication** - Internship records
- **SystemConfig** - System configuration
- **Evaluation** - Evaluation records

---

## 🚀 Advanced Features

### 1. Real-Time Chat System
- **Socket.IO Integration**: Bidirectional real-time communication
- **Message Editing**: 5-minute edit window with history
- **Emoji Reactions**: 10 emoji reactions with grouping
- **Message Search**: Backend regex search with real-time filtering
- **File Attachments**: Up to 3 files per message (10MB each)
- **Smart Timestamps**: Context-aware time display
- **Message Deletion**: Delete own messages with confirmation

### 2. Intelligent Group Management
- **Dynamic Invitations**: Send/accept/reject with real-time updates
- **Role-Based Permissions**: Group leader vs member capabilities
- **Status Tracking**: Pending, active, completed states
- **Member Management**: Add/remove members with validation
- **Group Dashboard**: Centralized project and member information

### 3. Faculty Allocation Algorithm
- **Preference Matching**: Priority-based allocation
- **Workload Balancing**: Track faculty capacity
- **Auto-Rejection**: Handle rejected allocations automatically
- **Choose/Pass System**: Faculty can accept or pass requests
- **Force Allocation**: Admin override capability

### 4. File Management System
- **Secure Uploads**: Multer middleware with validation
- **File Type Detection**: 28+ supported file types
- **Preview System**: Visual file type indicators
- **Organized Storage**: Semester and type-based organization
- **Access Control**: Project member-only downloads

### 5. Evaluation System
- **Multi-Criteria Scoring**: 4 evaluation criteria
- **Automatic Grading**: Grade calculation (A+, A, B+, B, C, F)
- **Feedback System**: Comprehensive feedback and recommendations
- **Panel Assignment**: Admin-assigned evaluation panels
- **Evaluation History**: Track all evaluations

### 6. Dynamic Configuration
- **Semester Windows**: Configurable registration/evaluation windows
- **System Limits**: Admin-configurable group sizes, preferences
- **Faculty Types**: Configure faculty categories
- **Real-Time Updates**: Changes reflect immediately

---

## 👥 User Roles & Capabilities

### 👨‍🎓 Student
- **Dashboard**: Semester-specific project overview
- **Project Registration**: Register projects for current semester
- **Group Management**: Create groups, send/accept invitations
- **Faculty Preferences**: Select 5 faculty preferences with priorities
- **File Uploads**: Upload PPTs, documents, deliverables
- **Chat**: Real-time project chat with file sharing
- **Track Selection**: Choose internship or coursework track (Sem 7, 8)
- **Internship Applications**: Submit summer internship evidence
- **Profile Management**: Update personal information

### 👨‍🏫 Faculty
- **Dashboard**: Assigned projects and groups overview
- **Allocation Management**: Accept/pass group allocation requests
- **Project Supervision**: Monitor assigned projects
- **Evaluation**: Evaluate projects with multi-criteria scoring
- **Student Management**: View assigned students and their progress
- **Chat**: Communicate with project groups
- **Profile Management**: Update faculty information

### 👨‍💼 Admin
- **User Management**: Create/update/delete users (Students, Faculty, Admins)
- **Project Oversight**: Monitor all projects across semesters
- **Group Management**: View and manage all groups
- **Allocation Control**: Force faculty allocation, override decisions
- **System Configuration**: Configure semester windows, limits, faculty types
- **Track Finalization**: Approve student track selections
- **Evaluation Panel Assignment**: Assign faculty to evaluation panels (Sem 4)
- **Internship Review**: Review and verify internship applications
- **Analytics**: System-wide statistics and reports
- **Semester Management**: Configure semester-specific settings

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account (or local MongoDB)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Student-Project-Management-System-IIITP/Student-Project-Management-System-IIITP
   cd SPMS@IIITP
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Environment Configuration**
   
   Create `.env` file in `backend/`:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   ```

5. **Start Development Servers**
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   nodemon server.js
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

6. **Access the Application**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5000`

### Default Admin Account
**Email:** `pathaneamrut@gmail.com`  
**Password:** `Amrut@123`

> **Note:** You can also create additional admin accounts through the admin dashboard.

---

## 📁 Project Structure

### Key Directories

**Backend:**
- `controllers/` - Business logic for all operations
- `models/` - Database schemas and models
- `routes/` - API endpoint definitions
- `middleware/` - Authentication, validation, file uploads
- `services/` - Email and Socket.IO services
- `keepalive/` - Temporary workaround to prevent sleeping on Render free tier (see `backend/keepalive/README.md`)

**Frontend:**
- `pages/student/` - Student-specific pages (25+ pages)
- `pages/faculty/` - Faculty-specific pages
- `pages/admin/` - Admin-specific pages (20+ pages)
- `pages/shared/` - Shared components (ProjectDetails with chat)
- `utils/api.js` - Centralized API client

**Documentation:**
- `docs/` - Comprehensive documentation (40+ markdown files)
  - Implementation plans
  - Feature guides
  - API references
  - Workflow documentation

---

## 📡 API Documentation

### Authentication Endpoints (`/api/auth`)
- `POST /api/auth/signup/student` - Student registration
- `POST /api/auth/signup/faculty` - Faculty registration
- `POST /api/auth/signup/admin` - Admin registration
- `POST /api/auth/signup/send-otp` - Send OTP for signup
- `POST /api/auth/signup/verify-otp` - Verify OTP
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `GET /api/auth/verify` - Verify JWT token

### Student Endpoints (`/api/student`)
**Dashboard & Profile:**
- `GET /api/student/dashboard` - Get dashboard data
- `GET /api/student/semester-features` - Get semester-specific features
- `GET /api/student/profile` - Get student profile
- `PUT /api/student/profile` - Update student profile

**Projects:**
- `GET /api/student/projects` - Get all student projects
- `POST /api/student/projects` - Register project
- `GET /api/student/projects/:id` - Get project by ID
- `PUT /api/student/projects/:id` - Update project
- `POST /api/student/projects/:id/submit` - Submit deliverables
- `POST /api/student/projects/minor2/register` - Register Minor Project 2
- `POST /api/student/projects/major1/register` - Register Major Project 1
- `POST /api/student/projects/major2/register` - Register Major Project 2
- `GET /api/student/projects/internship1/status` - Check Internship 1 status
- `POST /api/student/projects/internship1/register` - Register Internship 1
- `GET /api/student/projects/internship2/status` - Check Internship 2 status
- `POST /api/student/projects/internship2/register` - Register Internship 2
- `GET /api/student/projects/:projectId/allocation-status` - Get faculty allocation status

**Semester 4 Specific:**
- `POST /api/student/projects/:id/submit-ppt` - Upload PPT
- `DELETE /api/student/projects/:id/remove-ppt` - Remove PPT
- `GET /api/student/projects/:id/download-ppt` - Download PPT
- `POST /api/student/projects/:id/schedule-presentation` - Schedule presentation
- `GET /api/student/projects/:id/sem4-status` - Get Sem 4 project status

**Groups:**
- `GET /api/student/groups` - Get student groups
- `POST /api/student/groups` - Create group
- `GET /api/student/groups/:id` - Get group by ID
- `PUT /api/student/groups/:groupId` - Update group name
- `GET /api/student/groups/available-students` - Get available students
- `GET /api/student/groups/invitations` - Get group invitations
- `POST /api/student/groups/:id/invite` - Invite member to group
- `POST /api/student/groups/:groupId/invite/:inviteId/accept` - Accept invitation
- `POST /api/student/groups/:groupId/invite/:inviteId/reject` - Reject invitation
- `POST /api/student/groups/:groupId/send-invitations` - Send group invitations
- `GET /api/student/groups/available` - Get available groups
- `POST /api/student/groups/:groupId/leave` - Leave group
- `POST /api/student/groups/:groupId/transfer-leadership` - Transfer leadership
- `POST /api/student/groups/:groupId/finalize` - Finalize group
- `POST /api/student/groups/:groupId/faculty-preferences` - Submit faculty preferences

**Semester 6:**
- `GET /api/student/projects/continuation` - Get continuation projects
- `POST /api/student/projects/continuation` - Create continuation project
- `GET /api/student/sem6/pre-registration` - Get Sem 5 group for Sem 6
- `POST /api/student/sem6/register` - Register Sem 6 project
- `GET /api/student/projects/:id/milestones` - Get project milestones
- `PUT /api/student/projects/:id/milestones/:milestoneId` - Update milestone
- `GET /api/student/projects/:id/progress` - Get project progress

**Semester 7:**
- `GET /api/student/sem7/options` - Get Sem 7 options
- `POST /api/student/internships/apply` - Apply for internship
- `GET /api/student/projects/:id/analytics` - Get major project analytics
- `GET /api/student/internships/progress` - Get internship progress

**Semester 8:**
- `GET /api/student/graduation/status` - Get graduation status
- `GET /api/student/portfolio` - Get final project portfolio
- `GET /api/student/projects/:id/comprehensive` - Get comprehensive project summary
- `GET /api/student/academic-journey` - Get academic journey

**M.Tech:**
- `GET /api/student/mtech/semester-options` - Get M.Tech semester options
- `GET /api/student/mtech/project-continuation` - Get project continuation options
- `POST /api/student/mtech/internship/apply` - Apply for M.Tech internship
- `GET /api/student/mtech/coursework/eligibility` - Check coursework eligibility
- `GET /api/student/mtech/academic-path` - Get M.Tech academic path
- `GET /api/student/mtech/sem2/pre-registration` - Get Sem 1 project for Sem 2
- `POST /api/student/mtech/sem2/register` - Register M.Tech Sem 2 project
- `POST /api/student/mtech/sem3/major-project/register` - Register M.Tech Sem 3 major project

**Internships:**
- `GET /api/student/internships` - Get student internships
- `POST /api/student/internships` - Add internship

**System Config:**
- `GET /api/student/system-config/:key` - Get system config for students

### Faculty Endpoints (`/api/faculty`)
**Dashboard & Profile:**
- `GET /api/faculty/dashboard` - Get faculty dashboard
- `GET /api/faculty/profile` - Get faculty profile
- `PUT /api/faculty/profile` - Update faculty profile

**Students & Projects:**
- `GET /api/faculty/students` - Get assigned students
- `GET /api/faculty/projects` - Get assigned projects
- `PUT /api/faculty/projects/:id` - Update project
- `POST /api/faculty/projects/:id/evaluate` - Evaluate project

**Groups:**
- `GET /api/faculty/groups` - Get assigned groups
- `GET /api/faculty/groups/unallocated` - Get unallocated groups
- `GET /api/faculty/groups/allocated` - Get allocated groups
- `POST /api/faculty/groups/:groupId/choose` - Choose group
- `POST /api/faculty/groups/:groupId/pass` - Pass group

**Allocations:**
- `GET /api/faculty/allocations` - Get allocation requests
- `POST /api/faculty/allocations/:id/accept` - Accept allocation
- `POST /api/faculty/allocations/:id/reject` - Reject allocation
- `POST /api/faculty/projects/:requestId/choose` - Choose project allocation
- `POST /api/faculty/projects/:requestId/pass` - Pass project allocation

**M.Tech Sem 3:**
- `GET /api/faculty/mtech/sem3/major-projects/pending` - Get pending M.Tech Sem 3 projects
- `POST /api/faculty/mtech/sem3/major-projects/:projectId/choose` - Choose M.Tech Sem 3 project
- `POST /api/faculty/mtech/sem3/major-projects/:projectId/pass` - Pass M.Tech Sem 3 project

**Statistics & Notifications:**
- `GET /api/faculty/statistics/sem5` - Get Sem 5 statistics
- `GET /api/faculty/notifications` - Get notifications
- `PATCH /api/faculty/notifications/:notificationId/dismiss` - Dismiss notification

### Admin Endpoints (`/api/admin`)
**Dashboard & Profile:**
- `GET /api/admin/dashboard` - Get admin dashboard
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/profile` - Get admin profile
- `PUT /api/admin/profile` - Update admin profile

**User Management:**
- `GET /api/admin/users` - Get all users
- `GET /api/admin/students` - Search students
- `GET /api/admin/students/by-semester` - Get students by semester
- `POST /api/admin/students/update-semesters` - Update student semesters
- `GET /api/admin/students/:studentId` - Get student details
- `PUT /api/admin/students/:studentId` - Update student profile
- `POST /api/admin/students/:studentId/reset-password` - Reset student password
- `GET /api/admin/faculty` - Get faculty list
- `GET /api/admin/faculties` - Search faculties
- `GET /api/admin/faculties/:facultyId` - Get faculty details
- `PUT /api/admin/faculties/:facultyId` - Update faculty profile
- `POST /api/admin/faculties/:facultyId/reset-password` - Reset faculty password

**Project Management:**
- `GET /api/admin/projects` - Get all projects
- `PUT /api/admin/projects/:id/status` - Update project status

**Group Management:**
- `GET /api/admin/groups` - Get all groups
- `GET /api/admin/groups/:groupId` - Get group details
- `PUT /api/admin/groups/:groupId` - Update group info
- `GET /api/admin/groups/:groupId/search-students` - Search students for group
- `POST /api/admin/groups/:groupId/members` - Add member to group
- `DELETE /api/admin/groups/:groupId/members/:studentId` - Remove member from group
- `PUT /api/admin/groups/:groupId/leader` - Change group leader
- `DELETE /api/admin/groups/:groupId/disband` - Disband group
- `POST /api/admin/groups/:groupId/allocate-faculty` - Allocate faculty to group
- `DELETE /api/admin/groups/:groupId/deallocate-faculty` - Deallocate faculty from group
- `GET /api/admin/unallocated-groups` - Get unallocated groups

**Allocation Management:**
- `GET /api/admin/allocations` - Get all allocations
- `POST /api/admin/force-allocate` - Force faculty allocation
- `GET /api/admin/allocation-statistics` - Get allocation statistics

**Semester-Specific Routes:**
- `GET /api/admin/sem4/registrations` - Get Sem 4 registrations
- `GET /api/admin/sem4/unregistered-students` - Get unregistered Sem 4 students
- `GET /api/admin/sem5/registrations` - Get Sem 5 registrations
- `GET /api/admin/sem5/allocated-faculty` - Get Sem 5 allocated faculty
- `GET /api/admin/sem5/non-registered-students` - Get Sem 5 non-registered students
- `GET /api/admin/groups/sem5` - Get Sem 5 groups
- `GET /api/admin/statistics/sem5` - Get Sem 5 statistics
- `GET /api/admin/sem6/registrations` - Get Sem 6 registrations
- `GET /api/admin/sem6/non-registered-groups` - Get Sem 6 non-registered groups
- `GET /api/admin/statistics/sem6` - Get Sem 6 statistics
- `GET /api/admin/sem7/track-choices` - Get Sem 7 track choices
- `PATCH /api/admin/sem7/finalize/:studentId` - Finalize Sem 7 track
- `GET /api/admin/sem7/internship1-track-choices` - Get Internship 1 track choices
- `PATCH /api/admin/sem7/internship1-track/:studentId` - Change Internship 1 track
- `GET /api/admin/sem8/track-choices` - Get Sem 8 track choices
- `PATCH /api/admin/sem8/finalize/:studentId` - Finalize Sem 8 track

**M.Tech Routes:**
- `GET /api/admin/mtech/sem1/registrations` - Get M.Tech Sem 1 registrations
- `GET /api/admin/mtech/sem1/unregistered-students` - Get unregistered M.Tech Sem 1 students
- `GET /api/admin/statistics/mtech/sem1` - Get M.Tech Sem 1 statistics
- `GET /api/admin/mtech/sem2/registrations` - Get M.Tech Sem 2 registrations
- `GET /api/admin/mtech/sem2/unregistered-students` - Get unregistered M.Tech Sem 2 students
- `GET /api/admin/statistics/mtech/sem2` - Get M.Tech Sem 2 statistics

**System Configuration:**
- `GET /api/admin/system-config` - Get all system configurations
- `GET /api/admin/system-config/safe-minimum-limit` - Get safe minimum faculty limit
- `POST /api/admin/system-config/initialize` - Initialize system configs
- `GET /api/admin/system-config/:key` - Get system config by key
- `PUT /api/admin/system-config/:key` - Update system config

### Project Endpoints (`/api/projects`) - Shared
**Project Details:**
- `GET /api/projects/student/current` - Get student's current project
- `GET /api/projects/faculty/allocated` - Get faculty's allocated projects
- `GET /api/projects/:projectId` - Get project details

**Chat & Messages:**
- `GET /api/projects/:projectId/messages` - Get project messages
- `POST /api/projects/:projectId/messages` - Send message (with file attachments)
- `PUT /api/projects/:projectId/messages/:messageId` - Edit message
- `DELETE /api/projects/:projectId/messages/:messageId` - Delete message
- `GET /api/projects/:projectId/messages/search` - Search messages
- `POST /api/projects/:projectId/messages/:messageId/reactions` - Add reaction
- `DELETE /api/projects/:projectId/messages/:messageId/reactions/:emoji` - Remove reaction
- `GET /api/projects/:projectId/media` - Get all media attachments

**Files:**
- `GET /api/projects/:projectId/files/:filename` - Download chat file

**Deliverables:**
- `POST /api/projects/:projectId/deliverables/:deliverableType` - Upload deliverable
- `GET /api/projects/:projectId/deliverables/:filename` - Download deliverable
- `DELETE /api/projects/:projectId/deliverables/:deliverableType` - Delete deliverable

**Meetings:**
- `POST /api/projects/:projectId/meeting` - Schedule meeting
- `POST /api/projects/:projectId/meeting/complete` - Complete meeting

**Faculty Preferences:**
- `POST /api/projects/:projectId/faculty-preferences` - Submit faculty preferences

### Semester Routes
**Semester 7 (`/api/sem7`):**
- `POST /api/sem7/choice` - Set Sem 7 track choice
- `GET /api/sem7/choice` - Get Sem 7 track choice
- `GET /api/sem7/track-choices` - List Sem 7 track choices (admin)

**Semester 8 (`/api/sem8`):**
- `GET /api/sem8/status` - Get Sem 8 status
- `POST /api/sem8/choice` - Set Sem 8 track choice
- `GET /api/sem8/choice` - Get Sem 8 track choice
- `GET /api/sem8/track-choices` - List Sem 8 track choices (admin)

**Semester 3 (`/api/sem3`):**
- `POST /api/sem3/choice` - Set Sem 3 track choice
- `GET /api/sem3/choice` - Get Sem 3 track choice
- `GET /api/sem3/track-choices` - List Sem 3 track choices (admin)

### Internship Routes (`/api/internships`)
- `POST /api/internships/applications` - Create internship application
- `GET /api/internships/applications/my` - Get my applications
- `PATCH /api/internships/applications/:id` - Update application
- `GET /api/internships/applications` - List all applications (admin)
- `PATCH /api/internships/applications/:id/review` - Review application (admin)
- `GET /api/internships/applications/:id/files/:fileType` - Download file


---

## 🛡️ Input Validation

The system uses `express-validator` middleware chains to validate and sanitize incoming request bodies and parameters, replacing the previous ad-hoc inline `if` checks scattered across controllers. Each route defines a chain of field-level rules, and a shared `validateRequest` middleware intercepts failures before they reach the controller:

```js
body('email')
  .isEmail().withMessage('Please enter a valid email address'),
body('password')
  .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
```

### Validation Changes Beyond Original Behavior

As part of this integration, the following new constraints were added at the API layer to close existing gaps and prevent raw Mongoose database errors from leaking to clients:

* **Password Complexity** — Applied consistently across student signup, faculty signup, admin signup, reset password, and change password (new password). Passwords must now include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character, in addition to the existing 6-character minimum.
* **Faculty & Admin Contact Number** — Now enforces valid mobile number format (`/^[6-9]\d{9}$/`) at the API layer, returning a clean `400 Bad Request` instead of a raw database validation error.
* **Faculty & Admin Email** — Now enforces standard email format (`isEmail()`) at the API layer.

---

## 🎯 Project Highlights for Recruiters

### Technical Excellence
- ✅ **Full-Stack Development**: Complete MERN stack implementation
- ✅ **Real-Time Features**: Socket.IO for live updates and chat
- ✅ **Scalable Architecture**: Modular, maintainable codebase
- ✅ **Security**: JWT authentication, role-based access control
- ✅ **File Management**: Secure file uploads with validation
- ✅ **Database Design**: Optimized MongoDB schemas with relationships

### Problem-Solving Skills
- ✅ **Complex Workflows**: Handles 8+ different semester workflows
- ✅ **Business Logic**: Intelligent faculty allocation algorithm
- ✅ **State Management**: Efficient React state and context management
- ✅ **Error Handling**: Comprehensive error handling and validation
- ✅ **User Experience**: Intuitive UI with real-time feedback

### Code Quality
- ✅ **Clean Code**: Well-structured, readable codebase
- ✅ **Documentation**: 40+ comprehensive documentation files
- ✅ **Best Practices**: Follows React and Node.js best practices
- ✅ **Reusability**: Reusable components and utilities
- ✅ **Testing Ready**: Structure supports easy testing

### Features Implemented
- ✅ **25+ Student Pages**: Complete student workflows
- ✅ **20+ Admin Pages**: Comprehensive admin management
- ✅ **Real-Time Chat**: Advanced chat with editing, reactions, search
- ✅ **File Sharing**: Multi-file upload with preview
- ✅ **Group Management**: Dynamic group formation system
- ✅ **Evaluation System**: Multi-criteria scoring system
- ✅ **Internship Management**: Complete internship workflow

---

## 📊 Project Statistics

- **Total Pages**: 50+ React components
- **API Endpoints**: 80+ RESTful endpoints
- **Database Models**: 13 Mongoose schemas
- **Documentation**: 40+ markdown files
- **Features**: 30+ major features
- **Semesters Supported**: 8 B.Tech + 4 M.Tech = 12 semester workflows
- **File Types Supported**: 28+ file types
- **Real-Time Events**: 10+ Socket.IO events

---

**SPMS@IIITP - Streamlining Project Management for Academic Excellence** 🎓✨
