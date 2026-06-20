import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  FaUser, 
  FaEnvelope, 
  FaLock, 
  FaPhone, 
  FaCar, 
  FaArrowRight,
  FaGoogle,
  FaFacebook,
  FaArrowLeft
} from 'react-icons/fa';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'rider',
    vehicle: {
      model: '',
      plateNumber: '',
      color: '',
      type: 'sedan'
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('vehicle.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        vehicle: {
          ...prev.vehicle,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);

    const userData = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      role: formData.role,
    };

    if (formData.role === 'driver') {
      userData.vehicle = formData.vehicle;
    }

    const result = await register(userData);

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

  const vehicleTypes = [
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'van', label: 'Van' },
    { value: 'hatchback', label: 'Hatchback' },
    { value: 'motorbike', label: 'Motorbike' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/login')}
          className="text-gray-400 hover:text-black transition-colors mb-4"
        >
          <FaArrowLeft className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="bg-black rounded-full p-4">
              <FaCar className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Sign up to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="082 123 4567"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min 6 characters"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
                required
                minLength="6"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
                required
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I am a...
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: 'rider' }))}
                className={`py-3 rounded-lg border-2 text-sm font-medium transition ${
                  formData.role === 'rider'
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                🚶 Rider
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: 'driver' }))}
                className={`py-3 rounded-lg border-2 text-sm font-medium transition ${
                  formData.role === 'driver'
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                🚗 Driver
              </button>
            </div>
          </div>

          {/* Vehicle Details - Only show for Driver */}
          {formData.role === 'driver' && (
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 flex items-center">
                <FaCar className="mr-2" /> Vehicle Details
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    name="vehicle.type"
                    value={formData.vehicle.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  >
                    {vehicleTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    name="vehicle.model"
                    value={formData.vehicle.model}
                    onChange={handleChange}
                    placeholder="Toyota Corolla"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    name="vehicle.color"
                    value={formData.vehicle.color}
                    onChange={handleChange}
                    placeholder="White"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Plate Number
                  </label>
                  <input
                    type="text"
                    name="vehicle.plateNumber"
                    value={formData.vehicle.plateNumber}
                    onChange={handleChange}
                    placeholder="CA 123-45"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 font-medium flex items-center justify-center"
          >
            {loading ? (
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
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-400">or continue with</span>
          </div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => toast.info('Google signup coming soon!')}
            className="flex items-center justify-center py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <FaGoogle className="h-5 w-5 text-red-500" />
            <span className="ml-2 text-sm font-medium text-gray-600">Google</span>
          </button>
          <button
            onClick={() => toast.info('Facebook signup coming soon!')}
            className="flex items-center justify-center py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <FaFacebook className="h-5 w-5 text-blue-600" />
            <span className="ml-2 text-sm font-medium text-gray-600">Facebook</span>
          </button>
        </div>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-black font-medium hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Are you a driver?{' '}
            <Link to="/driver-apply" className="text-black font-medium hover:underline">
              Apply now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;