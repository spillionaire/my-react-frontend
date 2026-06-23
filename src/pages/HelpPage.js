import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaArrowLeft, 
  FaChevronDown, 
  FaChevronUp, 
  FaSearch, 
  FaPhone, 
  FaEnvelope, 
  FaComment, 
  FaTicketAlt,
  FaCar,
  FaMoneyBill,
  FaShieldAlt,
  FaUser
} from 'react-icons/fa';

const HelpPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      category: 'Rides',
      icon: FaCar,
      question: 'How do I request a ride?',
      answer: 'Simply open the app, enter your pickup location and destination, select your preferred service type, and tap "Request Ride". You will be matched with a nearby driver.'
    },
    {
      id: 2,
      category: 'Rides',
      icon: FaCar,
      question: 'How is the fare calculated?',
      answer: 'Fare is calculated based on distance, service type, and time of day. Peak hours have a 20% surcharge. You will see the estimated fare before confirming your ride.'
    },
    {
      id: 3,
      category: 'Rides',
      icon: FaCar,
      question: 'Can I cancel a ride?',
      answer: 'Yes, you can cancel a ride before the driver arrives. If the ride is in progress, you cannot cancel but can end the trip early through the app.'
    },
    {
      id: 4,
      category: 'Payment',
      icon: FaMoneyBill,
      question: 'What payment methods are accepted?',
      answer: 'We accept Cash, Card (Visa/Mastercard), and Wallet payments. All card payments are secure and encrypted.'
    },
    {
      id: 5,
      category: 'Payment',
      icon: FaMoneyBill,
      question: 'Is my card information safe?',
      answer: 'Yes, we use industry-standard encryption and do not store your card details on our servers. All payments are processed through secure payment gateways.'
    },
    {
      id: 6,
      category: 'Safety',
      icon: FaShieldAlt,
      question: 'How does Vai ensure rider safety?',
      answer: 'We have multiple safety features including: driver background checks, real-time GPS tracking, emergency SOS button, in-app chat, and shared trip details with trusted contacts.'
    },
    {
      id: 7,
      category: 'Safety',
      icon: FaShieldAlt,
      question: 'What should I do in an emergency?',
      answer: 'Use the emergency SOS button in the app, contact local emergency services, and report the incident to Vai support immediately through the support section.'
    },
    {
      id: 8,
      category: 'Drivers',
      icon: FaUser,
      question: 'How do I become a Vai driver?',
      answer: 'Apply through the Driver Application page on our website. You will need to provide your vehicle details, ID, and driver\'s license. After approval, you will receive login credentials.'
    },
    {
      id: 9,
      category: 'Drivers',
      icon: FaUser,
      question: 'When do I get paid?',
      answer: 'Earnings are calculated per ride and paid out weekly or on-demand depending on your payment settings. You can track your earnings in the driver dashboard.'
    },
    {
      id: 10,
      category: 'Account',
      icon: FaUser,
      question: 'How do I reset my password?',
      answer: 'Go to the login page and click "Forgot Password". Enter your registered email address and we will send you a password reset link.'
    }
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
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
            <div className="w-10 h-10 bg-[#1A6BFF] rounded-xl flex items-center justify-center text-white font-bold text-lg mr-3 shadow-lg shadow-[#1A6BFF]/30">
              V
            </div>
            <h1 className="text-2xl font-bold text-white">Help & FAQ</h1>
          </div>
        </div>

        <p className="text-gray-400 mb-6">Find answers to common questions and get support</p>

        {/* Search Bar - Dark theme */}
        <div className="relative mb-6">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
          />
        </div>

        {/* Quick Support Options - Dark theme */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => navigate('/support')}
            className="p-4 bg-[#0E1A2A] rounded-xl border border-[#1A2A4A] hover:border-[#1A6BFF] transition text-center"
          >
            <FaComment className="text-2xl mx-auto mb-2 text-[#1A6BFF]" />
            <span className="text-sm font-medium text-white">Chat Support</span>
          </button>
          <button
            onClick={() => navigate('/report')}
            className="p-4 bg-[#0E1A2A] rounded-xl border border-[#1A2A4A] hover:border-[#1A6BFF] transition text-center"
          >
            <FaTicketAlt className="text-2xl mx-auto mb-2 text-[#1A6BFF]" />
            <span className="text-sm font-medium text-white">Submit Ticket</span>
          </button>
          <button
            onClick={() => navigate('/safety')}
            className="p-4 bg-[#0E1A2A] rounded-xl border border-[#1A2A4A] hover:border-[#1A6BFF] transition text-center"
          >
            <FaPhone className="text-2xl mx-auto mb-2 text-[#1A6BFF]" />
            <span className="text-sm font-medium text-white">Safety Centre</span>
          </button>
          <button
            onClick={() => window.open('mailto:support@vai.co.za')}
            className="p-4 bg-[#0E1A2A] rounded-xl border border-[#1A2A4A] hover:border-[#1A6BFF] transition text-center"
          >
            <FaEnvelope className="text-2xl mx-auto mb-2 text-[#1A6BFF]" />
            <span className="text-sm font-medium text-white">Email Us</span>
          </button>
        </div>

        {/* FAQ Categories - Dark theme */}
        <div className="space-y-2">
          {filteredFaqs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No results found. Try a different search term.</p>
          ) : (
            filteredFaqs.map((faq) => {
              const Icon = faq.icon;
              const isExpanded = expandedFaq === faq.id;
              return (
                <div key={faq.id} className="bg-[#0E1A2A] rounded-xl border border-[#1A2A4A] overflow-hidden hover:border-[#1A6BFF] transition">
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#1A2A4A] transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="text-[#1A6BFF] text-sm" />
                      <div>
                        <span className="text-xs text-gray-500 uppercase">{faq.category}</span>
                        <p className="font-medium text-white">{faq.question}</p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <FaChevronUp className="text-gray-400 flex-shrink-0 ml-4" />
                    ) : (
                      <FaChevronDown className="text-gray-400 flex-shrink-0 ml-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-6 pb-4 pt-1 border-t border-[#1A2A4A]">
                      <p className="text-gray-400 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Still Need Help? - Dark theme */}
        <div className="mt-8 p-6 bg-[#1A6BFF] rounded-xl text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Still need help?</h3>
          <p className="text-blue-100 text-sm mb-4">Our support team is here to assist you</p>
          <button
            onClick={() => navigate('/support')}
            className="px-6 py-2 bg-white text-black rounded-xl hover:bg-gray-100 transition font-medium"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;