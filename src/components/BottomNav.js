import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaCar, 
  FaHistory, 
  FaUser, 
  FaSignOutAlt,
  FaToggleOn,
  FaToggleOff
} from 'react-icons/fa';

const BottomNav = ({ user, isAvailable, toggleAvailability }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Don't show bottom nav on login/register pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-screen-lg mx-auto px-4">
        {/* Home */}
        <button
          onClick={() => navigate(user?.role === 'rider' ? '/rider' : '/driver')}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition ${
            isActive('/rider') || isActive('/driver')
              ? 'text-black'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <FaHome className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* Primary Action (Request Ride / Go Online) */}
        {user?.role === 'rider' ? (
          <button
            onClick={() => navigate('/rider')}
            className="flex flex-col items-center justify-center w-14 h-14 bg-black text-white rounded-full shadow-lg -mt-8 transition hover:bg-gray-800"
          >
            <FaCar className="h-6 w-6" />
            <span className="text-[9px] mt-0.5 font-medium">Ride</span>
          </button>
        ) : (
          <button
            onClick={toggleAvailability}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-lg -mt-8 transition ${
              isAvailable
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {isAvailable ? (
              <FaToggleOn className="h-6 w-6" />
            ) : (
              <FaToggleOff className="h-6 w-6" />
            )}
            <span className="text-[9px] mt-0.5 font-medium">
              {isAvailable ? 'Online' : 'Offline'}
            </span>
          </button>
        )}

        {/* History */}
        <button
          onClick={() => navigate('/history')}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition ${
            isActive('/history')
              ? 'text-black'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <FaHistory className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">History</span>
        </button>

        {/* Profile / Logout */}
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to logout?')) {
              navigate('/login');
              window.location.reload();
            }
          }}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-full transition text-gray-400 hover:text-red-600"
        >
          <FaSignOutAlt className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default BottomNav;