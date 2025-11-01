# Semester 6 Implementation Plan
## Minor Project 3 - Project Continuation Workflow

**Date:** 2025-01-XX  
**Goal:** Implement Sem 6 workflow with group/faculty carryover and project continuation choice

---

## ❓ Clarification Questions

Before finalizing the plan, please confirm:

### 1. **Group Migration**
- **Q:** When students move from Sem 5 → Sem 6, should we:
  - **Option A:** Update the same Group document's `semester` field from 5 → 6?
  - **Option B:** Create a new Group document for Sem 6 but copy all members/faculty from Sem 5 group?
  
  **Recommendation:** Option A (update existing group) - simpler and maintains history

### 2. **Project Registration Timeline**
- **Q:** Can all group members register at different times, or must they register together?
- **Q:** If continuing Sem 5 project, does the group leader register once on behalf of all, or each member registers individually?

  **Assumption:** Group leader registers once, and it applies to all group members

### 3. **Sem 5 Project Status**
- **Q:** When continuing Sem 5 project, should we:
  - Keep Sem 5 project status as `active` and create Sem 6 as continuation?
  - Change Sem 5 project status to `completed`?
  
  **Recommendation:** Change Sem 5 to `completed` and create new Sem 6 project with `isContinuation: true`

### 4. **Old Projects Section**
- **Q:** For "older projects" section, should we:
  - Show ALL previous semester projects (Sem 4, Sem 5)?
  - Only show Sem 5 project if they chose NOT to continue it?
  
  **Assumption:** Show all previous semester projects, but disable chat/actions for completed ones

### 5. **Group Leader Changes**
- **Q:** Can group leadership change between Sem 5 → Sem 6?
- **Q:** If group leader from Sem 5 doesn't register for Sem 6, what happens?

  **Assumption:** Leadership carries forward, but can be transferred if needed

---

## 📋 Sem 6 Workflow Requirements

### Step 1: Pre-Registration Check
1. ✅ Student must be in Sem 6
2. ✅ Student must have completed Sem 5 project (or be in Sem 5 group)
3. ✅ Check if student's Sem 5 group exists
4. ✅ Verify Sem 5 faculty allocation

### Step 2: Registration Process (3 Steps)

#### Step 2.1: Show Group Details
- Display Sem 5 group members (all members)
- Show group leader
- Show group status
- Display: "Your group from Semester 5 will continue in Semester 6"

#### Step 2.2: Show Allocated Faculty
- Display faculty name and details
- Show: "Your allocated faculty from Semester 5 will continue supervising your group"
- Display faculty contact info

#### Step 2.3: Project Continuation Choice
**Option A: Continue Sem 5 Project**
- Show Sem 5 project details (title, description)
- Label: "Minor Project 2 (continued)" → becomes "Minor Project 3"
- Create continuation project with:
  - `isContinuation: true`
  - `previousProject: <Sem5ProjectId>`
  - `projectType: 'minor3'`
  - `semester: 6`
  - Same group, same faculty
  - Copy Sem 5 project details (title, description)

**Option B: New Project**
- Show form to enter new project details (like Sem 5 registration)
- Create new project with:
  - `isContinuation: false`
  - `previousProject: null`
  - `projectType: 'minor3'`
  - `semester: 6`
  - Same group, same faculty
  - New title, description

### Step 3: Post-Registration
- Update Sem 5 project status to `completed` (if continuing)
- Move Sem 5 project to "Previous Projects" section
- Create Sem 6 project
- Link Sem 6 project to Sem 5 group (update group.project)

---

## 🗄️ Database Changes Required

### 1. Group Model Updates
**Action:** Update existing Sem 5 group to Sem 6

```javascript
// Update group semester
await Group.findByIdAndUpdate(groupId, {
  semester: 6,
  academicYear: '2025-26', // New academic year
  updatedAt: Date.now()
});
```

### 2. Project Model Updates
**Action:** Create Sem 6 project (continuation or new)

```javascript
// If continuing
const sem6Project = new Project({
  title: sem5Project.title, // Same title
  description: sem5Project.description, // Same description
  projectType: 'minor3',
  semester: 6,
  academicYear: '2025-26',
  student: student._id, // Leader's student ID
  group: sem5Group._id, // Same group
  faculty: sem5Group.allocatedFaculty, // Same faculty
  isContinuation: true,
  previousProject: sem5Project._id,
  status: 'registered'
});

// If new project
const sem6Project = new Project({
  title: newTitle,
  description: newDescription,
  projectType: 'minor3',
  semester: 6,
  academicYear: '2025-26',
  student: student._id,
  group: sem5Group._id,
  faculty: sem5Group.allocatedFaculty,
  isContinuation: false,
  previousProject: null,
  status: 'registered'
});
```

### 3. Update Sem 5 Project Status
```javascript
// Mark Sem 5 project as completed
await Project.findByIdAndUpdate(sem5Project._id, {
  status: 'completed',
  endDate: new Date()
});
```

### 4. Update Student Group Memberships
```javascript
// Update group membership for Sem 6
// Option 1: Update existing membership
await Student.updateMany(
  { 'groupMemberships.group': sem5Group._id },
  { 
    $set: { 
      'groupMemberships.$.semester': 6,
      'groupMemberships.$.isActive': true
    }
  }
);

// Option 2: Add new Sem 6 membership (recommended)
// Keep Sem 5 membership for history, add Sem 6 membership
```

---

## 🎯 Implementation Plan

### Phase 1: Backend - Group & Faculty Carryover

#### 1.1 Create Group Migration Function
**File:** `backend/utils/semesterMigration.js`

```javascript
/**
 * Migrate group from Sem 5 to Sem 6
 * - Updates group semester
 * - Updates academic year
 * - Updates group memberships
 * - Keeps faculty allocation
 */
const migrateGroupToSem6 = async (groupId, newAcademicYear) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Get Sem 5 group
    const group = await Group.findById(groupId).session(session);
    if (!group || group.semester !== 5) {
      throw new Error('Group not found or not from Sem 5');
    }
    
    // Update group semester
    group.semester = 6;
    group.academicYear = newAcademicYear;
    group.status = 'open'; // Reset to open for Sem 6
    group.project = null; // Clear Sem 5 project reference
    await group.save({ session });
    
    // Update all group members' memberships
    const memberIds = group.members.map(m => m.student);
    await Student.updateMany(
      { _id: { $in: memberIds } },
      {
        $push: {
          groupMemberships: {
            group: group._id,
            role: group.members.find(m => m.student.toString() === studentId.toString())?.role || 'member',
            semester: 6,
            isActive: true,
            joinedAt: new Date()
          }
        }
      },
      { session }
    );
    
    await session.commitTransaction();
    return group;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
```

#### 1.2 Get Sem 5 Group & Faculty
**File:** `backend/controllers/studentController.js`

```javascript
// Get Sem 5 group and faculty for Sem 6 registration
const getSem5GroupForSem6 = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findOne({ user: studentId });
    
    if (!student || student.semester !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Student must be in Semester 6'
      });
    }
    
    // Find Sem 5 group membership
    const sem5Membership = student.groupMemberships.find(
      gm => gm.semester === 5 && gm.isActive
    );
    
    if (!sem5Membership) {
      return res.status(404).json({
        success: false,
        message: 'No Sem 5 group found'
      });
    }
    
    // Get Sem 5 group with populated data
    const sem5Group = await Group.findById(sem5Membership.group)
      .populate('members.student', 'fullName misNumber collegeEmail')
      .populate('leader', 'fullName misNumber collegeEmail')
      .populate('allocatedFaculty', 'fullName department designation email')
      .populate('project', 'title description projectType status');
    
    if (!sem5Group) {
      return res.status(404).json({
        success: false,
        message: 'Sem 5 group not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        group: sem5Group,
        faculty: sem5Group.allocatedFaculty,
        sem5Project: sem5Group.project,
        canContinue: !!sem5Group.project // Can continue if Sem 5 project exists
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

---

### Phase 2: Backend - Sem 6 Project Registration

#### 2.1 Register Sem 6 Project (Continuation or New)
**File:** `backend/controllers/studentController.js`

```javascript
// Register Sem 6 project (with continuation choice)
const registerSem6Project = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const studentId = req.user.id;
    const { 
      isContinuing, 
      previousProjectId, 
      title, 
      description 
    } = req.body;
    
    const student = await Student.findOne({ user: studentId }).session(session);
    
    if (!student || student.semester !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Student must be in Semester 6'
      });
    }
    
    // Check if already registered
    const existingProject = await Project.findOne({
      group: { $in: await getStudentGroups(student._id, 6) },
      semester: 6,
      projectType: 'minor3'
    }).session(session);
    
    if (existingProject) {
      return res.status(400).json({
        success: false,
        message: 'Group already registered for Sem 6'
      });
    }
    
    // Get Sem 5 group
    const sem5Membership = student.groupMemberships.find(
      gm => gm.semester === 5 && gm.isActive
    );
    
    if (!sem5Membership) {
      return res.status(404).json({
        success: false,
        message: 'Sem 5 group not found'
      });
    }
    
    const sem5Group = await Group.findById(sem5Membership.group).session(session);
    if (!sem5Group || !sem5Group.allocatedFaculty) {
      return res.status(400).json({
        success: false,
        message: 'Group or faculty allocation missing'
      });
    }
    
    // Migrate group to Sem 6 (if not already migrated)
    if (sem5Group.semester !== 6) {
      await migrateGroupToSem6(sem5Group._id, getAcademicYear()).session(session);
      sem5Group.semester = 6;
    }
    
    let sem6Project;
    let sem5Project = null;
    
    if (isContinuing) {
      // Option A: Continue Sem 5 project
      if (!previousProjectId) {
        return res.status(400).json({
          success: false,
          message: 'Previous project ID required for continuation'
        });
      }
      
      sem5Project = await Project.findById(previousProjectId).session(session);
      if (!sem5Project || sem5Project.semester !== 5) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Sem 5 project'
        });
      }
      
      // Create continuation project
      sem6Project = new Project({
        title: sem5Project.title, // Same title
        description: sem5Project.description, // Same description
        projectType: 'minor3',
        semester: 6,
        academicYear: getAcademicYear(),
        student: student._id, // Group leader
        group: sem5Group._id,
        faculty: sem5Group.allocatedFaculty,
        isContinuation: true,
        previousProject: sem5Project._id,
        status: 'registered',
        startDate: new Date()
      });
      
      await sem6Project.save({ session });
      
      // Mark Sem 5 project as completed
      sem5Project.status = 'completed';
      sem5Project.endDate = new Date();
      await sem5Project.save({ session });
      
    } else {
      // Option B: New project
      if (!title || !description) {
        return res.status(400).json({
          success: false,
          message: 'Title and description required for new project'
        });
      }
      
      // Create new project
      sem6Project = new Project({
        title,
        description,
        projectType: 'minor3',
        semester: 6,
        academicYear: getAcademicYear(),
        student: student._id,
        group: sem5Group._id,
        faculty: sem5Group.allocatedFaculty,
        isContinuation: false,
        previousProject: null,
        status: 'registered',
        startDate: new Date()
      });
      
      await sem6Project.save({ session });
      
      // Mark Sem 5 project as completed (if exists)
      if (sem5Group.project) {
        const oldProject = await Project.findById(sem5Group.project).session(session);
        if (oldProject) {
          oldProject.status = 'completed';
          oldProject.endDate = new Date();
          await oldProject.save({ session });
        }
      }
    }
    
    // Update group with new project
    sem5Group.project = sem6Project._id;
    await sem5Group.save({ session });
    
    // Update all group members' current projects
    const memberIds = sem5Group.members.map(m => m.student);
    await Student.updateMany(
      { _id: { $in: memberIds } },
      {
        $push: {
          currentProjects: {
            project: sem6Project._id,
            role: sem5Group.members.find(m => m.student.toString() === studentId.toString())?.role || 'member',
            semester: 6,
            status: 'active',
            joinedAt: new Date()
          }
        }
      },
      { session }
    );
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      data: {
        project: await Project.findById(sem6Project._id)
          .populate('group', 'name members')
          .populate('faculty', 'fullName department'),
        isContinuation: isContinuing,
        previousProject: sem5Project
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};
```

---

### Phase 3: Frontend - Registration UI

#### 3.1 Registration Flow Component
**File:** `frontend/src/pages/student/Sem6Registration.jsx`

```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';

const Sem6Registration = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [groupData, setGroupData] = useState(null);
  const [facultyData, setFacultyData] = useState(null);
  const [sem5Project, setSem5Project] = useState(null);
  const [isContinuing, setIsContinuing] = useState(null);
  const [projectData, setProjectData] = useState({
    title: '',
    description: ''
  });
  
  // Step 1: Load Sem 5 group and faculty
  useEffect(() => {
    loadSem5Data();
  }, []);
  
  const loadSem5Data = async () => {
    try {
      const response = await studentAPI.getSem5GroupForSem6();
      setGroupData(response.data.group);
      setFacultyData(response.data.faculty);
      setSem5Project(response.data.sem5Project);
    } catch (error) {
      toast.error('Failed to load Sem 5 data');
    }
  };
  
  // Step 2: Show group details
  const renderGroupStep = () => (
    <div>
      <h2>Step 1: Your Group</h2>
      <p>Your group from Semester 5 will continue in Semester 6</p>
      <GroupMembersList members={groupData.members} />
      <button onClick={() => setStep(2)}>Continue</button>
    </div>
  );
  
  // Step 3: Show faculty
  const renderFacultyStep = () => (
    <div>
      <h2>Step 2: Allocated Faculty</h2>
      <p>Your allocated faculty from Semester 5 will continue supervising your group</p>
      <FacultyCard faculty={facultyData} />
      <button onClick={() => setStep(3)}>Continue</button>
    </div>
  );
  
  // Step 4: Continuation choice
  const renderContinuationStep = () => (
    <div>
      <h2>Step 3: Project Choice</h2>
      <p>Choose to continue your Sem 5 project or start a new project</p>
      
      <div>
        <button onClick={() => setIsContinuing(true)}>
          Continue Sem 5 Project
        </button>
        <button onClick={() => setIsContinuing(false)}>
          Start New Project
        </button>
      </div>
      
      {isContinuing === false && (
        <ProjectForm 
          data={projectData}
          onChange={setProjectData}
        />
      )}
      
      <button onClick={handleSubmit}>Register</button>
    </div>
  );
  
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.registerSem6Project({
        isContinuing,
        previousProjectId: sem5Project?._id,
        ...projectData
      });
      
      toast.success('Sem 6 project registered successfully!');
      navigate('/student/dashboard');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      {step === 1 && renderGroupStep()}
      {step === 2 && renderFacultyStep()}
      {step === 3 && renderContinuationStep()}
    </div>
  );
};
```

---

### Phase 4: Frontend - Dashboard Updates

#### 4.1 Show Continuation Projects
**File:** `frontend/src/pages/student/Dashboard.jsx`

```javascript
// In Dashboard component
const [sem6Project, setSem6Project] = useState(null);
const [isContinuation, setIsContinuation] = useState(false);

useEffect(() => {
  loadSem6Project();
}, []);

const loadSem6Project = async () => {
  try {
    const response = await studentAPI.getProjects({ semester: 6 });
    const project = response.data.find(p => p.projectType === 'minor3');
    
    if (project) {
      setSem6Project(project);
      setIsContinuation(project.isContinuation);
    }
  } catch (error) {
    console.error('Failed to load Sem 6 project:', error);
  }
};

// Render continuation project
{sem6Project && isContinuation && (
  <ProjectCard
    title={`${sem6Project.title} (Continued)`}
    subtitle="Minor Project 3 - Continued from Sem 5"
    project={sem6Project}
    link={`/projects/${sem6Project._id}`}
  />
)}

// Render new project
{sem6Project && !isContinuation && (
  <ProjectCard
    title={sem6Project.title}
    subtitle="Minor Project 3"
    project={sem6Project}
    link={`/projects/${sem6Project._id}`}
  />
)}
```

#### 4.2 Previous Projects Section
```javascript
// Show all previous semester projects
const [previousProjects, setPreviousProjects] = useState([]);

useEffect(() => {
  loadPreviousProjects();
}, []);

const loadPreviousProjects = async () => {
  try {
    const response = await studentAPI.getProjects({ 
      semester: { $in: [4, 5] } 
    });
    setPreviousProjects(response.data.filter(p => p.status === 'completed'));
  } catch (error) {
    console.error('Failed to load previous projects:', error);
  }
};

// Render previous projects
{previousProjects.length > 0 && (
  <section>
    <h2>Previous Projects</h2>
    {previousProjects.map(project => (
      <PreviousProjectCard
        key={project._id}
        project={project}
        chatDisabled={true} // Disable chat for completed projects
        actionsDisabled={true}
      />
    ))}
  </section>
)}
```

---

## 📝 API Endpoints Needed

### New Endpoints
1. `GET /student/sem6/pre-registration` - Get Sem 5 group/faculty
2. `POST /student/sem6/register` - Register Sem 6 project
3. `GET /student/projects/previous` - Get previous semester projects

### Updated Endpoints
1. `GET /student/projects` - Filter by semester (already exists)
2. `GET /student/groups` - Filter by semester (already exists)

---

## ✅ Implementation Checklist

### Backend
- [ ] Create `semesterMigration.js` utility
- [ ] Add `getSem5GroupForSem6` controller
- [ ] Add `registerSem6Project` controller
- [ ] Add `migrateGroupToSem6` function
- [ ] Update routes with Sem 6 endpoints
- [ ] Test group migration
- [ ] Test continuation project creation
- [ ] Test new project creation

### Frontend
- [ ] Create `Sem6Registration.jsx` component
- [ ] Create `GroupMembersList.jsx` component
- [ ] Create `FacultyCard.jsx` component
- [ ] Create `PreviousProjectCard.jsx` component
- [ ] Update Dashboard to show Sem 6 projects
- [ ] Add "Previous Projects" section
- [ ] Update routing for Sem 6 registration
- [ ] Test registration flow

### Testing
- [ ] Test group carryover
- [ ] Test faculty carryover
- [ ] Test continuation project registration
- [ ] Test new project registration
- [ ] Test old projects display
- [ ] Test dashboard updates

---

## 🎯 Key Decisions Needed

Please confirm:

1. ✅ Group migration: Update existing group vs create new?
2. ✅ Registration: Group leader only vs all members?
3. ✅ Sem 5 project status: Mark as completed immediately?
4. ✅ Old projects: Show all previous or only Sem 5?
5. ✅ Leadership: Can change between semesters?

---

**Ready to start implementation once you confirm these points!** 🚀

