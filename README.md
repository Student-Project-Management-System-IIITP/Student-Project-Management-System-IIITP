# SPMS - Student Project Management System

## 🎯 **Project Overview**

SPMS (Student Project Management System) is a comprehensive web application designed to automate and streamline the project management process at IIIT Pune. The system handles complex workflows for students, faculty, and administrators across different semesters and project types.

## 👥 **User Roles**

### **Students (B.Tech & M.Tech)**
- Project registration and tracking
- Group formation and management
- Faculty preference selection
- Internship document submission
- Profile management

### **Faculty**
- Group allocation management
- Project supervision
- Student evaluation
- Workload tracking
- Profile management

### **Admin**
- User management (create, update, delete)
- Project management
- Allocation overrides
- System configuration
- Reports and analytics

## 🏗️ **Project Structure**

```
SPMS@IIITP/
├── 📁 frontend/          # React Vite Frontend
├── 📁 backend/           # Node.js Express Backend
├── 📁 shared/            # Shared utilities
├── 📁 docs/              # Documentation
└── README.md
```

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js (v20.19+ or v22.12+)
- MongoDB Atlas account
- Git

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/Student-Project-Management-System-IIITP/Student-Project-Management-System-IIITP.git
   cd SPMS@IIITP
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Update .env with your MongoDB credentials
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### **Environment Variables**

Create a `.env` file in the backend directory:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=SPMS

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

## 📚 **Documentation**

- [Directory Structure](docs/DIRECTORY_STRUCTURE.md) - Complete project structure
- [User-Specific Structure](docs/USER_SPECIFIC_STRUCTURE.md) - User-specific features and workflows

## 🛠️ **Tech Stack**

### **Frontend**
- React 18
- Vite
- Tailwind CSS
- JavaScript

### **Backend**
- Node.js
- Express.js
- MongoDB
- JWT Authentication

### **Database**
- MongoDB Atlas
- Mongoose ODM

## 🔐 **Security Features**

- Role-based authentication
- JWT token-based authorization
- Environment variable protection
- CORS configuration
- Input validation

## 📋 **Features**

### **Student Features**
- Project registration for different semesters
- Group formation and management
- Faculty preference selection
- Internship document submission
- Project progress tracking

### **Faculty Features**
- Group allocation management
- Project supervision
- Student evaluation
- Workload management

### **Admin Features**
- User management
- Project management
- Allocation overrides
- System configuration
- Reports and analytics

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 **License**

This project is licensed under the MIT License.

## 📞 **Contact**

For questions or support, please contact the development team.

---

**SPMS - Streamlining Project Management at IIIT Pune** 🎓
