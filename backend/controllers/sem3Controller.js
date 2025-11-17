const SystemConfig = require('../models/SystemConfig');
const Student = require('../models/Student');

const getCurrentAcademicYear = async () => {
  const year = await SystemConfig.getConfigValue('academic.currentYear');
  if (year) return year;
  const now = new Date();
  const next = now.getFullYear() + 1;
  return `${now.getFullYear()}-${next.toString().slice(-2)}`;
};

exports.setSem3Choice = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chosenTrack } = req.body;

    if (!['internship', 'coursework'].includes(chosenTrack)) {
      return res.status(400).json({ success: false, message: 'Invalid chosenTrack' });
    }

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (student.degree !== 'M.Tech' || student.semester !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Sem 3 choice allowed only for M.Tech Semester 3 students'
      });
    }

    const academicYear = await getCurrentAcademicYear();
    await student.setSemesterSelection(3, academicYear, chosenTrack);

    const selection = student.getSemesterSelection(3);
    return res.json({ success: true, data: selection });
  } catch (error) {
    console.error('setSem3Choice error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSem3Choice = async (req, res) => {
  try {
    const userId = req.user.userId;
    const student = await Student.findOne({ user: userId });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (student.degree !== 'M.Tech' || student.semester < 3) {
      return res.status(400).json({
        success: false,
        message: 'Sem 3 choice available only for M.Tech Semester 3 or above'
      });
    }

    const selection = student.getSemesterSelection(3) || null;
    return res.json({ success: true, data: selection });
  } catch (error) {
    console.error('getSem3Choice error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.listSem3TrackChoices = async (req, res) => {
  try {
    const { status, track, academicYear } = req.query;
    const academicYearFilter = academicYear || await getCurrentAcademicYear();

    const query = {
      degree: 'M.Tech',
      semester: 3,
      'semesterSelections.semester': 3,
      'semesterSelections.academicYear': academicYearFilter
    };

    const students = await Student.find(query)
      .populate('user', 'email')
      .select('fullName misNumber contactNumber branch collegeEmail semesterSelections user')
      .lean();

    let trackChoices = students
      .map(student => {
        const selection = student.semesterSelections?.find(
          s => s.semester === 3 && s.academicYear === academicYearFilter
        );
        if (!selection) return null;

        return {
          _id: student._id,
          studentId: student._id,
          fullName: student.fullName,
          misNumber: student.misNumber,
          contactNumber: student.contactNumber,
          branch: student.branch,
          email: student.collegeEmail || student.user?.email,
          chosenTrack: selection.chosenTrack,
          finalizedTrack: selection.finalizedTrack,
          verificationStatus: selection.verificationStatus,
          adminRemarks: selection.adminRemarks,
          reviewedBy: selection.reviewedBy,
          reviewedAt: selection.reviewedAt,
          trackChangedByAdminAt: selection.trackChangedByAdminAt,
          previousTrack: selection.previousTrack,
          choiceSubmittedAt: selection.choiceSubmittedAt,
          updatedAt: selection.updatedAt
        };
      })
      .filter(Boolean);

    if (status) {
      trackChoices = trackChoices.filter(choice => choice.verificationStatus === status);
    }

    if (track) {
      trackChoices = trackChoices.filter(
        choice => choice.chosenTrack === track || choice.finalizedTrack === track
      );
    }

    trackChoices.sort((a, b) => {
      const emailA = (a.email || '').toLowerCase();
      const emailB = (b.email || '').toLowerCase();

      if (emailA && emailB) {
        return emailA.localeCompare(emailB);
      }

      const misA = a.misNumber || '';
      const misB = b.misNumber || '';

      if (misA && misB) {
        return misA.localeCompare(misB);
      }

      return 0;
    });

    return res.json({
      success: true,
      data: trackChoices,
      total: trackChoices.length
    });
  } catch (error) {
    console.error('listSem3TrackChoices error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

