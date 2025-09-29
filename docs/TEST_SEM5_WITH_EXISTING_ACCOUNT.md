# 🧪 **Testing Sem 5 Group Formation with Existing Account**

## 🔧 **Method 1: Quick Test - Update Database**

To test Sem 5 with your existing student account:

### **Backend Database Update:**
```bash
# In backend directory, connect to MongoDB:
cd backend
# Update your student record to semester 5:
```

**Via MongoDB Compass or Command Line:**
```javascript
// Connect to your local MongoDB instance
use spms_development // or your database name

// Find your student record
db.students.findOne({ collegeEmail: "your-email@iiitp.ac.in" })

// Update semester to 5 for testing
db.students.updateOne(
  { collegeEmail: "your-email@iiitp.ac.in" },
  { $set: { semester: 5 } }
)
```

### **🚀 Alternative: Test via Admin Panel**
If you have admin access:
1. Login as admin
2. Go to Student Management  
3. Find your student record
4. Update semester to 5
5. Save and refresh

---

## 🎯 **Method 2: Create Test Account (Simulated Semester 5)**

### **Quick Test Account Creation:**
Go to: `http://localhost:3000/signup`
Create account with:
- Email: `test.student@iiitp.ac.in` 
- Semester: **5**
- Degree: **B.Tech**
- Branch: **Computer Science**
- Full Name: **Test Student Sem5**

---

## 🔍 **Method 3: Direct Frontend Test (Bypass Semester Check)**

For immediate testing, you can temporarily modify the Dashboard.jsx:
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
read_file
