import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaArrowLeft, 
  FaFileContract, 
  FaChevronDown, 
  FaChevronUp, 
  FaShieldAlt, 
  FaUserSecret, 
  FaBalanceScale 
} from 'react-icons/fa';

const LegalPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState(null);

  const legalSections = [
    {
      id: 'terms',
      icon: FaFileContract,
      title: 'Terms of Service',
      content: `
        By using Vai, you agree to the following terms:
        
        1. You must be at least 18 years old to use this service.
        2. You are responsible for the accuracy of the information you provide.
        3. You agree to use the service in compliance with all applicable laws.
        4. Vai reserves the right to suspend or terminate accounts for violations.
        5. All ride transactions are final and subject to our cancellation policy.
        6. You agree to treat drivers and riders with respect at all times.
        7. Vai is not liable for any damages arising from the use of the service.
        8. These terms may be updated at any time with notice to users.
      `
    },
    {
      id: 'privacy',
      icon: FaUserSecret,
      title: 'Privacy Policy',
      content: `
        Your privacy is important to us:
        
        1. We collect information necessary to provide ride services.
        2. Location data is only collected during active rides.
        3. Your personal information is never shared with third parties.
        4. You can request deletion of your data at any time.
        5. We use encryption to protect your data.
        6. Cookies are used only for essential functionality.
        7. You can opt out of marketing communications.
        8. Our privacy policy is updated as regulations change.
      `
    },
    {
      id: 'refund',
      icon: FaBalanceScale,
      title: 'Refund Policy',
      content: `
        Our refund policy is as follows:
        
        1. Refunds are issued for cancelled rides that were not completed.
        2. If a ride was cancelled by the driver, you will receive a full refund.
        3. If you cancel after the driver arrives, a cancellation fee may apply.
        4. Refunds are processed within 5-10 business days.
        5. For payment disputes, please contact support.
        6. Refunds are issued to the original payment method.
        7. In cases of fraudulent charges, please report immediately.
        8. All refund decisions are at the discretion of Vai.
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
            <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center text-white font-bold text-lg mr-3">
              <FaFileContract />
            </div>
            <h1 className="text-2xl font-bold text-white">Legal & Terms</h1>
          </div>
        </div>

        <p className="text-gray-400 mb-6">Important legal information about using Vai</p>

        {/* Legal Sections - Dark theme */}
        <div className="space-y-3">
          {legalSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;
            
            return (
              <div key={section.id} className="bg-[#0E1A2A] rounded-xl border border-[#1A2A4A] overflow-hidden hover:border-[#1A6BFF] transition">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#1A2A4A] transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="text-xl text-gray-400" />
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

        {/* Footer - Dark theme */}
        <div className="mt-8 p-6 bg-[#0E1A2A] rounded-xl border border-[#1A2A4A] text-center">
          <p className="text-sm text-gray-400">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            © {new Date().getFullYear()} Vai. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;