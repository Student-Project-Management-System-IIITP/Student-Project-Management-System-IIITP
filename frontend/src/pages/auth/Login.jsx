import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { handleAuthError } from '../../utils/signupErrorHandler';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password, rememberMe);
      if (result.success) {
        toast.success('Logged in successfully!', { duration: 2000 });
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      } else {
        const errorMessage = result.error || 'Login failed. Please check your credentials.';
        toast.error(errorMessage, { duration: 3500 });
        setError(errorMessage);
      }
    } catch (error) {
      const errorMessage = handleAuthError(error);
      toast.error(errorMessage, { duration: 3500 });
      setError(errorMessage);
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

      <div className="relative max-w-md w-full bg-surface-100 rounded-2xl shadow-xl border border-neutral-200 p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/IIIT Pune Logo New.jpg" 
              alt="IIIT Pune Logo" 
              className="h-16 w-16 rounded-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">Welcome Back</h1>
          <p className="text-neutral-600">Sign in to your SPMS account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-700 placeholder-neutral-400 transition-colors"
              placeholder="Enter your email"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pr-12 px-4 py-3 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-700 placeholder-neutral-400 transition-colors"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-neutral-500 hover:text-neutral-700 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded cursor-pointer"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-neutral-700 cursor-pointer">
                Remember me
              </label>
            </div>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Forgot password?
            </button>
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
                Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-neutral-600 text-sm">
            Don't have an account?{' '}
            <a href="/signup" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
              Sign up here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
