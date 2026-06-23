import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaCar, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser, FaPhone, 
  FaArrowRight, FaGoogle, FaFacebook, FaCheckCircle
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../config';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'rider'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { name, email, phone, password, confirmPassword, role } = formData;
    
    if (!name || !email || !phone || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!agreeTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        phone,
        password,
        role
      });

      if (response.data.token) {
        toast.success('Account created successfully! 🎉');
        const loginResult = await login(email, password);
        if (loginResult.success) {
          navigate(role === 'driver' ? '/driver' : '/rider');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#03060F] flex flex-col items-center justify-center px-4 py-8">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1A6BFF]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#00D97E]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-[#1A6BFF] rounded-2xl flex items-center justify-center shadow-lg shadow-[#1A6BFF]/30">
              <span className="text-2xl font-bold text-white">V</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mt-3">Create account</h1>
          <p className="text-gray-400 text-sm mt-1">Join Vai and start riding</p>
        </div>

        {/* Role Toggle - Dark theme */}
        <div className="flex bg-[#080E1F] rounded-xl p-1 border border-[#1A2A4A] mb-5">
          <button
            onClick={() => setFormData(prev => ({ ...prev, role: 'rider' }))}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              formData.role === 'rider' 
                ? 'bg-[#1A6BFF] text-white shadow-lg shadow-[#1A6BFF]/20' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Rider
          </button>
          <button
            onClick={() => setFormData(prev => ({ ...prev, role: 'driver' }))}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              formData.role === 'driver' 
                ? 'bg-[#1A6BFF] text-white shadow-lg shadow-[#1A6BFF]/20' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Driver
          </button>
        </div>

        {/* Form - Dark theme */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Full Name
            </label>
            <div className="relative">
              <FaUser className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] focus:border-transparent transition text-sm"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] focus:border-transparent transition text-sm"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <FaPhone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+27 12 345 6789"
                className="w-full pl-10 pr-4 py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] focus:border-transparent transition text-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] focus:border-transparent transition text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] focus:border-transparent transition text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Terms - Dark theme */}
          <div className="flex items-start space-x-2">
            <button
              type="button"
              onClick={() => setAgreeTerms(!agreeTerms)}
              className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 ${
                agreeTerms 
                  ? 'bg-[#1A6BFF] border-[#1A6BFF]' 
                  : 'border-[#1A2A4A] hover:border-[#1A6BFF]'
              }`}
            >
              {agreeTerms && <FaCheckCircle className="h-4 w-4 text-white" />}
            </button>
            <p className="text-xs text-gray-400">
              I agree to the{' '}
              <Link to="/legal" className="text-[#1A6BFF] hover:text-[#5294FF] transition">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link to="/legal" className="text-[#1A6BFF] hover:text-[#5294FF] transition">
                Privacy Policy
              </Link>
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#1A6BFF] text-white rounded-xl font-semibold hover:bg-[#5294FF] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1A6BFF]/30 flex items-center justify-center mt-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                Create Account
                <FaArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="flex-1 border-t border-[#1A2A4A]"></div>
          <span className="px-4 text-xs text-gray-500">or continue with</span>
          <div className="flex-1 border-t border-[#1A2A4A]"></div>
        </div>

        {/* Social Buttons - Dark theme */}
        <div className="grid grid-cols-2 gap-3">
          <button className="py-2 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-gray-400 hover:text-white hover:border-[#1A6BFF] transition flex items-center justify-center">
            <FaGoogle className="h-5 w-5" />
            <span className="ml-2 text-sm">Google</span>
          </button>
          <button className="py-2 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-gray-400 hover:text-white hover:border-[#1A6BFF] transition flex items-center justify-center">
            <FaFacebook className="h-5 w-5" />
            <span className="ml-2 text-sm">Facebook</span>
          </button>
        </div>

        {/* Login Link */}
        <p className="text-center text-gray-400 mt-5 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-[#1A6BFF] hover:text-[#5294FF] font-medium transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;