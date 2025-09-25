# Student Workflow Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for the Student Project Management System (SPMS) at IIIT Pune. The system handles complex workflows for both B.Tech and M.Tech students across different semesters, with varying project types, group formations, and faculty allocations.

## Current System Status

### ✅ What We Have
- Basic User, Student, Faculty, Admin models
- Authentication system with JWT
- Basic routing structure
- Frontend dashboard components (static)
- Database connection and configuration

### ❌ What's Missing
- Project management system
- Group management
- Faculty preference/allocation system
- Semester-specific workflows
- Dynamic dashboard based on semester
- Controllers for student/admin functionality
- Internship tracking beyond basic fields

## Student Workflow Analysis

### B.Tech Student Workflow

| Semester | Project Type | Group Size | Faculty Allocation | Special Requirements |
|----------|-------------|------------|-------------------|---------------------|
| **4** | Minor Project 1 | Solo | No faculty | PPT + Presentation |
| **5** | Minor Project 2 | 4-5 members | Faculty preferences → Allocation | Group formation |
| **6** | Minor Project 3 | Same as Sem 5 | Same faculty | Continue previous OR new project |
| **7** | **Path A:** 6-month internship | N/A | N/A | Company details |
| | **Path B:** Major Project 1 | 4-5 members | Faculty preferences → Allocation | Group formation |
| | **Path B:** Internship-1 (if no summer internship) | Solo | Faculty preferences → Allocation | Individual project |
| **8** | **Path A:** Coursework (Major Project 1 + Internship-1) | Same as Sem 7 | Same faculty | For internship students |
| | **Path B:** 6-month internship | N/A | N/A | Company details |
| | **Path C:** Major Project 2 | 4-5 members | Faculty preferences → Allocation | New group formation |

### M.Tech Student Workflow

| Semester | Project Type | Group Size | Faculty Allocation | Special Requirements |
|----------|-------------|------------|-------------------|---------------------|
| **1** | Minor Project 1 | Solo | Faculty preferences → Allocation | Individual project |
| **2** | Minor Project 2 | Solo | Same faculty as Sem 1 | Continue previous OR new project |
| **3** | **Path A:** 6-month internship | N/A | N/A | Company details |
| | **Path B:** Major Project 1 | Solo | Faculty preferences → Allocation | Individual project |
| **4** | **Path A:** 6-month internship | N/A | N/A | Company details |
| | **Path B:** Major Project 2 | Solo | Faculty preferences → Allocation | Individual project |

## Database Design

### 1. Project Model

```javascript
const projectSchema = {
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  projectType: {
    type: String,
    required: true,
    enum: ['minor1', 'minor2', 'minor3', 'major1', 'major2', 'internship1', 'internship2']
  },
  
  // Student Information
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  
  // Faculty Information
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  facultyPreferences: [{
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty'
    },
    priority: {
      type: Number,
      min: 1,
      max: 5
    }
  }],
  
  // Semester Information
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  academicYear: {
    type: String,
    required: true
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['registered', 'faculty_allocated', 'active', 'completed', 'cancelled'],
    default: 'registered'
  },
  
  // Project Continuation
  isContinuation: {
    type: Boolean,
    default: false
  },
  previousProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // Internship Specific
  isInternship: {
    type: Boolean,
    default: false
  },
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
    submittedAt: Date
  }],
  
  // Evaluation
  grade: String,
  feedback: String,
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  evaluatedAt: Date,
  
  // Allocation Information
  allocatedBy: {
    type: String,
    enum: ['faculty_choice', 'admin_allocation'],
    default: 'faculty_choice'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
};
```

### 2. Group Model

```javascript
const groupSchema = {
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  members: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    role: {
      type: String,
      enum: ['leader', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  semester: {
    type: Number,
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  maxMembers: {
    type: Number,
    default: 5,
    min: 2,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
};
```

### 3. Faculty Preference Model

```javascript
const facultyPreferenceSchema = {
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  preferences: [{
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  }],
  semester: {
    type: Number,
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'allocated', 'rejected'],
    default: 'pending'
  },
  allocatedFaculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  allocatedBy: {
    type: String,
    enum: ['faculty_choice', 'admin_allocation'],
    default: 'faculty_choice'
  },
  facultyResponse: {
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected']
    },
    responseAt: Date,
    comments: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
};
```

### 4. Enhanced Student Model

```javascript
// Additions to existing Student model
const studentEnhancements = {
  // Current semester projects
  currentProjects: [{
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    role: String,
    semester: Number,
    status: String
  }],
  
  // Internship history
  internshipHistory: [{
    type: {
      type: String,
      enum: ['summer', 'winter', '6month']
    },
    company: String,
    duration: String,
    semester: Number,
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'cancelled']
    },
    startDate: Date,
    endDate: Date
  }],
  
  // Group memberships
  groupMemberships: [{
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    role: String,
    semester: Number,
    isActive: Boolean
  }],
  
  // Semester-specific status
  semesterStatus: {
    canFormGroups: Boolean,
    canJoinProjects: Boolean,
    canApplyInternships: Boolean,
    hasCompletedPreviousProject: Boolean,
    isDoingInternship: Boolean,
    internshipSemester: Number
  }
};
```

## Implementation Phases

### Phase 1: Foundation & Models (Week 1)
**Goal:** Set up basic infrastructure without semester-specific logic

#### Tasks:
1. **Create Core Models:**
   - Project Model (basic structure)
   - Group Model (basic structure)
   - FacultyPreference Model (basic structure)
   - Enhanced Student Model (add project references)

2. **Create Basic Controllers:**
   - Student Controller (basic CRUD)
   - Admin Controller (basic CRUD)
   - Faculty Controller (basic CRUD)

3. **Create Basic Routes:**
   - Student routes
   - Admin routes
   - Faculty routes

4. **Database Setup:**
   - Create indexes for performance
   - Add validation rules
   - Set up relationships

#### Testing:
- Basic model creation
- Basic API endpoints
- Database relationships

#### Deliverables:
- Working models
- Basic API endpoints
- Database setup complete

---

### Phase 2: Sem 4 - Minor Project 1 (Week 2)
**Goal:** Implement the simplest workflow (solo project, no faculty allocation)

#### Requirements for Sem 4:
- Student can register for Minor Project 1
- Student can create/update project details
- Student can submit PPT and presentation details
- No faculty allocation needed
- No group formation needed

#### Implementation:

**Database Changes:**
- Add `projectType: 'minor1'` to Project model
- Add semester-specific validation
- Add deliverable tracking

**API Endpoints:**
```javascript
// Student Routes
POST   /api/student/projects                    // Register for project
GET    /api/student/projects                    // Get student's projects
GET    /api/student/projects/:id                // Get specific project
PUT    /api/student/projects/:id                // Update project details
POST   /api/student/projects/:id/submit         // Submit deliverables
GET    /api/student/dashboard                   // Get dashboard data

// Admin Routes
GET    /api/admin/projects                      // Get all projects
GET    /api/admin/projects/semester/:sem        // Get projects by semester
PUT    /api/admin/projects/:id/status           // Update project status
```

**Frontend Components:**
- Dynamic dashboard for Sem 4 students
- Project registration form
- Project details view
- Submission interface
- Admin project management

**Testing:**
1. Create test student (Sem 4)
2. Register for Minor Project 1
3. Update project details
4. Submit deliverables
5. Verify dashboard shows project
6. Test admin project management

#### Deliverables:
- Working Sem 4 workflow
- Student dashboard for Sem 4
- Admin project management
- Complete testing suite

---

### Phase 3: Sem 5 - Minor Project 2 (Week 3)
**Goal:** Add group formation and faculty preferences

#### Requirements for Sem 5:
- Student can form groups (4-5 members)
- Student can add faculty preferences
- Faculty can view and accept/reject groups
- Admin can allocate unallocated groups

#### Implementation:

**Database Changes:**
- Add group management to Project model
- Add faculty preference system
- Add faculty allocation logic

**API Endpoints:**
```javascript
// Group Management
POST   /api/student/groups                       // Create group
GET    /api/student/groups                       // Get student's groups
POST   /api/student/groups/:id/join              // Join group
POST   /api/student/groups/:id/leave             // Leave group
PUT    /api/student/groups/:id                   // Update group details

// Faculty Preferences
POST   /api/student/projects/:id/preferences     // Add faculty preferences
GET    /api/student/preferences                  // Get student's preferences
PUT    /api/student/preferences/:id              // Update preferences

// Faculty Allocation
GET    /api/faculty/allocations                  // Faculty view allocations
POST   /api/faculty/allocations/:id/accept       // Accept group
POST   /api/faculty/allocations/:id/reject       // Reject group
GET    /api/faculty/allocations/pending          // Get pending allocations

// Admin Allocation
GET    /api/admin/allocations/unallocated        // Get unallocated groups
POST   /api/admin/allocations/assign             // Assign faculty to group
```

**Frontend Components:**
- Group formation interface
- Faculty preference selection
- Faculty allocation dashboard
- Admin allocation interface
- Group management dashboard

**Testing:**
1. Create test students (Sem 5)
2. Form group with 4-5 members
3. Add faculty preferences
4. Faculty accepts/rejects groups
5. Admin allocates remaining groups
6. Verify group and faculty allocation

#### Deliverables:
- Working group formation system
- Faculty preference system
- Faculty allocation workflow
- Admin allocation system
- Complete testing suite

---

### Phase 4: Sem 6 - Minor Project 3 (Week 4)
**Goal:** Add project continuation logic

#### Requirements for Sem 6:
- Check if previous project is completed
- Allow continuation of previous project
- Allow starting new project
- Maintain same group and faculty

#### Implementation:

**Database Changes:**
- Add project continuation fields
- Add completion status tracking
- Add project history tracking

**API Endpoints:**
```javascript
// Project Continuation
GET    /api/student/projects/previous            // Get previous semester projects
POST   /api/student/projects/:id/continue        // Continue previous project
POST   /api/student/projects/new                // Start new project
GET    /api/student/projects/history            // Get project history
PUT    /api/student/projects/:id/complete       // Mark project as complete
```

**Frontend Components:**
- Project continuation interface
- Previous project status view
- New project registration
- Project history dashboard

**Testing:**
1. Test continuation of previous project
2. Test starting new project
3. Test group and faculty continuity
4. Test completion status tracking

#### Deliverables:
- Working project continuation system
- Project history tracking
- Completion status management
- Complete testing suite

---

### Phase 5: Sem 7 - Complex Workflows (Week 5-6)
**Goal:** Implement internship vs coursework decision trees

#### Requirements for Sem 7:
- Student chooses: 6-month internship OR coursework
- If internship: Company details collection
- If coursework: Major Project 1 + Internship-1 (if no summer internship)
- Faculty allocation for coursework projects

#### Implementation:

**Database Changes:**
- Add internship tracking
- Add decision tree logic
- Add multiple project types per semester
- Add internship history validation

**API Endpoints:**
```javascript
// Semester Choice
POST   /api/student/semester-choice             // Choose internship/coursework
GET    /api/student/semester-options            // Get available options

// Internship Management
POST   /api/student/internship                  // Register internship
GET    /api/student/internship-history          // Get internship history
PUT    /api/student/internship/:id              // Update internship details
POST   /api/student/internship/:id/complete     // Complete internship

// Multiple Projects
GET    /api/student/projects/current            // Get current semester projects
POST   /api/student/projects/multiple           // Register multiple projects
```

**Frontend Components:**
- Semester choice interface
- Internship registration form
- Multiple project management
- Decision tree navigation

**Testing:**
1. Test internship path
2. Test coursework path
3. Test multiple project registration
4. Test decision tree logic

#### Deliverables:
- Working decision tree system
- Internship management
- Multiple project support
- Complete testing suite

---

### Phase 6: Sem 8 - Final Workflows (Week 7)
**Goal:** Complete the B.Tech workflow

#### Requirements for Sem 8:
- Handle internship students doing coursework
- Handle non-internship students choosing internship
- Handle non-internship students doing Major Project 2

#### Implementation:

**Database Changes:**
- Add final semester logic
- Add graduation tracking
- Add final project evaluation

**API Endpoints:**
```javascript
// Final Semester
GET    /api/student/graduation-status           // Get graduation status
POST   /api/student/graduation-apply            // Apply for graduation
GET    /api/student/final-projects              // Get final projects
POST   /api/student/final-evaluation            // Submit final evaluation
```

**Frontend Components:**
- Graduation status dashboard
- Final project management
- Evaluation submission
- Completion tracking

**Testing:**
1. Test all Sem 8 paths
2. Test graduation workflow
3. Test final evaluation
4. Test completion tracking

#### Deliverables:
- Complete B.Tech workflow
- Graduation management
- Final evaluation system
- Complete testing suite

---

### Phase 7: M.Tech Implementation (Week 8-9)
**Goal:** Adapt system for M.Tech workflow

#### Requirements:
- Solo projects only
- Faculty allocation for all projects
- Project continuation logic
- Internship tracking

#### Implementation:

**Database Changes:**
- Add M.Tech specific project types
- Add M.Tech semester logic
- Add M.Tech faculty allocation

**API Endpoints:**
```javascript
// M.Tech Specific
GET    /api/student/mtech-options               // Get M.Tech options
POST   /api/student/mtech-projects              // Register M.Tech project
GET    /api/student/mtech-history               // Get M.Tech history
```

**Frontend Components:**
- M.Tech dashboard
- M.Tech project management
- M.Tech faculty allocation
- M.Tech internship tracking

**Testing:**
1. Test M.Tech project registration
2. Test M.Tech faculty allocation
3. Test M.Tech project continuation
4. Test M.Tech internship tracking

#### Deliverables:
- Complete M.Tech workflow
- M.Tech specific features
- M.Tech testing suite
- Complete system documentation

---

## Testing Strategy

### Unit Testing
- Model validation
- API endpoint testing
- Business logic testing

### Integration Testing
- Database operations
- API integration
- Frontend-backend integration

### End-to-End Testing
- Complete user workflows
- Cross-semester testing
- Multi-user scenarios

### Performance Testing
- Database query optimization
- API response times
- Concurrent user handling

## Risk Mitigation

### Technical Risks
- **Database Performance:** Implement proper indexing and query optimization
- **API Scalability:** Use pagination and caching strategies
- **Frontend Complexity:** Implement component-based architecture

### Business Risks
- **Workflow Changes:** Design flexible system that can adapt to changes
- **User Adoption:** Implement intuitive UI/UX
- **Data Integrity:** Implement proper validation and error handling

### Timeline Risks
- **Scope Creep:** Stick to defined phases
- **Testing Delays:** Allocate sufficient testing time
- **Integration Issues:** Test integration points early

## Success Metrics

### Technical Metrics
- API response times < 200ms
- Database query performance
- System uptime > 99%
- Zero data loss

### Business Metrics
- User adoption rate
- Workflow completion rate
- Error rate < 1%
- User satisfaction score

## Maintenance and Support

### Documentation
- API documentation
- User guides
- Developer documentation
- Troubleshooting guides

### Monitoring
- System health monitoring
- Performance monitoring
- Error tracking
- User analytics

### Updates
- Regular security updates
- Feature enhancements
- Bug fixes
- Performance improvements

## Conclusion

This implementation plan provides a structured approach to building the Student Project Management System. By breaking down the complex workflow into manageable phases, we can ensure thorough testing and validation at each step while maintaining system integrity and user experience.

The phased approach allows for:
- Incremental testing and validation
- Risk mitigation through early issue detection
- User feedback integration
- Flexible requirement adjustments
- Comprehensive documentation

Each phase builds upon the previous one, ensuring a solid foundation for the complete system while maintaining the ability to adapt to changing requirements and user feedback.
