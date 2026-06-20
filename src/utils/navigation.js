/**
 * Calculate bearing (direction) between two points
 * @param {number} lat1 - Starting latitude
 * @param {number} lng1 - Starting longitude
 * @param {number} lat2 - Ending latitude
 * @param {number} lng2 - Ending longitude
 * @returns {number} Bearing in degrees (0-360)
 */
export const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;
  return bearing;
};

/**
 * Calculate distance between two points in kilometers
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Calculate distance in meters between two points
 */
export const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
  return calculateDistance(lat1, lng1, lat2, lng2) * 1000;
};

/**
 * Calculate ETA based on distance and average speed
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} avgSpeedKmh - Average speed in km/h (default: 40)
 * @returns {number} ETA in minutes
 */
export const calculateETA = (distanceKm, avgSpeedKmh = 40) => {
  if (!distanceKm || distanceKm <= 0) return 0;
  // Add 2 minutes minimum for pickup/dropoff
  const hours = distanceKm / Math.max(avgSpeedKmh, 5);
  return (hours * 60) + 2;
};

/**
 * Calculate ETA between two points
 * @param {object} from - {lat, lng} starting point
 * @param {object} to - {lat, lng} destination point
 * @param {number} avgSpeedKmh - Average speed in km/h (default: 40)
 * @returns {number} ETA in minutes
 */
export const calculateETABetweenPoints = (from, to, avgSpeedKmh = 40) => {
  const distance = calculateDistance(from.lat, from.lng, to.lat, to.lng);
  return calculateETA(distance, avgSpeedKmh);
};

/**
 * Get estimated arrival time string
 * @param {number} minutes - Minutes until arrival
 * @returns {string} Formatted ETA string
 */
export const getETAString = (minutes) => {
  if (!minutes || minutes < 0) return '--';
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

/**
 * Smoothly interpolate between two positions
 */
export const interpolatePosition = (pos1, pos2, fraction) => {
  return {
    lat: pos1.lat + (pos2.lat - pos1.lat) * fraction,
    lng: pos1.lng + (pos2.lng - pos1.lng) * fraction
  };
};

/**
 * Check if point is within South Africa
 */
export const isInSouthAfrica = (lat, lng) => {
  return lat >= -35.0 && lat <= -22.0 && lng >= 16.0 && lng <= 33.0;
};

/**
 * Get route between two points (simplified - straight line)
 * In production, use Mapbox or Google Directions API
 */
export const getRoutePoints = (start, end, numPoints = 20) => {
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    points.push({
      lat: start.lat + (end.lat - start.lat) * fraction,
      lng: start.lng + (end.lng - start.lng) * fraction
    });
  }
  return points;
};

/**
 * Get route points with slight curve for visual effect
 */
export const getRoutePointsWithCurve = (start, end, numPoints = 30) => {
  const points = [];
  const midLat = (start.lat + end.lat) / 2;
  const midLng = (start.lng + end.lng) / 2;
  // Add slight curve offset
  const offset = 0.001 * (Math.random() - 0.5);
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Quadratic bezier for curve
    const lat = (1-t) * (1-t) * start.lat + 2 * (1-t) * t * (midLat + offset) + t * t * end.lat;
    const lng = (1-t) * (1-t) * start.lng + 2 * (1-t) * t * (midLng + offset) + t * t * end.lng;
    points.push({ lat, lng });
  }
  return points;
};

/**
 * Format distance for display
 */
export const formatDistance = (km) => {
  if (km === null || km === undefined) return '--';
  if (km < 0.1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

/**
 * Format distance with more detail
 */
export const formatDistanceDetailed = (km) => {
  if (km === null || km === undefined) return '--';
  if (km < 0.1) {
    return `${Math.round(km * 1000)} meters`;
  }
  if (km < 1) {
    return `${(km * 1000).toFixed(0)} meters`;
  }
  return `${km.toFixed(1)} kilometers`;
};

/**
 * Format time for display
 */
export const formatTime = (minutes) => {
  if (minutes === null || minutes === undefined || minutes < 0) return '--';
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`;
  }
  if (minutes < 60) {
    return `${Math.round(minutes)}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

/**
 * Format time with more detail
 */
export const formatTimeDetailed = (minutes) => {
  if (minutes === null || minutes === undefined || minutes < 0) return '--';
  if (minutes < 1) {
    return `${Math.round(minutes * 60)} seconds`;
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
};

/**
 * Get distance and ETA between two points with speed consideration
 * @param {object} from - {lat, lng} starting point
 * @param {object} to - {lat, lng} destination point
 * @param {number} speedKmh - Current speed in km/h (optional)
 * @returns {object} { distanceKm, distanceMeters, etaMinutes, etaFormatted, distanceFormatted }
 */
export const getDistanceAndETA = (from, to, speedKmh = null) => {
  const distanceKm = calculateDistance(from.lat, from.lng, to.lat, to.lng);
  const distanceMeters = distanceKm * 1000;
  
  // Use provided speed or default based on distance
  let avgSpeed = speedKmh || 40;
  if (distanceKm < 0.5) avgSpeed = 20; // Slow for very short distances
  if (distanceKm > 5) avgSpeed = 50; // Faster for longer distances
  
  const etaMinutes = calculateETA(distanceKm, avgSpeed);
  
  return {
    distanceKm,
    distanceMeters,
    etaMinutes,
    etaFormatted: formatTime(etaMinutes),
    distanceFormatted: formatDistance(distanceKm)
  };
};

/**
 * Get South Africa bounds for map
 */
export const getSouthAfricaBounds = () => {
  return {
    sw: { lat: -34.5, lng: 17.0 },
    ne: { lat: -22.0, lng: 33.0 }
  };
};

/**
 * Get time-based greeting
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Format currency (South African Rand)
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'R0.00';
  return `R${amount.toFixed(2)}`;
};

/**
 * Get driving speed suggestion based on road type
 * @param {string} roadType - 'highway', 'urban', 'suburban', 'rural'
 * @returns {number} Suggested speed in km/h
 */
export const getSuggestedSpeed = (roadType = 'urban') => {
  const speeds = {
    highway: 80,
    urban: 40,
    suburban: 50,
    rural: 60,
    residential: 30
  };
  return speeds[roadType] || 40;
};

/**
 * Calculate arrival time based on current time and ETA
 * @param {number} etaMinutes - Minutes until arrival
 * @returns {string} Formatted arrival time (e.g., "2:30 PM")
 */
export const getArrivalTime = (etaMinutes) => {
  if (!etaMinutes || etaMinutes < 0) return '--';
  const now = new Date();
  const arrival = new Date(now.getTime() + etaMinutes * 60000);
  return arrival.toLocaleTimeString('en-ZA', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Get distance and time status message
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} etaMinutes - ETA in minutes
 * @param {string} type - 'driver' or 'rider'
 * @returns {string} Status message
 */
export const getStatusMessage = (distanceKm, etaMinutes, type = 'driver') => {
  if (!distanceKm || distanceKm < 0) return 'Calculating...';
  
  if (distanceKm < 0.1) {
    return type === 'driver' ? '📍 You have arrived!' : '📍 Driver has arrived!';
  }
  
  const dist = formatDistance(distanceKm);
  const time = formatTime(etaMinutes);
  
  if (type === 'driver') {
    return `${dist} away • ETA ${time}`;
  } else {
    return `Driver ${dist} away • ETA ${time}`;
  }
};