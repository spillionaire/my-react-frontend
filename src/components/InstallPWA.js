import React, { useState, useEffect } from 'react';
import { FaDownload, FaTimes } from 'react-icons/fa';

const InstallPWA = ({ isVisible, onInstall, onDismiss }) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);
  }, []);

  if (isInstalled) return null;
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-[#0E1A2A] rounded-xl shadow-2xl p-4 border border-[#1A2A4A] z-50 animate-slide-up">
      <div className="flex items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🚗</span>
            <h4 className="font-bold text-white">Install Vai</h4>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {isIOS 
              ? 'Tap the Share button and select "Add to Home Screen"' 
              : 'Get the app for faster rides and offline access'}
          </p>
          
          <div className="flex items-center space-x-2 mt-3">
            {isIOS ? (
              <div className="text-xs text-gray-500 flex items-center">
                <span className="bg-[#1A2A4A] px-2 py-1 rounded mr-1 text-white">⬆️</span>
                Tap Share → Add to Home Screen
              </div>
            ) : (
              <>
                <button
                  onClick={onInstall}
                  className="bg-[#1A6BFF] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#5294FF] transition flex items-center shadow-lg shadow-[#1A6BFF]/30"
                >
                  <FaDownload className="mr-2" /> Install
                </button>
                <button
                  onClick={onDismiss}
                  className="text-gray-500 text-sm hover:text-white transition"
                >
                  Not now
                </button>
              </>
            )}
          </div>
          
          {isIOS && (
            <button
              onClick={onDismiss}
              className="text-gray-500 text-xs hover:text-white transition mt-2"
            >
              Dismiss
            </button>
          )}
        </div>
        {!isIOS && (
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-white transition"
          >
            <FaTimes />
          </button>
        )}
      </div>
    </div>
  );
};

export default InstallPWA;