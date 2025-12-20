import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../../utils/api';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const OTP_SIGNUP_ENABLED = import.meta.env.VITE_ENABLE_SIGNUP_OTP !== 'false'; // Enabled by default, can be disabled via env var

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
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
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
    if (name === 'collegeEmail') {
      setIsOtpVerified(false);
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

  const handleSendOtp = async () => {
    const email = formData.collegeEmail.trim();
    if (!email) {
      setErrors(prev => ({ ...prev, collegeEmail: 'College email is required' }));
      toast.error('Please enter your college email first');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors(prev => ({ ...prev, collegeEmail: 'Please enter a valid email address' }));
      toast.error('Please enter a valid email address');
      return;
    }
    setIsSendingOtp(true);
    try {
      const res = await authAPI.sendSignupOtp(email);
      toast.success(res.message || 'OTP sent to your email');
      setOtpValue('');
      setIsOtpModalOpen(true);
    } catch (error) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const email = formData.collegeEmail.trim();
    const code = otpValue.trim();
    if (!email || !code) {
      toast.error('Please enter the OTP');
      return;
    }
    if (code.length !== 6) {
      toast.error('OTP should be 6 digits');
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const res = await authAPI.verifySignupOtp(email, code);
      toast.success(res.message || 'Email verified successfully');
      setIsOtpVerified(true);
      setIsOtpModalOpen(false);
    } catch (error) {
      toast.error(error.message || 'Failed to verify OTP');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Temporarily disable mandatory OTP verification for signup
    // if (OTP_SIGNUP_ENABLED && !isOtpVerified) {
    //   toast.error('Please verify your email with OTP before creating an account');
    //   return;
    // }
    
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
    <div className="min-h-screen bg-gradient-to-br from-surface-200 via-primary-50 to-secondary-50 flex items-center justify-center py-12 px-4">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-200 rounded-full opacity-30 blur-3xl"></div>
        <div className="absolute top-1/2 -left-20 w-72 h-72 bg-secondary-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="relative max-w-lg w-full bg-surface-100 rounded-2xl shadow-xl border border-neutral-200 p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/IIIT Pune Logo New.jpg" 
              alt="IIIT Pune Logo" 
              className="h-16 w-16 rounded-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">Student Registration</h1>
          <p className="text-neutral-600">Join SPMS to manage your projects</p>
        </div>
        
        {errors.general && (
          <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
            {errors.general}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-neutral-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-700 placeholder-neutral-400 transition-colors ${
                errors.fullName ? 'border-error-500' : 'border-neutral-300'
              }`}
              placeholder="Enter your full name"
            />
            {errors.fullName && <p className="mt-1 text-sm text-error-600">{errors.fullName}</p>}
          </div>
          
          <div>
            <label htmlFor="degree" className="block text-sm font-medium text-neutral-700 mb-2">
              Degree *
            </label>
            <select
              id="degree"
              name="degree"
              value={formData.degree}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-700 transition-colors"
            >
              <option value="B.Tech">B.Tech</option>
              <option value="M.Tech">M.Tech</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="branch" className="block text-sm font-medium text-neutral-700 mb-2">
              Branch *
            </label>
            <select
              id="branch"
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-700 transition-colors"
            >
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="semester" className="block text-sm font-medium text-neutral-700 mb-2">
              Semester *
            </label>
            <select
              id="semester"
              name="semester"
              value={formData.semester}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-700 transition-colors ${
                errors.semester ? 'border-error-500' : 'border-neutral-300'
              }`}
            >
              <option value="">Select semester</option>
              {getSemesterOptions().map(semester => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </select>
            {errors.semester && <p className="mt-1 text-sm text-error-600">{errors.semester}</p>}
            {formData.degree && !errors.semester && (
              <p className="mt-1 text-sm text-neutral-500">
                {formData.degree === 'B.Tech' 
                  ? 'B.Tech students can signup from Semester 4 to 8' 
                  : 'M.Tech students can signup from Semester 1 to 4'
                }
              </p>
            )}
          </div>
          
          <div>
            <label htmlFor="misNumber" className="block text-sm font-medium text-neutral-700 mb-2">
              MIS Number *
            </label>
            <input
              type="text"
              id="misNumber"
              name="misNumber"
              value={formData.misNumber}
              onChange={handleChange}
              maxLength="9"
              className={`w-full px-4 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-700 placeholder-neutral-400 transition-colors ${
                errors.misNumber ? 'border-error-500' : 'border-neutral-300'
              }`}
              placeholder="Enter your 9-digit MIS number"
            />
            {errors.misNumber && <p className="mt-1 text-sm text-error-600">{errors.misNumber}</p>}
          </div>
          
          <div>
            <label htmlFor="collegeEmail" className="block text-sm font-medium text-neutral-700 mb-2">
              College Email *
            </label>
            <div className="flex flex-col space-y-2">
              <input
                type="email"
                id="collegeEmail"
                name="collegeEmail"
                value={formData.collegeEmail}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-700 placeholder-neutral-400 transition-colors ${
                  errors.collegeEmail ? 'border-error-500' : 'border-neutral-300'
                }`}
                placeholder="Enter your college email"
              />
              <div className="flex items-center justify-between">
                {errors.collegeEmail ? (
                  <p className="text-sm text-error-600">{errors.collegeEmail}</p>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Verify your email with OTP before creating account.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || !formData.collegeEmail.trim() || !!errors.collegeEmail || isOtpVerified}
                  className={`ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm transition-colors ${
                    isOtpVerified
                      ? 'bg-success-100 text-success-700 cursor-default'
                      : 'bg-secondary-600 text-white hover:bg-secondary-700 disabled:bg-secondary-300'
                  }`}
                >
                  {isOtpVerified ? 'Email Verified' : isSendingOtp ? 'Sending OTP...' : 'Verify OTP'}
                </button>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="contactNumber" className="block text-sm font-medium text-neutral-700 mb-2">
              Contact Number *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-neutral-500 text-sm font-medium">+91</span>
              </div>
              <input
                type="tel"
                id="contactNumber"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                className={`w-full pl-12 pr-4 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-700 placeholder-neutral-400 transition-colors ${
                  errors.contactNumber ? 'border-error-500' : 'border-neutral-300'
                }`}
                placeholder="Enter your 10-digit contact number"
              />
            </div>
            {errors.contactNumber && <p className="mt-1 text-sm text-error-600">{errors.contactNumber}</p>}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pr-12 px-4 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-700 placeholder-neutral-400 transition-colors ${
                  errors.password ? 'border-error-500' : 'border-neutral-300'
                }`}
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-neutral-500 hover:text-neutral-700 transition-colors"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-error-600">{errors.password}</p>}
            
            {/* Simplified Password Strength Indicator */}
            {formData.password && !errors.password && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  <div className={`h-1 rounded-full flex-1 transition-colors ${passwordStrength.score >= 1 ? (passwordStrength.score < 2 ? 'bg-error-500' : passwordStrength.score < 4 ? 'bg-warning-500' : 'bg-success-500') : 'bg-neutral-200'}`}></div>
                  <div className={`h-1 rounded-full flex-1 transition-colors ${passwordStrength.score >= 3 ? (passwordStrength.score < 4 ? 'bg-warning-500' : 'bg-success-500') : 'bg-neutral-200'}`}></div>
                  <div className={`h-1 rounded-full flex-1 transition-colors ${passwordStrength.score >= 5 ? 'bg-success-500' : 'bg-neutral-200'}`}></div>
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${
                  passwordStrength.score < 2 ? 'text-error-600' :
                  passwordStrength.score < 4 ? 'text-warning-600' :
                  'text-success-600'
                }`}>
                  {passwordStrength.score < 2 ? 'Weak' :
                   passwordStrength.score < 4 ? 'Fair' :
                   'Strong'}
                </span>
              </div>
            )}
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-2">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full pr-12 px-4 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-700 placeholder-neutral-400 transition-colors ${
                  errors.confirmPassword ? 'border-error-500' : 'border-neutral-300'
                }`}
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-neutral-500 hover:text-neutral-700 transition-colors"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-sm text-error-600">{errors.confirmPassword}</p>}
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-md shadow-primary-600/20 hover:shadow-lg hover:shadow-primary-600/30"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {isOtpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-surface-100 rounded-2xl shadow-xl border border-neutral-200 p-6 w-full max-w-sm mx-4">
              <h2 className="text-lg font-semibold text-neutral-800 mb-2">Verify Email OTP</h2>
              <p className="text-sm text-neutral-600 mb-4">
                Enter the 6-digit OTP sent to <span className="font-medium text-neutral-700">{formData.collegeEmail}</span>.
              </p>
              <input
                type="text"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 text-neutral-700 tracking-widest text-center text-lg transition-colors"
                placeholder="••••••"
              />
              <div className="flex justify-end mt-4 space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOtpModalOpen(false)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-neutral-200 text-neutral-700 hover:bg-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp || otpValue.trim().length !== 6}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-secondary-600 text-white hover:bg-secondary-700 disabled:bg-secondary-300 transition-colors"
                >
                  {isVerifyingOtp ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6 text-center">
          <p className="text-neutral-600 text-sm">
            Already have an account?{' '}
            <a href="/login" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
