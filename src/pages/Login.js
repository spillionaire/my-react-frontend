import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  FaEnvelope, 
  FaLock, 
  FaKey, 
  FaUser, 
  FaArrowRight,
  FaGoogle,
  FaFacebook,
  FaCar
} from 'react-icons/fa';

const Login = () => {
  const { login, driverLogin } = useAuth();
  const navigate = useNavigate();
  const [isDriverLogin, setIsDriverLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    referenceCode: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let result;
    if (isDriverLogin) {
      if (!formData.referenceCode || !formData.password) {
        toast.error('Please enter your reference code and password');
        setLoading(false);
        return;
      }
      result = await driverLogin(formData.referenceCode, formData.password);
    } else {
      if (!formData.email || !formData.password) {
        toast.error('Please enter your email and password');
        setLoading(false);
        return;
      }
      result = await login(formData.email, formData.password);
    }

    if (result.success) {
      if (result.user.role === 'rider') {
        navigate('/rider');
      } else if (result.user.role === 'driver') {
        navigate('/driver');
      } else {
        navigate('/');
      }
    }
    setLoading(false);
  };

  const toggleLoginMode = () => {
    setIsDriverLogin(!isDriverLogin);
    setFormData({
      email: '',
      password: '',
      referenceCode: ''
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#03060F] p-4">
      <div className="bg-[#0E1A2A] rounded-2xl shadow-xl p-6 md:p-8 max-w-md w-full border border-[#1A2A4A]">
        {/* Logo with Car Icon */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="bg-[#1A6BFF] rounded-full p-5 shadow-lg shadow-[#1A6BFF]/30">
              <FaCar className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to Vai</h1>
          <p className="text-gray-400 text-sm mt-1">
            {isDriverLogin ? 'Login with your driver reference' : 'Sign in to your account'}
          </p>
        </div>

        {/* Toggle Login Mode */}
        <div className="flex rounded-lg bg-[#080E1F] p-1 mb-6 border border-[#1A2A4A]">
          <button
            onClick={() => setIsDriverLogin(false)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              !isDriverLogin ? 'bg-[#1A6BFF] text-white shadow-lg shadow-[#1A6BFF]/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaUser className="inline mr-2" /> Rider
          </button>
          <button
            onClick={() => setIsDriverLogin(true)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              isDriverLogin ? 'bg-[#1A6BFF] text-white shadow-lg shadow-[#1A6BFF]/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaKey className="inline mr-2" /> Driver
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isDriverLogin ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Driver Reference Code
                </label>
                <div className="relative">
                  <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    name="referenceCode"
                    value={formData.referenceCode}
                    onChange={handleChange}
                    placeholder="e.g. DRV-2024-0001"
                    className="w-full pl-10 pr-4 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter your driver reference provided after approval
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
                    required
                  />
                </div>
                <div className="text-right mt-1">
                  <Link to="/forgot-password" className="text-xs text-[#1A6BFF] hover:text-[#5294FF] transition">
                    Forgot password?
                  </Link>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1A6BFF] text-white rounded-xl hover:bg-[#5294FF] transition disabled:opacity-50 font-medium flex items-center justify-center shadow-lg shadow-[#1A6BFF]/30"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                {isDriverLogin ? 'Sign in as Driver' : 'Sign In'}
                <FaArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#1A2A4A]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-[#0E1A2A] text-gray-500">or continue with</span>
          </div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button className="py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-gray-400 hover:text-white hover:border-[#1A6BFF] transition flex items-center justify-center">
            <FaGoogle className="h-5 w-5" />
            <span className="ml-2 text-sm">Google</span>
          </button>
          <button className="py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-gray-400 hover:text-white hover:border-[#1A6BFF] transition flex items-center justify-center">
            <FaFacebook className="h-5 w-5" />
            <span className="ml-2 text-sm">Facebook</span>
          </button>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#1A6BFF] font-medium hover:text-[#5294FF] transition">
              Sign up
            </Link>
          </p>
          {!isDriverLogin ? (
            <p className="text-sm text-gray-400 mt-2">
              Are you a driver?{' '}
              <button 
                onClick={toggleLoginMode} 
                className="text-[#1A6BFF] font-medium hover:text-[#5294FF] transition"
              >
                Login with reference
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-400 mt-2">
              Need a driver reference?{' '}
              <Link to="/driver-apply" className="text-[#1A6BFF] font-medium hover:text-[#5294FF] transition">
                Apply now
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;