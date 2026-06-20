import React, { useState, useEffect } from 'react';
import { FaDownload } from 'react-icons/fa';

const PWAUpdate = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    if (!navigator.serviceWorker) return;

    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const checkForUpdates = () => {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdate(true);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setShowUpdate(true);
              }
            });
          }
        });
      });
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, 60000);

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const updateApp = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdate(false);
    }
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-xl shadow-2xl max-w-sm z-50 animate-slide-up">
      <div className="flex items-start space-x-3">
        <div className="flex-1">
          <h4 className="font-bold text-sm">🔄 Update Available!</h4>
          <p className="text-xs text-gray-300 mt-1">
            A new version of Vai is ready. Update now for the latest features.
          </p>
        </div>
        <button
          onClick={updateApp}
          className="bg-white text-black px-3 py-1 rounded-lg text-sm font-medium hover:bg-gray-100 transition flex items-center whitespace-nowrap"
        >
          <FaDownload className="mr-1" /> Update
        </button>
      </div>
    </div>
  );
};

export default PWAUpdate;