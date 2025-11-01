# Reusable Features Refactoring Plan
## Making Sem 4 & 5 Features Work for All Semesters

**Date:** 2025-01-XX  
**Goal:** Refactor semester-specific features to be reusable across all semesters (Sem 4-8, M.Tech)

---

## 🎯 Executive Summary

Currently, we have:
- ✅ Sem 4 specific: `Sem4Context`, `useSem4Project`, `/sem4/` routes
- ✅ Sem 5 specific: `Sem5Context`, `useSem5Project`, `/sem5/` routes
- ✅ Hardcoded semester checks: `semester === 4`, `semester === 5`

**Target:** Single reusable system that works for:
- **Sem 4-8** (B.Tech) with different project types
- **Sem 1-4** (M.Tech) with different project types
- **All group features** (Sem 5+)
- **All chat features** (All semesters)
- **All faculty allocation** (Sem 5+)

---

## 📊 Current Issues Analysis

### 1. **Hardcoded Semester Checks**
```javascript
// ❌ BAD: Hardcoded checks everywhere
if (semester === 4) { /* Sem 4 logic */ }
if (semester === 5) { /* Sem 5 logic */ }

// ✅ GOOD: Configuration-based
const config = getSemesterConfig(semester, projectType);
if (config.supportsGroups) { /* group logic */ }
```

### 2. **Duplicate Contexts**
```javascript
// ❌ BAD: Separate contexts
Sem4Context.jsx
Sem5Context.jsx

// ✅ GOOD: Unified context
ProjectContext.jsx (works for all semesters)
```

### 3. **Semester-Specific Hooks**
```javascript
// ❌ BAD: Separate hooks
useSem4Project()
useSem5Project()

// ✅ GOOD: Unified hook
useProject(semester, projectType)
```

### 4. **Semester-Specific Routes**
```javascript
// ❌ BAD: Hardcoded routes
/student/projects/sem4/:projectId
/student/sem5/register

// ✅ GOOD: Dynamic routes
/student/projects/:semester/:projectId
/student/projects/:semester/register
```

---

## 🏗️ Architecture: Configuration-Based System

### Core Principle
**Use configuration objects to define semester/project-type capabilities instead of hardcoded checks.**

```javascript
// Semester Configuration Schema
const semesterConfig = {
  semester: 5,
  degree: 'B.Tech',
  projectTypes: ['minor2'],
  features: {
    supportsGroups: true,
    supportsFacultyAllocation: true,
    supportsPPTUpload: false,
    supportsPresentationScheduling: false,
    supportsProjectContinuation: false,
    groupSize: { min: 4, max: 5 },
    facultyPreferences: { max: 10, required: true },
    deliverables: ['report', 'presentation']
  },
  routes: {
    register: '/student/projects/5/register',
    dashboard: '/student/projects/5/dashboard'
  },
  labels: {
    projectName: 'Minor Project 2',
    registrationTitle: 'Register Minor Project 2'
  }
};
```

---

## 🔧 Refactoring Plan

### Phase 1: Create Unified Configuration System

#### 1.1 Semester Configuration Module
**File:** `backend/utils/semesterConfig.js`

```javascript
/**
 * Get semester configuration based on semester, degree, and project type
 */
const getSemesterConfig = (semester, degree, projectType) => {
  // B.Tech configurations
  const btechConfigs = {
    4: {
      projectTypes: ['minor1'],
      features: {
        supportsGroups: false,
        supportsFacultyAllocation: false,
        supportsPPTUpload: true,
        supportsPresentationScheduling: true,
        isSolo: true,
        groupSize: null,
        facultyPreferences: null
      }
    },
    5: {
      projectTypes: ['minor2'],
      features: {
        supportsGroups: true,
        supportsFacultyAllocation: true,
        supportsPPTUpload: false,
        supportsPresentationScheduling: false,
        isSolo: false,
        groupSize: { min: 4, max: 5 },
        facultyPreferences: { max: 10, required: true }
      }
    },
    6: {
      projectTypes: ['minor3'],
      features: {
        supportsGroups: true,
        supportsFacultyAllocation: true,
        supportsPPTUpload: false,
        supportsPresentationScheduling: false,
        supportsProjectContinuation: true,
        isSolo: false,
        groupSize: { min: 4, max: 5 },
        facultyPreferences: { max: 10, required: true }
      }
    },
    7: {
      projectTypes: ['major1', 'internship1'],
      features: {
        supportsGroups: true,
        supportsFacultyAllocation: true,
        supportsPPTUpload: false,
        supportsPresentationScheduling: false,
        supportsProjectContinuation: false,
        supportsInternship: true,
        isSolo: false,
        groupSize: { min: 4, max: 5 },
        facultyPreferences: { max: 10, required: true }
      }
    },
    8: {
      projectTypes: ['major2'],
      features: {
        supportsGroups: true,
        supportsFacultyAllocation: true,
        supportsPPTUpload: false,
        supportsPresentationScheduling: false,
        supportsProjectContinuation: true,
        supportsInternship: true,
        isSolo: false,
        groupSize: { min: 4, max: 5 },
        facultyPreferences: { max: 10, required: true }
      }
    }
  };

  // M.Tech configurations
  const mtechConfigs = {
    1: {
      projectTypes: ['minor1'],
      features: {
        supportsGroups: false,
        supportsFacultyAllocation: true,
        supportsPPTUpload: false,
        supportsPresentationScheduling: false,
        isSolo: true,
        groupSize: null,
        facultyPreferences: { max: 5, required: true }
      }
    },
    // ... other semesters
  };

  const configs = degree === 'B.Tech' ? btechConfigs : mtechConfigs;
  const semesterConfig = configs[semester];

  if (!semesterConfig) {
    throw new Error(`No configuration for semester ${semester} (${degree})`);
  }

  return {
    semester,
    degree,
    projectTypes: semesterConfig.projectTypes,
    features: semesterConfig.features,
    // Validate project type
    isValidProjectType: (type) => semesterConfig.projectTypes.includes(type),
    // Get project type labels
    getProjectTypeLabel: (type) => {
      const labels = {
        minor1: 'Minor Project 1',
        minor2: 'Minor Project 2',
        minor3: 'Minor Project 3',
        major1: 'Major Project 1',
        major2: 'Major Project 2',
        internship1: 'Internship (2 Month)',
        internship2: 'Internship (6 Month)'
      };
      return labels[type] || type;
    }
  };
};

module.exports = { getSemesterConfig };
```

**Usage:**
```javascript
const config = getSemesterConfig(5, 'B.Tech', 'minor2');
if (config.features.supportsGroups) {
  // Show group features
}
```

---

#### 1.2 Frontend Configuration Module
**File:** `frontend/src/utils/semesterConfig.js`

```javascript
/**
 * Frontend semester configuration
 * Mirrors backend but includes UI-specific data
 */
export const getSemesterConfig = (semester, degree, projectType) => {
  // Same structure as backend, but with UI enhancements
  const config = {
    semester,
    degree,
    projectTypes: [],
    features: {},
    labels: {
      projectName: '',
      registrationTitle: '',
      dashboardTitle: ''
    },
    routes: {
      register: `/student/projects/${semester}/register`,
      dashboard: `/student/projects/${semester}/dashboard`,
      group: `/student/groups/${semester}`
    },
    colors: {
      primary: 'blue',
      accent: 'indigo'
    }
  };

  // ... configuration logic

  return config;
};
```

---

### Phase 2: Unified Project Context

#### 2.1 Replace Sem4Context & Sem5Context with ProjectContext
**File:** `frontend/src/context/ProjectContext.jsx`

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getSemesterConfig } from '../utils/semesterConfig';

const ProjectContext = createContext();

export const useProject = () => useContext(ProjectContext);

export const ProjectProvider = ({ children }) => {
  const { user, userRole, roleData } = useAuth();
  const [currentSemester, setCurrentSemester] = useState(null);
  const [currentProjectType, setCurrentProjectType] = useState(null);
  const [config, setConfig] = useState(null);
  
  // Project state (works for any semester)
  const [project, setProject] = useState(null);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Initialize semester configuration
  useEffect(() => {
    if (roleData?.semester && roleData?.degree) {
      const semester = roleData.semester;
      const degree = roleData.degree;
      
      // Determine project type based on semester
      const projectType = getDefaultProjectType(semester, degree);
      
      setCurrentSemester(semester);
      setCurrentProjectType(projectType);
      
      // Load configuration
      const semesterConfig = getSemesterConfig(semester, degree, projectType);
      setConfig(semesterConfig);
    }
  }, [roleData]);

  // Load project data based on current semester
  const loadProject = async () => {
    if (!currentSemester || !config) return;
    
    setLoading(true);
    try {
      // Generic API call - works for any semester
      const response = await studentAPI.getProjects({
        semester: currentSemester,
        projectType: currentProjectType
      });
      
      setProject(response.data?.project || null);
      
      // Load group if semester supports groups
      if (config.features.supportsGroups) {
        await loadGroup();
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load group data
  const loadGroup = async () => {
    if (!currentSemester) return;
    
    try {
      const response = await studentAPI.getGroups({
        semester: currentSemester
      });
      
      setGroup(response.data?.group || null);
    } catch (error) {
      console.error('Failed to load group:', error);
    }
  };

  // Register project (works for any semester)
  const registerProject = async (projectData) => {
    if (!config) throw new Error('Semester configuration not loaded');
    
    try {
      const response = await studentAPI.registerProject({
        ...projectData,
        semester: currentSemester,
        projectType: currentProjectType
      });
      
      setProject(response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Group management (only if semester supports groups)
  const createGroup = async (groupData) => {
    if (!config?.features.supportsGroups) {
      throw new Error('Groups not supported for this semester');
    }
    
    try {
      const response = await studentAPI.createGroup({
        ...groupData,
        semester: currentSemester
      });
      
      setGroup(response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Initialize on mount
  useEffect(() => {
    if (config && userRole === 'student') {
      loadProject();
    }
  }, [config, currentSemester]);

  const value = {
    // Configuration
    semester: currentSemester,
    projectType: currentProjectType,
    config,
    
    // State
    project,
    group,
    loading,
    
    // Actions (semester-agnostic)
    registerProject,
    createGroup,
    loadProject,
    loadGroup,
    
    // Feature flags (from config)
    supportsGroups: config?.features.supportsGroups || false,
    supportsFacultyAllocation: config?.features.supportsFacultyAllocation || false,
    supportsPPTUpload: config?.features.supportsPPTUpload || false,
    isSolo: config?.features.isSolo || false,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
```

---

### Phase 3: Unified Hooks

#### 3.1 Replace useSem4Project & useSem5Project with useProject
**File:** `frontend/src/hooks/useProject.js`

```javascript
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';

/**
 * Unified project hook - works for all semesters
 */
export const useProject = () => {
  const {
    semester,
    projectType,
    config,
    project,
    group,
    loading,
    supportsGroups,
    supportsFacultyAllocation,
    supportsPPTUpload,
    isSolo,
    registerProject,
    createGroup,
    loadProject
  } = useProject();
  
  const { user, roleData } = useAuth();

  // Check if student can register
  const canRegister = () => {
    if (!config || !user) return false;
    
    // Check semester eligibility
    if (roleData?.semester !== semester) return false;
    
    // Check if already has project
    if (project) return false;
    
    return true;
  };

  // Check if can upload PPT (Sem 4 specific feature)
  const canUploadPPT = () => {
    return supportsPPTUpload && 
           project && 
           (project.status === 'registered' || project.status === 'active');
  };

  // Get project timeline (works for all semesters)
  const getProjectTimeline = () => {
    if (!project || !config) return [];

    const steps = [
      {
        title: 'Project Registration',
        description: `Register your ${config.labels.projectName}`,
        status: project.status === 'registered' ? 'completed' : 'pending',
        date: project.createdAt
      }
    ];

    // Add group step if semester supports groups
    if (supportsGroups) {
      steps.push({
        title: 'Group Formation',
        description: 'Form or join a group',
        status: group ? 'completed' : 'pending',
        date: group?.createdAt
      });

      // Add faculty allocation step
      if (supportsFacultyAllocation) {
        steps.push({
          title: 'Faculty Allocation',
          description: 'Submit faculty preferences',
          status: project.faculty ? 'completed' : 'pending',
          date: project.faculty ? project.updatedAt : null
        });
      }
    }

    // Add PPT upload step (Sem 4)
    if (supportsPPTUpload) {
      steps.push({
        title: 'PPT Submission',
        description: 'Upload presentation',
        status: project.deliverables?.some(d => d.submitted) ? 'completed' : 'pending'
      });
    }

    return steps;
  };

  // Get progress steps
  const getProgressSteps = () => {
    // Generic progress calculation based on config
    const allSteps = [];
    
    if (supportsGroups) {
      allSteps.push('register', 'group', 'faculty', 'active');
    } else {
      allSteps.push('register', 'active');
    }
    
    if (supportsPPTUpload) {
      allSteps.splice(allSteps.length - 1, 0, 'ppt');
    }
    
    return allSteps;
  };

  return {
    // State
    semester,
    projectType,
    project,
    group,
    config,
    loading,
    
    // Feature flags
    supportsGroups,
    supportsFacultyAllocation,
    supportsPPTUpload,
    isSolo,
    
    // Permissions
    canRegister: canRegister(),
    canUploadPPT: canUploadPPT(),
    
    // Data
    getProjectTimeline,
    getProgressSteps,
    
    // Actions
    registerProject,
    createGroup,
    loadProject
  };
};
```

---

#### 3.2 Unified Group Management Hook
**File:** `frontend/src/hooks/useGroupManagement.js` (Updated)

```javascript
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';

/**
 * Unified group management hook - works for any semester that supports groups
 */
export const useGroupManagement = () => {
  const {
    semester,
    group,
    config,
    supportsGroups,
    createGroup: createGroupAction,
    loadGroup
  } = useProject();
  
  const { roleData } = useAuth();

  // Only allow group operations if semester supports groups
  if (!supportsGroups || !config?.features.supportsGroups) {
    return {
      supportsGroups: false,
      error: 'Groups not supported for this semester'
    };
  }

  const groupSize = config.features.groupSize || { min: 4, max: 5 };

  // Check if can create group
  const canCreateGroup = () => {
    return !group && semester === roleData?.semester;
  };

  // Check if is group leader
  const isGroupLeader = () => {
    return group && 
           group.leader && 
           (group.leader._id === roleData?._id || 
            group.leader === roleData?._id);
  };

  // Get available slots
  const getAvailableSlots = () => {
    if (!group) return groupSize.max;
    const currentMembers = group.members?.length || 0;
    return Math.max(0, groupSize.max - currentMembers);
  };

  return {
    // State
    semester,
    group,
    groupSize,
    supportsGroups: true,
    
    // Permissions
    canCreateGroup: canCreateGroup(),
    isGroupLeader: isGroupLeader(),
    getAvailableSlots,
    
    // Actions
    createGroup: createGroupAction,
    loadGroup
  };
};
```

---

### Phase 4: Generalized Components

#### 4.1 Unified Project Dashboard
**File:** `frontend/src/pages/student/ProjectDashboard.jsx`

```javascript
import { useParams } from 'react-router-dom';
import { useProject } from '../../hooks/useProject';
import { useGroupManagement } from '../../hooks/useGroupManagement';

/**
 * Unified project dashboard - works for all semesters
 */
const ProjectDashboard = () => {
  const { semester, projectId } = useParams();
  const {
    project,
    config,
    supportsGroups,
    supportsPPTUpload,
    canRegister,
    getProjectTimeline,
    registerProject
  } = useProject();
  
  const {
    group,
    canCreateGroup,
    isGroupLeader
  } = useGroupManagement();

  if (!config) {
    return <div>Loading semester configuration...</div>;
  }

  return (
    <div>
      <h1>{config.labels.dashboardTitle}</h1>
      
      {/* Project Registration Section */}
      {!project && canRegister && (
        <RegistrationSection
          semester={semester}
          projectType={config.projectTypes[0]}
          onSubmit={registerProject}
        />
      )}

      {/* Group Section (only if semester supports groups) */}
      {supportsGroups && (
        <GroupSection
          group={group}
          canCreate={canCreateGroup}
          isLeader={isGroupLeader}
          semester={semester}
        />
      )}

      {/* PPT Upload Section (only Sem 4) */}
      {supportsPPTUpload && project && (
        <PPTUploadSection project={project} />
      )}

      {/* Timeline */}
      <Timeline steps={getProjectTimeline()} />
    </div>
  );
};
```

---

#### 4.2 Unified Group Dashboard
**File:** `frontend/src/pages/student/GroupDashboard.jsx`

```javascript
import { useParams } from 'react-router-dom';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { useProject } from '../../hooks/useProject';

/**
 * Unified group dashboard - works for any semester that supports groups
 */
const GroupDashboard = () => {
  const { semester, groupId } = useParams();
  const { group, config, project } = useProject();
  const {
    isGroupLeader,
    canInviteMembers,
    getAvailableSlots
  } = useGroupManagement();

  if (!config?.features.supportsGroups) {
    return <div>Groups not supported for semester {semester}</div>;
  }

  return (
    <div>
      <h1>Group Dashboard - {config.labels.projectName}</h1>
      
      {/* Group Info */}
      <GroupInfo group={group} />
      
      {/* Members List */}
      <MembersList 
        members={group?.members || []}
        isLeader={isGroupLeader}
      />
      
      {/* Invitation Section */}
      {isGroupLeader && canInviteMembers && (
        <InvitationSection
          groupId={groupId}
          availableSlots={getAvailableSlots()}
        />
      )}
      
      {/* Faculty Allocation (if applicable) */}
      {config.features.supportsFacultyAllocation && (
        <FacultyAllocationSection
          project={project}
          group={group}
        />
      )}
      
      {/* Chat (always available) */}
      {project && (
        <ProjectChat projectId={project._id} />
      )}
    </div>
  );
};
```

---

### Phase 5: Dynamic Routes

#### 5.1 Update App.jsx Routes
**File:** `frontend/src/App.jsx`

```javascript
// ❌ OLD: Hardcoded routes
<Route path="/student/projects/sem4/:projectId" element={<Sem4ProjectDashboard />} />
<Route path="/student/sem5/register" element={<MinorProject2Registration />} />

// ✅ NEW: Dynamic routes
<Route path="/student/projects/:semester/:projectId" element={<ProjectDashboard />} />
<Route path="/student/projects/:semester/register" element={<ProjectRegistration />} />
<Route path="/student/groups/:semester/:groupId/dashboard" element={<GroupDashboard />} />
<Route path="/faculty/groups/:semester/allocation" element={<GroupAllocation />} />
```

---

### Phase 6: Backend Generalization

#### 6.1 Generalized Controllers
**File:** `backend/controllers/projectController.js`

```javascript
const { getSemesterConfig } = require('../utils/semesterConfig');

// Generic project registration (works for all semesters)
const registerProject = async (req, res) => {
  try {
    const { semester, projectType, ...projectData } = req.body;
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    
    // Get semester configuration
    const config = getSemesterConfig(
      semester || student.semester,
      student.degree,
      projectType
    );
    
    // Validate project type
    if (!config.isValidProjectType(projectType)) {
      return res.status(400).json({
        success: false,
        message: `Project type '${projectType}' not available for semester ${semester}`
      });
    }
    
    // Check group requirement
    if (config.features.supportsGroups && !projectData.groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group is required for this project type'
      });
    }
    
    // Create project (generic logic)
    const project = new Project({
      ...projectData,
      semester,
      projectType,
      student: student._id,
      status: 'registered'
    });
    
    await project.save();
    
    res.json({
      success: true,
      data: project,
      config: config.features // Return available features
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

## 📋 Migration Checklist

### Backend
- [ ] Create `backend/utils/semesterConfig.js`
- [ ] Update `studentController.js` to use config
- [ ] Update `facultyController.js` to use config
- [ ] Update `adminController.js` to use config
- [ ] Remove hardcoded semester checks
- [ ] Update routes to accept semester as parameter

### Frontend
- [ ] Create `frontend/src/utils/semesterConfig.js`
- [ ] Create unified `ProjectContext.jsx`
- [ ] Create unified `useProject.js` hook
- [ ] Update `useGroupManagement.js` to be generic
- [ ] Create unified `ProjectDashboard.jsx`
- [ ] Create unified `GroupDashboard.jsx`
- [ ] Update routes in `App.jsx` to be dynamic
- [ ] Remove `Sem4Context.jsx` and `Sem5Context.jsx`
- [ ] Remove `useSem4Project.js` and `useSem5Project.js`
- [ ] Update all components to use new hooks

### Testing
- [ ] Test Sem 4 workflow (solo project)
- [ ] Test Sem 5 workflow (group project)
- [ ] Test Sem 6 workflow (continuation)
- [ ] Test Sem 7 workflow (major/internship)
- [ ] Test M.Tech workflows

---

## 🎨 Benefits

### 1. **Code Reusability**
- ✅ Single codebase for all semesters
- ✅ No duplicate logic
- ✅ Easy to add new semesters

### 2. **Maintainability**
- ✅ Changes in one place affect all semesters
- ✅ Easier to fix bugs
- ✅ Consistent behavior across semesters

### 3. **Flexibility**
- ✅ Easy to add new features
- ✅ Easy to modify semester requirements
- ✅ Configuration-driven, not hardcoded

### 4. **Scalability**
- ✅ Adding new semesters = adding config entry
- ✅ No code changes needed for new semesters
- ✅ Support for future requirements

---

## 🚀 Implementation Strategy

### Step 1: Create Configuration System (Week 1)
- Backend config module
- Frontend config module
- Test configuration loading

### Step 2: Create Unified Context (Week 2)
- ProjectContext.jsx
- Migrate from Sem4Context/Sem5Context
- Test context functionality

### Step 3: Create Unified Hooks (Week 3)
- useProject.js
- Update useGroupManagement.js
- Test all hooks

### Step 4: Create Unified Components (Week 4)
- ProjectDashboard.jsx
- GroupDashboard.jsx
- Update existing components

### Step 5: Update Routes & Test (Week 5)
- Dynamic routes
- Comprehensive testing
- Bug fixes

---

## 📝 Example: Adding Sem 6 Support

**Before (Hardcoded):**
```javascript
// ❌ Need to create new context, hooks, components
Sem6Context.jsx
useSem6Project.js
Sem6ProjectDashboard.jsx
```

**After (Configuration-Based):**
```javascript
// ✅ Just add config entry
const configs = {
  6: {
    projectTypes: ['minor3'],
    features: {
      supportsGroups: true,
      supportsProjectContinuation: true,
      // ... other features
    }
  }
};

// Existing code automatically works!
```

---

## ✅ Success Criteria

1. ✅ All semesters (4-8) work with same codebase
2. ✅ M.Tech semesters (1-4) work with same codebase
3. ✅ No hardcoded semester checks
4. ✅ Single context, hooks, components
5. ✅ Easy to add new semesters (just config)
6. ✅ All existing features work
7. ✅ No regression in functionality

---

**This refactoring will make the codebase much more maintainable and scalable!** 🎉

