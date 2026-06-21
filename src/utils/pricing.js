// frontend/src/utils/pricing.js

// South African Pricing for Vai
// Updated: R10 min fare, Different rates per service type
// Vai Go: R3.60/km, Vai X: R4.00/km, Vai Premium: R5.00/km, Vai Van: R4.50/km
// Peak surcharge: 20%

// ============ PRICING STRUCTURE ============
// Minimum fare: R10
// Peak surcharge: 20% (includes booking fee)

const MIN_FARE = 10.0;
const PEAK_SURCHARGE = 0.20; // 20%

// ============ SERVICE TYPE RATES ============
// Different rates per service type
const SERVICE_RATES = {
  'economy': 3.60,   // Vai Go - R3.60/km
  'standard': 4.00,  // Vai X - R4.00/km
  'premium': 5.00,   // Vai Premium - R5.00/km
  'van': 4.50        // Vai Van (7-Seater) - R4.50/km
};

// Peak hours (24-hour format)
const PEAK_HOURS = {
  morning: { start: 6, end: 9 },
  evening: { start: 16, end: 19 }
};

/**
 * Calculate fare for a ride in South Africa
 * PRICING: R10 min fare, different rates per service type, peak 20%
 * 
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} city - City name - kept for compatibility
 * @param {boolean} isPeak - Whether it's peak hour
 * @param {string} serviceType - 'economy', 'standard', 'premium', 'van'
 * @returns {Object} Fare breakdown
 */
export const calculateFareSA = (distanceKm, city = 'johannesburg', isPeak = false, serviceType = 'standard') => {
  // Get rate per km based on service type
  const ratePerKm = SERVICE_RATES[serviceType] || SERVICE_RATES['standard'];

  // Calculate base fare: distance * rate per km
  let fare = distanceKm * ratePerKm;

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
  const peakSurcharge = isPeak ? Math.round((distanceKm * ratePerKm * PEAK_SURCHARGE) * 100) / 100 : 0;

  return {
    total: finalFare,
    breakdown: {
      baseFare: baseFare,
      distanceCharge: Math.round(distanceKm * ratePerKm * 100) / 100,
      peakSurcharge: peakSurcharge,
      ratePerKm: ratePerKm,
      minFareApplied: finalFare === MIN_FARE
    },
    distance: distanceKm,
    city: city.toLowerCase().trim(),
    isPeak: isPeak,
    serviceType: serviceType,
    perKm: ratePerKm,
    minFare: MIN_FARE,
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
    { 
      id: 'economy', 
      name: 'Vai Go', 
      description: 'Budget-friendly', 
      multiplier: 1.0,
      ratePerKm: 3.60
    },
    { 
      id: 'standard', 
      name: 'Vai X', 
      description: 'Standard ride', 
      multiplier: 1.0,
      ratePerKm: 4.00
    },
    { 
      id: 'premium', 
      name: 'Vai Premium', 
      description: 'Luxury ride', 
      multiplier: 1.0,
      ratePerKm: 5.00
    },
    { 
      id: 'van', 
      name: 'Vai Van', 
      description: '7-Seater', 
      multiplier: 1.0,
      ratePerKm: 4.50
    }
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
 * @param {string} serviceType - Service type
 * @returns {Object} Min and max fare estimates
 */
export const getEstimatedFareRange = (distanceKm, serviceType = 'standard') => {
  const ratePerKm = SERVICE_RATES[serviceType] || SERVICE_RATES['standard'];
  const minRate = ratePerKm * 0.9;
  const maxRate = ratePerKm * 1.1;
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
  
  const { breakdown, total, perKm, minFare, isPeak, serviceType, peakSurchargePercent } = fareData;
  
  const serviceNames = {
    'economy': 'Vai Go',
    'standard': 'Vai X',
    'premium': 'Vai Premium',
    'van': 'Vai Van'
  };
  
  return {
    total: `R${total.toFixed(2)}`,
    details: [
      { label: 'Rate per km', value: `R${perKm.toFixed(2)}` },
      { label: `Service (${serviceNames[serviceType] || serviceType})`, value: `R${breakdown.distanceCharge.toFixed(2)}` },
      ...(isPeak ? [{ label: `Peak surcharge (${peakSurchargePercent}%)`, value: `R${breakdown.peakSurcharge.toFixed(2)}` }] : []),
      ...(breakdown.minFareApplied ? [{ label: '✓ Minimum fare applied', value: `R${minFare.toFixed(2)}` }] : []),
    ],
    minFare: `R${minFare.toFixed(2)}`,
    isPeak: isPeak,
    serviceType: serviceType,
    perKm: perKm,
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

/**
 * Get rate for a specific service type
 * @param {string} serviceType - Service type
 * @returns {number} Rate per km
 */
export const getRateForService = (serviceType) => {
  return SERVICE_RATES[serviceType] || SERVICE_RATES['standard'];
};