import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaArrowLeft, 
  FaExclamationTriangle, 
  FaUser, 
  FaCar, 
  FaFlag, 
  FaFileAlt,
  FaSpinner,
  FaCheckCircle
} from 'react-icons/fa';
import { API_URL } from '../config';

const ReportPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('rider');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [rideId, setRideId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const reportTypes = [
    { id: 'rider', label: 'Report Rider', icon: FaUser },
    { id: 'driver', label: 'Report Driver', icon: FaCar },
    { id: 'safety', label: 'Safety Concern', icon: FaFlag },
    { id: 'other', label: 'Other Report', icon: FaFileAlt }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subject || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/ticket`,
        {
          subject: `[${reportType.toUpperCase()}] ${subject}`,
          category: reportType === 'safety' ? 'safety' : 'other',
          message: description,
          rideId: rideId || null,
          priority: reportType === 'safety' ? 'urgent' : 'high'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setIsSubmitted(true);
        toast.success('Report submitted successfully!');
      }
    } catch (error) {
      console.error('Submit report error:', error);
      toast.error(error.response?.data?.error || 'Failed to submit report');
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
          <h1 className="text-2xl font-bold text-white mb-2">Report Submitted</h1>
          <p className="text-gray-400 mb-6">
            Your report has been submitted. Our team will investigate and respond within 24 hours.
          </p>
          <button
            onClick={() => {
              setIsSubmitted(false);
              setSubject('');
              setDescription('');
              setRideId('');
              setReportType('rider');
            }}
            className="px-6 py-3 bg-[#1A6BFF] text-white rounded-xl font-semibold hover:bg-[#5294FF] transition shadow-lg shadow-[#1A6BFF]/30"
          >
            Submit Another Report
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
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white font-bold text-lg mr-3 shadow-lg shadow-red-500/30">
              !
            </div>
            <h1 className="text-2xl font-bold text-white">Report an Issue</h1>
          </div>
        </div>

        <p className="text-gray-400 mb-6">We take all reports seriously. Please provide as much detail as possible.</p>

        {/* Report Form - Dark theme */}
        <div className="bg-[#0E1A2A] rounded-xl border border-[#1A2A4A] p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Report Type <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {reportTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = reportType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setReportType(type.id)}
                      className={`p-3 rounded-xl border-2 text-center transition ${
                        isSelected
                          ? 'border-red-500/50 bg-red-500/10 text-white'
                          : 'border-[#1A2A4A] text-gray-400 hover:border-[#1A6BFF] hover:text-white'
                      }`}
                    >
                      <Icon className={`text-xl mx-auto mb-1 ${isSelected ? 'text-red-400' : 'text-gray-500'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Subject <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
                className="w-full px-3 py-2 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                required
              />
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
                className="w-full px-3 py-2 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide as much detail as possible about what happened..."
                rows="6"
                className="w-full px-3 py-2 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition resize-none"
                required
              />
            </div>

            <div className="bg-red-500/10 p-4 rounded-xl mb-4 border border-red-500/20">
              <p className="text-sm text-red-400 flex items-start">
                <span className="font-bold mr-2">⚠️</span>
                All reports are confidential. Our team will investigate and respond within 24 hours.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition disabled:opacity-50 flex items-center justify-center border border-red-500/20 font-medium"
            >
              {isSubmitting ? (
                <FaSpinner className="animate-spin mr-2" />
              ) : (
                'Submit Report'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;