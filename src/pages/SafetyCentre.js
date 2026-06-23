import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaArrowLeft, 
  FaShieldAlt, 
  FaPhone, 
  FaUserCheck, 
  FaCar, 
  FaLock, 
  FaExclamationTriangle,
  FaChevronDown,
  FaChevronUp,
  FaCheckCircle
} from 'react-icons/fa';

const SafetyCentre = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState(null);

  const safetySections = [
    {
      id: 'rider-safety',
      icon: FaUserCheck,
      title: 'Rider Safety Tips',
      content: `
        • Always confirm the driver's name, photo, and vehicle before getting in
        • Share your trip details with a trusted contact
        • Sit in the back seat for added safety
        • If you feel unsafe, end the trip and report it
        • Keep emergency contacts readily available
      `
    },
    {
      id: 'driver-safety',
      icon: FaCar,
      title: 'Driver Safety Tips',
      content: `
        • Verify the rider's name and destination before starting the trip
        • Keep your doors locked until you confirm the rider
        • Use the in-app emergency button if needed
        • Stay aware of your surroundings
        • Report any suspicious behavior immediately
      `
    },
    {
      id: 'emergency',
      icon: FaPhone,
      title: 'Emergency Procedures',
      content: `
        • In an emergency, call 112 (South Africa's emergency number)
        • Use the SOS button in the app for immediate assistance
        • Find a safe location if you feel threatened
        • Contact Vai support after ensuring your safety
        • We have 24/7 support for emergencies
      `
    },
    {
      id: 'privacy',
      icon: FaLock,
      title: 'Privacy & Data Protection',
      content: `
        • Your personal information is encrypted and secure
        • We never share your data with third parties
        • You can control your privacy settings in the app
        • Location data is only used during active rides
        • All communications are encrypted
      `
    },
    {
      id: 'reporting',
      icon: FaExclamationTriangle,
      title: 'Reporting Incidents',
      content: `
        • Report incidents through the support section
        • Provide as much detail as possible
        • Include ride ID, date, and time
        • Upload photos or screenshots if available
        • Our team responds within 24 hours
      `
    }
  ];

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

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
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white font-bold text-lg mr-3 shadow-lg shadow-green-500/30">
              <FaShieldAlt />
            </div>
            <h1 className="text-2xl font-bold text-white">Safety Centre</h1>
          </div>
        </div>

        <p className="text-gray-400 mb-6">Your safety is our top priority</p>

        {/* Emergency Button - Dark theme */}
        <div className="mb-6 p-6 bg-red-500/10 border-2 border-red-500/20 rounded-xl text-center">
          <FaPhone className="text-4xl text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-red-400">Emergency?</h2>
          <p className="text-red-400/70 mb-3">Call 112 for immediate emergency assistance</p>
          <button className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition font-bold border border-red-500/20">
            🚨 SOS Emergency
          </button>
        </div>

        {/* Safety Sections - Dark theme */}
        <div className="space-y-3">
          {safetySections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;
            
            return (
              <div key={section.id} className="bg-[#0E1A2A] rounded-xl border border-[#1A2A4A] overflow-hidden hover:border-[#1A6BFF] transition">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#1A2A4A] transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="text-xl text-[#1A6BFF]" />
                    <span className="font-medium text-white">{section.title}</span>
                  </div>
                  {isExpanded ? (
                    <FaChevronUp className="text-gray-400 flex-shrink-0" />
                  ) : (
                    <FaChevronDown className="text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-6 pb-4 pt-1 border-t border-[#1A2A4A]">
                    <div className="text-gray-400 leading-relaxed whitespace-pre-line">
                      {section.content}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Trust Badges - Dark theme */}
        <div className="mt-8 p-6 bg-[#0E1A2A] rounded-xl border border-[#1A2A4A] text-center">
          <h3 className="font-semibold text-white mb-4">Our Commitment to Safety</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-green-500/20">
                <FaUserCheck className="text-green-400 text-xl" />
              </div>
              <p className="text-xs text-gray-400">Verified Drivers</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-blue-500/20">
                <FaLock className="text-blue-400 text-xl" />
              </div>
              <p className="text-xs text-gray-400">Secure Payments</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-purple-500/20">
                <FaPhone className="text-purple-400 text-xl" />
              </div>
              <p className="text-xs text-gray-400">24/7 Support</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyCentre;