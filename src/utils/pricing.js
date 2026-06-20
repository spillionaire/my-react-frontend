// South African Pricing for Vai
// Based on real Uber and Bolt data from South Africa

// City-specific rates per km (ZAR)
const CITY_RATES = {
  'johannesburg': 8.50,
  'pretoria': 8.50,
  'capetown': 9.50,
  'durban': 10.00,
  'gqeberha': 9.50,
  'east london': 9.00,
  'bloemfontein': 8.50,
  'nelspruit': 8.50,
  'default': 9.00
};

// City-specific base fares (ZAR)
const CITY_BASE_FARES = {
  'johannesburg': 25.00,
  'pretoria': 25.00,
  'capetown': 28.00,
  'durban': 26.00,
  'gqeberha': 25.00,
  'east london': 24.00,
  'bloemfontein': 23.00,
  'nelspruit': 23.00,
  'default': 25.00
};

// Per minute rate (ZAR)
const PER_MINUTE_RATE = 0.60;

// Booking fee percentage
const BOOKING_FEE_PERCENT = 0.04; // 4%

// Peak hours (24-hour format)
const PEAK_HOURS = {
  morning: { start: 6, end: 9 },
  evening: { start: 16, end: 19 }
};

// Surge multiplier
const SURGE_MULTIPLIER = 1.3; // 30% during peak

/**
 * Calculate fare for a ride in South Africa
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} city - City name (e.g., 'johannesburg', 'capetown')
 * @param {boolean} isPeak - Whether it's peak hour
 * @param {string} serviceType - 'standard', 'economy', 'premium'
 * @returns {Object} Fare breakdown
 */
export const calculateFareSA = (distanceKm, city = 'johannesburg', isPeak = false, serviceType = 'standard') => {
  // Get city-specific rates
  const cityKey = city.toLowerCase().trim();
  const perKmRate = CITY_RATES[cityKey] || CITY_RATES.default;
  const baseFare = CITY_BASE_FARES[cityKey] || CITY_BASE_FARES.default;

  // Service type multipliers
  const serviceMultipliers = {
    'economy': 0.85,    // 15% cheaper
    'standard': 1.0,    // Base price
    'premium': 1.4,     // 40% more expensive
    'moto': 0.5         // 50% cheaper
  };
  const serviceMultiplier = serviceMultipliers[serviceType] || 1.0;

  // Calculate time-based charge (2 min per km average)
  const estimatedMinutes = distanceKm * 2;
  const timeCharge = estimatedMinutes * PER_MINUTE_RATE;

  // Calculate base fare
  let fare = baseFare + (distanceKm * perKmRate * serviceMultiplier) + timeCharge;

  // Apply surge pricing during peak hours
  if (isPeak) {
    fare = fare * SURGE_MULTIPLIER;
  }

  // Add booking fee
  const bookingFee = fare * BOOKING_FEE_PERCENT;
  fare = fare + bookingFee;

  // Round to nearest Rand (South African currency)
  const roundedFare = Math.round(fare);

  // Ensure minimum fare
  const minFare = serviceType === 'moto' ? 18 : 25;
  const finalFare = Math.max(roundedFare, minFare);

  return {
    total: finalFare,
    breakdown: {
      baseFare: Math.round(baseFare),
      distanceCharge: Math.round(distanceKm * perKmRate * serviceMultiplier),
      timeCharge: Math.round(timeCharge),
      bookingFee: Math.round(bookingFee),
      surgeMultiplier: isPeak ? SURGE_MULTIPLIER : 1.0,
      serviceMultiplier: serviceMultiplier
    },
    distance: distanceKm,
    city: cityKey,
    isPeak: isPeak,
    serviceType: serviceType
  };
};

/**
 * Check if current time is peak hour
 * @returns {boolean} True if peak hour
 */
export const isPeakHour = () => {
  const now = new Date();
  const hour = now.getHours();
  
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
    { id: 'economy', name: 'Vai Go', description: 'Budget-friendly', multiplier: 0.85 },
    { id: 'standard', name: 'Vai X', description: 'Standard ride', multiplier: 1.0 },
    { id: 'premium', name: 'Vai Premium', description: 'Luxury ride', multiplier: 1.4 },
    { id: 'moto', name: 'Vai Moto', description: 'Motorcycle', multiplier: 0.5 }
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