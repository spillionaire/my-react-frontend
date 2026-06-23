import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import DriverLogin from './pages/DriverLogin';
import DriverApplication from './pages/DriverApplication';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import RiderDashboard from './pages/RiderDashboard';
import DriverDashboard from './pages/DriverDashboard';
import RideHistory from './pages/RideHistory';
import InstallPWA from './components/InstallPWA';
import PWAUpdate from './components/PWAUpdate';
import HelpPage from './pages/HelpPage';
import SafetyCentre from './pages/SafetyCentre';
import LegalPage from './pages/LegalPage';
import SupportPage from './pages/SupportPage';
import ReportPage from './pages/ReportPage';
import PaymentMethods from './pages/PaymentMethods';
import { API_URL } from './config';
import './App.css';

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Check API connection on mount
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const response = await fetch(`${API_URL}/api/health`);
        if (response.ok) {
          console.log('✅ API is reachable at:', API_URL);
        } else {
          console.warn('⚠️ API returned error:', response.status);
        }
      } catch (error) {
        console.error('❌ Cannot reach API:', error);
      }
    };
    
    checkApiConnection();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
      console.log('📱 PWA installation prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      console.log('🎉 Vai PWA installed successfully!');
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('📱 Vai is running in standalone mode');
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`📱 User response to install prompt: ${outcome}`);
        setDeferredPrompt(null);
        setShowInstallBanner(false);
      } catch (error) {
        console.error('Error during PWA installation:', error);
      }
    }
  };

  const dismissInstall = () => {
    setShowInstallBanner(false);
    setDeferredPrompt(null);
  };

  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                },
                error: {
                  duration: 4000,
                },
              }}
            />
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/driver-login" element={<DriverLogin />} />
              <Route path="/driver-apply" element={<DriverApplication />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/" element={<Navigate to="/login" />} />
              
              {/* Public Info Pages */}
              <Route path="/help" element={<HelpPage />} />
              <Route path="/safety" element={<SafetyCentre />} />
              <Route path="/legal" element={<LegalPage />} />
              
              {/* Protected Routes */}
              <Route element={<PrivateRoute />}>
                <Route path="/rider" element={<RiderDashboard />} />
                <Route path="/driver" element={<DriverDashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/history" element={<RideHistory />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/report" element={<ReportPage />} />
                <Route path="/payment-methods" element={<PaymentMethods />} />
              </Route>
            </Routes>
            
            <InstallPWA 
              isVisible={showInstallBanner} 
              onInstall={installPWA} 
              onDismiss={dismissInstall} 
            />
            <PWAUpdate />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;