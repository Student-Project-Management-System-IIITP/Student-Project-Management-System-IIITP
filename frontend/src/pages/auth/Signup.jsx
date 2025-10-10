import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    degree: 'B.Tech',
    semester: '',
    misNumber: '',
    collegeEmail: '',
    contactNumber: '',
    branch: 'CSE',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  // Password strength checker
  const checkPasswordStrength = (password) => {
    const feedback = [];
    let score = 0;

    if (password.length < 6) {
      feedback.push('Password must be at least 6 characters long');
    } else {
      score += 1;
    }

    if (password.length >= 8) {
      score += 1;
      feedback.push('✓ Good length (8+ characters)');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
      feedback.push('✓ Contains lowercase letter');
    } else {
      feedback.push('Add lowercase letters');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
      feedback.push('✓ Contains uppercase letter');
    } else {
      feedback.push('Add uppercase letters');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
      feedback.push('✓ Contains number');
    } else {
      feedback.push('Add numbers');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
      feedback.push('✓ Contains special character');
    } else {
      feedback.push('Add special characters (!@#$%^&*)');
    }

    return { score, feedback };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If degree changes, reset semester
    if (name === 'degree') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        semester: ''
      }));
    }
    
    // Check password strength in real-time (no toasts on each keystroke)
    if (name === 'password') {
      const strength = checkPasswordStrength(value);
      setPasswordStrength(strength);
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Get semester options based on degree
  const getSemesterOptions = () => {
    if (formData.degree === 'B.Tech') {
      return Array.from({ length: 5 }, (_, i) => i + 4); // Semesters 4-8
    } else if (formData.degree === 'M.Tech') {
      return Array.from({ length: 4 }, (_, i) => i + 1); // Semesters 1-4
    }
    return [];
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.semester) {
      newErrors.semester = 'Semester is required';
    } else {
      const semesterOptions = getSemesterOptions();
      if (!semesterOptions.includes(parseInt(formData.semester))) {
        newErrors.semester = 'Please select a valid semester for your degree';
      }
    }
    
    if (!formData.misNumber.trim()) {
      newErrors.misNumber = 'MIS number is required';
    } else if (!/^\d{9}$/.test(formData.misNumber)) {
      newErrors.misNumber = 'MIS number must be exactly 9 digits';
    }
    
    if (!formData.collegeEmail.trim()) {
      newErrors.collegeEmail = 'College email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.collegeEmail)) {
      newErrors.collegeEmail = 'Please enter a valid email address';
    }
    
    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.contactNumber)) {
      newErrors.contactNumber = 'Please enter a valid 10-digit phone number (country code +91 is already included)';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (passwordStrength.score < 3) {
      newErrors.password = 'Password is too weak. Please add uppercase letters, numbers, or special characters.';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    
    // Optionally surface a single validation toast on submit only
    // (keep UI errors inline to avoid spam)
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await signup(formData);
      if (result.success) {
        // Show a single success toast on submit
        toast.success('Account created successfully! Please login to continue.', { duration: 2500 });
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000); // Give user time to see the success message
      } else {
        const errorMessage = result.error || 'Signup failed. Please try again.';
        toast.error(errorMessage, { duration: 4000 });
        setErrors({ general: errorMessage });
      }
    } catch (error) {
      const errorMessage = error?.message || 'Signup failed. Please try again.';
      toast.error(errorMessage, { duration: 4000 });
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8">
        <div className="text-center mb-8">
          <img 
            src="/IIIT Pune Logo New.png" 
            alt="IIIT Pune Logo" 
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">Student Registration</h1>
          <p className="text-gray-600">Join SPMS to manage your projects</p>
        </div>
        
        {errors.general && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.general}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.fullName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your full name"
            />
            {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
          </div>
          
          <div>
            <label htmlFor="degree" className="block text-sm font-medium text-gray-700 mb-2">
              Degree *
            </label>
            <select
              id="degree"
              name="degree"
              value={formData.degree}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="B.Tech">B.Tech</option>
              <option value="M.Tech">M.Tech</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-2">
              Branch *
            </label>
            <select
              id="branch"
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-2">
              Semester *
            </label>
            <select
              id="semester"
              name="semester"
              value={formData.semester}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.semester ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select semester</option>
              {getSemesterOptions().map(semester => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </select>
            {errors.semester && <p className="mt-1 text-sm text-red-600">{errors.semester}</p>}
            {formData.degree && !errors.semester && (
              <p className="mt-1 text-sm text-gray-500">
                {formData.degree === 'B.Tech' 
                  ? 'B.Tech students can signup from Semester 4 to 8' 
                  : 'M.Tech students can signup from Semester 1 to 4'
                }
              </p>
            )}
          </div>
          
          <div>
            <label htmlFor="misNumber" className="block text-sm font-medium text-gray-700 mb-2">
              MIS Number *
            </label>
            <input
              type="text"
              id="misNumber"
              name="misNumber"
              value={formData.misNumber}
              onChange={handleChange}
              maxLength="9"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.misNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your 9-digit MIS number"
            />
            {errors.misNumber && <p className="mt-1 text-sm text-red-600">{errors.misNumber}</p>}
          </div>
          
          <div>
            <label htmlFor="collegeEmail" className="block text-sm font-medium text-gray-700 mb-2">
              College Email *
            </label>
            <input
              type="email"
              id="collegeEmail"
              name="collegeEmail"
              value={formData.collegeEmail}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.collegeEmail ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your college email"
            />
            {errors.collegeEmail && <p className="mt-1 text-sm text-red-600">{errors.collegeEmail}</p>}
          </div>
          
          <div>
            <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Contact Number *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm font-medium">+91</span>
              </div>
              <input
                type="tel"
                id="contactNumber"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.contactNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your 10-digit contact number"
              />
            </div>
            {errors.contactNumber && <p className="mt-1 text-sm text-red-600">{errors.contactNumber}</p>}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pr-12 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordStrength.score < 2 ? 'bg-red-500' :
                        passwordStrength.score < 4 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                    ></div>
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.score < 2 ? 'text-red-600' :
                    passwordStrength.score < 4 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {passwordStrength.score < 2 ? 'Weak' :
                     passwordStrength.score < 4 ? 'Medium' :
                     'Strong'}
                  </span>
                </div>
                
                {/* Password Requirements */}
                <div className="mt-2 text-xs text-gray-600">
                  {passwordStrength.feedback.slice(0, 3).map((item, index) => (
                    <div key={index} className={`${item.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full pr-12 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:text-blue-500 font-semibold">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
