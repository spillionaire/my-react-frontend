import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      console.log('📡 Fetching user from:', `${API_URL}/api/auth/me`);
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setUser(response.data);
      console.log('✅ User fetched:', response.data.name);
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Message:', error.response?.data?.error);
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
      } else {
        toast.error('Failed to load user data');
      }
    } finally {
      setLoading(false);
    }
  };

  // ============ LOGIN ============
  const login = async (email, password) => {
    try {
      console.log('🔐 Login attempt:', { email, apiUrl: API_URL });
      
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      }, {
        timeout: 15000
      });
      
      const { token, user } = response.data;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }

      console.log('✅ Login successful, storing token');
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setToken(token);
      setUser(user);
      toast.success(`Welcome back, ${user.name || 'User'}!`);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Message:', error.response?.data?.error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout. Please check your internet.';
      } else if (!error.response) {
        errorMessage = 'Cannot reach server. Check your connection.';
      } else if (error.response.status === 401) {
        errorMessage = 'Invalid email or password.';
      } else if (error.response.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // ============ DRIVER LOGIN WITH REFERENCE ============
  const driverLogin = async (reference, password) => {
    try {
      console.log('🔐 Driver login attempt:', { reference });
      
      const response = await axios.post(`${API_URL}/api/auth/driver-login`, {
        reference,
        password,
      }, {
        timeout: 15000
      });
      
      const { token, user } = response.data;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setToken(token);
      setUser(user);
      toast.success(`Welcome back, ${user.name || 'Driver'}!`);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Driver login error:', error);
      
      let errorMessage = 'Login failed. Please check your reference and password.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout. Please check your internet.';
      } else if (!error.response) {
        errorMessage = 'Cannot reach server. Check your connection.';
      } else if (error.response.status === 401) {
        errorMessage = 'Invalid reference or password.';
      } else if (error.response.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // ============ REGISTER ============
  const register = async (userData) => {
    try {
      console.log('📝 Register attempt:', { email: userData.email });
      
      const response = await axios.post(`${API_URL}/api/auth/register`, userData, {
        timeout: 15000
      });
      
      const { token, user } = response.data;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setToken(token);
      setUser(user);
      toast.success(`Welcome, ${user.name || 'User'}!`);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Register error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout. Please check your internet.';
      } else if (!error.response) {
        errorMessage = 'Cannot reach server. Check your connection.';
      } else if (error.response.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // ============ DRIVER APPLICATION (WhatsApp Registration) ============
  const applyAsDriver = async (applicationData) => {
    try {
      console.log('📝 Driver application:', applicationData.email);
      
      const response = await axios.post(`${API_URL}/api/auth/driver-apply`, applicationData, {
        timeout: 15000
      });
      
      toast.success(response.data.message || 'Application submitted! You will be contacted on WhatsApp.');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Application error:', error);
      
      let errorMessage = 'Application failed. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // ============ LOGOUT ============
  const logout = () => {
    console.log('🔑 Logging out...');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  // ============ UPDATE USER ============
  const updateUser = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  // ============ VALUE OBJECT ============
  const value = {
    user,
    loading,
    token,
    login,
    driverLogin,
    register,        // ✅ register is defined here
    logout,
    updateUser,
    applyAsDriver,
    isAuthenticated: !!user,
    isRider: user?.role === 'rider',
    isDriver: user?.role === 'driver'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};