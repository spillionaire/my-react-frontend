import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaArrowLeft, 
  FaPhone, 
  FaEnvelope, 
  FaComment, 
  FaTicketAlt, 
  FaUser,
  FaSpinner,
  FaCheckCircle
} from 'react-icons/fa';
import { API_URL } from '../config';

const SupportPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [rideId, setRideId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const categories = [
    { id: 'general', label: 'General Inquiry' },
    { id: 'payment', label: 'Payment Issue' },
    { id: 'ride_issue', label: 'Ride Issue' },
    { id: 'driver_issue', label: 'Driver Issue' },
    { id: 'rider_issue', label: 'Rider Issue' },
    { id: 'safety', label: 'Safety Concern' },
    { id: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subject || !message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/ticket`,
        {
          subject,
          category,
          message,
          rideId: rideId || null,
          priority: category === 'safety' ? 'urgent' : 'normal'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setIsSubmitted(true);
        toast.success('Ticket submitted successfully!');
      }
    } catch (error) {
      console.error('Submit ticket error:', error);
      toast.error(error.response?.data?.error || 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-2xl font-bold text-white mb-2">Ticket Submitted! 🎫</h1>
          <p className="text-gray-400 mb-6">
            Your support ticket has been submitted. Our team will respond within 24 hours.
          </p>
          <button
            onClick={() => {
              setIsSubmitted(false);
              setSubject('');
              setMessage('');
              setRideId('');
              setCategory('general');
            }}
            className="px-6 py-3 bg-[#1A6BFF] text-white rounded-xl font-semibold hover:bg-[#5294FF] transition shadow-lg shadow-[#1A6BFF]/30"
          >
            Submit Another Ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#03060F] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(user?.role === 'driver' ? '/driver' : '/rider')}
            className="text-gray-400 hover:text-white transition-colors mr-4"
          >
            <FaArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-[#1A6BFF] rounded-xl flex items-center justify-center text-white font-bold text-lg mr-3 shadow-lg shadow-[#1A6BFF]/30">
              V
            </div>
            <h1 className="text-2xl font-bold text-white">Support</h1>
          </div>
        </div>

        <p className="text-gray-400 mb-6">We're here to help. Submit a ticket and we'll respond within 24 hours.</p>

        {/* Quick Contact Options - Dark theme */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#0E1A2A] p-4 rounded-xl border border-[#1A2A4A] text-center">
            <FaPhone className="text-2xl text-[#1A6BFF] mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Call Us</p>
            <p className="text-xs text-gray-500">+27 123 456 789</p>
          </div>
          <div className="bg-[#0E1A2A] p-4 rounded-xl border border-[#1A2A4A] text-center">
            <FaEnvelope className="text-2xl text-[#1A6BFF] mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Email</p>
            <p className="text-xs text-gray-500">support@vai.co.za</p>
          </div>
          <div className="bg-[#0E1A2A] p-4 rounded-xl border border-[#1A2A4A] text-center">
            <FaComment className="text-2xl text-[#1A6BFF] mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Live Chat</p>
            <p className="text-xs text-gray-500">Available 24/7</p>
          </div>
        </div>

        {/* Ticket Form - Dark theme */}
        <div className="bg-[#0E1A2A] rounded-xl border border-[#1A2A4A] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Submit a Support Ticket</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Subject <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                className="w-full px-3 py-2 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Ride ID (Optional)
              </label>
              <input
                type="text"
                value={rideId}
                onChange={(e) => setRideId(e.target.value)}
                placeholder="e.g., VAI-240101-1234"
                className="w-full px-3 py-2 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows="5"
                className="w-full px-3 py-2 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FaUser className="text-xs" />
                <span>Submitted as: {user?.name}</span>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-[#1A6BFF] text-white rounded-xl hover:bg-[#5294FF] transition disabled:opacity-50 flex items-center shadow-lg shadow-[#1A6BFF]/30"
              >
                {isSubmitting ? (
                  <FaSpinner className="animate-spin mr-2" />
                ) : (
                  <FaTicketAlt className="mr-2" />
                )}
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;