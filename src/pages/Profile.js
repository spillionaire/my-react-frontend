// src/pages/Profile.js
import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaUser, 
  FaPhone, 
  FaEnvelope, 
  FaCar, 
  FaCamera, 
  FaStar, 
  FaHistory,
  FaArrowLeft,
  FaEdit,
  FaSave,
  FaTimes,
  FaWallet,
  FaSignOutAlt
} from 'react-icons/fa';
import { API_URL } from '../config';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    profilePhoto: user?.profilePhoto || '',
    vehicle: user?.vehicle || { model: '', color: '', plateNumber: '', type: 'sedan' },
    savedAddresses: user?.savedAddresses || []
  });

  // ============ HANDLE PHOTO UPLOAD ============
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    try {
      setUploading(true);
      console.log('📸 Uploading photo...');
      toast.loading('Uploading photo...', { id: 'upload' });
      
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        try {
          const photoUrl = reader.result;
          console.log('📸 Photo converted, sending to server...');
          
          const token = localStorage.getItem('token');
          const response = await axios.post(`${API_URL}/api/auth/upload-photo`, 
            { photoUrl },
            { 
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 30000
            }
          );
          
          console.log('✅ Photo uploaded successfully:', response.data);
          
          // Update user context
          const photoUrlResult = response.data.photoUrl || response.data.photoUrl;
          updateUser({ profilePhoto: photoUrlResult });
          setFormData(prev => ({ ...prev, profilePhoto: photoUrlResult }));
          
          toast.dismiss('upload');
          toast.success('Profile photo updated!');
          
        } catch (error) {
          console.error('❌ Upload error:', error);
          console.error('❌ Response:', error.response?.data);
          toast.dismiss('upload');
          toast.error(error.response?.data?.error || 'Failed to upload photo');
        } finally {
          setUploading(false);
        }
      };
      
      reader.onerror = () => {
        toast.dismiss('upload');
        toast.error('Failed to read image file');
        setUploading(false);
      };
    } catch (error) {
      console.error('❌ Upload error:', error);
      toast.dismiss('upload');
      toast.error('Failed to upload photo');
      setUploading(false);
    }
  };

  // ============ HANDLE SAVE PROFILE ============
  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/auth/profile`, formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      updateUser(formData);
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // ============ HANDLE CHANGE ============
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // ============ HANDLE LOGOUT ============
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ============ GET INITIALS FOR AVATAR ============
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-black">
            <FaArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Profile</h1>
          <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-700 flex items-center">
            <FaSignOutAlt className="mr-1 h-4 w-4" /> Logout
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Profile Photo */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div 
                className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-2 border-gray-300 cursor-pointer hover:opacity-80 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.profilePhoto ? (
                  <img src={formData.profilePhoto} alt={formData.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                    {getInitials(formData.name)}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full hover:bg-gray-800 transition disabled:opacity-50"
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
            {uploading && <p className="text-xs text-blue-500 mt-2 animate-pulse">Uploading...</p>}
            <p className="text-xs text-gray-400 mt-1">Click photo to change</p>
            <h2 className="text-xl font-bold mt-2">{user?.name}</h2>
            <p className="text-gray-500 capitalize">{user?.role}</p>
            {user?.role === 'driver' && (
              <div className="flex items-center mt-1">
                <FaStar className="text-yellow-500 mr-1" />
                <span className="font-medium">{user?.rating?.average?.toFixed(1) || 'New'}</span>
                <span className="text-gray-400 text-sm ml-1">({user?.rating?.count || 0} reviews)</span>
              </div>
            )}
          </div>

          {/* Edit Form or View Mode */}
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              
              {user?.role === 'driver' && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Vehicle Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                      <input
                        type="text"
                        name="vehicle.model"
                        value={formData.vehicle?.model || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                      <input
                        type="text"
                        name="vehicle.color"
                        value={formData.vehicle?.color || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number</label>
                      <input
                        type="text"
                        name="vehicle.plateNumber"
                        value={formData.vehicle?.plateNumber || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        name="vehicle.type"
                        value={formData.vehicle?.type || 'sedan'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        <option value="sedan">Sedan</option>
                        <option value="suv">SUV</option>
                        <option value="van">Van</option>
                        <option value="hatchback">Hatchback</option>
                        <option value="motorbike">Motorbike</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center"
                >
                  <FaSave className="mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition flex items-center"
                >
                  <FaTimes className="mr-2" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-500">Name</span>
                <span className="font-medium">{user?.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{user?.phone}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              {user?.role === 'driver' && user?.vehicle && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-500">Vehicle</span>
                  <span className="font-medium">
                    {user.vehicle.color} {user.vehicle.model} ({user.vehicle.plateNumber})
                  </span>
                </div>
              )}
              {user?.role === 'driver' && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-500">Approval Status</span>
                  <span className={`font-medium ${user?.driverApproval?.isApproved ? 'text-green-600' : 'text-yellow-600'}`}>
                    {user?.driverApproval?.isApproved ? '✅ Approved' : '⏳ Pending Approval'}
                  </span>
                </div>
              )}
              {user?.driverApproval?.reference && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-500">Driver Reference</span>
                  <span className="font-mono font-medium text-sm">{user.driverApproval.reference}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-500">Total Trips</span>
                <span className="font-medium">{user?.totalTrips || 0}</span>
              </div>
              
              <button
                onClick={() => setEditing(true)}
                className="w-full mt-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition flex items-center justify-center"
              >
                <FaEdit className="mr-2" /> Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Ratings Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-4">
          <h3 className="font-bold mb-4 flex items-center">
            <FaStar className="text-yellow-500 mr-2" /> Ratings & Reviews
          </h3>
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No ratings yet</p>
            <p className="text-xs">Complete rides to receive ratings</p>
          </div>
        </div>

        {/* History Button */}
        <button
          onClick={() => navigate('/history')}
          className="w-full mt-4 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition flex items-center justify-center"
        >
          <FaHistory className="mr-2" /> View Ride History
        </button>
      </div>
    </div>
  );
};

export default Profile;