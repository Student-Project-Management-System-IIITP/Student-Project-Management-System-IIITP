# SPMS Directory Structure

## 📁 Complete Project Structure

```
SPMS@IIITP/
├── 📁 frontend/                    # React Vite Frontend
│   ├── 📁 public/                 # Static assets
│   │   ├── favicon.svg
│   │   └── IIIT Pune Logo New.png
│   ├── 📁 src/                    # Source code
│   │   ├── 📁 components/         # Reusable components
│   │   │   ├── 📁 common/         # Common components
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── LoadingSpinner.jsx
│   │   │   ├── 📁 forms/          # Form components
│   │   │   │   ├── LoginForm.jsx
│   │   │   │   ├── RegistrationForm.jsx
│   │   │   │   └── ProjectForm.jsx
│   │   │   ├── 📁 cards/          # Card components
│   │   │   │   ├── ProjectCard.jsx
│   │   │   │   ├── GroupCard.jsx
│   │   │   │   └── NotificationCard.jsx
│   │   │   └── 📁 modals/         # Modal components
│   │   │       ├── ConfirmModal.jsx
│   │   │       └── ProjectModal.jsx
│   │   ├── 📁 pages/              # Page components
│   │   │   ├── 📁 auth/           # Authentication pages
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   └── ForgotPassword.jsx
│   │   │   ├── 📁 student/        # Student pages
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Profile.jsx
│   │   │   │   ├── Projects.jsx
│   │   │   │   └── Groups.jsx
│   │   │   ├── 📁 faculty/        # Faculty pages
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Groups.jsx
│   │   │   │   └── Allocations.jsx
│   │   │   ├── 📁 admin/          # Admin pages
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Users.jsx
│   │   │   │   ├── Projects.jsx
│   │   │   │   └── Reports.jsx
│   │   │   ├── Home.jsx           # Landing page
│   │   │   └── NotFound.jsx       # 404 page
│   │   ├── 📁 hooks/              # Custom React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useApi.js
│   │   │   └── useLocalStorage.js
│   │   ├── 📁 context/            # React Context
│   │   │   ├── AuthContext.jsx
│   │   │   ├── ProjectContext.jsx
│   │   │   └── NotificationContext.jsx
│   │   ├── 📁 services/           # API services
│   │   │   ├── api.js
│   │   │   ├── authService.js
│   │   │   ├── projectService.js
│   │   │   └── userService.js
│   │   ├── 📁 utils/              # Utility functions
│   │   │   ├── constants.js
│   │   │   ├── helpers.js
│   │   │   └── validators.js
│   │   ├── 📁 assets/             # Static assets
│   │   │   ├── 📁 images/
│   │   │   └── 📁 icons/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .gitignore
├── 📁 backend/                     # Node.js Express Backend
│   ├── 📁 config/                 # Configuration files
│   │   ├── database.js
│   │   └── constants.js
│   ├── 📁 controllers/             # Route controllers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── projectController.js
│   │   ├── groupController.js
│   │   ├── facultyController.js
│   │   └── adminController.js
│   ├── 📁 models/                  # Database models
│   │   ├── User.js
│   │   ├── Student.js
│   │   ├── Faculty.js
│   │   ├── Project.js
│   │   ├── Group.js
│   │   └── Internship.js
│   ├── 📁 routes/                  # API routes
│   │   ├── 📁 api/                 # API routes
│   │   │   ├── students.js
│   │   │   ├── faculty.js
│   │   │   ├── projects.js
│   │   │   └── groups.js
│   │   ├── 📁 auth/                # Authentication routes
│   │   │   ├── login.js
│   │   │   ├── register.js
│   │   │   └── logout.js
│   │   ├── 📁 admin/               # Admin routes
│   │   │   ├── users.js
│   │   │   ├── projects.js
│   │   │   └── reports.js
│   │   └── index.js
│   ├── 📁 middleware/              # Custom middleware
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── errorHandler.js
│   │   └── notFound.js
│   ├── 📁 utils/                   # Utility functions
│   │   ├── response.js
│   │   ├── validators.js
│   │   └── helpers.js
│   ├── 📁 uploads/                  # File uploads
│   │   ├── 📁 documents/
│   │   ├── 📁 certificates/
│   │   └── 📁 reports/
│   ├── server.js
│   ├── package.json
│   ├── .env
│   └── .gitignore
├── 📁 shared/                      # Shared utilities
│   ├── 📁 constants/               # Shared constants
│   │   ├── projectTypes.js
│   │   ├── userRoles.js
│   │   └── statusCodes.js
│   ├── 📁 types/                   # TypeScript types (if needed)
│   └── 📁 schemas/                 # Shared schemas
├── 📁 docs/                        # Documentation
│   ├── API.md
│   ├── DATABASE_SCHEMA.md
│   ├── DIRECTORY_STRUCTURE.md
│   └── SETUP.md
├── README.md
└── .gitignore
```

## 🎯 Directory Purposes

### **Frontend Structure:**
- **components/**: Reusable UI components
- **pages/**: Full page components
- **hooks/**: Custom React hooks
- **context/**: React Context for state management
- **services/**: API communication
- **utils/**: Helper functions and constants

### **Backend Structure:**
- **config/**: Database and app configuration
- **controllers/**: Business logic for routes
- **models/**: Database models and schemas
- **routes/**: API endpoint definitions
- **middleware/**: Custom middleware functions
- **utils/**: Server-side utility functions

### **Shared Structure:**
- **constants/**: Shared constants between frontend/backend
- **types/**: TypeScript type definitions
- **schemas/**: Shared validation schemas

## 📋 Next Steps:
1. Create all missing directories
2. Set up basic component structure
3. Implement authentication system
4. Build core features step by step
