import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaArrowLeft, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaCar, 
  FaCamera, 
  FaSave, 
  FaSignOutAlt,
  FaStar,
  FaCheckCircle,
  FaShieldAlt
} from 'react-icons/fa';
import { API_URL } from '../config';

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicle: {
      model: '',
      plateNumber: '',
      color: '',
      seats: 4
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        vehicle: {
          model: user.vehicle?.model || '',
          plateNumber: user.vehicle?.plateNumber || '',
          color: user.vehicle?.color || '',
          seats: user.vehicle?.seats || 4
        }
      });
      setProfilePhoto(user.profilePhoto || '');
    }
  }, [user]);

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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${API_URL}/api/auth/upload-photo`,
          { photoUrl: base64String },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (response.data.photoUrl) {
          setProfilePhoto(response.data.photoUrl);
          if (updateUser) {
            updateUser({ profilePhoto: response.data.photoUrl });
          }
          toast.success('Profile photo updated!');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/api/auth/profile`,
        formData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data) {
        if (updateUser) {
          updateUser(response.data);
        }
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#03060F]">
      {/* Header - Dark theme */}
      <header className="bg-[#080E1F] border-b border-[#1A2A4A] px-4 py-3 flex justify-between items-center shadow-none sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(user?.role === 'driver' ? '/driver' : '/rider')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#1A6BFF] rounded-xl flex items-center justify-center text-white font-bold text-sm mr-2 shadow-lg shadow-[#1A6BFF]/30">
              V
            </div>
            <h1 className="text-xl font-bold text-white">Vai</h1>
          </div>
          <span className="text-sm text-gray-400 font-medium">Profile</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-400 transition-colors"
        >
          <FaSignOutAlt className="h-5 w-5" />
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Photo - Dark theme */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[#0E1A2A] border-2 border-[#1A2A4A] flex items-center justify-center overflow-hidden">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <FaUser className="h-10 w-10 text-gray-500" />
              )}
            </div>
            {user?.isVerified && (
              <span className="absolute -bottom-1 -right-1 bg-[#1A6BFF] text-white text-[10px] rounded-full w-6 h-6 flex items-center justify-center border-2 border-[#080E1F]">
                ✓
              </span>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-2 -right-2 p-2 bg-[#1A6BFF] text-white rounded-full hover:bg-[#5294FF] transition shadow-lg shadow-[#1A6BFF]/30 disabled:opacity-50"
            >
              <FaCamera className="h-4 w-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          <h2 className="text-xl font-bold text-white mt-3">{user?.name}</h2>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs text-gray-400 capitalize">{user?.role}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-yellow-400 flex items-center">
              <FaStar className="mr-1" /> {user?.rating?.average?.toFixed(1) || 'New'}
            </span>
            {user?.isVerified && (
              <>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-blue-400 flex items-center">
                  <FaCheckCircle className="mr-1" /> Verified
                </span>
              </>
            )}
          </div>
        </div>

        {/* Profile Form - Dark theme */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <FaUser className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={user?.email || ''}
                className="w-full pl-10 pr-4 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-gray-400 cursor-not-allowed"
                disabled
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <FaPhone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
              />
            </div>
          </div>

          {user?.role === 'driver' && (
            <div className="space-y-3 border-t border-[#1A2A4A] pt-4">
              <h3 className="text-sm font-medium text-gray-300 flex items-center">
                <FaCar className="mr-2" /> Vehicle Details
              </h3>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Model</label>
                <input
                  type="text"
                  name="vehicle.model"
                  value={formData.vehicle.model}
                  onChange={handleChange}
                  placeholder="Toyota Corolla"
                  className="w-full px-4 py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition text-sm"
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
                <label className="block text-xs text-gray-500 mb-1">Color</label>
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
                <label className="block text-xs text-gray-500 mb-1">Seats</label>
                <input
                  type="number"
                  name="vehicle.seats"
                  value={formData.vehicle.seats}
                  onChange={handleChange}
                  min="1"
                  max="7"
                  className="w-full px-4 py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition text-sm"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#1A6BFF] text-white rounded-xl font-semibold hover:bg-[#5294FF] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1A6BFF]/30 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <FaSave className="mr-2" /> Save Changes
              </>
            )}
          </button>
        </form>

        {/* Account Info - Dark theme */}
        <div className="mt-6 p-4 bg-[#0E1A2A] rounded-xl border border-[#1A2A4A]">
          <h4 className="text-xs font-medium text-gray-500 mb-2">Account Information</h4>
          <div className="space-y-1 text-xs text-gray-400">
            <p>Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
            <p>Account type: <span className="capitalize">{user?.role}</span></p>
            {user?.totalTrips > 0 && (
              <p>Total trips: {user.totalTrips}</p>
            )}
            {user?.role === 'driver' && user?.driverApproval?.reference && (
              <p className="flex items-center">
                <FaShieldAlt className="mr-1 text-xs" />
                Reference: <span className="font-mono ml-1 text-white">{user.driverApproval.reference}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;