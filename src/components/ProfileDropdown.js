import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUser, 
  FaCog, 
  FaHistory, 
  FaShieldAlt, 
  FaQuestionCircle, 
  FaFileContract, 
  FaPhone, 
  FaSignOutAlt, 
  FaCreditCard, 
  FaTicketAlt, 
  FaExclamationTriangle,
  FaHome,
  FaCheckCircle
} from 'react-icons/fa';

const ProfileDropdown = ({ user, logout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    {
      label: 'Profile',
      icon: FaUser,
      onClick: () => navigate('/profile'),
      divider: false
    },
    {
      label: 'Ride History',
      icon: FaHistory,
      onClick: () => navigate('/history'),
      divider: false
    },
    {
      label: 'Payment Methods',
      icon: FaCreditCard,
      onClick: () => navigate('/payment-methods'),
      divider: false
    },
    {
      label: 'Safety Centre',
      icon: FaShieldAlt,
      onClick: () => navigate('/safety'),
      divider: false
    },
    {
      label: 'Help & FAQ',
      icon: FaQuestionCircle,
      onClick: () => navigate('/help'),
      divider: false
    },
    {
      label: 'Support',
      icon: FaPhone,
      onClick: () => navigate('/support'),
      divider: false
    },
    {
      label: 'Legal & Terms',
      icon: FaFileContract,
      onClick: () => navigate('/legal'),
      divider: false
    },
    {
      label: 'Report an Issue',
      icon: FaExclamationTriangle,
      onClick: () => navigate('/report'),
      divider: true
    },
    {
      label: 'Logout',
      icon: FaSignOutAlt,
      onClick: logout,
      divider: false,
      className: 'text-red-400 hover:bg-red-500/10'
    }
  ];

  const getDashboardRoute = () => {
    if (user?.role === 'driver') return '/driver';
    return '/rider';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Avatar Button - Dark theme */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-[#0E1A2A] border border-[#1A2A4A] flex items-center justify-center hover:border-[#1A6BFF] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] relative"
      >
        {user?.profilePhoto ? (
          <img 
            src={user.profilePhoto} 
            alt={user.name} 
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <span className="text-gray-400 font-semibold text-sm">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        )}
        {/* Verified Badge */}
        {user?.isVerified && (
          <span className="absolute -bottom-1 -right-1 bg-[#1A6BFF] text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#080E1F]">
            ✓
          </span>
        )}
      </button>

      {/* Dropdown Menu - Dark theme */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#0E1A2A] rounded-xl shadow-2xl border border-[#1A2A4A] py-2 z-50 max-h-[80vh] overflow-y-auto">
          {/* User Info Header - Dark theme */}
          <div className="px-4 py-3 border-b border-[#1A2A4A]">
            <div className="flex items-center space-x-3">
              <div className="relative">
                {user?.profilePhoto ? (
                  <img 
                    src={user.profilePhoto} 
                    alt={user.name} 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#1A2A4A] flex items-center justify-center">
                    <span className="text-gray-400 font-semibold text-lg">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                {user?.isVerified && (
                  <span className="absolute -bottom-1 -right-1 bg-[#1A6BFF] text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#0E1A2A]">
                    ✓
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="text-xs text-yellow-400">★</span>
                  <span className="text-xs text-gray-400">{user?.rating?.average?.toFixed(1) || 'New'}</span>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-400 capitalize">{user?.role}</span>
                  {user?.isVerified && (
                    <>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-[#1A6BFF]">Verified</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Link - Dark theme */}
          <button
            onClick={() => {
              setIsOpen(false);
              navigate(getDashboardRoute());
            }}
            className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-[#1A2A4A] transition-colors text-left border-b border-[#1A2A4A]"
          >
            <FaHome className="text-sm text-gray-500" />
            <span className="text-sm text-white">Dashboard</span>
          </button>

          {/* Menu Items - Dark theme */}
          {menuItems.map((item, index) => (
            <React.Fragment key={index}>
              {item.divider && <hr className="my-2 border-[#1A2A4A]" />}
              <button
                onClick={() => {
                  setIsOpen(false);
                  item.onClick();
                }}
                className={`w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-[#1A2A4A] transition-colors text-left ${item.className || ''}`}
              >
                <item.icon className={`text-sm ${item.className?.includes('text-red') ? 'text-red-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${item.className?.includes('text-red') ? 'text-red-400' : 'text-white'}`}>
                  {item.label}
                </span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;