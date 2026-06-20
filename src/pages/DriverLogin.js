import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaKey, FaLock, FaArrowLeft } from 'react-icons/fa';

const DriverLogin = () => {
  const { driverLogin } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    reference: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await driverLogin(formData.reference, formData.password);
    if (result.success) {
      if (result.user.driverApproval?.isApproved) {
        navigate('/driver');
      } else {
        toast.error('Your account is pending approval');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <Link to="/login" className="inline-flex items-center text-gray-600 hover:text-black mb-6">
          <FaArrowLeft className="mr-2" /> Back to Login
        </Link>
        
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🚗</div>
          <h2 className="text-2xl font-bold">Driver Login</h2>
          <p className="text-gray-500 text-sm">Enter your driver reference</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Driver Reference
            </label>
            <div className="relative">
              <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="e.g. DRV-2024-0001"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              This reference was provided after WhatsApp approval
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login as Driver'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Not approved yet?{' '}
            <Link to="/driver-apply" className="text-black underline hover:text-gray-700">
              Apply Now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriverLogin;