// frontend/src/utils/pricing.js

// South African Pricing for Vai
// Updated: R10 min fare, R3-R5 per km (sliding scale), peak 20%

// ============ PRICING STRUCTURE ============
// Minimum fare: R10
// Rate per km: R3 (min) - R5 (max) based on distance
// Peak surcharge: 20% (includes booking fee)

const MIN_FARE = 10.0;
const MIN_RATE_PER_KM = 3.0;
const MAX_RATE_PER_KM = 5.0;

// Distance thresholds for sliding scale
const SHORT_DISTANCE_THRESHOLD = 5; // km - below this, rate is higher
const LONG_DISTANCE_THRESHOLD = 20; // km - above this, rate is lower

// Peak hours (24-hour format)
const PEAK_HOURS = {
  morning: { start: 6, end: 9 },
  evening: { start: 16, end: 19 }
};

// Peak surcharge (includes booking fee)
const PEAK_SURCHARGE = 0.20; // 20%

/**
 * Calculate rate per km based on distance (sliding scale)
 * Short distances: higher rate (closer to R5)
 * Long distances: lower rate (closer to R3)
 * 
 * @param {number} distanceKm - Distance in kilometers
 * @returns {number} Rate per km
 */
const getRatePerKm = (distanceKm) => {
  if (distanceKm <= SHORT_DISTANCE_THRESHOLD) {
    // Short distances: R5 per km
    return MAX_RATE_PER_KM;
  } else if (distanceKm >= LONG_DISTANCE_THRESHOLD) {
    // Long distances: R3 per km
    return MIN_RATE_PER_KM;
  } else {
    // Sliding scale between R5 and R3
    const range = LONG_DISTANCE_THRESHOLD - SHORT_DISTANCE_THRESHOLD;
    const position = (distanceKm - SHORT_DISTANCE_THRESHOLD) / range;
    return MAX_RATE_PER_KM - (position * (MAX_RATE_PER_KM - MIN_RATE_PER_KM));
  }
};

/**
 * Calculate fare for a ride in South Africa
 * PRICING: R10 min fare, R3-R5 per km (sliding scale), peak 20%
 * 
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} city - City name - kept for compatibility
 * @param {boolean} isPeak - Whether it's peak hour
 * @param {string} serviceType - 'economy', 'standard', 'premium', 'van'
 * @returns {Object} Fare breakdown
 */
export const calculateFareSA = (distanceKm, city = 'johannesburg', isPeak = false, serviceType = 'standard') => {
  // Service type multipliers
  const serviceMultipliers = {
    'economy': 0.8,    // 20% cheaper
    'standard': 1.0,   // Base price
    'premium': 1.5,    // 50% more expensive
    'van': 1.3         // 30% more expensive (7-seater)
  };
  const serviceMultiplier = serviceMultipliers[serviceType] || 1.0;

  // Get rate per km based on distance (sliding scale)
  const ratePerKm = getRatePerKm(distanceKm);

  // Calculate base fare: distance * rate per km
  let fare = distanceKm * ratePerKm;

  // Apply service multiplier
  fare = fare * serviceMultiplier;

  // Apply peak surcharge (20% - includes booking fee)
  if (isPeak) {
    fare = fare * (1 + PEAK_SURCHARGE);
  }

  // Apply minimum fare
  fare = Math.max(MIN_FARE, fare);

  // Round to 2 decimal places
  const finalFare = Math.round(fare * 100) / 100;

  // Calculate breakdown
  const baseFare = Math.round((distanceKm * ratePerKm) * 100) / 100;
  const serviceCharge = Math.round((distanceKm * ratePerKm * (serviceMultiplier - 1)) * 100) / 100;
  const peakSurcharge = isPeak ? Math.round((distanceKm * ratePerKm * serviceMultiplier * PEAK_SURCHARGE) * 100) / 100 : 0;

  return {
    total: finalFare,
    breakdown: {
      baseFare: baseFare,
      distanceCharge: Math.round(distanceKm * ratePerKm * serviceMultiplier * 100) / 100,
      serviceCharge: serviceCharge,
      peakSurcharge: peakSurcharge,
      serviceMultiplier: serviceMultiplier,
      ratePerKm: ratePerKm,
      minFareApplied: finalFare === MIN_FARE
    },
    distance: distanceKm,
    city: city.toLowerCase().trim(),
    isPeak: isPeak,
    serviceType: serviceType,
    perKm: ratePerKm,
    minFare: MIN_FARE,
    minRatePerKm: MIN_RATE_PER_KM,
    maxRatePerKm: MAX_RATE_PER_KM,
    peakSurchargePercent: PEAK_SURCHARGE * 100,
    currency: 'ZAR'
  };
};

/**
 * Check if current time is peak hour
 * @returns {boolean} True if peak hour
 */
export const isPeakHour = () => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Only weekdays (Monday-Friday)
  const isWeekday = day >= 1 && day <= 5;
  if (!isWeekday) return false;
  
  const { morning, evening } = PEAK_HOURS;
  
  return (hour >= morning.start && hour < morning.end) ||
         (hour >= evening.start && hour < evening.end);
};

/**
 * Get city from coordinates (simplified - in production use reverse geocoding)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} City name
 */
export const getCityFromCoordinates = (lat, lng) => {
  // Simplified: Just return a default city
  // In production, use reverse geocoding
  return 'johannesburg';
};

/**
 * Format currency in ZAR
 * @param {number} amount - Amount in Rands
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount) => {
  return `R${amount.toFixed(2)}`;
};

/**
 * Get service type options
 * @returns {Array} Service type options
 */
export const getServiceTypes = () => {
  return [
    { id: 'economy', name: 'Vai Go', description: 'Budget-friendly', multiplier: 0.8 },
    { id: 'standard', name: 'Vai X', description: 'Standard ride', multiplier: 1.0 },
    { id: 'premium', name: 'Vai Premium', description: 'Luxury ride', multiplier: 1.5 },
    { id: 'van', name: 'Vai Van', description: '7-Seater', multiplier: 1.3 }
  ];
};

/**
 * Get city list for South Africa
 * @returns {Array} City objects with coordinates
 */
export const getSouthAfricanCities = () => {
  return [
    { name: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
    { name: 'Pretoria', lat: -25.7479, lng: 28.2293 },
    { name: 'Cape Town', lat: -33.9249, lng: 18.4241 },
    { name: 'Durban', lat: -29.8587, lng: 31.0218 },
    { name: 'Gqeberha', lat: -33.9608, lng: 25.6022 },
    { name: 'Bloemfontein', lat: -29.0852, lng: 26.1596 },
    { name: 'East London', lat: -33.0152, lng: 27.9116 },
    { name: 'Nelspruit', lat: -25.4749, lng: 30.9703 }
  ];
};

/**
 * Get South Africa bounds for map restriction
 * @returns {Object} Bounds object
 */
export const getSouthAfricaBounds = () => {
  return {
    sw: { lat: -35.0, lng: 16.0 },  // Cape Agulhas
    ne: { lat: -22.0, lng: 33.0 }   // Kruger Park
  };
};

/**
 * Get estimated fare range for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {Object} Min and max fare estimates
 */
export const getEstimatedFareRange = (distanceKm) => {
  const minRate = getRatePerKm(distanceKm) * 0.8;
  const maxRate = getRatePerKm(distanceKm) * 1.2;
  const minFare = Math.max(MIN_FARE, distanceKm * minRate);
  const maxFare = Math.max(MIN_FARE, distanceKm * maxRate);
  return {
    min: Math.round(minFare * 100) / 100,
    max: Math.round(maxFare * 100) / 100
  };
};

/**
 * Get fare breakdown display
 * @param {Object} fareData - Fare data from calculateFareSA
 * @returns {Object} Formatted breakdown for display
 */
export const getFareBreakdownDisplay = (fareData) => {
  if (!fareData) return null;
  
  const { breakdown, total, perKm, minFare, isPeak, serviceType, minRatePerKm, maxRatePerKm, peakSurchargePercent } = fareData;
  
  return {
    total: `R${total.toFixed(2)}`,
    details: [
      { label: 'Rate per km', value: `R${perKm.toFixed(2)} (R${minRatePerKm.toFixed(2)}-R${maxRatePerKm.toFixed(2)})` },
      { label: 'Distance charge', value: `R${breakdown.distanceCharge.toFixed(2)}` },
      ...(breakdown.serviceMultiplier !== 1 ? [{ label: `Service (${serviceType})`, value: `R${breakdown.serviceCharge.toFixed(2)}` }] : []),
      ...(isPeak ? [{ label: `Peak surcharge (${peakSurchargePercent}%)`, value: `R${breakdown.peakSurcharge.toFixed(2)}` }] : []),
      ...(breakdown.minFareApplied ? [{ label: '✓ Minimum fare applied', value: `R${minFare.toFixed(2)}` }] : []),
    ],
    minFare: `R${minFare.toFixed(2)}`,
    isPeak: isPeak,
    serviceType: serviceType,
    perKm: perKm,
    minRatePerKm: minRatePerKm,
    maxRatePerKm: maxRatePerKm,
    peakSurchargePercent: peakSurchargePercent
  };
};

/**
 * Format fare for display
 * @param {number} fare - Fare amount
 * @returns {string} Formatted fare
 */
export const formatFare = (fare) => {
  return `R${fare.toFixed(2)}`;
};