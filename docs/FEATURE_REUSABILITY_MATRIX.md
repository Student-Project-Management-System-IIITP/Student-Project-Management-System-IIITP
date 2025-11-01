# Feature Reusability Matrix
## Mapping Features Across Semesters

This document shows which features can be reused across different semesters.

---

## 📊 Feature-Semester Matrix

| Feature | Sem 4 | Sem 5 | Sem 6 | Sem 7 | Sem 8 | M.Tech 1 | M.Tech 2 | M.Tech 3 | M.Tech 4 |
|---------|:-----:|:-----:|:-----:|:-----:|:-----:|:--------:|:--------:|:--------:|:--------:|
| **Project Registration** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Project Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Project Details Page** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Chat System** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **File Uploads** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Group Formation** | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅* | ✅* |
| **Group Dashboard** | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅* | ✅* |
| **Group Invitations** | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅* | ✅* |
| **Faculty Allocation** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️** | ✅ | ✅ |
| **Faculty Preferences** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌** | ✅ | ✅ |
| **PPT Upload** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Presentation Scheduling** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Project Continuation** | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Internship Management** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Evaluation System** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend:**
- ✅ = Fully Reusable
- ❌ = Not Applicable
- ⚠️ = Partially Reusable (Modified)
- * = Individual projects (no groups for M.Tech)
- ** = Uses same faculty as previous semester

---

## 🔄 Reusable Feature Groups

### Group 1: Core Project Features (100% Reusable)
**Used by:** All semesters

**Components:**
- `ProjectRegistration.jsx` - Generic registration form
- `ProjectDashboard.jsx` - Generic dashboard
- `ProjectDetails.jsx` - Generic details page
- `ProjectCard.jsx` - Project display card
- `StatusBadge.jsx` - Status indicator

**Hooks:**
- `useProject.js` - Project management
- `useFileUpload.js` - File uploads

**Context:**
- `ProjectContext.jsx` - Project state management

**API:**
- `POST /projects` - Register project
- `GET /projects/:id` - Get project
- `PUT /projects/:id` - Update project

---

### Group 2: Chat Features (100% Reusable)
**Used by:** All semesters (all projects have chat)

**Components:**
- `ProjectChat.jsx` - Chat interface
- `MessageBubble.jsx` - Message display
- `EmojiPicker.jsx` - Reactions
- `MessageSearch.jsx` - Search functionality

**Hooks:**
- `useWebSocket.js` - Real-time connection
- `useChat.js` - Chat management

**API:**
- `GET /projects/:id/messages` - Get messages
- `POST /projects/:id/messages` - Send message
- `PUT /projects/:id/messages/:msgId` - Edit message
- `POST /projects/:id/messages/:msgId/reactions` - Add reaction

**Reusability:** ✅ Works exactly the same for all semesters

---

### Group 3: Group Management Features (Reusable for Sem 5+)
**Used by:** Sem 5, 6, 7, 8 (B.Tech) | Sem 3, 4 (M.Tech - Individual)

**Components:**
- `GroupFormation.jsx` - Create/join groups
- `GroupDashboard.jsx` - Group management
- `GroupMemberList.jsx` - Members display
- `GroupInvitations.jsx` - Invitation management
- `InvitationCard.jsx` - Invitation display

**Hooks:**
- `useGroupManagement.js` - Group operations
- `useGroupInvitations.js` - Invitation handling

**API:**
- `POST /groups` - Create group
- `GET /groups` - Get groups
- `POST /groups/:id/invite` - Send invitations
- `POST /groups/:id/invite/:inviteId/accept` - Accept invitation

**Reusability:** ✅ Works for all group-supported semesters

---

### Group 4: Faculty Allocation Features (Reusable for Sem 5+)
**Used by:** Sem 5, 6, 7, 8 (B.Tech) | Sem 1, 3, 4 (M.Tech)

**Components:**
- `FacultyPreferences.jsx` - Submit preferences
- `FacultySelector.jsx` - Select faculty
- `AllocationStatus.jsx` - Track allocation
- `ChoosePassButtons.jsx` - Faculty decision

**Hooks:**
- `useFacultyAllocation.js` - Allocation tracking
- `useFacultyPreferences.js` - Preference management

**API:**
- `POST /projects/:id/faculty-preferences` - Submit preferences
- `GET /faculty/groups/unallocated` - Get unallocated
- `POST /faculty/groups/:id/choose` - Choose group
- `POST /faculty/groups/:id/pass` - Pass group

**Reusability:** ✅ Same logic, different UI labels

---

### Group 5: Sem 4 Specific Features (Not Reusable)
**Used by:** Only Sem 4

**Components:**
- `PPTUploadForm.jsx` - PPT upload
- `PresentationScheduling.jsx` - Schedule presentation
- `EvaluationScheduleCard.jsx` - Display schedule

**Features:**
- PPT file upload with versioning
- Presentation date/venue scheduling
- Panel member assignment

**Reusability:** ❌ Sem 4 specific, not used elsewhere

---

### Group 6: Project Continuation Features (Reusable for Sem 6, 8)
**Used by:** Sem 6, 8 (B.Tech) | Sem 2, 4 (M.Tech)

**Components:**
- `ProjectContinuation.jsx` - Continue previous project
- `PreviousProjectSelector.jsx` - Select project to continue
- `ContinuationHistory.jsx` - Project lineage

**API:**
- `GET /projects/continuation` - Get continuable projects
- `POST /projects/:id/continue` - Continue project

**Reusability:** ✅ Same logic, just enable/disable via config

---

### Group 7: Internship Features (Reusable for Sem 7, 8)
**Used by:** Sem 7, 8 (B.Tech) | Sem 3, 4 (M.Tech)

**Components:**
- `InternshipApplication.jsx` - Apply for internship
- `InternshipForm.jsx` - Internship details
- `InternshipDashboard.jsx` - Internship tracking

**API:**
- `POST /internships/apply` - Apply for internship
- `GET /internships` - Get internships
- `PUT /internships/:id` - Update internship

**Reusability:** ✅ Same across all internship semesters

---

## 🎯 Reusability Patterns

### Pattern 1: Fully Reusable (No Changes Needed)
```javascript
// ✅ These work identically across semesters
- Chat system
- File uploads
- Project registration form
- Project dashboard layout
- Status badges
- Progress timelines
```

### Pattern 2: Config-Based Reusability (Toggle via Config)
```javascript
// ✅ Enable/disable via semester config
const config = getSemesterConfig(semester, degree, projectType);

if (config.features.supportsGroups) {
  // Show group features
}

if (config.features.supportsFacultyAllocation) {
  // Show allocation features
}

if (config.features.supportsPPTUpload) {
  // Show PPT upload (Sem 4 only)
}
```

### Pattern 3: Conditional Rendering (Same Component, Different Content)
```javascript
// ✅ Same component, different labels/content
<ProjectDashboard>
  <h1>{config.labels.projectName}</h1>
  {config.features.supportsGroups && <GroupSection />}
  {config.features.supportsPPTUpload && <PPTUploadSection />}
</ProjectDashboard>
```

---

## 📦 Component Reusability Breakdown

### Highly Reusable (90-100%)
1. **Chat System** - 100% identical
2. **Project Dashboard** - 90% identical (different labels)
3. **Project Details** - 95% identical
4. **File Upload** - 100% identical
5. **Status Badges** - 100% identical

### Moderately Reusable (50-90%)
1. **Group Management** - 90% identical (size limits vary)
2. **Faculty Allocation** - 85% identical (preference limits vary)
3. **Project Registration** - 80% identical (fields vary)
4. **Evaluation System** - 75% identical (criteria vary)

### Low Reusability (0-50%)
1. **PPT Upload** - 0% (Sem 4 only)
2. **Presentation Scheduling** - 0% (Sem 4 only)
3. **Project Continuation** - 50% (Sem 6, 8 only)

---

## 🔧 Refactoring Priority

### High Priority (High Reusability)
1. ✅ **Chat System** - Already reusable, no changes needed
2. 🔄 **Project Dashboard** - Make semester-agnostic
3. 🔄 **Group Management** - Generalize for all semesters
4. 🔄 **Faculty Allocation** - Make config-based

### Medium Priority (Moderate Reusability)
1. 🔄 **Project Registration** - Make dynamic based on semester
2. 🔄 **File Upload** - Already generic, ensure it's used everywhere
3. 🔄 **Evaluation System** - Make criteria configurable

### Low Priority (Low Reusability)
1. ⚠️ **PPT Upload** - Keep as Sem 4 specific, but use same upload component
2. ⚠️ **Presentation Scheduling** - Keep as Sem 4 specific
3. 🔄 **Project Continuation** - Make config-based for Sem 6, 8

---

## 💡 Key Insights

### What Makes Features Reusable?

1. **No Semester-Specific Logic**
   - ✅ Chat: No semester checks
   - ✅ File upload: Generic file handling
   - ❌ PPT Upload: Hardcoded for Sem 4

2. **Configuration-Driven**
   - ✅ Group size: From config
   - ✅ Faculty preferences: From config
   - ❌ PPT: Hardcoded check

3. **Component Composition**
   - ✅ Dashboard: Composed of smaller components
   - ✅ Project details: Reusable sections
   - ❌ Sem 4 dashboard: Monolithic

### What Prevents Reusability?

1. **Hardcoded Checks**
   ```javascript
   // ❌ BAD
   if (semester === 4) { /* Sem 4 logic */ }
   
   // ✅ GOOD
   if (config.features.supportsPPTUpload) { /* PPT logic */ }
   ```

2. **Semester-Specific Components**
   ```javascript
   // ❌ BAD
   Sem4ProjectDashboard.jsx
   Sem5ProjectDashboard.jsx
   
   // ✅ GOOD
   ProjectDashboard.jsx (works for all)
   ```

3. **Separate Contexts/Hooks**
   ```javascript
   // ❌ BAD
   Sem4Context, Sem5Context
   useSem4Project, useSem5Project
   
   // ✅ GOOD
   ProjectContext (unified)
   useProject (unified)
   ```

---

## 🎯 Target Architecture

### Before (Current)
```
Sem4Context → Sem4Dashboard → Sem4Features
Sem5Context → Sem5Dashboard → Sem5Features
Sem6Context → ??? (Doesn't exist yet)
```

### After (Refactored)
```
ProjectContext → ProjectDashboard → Features (config-based)
                    ↓
        ┌───────────┼───────────┐
        ↓           ↓           ↓
    Sem4Config  Sem5Config  Sem6Config
        ↓           ↓           ↓
    Features    Features    Features
```

---

## ✅ Implementation Checklist

- [x] Identify reusable features
- [x] Create reusability matrix
- [ ] Create configuration system
- [ ] Unify contexts
- [ ] Unify hooks
- [ ] Generalize components
- [ ] Update routes
- [ ] Test all semesters
- [ ] Document changes

---

**Result:** Single codebase that works for all semesters with minimal duplication! 🚀

