const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Signup Student
const signupStudent = async (req, res) => {
  try {
    const { 
      fullName, 
      degree, 
      semester, 
      misNumber, 
      collegeEmail, 
      contactNumber, 
      branch,
      password, 
      confirmPassword 
    } = req.body;

    // Validate required fields
    if (!fullName || !degree || !semester || !misNumber || !collegeEmail || !contactNumber || !branch || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Check if user already exists with college email
    const existingUser = await User.findOne({ email: collegeEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this college email already exists'
      });
    }

    // Check if MIS number already exists
    const existingStudent = await Student.findOne({ misNumber });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Student with this MIS number already exists'
      });
    }

    // Create user with college email (password will be hashed by pre-save hook)
    const user = new User({
      email: collegeEmail,
      password: password,
      name: fullName,
      phone: contactNumber,
      role: 'student'
    });

    await user.save();

    // Create student profile
    const student = new Student({
      user: user._id,
      fullName,
      degree,
      semester,
      misNumber,
      collegeEmail,
      contactNumber,
      branch
    });

    await student.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: {
        user: user.toSafeObject(),
        student: student,
        token
      }
    });

  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Signup Faculty
const signupFaculty = async (req, res) => {
  try {
    const { 
      fullName, 
      department, 
      mode, 
      designation, 
      collegeEmail, 
      contactNumber, 
      password, 
      confirmPassword 
    } = req.body;

    // Validate required fields
    if (!fullName || !department || !mode || !designation || !collegeEmail || !contactNumber || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Check if user already exists with college email
    const existingUser = await User.findOne({ email: collegeEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this college email already exists'
      });
    }

    // Note: facultyId is removed from the schema; no uniqueness check needed

    // Create user with college email (password will be hashed by pre-save hook)
    const user = new User({
      email: collegeEmail,
      password: password,
      role: 'faculty'
    });

    await user.save();

    // Create faculty profile
    const faculty = new Faculty({
      user: user._id,
      fullName,
      phone: contactNumber,
      department,
      mode,
      designation
    });

    await faculty.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Faculty registered successfully',
      data: {
        user: user.toSafeObject(),
        faculty: faculty,
        token
      }
    });

  } catch (error) {
    console.error('Faculty registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Signup Admin
const signupAdmin = async (req, res) => {
  try {
    const { 
      fullName, 
      department, 
      designation, 
      collegeEmail, 
      contactNumber, 
      password, 
      confirmPassword 
    } = req.body;

    // Validate required fields
    if (!fullName || !department || !designation || !collegeEmail || !contactNumber || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Check if user already exists with college email
    const existingUser = await User.findOne({ email: collegeEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this college email already exists'
      });
    }

    // Note: adminId is optional. If not provided, model will auto-generate.

    // Create user with college email (password will be hashed by pre-save hook)
    const user = new User({
      email: collegeEmail,
      password: password,
      role: 'admin'
    });

    await user.save();

    // Create admin profile
    const admin = new Admin({
      user: user._id,
      fullName,
      phone: contactNumber,
      department,
      designation
    });

    await admin.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: {
        user: user.toSafeObject(),
        admin: admin,
        token
      }
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Get role-specific data
    let roleData = null;
    switch (user.role) {
      case 'student':
        roleData = await Student.findOne({ user: user._id });
        break;
      case 'faculty':
        roleData = await Faculty.findOne({ user: user._id });
        break;
      case 'admin':
        roleData = await Admin.findOne({ user: user._id });
        break;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toSafeObject(),
        roleData,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get User Profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get role-specific data
    let roleData = null;
    switch (user.role) {
      case 'student':
        roleData = await Student.findOne({ user: user._id });
        break;
      case 'faculty':
        roleData = await Faculty.findOne({ user: user._id });
        break;
      case 'admin':
        roleData = await Admin.findOne({ user: user._id });
        break;
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.toSafeObject(),
        roleData
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update User Profile
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user fields
    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toSafeObject()
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Assign raw new password; it will be hashed by the User model pre-save hook
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Logout User
const logoutUser = async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just send a success response
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Verify Token
const verifyToken = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.toSafeObject()
      }
    });

  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  signupStudent,
  signupFaculty,
  signupAdmin,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  logoutUser,
  verifyToken
};
