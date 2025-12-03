const mongoose = require('mongoose');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Project = require('../models/Project');
const Group = require('../models/Group');
const FacultyPreference = require('../models/FacultyPreference');
const SystemConfig = require('../models/SystemConfig');
const InternshipApplication = require('../models/InternshipApplication');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Get admin profile data
const getAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get admin details with populated user data
    const admin = await Admin.findOne({ user: userId })
      .populate('user', 'email role isActive lastLogin createdAt')
      .lean();

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }

    res.json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          fullName: admin.fullName,
          phone: admin.phone,
          adminId: admin.adminId,
          department: admin.department,
          designation: admin.designation,
          isSuperAdmin: admin.isSuperAdmin,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt
        },
        user: {
          id: admin.user._id,
          email: admin.user.email,
          role: admin.user.role,
          isActive: admin.user.isActive,
          lastLogin: admin.user.lastLogin,
          createdAt: admin.user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Error getting admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin profile',
      error: error.message
    });
  }
};

// Update admin profile
const updateAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, department, designation } = req.body;

    // Validate required fields
    if (!fullName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Full name and phone are required'
      });
    }

    // Validate phone number format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      });
    }

    // Update admin profile
    const admin = await Admin.findOneAndUpdate(
      { user: userId },
      { 
        fullName: fullName.trim(),
        phone: phone.trim(),
        ...(department && { department }),
        ...(designation && { designation })
      },
      { new: true, runValidators: true }
    ).populate('user', 'email role isActive lastLogin createdAt');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        admin: {
          id: admin._id,
          fullName: admin.fullName,
          phone: admin.phone,
          adminId: admin.adminId,
          department: admin.department,
          designation: admin.designation,
          isSuperAdmin: admin.isSuperAdmin,
          updatedAt: admin.updatedAt
        },
        user: {
          id: admin.user._id,
          email: admin.user.email,
          role: admin.user.role,
          isActive: admin.user.isActive,
          lastLogin: admin.user.lastLogin
        }
      }
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// Get admin dashboard data
const getDashboardData = async (req, res) => {
  try {
    // Get basic counts
    const totalStudents = await Student.countDocuments();
    const totalFaculty = await Faculty.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalProjects = await Project.countDocuments();
    const totalGroups = await Group.countDocuments();
    
    // Get project statistics
    const projectStats = {
      total: totalProjects,
      registered: await Project.countDocuments({ status: 'registered' }),
      faculty_allocated: await Project.countDocuments({ status: 'faculty_allocated' }),
      active: await Project.countDocuments({ status: 'active' }),
      completed: await Project.countDocuments({ status: 'completed' }),
      cancelled: await Project.countDocuments({ status: 'cancelled' })
    };

    // Get group statistics
    const groupStats = {
      total: totalGroups,
      forming: await Group.countDocuments({ status: 'forming' }),
      complete: await Group.countDocuments({ status: 'complete' }),
      locked: await Group.countDocuments({ status: 'locked' }),
      disbanded: await Group.countDocuments({ status: 'disbanded' })
    };

    // Get allocation statistics
    const allocationStats = {
      pending: await FacultyPreference.countDocuments({ status: 'pending' }),
      allocated: await FacultyPreference.countDocuments({ status: 'allocated' }),
      rejected: await FacultyPreference.countDocuments({ status: 'rejected' })
    };

    // Get recent activities
    const recentStudents = await Student.find()
      .populate('user', 'email role isActive lastLogin')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentFaculty = await Faculty.find()
      .populate('user', 'email role isActive lastLogin')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentProjects = await Project.find()
      .populate('student', 'fullName misNumber')
      .populate('faculty', 'fullName department')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalFaculty,
          totalUsers,
          totalProjects,
          totalGroups
        },
        projectStats,
        groupStats,
        allocationStats,
        recentStudents,
        recentFaculty,
        recentProjects
      }
    });
  } catch (error) {
    console.error('Error getting admin dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Get all students
const getStudents = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
};

const searchStudents = async (req, res) => {
  try {
    const { search, page, pageSize, sort } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const skip = (pageNumber - 1) * limit;

    const query = {};

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');

      // First find users by email
      const matchedUsers = await User.find({ email: regex }).select('_id');
      const userIds = matchedUsers.map(u => u._id);

      const orConditions = [
        { fullName: regex },
        { misNumber: regex },
        { contactNumber: regex },
      ];

      if (userIds.length > 0) {
        orConditions.push({ user: { $in: userIds } });
      }

      query.$or = orConditions;
    }

    let sortOption;
    if (sort === 'semester_asc') {
      sortOption = { semester: 1, fullName: 1 };
    } else if (sort === 'semester_desc') {
      sortOption = { semester: -1, fullName: 1 };
    } else {
      sortOption = { fullName: 1 };
    }

    const [total, students] = await Promise.all([
      Student.countDocuments(query),
      Student.find(query)
        .populate('user', 'email role lastLogin')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formatted = students.map(student => ({
      _id: student._id,
      fullName: student.fullName,
      misNumber: student.misNumber,
      branch: student.branch,
      contactNumber: student.contactNumber,
      semester: student.semester,
      degree: student.degree,
      academicYear: student.academicYear,
      user: student.user
        ? {
            email: student.user.email,
            role: student.user.role,
            lastLogin: student.user.lastLogin,
          }
        : null,
    }));

    res.json({
      success: true,
      data: formatted,
      total,
      page: pageNumber,
      pageSize: limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching students',
      error: error.message,
    });
  }
};

const getStudentDetails = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID',
      });
    }

    const student = await Student.findById(studentId)
      .populate('user', 'email role lastLogin')
      .populate({
        path: 'groupMemberships.group',
        populate: [
          {
            path: 'project',
            select: 'title semester academicYear faculty',
            populate: {
              path: 'faculty',
              select: 'fullName department designation',
            },
          },
          {
            path: 'members.student',
            select: 'fullName misNumber',
          },
          {
            path: 'allocatedFaculty',
            select: 'fullName department designation',
          },
        ],
      })
      .populate({
        path: 'currentProjects.project',
        populate: [
          {
            path: 'faculty',
            select: 'fullName department designation',
          },
          {
            path: 'group',
            select: 'name semester academicYear',
          },
        ],
      })
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const studentInfo = {
      _id: student._id,
      fullName: student.fullName,
      degree: student.degree,
      semester: student.semester,
      academicYear: student.academicYear,
      misNumber: student.misNumber,
      branch: student.branch,
      contactNumber: student.contactNumber,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      user: student.user
        ? {
            email: student.user.email,
            role: student.user.role,
            lastLogin: student.user.lastLogin,
          }
        : null,
    };

    const groupMemberships = student.groupMemberships || [];
    const currentGroups = [];
    const pastGroups = [];

    for (const membership of groupMemberships) {
      const group = membership.group;
      if (!group) continue;

      const members = (group.members || []).filter(m => m.isActive);

      const groupData = {
        groupId: group._id,
        semester: membership.semester || group.semester,
        academicYear: group.academicYear,
        role: membership.role,
        project: group.project
          ? {
              _id: group.project._id,
              title: group.project.title,
              semester: group.project.semester,
              academicYear: group.project.academicYear,
            }
          : null,
        faculty: group.allocatedFaculty
          ? {
              _id: group.allocatedFaculty._id,
              fullName: group.allocatedFaculty.fullName,
              department: group.allocatedFaculty.department,
              designation: group.allocatedFaculty.designation,
            }
          : null,
        members: members.map(m => ({
          studentId: m.student ? m.student._id : null,
          fullName: m.student ? m.student.fullName : null,
          misNumber: m.student ? m.student.misNumber : null,
          role: m.role,
        })),
      };

      if (membership.isActive) {
        currentGroups.push(groupData);
      } else {
        pastGroups.push(groupData);
      }
    }

    const legacyInternships = (student.internshipHistory || []).map(internship => ({
      _id: internship._id,
      semester: internship.semester,
      academicYear: internship.academicYear,
      type: internship.type,
      status: internship.status,
      details: {
        companyName: internship.company || null,
        location: internship.location || null,
        startDate: internship.startDate || null,
        endDate: internship.endDate || null,
        mentorName: internship.mentorName || null,
        mentorEmail: internship.mentorEmail || null,
        mentorPhone: internship.mentorPhone || null,
        roleOrNatureOfWork: internship.position || internship.roleOrNatureOfWork || null,
        mode: internship.mode || null,
        hasStipend: internship.hasStipend || null,
        stipendRs: typeof internship.stipendRs === 'number' ? internship.stipendRs : null,
        offerLetterLink: internship.offerLetterLink || null,
      },
      submittedAt: internship.submittedAt || internship.startDate || null,
      reviewedAt: internship.reviewedAt || null,
      verifiedAt: internship.verifiedAt || null,
      reviewedBy: internship.reviewedBy || null,
      verifiedBy: internship.verifiedBy || null,
    }));

    const internshipApplications = await InternshipApplication.find({ student: student._id })
      .sort({ submittedAt: -1 })
      .limit(20)
      .lean();

    const applicationInternships = internshipApplications.map(app => ({
      _id: app._id,
      semester: app.semester,
      academicYear: app.academicYear,
      type: app.type,
      status: app.status,
      details: {
        companyName: app.details?.companyName || null,
        location: app.details?.location || null,
        startDate: app.details?.startDate || null,
        endDate: app.details?.endDate || null,
        mentorName: app.details?.mentorName || null,
        mentorEmail: app.details?.mentorEmail || null,
        mentorPhone: app.details?.mentorPhone || null,
        roleOrNatureOfWork: app.details?.roleOrNatureOfWork || null,
        mode: app.details?.mode || null,
        hasStipend: app.details?.hasStipend || null,
        stipendRs: typeof app.details?.stipendRs === 'number' ? app.details.stipendRs : null,
        offerLetterLink: app.details?.offerLetterLink || null,
      },
      submittedAt: app.submittedAt,
      reviewedAt: app.reviewedAt,
      verifiedAt: app.verifiedAt,
      reviewedBy: app.reviewedBy || null,
      verifiedBy: app.verifiedBy || null,
    }));

    const internships = [...applicationInternships, ...legacyInternships];

    const currentProjects = (student.currentProjects || []).map(cp => {
      const project = cp.project || {};
      const faculty = project.faculty || null;

      return {
        _id: cp._id,
        projectId: project._id,
        title: project.title,
        domain: project.domain,
        semester: cp.semester,
        role: cp.role,
        status: cp.status,
        joinedAt: cp.joinedAt,
        projectType: project.projectType,
        assignedFaculty: faculty
          ? {
              _id: faculty._id,
              fullName: faculty.fullName,
              department: faculty.department,
              designation: faculty.designation,
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: {
        student: studentInfo,
        groups: {
          current: currentGroups,
          past: pastGroups,
        },
        internships,
        currentProjects,
      },
    });
  } catch (error) {
    console.error('Error getting student details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student details',
      error: error.message,
    });
  }
};

const updateStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { fullName, email, contactNumber, branch, misNumber } = req.body;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    const phoneRegex = /^\d{10}$/;
    if (contactNumber && !phoneRegex.test(contactNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number',
      });
    }

    const student = await Student.findById(studentId).populate('user');
    if (!student || !student.user) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    if (misNumber && misNumber !== student.misNumber) {
      const existingStudent = await Student.findOne({
        misNumber,
        _id: { $ne: studentId },
      });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: 'MIS number is already in use by another student',
        });
      }
      student.misNumber = misNumber.trim();
    }

    if (typeof fullName === 'string' && fullName.trim()) {
      student.fullName = fullName.trim();
    }
    if (typeof contactNumber === 'string' && contactNumber.trim()) {
      student.contactNumber = contactNumber.trim();
    }
    if (typeof branch === 'string' && branch.trim()) {
      student.branch = branch.trim();
    }

    const user = student.user;
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      if (user.email !== normalizedEmail) {
        const existingUser = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: user._id },
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email is already in use by another account',
          });
        }

        user.email = normalizedEmail;
        await user.save();
      }
    }

    await student.save();

    const updated = await Student.findById(studentId)
      .populate('user', 'email role lastLogin createdAt')
      .lean();

    const { user: userData, ...studentData } = updated;

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: {
        student: studentData,
        user: userData,
      },
    });
  } catch (error) {
    console.error('Error updating student profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student profile',
      error: error.message,
    });
  }
};

const resetStudentPassword = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID',
      });
    }

    const student = await Student.findById(studentId).populate('user');
    if (!student || !student.user) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const user = student.user;

    const newPassword = crypto
      .randomBytes(6)
      .toString('base64')
      .replace(/[+/=]/g, 'A')
      .slice(0, 10);

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.updateOne({ _id: user._id }, { password: hashedPassword });

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        newPassword,
      },
    });
  } catch (error) {
    console.error('Error resetting student password:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting student password',
      error: error.message,
    });
  }
};

// Get all faculty
const getFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find({ isRetired: false })
      .populate('user', 'email role isActive lastLogin')
      .sort({ fullName: 1 })
      .lean();

    const formatted = faculty.map(fac => ({
      _id: fac._id,
      facultyId: fac.facultyId,
      fullName: fac.fullName,
      prefix: fac.prefix || '',
      email: fac.email || fac.user?.email || '',
      phone: fac.phone,
      department: fac.department,
      mode: fac.mode,
      designation: fac.designation,
      user: fac.user ? {
        email: fac.user.email,
        role: fac.user.role
      } : null
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Error getting faculty:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching faculty',
      error: error.message
    });
  }
};

// Search faculties for admin manage-faculty page
const searchFaculties = async (req, res) => {
  try {
    const { search, sort, page, pageSize } = req.query;

    // Base query: exclude retired faculty
    let faculties = await Faculty.find({ isRetired: false })
      .populate('user', 'email role isActive lastLogin createdAt')
      .lean();

    // Apply search filter on name, phone, or email (case-insensitive)
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      faculties = faculties.filter(fac =>
        regex.test(fac.fullName || '') ||
        regex.test(fac.phone || '') ||
        regex.test(fac.user?.email || '')
      );
    }

    // Apply sort in-memory for simplicity
    faculties.sort((a, b) => {
      const field = sort === 'designation' ? 'designation' : sort === 'department' ? 'department' : 'fullName';
      const aVal = (a[field] || '').toString();
      const bVal = (b[field] || '').toString();
      const primary = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
      if (primary !== 0) return primary;
      return (a.fullName || '').localeCompare(b.fullName || '', undefined, { sensitivity: 'base' });
    });
    const totalCount = faculties.length;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const startIndex = (pageNumber - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedFaculties = faculties.slice(startIndex, endIndex);

    const formatted = paginatedFaculties.map(fac => ({
      _id: fac._id,
      facultyId: fac.facultyId,
      fullName: fac.fullName,
      prefix: fac.prefix || '',
      phone: fac.phone,
      department: fac.department,
      mode: fac.mode,
      designation: fac.designation,
      user: fac.user
        ? {
            email: fac.user.email,
            role: fac.user.role
          }
        : null
    }));

    res.json({
      success: true,
      data: formatted,
      totalCount,
      totalPages,
      currentPage: pageNumber,
      count: totalCount
    });
  } catch (error) {
    console.error('Error searching faculties:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching faculties',
      error: error.message
    });
  }
};

// Get single faculty details with assigned groups
const getFacultyDetails = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const facultyDoc = await Faculty.findOne({ facultyId })
      .populate('user', 'email role isActive lastLogin createdAt')
      .lean();

    if (!facultyDoc) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const groups = await Group.find({
      allocatedFaculty: facultyDoc._id,
      isActive: true
    })
      .populate({
        path: 'members.student',
        select: 'fullName misNumber'
      })
      .populate({
        path: 'project',
        select: 'title semester academicYear'
      })
      .sort({ createdAt: -1 })
      .lean();

    const formattedGroups = groups.map(group => ({
      _id: group._id,
      name: group.name,
      semester: group.semester,
      academicYear: group.academicYear,
      project: group.project
        ? {
            _id: group.project._id,
            title: group.project.title,
            semester: group.project.semester,
            academicYear: group.project.academicYear
          }
        : null,
      members: (group.members || [])
        .filter(m => m.isActive)
        .map(m => ({
          role: m.role,
          student: m.student
            ? {
                _id: m.student._id,
                fullName: m.student.fullName,
                misNumber: m.student.misNumber
              }
            : null
        }))
    }));

    const { user, ...facultyData } = facultyDoc;

    res.json({
      success: true,
      data: {
        faculty: facultyData,
        user: user || null,
        groups: formattedGroups
      }
    });
  } catch (error) {
    console.error('Error getting faculty details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching faculty details',
      error: error.message
    });
  }
};

// Update faculty profile (admin)
const updateFacultyProfile = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { fullName, prefix, phone, department, mode, designation, email } = req.body;

    if (!fullName || !phone || !department || !mode || !designation || !email) {
      return res.status(400).json({
        success: false,
        message: 'Full name, phone, department, mode, designation, and email are required'
      });
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      });
    }

    const faculty = await Faculty.findOne({ facultyId }).populate('user');
    if (!faculty || !faculty.user) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    faculty.fullName = fullName.trim();
    faculty.prefix = prefix || '';
    faculty.phone = phone.trim();
    faculty.department = department;
    faculty.mode = mode;
    faculty.designation = designation;

    const user = faculty.user;
    const normalizedEmail = email.trim().toLowerCase();

    if (user.email !== normalizedEmail) {
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use by another account'
        });
      }

      user.email = normalizedEmail;
      await user.save();
    }

    await faculty.save();

    const updated = await Faculty.findOne({ facultyId })
      .populate('user', 'email role isActive lastLogin createdAt')
      .lean();

    const { user: userData, ...facultyData } = updated;

    res.json({
      success: true,
      message: 'Faculty profile updated successfully',
      data: {
        faculty: facultyData,
        user: userData
      }
    });
  } catch (error) {
    console.error('Error updating faculty profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating faculty profile',
      error: error.message
    });
  }
};

// Reset faculty password (admin)
const resetFacultyPassword = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const faculty = await Faculty.findOne({ facultyId }).populate('user');
    if (!faculty || !faculty.user) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const user = faculty.user;

    // Generate a secure random password
    const generatePassword = (length = 10) => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
      const bytes = crypto.randomBytes(length);
      let password = '';
      for (let i = 0; i < length; i++) {
        password += chars[bytes[i] % chars.length];
      }
      return password;
    };

    const newPassword = generatePassword(10);

    // User schema pre-save hook will hash the password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        newPassword
      }
    });
  } catch (error) {
    console.error('Error resetting faculty password:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting faculty password',
      error: error.message
    });
  }
};

// Get all projects
const getProjects = async (req, res) => {
  try {
    const { semester, status, projectType, faculty } = req.query;
    
    // Build query
    const query = {};
    
    if (semester !== undefined && semester !== null && semester !== '') {
      const semesterNumber = parseInt(semester, 10);
      if (!Number.isNaN(semesterNumber)) {
        query.semester = semesterNumber;
      }
    }
    
    if (status) {
      query.status = status;
    }
    
    if (projectType) {
      query.projectType = projectType;
    }
    
    if (faculty) {
      query.faculty = faculty;
    }

    // Get projects with populated data
    const projects = await Project.find(query)
      .populate('student', 'fullName misNumber collegeEmail semester degree branch contactNumber')
      .populate('faculty', 'fullName department designation')
      .populate({
        path: 'facultyPreferences.faculty',
        select: 'fullName department designation'
      })
      .populate({
        path: 'group',
        select: 'name members allocatedFaculty',
        populate: [
          {
            path: 'members.student',
            select: 'fullName misNumber collegeEmail semester degree branch contactNumber'
          },
          {
            path: 'allocatedFaculty',
            select: 'fullName department designation'
          }
        ]
      })
      .sort({ createdAt: -1 });

    // Get project statistics
    const stats = {
      total: projects.length,
      registered: projects.filter(p => p.status === 'registered').length,
      faculty_allocated: projects.filter(p => p.status === 'faculty_allocated').length,
      active: projects.filter(p => p.status === 'active').length,
      completed: projects.filter(p => p.status === 'completed').length,
      cancelled: projects.filter(p => p.status === 'cancelled').length
    };

    res.json({
      success: true,
      data: projects,
      stats,
      message: `Found ${projects.length} projects`
    });
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching projects',
      error: error.message
    });
  }
};

// Get all groups
const getGroups = async (req, res) => {
  try {
    const { semester, status, faculty, includeInactive, search } = req.query;
    
    // Build query
    const query = {};
    
    // Always filter by semester if provided
    // CRITICAL: Only Sem 6 needs previous semester groups (Sem 5 groups) for promotion cases
    // Sem 7 and Sem 8 should ONLY get their own semester groups - students create new groups
    if (semester) {
      const semesterNum = parseInt(semester, 10);
      if (!Number.isNaN(semesterNum)) {
        // Only include previous semester for Sem 6 (which needs Sem 5 groups)
        // Sem 7 and Sem 8 should only get their own semester groups
        if (semesterNum === 6) {
          const previousSemester = semesterNum - 1; // Sem 5
          query.semester = { $in: [semesterNum, previousSemester] };
        } else {
          // For Sem 7, 8, and others, only get groups from that specific semester
          query.semester = semesterNum;
        }
      }
    }
    
    // For Sem 5, only show active groups by default (unless explicitly requested)
    if (query.semester === 5 && includeInactive !== 'true') {
      query.isActive = true;
    }
    // For other semesters (like Sem 6), default to active groups and exclude locked groups
    // Locked groups are historical Sem 5 groups that moved to Sem 6 - exclude from active workflows
    else if (query.semester && query.semester !== 5) {
      if (includeInactive !== 'true') {
        query.isActive = true;
      }
      // Exclude locked groups from active semester workflows (unless status='locked' is explicitly requested)
      // Locked groups are historical Sem 5 groups - don't show in Sem 6+ active workflows
      if (!status || status === 'undefined' || status === 'all') {
        query.status = { $ne: 'locked' };
      }
    }
    // If no semester specified, still filter by active and exclude locked
    else if (!query.semester && includeInactive !== 'true') {
      query.isActive = true;
      // Exclude locked groups unless explicitly requested via status parameter
      if (!status || status === 'undefined' || status === 'all') {
        query.status = { $ne: 'locked' };
      }
    }
    
    // Apply status filter if provided (this overrides the locked exclusion above if status='locked')
    if (status && status !== 'undefined' && status !== 'all') {
      query.status = status;
    }
    
    if (faculty) {
      query.allocatedFaculty = faculty;
    }

    // Get groups with populated data (need contactNumber for search)
    // Note: We fetch groups based on group.semester, but will re-filter based on member semesters
    let groups = await Group.find(query)
      .populate('members.student', 'fullName misNumber collegeEmail contactNumber branch semester degree')
      .populate('leader', 'fullName misNumber collegeEmail contactNumber branch semester')
      .populate('allocatedFaculty', 'fullName department designation')
      .populate('project', 'title description projectType status semester')
      .sort({ createdAt: -1 });

    // Determine actual semester based on member semesters
    // If all active members are in a different semester than group.semester, use member semester
    const groupsWithActualSemester = groups.map(group => {
      const activeMembers = group.members.filter(m => m.isActive && m.student);
      
      if (activeMembers.length === 0) {
        // No active members, use group's semester
        return { ...group.toObject(), actualSemester: group.semester };
      }
      
      // Get unique semesters from active members
      const memberSemesters = activeMembers
        .map(m => m.student?.semester)
        .filter(s => s !== undefined && s !== null);
      
      if (memberSemesters.length === 0) {
        // No valid semesters found, use group's semester
        return { ...group.toObject(), actualSemester: group.semester };
      }
      
      // Check if all members are in the same semester
      const uniqueSemesters = [...new Set(memberSemesters)];
      
      if (uniqueSemesters.length === 1) {
        // All members are in the same semester
        const actualSemester = uniqueSemesters[0];
        
        // CRITICAL: Only update group semester for Sem 5->6 promotion
        // For Sem 6->7 and Sem 7->8, groups should NOT be updated - students create new groups
        if (actualSemester !== group.semester && group.semester === 5 && actualSemester === 6) {
          // Only update group semester for Sem 5->6 promotion (non-blocking)
          Group.findByIdAndUpdate(group._id, { semester: actualSemester }, { new: false })
            .catch(err => console.error(`Error updating group ${group._id} semester:`, err));
        }
        
        return { ...group.toObject(), actualSemester };
      } else {
        // Members are in different semesters - use majority or highest semester
        // Count semesters
        const semesterCounts = {};
        memberSemesters.forEach(sem => {
          semesterCounts[sem] = (semesterCounts[sem] || 0) + 1;
        });
        
        // Get semester with most members, or highest if tie
        let actualSemester = group.semester;
        let maxCount = 0;
        for (const [sem, count] of Object.entries(semesterCounts)) {
          if (count > maxCount || (count === maxCount && parseInt(sem) > actualSemester)) {
            maxCount = count;
            actualSemester = parseInt(sem);
          }
        }
        
        // CRITICAL: Only update group semester for Sem 5->6 promotion
        // For Sem 6->7 and Sem 7->8, groups should NOT be updated - students create new groups
        if (actualSemester !== group.semester && 
            group.semester === 5 && 
            actualSemester === 6) {
          // Only update group semester for Sem 5->6 promotion (non-blocking)
          Group.findByIdAndUpdate(group._id, { semester: actualSemester }, { new: false })
            .catch(err => console.error(`Error updating group ${group._id} semester:`, err));
        }
        
        return { ...group.toObject(), actualSemester };
      }
    });

    // Filter by actual semester if semester parameter is provided
    let filteredGroups = groupsWithActualSemester;
    if (semester) {
      const semesterNum = parseInt(semester, 10);
      if (!Number.isNaN(semesterNum)) {
        filteredGroups = groupsWithActualSemester.filter(g => g.actualSemester === semesterNum);
      }
    }

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      filteredGroups = filteredGroups.filter(group => {
        // Search in group name
        if (group.name && group.name.toLowerCase().includes(searchLower)) {
          return true;
        }
        
        // Search in leader details
        if (group.leader) {
          if (
            (group.leader.fullName && group.leader.fullName.toLowerCase().includes(searchLower)) ||
            (group.leader.misNumber && group.leader.misNumber.includes(search)) ||
            (group.leader.collegeEmail && group.leader.collegeEmail.toLowerCase().includes(searchLower)) ||
            (group.leader.contactNumber && group.leader.contactNumber.includes(search))
          ) {
            return true;
          }
        }
        
        // Search in member details
        if (group.members && group.members.length > 0) {
          const memberMatch = group.members.some(member => {
            if (!member.student || !member.isActive) return false;
            const student = member.student;
            return (
              (student.fullName && student.fullName.toLowerCase().includes(searchLower)) ||
              (student.misNumber && student.misNumber.includes(search)) ||
              (student.collegeEmail && student.collegeEmail.toLowerCase().includes(searchLower)) ||
              (student.contactNumber && student.contactNumber.includes(search))
            );
          });
          if (memberMatch) return true;
        }
        
        // Search in allocated faculty
        if (group.allocatedFaculty) {
          if (group.allocatedFaculty.fullName && group.allocatedFaculty.fullName.toLowerCase().includes(searchLower)) {
            return true;
          }
        }
        
        return false;
      });
    }

    // Update semester field in response to reflect actualSemester
    const finalGroups = filteredGroups.map(group => {
      // If actualSemester differs from semester, use actualSemester
      if (group.actualSemester !== undefined && group.actualSemester !== group.semester) {
        return {
          ...group,
          semester: group.actualSemester
        };
      }
      return group;
    });

    // Get group statistics (based on filtered results)
    const stats = {
      total: finalGroups.length,
      forming: finalGroups.filter(g => g.status === 'forming').length,
      complete: finalGroups.filter(g => g.status === 'complete').length,
      locked: finalGroups.filter(g => g.status === 'locked').length,
      disbanded: finalGroups.filter(g => g.status === 'disbanded').length,
      withFaculty: finalGroups.filter(g => g.allocatedFaculty).length,
      withProject: finalGroups.filter(g => g.project).length
    };

    res.json({
      success: true,
      data: finalGroups,
      stats,
      message: `Found ${finalGroups.length} groups`
    });
  } catch (error) {
    console.error('Error getting groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching groups',
      error: error.message
    });
  }
};

// Get system statistics
const getSystemStats = async (req, res) => {
  try {
    const stats = {
      totalStudents: await Student.countDocuments({ isActive: true }),
      totalFaculty: await Faculty.countDocuments({ isActive: true }),
      totalUsers: await User.countDocuments(),
      activeStudents: await Student.countDocuments({ isActive: true, isGraduated: false }),
      graduatedStudents: await Student.countDocuments({ isGraduated: true })
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system statistics',
      error: error.message
    });
  }
};

// Get all allocations
const getAllocations = async (req, res) => {
  try {
    const { status, semester, faculty } = req.query;
    
    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (semester) {
      query.semester = parseInt(semester);
    }
    
    if (faculty) {
      query.allocatedFaculty = faculty;
    }

    // Get allocations with populated data
    const allocations = await FacultyPreference.find(query)
      .populate('student', 'fullName misNumber collegeEmail semester degree branch')
      .populate('project', 'title description projectType')
      .populate('group', 'name members')
      .populate('preferences.faculty', 'fullName department designation')
      .populate('allocatedFaculty', 'fullName department designation')
      .sort({ createdAt: -1 });

    // Get allocation statistics
    const stats = {
      total: allocations.length,
      pending: allocations.filter(a => a.status === 'pending').length,
      allocated: allocations.filter(a => a.status === 'allocated').length,
      rejected: allocations.filter(a => a.status === 'rejected').length,
      cancelled: allocations.filter(a => a.status === 'cancelled').length
    };

    res.json({
      success: true,
      data: allocations,
      stats,
      message: `Found ${allocations.length} allocations`
    });
  } catch (error) {
    console.error('Error getting allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching allocations',
      error: error.message
    });
  }
};

// Get unallocated groups
const getUnallocatedGroups = async (req, res) => {
  try {
    const { semester } = req.query;
    
    // Build query for groups without faculty allocation
    const query = {
      allocatedFaculty: { $exists: false },
      isActive: true,
      status: { $in: ['complete', 'locked'] }
    };
    
    if (semester) {
      query.semester = parseInt(semester);
    }

    // Get unallocated groups
    const groups = await Group.find(query)
      .populate('members.student', 'fullName misNumber collegeEmail')
      .populate('leader', 'fullName misNumber collegeEmail')
      .populate('project', 'title description projectType')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: groups,
      message: `Found ${groups.length} unallocated groups`
    });
  } catch (error) {
    console.error('Error getting unallocated groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unallocated groups',
      error: error.message
    });
  }
};

// Force allocate faculty to group/project
const forceAllocateFaculty = async (req, res) => {
  try {
    const { allocationId, facultyId } = req.body;
    
    // Find allocation
    const allocation = await FacultyPreference.findById(allocationId);
    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Allocation not found'
      });
    }

    // Check if faculty exists
    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Force allocate
    await allocation.adminAllocate(facultyId, req.user.id);

    // Update project/group with faculty allocation
    let group = null;
    if (allocation.group) {
      // Don't populate when saving to avoid validation issues
      group = await Group.findById(allocation.group);
      if (group) {
        group.allocatedFaculty = facultyId;
        await group.save();
        
        // Get populated version for member updates below
        group = await Group.findById(allocation.group).populate('members.student');
      }
    }

    if (allocation.project) {
      const project = await Project.findById(allocation.project);
      if (project) {
        project.faculty = facultyId;
        project.status = 'faculty_allocated';
        project.allocatedBy = 'admin_allocation';
        await project.save();
        
        // Update all group members' currentProjects status
        if (group && group.members) {
          const activeMembers = group.members.filter(m => m.isActive);
          for (const member of activeMembers) {
            const memberStudent = await Student.findById(member.student);
            if (memberStudent) {
              const currentProject = memberStudent.currentProjects.find(cp => 
                cp.project.toString() === project._id.toString()
              );
              if (currentProject) {
                currentProject.status = 'active'; // Update status when faculty is allocated
              }
              await memberStudent.save();
            }
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Faculty allocated successfully'
    });
  } catch (error) {
    console.error('Error force allocating faculty:', error);
    res.status(500).json({
      success: false,
      message: 'Error force allocating faculty',
      error: error.message
    });
  }
};

// Update project status (admin override)
const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params; // Route parameter is :id, not :projectId
    const { status, grade, feedback } = req.body;
    
    // Find project
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Update project
    if (status) project.status = status;
    if (grade) project.grade = grade;
    if (feedback !== undefined) project.feedback = feedback; // Allow empty strings to clear feedback
    
    if (status === 'completed' || grade) {
      project.evaluatedBy = req.user.id;
      project.evaluatedAt = new Date();
    }

    await project.save();

    res.json({
      success: true,
      data: project,
      message: 'Project status updated successfully'
    });
  } catch (error) {
    console.error('Error updating project status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating project status',
      error: error.message
    });
  }
};

// Sem 5 specific: Get allocation statistics
const getAllocationStatistics = async (req, res) => {
  try {
    const { semester, academicYear } = req.query;

    const query = { isActive: true };
    if (semester) query.semester = parseInt(semester);
    if (academicYear) query.academicYear = academicYear;

    const totalGroups = await Group.countDocuments(query);
    const allocatedGroups = await Group.countDocuments({ ...query, allocatedFaculty: { $exists: true } });
    const unallocatedGroups = totalGroups - allocatedGroups;

    const groupsByStatus = await Group.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const groupsByFaculty = await Group.aggregate([
      { $match: { ...query, allocatedFaculty: { $exists: true } } },
      { $group: { _id: '$allocatedFaculty', count: { $sum: 1 } } },
      { $lookup: { from: 'faculties', localField: '_id', foreignField: '_id', as: 'faculty' } },
      { $unwind: '$faculty' },
      { $project: { facultyName: '$faculty.fullName', count: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalGroups,
        allocatedGroups,
        unallocatedGroups,
        allocationRate: totalGroups > 0 ? (allocatedGroups / totalGroups * 100).toFixed(2) : 0,
        groupsByStatus,
        groupsByFaculty
      },
      message: 'Allocation statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting allocation statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting allocation statistics',
      error: error.message
    });
  }
};

// Get Sem 4 Minor Project 1 registrations
const getSem4MinorProject1Registrations = async (req, res) => {
  try {
    const { batch, currentYear } = req.query;
    
    let query = {
      projectType: 'minor1',
      semester: 4
    };

    // Add academic year filter based on batch
    if (batch || currentYear) {
      if (batch) {
        // Convert batch (e.g., "2024-2028") to academicYear format
        const startYear = batch.split('-')[0];
        const academicYear = `${startYear}-${parseInt(startYear) + 4}`;
        query.academicYear = academicYear;
      } else if (currentYear === 'true') {
        // Get current academic year
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6; // July = month index 6
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        const academicYear = `${academicStartYear}-${academicStartYear + 4}`;
        query.academicYear = academicYear;
      }
    }

    // Get projects with populated student data
    const projects = await Project.find(query)
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'email'
        }
      })
      .sort({ createdAt: -1 });

    // Format the response with required columns
    const formattedRegistrations = projects.map(project => ({
      _id: project._id,
      timestamp: project.createdAt,
      email: project.student?.user?.email || 'N/A',
      name: project.student?.fullName || 'N/A',
      misNumber: project.student?.misNumber || 'N/A',
      contact: project.student?.contactNumber || 'N/A',
      branch: project.student?.branch || 'N/A',
      projectTitle: project.title,
      status: project.status,
      academicYear: project.academicYear,
      projectType: project.projectType,
      semester: project.semester
    }));

    res.json({
      success: true,
      data: formattedRegistrations,
      total: formattedRegistrations.length
    });

  } catch (error) {
    console.error('Error getting Sem 4 Minor Project 1 registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message
    });
  }
};

// Get M.Tech Sem 1 Minor Project registrations
const getMTechSem1Registrations = async (req, res) => {
  try {
    const { academicYear, batch, currentYear } = req.query;

    const query = {
      projectType: 'minor1',
      semester: 1
    };

    if (academicYear) {
      query.academicYear = academicYear;
    } else if (batch) {
      // Batch provided in format "2024-2026" (optional) -> derive first year
      const startYear = batch.split('-')[0];
      if (startYear) {
        query.academicYear = `${startYear}-${(parseInt(startYear, 10) + 1).toString().slice(-2)}`;
      }
    } else if (currentYear === 'true') {
      const now = new Date();
      const startYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
      query.academicYear = `${startYear}-${(startYear + 1).toString().slice(-2)}`;
    }

    const projects = await Project.find(query)
      .populate({
        path: 'student',
        match: { degree: 'M.Tech', semester: 1 },
        populate: { path: 'user', select: 'email' }
      })
      .populate({
        path: 'faculty',
        select: 'fullName department designation'
      })
      .sort({ createdAt: -1 });

    const mtechProjects = projects.filter(project => project.student && project.student.degree === 'M.Tech' && project.student.semester === 1);

    const formatted = mtechProjects.map(project => ({
      _id: project._id,
      timestamp: project.createdAt,
      email: project.student?.user?.email || 'N/A',
      name: project.student?.fullName || 'N/A',
      misNumber: project.student?.misNumber || 'N/A',
      contact: project.student?.contactNumber || 'N/A',
      branch: project.student?.branch || 'N/A',
      projectTitle: project.title,
      status: project.status,
      academicYear: project.academicYear,
      projectType: project.projectType,
      semester: project.semester,
      facultyAllocated: project.faculty ? project.faculty.fullName : 'Not Allocated'
    }));

    res.json({
      success: true,
      data: formatted,
      total: formatted.length
    });
  } catch (error) {
    console.error('Error getting M.Tech Sem 1 registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching M.Tech Sem 1 registrations',
      error: error.message
    });
  }
};

// Get Unregistered Sem 4 Students
const getUnregisteredSem4Students = async (req, res) => {
  try {
    // Find all Semester 4 students
    const allSem4Students = await Student.find({ 
      semester: 4,
      degree: 'B.Tech'
    })
    .populate('user', 'email')
    .lean();

    // Find all students who have registered for Minor Project 1
    const registeredProjects = await Project.find({
      projectType: 'minor1',
      semester: 4
    }).distinct('student');

    // Filter out students who have already registered
    const unregisteredStudents = allSem4Students.filter(
      student => !registeredProjects.some(
        registeredId => registeredId.toString() === student._id.toString()
      )
    );

    res.json({
      success: true,
      data: unregisteredStudents,
      count: unregisteredStudents.length,
      message: 'Unregistered Sem 4 students retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting unregistered Sem 4 students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unregistered students',
      error: error.message
    });
  }
};

// Get Unregistered M.Tech Sem 1 Students
const getUnregisteredMTechSem1Students = async (req, res) => {
  try {
    const { academicYear } = req.query;

    const studentQuery = {
      degree: 'M.Tech',
      semester: 1
    };

    if (academicYear) {
      studentQuery.academicYear = academicYear;
    }

    const students = await Student.find(studentQuery)
      .populate('user', 'email')
      .lean();

    const projectQuery = {
      projectType: 'minor1',
      semester: 1
    };

    if (academicYear) {
      projectQuery.academicYear = academicYear;
    }

    const projects = await Project.find(projectQuery)
      .populate('student', 'degree semester')
      .select('student');

    const registeredStudentIds = new Set(
      projects
        .filter(project => project.student && project.student.degree === 'M.Tech' && project.student.semester === 1)
        .map(project => project.student._id.toString())
    );

    const unregisteredStudents = students.filter(
      student => !registeredStudentIds.has(student._id.toString())
    );

    res.json({
      success: true,
      data: unregisteredStudents,
      count: unregisteredStudents.length,
      message: 'Unregistered M.Tech Sem 1 students retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting unregistered M.Tech Sem 1 students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unregistered M.Tech Sem 1 students',
      error: error.message
    });
  }
};

// Get Sem 5 Non-Registered Students
const getSem5NonRegisteredStudents = async (req, res) => {
  try {
    const { batch, currentYear, academicYear } = req.query;
    
    let query = {
      semester: 5
    };

    // Add academic year filter
    if (academicYear) {
      query.academicYear = academicYear;
    } else if (batch || currentYear) {
      if (batch) {
        const startYear = batch.split('-')[0];
        // Academic year format should be "2024-25" not "2024-2028"
        const acYear = `${startYear}-${(parseInt(startYear) + 1).toString().slice(-2)}`;
        query.academicYear = acYear;
      } else if (currentYear === 'true') {
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6;
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        // Academic year format should be "2024-25" not "2024-2028"
        const acYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
        query.academicYear = acYear;
      }
    }

    // Get all Sem 5 students
    const students = await Student.find(query)
      .populate('user', 'email')
      .populate('groupId', 'name status allocatedFaculty')
      .sort({ fullName: 1 });

    // Get all Sem 5 projects (only from groups still in Sem 5)
    const projectQuery = {
      projectType: 'minor2',
      semester: 5,
      ...(query.academicYear && { academicYear: query.academicYear })
    };
    
    const projects = await Project.find(projectQuery)
      .populate('group', 'semester')
      .select('student group');
    
    // Filter to only include projects where group is still in Sem 5
    const sem5OnlyProjects = projects.filter(p => !p.group || p.group.semester === 5);

    // Create a set of students who have registered
    const registeredStudentIds = new Set(sem5OnlyProjects.map(p => p.student.toString()));

    // Get all groups with allocated faculty for Sem 5 (only groups still in Sem 5)
    const allocatedGroups = await Group.find({
      semester: 5,
      allocatedFaculty: { $exists: true, $ne: null },
      isActive: true,
      ...(query.academicYear && { academicYear: query.academicYear })
    }).select('members');

    // Create a set of students who are in groups with allocated faculty
    const studentsInAllocatedGroups = new Set();
    allocatedGroups.forEach(group => {
      group.members.forEach(member => {
        if (member.isActive) {
          studentsInAllocatedGroups.add(member.student.toString());
        }
      });
    });

    // Filter students who:
    // 1. Haven't registered for minor2 project
    // 2. Are NOT in a group that has allocated faculty
    const nonRegisteredStudents = students.filter(student => 
      !registeredStudentIds.has(student._id.toString()) &&
      !studentsInAllocatedGroups.has(student._id.toString())
    );

    // Format the response
    const formattedStudents = nonRegisteredStudents.map(student => ({
      _id: student._id,
      fullName: student.fullName,
      misNumber: student.misNumber,
      email: student.user?.email || 'N/A',
      contactNumber: student.contactNumber,
      branch: student.branch,
      academicYear: student.academicYear,
      groupStatus: student.groupId ? 'In Group' : 'Not in Group',
      groupName: student.groupId?.name || 'N/A',
      groupId: student.groupId?._id || null
    }));

    // Calculate statistics
    const stats = {
      totalNotRegistered: formattedStudents.length,
      inGroup: formattedStudents.filter(s => s.groupId).length,
      notInGroup: formattedStudents.filter(s => !s.groupId).length
    };

    res.json({
      success: true,
      data: formattedStudents,
      stats,
      total: formattedStudents.length
    });

  } catch (error) {
    console.error('Error getting non-registered students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching non-registered students',
      error: error.message
    });
  }
};

// Get Sem 5 Groups for Admin Dashboard
const getSem5Groups = async (req, res) => {
  try {
    const { academicYear } = req.query;
    
    const query = {
      semester: 5,
      isActive: true
    };

    if (academicYear) {
      query.academicYear = academicYear;
    } else {
      // Default to current academic year
      const currentDate = new Date();
      const currentYearNum = currentDate.getFullYear();
      const isPreMid = currentDate.getMonth() < 6;
      const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
      query.academicYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
    }

    const groups = await Group.find(query)
      .populate('members.student', 'fullName misNumber')
      .populate('allocatedFaculty', 'fullName department')
      .populate('project', 'title status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: groups,
      total: groups.length
    });
  } catch (error) {
    console.error('Error getting Sem 5 groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Sem 5 groups',
      error: error.message
    });
  }
};

// Get Sem 5 Statistics for Admin Dashboard
const getSem5Statistics = async (req, res) => {
  try {
    const { academicYear } = req.query;
    
    const query = {
      semester: 5
    };

    if (academicYear) {
      query.academicYear = academicYear;
    } else {
      // Default to current academic year
      const currentDate = new Date();
      const currentYearNum = currentDate.getFullYear();
      const isPreMid = currentDate.getMonth() < 6;
      const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
      query.academicYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
    }

    // Get group statistics
    const totalGroups = await Group.countDocuments({ ...query, isActive: true });
    const formedGroups = await Group.countDocuments({ ...query, isActive: true, status: { $in: ['finalized', 'locked', 'open'] } });
    const allocatedGroups = await Group.countDocuments({ ...query, isActive: true, allocatedFaculty: { $exists: true } });
    const unallocatedGroups = totalGroups - allocatedGroups;

    // Get project statistics
    const totalProjects = await Project.countDocuments({ ...query, projectType: 'minor2' });
    const registeredProjects = await Project.countDocuments({ ...query, projectType: 'minor2', status: 'registered' });
    const allocatedProjects = await Project.countDocuments({ ...query, projectType: 'minor2', status: 'faculty_allocated' });
    const activeProjects = await Project.countDocuments({ ...query, projectType: 'minor2', status: 'active' });

    res.json({
      success: true,
      data: {
        totalGroups,
        formedGroups,
        allocatedGroups,
        unallocatedGroups,
        totalProjects,
        registeredProjects,
        allocatedProjects,
        activeProjects,
        allocationRate: totalGroups > 0 ? ((allocatedGroups / totalGroups) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error getting Sem 5 statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Sem 5 statistics',
      error: error.message
    });
  }
};

// Get Sem 5 Allocated Faculty Overview
const getSem5AllocatedFaculty = async (req, res) => {
  try {
    const { batch, currentYear, academicYear } = req.query;
    
    let query = {
      semester: 5,
      isActive: true
    };

    // Add academic year filter
    if (academicYear) {
      query.academicYear = academicYear;
    } else if (batch || currentYear) {
      if (batch) {
        const startYear = batch.split('-')[0];
        // Academic year format should be "2024-25" not "2024-2028"
        const acYear = `${startYear}-${(parseInt(startYear) + 1).toString().slice(-2)}`;
        query.academicYear = acYear;
      } else if (currentYear === 'true') {
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6;
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        // Academic year format should be "2024-25" not "2024-2028"
        const acYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
        query.academicYear = acYear;
      }
    }

    // Get all groups with populated data
    // This will only get groups that are CURRENTLY in semester 5 (not migrated to sem 6)
    const groups = await Group.find(query)
      .populate({
        path: 'members.student',
        select: 'fullName misNumber contactNumber branch user semester',
        populate: {
          path: 'user',
          select: 'email'
        }
      })
      .populate({
        path: 'allocatedFaculty',
        select: 'fullName department designation'
      })
      .populate({
        path: 'project',
        select: '_id title status semester'
      })
      .sort({ allocatedFaculty: 1, createdAt: -1 }); // Sort by faculty first, then by creation date

    // Format the response with group members and allocated faculty
    const formattedGroups = groups.map(group => {
      const members = group.members?.filter(m => m.isActive) || [];
      
      const groupData = {
        _id: group._id,
        groupName: group.name || 'Unnamed Group',
        status: group.status,
        createdAt: group.createdAt,
        projectTitle: group.project?.title || 'Not registered yet',
        projectStatus: group.project?.status || 'N/A',
        allocatedFaculty: group.allocatedFaculty?.fullName || 'Not Allocated',
        facultyDepartment: group.allocatedFaculty?.department || '',
        facultyDesignation: group.allocatedFaculty?.designation || '',
        isAllocated: !!group.allocatedFaculty,
        memberCount: members.length,
        academicYear: group.academicYear
      };

      // Add all group members (up to 5)
      for (let i = 0; i < 5; i++) {
        const member = members[i];
        const memberNum = i + 1;
        
        if (member && member.student) {
          groupData[`member${memberNum}Name`] = member.student.fullName || '';
          groupData[`member${memberNum}MIS`] = member.student.misNumber || '';
          groupData[`member${memberNum}Contact`] = member.student.contactNumber || '';
          groupData[`member${memberNum}Branch`] = member.student.branch || '';
          groupData[`member${memberNum}Email`] = member.student.user?.email || '';
        } else {
          groupData[`member${memberNum}Name`] = '';
          groupData[`member${memberNum}MIS`] = '';
          groupData[`member${memberNum}Contact`] = '';
          groupData[`member${memberNum}Branch`] = '';
          groupData[`member${memberNum}Email`] = '';
        }
      }

      return groupData;
    });

    // Sort: Allocated groups first (sorted by faculty name), then unallocated groups
    const allocatedGroups = formattedGroups.filter(g => g.isAllocated);
    // Unallocated groups should only include those who have registered (have a project)
    const unallocatedGroups = formattedGroups.filter(g => 
      !g.isAllocated && g.projectTitle !== 'Not registered yet'
    );
    
    // Sort allocated groups by faculty name
    allocatedGroups.sort((a, b) => a.allocatedFaculty.localeCompare(b.allocatedFaculty));
    
    const sortedGroups = [...allocatedGroups, ...unallocatedGroups];

    // Calculate statistics
    const stats = {
      totalGroups: formattedGroups.length,
      allocatedGroups: allocatedGroups.length,
      unallocatedGroups: unallocatedGroups.length,
      allocationRate: formattedGroups.length > 0 
        ? ((allocatedGroups.length / formattedGroups.length) * 100).toFixed(2) 
        : 0
    };

    res.json({
      success: true,
      data: sortedGroups,
      stats,
      total: sortedGroups.length
    });

  } catch (error) {
    console.error('Error getting Sem 5 allocated faculty overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching allocated faculty data',
      error: error.message
    });
  }
};

// Get Sem 5 Minor Project 2 registrations
const getSem5MinorProject2Registrations = async (req, res) => {
  try {
    const { batch, currentYear } = req.query;
    
    let query = {
      projectType: 'minor2',
      semester: 5
    };

    // Add academic year filter based on batch
    if (batch || currentYear) {
      if (batch) {
        const startYear = batch.split('-')[0];
        const academicYear = `${startYear}-${parseInt(startYear) + 4}`;
        query.academicYear = academicYear;
      } else if (currentYear === 'true') {
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6;
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        const academicYear = `${academicStartYear}-${academicStartYear + 4}`;
        query.academicYear = academicYear;
      }
    }

    // Get projects with populated data
    const projects = await Project.find(query)
      .populate({
        path: 'group',
        select: 'name semester academicYear members',
        populate: {
          path: 'members.student',
          select: 'fullName misNumber contactNumber branch user semester',
          populate: {
            path: 'user',
            select: 'email'
          }
        }
      })
      .populate({
        path: 'facultyPreferences.faculty',
        select: 'fullName'
      })
      .sort({ createdAt: -1 });

    // Filter out projects where the group has been migrated to Sem 6
    // (group.semester will be 6 if it was migrated for continuation)
    const sem5OnlyProjects = projects.filter(project => {
      if (!project.group) return true; // Keep if no group data
      return project.group.semester === 5; // Only keep if group is still in Sem 5
    });

    // Format the response with all group members and faculty preferences
    const formattedRegistrations = sem5OnlyProjects.map(project => {
      const group = project.group;
      const members = group?.members?.filter(m => m.isActive) || [];
      
      // Create a flat structure with all member details
      const registration = {
        _id: project._id,
        timestamp: project.createdAt,
        email: members[0]?.student?.user?.email || 'N/A',
        projectTitle: project.title,
        academicYear: project.academicYear,
        status: project.status,
        groupId: group?._id,
        groupName: group?.name || 'N/A'
      };

      // Add all group members (up to 5)
      for (let i = 0; i < 5; i++) {
        const member = members[i];
        const memberNum = i + 1;
        
        if (member && member.student) {
          registration[`member${memberNum}Name`] = member.student.fullName || 'N/A';
          registration[`member${memberNum}MIS`] = member.student.misNumber || 'N/A';
          registration[`member${memberNum}Contact`] = member.student.contactNumber || 'N/A';
          registration[`member${memberNum}Branch`] = member.student.branch || 'N/A';
        } else {
          registration[`member${memberNum}Name`] = '';
          registration[`member${memberNum}MIS`] = '';
          registration[`member${memberNum}Contact`] = '';
          registration[`member${memberNum}Branch`] = '';
        }
      }

      // Add faculty preferences (up to 10 to support any configuration)
      const facultyPrefs = project.facultyPreferences || [];
      for (let i = 0; i < 10; i++) {
        const pref = facultyPrefs.find(p => p.priority === i + 1);
        registration[`supervisor${i + 1}`] = pref?.faculty?.fullName || '';
      }

      return registration;
    });

    res.json({
      success: true,
      data: formattedRegistrations,
      total: formattedRegistrations.length
    });

  } catch (error) {
    console.error('Error getting Sem 5 Minor Project 2 registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message
    });
  }
};

// Get Sem 6 Major Project registrations
const getSem6MajorProjectRegistrations = async (req, res) => {
  try {
    const { batch, currentYear } = req.query;
    
    let query = {
      projectType: 'minor3', // Sem 6 uses 'minor3' not 'major'
      semester: 6
    };

    // Add academic year filter based on batch
    if (batch || currentYear) {
      if (batch) {
        const startYear = batch.split('-')[0];
        // Academic year format should be "2024-25" not "2024-2028"
        const academicYear = `${startYear}-${(parseInt(startYear) + 1).toString().slice(-2)}`;
        query.academicYear = academicYear;
      } else if (currentYear === 'true') {
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6;
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        // Academic year format should be "2024-25" not "2024-2028"
        const academicYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
        query.academicYear = academicYear;
      }
    }

    // Get projects with populated data
    const projects = await Project.find(query)
      .populate({
        path: 'group',
        select: 'name semester academicYear members allocatedFaculty',
        populate: [
          {
            path: 'members.student',
            select: 'fullName misNumber contactNumber branch user semester',
            populate: {
              path: 'user',
              select: 'email'
            }
          },
          {
            path: 'allocatedFaculty',
            select: 'fullName department designation'
          }
        ]
      })
      .populate({
        path: 'faculty',
        select: 'fullName department designation'
      })
      .sort({ createdAt: -1 });

    // Filter to only include projects where group is actually in Sem 6 (or no group for new projects)
    const validProjects = projects.filter(project => {
      if (!project.group) return true; // Include if no group (edge case)
      return project.group.semester === 6; // Only include if group is in Sem 6
    });

    const formattedRegistrations = validProjects.map(project => {
      const group = project.group;
      const members = group?.members?.filter(m => m.isActive) || [];
      
      // Create a flat structure with all member details
      const registration = {
        _id: project._id,
        timestamp: project.createdAt,
        email: members[0]?.student?.user?.email || 'N/A',
        projectTitle: project.title,
        academicYear: project.academicYear,
        status: project.status,
        groupId: group?._id,
        groupName: group?.name || 'N/A',
        isContinuation: project.isContinuation || false,
        // Add allocated faculty information
        allocatedFaculty: group?.allocatedFaculty?.fullName || project.faculty?.fullName || 'Not Allocated',
        facultyDepartment: group?.allocatedFaculty?.department || project.faculty?.department || 'N/A',
        facultyDesignation: group?.allocatedFaculty?.designation || project.faculty?.designation || 'N/A'
      };

      // Add all group members (up to 5)
      for (let i = 0; i < 5; i++) {
        const member = members[i];
        const memberNum = i + 1;
        
        if (member && member.student) {
          registration[`member${memberNum}Name`] = member.student.fullName || 'N/A';
          registration[`member${memberNum}MIS`] = member.student.misNumber || 'N/A';
          registration[`member${memberNum}Contact`] = member.student.contactNumber || 'N/A';
          registration[`member${memberNum}Branch`] = member.student.branch || 'N/A';
        } else {
          registration[`member${memberNum}Name`] = '';
          registration[`member${memberNum}MIS`] = '';
          registration[`member${memberNum}Contact`] = '';
          registration[`member${memberNum}Branch`] = '';
        }
      }

      return registration;
    });

    res.json({
      success: true,
      data: formattedRegistrations,
      total: formattedRegistrations.length
    });

  } catch (error) {
    console.error('Error getting Sem 6 Major Project registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message
    });
  }
};

// Get Sem 6 Non-Registered Groups
const getSem6NonRegisteredGroups = async (req, res) => {
  try {
    const { batch, currentYear, academicYear } = req.query;
    
    let query = {
      semester: 5, // Looking at Sem 5 groups that should continue to Sem 6
      isActive: true,
      status: { $ne: 'locked' } // Exclude locked groups (historical Sem 5 groups that already moved to Sem 6)
    };

    // Add academic year filter
    if (academicYear) {
      query.academicYear = academicYear;
    } else if (batch || currentYear) {
      if (batch) {
        const startYear = batch.split('-')[0];
        // For Sem 5 groups, academic year is in format "2024-25" not "2024-2028"
        const acYear = `${startYear}-${(parseInt(startYear) + 1).toString().slice(-2)}`;
        query.academicYear = acYear;
      } else if (currentYear === 'true') {
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6;
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        // For Sem 5 groups, academic year is in format "2024-25" not "2024-2028"
        const acYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
        query.academicYear = acYear;
      }
    }

    // Get all Sem 5 groups that are still in semester 5 (not migrated)
    const sem5Groups = await Group.find(query)
      .populate({
        path: 'members.student',
        select: 'fullName misNumber contactNumber branch user semester',
        populate: {
          path: 'user',
          select: 'email'
        }
      })
      .populate('leader', 'fullName misNumber')
      .populate('allocatedFaculty', 'fullName department')
      .sort({ createdAt: -1 });

    // Get all Sem 6 projects
    const sem6Projects = await Project.find({
      projectType: 'minor3', // Sem 6 uses 'minor3' not 'major'
      semester: 6
    })
    .populate('student', 'semester')
    .select('group student');

    // Create a set of group IDs that have registered for Sem 6 (and group is actually in Sem 6)
    const registeredGroupIds = new Set();
    sem6Projects.forEach(project => {
      // Only count if the student is CURRENTLY in semester 6
      if (project.group && project.student && project.student.semester === 6) {
        registeredGroupIds.add(project.group.toString());
      }
    });

    // Get student IDs who are CURRENTLY in Sem 6 and have projects
    const sem6StudentIds = new Set();
    sem6Projects.forEach(project => {
      if (project.student && project.student.semester === 6) {
        sem6StudentIds.add(project.student._id.toString());
      }
    });

    // Filter out groups where at least one member has registered for Sem 6 AND is currently in Sem 6
    const nonRegisteredGroups = sem5Groups.filter(group => {
      const groupId = group._id.toString();
      
      // Check if group itself is registered (by a student currently in Sem 6)
      if (registeredGroupIds.has(groupId)) {
        return false;
      }
      
      // Check if any member of this group is CURRENTLY in Sem 6
      const hasCurrentSem6Member = group.members.some(member => {
        if (!member.student || !member.student._id) return false;
        // Check both: has Sem 6 project AND currently in semester 6
        const hasProject = sem6StudentIds.has(member.student._id.toString());
        const isCurrentlySem6 = member.student.semester === 6;
        return hasProject && isCurrentlySem6;
      });
      
      return !hasCurrentSem6Member;
    });

    // Format the response
    const formattedGroups = nonRegisteredGroups.map(group => {
      const members = group.members.filter(m => m.isActive) || [];
      
      const groupData = {
        _id: group._id,
        groupName: group.name || 'N/A',
        leaderName: group.leader?.fullName || 'N/A',
        leaderMIS: group.leader?.misNumber || 'N/A',
        allocatedFaculty: group.allocatedFaculty?.fullName || 'Not Allocated',
        facultyDepartment: group.allocatedFaculty?.department || 'N/A',
        memberCount: members.length,
        createdAt: group.createdAt,
        academicYear: group.academicYear
      };

      // Add all group members (up to 5)
      for (let i = 0; i < 5; i++) {
        const member = members[i];
        const memberNum = i + 1;
        
        if (member && member.student) {
          groupData[`member${memberNum}Name`] = member.student.fullName || 'N/A';
          groupData[`member${memberNum}MIS`] = member.student.misNumber || 'N/A';
          groupData[`member${memberNum}Contact`] = member.student.contactNumber || 'N/A';
          groupData[`member${memberNum}Branch`] = member.student.branch || 'N/A';
          groupData[`member${memberNum}Email`] = member.student.user?.email || 'N/A';
        } else {
          groupData[`member${memberNum}Name`] = '';
          groupData[`member${memberNum}MIS`] = '';
          groupData[`member${memberNum}Contact`] = '';
          groupData[`member${memberNum}Branch`] = '';
          groupData[`member${memberNum}Email`] = '';
        }
      }

      return groupData;
    });

    res.json({
      success: true,
      data: formattedGroups,
      total: formattedGroups.length,
      stats: {
        totalSem5Groups: sem5Groups.length,
        registeredForSem6: sem5Groups.length - nonRegisteredGroups.length,
        notRegisteredForSem6: nonRegisteredGroups.length
      }
    });

  } catch (error) {
    console.error('Error getting Sem 6 non-registered groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching non-registered groups',
      error: error.message
    });
  }
};

// Get Sem 6 Statistics for Admin Dashboard
const getSem6Statistics = async (req, res) => {
  try {
    const { academicYear } = req.query;
    
    const query = {
      semester: 6
    };

    if (academicYear) {
      query.academicYear = academicYear;
    } else {
      // Default to current academic year
      const currentDate = new Date();
      const currentYearNum = currentDate.getFullYear();
      const isPreMid = currentDate.getMonth() < 6;
      const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
      query.academicYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
    }

    // Get Sem 5 groups (potential Sem 6 groups)
    const sem5Query = {
      semester: 5,
      isActive: true,
      academicYear: query.academicYear
    };
    const totalSem5Groups = await Group.countDocuments(sem5Query);

    // Get project statistics
    const totalProjects = await Project.countDocuments({ ...query, projectType: 'minor3' });
    const registeredProjects = await Project.countDocuments({ ...query, projectType: 'minor3', status: 'registered' });
    const activeProjects = await Project.countDocuments({ ...query, projectType: 'minor3', status: 'active' });
    
    // Get continuation vs new projects
    const continuationProjects = await Project.countDocuments({ ...query, projectType: 'minor3', isContinuation: true });
    const newProjects = totalProjects - continuationProjects;

    res.json({
      success: true,
      data: {
        totalSem5Groups,
        totalProjects,
        registeredProjects,
        activeProjects,
        notRegistered: totalSem5Groups - totalProjects,
        continuationProjects,
        newProjects,
        registrationRate: totalSem5Groups > 0 ? ((totalProjects / totalSem5Groups) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error getting Sem 6 statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Sem 6 statistics',
      error: error.message
    });
  }
};

// Get M.Tech Sem 1 statistics for Admin Dashboard
const getMTechSem1Statistics = async (req, res) => {
  try {
    const { academicYear } = req.query;

    const studentQuery = {
      degree: 'M.Tech',
      semester: 1
    };
    if (academicYear) {
      studentQuery.academicYear = academicYear;
    }

    const totalStudents = await Student.countDocuments(studentQuery);

    const projectQuery = {
      projectType: 'minor1',
      semester: 1
    };
    if (academicYear) {
      projectQuery.academicYear = academicYear;
    }

    const projects = await Project.find(projectQuery)
      .populate('student', 'degree semester')
      .populate('faculty', 'fullName')
      .lean();

    const mtechProjects = projects.filter(project => project.student && project.student.degree === 'M.Tech' && project.student.semester === 1);

    const registeredProjects = mtechProjects.length;
    const facultyAllocated = mtechProjects.filter(project => project.faculty).length;
    const pendingAllocations = Math.max(registeredProjects - facultyAllocated, 0);

    const uniqueStudentIds = new Set(
      mtechProjects
        .map(project => project.student?._id?.toString())
        .filter(Boolean)
    );

    const unregisteredStudents = Math.max(totalStudents - uniqueStudentIds.size, 0);
    const registrationRate = totalStudents > 0 ? Number(((registeredProjects / totalStudents) * 100).toFixed(2)) : 0;

    res.json({
      success: true,
      data: {
        totalStudents,
        registeredProjects,
        facultyAllocated,
        pendingAllocations,
        unregisteredStudents,
        registrationRate
      }
    });
  } catch (error) {
    console.error('Error getting M.Tech Sem 1 statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching M.Tech Sem 1 statistics',
      error: error.message
    });
  }
};

// Get M.Tech Sem 2 Minor Project registrations
const getMTechSem2Registrations = async (req, res) => {
  try {
    const { academicYear, batch, currentYear } = req.query;

    const query = {
      projectType: 'minor2',
      semester: 2
    };

    if (academicYear) {
      query.academicYear = academicYear;
    } else if (batch) {
      // Batch provided in format "2024-2026" (optional) -> derive first year
      const startYear = batch.split('-')[0];
      if (startYear) {
        query.academicYear = `${startYear}-${(parseInt(startYear, 10) + 1).toString().slice(-2)}`;
      }
    } else if (currentYear === 'true') {
      const now = new Date();
      const startYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
      query.academicYear = `${startYear}-${(startYear + 1).toString().slice(-2)}`;
    }

    const projects = await Project.find(query)
      .populate({
        path: 'student',
        match: { degree: 'M.Tech', semester: 2 },
        populate: { path: 'user', select: 'email' }
      })
      .populate({
        path: 'faculty',
        select: 'fullName department designation'
      })
      .sort({ createdAt: -1 });

    const mtechProjects = projects.filter(project => project.student && project.student.degree === 'M.Tech' && project.student.semester === 2);

    const formatted = mtechProjects.map(project => ({
      _id: project._id,
      timestamp: project.createdAt,
      email: project.student?.user?.email || 'N/A',
      name: project.student?.fullName || 'N/A',
      misNumber: project.student?.misNumber || 'N/A',
      contact: project.student?.contactNumber || 'N/A',
      branch: project.student?.branch || 'N/A',
      projectTitle: project.title,
      status: project.status,
      academicYear: project.academicYear,
      projectType: project.projectType,
      semester: project.semester,
      isContinuation: project.isContinuation || false,
      facultyAllocated: project.faculty ? project.faculty.fullName : 'Not Allocated'
    }));

    res.json({
      success: true,
      data: formatted,
      total: formatted.length
    });
  } catch (error) {
    console.error('Error getting M.Tech Sem 2 registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching M.Tech Sem 2 registrations',
      error: error.message
    });
  }
};

// Get Unregistered M.Tech Sem 2 Students
const getUnregisteredMTechSem2Students = async (req, res) => {
  try {
    const { academicYear } = req.query;

    const studentQuery = {
      degree: 'M.Tech',
      semester: 2
    };

    if (academicYear) {
      studentQuery.academicYear = academicYear;
    }

    const students = await Student.find(studentQuery)
      .populate('user', 'email')
      .lean();

    const projectQuery = {
      projectType: 'minor2',
      semester: 2
    };

    if (academicYear) {
      projectQuery.academicYear = academicYear;
    }

    const projects = await Project.find(projectQuery)
      .populate('student', 'degree semester')
      .select('student');

    const registeredStudentIds = new Set(
      projects
        .filter(project => project.student && project.student.degree === 'M.Tech' && project.student.semester === 2)
        .map(project => project.student._id.toString())
    );

    const unregisteredStudents = students.filter(
      student => !registeredStudentIds.has(student._id.toString())
    );

    res.json({
      success: true,
      data: unregisteredStudents,
      count: unregisteredStudents.length,
      message: 'Unregistered M.Tech Sem 2 students retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting unregistered M.Tech Sem 2 students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unregistered M.Tech Sem 2 students',
      error: error.message
    });
  }
};

// Get M.Tech Sem 2 statistics for Admin Dashboard
const getMTechSem2Statistics = async (req, res) => {
  try {
    const { academicYear } = req.query;

    const studentQuery = {
      degree: 'M.Tech',
      semester: 2
    };
    if (academicYear) {
      studentQuery.academicYear = academicYear;
    }

    const totalStudents = await Student.countDocuments(studentQuery);

    const projectQuery = {
      projectType: 'minor2',
      semester: 2
    };
    if (academicYear) {
      projectQuery.academicYear = academicYear;
    }

    const projects = await Project.find(projectQuery)
      .populate('student', 'degree semester')
      .populate('faculty', 'fullName')
      .lean();

    const mtechProjects = projects.filter(project => project.student && project.student.degree === 'M.Tech' && project.student.semester === 2);

    const registeredProjects = mtechProjects.length;
    const facultyAllocated = mtechProjects.filter(project => project.faculty).length;
    const pendingAllocations = Math.max(registeredProjects - facultyAllocated, 0);

    const uniqueStudentIds = new Set(
      mtechProjects
        .map(project => project.student?._id?.toString())
        .filter(Boolean)
    );

    const unregisteredStudents = Math.max(totalStudents - uniqueStudentIds.size, 0);
    const registrationRate = totalStudents > 0 ? Number(((registeredProjects / totalStudents) * 100).toFixed(2)) : 0;

    res.json({
      success: true,
      data: {
        totalStudents,
        registeredProjects,
        facultyAllocated,
        pendingAllocations,
        unregisteredStudents,
        registrationRate
      }
    });
  } catch (error) {
    console.error('Error getting M.Tech Sem 2 statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching M.Tech Sem 2 statistics',
      error: error.message
    });
  }
};

// Get all system configurations
const getSystemConfigurations = async (req, res) => {
  try {
    const { category } = req.query;
    
    let configs;
    if (category) {
      configs = await SystemConfig.getConfigsByCategory(category);
    } else {
      configs = await SystemConfig.find({ isActive: true }).sort({ category: 1, configKey: 1 });
    }

    res.json({
      success: true,
      data: configs,
      total: configs.length
    });
  } catch (error) {
    console.error('Error getting system configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system configurations',
      error: error.message
    });
  }
};

// Get specific system configuration
const getSystemConfig = async (req, res) => {
  try {
    const { key } = req.params;
    
    const config = await SystemConfig.findOne({ configKey: key, isActive: true });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error getting system configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system configuration',
      error: error.message
    });
  }
};

// Helper function to update existing groups when min/max members config changes
const updateGroupsForConfigChange = async (configKey, newValue, oldValue) => {
  // Extract semester from config key
  // Supports formats: 
  // - 'sem5.minGroupMembers'
  // - 'sem7.major1.minGroupMembers'
  // - 'sem8.major2.group.minGroupMembers'
  // The regex matches sem + digits, then zero or more segments (like .major2.group), then .min/maxGroupMembers
  const semesterMatch = configKey.match(/sem(\d+)(?:\.\w+)*\.(min|max)GroupMembers/);
  if (!semesterMatch) return;
  
  const semester = parseInt(semesterMatch[1]);
  const configType = semesterMatch[2]; // 'min' or 'max'
  const fieldName = configType === 'min' ? 'minMembers' : 'maxMembers';
  
  // Get current academic year (same logic as fallback in registerMinorProject2)
  // Groups use student.academicYear, but for current year filtering,
  // we use the simple calculation: currentYear-nextYear
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const currentAcademicYear = `${currentYear}-${nextYear.toString().slice(-2)}`;
  
  // Find all non-finalized groups for this semester and academic year
  const groups = await Group.find({
    semester: semester,
    academicYear: currentAcademicYear,
    status: { $nin: ['finalized', 'locked'] }, // Only update non-finalized groups
    isActive: true
  });
  
  if (groups.length === 0) {
    return;
  }
  
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];
  
  for (const group of groups) {
    try {
      const activeMemberCount = group.members.filter(m => m.isActive).length;
      
      // Safety checks before updating
      if (configType === 'max') {
        // If new max is less than current members, skip this group
        if (newValue < activeMemberCount) {
          skippedCount++;
          continue;
        }
      } else if (configType === 'min') {
        // If new min is greater than current members and group is complete, skip
        // But allow update if group is still forming (status is not 'complete')
        if (newValue > activeMemberCount && group.status === 'complete') {
          skippedCount++;
          continue;
        }
      }
      
      // Update the field
      group[fieldName] = newValue;
      await group.save();
      updatedCount++;
    } catch (error) {
      errors.push({ groupId: group._id, error: error.message });
    }
  }
  
  return { updatedCount, skippedCount, errors };
};

// Get safe minimum faculty preference limit for a semester
const getSafeMinimumFacultyLimit = async (req, res) => {
  try {
    const { semester, projectType, variant } = req.query;
    
    if (!semester || !projectType) {
      return res.status(400).json({
        success: false,
        message: 'Semester and projectType are required'
      });
    }

    // Get current academic year (same logic as fallback in registerMinorProject2)
    // Projects use student.academicYear or group.academicYear, but for current year filtering,
    // we use the simple calculation: currentYear-nextYear
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const currentAcademicYear = `${currentYear}-${nextYear.toString().slice(-2)}`;

    // Build query - for Major Project 2, filter by group presence based on variant
    const query = {
      semester: parseInt(semester),
      projectType: projectType,
      academicYear: currentAcademicYear,
      'facultyPreferences': { $exists: true }
    };
    
    // For Major Project 2, filter by group presence if variant is specified
    if (projectType === 'major2' && variant) {
      if (variant === 'group') {
        query.group = { $exists: true, $ne: null }; // Must have a group
      } else if (variant === 'solo') {
        // Solo projects: group field doesn't exist or is null
        query.$or = [
          { group: { $exists: false } },
          { group: null }
        ];
      }
    }

    // Get projects with faculty preferences for current academic year only
    const allProjectsWithPrefs = await Project.find(query).select('facultyPreferences academicYear group');

    // Calculate the maximum number of preferences in any existing project (safe minimum limit)
    let maxPreferencesInProjects = 0;
    if (allProjectsWithPrefs.length > 0) {
      const preferenceCounts = allProjectsWithPrefs.map(p => p.facultyPreferences?.length || 0);
      maxPreferencesInProjects = Math.max(...preferenceCounts);
    }

    // Debug: Log the query results (can be removed in production)
    if (allProjectsWithPrefs.length === 0) {
      // Check if there are any projects at all for this semester/projectType (for debugging)
      const allProjectsCount = await Project.countDocuments({
        semester: parseInt(semester),
        projectType: projectType,
        'facultyPreferences': { $exists: true }
      });
      const projectsWithDifferentYear = await Project.find({
        semester: parseInt(semester),
        projectType: projectType,
        'facultyPreferences': { $exists: true }
      }).select('academicYear').limit(5);
      
      // Note: Projects may exist for different academic years
    }

    res.json({
      success: true,
      data: {
        safeMinimumLimit: maxPreferencesInProjects,
        totalProjects: allProjectsWithPrefs.length,
        academicYear: currentAcademicYear,
        semester: parseInt(semester),
        projectType: projectType
      }
    });
  } catch (error) {
    console.error('Error getting safe minimum faculty limit:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching safe minimum limit',
      error: error.message
    });
  }
};

// Update system configuration
const updateSystemConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description, force } = req.body;
    
    let config = await SystemConfig.findOne({ configKey: key });
    
    // Capture oldValue BEFORE auto-creating config (if needed for validation)
    const oldValueBeforeUpdate = config ? config.configValue : null;
    
    // If config doesn't exist, try to auto-create it from defaults or use provided values
    if (!config) {
      // Define default values for known config keys (same as in getSystemConfigForStudents)
      const defaultConfigs = {
        'sem7.major1.minGroupMembers': { value: 4, type: 'number', description: 'Minimum number of members required in a Sem 7 Major Project 1 group', category: 'sem7' },
        'sem7.major1.maxGroupMembers': { value: 5, type: 'number', description: 'Maximum number of members allowed in a Sem 7 Major Project 1 group', category: 'sem7' },
        'sem7.major1.facultyPreferenceLimit': { value: 5, type: 'number', description: 'Number of faculty preferences required for Sem 7 Major Project 1 registration', category: 'sem7' },
        'sem7.major1.allowedFacultyTypes': { value: ['Regular', 'Adjunct', 'On Lien'], type: 'array', description: 'Faculty types allowed in dropdown for Sem 7 Major Project 1 preferences', category: 'sem7' },
        'sem7.internship1.facultyPreferenceLimit': { value: 5, type: 'number', description: 'Number of faculty preferences required for Sem 7 Internship 1 registration', category: 'sem7' },
        'sem7.internship1.allowedFacultyTypes': { value: ['Regular', 'Adjunct', 'On Lien'], type: 'array', description: 'Faculty types allowed in dropdown for Sem 7 Internship 1 preferences', category: 'sem7' },
        'sem8.major2.group.minGroupMembers': { value: 4, type: 'number', description: 'Minimum number of members required in a Sem 8 Type 1 Major Project 2 group', category: 'sem8' },
        'sem8.major2.group.maxGroupMembers': { value: 5, type: 'number', description: 'Maximum number of members allowed in a Sem 8 Type 1 Major Project 2 group', category: 'sem8' },
        'sem8.major2.group.facultyPreferenceLimit': { value: 5, type: 'number', description: 'Number of faculty preferences required for Sem 8 Type 1 Major Project 2 (group) registration', category: 'sem8' },
        'sem8.major2.group.allowedFacultyTypes': { value: ['Regular', 'Adjunct', 'On Lien'], type: 'array', description: 'Faculty types allowed in dropdown for Sem 8 Type 1 Major Project 2 (group) preferences', category: 'sem8' },
        'sem8.internship2.facultyPreferenceLimit': { value: 5, type: 'number', description: 'Number of faculty preferences required for Sem 8 Internship 2 registration', category: 'sem8' },
        'sem8.internship2.allowedFacultyTypes': { value: ['Regular', 'Adjunct', 'On Lien'], type: 'array', description: 'Faculty types allowed in dropdown for Sem 8 Internship 2 preferences', category: 'sem8' },
        'sem8.major2.solo.facultyPreferenceLimit': { value: 5, type: 'number', description: 'Number of faculty preferences required for Sem 8 Type 2 Major Project 2 (solo) registration', category: 'sem8' },
        'sem8.major2.solo.allowedFacultyTypes': { value: ['Regular', 'Adjunct', 'On Lien'], type: 'array', description: 'Faculty types allowed in dropdown for Sem 8 Type 2 Major Project 2 (solo) preferences', category: 'sem8' }
      };
      
      // Check if we have default config data for this key
      const defaultConfig = defaultConfigs[key];
      if (defaultConfig) {
        // Auto-create using default values, but override with provided values
        const configValue = value !== undefined ? value : defaultConfig.value;
        const configDescription = description || defaultConfig.description;
        const configType = Array.isArray(configValue) ? 'array' : typeof configValue === 'number' ? 'number' : typeof configValue === 'boolean' ? 'boolean' : typeof configValue === 'object' ? 'object' : 'string';
        
        config = await SystemConfig.setConfigValue(
          key,
          configValue,
          configType,
          configDescription,
          defaultConfig.category,
          req.user.id
        );
      } else {
        // For unknown config keys, try to create with provided values
        if (value === undefined) {
          return res.status(404).json({
            success: false,
            message: 'Configuration not found and no default value available'
          });
        }
        
        // Determine config type and category from key
        const configType = Array.isArray(value) ? 'array' : typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : typeof value === 'object' ? 'object' : 'string';
        let category = 'general';
        if (key.startsWith('sem5')) category = 'sem5';
        else if (key.startsWith('sem7')) category = 'sem7';
        else if (key.startsWith('sem8')) category = 'sem8';
        
        config = await SystemConfig.setConfigValue(
          key,
          value,
          configType,
          description || `Configuration for ${key}`,
          category,
          req.user.id
        );
      }
    }

    // Special validation for faculty preference limits
    // Use oldValueBeforeUpdate (captured before auto-creation) or current config value
    const oldValue = oldValueBeforeUpdate !== null ? oldValueBeforeUpdate : config.configValue;
    
    const facultyPreferenceLimitKeys = [
      'sem5.facultyPreferenceLimit',
      'sem7.major1.facultyPreferenceLimit',
      'sem7.internship1.facultyPreferenceLimit',
      'sem8.major2.group.facultyPreferenceLimit',
      'sem8.internship2.facultyPreferenceLimit',
      'sem8.major2.solo.facultyPreferenceLimit'
    ];
    
    // Note: We allow reducing faculty preference limits
    // Existing projects will keep their original preference counts
    // Only new registrations will be affected by the reduced limit
    // Admin tables dynamically show all preferences regardless of the limit

    // Update config
    // oldValue already captured above for validation
    config.configValue = value;
    if (description) {
      config.description = description;
    }
    config.updatedBy = req.user.id;
    config.updatedAt = Date.now();
    
    await config.save();

    // Update existing groups when min/max group members config changes
    // This handles the edge case where existing groups need to be updated to reflect new config values
    if (key.includes('minGroupMembers') || key.includes('maxGroupMembers')) {
      try {
        await updateGroupsForConfigChange(key, value, oldValue);
      } catch (updateError) {
        // Log error but don't fail the config update
        console.error(`Error updating groups for config change ${key}:`, updateError);
      }
    }

    res.json({
      success: true,
      data: config,
      message: 'System configuration updated successfully',
      note: oldValue !== value ? `Changed from ${oldValue} to ${value}` : 'No change in value'
    });
  } catch (error) {
    console.error('Error updating system configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating system configuration',
      error: error.message
    });
  }
};

// Initialize default system configurations
const initializeSystemConfigs = async (req, res) => {
  try {
    const count = await SystemConfig.initializeDefaults();
    
    res.json({
      success: true,
      message: `Initialized ${count} default configurations`,
      count: count
    });
  } catch (error) {
    console.error('Error initializing system configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing system configurations',
      error: error.message
    });
  }
};

// Update Student Semesters (for testing and semester progression)
const updateStudentSemesters = async (req, res) => {
  try {
    const { fromSemester, toSemester, studentIds, degree, validatePrerequisites } = req.body;

    // Validation
    if (!fromSemester || !toSemester) {
      return res.status(400).json({
        success: false,
        message: 'Both fromSemester and toSemester are required'
      });
    }

    if (toSemester < 1 || toSemester > 8) {
      return res.status(400).json({
        success: false,
        message: 'toSemester must be between 1 and 8'
      });
    }

    // Build query
    let query = { semester: fromSemester };
    
    // If specific students are provided
    if (studentIds && studentIds.length > 0) {
      query._id = { $in: studentIds };
    }
    
    // Filter by degree if provided
    if (degree) {
      query.degree = degree;
    }

    // Find students matching criteria
    // Note: semesterSelections is embedded, so it's included in lean() results
    const students = await Student.find(query)
      .populate('user', 'email')
      .lean();

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found matching the criteria'
      });
    }

    // Validation results
    const validationResults = [];
    const eligibleStudents = [];
    const ineligibleStudents = [];

    // Validate prerequisites if requested
    if (validatePrerequisites) {
      for (const student of students) {
        const validation = {
          studentId: student._id,
          fullName: student.fullName,
          misNumber: student.misNumber,
          email: student.user?.email,
          currentSemester: student.semester,
          eligible: true,
          issues: []
        };

        // For Sem 5 to Sem 6 progression - check if they have a finalized group and project
        if (fromSemester === 5 && toSemester === 6) {
          // Check for Sem 5 group
          const sem5Group = await Group.findOne({
            'members.student': student._id,
            semester: 5,
            status: 'finalized'
          });

          if (!sem5Group) {
            validation.eligible = false;
            validation.issues.push('No finalized Sem 5 group found');
          }

          // Check for Sem 5 project
          const sem5Project = await Project.findOne({
            semester: 5,
            $or: [
              { student: student._id },
              { group: sem5Group?._id }
            ]
          });

          if (!sem5Project) {
            validation.eligible = false;
            validation.issues.push('No Sem 5 project found');
          }

          // Check if faculty is allocated
          if (sem5Group && !sem5Group.allocatedFaculty) {
            validation.eligible = false;
            validation.issues.push('No faculty allocated to Sem 5 group');
          }
        }

        // For Sem 7 to Sem 8 progression - check prerequisites based on Sem 7 track
        if (fromSemester === 7 && toSemester === 8) {
          // Get Sem 7 track selection (semesterSelections is embedded, so available in lean() results)
          const sem7Selection = (student.semesterSelections || []).find(s => s.semester === 7);
          const finalizedTrack = sem7Selection?.finalizedTrack;
          
          if (!finalizedTrack) {
            validation.eligible = false;
            validation.issues.push('Sem 7 track not finalized. Student must have a finalized track (internship or coursework) in Sem 7.');
          } else if (finalizedTrack === 'coursework') {
            // Type 2 students (did coursework in Sem 7) - check Major Project 1 requirements
            const sem7Group = await Group.findOne({
              'members.student': student._id,
              semester: 7,
              status: 'finalized'
            });

            if (!sem7Group) {
              validation.eligible = false;
              validation.issues.push('No finalized Sem 7 group found for Major Project 1');
            }

            // Check for Sem 7 Major Project 1
            const sem7Project = await Project.findOne({
              semester: 7,
              projectType: 'major1',
              $or: [
                { student: student._id },
                { group: sem7Group?._id }
              ]
            });

            if (!sem7Project) {
              validation.eligible = false;
              validation.issues.push('No Sem 7 Major Project 1 found');
            }

            // Check if faculty is allocated
            if (sem7Group && !sem7Group.allocatedFaculty && !sem7Project?.faculty) {
              validation.eligible = false;
              validation.issues.push('No faculty allocated to Sem 7 Major Project 1');
            }
          } else if (finalizedTrack === 'internship') {
            // Type 1 students (did 6-month internship in Sem 7) - check internship verification
            const sixMonthApp = await InternshipApplication.findOne({
              student: student._id,
              semester: 7,
              type: '6month',
              status: 'verified_pass'
            });

            if (!sixMonthApp) {
              validation.eligible = false;
              validation.issues.push('6-month internship in Sem 7 not verified (status must be verified_pass)');
            } else if (sem7Selection?.internshipOutcome !== 'verified_pass') {
              validation.eligible = false;
              validation.issues.push('Sem 7 internship outcome not set to verified_pass in semester selection');
            }
          }
        }

        validationResults.push(validation);
        
        if (validation.eligible) {
          eligibleStudents.push(student._id);
        } else {
          ineligibleStudents.push(validation);
        }
      }

      // If validation requested and some are ineligible, return validation results
      if (ineligibleStudents.length > 0) {
        return res.json({
          success: true,
          validated: true,
          totalStudents: students.length,
          eligibleCount: eligibleStudents.length,
          ineligibleCount: ineligibleStudents.length,
          eligibleStudents: eligibleStudents,
          ineligibleStudents: ineligibleStudents,
          message: `${eligibleStudents.length} students eligible for semester update, ${ineligibleStudents.length} ineligible`,
          validationResults: validationResults
        });
      }
    }

    // Update students
    const updateQuery = validatePrerequisites && eligibleStudents.length > 0
      ? { _id: { $in: eligibleStudents } }
      : query;
    
    const updateResult = await Student.updateMany(
      updateQuery,
      { 
        $set: { 
          semester: toSemester,
          updatedAt: new Date()
        } 
      }
    );

    // Get updated students for confirmation and post-processing
    const updatedStudentIds = validatePrerequisites ? eligibleStudents : students.map(s => s._id);
    const updatedStudents = await Student.find({ 
      _id: { $in: updatedStudentIds }
    })
      .populate('user', 'email')
      .select('fullName misNumber semester degree academicYear')
      .lean();

    // Post-update processing: Comprehensive status updates for semester promotion
    // When students move to next semester, update all related statuses
    if (toSemester > fromSemester) {
      try {
        const { validateAndUpdateGroupStatus, checkAllMembersPromoted } = require('../utils/groupStatusValidator');
        
        // First, get all group IDs where these students are members (from old semester)
        const oldSemesterGroupIds = await Group.find({ 
          'members.student': { $in: updatedStudentIds },
          'members.isActive': true,
          semester: fromSemester
        }).distinct('_id');
        
        // 1. Update project status for previous semester projects
        const projectUpdateResult = await Project.updateMany(
          {
            $or: [
              { student: { $in: updatedStudentIds } },
              { group: { $in: oldSemesterGroupIds } }
            ],
            semester: { $lt: toSemester },
            status: { $nin: ['completed', 'cancelled'] }
          },
          {
            $set: {
              status: 'completed',
              updatedAt: new Date()
            }
          }
        );
        
        
        // 2. Update student's currentProjects status for previous semester
        // Combine both conditions into a single array filter to avoid MongoDB error
        const currentProjectsUpdateResult = await Student.updateMany(
          { _id: { $in: updatedStudentIds } },
          {
            $set: {
              'currentProjects.$[elem].status': 'completed'
            }
          },
          {
            arrayFilters: [
              { 
                'elem.semester': { $lt: toSemester },
                'elem.status': { $ne: 'completed' }
              }
            ]
          }
        );
        
        // 3. Update student's groupMemberships for previous semester (mark as inactive)
        // Combine both conditions into a single array filter to avoid MongoDB error
        const groupMembershipsUpdateResult = await Student.updateMany(
          { _id: { $in: updatedStudentIds } },
          {
            $set: {
              'groupMemberships.$[elem].isActive': false
            }
          },
          {
            arrayFilters: [
              { 
                'elem.semester': { $lt: toSemester },
                'elem.isActive': true
              }
            ]
          }
        );
        
        // 4. For Sem 5 → Sem 6 promotion: Add Sem 6 memberships if students have Sem 5 groups
        // This ensures students have Sem 6 memberships immediately after promotion
        if (fromSemester === 5 && toSemester === 6 && oldSemesterGroupIds.length > 0) {
          // Get all students being promoted who have Sem 5 group memberships
          const studentsWithGroups = await Student.find({
            _id: { $in: updatedStudentIds },
            'groupMemberships.group': { $in: oldSemesterGroupIds },
            'groupMemberships.semester': 5
          });
          
          for (const student of studentsWithGroups) {
            // Find the Sem 5 membership (now inactive after step 3)
            const sem5Membership = student.groupMemberships.find(gm => 
              oldSemesterGroupIds.some(gid => gid.toString() === gm.group.toString()) &&
              gm.semester === 5
            );
            
            if (sem5Membership) {
              const sem5GroupId = sem5Membership.group;
              
              // Check if Sem 6 membership already exists
              const hasSem6Membership = student.groupMemberships.some(gm => 
                gm.group.toString() === sem5GroupId.toString() && 
                gm.semester === 6
              );
              
              if (!hasSem6Membership) {
                // Add Sem 6 membership pointing to the same group
                // The group will be migrated to Sem 6 during registration
                const role = sem5Membership.role || 'member';
                
                await Student.updateOne(
                  { _id: student._id },
                  {
                    $push: {
                      groupMemberships: {
                        group: sem5GroupId,
                        role: role,
                        semester: 6,
                        isActive: true,
                        joinedAt: new Date()
                      }
                    },
                    $set: {
                      groupId: sem5GroupId // Update groupId to point to the group
                    }
                  }
                );
              }
            }
          }
        } else if (oldSemesterGroupIds.length > 0) {
          // 5. Clear groupId if it points to old semester group (for non-Sem 5→6 promotions)
          await Student.updateMany(
            { 
              _id: { $in: updatedStudentIds },
              groupId: { $in: oldSemesterGroupIds }
            },
            {
              $set: { groupId: null }
            }
          );
        }
        
        // 6. Update group status if all members have been promoted
        for (const groupId of oldSemesterGroupIds) {
          try {
            const promotionCheck = await checkAllMembersPromoted(groupId, toSemester);
            
            if (promotionCheck.allPromoted) {
              const group = await Group.findById(groupId).session(session || null);
              if (group && group.semester < toSemester) {
                // For Sem 5 → Sem 6, don't mark as disbanded (group will continue)
                if (!(fromSemester === 5 && toSemester === 6)) {
                  // All members promoted - mark group as inactive/disbanded
                  group.isActive = false;
                  if (group.status !== 'disbanded') {
                    group.status = 'disbanded';
                  }
                  await group.save({ session: session || null });
                }
              }
            } else {
              // Some members still in old semester - validate and update status
              await validateAndUpdateGroupStatus(groupId);
            }
          } catch (groupError) {
            console.error(`Error processing group ${groupId.toString()}:`, groupError.message);
            // Continue with other groups even if one fails
          }
        }
        
      } catch (error) {
        console.error('Error updating statuses during semester promotion:', error);
        // Don't fail the entire operation if status update fails
      }
    }

    // Post-update processing: Auto-initialize Sem 8 for Type 1 students (Sem 7 → Sem 8)
    if (fromSemester === 7 && toSemester === 8) {
      const updatedStudentDocs = await Student.find({ _id: { $in: updatedStudentIds } });
      
      // Helper function to get current academic year
      const getCurrentAcademicYear = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11
        // Academic year starts in July (month 6)
        if (month >= 6) {
          return `${year}-${(year+1).toString().slice(-2)}`;
        } else {
          return `${(year-1)}-${year.toString().slice(-2)}`;
        }
      };

      const academicYear = getCurrentAcademicYear();
      
      // Process each student to auto-initialize Type 1 students
      for (const studentDoc of updatedStudentDocs) {
        try {
          // Refresh to get latest semester
          await studentDoc.populate('semesterSelections');
          
          // Check if this is a Type 1 student (completed 6-month internship in Sem 7)
          const sem7Selection = studentDoc.getSemesterSelection(7);
          if (sem7Selection?.finalizedTrack === 'internship' && 
              sem7Selection?.internshipOutcome === 'verified_pass') {
            // This is a Type 1 student - auto-initialize Sem 8
            const existingSem8Selection = studentDoc.getSemesterSelection(8);
            if (!existingSem8Selection) {
              await studentDoc.initializeSem8ForType1(academicYear);
            }
          }
        } catch (error) {
          console.error(`Error auto-initializing Sem 8 for student ${studentDoc._id}:`, error);
          // Continue with other students even if one fails
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully updated ${updateResult.modifiedCount} students from Semester ${fromSemester} to Semester ${toSemester}`,
      data: {
        fromSemester,
        toSemester,
        totalMatched: students.length,
        totalUpdated: updateResult.modifiedCount,
        matchedCount: updateResult.matchedCount,
        validated: validatePrerequisites || false,
        updatedStudents: updatedStudents,
        ineligibleStudents: validatePrerequisites ? ineligibleStudents : []
      }
    });
  } catch (error) {
    console.error('Error updating student semesters:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student semesters',
      error: error.message
    });
  }
};

// Get Students by Semester (helper for the UI)
const getStudentsBySemester = async (req, res) => {
  try {
    const { semester, degree } = req.query;

    let query = {};
    
    if (semester) {
      query.semester = parseInt(semester);
    }
    
    if (degree) {
      query.degree = degree;
    }

    // For Sem 8, we need semesterSelections to determine student types
    const semesterNum = semester ? parseInt(semester, 10) : null;
    const selectFields = semesterNum === 8 
      ? 'fullName misNumber semester degree branch collegeEmail contactNumber semesterSelections'
      : 'fullName misNumber semester degree branch collegeEmail contactNumber';
    
    const students = await Student.find(query)
      .populate('user', 'email')
      .select(selectFields)
      .sort({ misNumber: 1 })
      .lean();

    // Get group and project info for each student
    const studentsWithInfo = await Promise.all(students.map(async (student) => {
      // Check for current semester group (for B.Tech students)
      const group = await Group.findOne({
        'members.student': student._id,
        semester: student.semester,
        'members.isActive': true,
        isActive: true
      }).select('name status allocatedFaculty').populate('allocatedFaculty', 'fullName');

      // Check for current semester project - prioritize direct student ownership
      // For M.Tech: project.student = student._id
      // For B.Tech: project.student = student._id OR project.group = group._id
      let project = await Project.findOne({
        semester: student.semester,
        student: student._id
      }).select('title status projectType faculty').populate('faculty', 'fullName');

      // If no direct project found and student has a group, check group projects
      if (!project && group) {
        project = await Project.findOne({
          semester: student.semester,
          group: group._id
        }).select('title status projectType faculty').populate('faculty', 'fullName');
      }

      // Determine faculty: prioritize project faculty, then group faculty
      // For M.Tech: faculty is on project
      // For B.Tech: faculty can be on group or project
      let facultyName = null;
      let hasFaculty = false;
      
      if (project?.faculty) {
        facultyName = project.faculty.fullName;
        hasFaculty = true;
      } else if (group?.allocatedFaculty) {
        facultyName = group.allocatedFaculty.fullName;
        hasFaculty = true;
      }

      return {
        ...student,
        hasGroup: !!group,
        groupStatus: group?.status,
        hasFaculty: hasFaculty,
        facultyName: facultyName || 'Not Allocated',
        hasProject: !!project,
        projectTitle: project?.title,
        projectStatus: project?.status
      };
    }));

    res.json({
      success: true,
      data: studentsWithInfo,
      count: studentsWithInfo.length,
      filters: { semester, degree }
    });
  } catch (error) {
    console.error('Error getting students by semester:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
};

// ============================================
// ADMIN GROUP MANAGEMENT - SEM 5, 6, 7, 8 (Phase 2)
// ============================================

// Helper function to check Sem 7 coursework eligibility
const checkSem7CourseworkEligibility = (student) => {
  if (student.degree !== 'B.Tech') {
    return { eligible: false, reason: 'Coursework eligibility check is only for B.Tech students' };
  }
  
  if (student.semester !== 7) {
    return { eligible: false, reason: 'Not in semester 7' };
  }
  
  const finalizedTrack = student.getFinalizedTrack(7);
  const chosenTrack = (student.getSemesterSelection(7) || {}).chosenTrack;
  const selectedTrack = finalizedTrack || chosenTrack;
  
  if (!selectedTrack) {
    return { eligible: false, reason: 'Please select your track choice first' };
  }
  
  if (selectedTrack !== 'coursework') {
    return { eligible: false, reason: `Student is on ${selectedTrack} track, not coursework` };
  }
  
  return { eligible: true };
};

/**
 * Add member to group (Admin operation) - Supports Sem 5, 6, 7, 8
 * POST /admin/groups/:groupId/members
 */
const addMemberToGroup = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { groupId } = req.params;
      const { studentId, role = 'member', force = false, reason = '' } = req.body;
      
      const { validateAndUpdateGroupStatus } = require('../utils/groupStatusValidator');
      
      // 1. Validate inputs
      if (!studentId) {
        throw new Error('Student ID is required');
      }
      
      // 2. Get group
      const group = await Group.findById(groupId).session(session);
      if (!group) {
        throw new Error('Group not found');
      }
      
      // 2a. Prevent modifications to locked groups (historical Sem 5 groups)
      if (group.status === 'locked') {
        throw new Error('Cannot modify locked groups. Locked groups are historical records that have moved to Sem 6 and cannot be changed.');
      }
      
      // 3. Validate group semester (allow Sem 5, 6, 7, 8)
      const allowedSemesters = [5, 6, 7, 8];
      if (!allowedSemesters.includes(group.semester)) {
        throw new Error(`This endpoint only supports Semester ${allowedSemesters.join(', ')} groups`);
      }
      
      const groupSemester = group.semester;
      
      // 4. Get student
      const student = await Student.findById(studentId).session(session);
      if (!student) {
        throw new Error('Student not found');
      }
      
      // 5. Validate student is in same semester as group
      if (student.semester !== groupSemester) {
        throw new Error(`Student is in Semester ${student.semester}, but group is for Semester ${groupSemester}`);
      }
      
      // 6. Semester-specific validations
      if (groupSemester === 6) {
        // Sem 6: Check if student has Sem 5 group history
        const hasSem5Group = student.groupMemberships.some(
          gm => gm.semester === 5
        );
        
        if (!hasSem5Group) {
          throw new Error('Student must have been in a Sem 5 group to join Sem 6 group');
        }
      } else if (groupSemester === 7) {
        // Sem 7: Check coursework eligibility
        const eligibility = checkSem7CourseworkEligibility(student);
        if (!eligibility.eligible) {
          throw new Error(eligibility.reason || 'Student is not eligible for coursework track');
        }
      } else if (groupSemester === 8) {
        // Sem 8: Check if student is Type 1 (only Type 1 students can join groups)
        const studentType = student.getSem8StudentType();
        if (studentType !== 'type1') {
          throw new Error('Only Type 1 students (completed 6-month internship in Sem 7) can join groups for Major Project 2. Type 2 students must do solo Major Project 2.');
        }
      }
      
      // 7. Check student not already in another group for the same semester
      // Exclude locked groups to avoid conflicts with historical Sem 5 groups
      const existingGroup = await Group.findOne({
        'members.student': studentId,
        semester: groupSemester,
        'members.isActive': true,
        _id: { $ne: groupId },
        isActive: true,
        status: { $ne: 'locked' } // Exclude locked groups (historical Sem 5 groups)
      }).session(session);
      
      if (existingGroup) {
        if (!force) {
          throw new Error(`Student is already in another Sem ${groupSemester} group: ${existingGroup.name || existingGroup._id}`);
        }
      }
      
      // 7. Admin is allowed to modify groups regardless of status.
      //    We intentionally do NOT block locked/finalized groups here, because
      //    this endpoint is admin-only and is used for corrective operations.
      
      // 8. Check group has available slots (respect maxMembers for normal cases).
      //    For locked/finalized groups, allow admin to override maxMembers to fix data.
      const activeMembers = group.members.filter(m => m.isActive);
      const isLockedOrFinalized = group.status === 'locked' || group.status === 'finalized';
      
      if (!isLockedOrFinalized && activeMembers.length >= group.maxMembers) {
        throw new Error(`Group is full (max ${group.maxMembers} members). Current: ${activeMembers.length}`);
      }
      
      // 9. Check student not already in this group (check for ANY member, active or inactive)
      const existingMemberIndex = group.members.findIndex(m => 
        m.student.toString() === studentId
      );
      
      if (existingMemberIndex !== -1) {
        const existingMember = group.members[existingMemberIndex];
        if (existingMember.isActive) {
          throw new Error('Student is already an active member of this group');
        } else {
          // Student was previously in this group but marked inactive
          // Remove the old entry completely to prevent array growth
          group.members.splice(existingMemberIndex, 1);
        }
      }
      
      // 10. Check academic year match (if both have academic year set)
      if (student.academicYear && group.academicYear && 
          student.academicYear !== group.academicYear) {
        if (!force) {
          throw new Error(`Academic year mismatch: Student ${student.academicYear}, Group ${group.academicYear}`);
        }
        // Update student's academic year to match group
        student.academicYear = group.academicYear;
        await student.save({ session });
      }
      
      // 11. Add member to group (fresh entry, no duplicates)
      const newMember = {
        student: studentId,
        role: role,
        joinedAt: new Date(),
        isActive: true,
        inviteStatus: 'accepted'
      };
      
      group.members.push(newMember);
      
      // 12. If making leader, handle existing leader
      if (role === 'leader') {
        const oldLeader = group.members.find(m => 
          m.student.toString() === group.leader.toString() && m.isActive
        );
        if (oldLeader) {
          oldLeader.role = 'member';
        }
        group.leader = studentId;
      }
      
      // 13. Sync invitations: Mark any pending invites for this student in group's invites array as 'accepted'
      group.invites.forEach(invite => {
        if (invite.student.toString() === studentId && invite.status === 'pending') {
          invite.status = 'accepted';
          invite.respondedAt = new Date();
        }
      });
      
      // 14. Sync student's invites: Mark any pending invites for this group in student's invites array as 'accepted'
      student.invites.forEach(invite => {
        if (invite.group.toString() === groupId && invite.status === 'pending') {
          invite.status = 'accepted';
        }
      });
      await student.save({ session });
      
      // 15. Admin operation: adjust min/max members dynamically to reflect new size
      // This lets admin exceed configured limits safely for this specific group.
      const activeAfterAdd = group.members.filter(m => m.isActive).length;
      
      if (activeAfterAdd < group.minMembers) {
        group.minMembers = activeAfterAdd;
      }
      if (activeAfterAdd > group.maxMembers) {
        group.maxMembers = activeAfterAdd;
      }
      
      // 16. Update group status
      await validateAndUpdateGroupStatus(group._id, session);
      await group.save({ session });
      
      // 17. Clean up any existing memberships for this group (active or inactive) before adding
      // This prevents "already a member" errors when re-adding a student who was previously removed
      // Load student and manually filter to ensure proper cleanup
      const studentForCleanup = await Student.findById(studentId).session(session);
      if (!studentForCleanup) {
        throw new Error('Student not found for cleanup');
      }
      
      const targetGroupIdStr = groupId.toString ? groupId.toString() : String(groupId);
      
      studentForCleanup.groupMemberships = studentForCleanup.groupMemberships.filter(gm => {
        const gmGroupId = gm.group?.toString ? gm.group.toString() : String(gm.group);
        // Remove if it matches this group AND semester (preserve other semester memberships)
        return !(gmGroupId === targetGroupIdStr && gm.semester === groupSemester);
      });
      
      if (studentForCleanup.groupId && studentForCleanup.groupId.toString() === targetGroupIdStr) {
        studentForCleanup.groupId = null;
      }
      await studentForCleanup.save({ session });
      
      // 18. Reload student from database to ensure we have the latest clean state
      const refreshedStudent = await Student.findById(studentId).session(session);
      if (!refreshedStudent) {
        throw new Error('Student not found after cleanup');
      }
      
      // 19. Double-check: Verify no existing active membership exists
      const targetGroupIdStr2 = groupId.toString ? groupId.toString() : String(groupId);
      const hasExistingActive = refreshedStudent.groupMemberships.some(gm => {
        const gmGroupId = gm.group?.toString ? gm.group.toString() : String(gm.group);
        return gmGroupId === targetGroupIdStr2 && gm.semester === groupSemester && gm.isActive;
      });
      
      if (hasExistingActive) {
        // If still found, try one more cleanup with direct update
        await Student.updateOne(
          { _id: studentId },
          {
            $pull: {
              groupMemberships: {
                group: mongoose.Types.ObjectId(groupId),
                semester: groupSemester
              }
            }
          },
          { session }
        );
        // Reload again
        const finalCleanStudent = await Student.findById(studentId).session(session);
        if (finalCleanStudent) {
          Object.assign(refreshedStudent, finalCleanStudent.toObject());
        }
      }
      
      // 20. Manually add membership (skip addGroupMembershipAtomic to avoid its strict checks)
      // We've already done all validation and cleanup above
      const alreadyHasMembership = refreshedStudent.groupMemberships.some(gm => {
        const gmGroupId = gm.group?.toString ? gm.group.toString() : String(gm.group);
        return gmGroupId === targetGroupIdStr2 && gm.semester === groupSemester;
      });
      
      if (!alreadyHasMembership) {
        refreshedStudent.groupMemberships.push({
          group: groupId,
          role: role,
          semester: groupSemester,
          isActive: true,
          joinedAt: new Date()
        });
        
        // Update groupId reference
        refreshedStudent.groupId = groupId;
        
        await refreshedStudent.save({ session });
      } else {
        // If membership still exists, just update it to active
        const existingMembership = refreshedStudent.groupMemberships.find(gm => {
          const gmGroupId = gm.group?.toString ? gm.group.toString() : String(gm.group);
          return gmGroupId === targetGroupIdStr2 && gm.semester === groupSemester;
        });
        if (existingMembership) {
          existingMembership.isActive = true;
          existingMembership.role = role;
          existingMembership.joinedAt = new Date();
          refreshedStudent.groupId = groupId;
          await refreshedStudent.save({ session });
        }
      }
      
      // 21. Reload student to get the final updated state
      const finalStudent = await Student.findById(studentId).session(session);
      if (!finalStudent) {
        throw new Error('Student not found after adding membership');
      }
      
      // 22. If group has project, add to student's currentProjects
      if (group.project) {
        const project = await Project.findById(group.project).session(session);
        if (project && project.semester === groupSemester) {
          // Check if project already in currentProjects for this semester
          const existingProject = finalStudent.currentProjects.find(cp => 
            cp.project.toString() === project._id.toString() && cp.semester === groupSemester
          );
          if (!existingProject) {
            // Determine status based on project status
            let projectStatus = 'active';
            if (project.status === 'registered') {
              projectStatus = 'active'; // For registered projects, set as active
            } else if (project.status === 'faculty_allocated') {
              projectStatus = 'active'; // For faculty allocated, set as active
            } else if (project.status === 'active') {
              projectStatus = 'active';
            } else {
              projectStatus = 'active'; // Default to active
            }
            
            finalStudent.currentProjects.push({
              project: project._id,
              role: role,
              semester: groupSemester,
              status: projectStatus,
              joinedAt: new Date()
            });
            await finalStudent.save({ session });
          } else {
            // Update existing project status if it was cancelled
            if (existingProject.status === 'cancelled') {
              existingProject.status = 'active';
              await student.save({ session });
            }
          }
        }
      }
      
      // 19. Clean up any pending invites for this student in other groups of the same semester
      await student.cleanupInvitesAtomic(groupId, session);
      
      // Populate group for response
      await group.populate([
        { path: 'members.student', select: 'fullName misNumber collegeEmail branch' },
        { path: 'leader', select: 'fullName misNumber collegeEmail' },
        { path: 'project', select: 'title projectType status' }
      ]);
      
      res.json({
        success: true,
        message: 'Member added to group successfully',
        data: {
          group: group,
          addedMember: {
            studentId: studentId,
            studentName: student.fullName,
            role: role,
            reason: reason || 'Added by admin'
          }
        }
      });
    });
  } catch (error) {
    console.error('Error adding member to group:', error);
    res.status(400).json({
      success: false,
      message: 'Error adding member to group',
      error: error.message
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Search students for adding to group (Admin operation) - Semester-specific search
 * GET /admin/groups/:groupId/search-students
 * 
 * This endpoint provides semester-specific student search matching the group formation invite search logic.
 * For Sem 6: Shows only students with Sem 5 group history who are not already in a Sem 6 group.
 */
const searchStudentsForGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { 
      search = '', 
      branch = '',
      sortBy = 'name',
      page = 1, 
      limit = 50 
    } = req.query;
    
    // 1. Get group
    const group = await Group.findById(groupId)
      .populate('members.student', '_id')
      .select('semester degree members');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    const groupSemester = group.semester;
    const allowedSemesters = [5, 6, 7, 8];
    if (!allowedSemesters.includes(groupSemester)) {
      return res.status(400).json({
        success: false,
        message: `This endpoint only supports Semester ${allowedSemesters.join(', ')} groups`
      });
    }
    
    // 2. Build search query
    const searchTerm = typeof search === 'string' ? search.trim() : '';
    const hasSearchTerm = searchTerm.length > 0;
    const searchRegex = hasSearchTerm ? new RegExp(searchTerm, 'i') : null;
    
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const skip = (pageNum - 1) * limitNum;
    
    // Base query - match semester and degree
    const searchQuery = {
      semester: groupSemester
    };
    
    // Only add degree filter if group has a degree specified
    if (group.degree) {
      searchQuery.degree = group.degree; // Match degree (B.Tech/M.Tech)
    }
    
    // Add branch filter if specified
    if (branch) {
      searchQuery.branch = branch;
    }
    
    // Add search term filter
    if (hasSearchTerm && searchRegex) {
      searchQuery.$or = [
        { fullName: searchRegex },
        { misNumber: searchRegex },
        { collegeEmail: searchRegex },
        { contactNumber: searchRegex }
      ];
    }
    
    // Exclude current group members
    const currentMemberIds = group.members
      .filter(m => m.isActive)
      .map(m => m.student._id || m.student);
    
    if (currentMemberIds.length > 0) {
      searchQuery._id = { $nin: currentMemberIds };
    }
    
    // 3. Get students
    let sortQuery = { fullName: 1 };
    switch (sortBy) {
      case 'name':
        sortQuery = { fullName: 1 };
        break;
      case 'mis':
        sortQuery = { misNumber: 1 };
        break;
      case 'branch':
        sortQuery = { branch: 1, fullName: 1 };
        break;
      case 'semester':
        sortQuery = { semester: 1, fullName: 1 };
        break;
    }
    
    const students = await Student.find(searchQuery)
      .select('fullName misNumber collegeEmail contactNumber branch semester degree groupMemberships')
      .limit(limitNum)
      .skip(skip)
      .sort(sortQuery);
    
    // 4. Apply semester-specific eligibility checks
    const studentsWithEligibility = await Promise.all(
      students.map(async (student) => {
        let isEligible = true;
        let eligibilityReason = null;
        
        // Get full student document for methods that need it
        const fullStudent = await Student.findById(student._id)
          .populate('groupMemberships.group', 'semester');
        
        if (!fullStudent) {
          return null;
        }
        
        if (groupSemester === 6) {
          // Sem 6: Check if student has Sem 5 group history
          const hasSem5Group = fullStudent.groupMemberships.some(
            gm => gm.semester === 5
          );
          
          if (!hasSem5Group) {
            isEligible = false;
            eligibilityReason = 'Student must have been in a Sem 5 group to join Sem 6 group';
          } else {
            // Check if already in another Sem 6 group
            const inSem6Group = fullStudent.groupMemberships.some(
              gm => gm.semester === 6 && gm.isActive && 
              gm.group.toString() !== groupId
            );
            
            if (inSem6Group) {
              isEligible = false;
              eligibilityReason = 'Student is already in another Sem 6 group';
            }
          }
        } else if (groupSemester === 7) {
          // Sem 7: Check coursework eligibility
          const eligibility = checkSem7CourseworkEligibility(fullStudent);
          isEligible = eligibility.eligible;
          eligibilityReason = eligibility.reason || null;
          
          // Also check if already in another Sem 7 group
          const inSem7Group = fullStudent.groupMemberships.some(
            gm => gm.semester === 7 && gm.isActive && 
            gm.group.toString() !== groupId
          );
          
          if (inSem7Group) {
            isEligible = false;
            eligibilityReason = 'Student is already in another Sem 7 group';
          }
        } else if (groupSemester === 8) {
          // Sem 8: Check Type 1 eligibility
          const studentType = fullStudent.getSem8StudentType();
          isEligible = studentType === 'type1';
          eligibilityReason = isEligible ? null : 'Only Type 1 students can join groups for Major Project 2';
          
          // Also check if already in another Sem 8 group
          const inSem8Group = fullStudent.groupMemberships.some(
            gm => gm.semester === 8 && gm.isActive && 
            gm.group.toString() !== groupId
          );
          
          if (inSem8Group) {
            isEligible = false;
            eligibilityReason = 'Student is already in another Sem 8 group';
          }
        } else if (groupSemester === 5) {
          // Sem 5: Check if already in another Sem 5 group
          const inSem5Group = fullStudent.groupMemberships.some(
            gm => gm.semester === 5 && gm.isActive && 
            gm.group.toString() !== groupId
          );
          
          if (inSem5Group) {
            isEligible = false;
            eligibilityReason = 'Student is already in another Sem 5 group';
          }
        }
        
        // Check if student is already in any group for this semester (additional check)
        const currentGroup = await Group.findOne({
          semester: groupSemester,
          isActive: true,
          members: {
            $elemMatch: {
              student: student._id,
              isActive: true
            }
          },
          _id: { $ne: groupId }
        });
        
        if (currentGroup) {
          isEligible = false;
          eligibilityReason = `Student is already in group: ${currentGroup.name || currentGroup._id}`;
        }
        
        return {
          _id: student._id,
          fullName: student.fullName,
          misNumber: student.misNumber,
          collegeEmail: student.collegeEmail,
          contactNumber: student.contactNumber,
          branch: student.branch,
          semester: student.semester,
          isEligible,
          eligibilityReason
        };
      })
    );
    
    // Filter out null entries
    const filteredStudents = studentsWithEligibility.filter(s => s !== null);
    
    // Sort students: eligible first, then ineligible
    // Within each group (eligible/ineligible), maintain original sort order (by name, MIS, etc.)
    const sortedStudents = filteredStudents.sort((a, b) => {
      // First, sort by eligibility (eligible first)
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      
      // If both have same eligibility status, sort by the original sort criteria
      // This preserves the sortBy parameter from the query (name, MIS, branch, etc.)
      switch (sortBy) {
        case 'name':
          return a.fullName.localeCompare(b.fullName);
        case 'mis':
          return (a.misNumber || '').localeCompare(b.misNumber || '');
        case 'branch':
          const branchCompare = (a.branch || '').localeCompare(b.branch || '');
          return branchCompare !== 0 ? branchCompare : a.fullName.localeCompare(b.fullName);
        case 'semester':
          const semCompare = (a.semester || 0) - (b.semester || 0);
          return semCompare !== 0 ? semCompare : a.fullName.localeCompare(b.fullName);
        default:
          return a.fullName.localeCompare(b.fullName);
      }
    });
    
    // Count total for pagination
    const total = await Student.countDocuments(searchQuery);
    
    res.json({
      success: true,
      data: sortedStudents,
      total,
      metadata: {
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        },
        groupSemester,
        filters: {
          branches: await Student.distinct('branch', { 
            ...searchQuery,
            branch: { $exists: true, $ne: null, $ne: '' }
          })
        }
      }
    });
  } catch (error) {
    console.error('Error searching students for group:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching students',
      error: error.message
    });
  }
};

/**
 * Remove member from group (Admin operation) - Supports Sem 5, 6, 7, 8
 * DELETE /admin/groups/:groupId/members/:studentId
 */
const removeMemberFromGroup = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { groupId, studentId } = req.params;
      // Ensure req.body is always an object to avoid destructuring errors
      const { reason = '', handleProject = true, force = false } = req.body || {};
      
      const { validateAndUpdateGroupStatus } = require('../utils/groupStatusValidator');
      
      // 1. Get group
      const group = await Group.findById(groupId).session(session);
      if (!group) {
        throw new Error('Group not found');
      }
      
      // 1a. Prevent modifications to locked groups (historical Sem 5 groups)
      if (group.status === 'locked') {
        throw new Error('Cannot modify locked groups. Locked groups are historical records that have moved to Sem 6 and cannot be changed.');
      }
      
      // 2. Validate group semester (allow Sem 5, 6, 7, 8 - focus on Sem 6 for now)
      const allowedSemesters = [5, 6, 7, 8];
      if (!allowedSemesters.includes(group.semester)) {
        throw new Error(`This endpoint only supports Semester ${allowedSemesters.join(', ')} groups`);
      }
      
      const groupSemester = group.semester;
      
      // 3. Get student
      const student = await Student.findById(studentId).session(session);
      if (!student) {
        throw new Error('Student not found');
      }
      
      // 4. Check member exists in group
      const member = group.members.find(m => 
        m.student.toString() === studentId && m.isActive
      );
      
      if (!member) {
        throw new Error('Student is not an active member of this group');
      }
      
      // 5. Check if removing last member
      const activeMembers = group.members.filter(m => m.isActive);
      
      // 5a. Check if removing would leave only 1 member (not allowed - must disband instead)
      if (activeMembers.length === 2) {
        throw new Error('Only 2 members are remaining. Please disband the group instead of removing members.');
      }
      
      if (activeMembers.length === 1) {
        // Admin operation: Removing last member = disbanding group
        // For Sem 6: Perform full disband cleanup (delete group, project, etc.)
        // For other semesters: Mark as disbanded (can be extended later)
        
        // Get project info before cleanup
        const projectId = group.project;
        let projectDeleted = false;
        let facultyPreferencesDeleted = 0;
        
        // Clean up project and faculty preferences (only for current semester)
        if (handleProject && projectId) {
          const project = await Project.findById(projectId).session(session);
          if (project && project.semester === groupSemester) {
            // Delete faculty preferences for this group/project
            const facultyPreferences = await FacultyPreference.find({
              $or: [
                { group: groupId },
                { project: project._id }
              ],
              semester: groupSemester
            }).session(session);
            
            facultyPreferencesDeleted = facultyPreferences.length;
            for (const facultyPref of facultyPreferences) {
              await FacultyPreference.findByIdAndDelete(facultyPref._id, { session });
            }
            
            // Delete the project
            await Project.findByIdAndDelete(project._id, { session });
            projectDeleted = true;
          }
        }
        
        // Remove project from student's currentProjects (delete from history, not just mark cancelled)
        if (projectId) {
          student.currentProjects = student.currentProjects.filter(cp => {
            // Keep all projects that don't match this semester and project
            if (cp.semester !== groupSemester) return true;
            if (cp.project.toString() !== projectId.toString()) return true;
            return false; // Delete this project from history
          });
        }
        
        // Remove groupMemberships for this group and semester
        student.groupMemberships = student.groupMemberships.filter(gm => {
          if (gm.semester !== groupSemester) return true;
          return !(gm.group.toString() === groupId);
        });
        
        // Remove invites for this group
        student.invites = student.invites.filter(inv => {
          return inv.group.toString() !== groupId;
        });
        
        await student.save({ session });
        
        // Store group info before deletion
        const groupInfo = {
          _id: group._id,
          name: group.name,
          semester: group.semester
        };
        
        // Delete the group completely (not just mark as disbanded)
        await Group.findByIdAndDelete(groupId, { session });
        
        res.json({
          success: true,
          message: `Last member removed - Sem ${groupSemester} group disbanded and deleted`,
          data: {
            group: groupInfo,
            removedMember: {
              studentId: studentId,
              studentName: student.fullName,
              reason: reason || 'Removed by admin (last member)'
            },
            projectDeleted: projectDeleted,
            facultyPreferencesDeleted: facultyPreferencesDeleted,
            warning: groupSemester === 6 ? 'Student must be added to another Sem 6 group as they cannot create new groups.' : null
          }
        });
        return;
      }
      
      // 6. Check if removing leader
      const isLeader = group.leader.toString() === studentId;
      
      // 7. If removing leader, assign new leader
      if (isLeader) {
        const remainingMembers = group.members.filter(m => 
          m.student.toString() !== studentId && m.isActive
        );
        
        if (remainingMembers.length === 0) {
          throw new Error('Cannot remove leader when no other members exist');
        }
        
        // Assign first remaining member as leader
        const newLeader = remainingMembers[0];
        newLeader.role = 'leader';
        group.leader = newLeader.student;
        
        // Update new leader's groupMembership role
        const newLeaderStudent = await Student.findById(newLeader.student).session(session);
        if (newLeaderStudent) {
          const membership = newLeaderStudent.groupMemberships.find(gm => 
            gm.group.toString() === groupId && gm.isActive
          );
          if (membership) {
            membership.role = 'leader';
            await newLeaderStudent.save({ session });
          }
          
          // Update group name to reflect new leader (format: "Group - [Leader Name] - Sem [Semester]")
          group.name = `Group - ${newLeaderStudent.fullName} - Sem ${group.semester}`;
        }
      }
      
      // 8. Actually remove member from group (not just mark inactive)
      // Remove ALL instances of this student from the group's members array (both active and inactive)
      // This prevents array growth and ensures complete cleanup
      for (let i = group.members.length - 1; i >= 0; i--) {
        if (group.members[i].student.toString() === studentId) {
          group.members.splice(i, 1);
        }
      }
      
      // 8a. Sync invitations: Mark any pending invites for this student in group's invites array as 'auto-rejected'
      group.invites.forEach(invite => {
        if (invite.student.toString() === studentId && invite.status === 'pending') {
          invite.status = 'auto-rejected';
          invite.respondedAt = new Date();
        }
      });
      
      // 8b. Sync student's invites: Mark any pending invites for this group in student's invites array as 'auto-rejected'
      student.invites.forEach(invite => {
        if (invite.group.toString() === groupId && invite.status === 'pending') {
          invite.status = 'auto-rejected';
        }
      });
      
      // 9. Admin operation: adjust min/max members dynamically to reflect new size
      // This lets admin reduce group size below configured min safely for this specific group.
      // Note: minMembers cannot be set below 2 (schema constraint), so we only adjust if >= 2
      const activeAfterRemove = group.members.filter(m => m.isActive).length;
      if (activeAfterRemove < group.minMembers && activeAfterRemove >= 2) {
        group.minMembers = activeAfterRemove;
      }
      if (activeAfterRemove > group.maxMembers) {
        group.maxMembers = activeAfterRemove;
      }
      
      // 10. Update group status
      await validateAndUpdateGroupStatus(group._id, session);
      await group.save({ session });
      
      // 11. Clean up group references from student records for CURRENT semester only
      // IMPORTANT: For migrated groups (same document used for Sem 5 and Sem 6), we only remove
      // Sem 6 memberships to preserve Sem 5 historical data
      // 11a. Remove groupMemberships for this group and CURRENT semester only (preserve historical Sem 5 data)
      // Also remove any duplicate entries to prevent array growth
      const beforeMemberships = student.groupMemberships.length;
      const seenGroupIds = new Set();
      student.groupMemberships = student.groupMemberships.filter(gm => {
        const gmGroupId = gm.group.toString();
        // Only remove if it matches the group AND the current semester (preserve Sem 5 history)
        if (gmGroupId === groupId.toString() && gm.semester === groupSemester) {
          return false; // Remove Sem 6 membership only
        }
        // Keep Sem 5 memberships even if same group (for historical records)
        // Also remove duplicates (keep first occurrence)
        if (seenGroupIds.has(gmGroupId)) {
          return false;
        }
        seenGroupIds.add(gmGroupId);
        return true;
      });
      
      // 11b. Clear groupId if it matches this group
      if (student.groupId && student.groupId.toString() === groupId.toString()) {
        student.groupId = null;
      }
      
      // 11c. Remove ALL invites for this group (not just mark as rejected, actually remove)
      // Also remove duplicates
      const beforeInvites = student.invites.length;
      const seenInviteKeys = new Set();
      student.invites = student.invites.filter(inv => {
        const invGroupId = inv.group.toString();
        // Remove if it matches the group we're removing from
        if (invGroupId === groupId.toString()) {
          return false;
        }
        // Also remove duplicates (keep first occurrence)
        const inviteKey = `${invGroupId}-${inv.student?.toString() || ''}`;
        if (seenInviteKeys.has(inviteKey)) {
          return false;
        }
        seenInviteKeys.add(inviteKey);
        return true;
      });
      
      // 11d. Remove project from currentProjects for this semester and group
      // This ensures clean state for all semesters (not just Sem 6)
      const beforeProjects = student.currentProjects.length;
      const seenProjectKeys = new Set();
      student.currentProjects = student.currentProjects.filter(cp => {
        // If group has a project, remove that specific project
        if (group.project && cp.project) {
          if (cp.project.toString() === group.project.toString() && cp.semester === groupSemester) {
            return false; // Remove this project
          }
        }
        // For the specific semester, also remove projects if no project is registered for the group
        // This handles edge cases where project reference exists but group.project is null
        if (!group.project) {
          // Get project type for this semester (helper function defined in this file)
          const projectTypeMap = {
            5: 'minor2',   // Sem 5: Minor Project 2
            6: 'minor3',   // Sem 6: Minor Project 3
            7: 'major1',   // Sem 7: Major Project 1
            8: 'major2'    // Sem 8: Major Project 2
          };
          const projectType = projectTypeMap[groupSemester] || null;
          if (cp.semester === groupSemester && cp.projectType === projectType) {
            // Since we're removing the student from this group, and this is the only group for this semester,
            // remove the project (student is no longer in any group for this semester)
            return false; // Remove this project
          }
        }
        // Also remove duplicates (keep first occurrence)
        const projectKey = `${cp.project?.toString() || ''}-${cp.semester}-${cp.projectType || ''}`;
        if (seenProjectKeys.has(projectKey)) {
          return false;
        }
        seenProjectKeys.add(projectKey);
        return true; // Keep all other projects
      });
      
      await student.save({ session });
      
      // 12. Project cleanup is already handled in step 11d above
      // (We remove projects in step 11d to ensure clean state even if group has no project registered)
      
      // Populate group for response
      await group.populate([
        { path: 'members.student', select: 'fullName misNumber collegeEmail branch' },
        { path: 'leader', select: 'fullName misNumber collegeEmail' },
        { path: 'project', select: 'title projectType status' }
      ]);
      
      res.json({
        success: true,
        message: 'Member removed from group successfully',
        data: {
          group: group,
          removedMember: {
            studentId: studentId,
            studentName: student.fullName,
            wasLeader: isLeader,
            newLeader: isLeader ? {
              studentId: group.leader,
              studentName: group.leader?.fullName
            } : null,
            reason: reason || 'Removed by admin'
          }
        }
      });
    });
  } catch (error) {
    console.error('Error removing member from group:', error);
    res.status(400).json({
      success: false,
      message: 'Error removing member from group',
      error: error.message
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Change group leader (Admin operation)
 * PUT /admin/groups/:groupId/leader
 */
const changeGroupLeader = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { groupId } = req.params;
      const { newLeaderId, reason = '' } = req.body;
      
      // 1. Validate inputs
      if (!newLeaderId) {
        throw new Error('New leader ID is required');
      }
      
      // 2. Get group
      const group = await Group.findById(groupId).session(session);
      if (!group) {
        throw new Error('Group not found');
      }
      
      // 2a. Prevent modifications to locked groups (historical Sem 5 groups)
      if (group.status === 'locked') {
        throw new Error('Cannot modify locked groups. Locked groups are historical records that have moved to Sem 6 and cannot be changed.');
      }
      
      // 3. Validate group semester (allow Sem 5, 6, 7, 8)
      const allowedSemesters = [5, 6, 7, 8];
      if (!allowedSemesters.includes(group.semester)) {
        throw new Error(`This endpoint only supports Semester ${allowedSemesters.join(', ')} groups`);
      }
      
      const groupSemester = group.semester;
      
      // 4. Check new leader is active member
      const newLeader = group.members.find(m => 
        m.student.toString() === newLeaderId && m.isActive
      );
      
      if (!newLeader) {
        throw new Error('New leader must be an active member of the group');
      }
      
      // 5. Check not already leader
      if (group.leader.toString() === newLeaderId) {
        throw new Error('Student is already the group leader');
      }
      
      // 6. Get students
      const oldLeaderStudent = await Student.findById(group.leader).session(session);
      const newLeaderStudent = await Student.findById(newLeaderId).session(session);
      
      if (!oldLeaderStudent || !newLeaderStudent) {
        throw new Error('Student not found');
      }
      
      // 7. Update old leader role in group
      const oldLeaderMember = group.members.find(m => 
        m.student.toString() === group.leader.toString()
      );
      if (oldLeaderMember) {
        oldLeaderMember.role = 'member';
      }
      
      // 8. Update new leader role in group
      newLeader.role = 'leader';
      group.leader = newLeaderId;
      
      // 8a. Update group name to reflect new leader (format: "Group - [Leader Name] - Sem [Semester]")
      group.name = `Group - ${newLeaderStudent.fullName} - Sem ${group.semester}`;
      
      // 9. Update old leader's groupMembership
      const oldMembership = oldLeaderStudent.groupMemberships.find(gm => 
        gm.group.toString() === groupId && gm.isActive
      );
      if (oldMembership) {
        oldMembership.role = 'member';
        await oldLeaderStudent.save({ session });
      }
      
      // 10. Update new leader's groupMembership
      const newMembership = newLeaderStudent.groupMemberships.find(gm => 
        gm.group.toString() === groupId && gm.isActive
      );
      if (newMembership) {
        newMembership.role = 'leader';
        await newLeaderStudent.save({ session });
      }
      
      // 11. Update project's student field if group has a project
      if (group.project) {
        const Project = require('../models/Project');
        const project = await Project.findById(group.project).session(session);
        if (project) {
          project.student = newLeaderId;
          await project.save({ session });
        }
      }
      
      // 12. Save group
      await group.save({ session });
      
      // Populate group for response
      await group.populate([
        { path: 'members.student', select: 'fullName misNumber collegeEmail branch' },
        { path: 'leader', select: 'fullName misNumber collegeEmail' }
      ]);
      
      res.json({
        success: true,
        message: 'Group leader changed successfully',
        data: {
          group: group,
          oldLeader: {
            studentId: oldLeaderStudent._id,
            studentName: oldLeaderStudent.fullName
          },
          newLeader: {
            studentId: newLeaderStudent._id,
            studentName: newLeaderStudent.fullName
          },
          reason: reason || 'Changed by admin'
        }
      });
    });
  } catch (error) {
    console.error('Error changing group leader:', error);
    res.status(400).json({
      success: false,
      message: 'Error changing group leader',
      error: error.message
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Helper function to get expected project type for a semester
 */
const getProjectTypeForSemester = (semester) => {
  const projectTypeMap = {
    5: 'minor2',   // Sem 5: Minor Project 2
    6: 'minor3',   // Sem 6: Minor Project 3
    7: 'major1',   // Sem 7: Major Project 1
    8: 'major2'    // Sem 8: Major Project 2
  };
  return projectTypeMap[semester] || null;
};

/**
 * Disband group (Admin operation) - Supports Sem 5, 6, 7, 8
 * DELETE /admin/groups/:groupId/disband
 */
const disbandGroup = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { groupId } = req.params;
      const { reason = '' } = req.body || {};
      
      // 1. Get group with populated data
      const group = await Group.findById(groupId)
        .populate('project')
        .populate('leader', 'fullName misNumber')
        .populate('members.student', 'fullName misNumber collegeEmail')
        .session(session);
      
      if (!group) {
        throw new Error('Group not found');
      }
      
      // 1a. Prevent modifications to locked groups (historical Sem 5 groups)
      if (group.status === 'locked') {
        throw new Error('Cannot modify locked groups. Locked groups are historical records that have moved to Sem 6 and cannot be changed.');
      }
      
      // 2. Validate group semester (allow Sem 5, 6, 7, 8)
      const allowedSemesters = [5, 6, 7, 8];
      if (!allowedSemesters.includes(group.semester)) {
        throw new Error(`This endpoint only supports Semester ${allowedSemesters.join(', ')} groups`);
      }
      
      const groupSemester = group.semester;
      
      // 3. Check if group is already deleted/disbanded (shouldn't happen, but safety check)
      if (group.status === 'disbanded') {
        throw new Error('Group is already disbanded');
      }
      
      // 4. Get all active members
      const activeMembers = group.members.filter(m => m.isActive);
      const memberIds = activeMembers.map(m => m.student._id || m.student);
      
      // If group has no active members, it's already empty - just clean up and delete
      if (activeMembers.length === 0) {
        // Clean up project and faculty preferences if they exist
        let projectDeleted = false;
        let facultyPreferencesDeleted = 0;
        
        if (group.project) {
          const project = await Project.findById(group.project).session(session);
          if (project && project.semester === group.semester) {
            // Delete project
            await Project.findByIdAndDelete(project._id, { session });
            projectDeleted = true;
          }
        }
        
        // Delete faculty preferences for this group
        const facultyPrefs = await FacultyPreference.find({
          group: groupId,
          semester: group.semester
        }).session(session);
        
        facultyPreferencesDeleted = facultyPrefs.length;
        for (const facultyPref of facultyPrefs) {
          await FacultyPreference.findByIdAndDelete(facultyPref._id, { session });
        }
        
        // Delete the group
        const groupInfo = {
          _id: group._id,
          name: group.name,
          semester: group.semester
        };
        
        await Group.findByIdAndDelete(groupId, { session });
        
        return res.json({
          success: true,
          message: 'Empty group deleted successfully',
          data: {
            group: groupInfo,
            membersProcessed: 0,
            projectDeleted: projectDeleted,
            facultyPreferencesDeleted: facultyPreferencesDeleted,
            reason: reason || 'Empty group deleted by admin'
          }
        });
      }
      
      // 5. Handle project and faculty preferences
      let projectDeleted = false;
      let facultyPreferencesDeleted = 0;
      const projectId = group.project;
      const expectedProjectType = getProjectTypeForSemester(groupSemester);
      
      if (projectId) {
        const project = await Project.findById(projectId).session(session);
        
        if (project) {
          // 5a. Delete FacultyPreference documents for this group/project (only for current semester)
          const facultyPreferences = await FacultyPreference.find({
            $or: [
              { group: groupId },
              { project: project._id }
            ],
            semester: groupSemester
          }).session(session);
          
          facultyPreferencesDeleted = facultyPreferences.length;
          
          for (const facultyPref of facultyPreferences) {
            await FacultyPreference.findByIdAndDelete(facultyPref._id, { session });
          }
          
          // 5b. Delete the project (only if it matches the semester and expected project type)
          if (project.semester === groupSemester) {
            // If expected project type is defined, validate it matches
            if (!expectedProjectType || project.projectType === expectedProjectType) {
              await Project.findByIdAndDelete(project._id, { session });
              projectDeleted = true;
            }
          }
        }
      }
      
      // 5c. Also check for any remaining FacultyPreference documents linked to this group (in case project was already deleted)
      const remainingFacultyPrefs = await FacultyPreference.find({
        group: groupId,
        semester: groupSemester
      }).session(session);
      
      if (remainingFacultyPrefs.length > 0) {
        for (const facultyPref of remainingFacultyPrefs) {
          await FacultyPreference.findByIdAndDelete(facultyPref._id, { session });
        }
        facultyPreferencesDeleted += remainingFacultyPrefs.length;
      }
      
      // 6. Process each active member
      const memberDetails = [];
      for (const member of activeMembers) {
        const studentId = member.student._id || member.student;
        const student = await Student.findById(studentId).session(session);
        
        if (!student) {
          continue;
        }
        
        // Store member details for response
        memberDetails.push({
          _id: student._id,
          fullName: student.fullName,
          misNumber: student.misNumber,
          collegeEmail: student.collegeEmail || member.student.collegeEmail
        });
        
        // 6a. Remove project from currentProjects (delete from history, not just mark as cancelled)
        if (projectId) {
          student.currentProjects = student.currentProjects.filter(cp => {
            // Keep all projects that don't match this semester and project
            if (cp.semester !== groupSemester) return true;
            
            // For current semester: Remove only if this project is associated with the group's project
            if (cp.project.toString() === projectId.toString()) {
              return false; // Delete this project from history
            }
            
            return true; // Keep other projects from same semester (if any)
          });
        } else {
          // If no project linked, remove all current semester projects (safety measure)
          student.currentProjects = student.currentProjects.filter(cp => {
            return cp.semester !== groupSemester;
          });
        }
        
        // 6b. Remove groupMemberships completely (only for current semester and this group)
        student.groupMemberships = student.groupMemberships.filter(gm => {
          // Keep all memberships that don't match this semester
          if (gm.semester !== groupSemester) return true;
          
          // For current semester: Remove only if it's for this specific group
          return !(gm.group.toString() === groupId);
        });
        
        // 6c. Clear groupId if it points to this group
        if (student.groupId && student.groupId.toString() === groupId) {
          student.groupId = null;
        }
        
        // 6d. Remove invites from student's invites array (only for this group)
        student.invites = student.invites.filter(inv => {
          // Keep all invites not for this group
          return inv.group.toString() !== groupId;
        });
        
        await student.save({ session });
      }
      
      // 7. Store group info for response before deletion
      const groupInfo = {
        _id: group._id,
        name: group.name,
        semester: group.semester
      };
      
      // 8. Delete the group completely (not just mark as disbanded)
      await Group.findByIdAndDelete(groupId, { session });
      
      res.json({
        success: true,
        message: `Sem ${groupSemester} group disbanded and deleted successfully`,
        data: {
          group: groupInfo,
          membersProcessed: activeMembers.length,
          members: memberDetails, // Include member details for frontend display
          projectDeleted: projectDeleted,
          facultyPreferencesDeleted: facultyPreferencesDeleted,
          reason: reason || 'Disbanded by admin',
          warning: groupSemester === 6 ? 'Students must be added to another Sem 6 group as they cannot create new groups.' : null
        }
      });
    });
  } catch (error) {
    console.error('Error disbanding group:', error);
    res.status(400).json({
      success: false,
      message: 'Error disbanding group',
      error: error.message
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Update group information (Admin operation)
 * PUT /admin/groups/:groupId
 */
const updateGroupInfo = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, minMembers, maxMembers, status, force = false } = req.body;
    
    const { validateAndUpdateGroupStatus } = require('../utils/groupStatusValidator');
    
    // 1. Get group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // 1a. Prevent modifications to locked groups (historical Sem 5 groups)
    if (group.status === 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify locked groups. Locked groups are historical records that have moved to Sem 6 and cannot be changed.'
      });
    }
    
    // 2. Validate group semester (allow Sem 5, 6, 7, 8)
    const allowedSemesters = [5, 6, 7, 8];
    if (!allowedSemesters.includes(group.semester)) {
      return res.status(400).json({
        success: false,
        message: `This endpoint only supports Semester ${allowedSemesters.join(', ')} groups`
      });
    }
    
    const groupSemester = group.semester;
    
    // 3. Validate min/max members if provided
    if (minMembers !== undefined || maxMembers !== undefined) {
      const activeMembers = group.members.filter(m => m.isActive);
      const currentCount = activeMembers.length;
      
      if (minMembers !== undefined) {
        if (minMembers < 2 || minMembers > 10) {
          return res.status(400).json({
            success: false,
            message: 'minMembers must be between 2 and 10'
          });
        }
        if (currentCount < minMembers && !force) {
          return res.status(400).json({
            success: false,
            message: `Cannot set minMembers to ${minMembers} when group has ${currentCount} members. Use force flag to override.`
          });
        }
      }
      
      if (maxMembers !== undefined) {
        if (maxMembers < 2 || maxMembers > 10) {
          return res.status(400).json({
            success: false,
            message: 'maxMembers must be between 2 and 10'
          });
        }
        if (currentCount > maxMembers && !force) {
          return res.status(400).json({
            success: false,
            message: `Cannot set maxMembers to ${maxMembers} when group has ${currentCount} members. Use force flag to override.`
          });
        }
      }
      
      if (minMembers !== undefined && maxMembers !== undefined && minMembers > maxMembers) {
        return res.status(400).json({
          success: false,
          message: 'minMembers cannot be greater than maxMembers'
        });
      }
    }
    
    // 4. Validate status transitions if provided
    if (status !== undefined) {
      const validStatuses = ['invitations_sent', 'open', 'forming', 'complete', 'locked', 'finalized', 'disbanded'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      
      // Define valid transitions
      const validTransitions = {
        'invitations_sent': ['open', 'forming'],
        'open': ['forming', 'complete', 'finalized'],
        'forming': ['complete', 'open'],
        'complete': ['finalized', 'locked'],
        'finalized': ['locked'], // Usually one-way
        'locked': [] // Usually one-way
      };
      
      if (!force && group.status !== status) {
        const allowedTransitions = validTransitions[group.status] || [];
        if (!allowedTransitions.includes(status) && status !== 'disbanded') {
          return res.status(400).json({
            success: false,
            message: `Invalid status transition from ${group.status} to ${status}. Use force flag to override.`,
            allowedTransitions: allowedTransitions
          });
        }
      }
    }
    
    // 5. Update fields
    if (name !== undefined) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (minMembers !== undefined) group.minMembers = minMembers;
    if (maxMembers !== undefined) group.maxMembers = maxMembers;
    if (status !== undefined) group.status = status;
    
    // 6. Validate status after update
    await validateAndUpdateGroupStatus(group._id);
    
    // 7. Save group
    await group.save();
    
    // Populate for response
    await group.populate([
      { path: 'members.student', select: 'fullName misNumber collegeEmail branch' },
      { path: 'leader', select: 'fullName misNumber collegeEmail' },
      { path: 'project', select: 'title projectType status' }
    ]);
    
    res.json({
      success: true,
      message: 'Group information updated successfully',
      data: {
        group: group
      }
    });
  } catch (error) {
    console.error('Error updating group information:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating group information',
      error: error.message
    });
  }
};

/**
 * Get group details with full information (Admin operation)
 * GET /admin/groups/:groupId
 */
const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId)
      .populate('members.student', 'fullName misNumber collegeEmail branch semester degree')
      .populate('leader', 'fullName misNumber collegeEmail branch')
      .populate('createdBy', 'fullName misNumber')
      .populate('allocatedFaculty', 'fullName department designation')
      .populate('project', 'title description projectType status faculty')
      .populate('invites.student', 'fullName misNumber collegeEmail');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Get validation status
    const { validateGroupForSemester } = require('../utils/groupStatusValidator');
    const validation = await validateGroupForSemester(groupId, group.semester);
    
    // Calculate statistics
    const activeMembers = group.members.filter(m => m.isActive);
    const pendingInvites = group.invites.filter(i => i.status === 'pending');
    
    res.json({
      success: true,
      data: {
        group: group,
        statistics: {
          totalMembers: group.members.length,
          activeMembers: activeMembers.length,
          inactiveMembers: group.members.length - activeMembers.length,
          pendingInvites: pendingInvites.length,
          availableSlots: group.maxMembers - activeMembers.length,
          isComplete: activeMembers.length >= group.minMembers && activeMembers.length <= group.maxMembers
        },
        validation: validation
      }
    });
  } catch (error) {
    console.error('Error getting group details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching group details',
      error: error.message
    });
  }
};

/**
 * Allocate faculty to group (Admin operation)
 * POST /admin/groups/:groupId/allocate-faculty
 */
const allocateFacultyToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { facultyId } = req.body;

    if (!facultyId) {
      return res.status(400).json({
        success: false,
        message: 'Faculty ID is required'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Prevent modifications to locked groups (historical Sem 5 groups)
    if (group.status === 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify locked groups. Locked groups are historical records that have moved to Sem 6 and cannot be changed.'
      });
    }

    if (group.allocatedFaculty) {
      return res.status(400).json({
        success: false,
        message: 'Group already has an allocated faculty. Please deallocate first.'
      });
    }

    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Find the FacultyPreference for this group
    const preference = await FacultyPreference.findOne({
      group: groupId,
      semester: group.semester,
      status: { $in: ['pending', 'allocated'] }
    });

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update Group
      group.allocatedFaculty = facultyId;
      if (group.status === 'complete') {
        group.status = 'locked';
      }
      await group.save({ session });

      // Update Project if exists
      if (group.project) {
        const project = await Project.findById(group.project).session(session);
        if (project) {
          project.faculty = facultyId;
          project.status = 'faculty_allocated';
          project.allocatedBy = 'admin_allocation';
          await project.save({ session });

          // Update all group members' currentProjects status
          const activeMembers = group.members.filter(m => m.isActive);
          for (const member of activeMembers) {
            const memberStudent = await Student.findById(member.student).session(session);
            if (memberStudent) {
              const currentProject = memberStudent.currentProjects.find(cp => 
                cp.project.toString() === project._id.toString()
              );
              if (currentProject) {
                currentProject.status = 'active';
              }
              await memberStudent.save({ session });
            }
          }
        }
      }

      // Update FacultyPreference if exists
      if (preference) {
        preference.allocatedFaculty = facultyId;
        preference.allocatedBy = 'admin_allocation';
        preference.status = 'allocated';
        preference.allocatedAt = new Date();
        await preference.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: `Faculty ${faculty.fullName} allocated to group successfully`
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error allocating faculty to group:', error);
    res.status(500).json({
      success: false,
      message: 'Error allocating faculty to group',
      error: error.message
    });
  }
};

/**
 * Deallocate faculty from group (Admin operation)
 * DELETE /admin/groups/:groupId/deallocate-faculty
 */
const deallocateFacultyFromGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Prevent modifications to locked groups (historical Sem 5 groups)
    if (group.status === 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify locked groups. Locked groups are historical records that have moved to Sem 6 and cannot be changed.'
      });
    }

    if (!group.allocatedFaculty) {
      return res.status(400).json({
        success: false,
        message: 'Group does not have an allocated faculty'
      });
    }

    // Find the FacultyPreference for this group
    const preference = await FacultyPreference.findOne({
      group: groupId,
      semester: group.semester
    });

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update Group
      group.allocatedFaculty = null;
      if (group.status === 'locked') {
        group.status = 'complete';
      }
      await group.save({ session });

      // Update Project if exists
      if (group.project) {
        const project = await Project.findById(group.project).session(session);
        if (project) {
          project.faculty = null;
          project.status = 'registered';
          project.allocatedBy = undefined;
          await project.save({ session });

          // Note: We don't change currentProjects.status when deallocating
          // The status should remain 'active' since the project is still registered
          // Only the Project.status changes from 'faculty_allocated' to 'registered'
        }
      }

      // Update FacultyPreference if exists
      if (preference) {
        preference.allocatedFaculty = null;
        preference.allocatedBy = undefined;
        preference.status = 'pending';
        preference.allocatedAt = undefined;
        await preference.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: 'Faculty deallocated from group successfully'
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error deallocating faculty from group:', error);
    res.status(500).json({
      success: false,
      message: 'Error deallocating faculty from group',
      error: error.message
    });
  }
};

module.exports = {
  getAdminProfile,
  updateAdminProfile,
  getDashboardData,
  getUsers,
  getStudents,
  searchStudents,
  getFaculty,
  searchFaculties,
  getFacultyDetails,
  updateFacultyProfile,
  resetFacultyPassword,
  getStudentDetails,
  getProjects,
  getGroups,
  getGroupDetails,
  searchStudentsForGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  changeGroupLeader,
  disbandGroup,
  allocateFacultyToGroup,
  deallocateFacultyFromGroup,
  updateGroupInfo,
  getSystemStats,
  getAllocations,
  getUnallocatedGroups,
  forceAllocateFaculty,
  updateProjectStatus,
  // Sem 5 specific functions
  getAllocationStatistics,
  getSem5MinorProject2Registrations,
  getSem5AllocatedFaculty,
  getSem5NonRegisteredStudents,
  getSem5Groups,
  // Sem 6 specific functions
  getSem6MajorProjectRegistrations,
  getSem6NonRegisteredGroups,
  getSem6Statistics,
  getSem5Statistics,
  // Sem 4 specific functions
  getSem4MinorProject1Registrations,
  getUnregisteredSem4Students,
  // M.Tech Sem 1 specific functions
  getMTechSem1Registrations,
  getUnregisteredMTechSem1Students,
  getMTechSem1Statistics,
  // M.Tech Sem 2 specific functions
  getMTechSem2Registrations,
  getUnregisteredMTechSem2Students,
  getMTechSem2Statistics,
  // System Configuration functions
  getSystemConfigurations,
  getSystemConfig,
  updateSystemConfig,
  initializeSystemConfigs,
  getSafeMinimumFacultyLimit,
  // Semester Management functions
  updateStudentSemesters,
  getStudentsBySemester,
  // Admin Group Management functions (Sem 5)
  addMemberToGroup,
  removeMemberFromGroup,
  changeGroupLeader,
  updateGroupInfo,
  getGroupDetails,
  disbandGroup,
  allocateFacultyToGroup,
  deallocateFacultyFromGroup,
  updateStudentProfile,
  resetStudentPassword,
};
