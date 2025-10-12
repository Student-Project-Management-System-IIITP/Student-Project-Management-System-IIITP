# Database Schema Quick Reference

## 📊 Collections Overview

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| users | Authentication | email, password, role |
| students | Student profiles | misNumber, semester, groupId |
| faculty | Faculty profiles | facultyId, department |
| projects | Project tracking | title, status, faculty |
| groups | Group management | members, status, leader |
| messages | Chat messages | project, sender, message |
| systemconfigs | System settings | key, value, category |

---

## 🔐 User Model

```javascript
{
  email: String (unique),
  password: String (hashed),
  role: 'student' | 'faculty' | 'admin',
  isActive: Boolean,
  lastLogin: Date
}
```

---

## 👨‍🎓 Student Model

```javascript
{
  user: ObjectId → User,
  fullName: String,
  misNumber: String (9 digits, unique),
  semester: Number (1-8),
  branch: 'CSE' | 'ECE',
  
  currentProjects: [{
    project: ObjectId → Project,
    role: 'leader' | 'member' | 'solo',
    status: 'active' | 'completed'
  }],
  
  groupId: ObjectId → Group,
  groupMemberships: [{ group, role, isActive }],
  invites: [{ group, status, invitedBy }],
  
  semesterStatus: {
    canFormGroups: Boolean,
    canJoinProjects: Boolean,
    isDoingInternship: Boolean
  }
}
```

---

## 👨‍🏫 Faculty Model

```javascript
{
  user: ObjectId → User,
  fullName: String,
  facultyId: String (FAC###),
  department: 'CSE' | 'ECE' | 'ASH',
  designation: String,
  mode: 'Regular' | 'Adjunct' | 'On Lien'
}
```

---

## 📁 Project Model

```javascript
{
  title: String,
  projectType: 'minor1' | 'minor2' | 'minor3' | 'major1' | 'major2',
  
  student: ObjectId → Student,
  group: ObjectId → Group,
  faculty: ObjectId → Faculty,
  
  semester: Number (1-8),
  status: 'registered' | 'faculty_allocated' | 'active' | 'completed',
  
  facultyPreferences: [{ faculty, priority }],
  currentFacultyIndex: Number,
  
  deliverables: [{
    name: String,
    submitted: Boolean,
    filePath: String,
    fileType: 'ppt' | 'pdf' | 'doc'
  }]
}
```

---

## 👥 Group Model

```javascript
{
  name: String,
  semester: Number,
  
  members: [{
    student: ObjectId → Student,
    role: 'leader' | 'member',
    isActive: Boolean
  }],
  
  invites: [{
    student: ObjectId → Student,
    status: 'pending' | 'accepted' | 'rejected',
    invitedBy: ObjectId → Student
  }],
  
  leader: ObjectId → Student,
  status: 'open' | 'finalized' | 'disbanded',
  allocatedFaculty: ObjectId → Faculty,
  
  maxMembers: Number (default: 5),
  minMembers: Number (default: 4)
}
```

---

## 💬 Message Model

```javascript
{
  project: ObjectId → Project,
  sender: ObjectId → User,
  senderModel: 'Student' | 'Faculty',
  senderName: String,
  message: String (max: 2000),
  isRead: Boolean,
  createdAt: Date
}
```

**Indexes:** `{ project: 1, createdAt: -1 }`

---

## ⚙️ SystemConfig Model

```javascript
{
  key: String (unique),
  value: Mixed,
  category: 'sem4' | 'sem5' | 'general',
  isEditable: Boolean
}
```

---

## 🔗 Key Relationships

```
User ──> Student ──> Projects
                 ──> Groups ──> Faculty (allocated)
                 
Project ──> Messages
        ──> Group
        ──> Faculty

Group ──> Members (Students)
      ──> Invites
```

---

**Last Updated:** 2025-10-10
