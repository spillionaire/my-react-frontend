/**
 * Get location with fallback options
 * @returns {Promise} Location data or error
 */
export const getLocationWithFallback = () => {
  return new Promise((resolve) => {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      resolve({ error: 'Geolocation not supported', code: 'UNSUPPORTED' });
      return;
    }

    // Check if running on HTTPS (required for mobile)
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      resolve({ error: 'HTTPS required for GPS on mobile', code: 'HTTPS_REQUIRED' });
      return;
    }

    // Try with high accuracy first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          success: true,
          source: 'gps'
        });
      },
      (error) => {
        console.warn('⚠️ GPS Error:', error.message, 'Code:', error.code);
        
        // If high accuracy fails, try with lower accuracy
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy || 100,
              success: true,
              source: 'gps_low',
              fallback: true
            });
          },
          (error2) => {
            // If GPS fails, try network location
            getNetworkLocation().then((networkResult) => {
              if (networkResult.success) {
                resolve({
                  ...networkResult,
                  source: 'network',
                  fallback: true
                });
              } else {
                resolve({ 
                  error: error.message || 'Unable to get location',
                  code: error.code || 'UNKNOWN'
                });
              }
            });
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
};

/**
 * Get network-based location (IP geolocation)
 */
export const getNetworkLocation = () => {
  return new Promise((resolve) => {
    fetch('https://ipapi.co/json/')
      .then(res => {
        if (!res.ok) throw new Error('Network location failed');
        return res.json();
      })
      .then(data => {
        if (data.latitude && data.longitude) {
          resolve({
            lat: data.latitude,
            lng: data.longitude,
            success: true,
            source: 'network'
          });
        } else {
          throw new Error('No coordinates');
        }
      })
      .catch(() => {
        resolve({ error: 'Network location failed', code: 'NETWORK_FAILED' });
      });
  });
};

/**
 * Check if GPS is available
 */
export const isGPSAvailable = () => {
  return !!navigator.geolocation;
};

/**
 * Check if HTTPS is required
 */
export const isHTTPSRequired = () => {
  return window.location.protocol === 'http:' && window.location.hostname !== 'localhost';
};

/**
 * Format GPS error message
 */
export const getGPSErrorMessage = (error) => {
  if (error === 'UNSUPPORTED') return 'Your browser does not support GPS';
  if (error === 'HTTPS_REQUIRED') return 'HTTPS required for GPS on mobile';
  if (error === 'NETWORK_FAILED') return 'Unable to get network location';
  if (error === 'UNKNOWN') return 'Unable to get location. Please click on the map.';
  return 'Unable to get location. Please click on the map.';
};