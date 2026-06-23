import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaEnvelope, FaArrowLeft, FaCar, FaCheckCircle } from 'react-icons/fa';
import { API_URL } from '../config';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      
      if (response.data.message) {
        setIsSent(true);
        toast.success('Password reset email sent!');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#03060F] flex flex-col items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1A6BFF]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#00D97E]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
        <Link to="/login" className="inline-flex items-center text-gray-400 hover:text-white transition mb-6">
          <FaArrowLeft className="mr-2 h-4 w-4" />
          Back to login
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-[#1A6BFF] rounded-2xl flex items-center justify-center shadow-lg shadow-[#1A6BFF]/30">
              <FaCar className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">Reset Password</h1>
          <p className="text-gray-400 mt-1">
            {!isSent 
              ? 'Enter your email to receive a reset link' 
              : 'Check your email for the reset link'}
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#1A6BFF] text-white rounded-xl font-semibold hover:bg-[#5294FF] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1A6BFF]/30 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/30">
                <FaCheckCircle className="h-10 w-10 text-green-400" />
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              We've sent a password reset link to <strong className="text-white">{email}</strong>
            </p>
            <p className="text-xs text-gray-500 mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button
              onClick={() => {
                setIsSent(false);
                setEmail('');
              }}
              className="text-[#1A6BFF] hover:text-[#5294FF] text-sm font-medium transition"
            >
              Try again with a different email
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-8">
          © {new Date().getFullYear()} Vai. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;