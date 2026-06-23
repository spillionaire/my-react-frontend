import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaArrowLeft, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaCar, 
  FaWhatsapp, 
  FaCheckCircle,
  FaSpinner
} from 'react-icons/fa';
import { API_URL } from '../config';

const DriverApplication = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [applicationRef, setApplicationRef] = useState('');
  const [formData, setFormData] = useState({
    whatsappNumber: '',
    name: '',
    email: '',
    phone: '',
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
        vehicle: { ...prev.vehicle, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { whatsappNumber, name, email, phone, vehicle } = formData;
    
    if (!whatsappNumber || !name || !email || !phone || !vehicle.model) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/driver-apply`, {
        whatsappNumber,
        name,
        email,
        phone,
        vehicle
      });

      if (response.data.reference) {
        setApplicationRef(response.data.reference);
        setIsSubmitted(true);
        toast.success('Application submitted successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit application');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#03060F] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/30">
              <FaCheckCircle className="h-10 w-10 text-green-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Application Submitted! 🎉</h1>
          <p className="text-gray-400 mb-4">
            Your driver application has been received. We will contact you via WhatsApp within 24-48 hours.
          </p>
          <div className="bg-[#0E1A2A] p-4 rounded-xl border border-[#1A2A4A] mb-6">
            <p className="text-sm text-gray-500">Your application reference:</p>
            <p className="text-lg font-mono font-bold text-white">{applicationRef}</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Please keep this reference number for future communication.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-[#1A6BFF] text-white rounded-xl font-semibold hover:bg-[#5294FF] transition shadow-lg shadow-[#1A6BFF]/30"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#03060F] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/login')}
            className="text-gray-400 hover:text-white transition-colors mr-4"
          >
            <FaArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-[#1A6BFF] rounded-xl flex items-center justify-center text-white font-bold text-lg mr-3 shadow-lg shadow-[#1A6BFF]/30">
              V
            </div>
            <h1 className="text-2xl font-bold text-white">Driver Application</h1>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-[#0E1A2A] border border-[#1A2A4A] rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <FaWhatsapp className="text-green-400 text-xl mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">Apply via WhatsApp</p>
              <p className="text-xs text-gray-400">
                Submit your application and we'll contact you on WhatsApp within 24-48 hours.
                Make sure your WhatsApp number is correct.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-[#0E1A2A] rounded-xl p-6 border border-[#1A2A4A]">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              WhatsApp Number <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <FaWhatsapp className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-green-400" />
              <input
                type="tel"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleChange}
                placeholder="+27 12 345 6789"
                className="w-full pl-10 pr-4 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Full Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <FaUser className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Email Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
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
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <FaPhone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+27 12 345 6789"
                className="w-full pl-10 pr-4 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
                required
              />
            </div>
          </div>

          <div className="border-t border-[#1A2A4A] pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
              <FaCar className="mr-2" /> Vehicle Details
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vehicle Model <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  name="vehicle.model"
                  value={formData.vehicle.model}
                  onChange={handleChange}
                  placeholder="Toyota Corolla"
                  className="w-full px-4 py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Plate Number</label>
                <input
                  type="text"
                  name="vehicle.plateNumber"
                  value={formData.vehicle.plateNumber}
                  onChange={handleChange}
                  placeholder="CA 123-456"
                  className="w-full px-4 py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Vehicle Color</label>
                <input
                  type="text"
                  name="vehicle.color"
                  value={formData.vehicle.color}
                  onChange={handleChange}
                  placeholder="White"
                  className="w-full px-4 py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Vehicle Type</label>
                <select
                  name="vehicle.type"
                  value={formData.vehicle.type}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition text-sm"
                >
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="van">Van</option>
                  <option value="hatchback">Hatchback</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#1A6BFF] text-white rounded-xl font-semibold hover:bg-[#5294FF] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1A6BFF]/30 flex items-center justify-center mt-4"
          >
            {isLoading ? (
              <FaSpinner className="animate-spin h-5 w-5" />
            ) : (
              'Submit Application'
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          By submitting this application, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default DriverApplication;