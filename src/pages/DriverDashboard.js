import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaCar, 
  FaHistory, 
  FaSignOutAlt,
  FaUser,
  FaSpinner,
  FaRoute,
  FaComment,
  FaTimes,
  FaMoneyBill,
  FaClock,
  FaHome,
  FaMapMarkerAlt,
  FaFlag,
  FaUserFriends,
  FaBug,
  FaQuestionCircle,
  FaStar,
  FaPhone,
  FaInfoCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaCheckCircle
} from 'react-icons/fa';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSouthAfricaBounds } from '../utils/pricing';
import { 
  calculateBearing, 
  calculateDistance, 
  getRoutePoints,
  formatDistance,
  formatTime,
  getArrivalTime,
  calculateETA,
  getRoutePointsWithCurve
} from '../utils/navigation';
import { getCarIconUrl } from '../assets/car-icon';
import Chat from '../components/Chat';
import RatingModal from '../components/RatingModal';
import ProfileDropdown from '../components/ProfileDropdown';
import { API_URL } from '../config';
import { getLocationWithFallback, isGPSAvailable, isHTTPSRequired, getGPSErrorMessage } from '../utils/location';
import { playRideRequestSound, playRideAcceptedSound, playArrivedSound } from '../utils/sounds';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Car icon for moving vehicle
const carIcon = new L.Icon({
  iconUrl: getCarIconUrl(),
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  className: 'car-marker'
});

// Pickup icon
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Dropoff icon
const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const SA_BOUNDS = getSouthAfricaBounds();

// ============ EARLY COMPLETION REASONS ============
const EARLY_COMPLETION_REASONS = [
  { id: 'client_changed_mind', label: 'Client changed mind - No longer going' },
  { id: 'client_not_ready', label: 'Client not ready / taking too long' },
  { id: 'vehicle_issue', label: 'Vehicle issue / breakdown' },
  { id: 'safety_concern', label: 'Safety concern in area' },
  { id: 'wrong_destination', label: 'Wrong destination entered' },
  { id: 'client_unreachable', label: 'Client unreachable after pick up' },
  { id: 'emergency', label: 'Emergency situation' },
  { id: 'other', label: 'Other reason' }
];

// ============ CHANGE MAP VIEW - SMART SNAPPING ============
function ChangeMapView({ targetLocation, zoom = 15 }) {
  const map = useMap();
  const [lastSnappedLocation, setLastSnappedLocation] = useState(null);

  useEffect(() => {
    if (targetLocation && targetLocation[0] && targetLocation[1]) {
      const latLngString = `${targetLocation[0]},${targetLocation[1]}`;
      if (lastSnappedLocation !== latLngString) {
        console.log('🗺️ Snapping map to:', targetLocation);
        map.setView(targetLocation, zoom);
        setLastSnappedLocation(latLngString);
      }
    }
  }, [targetLocation, map, zoom, lastSnappedLocation]);

  return null;
}

const DriverDashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  
  // State
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({ lat: -26.2041, lng: 28.0473 });
  const [previousLocation, setPreviousLocation] = useState(null);
  const [carRotation, setCarRotation] = useState(0);
  const [currentRide, setCurrentRide] = useState(null);
  const [rideRequests, setRideRequests] = useState([]);
  const [rideStatus, setRideStatus] = useState(null);
  const [earnings, setEarnings] = useState(0);
  const [completedRides, setCompletedRides] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [locationMethod, setLocationMethod] = useState('default');
  const [routePoints, setRoutePoints] = useState([]);
  const [driverRoute, setDriverRoute] = useState([]);
  const [eta, setEta] = useState(null);
  const [distanceToPickup, setDistanceToPickup] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [mapCenter, setMapCenter] = useState({ lat: -26.2041, lng: 28.0473 });
  
  // Auto-arrival state
  const [arrivalChecked, setArrivalChecked] = useState(false);
  const [isAtPickup, setIsAtPickup] = useState(false);
  const [showManualArrival, setShowManualArrival] = useState(false);
  const [arrivalAttempts, setArrivalAttempts] = useState(0);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Map loading state
  const [mapLoaded, setMapLoaded] = useState(false);
  const [tileLoading, setTileLoading] = useState(true);
  
  // Responsive
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Restore state
  const [isRestoring, setIsRestoring] = useState(true);
  
  // Rider info for display
  const [riderInfo, setRiderInfo] = useState(null);
  
  // Debug state
  const [showDebug, setShowDebug] = useState(false);
  
  // Early completion modal
  const [showEarlyCompletionModal, setShowEarlyCompletionModal] = useState(false);
  const [earlyCompletionReason, setEarlyCompletionReason] = useState('');
  const [earlyCompletionNote, setEarlyCompletionNote] = useState('');
  const [completingRide, setCompletingRide] = useState(false);

  // Track if ride was started (for distance calculation)
  const [rideStartLocation, setRideStartLocation] = useState(null);
  const [rideStartTime, setRideStartTime] = useState(null);
  const [rideDistanceTraveled, setRideDistanceTraveled] = useState(0);
  
  // Rating Modal
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rideToRate, setRideToRate] = useState(null);
  
  // Deactivation Modal
  const [showDeactivationModal, setShowDeactivationModal] = useState(false);
  
  const watchIdRef = useRef(null);
  const mapRef = useRef();
  const locationAttempted = useRef(false);
  const activeRideFetched = useRef(false);

  // ============ PERSIST ROUTE DATA ============
  useEffect(() => {
    if (driverRoute && driverRoute.length > 0) {
      try {
        localStorage.setItem('driverRoutePoints', JSON.stringify(driverRoute));
        localStorage.setItem('driverRideId', currentRide?._id || '');
        localStorage.setItem('driverRideStatus', rideStatus || '');
        console.log('💾 Driver route saved to localStorage:', driverRoute.length, 'points');
      } catch (error) {
        console.error('Error saving driver route:', error);
      }
    }
  }, [driverRoute, currentRide, rideStatus]);

  // Restore route data from localStorage on mount
  useEffect(() => {
    try {
      const savedRoute = localStorage.getItem('driverRoutePoints');
      const savedRideId = localStorage.getItem('driverRideId');
      const savedStatus = localStorage.getItem('driverRideStatus');
      
      if (savedRoute && savedRideId) {
        const parsed = JSON.parse(savedRoute);
        if (parsed && parsed.length > 0) {
          setDriverRoute(parsed);
          console.log('🔄 Restored driver route from localStorage:', parsed.length, 'points');
        }
      }
    } catch (error) {
      console.error('Error restoring driver route:', error);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============ RESTORE ONLINE STATUS ON PAGE REFRESH ============
  useEffect(() => {
    const restoreOnlineStatus = async () => {
      try {
        if (user?.isOnline && user?.role === 'driver') {
          if (user?.isDeactivated) {
            console.log('❌ Account deactivated, cannot restore online status');
            setIsAvailable(false);
            setShowDeactivationModal(true);
            setIsRestoring(false);
            return;
          }
          
          console.log('🔄 Restoring online status for driver:', user.name);
          setIsAvailable(true);
          if (socket) {
            socket.emit('driver-online', {
              driverId: user?._id,
              location: currentLocation,
              vehicle: user.vehicle
            });
          }
          const token = localStorage.getItem('token');
          await axios.put(`${API_URL}/api/auth/availability`, {
            isAvailable: true,
          }, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          toast.success('🔄 Restored online status', { duration: 2000 });
        }
      } catch (error) {
        console.error('Error restoring online status:', error);
      } finally {
        setIsRestoring(false);
      }
    };
    
    if (user?.role === 'driver' && user?.isOnline) {
      restoreOnlineStatus();
    } else {
      setIsRestoring(false);
    }
  }, [user, socket]);

  // CHECK FOR ACTIVE RIDE ON PAGE LOAD
  useEffect(() => {
    const fetchActiveRide = async () => {
      if (activeRideFetched.current) return;
      activeRideFetched.current = true;
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/rides/active`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data.ride) {
          const ride = response.data.ride;
          console.log('🔄 Restored active ride:', ride);
          setCurrentRide(ride);
          setRideStatus(ride.status);
          setIsAtPickup(ride.status === 'arrived');
          if (ride.status === 'arrived') setArrivalChecked(true);
          
          if (ride.rider) {
            setRiderInfo(ride.rider);
          }
          
          if (ride.routePoints && ride.routePoints.length > 0) {
            setDriverRoute(ride.routePoints);
            console.log('🔄 Restored route points from ride:', ride.routePoints.length);
          }
          
          if (ride.status === 'in-progress' && ride.startLocation) {
            setRideStartLocation(ride.startLocation);
            setRideStartTime(ride.startTime);
            if (!ride.routePoints || ride.routePoints.length === 0) {
              drawRouteToDropoff(ride);
            }
          }
          
          if (ride.status === 'accepted' || ride.status === 'arrived') {
            if (!ride.routePoints || ride.routePoints.length === 0) {
              drawRouteToPickup(ride);
            }
          }
          
          toast.success('🔄 Restored your active ride');
        }
      } catch (error) {
        console.error('Error fetching active ride:', error);
      }
    };
    fetchActiveRide();
  }, []);

  // ============ GET LOCATION ============
  useEffect(() => {
    if (locationAttempted.current) return;
    locationAttempted.current = true;

    setIsGettingLocation(true);
    setLocationError(null);

    if (!isGPSAvailable()) {
      setLocationError('GPS not supported. Use map to set location.');
      setIsGettingLocation(false);
      setLocationMethod('manual');
      toast('📍 Click map to set location', { icon: '⚠️' });
      return;
    }

    if (isHTTPSRequired()) {
      setLocationError('HTTPS required for GPS.');
      setIsGettingLocation(false);
      setLocationMethod('manual');
      toast('📍 Use HTTPS for GPS', { icon: '⚠️' });
      return;
    }

    toast.loading('Getting GPS...', { id: 'gps' });

    getLocationWithFallback().then((result) => {
      toast.dismiss('gps');

      if (result.success) {
        const location = { lat: result.lat, lng: result.lng, accuracy: result.accuracy };
        setCurrentLocation(location);
        setMapCenter(location);
        setIsGettingLocation(false);
        setLocationMethod(result.source === 'gps' ? 'gps' : 'network');
        setLocationError(null);
        toast.success(result.source === 'gps' ? '📍 GPS acquired!' : '📍 Network location');
        startWatchingLocation();
      } else {
        setIsGettingLocation(false);
        setLocationMethod('manual');
        setLocationError(getGPSErrorMessage(result.code));
        toast('📍 Click map to set location', { icon: '⚠️' });
      }
    });
  }, []);

  // ============ START WATCHING LOCATION ============
  const startWatchingLocation = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!user || !user._id) {
          console.log("⏳ Waiting for user authorization context to fully load...");
          return;
        }

        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || 0
        };

        console.log('📍 Driver location update:', location);

        if (position.coords.speed !== null) {
          setSpeed(position.coords.speed * 3.6);
        }

        if (previousLocation) {
          const bearing = calculateBearing(
            previousLocation.lat, previousLocation.lng,
            location.lat, location.lng
          );
          setCarRotation(bearing);
        }

        setPreviousLocation(location);
        setCurrentLocation(location);
        setMapCenter(location);

        if (rideStatus === 'in-progress' && rideStartLocation) {
          const dist = calculateDistance(
            rideStartLocation.lat,
            rideStartLocation.lng,
            location.lat,
            location.lng
          );
          setRideDistanceTraveled(dist);
          
          if (currentRide && currentRide.dropoffLocation) {
            updateRouteToDropoff(location);
          }
        }

        if (currentRide && rideStatus === 'accepted' && !arrivalChecked) {
          checkArrival(location);
        }

        if (currentRide && rideStatus === 'accepted') {
          const pickupDist = calculateDistance(
            location.lat, location.lng,
            currentRide.pickupLocation.lat,
            currentRide.pickupLocation.lng
          );
          setDistanceToPickup(pickupDist);
          
          const avgSpeed = Math.max(speed || 30, 10);
          const etaMinutes = calculateETA(pickupDist, avgSpeed);
          setEta(etaMinutes);
          
          if (pickupDist < 0.15 && !arrivalChecked) {
            setShowManualArrival(true);
          }
          
          updateRouteToPickup(location);
        }

        if (isAvailable || currentRide) {
          setRoutePoints(prev => {
            const newPoints = [...prev, location];
            if (newPoints.length > 200) return newPoints.slice(-200);
            return newPoints;
          });
        }

        // ============ BROADCAST LOCATION TO SERVER ============
        if (isAvailable || currentRide) {
          if (socket) {
            const locationData = {
              driverId: user?._id,
              location: location,
              rotation: carRotation,
              speed: position.coords.speed || 0,
              rideId: currentRide?._id || null,
              distanceToPickup: distanceToPickup,
              eta: eta,
              isAvailable: isAvailable,
              status: isAvailable ? 'available' : 'busy'
            };
            
            console.log('📡 Broadcasting driver location:', locationData);
            socket.emit('driver-location', locationData);
          }
        }

        // Also update location in database
        if (isAvailable) {
          axios.put(`${API_URL}/api/auth/location`, { location })
            .catch(() => {});
        }
      },
      (error) => {
        console.error('❌ GPS error:', error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 2000 }
    );

    watchIdRef.current = watchId;
  };

  // ============ FETCH ROUTE FROM API ============
  const fetchRouteFromAPI = async (startLat, startLng, endLat, endLng) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/rides/calculate-route`,
        {
          pickup: { lat: startLat, lng: startLng, address: 'Driver Location' },
          dropoff: { lat: endLat, lng: endLng, address: 'Destination' }
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data && response.data.success) {
        return response.data.route.points;
      }
      return null;
    } catch (error) {
      console.error('Error fetching route from API:', error);
      return null;
    }
  };

  // ============ DRAW ROUTE TO PICKUP ============
  const drawRouteToPickup = async (ride) => {
    if (!ride || !ride.pickupLocation) return;
    
    try {
      const routePoints = await fetchRouteFromAPI(
        currentLocation.lat,
        currentLocation.lng,
        ride.pickupLocation.lat,
        ride.pickupLocation.lng
      );
      
      if (routePoints && routePoints.length > 1) {
        setDriverRoute(routePoints);
        console.log('📍 Route to pickup from API:', routePoints.length, 'points');
        localStorage.setItem('driverRoutePoints', JSON.stringify(routePoints));
      } else {
        const route = getRoutePointsWithCurve(
          currentLocation, 
          ride.pickupLocation, 
          30
        );
        if (route && route.length > 0) {
          setDriverRoute(route);
          console.log('📍 Route to pickup (fallback):', route.length, 'points');
        }
      }
    } catch (error) {
      console.error('Error drawing route to pickup:', error);
      const route = getRoutePointsWithCurve(
        currentLocation, 
        ride.pickupLocation, 
        30
      );
      setDriverRoute(route);
    }
  };

  // ============ UPDATE ROUTE TO PICKUP ============
  const updateRouteToPickup = async (location) => {
    if (!currentRide || !currentRide.pickupLocation) return;
    
    if (rideStatus === 'accepted' && !isAtPickup) {
      try {
        const lastUpdate = localStorage.getItem('lastDriverRouteUpdate');
        const now = Date.now();
        if (lastUpdate && now - parseInt(lastUpdate) < 10000) {
          return;
        }
        localStorage.setItem('lastDriverRouteUpdate', now.toString());
        
        const routePoints = await fetchRouteFromAPI(
          location.lat,
          location.lng,
          currentRide.pickupLocation.lat,
          currentRide.pickupLocation.lng
        );
        
        if (routePoints && routePoints.length > 1) {
          setDriverRoute(routePoints);
          localStorage.setItem('driverRoutePoints', JSON.stringify(routePoints));
        }
      } catch (error) {
        // Silent fail, keep existing route
      }
    }
  };

  // ============ DRAW ROUTE TO DROPOFF ============
  const drawRouteToDropoff = async (ride) => {
    if (!ride || !ride.dropoffLocation) return;
    
    try {
      const routePoints = await fetchRouteFromAPI(
        currentLocation.lat,
        currentLocation.lng,
        ride.dropoffLocation.lat,
        ride.dropoffLocation.lng
      );
      
      if (routePoints && routePoints.length > 1) {
        setDriverRoute(routePoints);
        console.log('📍 Route to dropoff from API:', routePoints.length, 'points');
        localStorage.setItem('driverRoutePoints', JSON.stringify(routePoints));
      } else {
        const route = getRoutePointsWithCurve(
          currentLocation, 
          ride.dropoffLocation, 
          30
        );
        if (route && route.length > 0) {
          setDriverRoute(route);
          console.log('📍 Route to dropoff (fallback):', route.length, 'points');
        }
      }
    } catch (error) {
      console.error('Error drawing route to dropoff:', error);
      const route = getRoutePointsWithCurve(
        currentLocation, 
        ride.dropoffLocation, 
        30
      );
      setDriverRoute(route);
    }
  };

  // ============ UPDATE ROUTE TO DROPOFF ============
  const updateRouteToDropoff = async (location) => {
    if (!currentRide || !currentRide.dropoffLocation) return;
    
    if (rideStatus === 'in-progress') {
      try {
        const lastUpdate = localStorage.getItem('lastDriverRouteUpdate');
        const now = Date.now();
        if (lastUpdate && now - parseInt(lastUpdate) < 10000) {
          return;
        }
        localStorage.setItem('lastDriverRouteUpdate', now.toString());
        
        const routePoints = await fetchRouteFromAPI(
          location.lat,
          location.lng,
          currentRide.dropoffLocation.lat,
          currentRide.dropoffLocation.lng
        );
        
        if (routePoints && routePoints.length > 1) {
          setDriverRoute(routePoints);
          localStorage.setItem('driverRoutePoints', JSON.stringify(routePoints));
        }
      } catch (error) {
        // Silent fail, keep existing route
      }
    }
  };

  // ============ AUTO-ARRIVAL CHECK ============
  const checkArrival = async (location) => {
    if (arrivalChecked || !currentRide) return;
    setArrivalAttempts(prev => prev + 1);
    
    console.log(`📍 Checking arrival - Attempt ${arrivalAttempts + 1}`);
    
    try {
      const token = localStorage.getItem('token');
      
      const dist = calculateDistance(
        location.lat, 
        location.lng,
        currentRide.pickupLocation.lat,
        currentRide.pickupLocation.lng
      );
      
      console.log(`📏 Distance to pickup: ${dist} km (${dist * 1000} meters)`);
      setDistanceToPickup(dist);
      
      const ARRIVAL_THRESHOLD_KM = 0.05;
      
      if (dist <= ARRIVAL_THRESHOLD_KM) {
        console.log('✅ Auto-arrival triggered!');
        await confirmArrival();
        return;
      }
      
      if (dist <= 0.3) {
        setShowManualArrival(true);
      }
      
      const response = await axios.get(
        `${API_URL}/api/drivers/check-arrival/${currentRide._id}?driverLat=${location.lat}&driverLng=${location.lng}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.arrived) {
        await confirmArrival();
      } else {
        setDistanceToPickup(response.data.distance);
        if (response.data.distanceMeters < 300) {
          setShowManualArrival(true);
        }
      }
    } catch (error) {
      console.error('❌ Arrival check failed:', error);
      const dist = calculateDistance(
        location.lat, 
        location.lng,
        currentRide.pickupLocation.lat,
        currentRide.pickupLocation.lng
      );
      if (dist <= 0.3) {
        setShowManualArrival(true);
        toast.error('GPS check failed. Manually confirm arrival.', { icon: '⚠️' });
      }
    }
  };

  // ============ CONFIRM ARRIVAL ============
  const confirmArrival = async () => {
    try {
      console.log('📍 Confirming arrival...');
      setIsLoading(true);
      
      const token = localStorage.getItem('token');
      
      try {
        await axios.put(`${API_URL}/api/drivers/manual-arrival/${currentRide._id}`, {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Server arrival confirmed');
      } catch (error) {
        console.warn('⚠️ Server arrival API failed:', error.message);
      }
      
      setArrivalChecked(true);
      setIsAtPickup(true);
      setShowManualArrival(false);
      setRideStatus('arrived');
      
      playArrivedSound();
      
      setDriverRoute([]);
      localStorage.removeItem('driverRoutePoints');
      
      if (socket) {
        socket.emit('update-ride-status', {
          rideId: currentRide._id,
          status: 'arrived',
          riderId: currentRide.rider?._id,
          driverId: user?._id
        });
      }
      
      toast.success('📍 You have arrived!', { duration: 5000, icon: '📍' });
    } catch (error) {
      console.error('❌ Error confirming arrival:', error);
      toast.error('Failed to confirm arrival.', { icon: '⚠️' });
    } finally {
      setIsLoading(false);
    }
  };

  // ============ MANUAL ARRIVAL ============
  const manualArrival = async () => {
    console.log('📍 Manual arrival triggered');
    await confirmArrival();
  };

  // ============ TEST ARRIVAL ============
  const testArrival = () => {
    console.log('🧪 Test arrival triggered');
    if (currentRide) {
      const mockLocation = {
        lat: currentRide.pickupLocation.lat,
        lng: currentRide.pickupLocation.lng
      };
      setCurrentLocation(mockLocation);
      checkArrival(mockLocation);
      toast.info('🧪 Test arrival triggered');
    } else {
      toast.error('No active ride');
    }
  };

  // ============ SHOW EARLY COMPLETION MODAL ============
  const showEarlyCompletion = () => {
    setEarlyCompletionReason('');
    setEarlyCompletionNote('');
    setShowEarlyCompletionModal(true);
  };

  // ============ COMPLETE RIDE WITH REASON ============
  const completeRideWithReason = async () => {
    if (!earlyCompletionReason) {
      toast.error('Please select a reason');
      return;
    }

    try {
      setCompletingRide(true);
      setIsLoading(true);

      const token = localStorage.getItem('token');
      
      const totalDist = rideDistanceTraveled + (distanceToPickup || 0);
      
      try {
        const response = await axios.put(
          `${API_URL}/api/drivers/ride-status/${currentRide._id}`,
          {
            status: 'completed',
            completionReason: earlyCompletionReason,
            completionNote: earlyCompletionNote,
            distanceTraveled: totalDist,
            completedAt: new Date().toISOString(),
            isEarlyCompletion: true
          },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log('✅ Ride completed via driver endpoint:', response.data);
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('🔄 Trying rides endpoint for completion...');
          const response = await axios.put(
            `${API_URL}/api/rides/${currentRide._id}/complete`,
            {
              completionReason: earlyCompletionReason,
              completionNote: earlyCompletionNote,
              distanceTraveled: totalDist,
              completedAt: new Date().toISOString(),
              isEarlyCompletion: true
            },
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          console.log('✅ Ride completed via rides endpoint:', response.data);
        } else {
          throw error;
        }
      }

      setRideStatus('completed');
      toast.success('✅ Ride completed!');

      if (socket) {
        socket.emit('update-ride-status', {
          rideId: currentRide._id,
          status: 'completed',
          riderId: currentRide.rider?._id,
          driverId: user?._id
        });
      }

      setShowEarlyCompletionModal(false);
      setEarlyCompletionReason('');
      setEarlyCompletionNote('');

      setDriverRoute([]);
      localStorage.removeItem('driverRoutePoints');
      localStorage.removeItem('driverRideId');
      localStorage.removeItem('driverRideStatus');

      setTimeout(() => {
        setRideToRate(currentRide);
        setShowRatingModal(true);
      }, 2000);

      setTimeout(() => {
        setCurrentRide(null);
        setRideStatus(null);
        setRoutePoints([]);
        setDriverRoute([]);
        setEta(null);
        setDistanceToPickup(null);
        setArrivalChecked(false);
        setIsAtPickup(false);
        setShowManualArrival(false);
        setArrivalAttempts(0);
        setIsChatOpen(false);
        setUnreadMessages(0);
        setRiderInfo(null);
        setRideStartLocation(null);
        setRideStartTime(null);
        setRideDistanceTraveled(0);
        setIsAvailable(true);
        if (socket) {
          socket.emit('driver-online', {
            driverId: user?._id,
            location: currentLocation,
            vehicle: user?.vehicle
          });
        }
      }, 3000);

    } catch (error) {
      console.error('❌ Failed to complete ride:', error);
      toast.error(error.response?.data?.error || 'Failed to complete ride');
    } finally {
      setCompletingRide(false);
      setIsLoading(false);
    }
  };

  // ============ CANCEL RIDE ============
  const cancelRide = async () => {
    if (!currentRide) return;
    
    if (rideStatus === 'in-progress') {
      toast.error('Cannot cancel ride while in progress');
      return;
    }
    
    if (!window.confirm('Are you sure you want to cancel this ride?')) return;
    
    try {
      setIsLoading(true);
      await axios.put(`${API_URL}/api/drivers/cancel-ride/${currentRide._id}`);
      
      if (socket) {
        socket.emit('cancel-ride', { 
          rideId: currentRide._id,
          riderId: currentRide.rider?._id,
          driverId: user?._id
        });
        
        socket.emit('ride-driver-cancelled', {
          rideId: currentRide._id,
          riderId: currentRide.rider?._id,
          driverId: user?._id,
          driverName: user.name
        });
        
        socket.emit(`rider-${currentRide.rider?._id}-driver-cancelled`, {
          rideId: currentRide._id,
          driverId: user?._id,
          driverName: user.name
        });
      }
      
      toast.success('Ride cancelled');
      setCurrentRide(null);
      setRideStatus(null);
      setRoutePoints([]);
      setDriverRoute([]);
      setEta(null);
      setDistanceToPickup(null);
      setArrivalChecked(false);
      setIsAtPickup(false);
      setShowManualArrival(false);
      setArrivalAttempts(0);
      setIsChatOpen(false);
      setUnreadMessages(0);
      setRiderInfo(null);
      setRideStartLocation(null);
      setRideStartTime(null);
      setRideDistanceTraveled(0);
      
      localStorage.removeItem('driverRoutePoints');
      localStorage.removeItem('driverRideId');
      localStorage.removeItem('driverRideStatus');
      
      setIsAvailable(true);
      if (socket) {
        socket.emit('driver-online', {
          driverId: user?._id,
          location: currentLocation,
          vehicle: user?.vehicle
        });
      }
    } catch (error) {
      console.error('❌ Cancel ride error:', error);
      toast.error(error.response?.data?.error || 'Failed to cancel ride');
    } finally {
      setIsLoading(false);
    }
  };

  // ============ TOGGLE AVAILABILITY ============
  const toggleAvailability = async () => {
    try {
      if (user?.isDeactivated) {
        toast.error('Your account has been deactivated. Please contact support.', { 
          duration: 5000 
        });
        setShowDeactivationModal(true);
        return;
      }

      setIsLoading(true);
      const newStatus = !isAvailable;
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/api/auth/availability`, {
        isAvailable: newStatus,
      }, { headers: { 'Authorization': `Bearer ${token}` } });
      
      setIsAvailable(newStatus);
      if (updateUser) {
        updateUser({ isOnline: newStatus, isAvailable: newStatus });
      }
      
      if (newStatus && socket) {
        socket.emit('driver-online', {
          driverId: user?._id,
          location: currentLocation,
          vehicle: user?.vehicle
        });
        toast.success('✅ You are online');
        setRoutePoints([currentLocation]);
      } else if (socket) {
        socket.emit('driver-offline', { 
          driverId: user?._id 
        });
        toast.success('You are offline');
        setRoutePoints([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update');
    } finally {
      setIsLoading(false);
    }
  };

  // ============ ACCEPT RIDE ============
  const acceptRide = async (rideId) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/api/drivers/accept-ride`, { rideId });
      setCurrentRide(response.data);
      setRideStatus('accepted');
      setRideRequests([]);
      setArrivalChecked(false);
      setIsAtPickup(false);
      setShowManualArrival(false);
      setArrivalAttempts(0);
      setRideDistanceTraveled(0);
      
      if (response.data.rider) {
        setRiderInfo(response.data.rider);
      }
      
      playRideAcceptedSound();
      
      await drawRouteToPickup(response.data);
      
      toast.success('✅ Ride accepted! Navigating to pickup');
      
      const dist = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        response.data.pickupLocation.lat,
        response.data.pickupLocation.lng
      );
      
      console.log(`📍 Distance to pickup on accept: ${dist} km`);
      
      if (dist <= 0.05) {
        console.log('✅ Already at pickup location!');
        setTimeout(() => {
          confirmArrival();
        }, 1000);
      } else {
        if (socket) {
          socket.emit('accept-ride', { 
            rideId, 
            driverId: user?._id 
          });
        }
      }
    } catch (error) {
      console.error('❌ Accept ride error:', error);
      toast.error(error.response?.data?.error || 'Failed to accept ride');
    } finally {
      setIsLoading(false);
    }
  };

  // ============ START RIDE ============
  const startRide = async () => {
    try {
      setIsLoading(true);
      console.log('🚗 Starting ride...');
      
      const token = localStorage.getItem('token');
      
      const startLocation = { ...currentLocation };
      setRideStartLocation(startLocation);
      setRideStartTime(new Date());
      setRideDistanceTraveled(0);
      
      let started = false;
      
      try {
        const response = await axios.put(
          `${API_URL}/api/drivers/ride-status/${currentRide._id}`,
          { 
            status: 'in-progress',
            startLocation: startLocation,
            startTime: new Date().toISOString()
          },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log('✅ Ride started via driver endpoint:', response.data);
        started = true;
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('🔄 Trying rides endpoint for start...');
          const response = await axios.put(
            `${API_URL}/api/rides/${currentRide._id}/status`,
            { 
              status: 'in-progress',
              startLocation: startLocation,
              startTime: new Date().toISOString()
            },
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          console.log('✅ Ride started via rides endpoint:', response.data);
          started = true;
        } else {
          throw error;
        }
      }
      
      if (started) {
        setRideStatus('in-progress');
        
        await drawRouteToDropoff(currentRide);
        
        if (socket) {
          socket.emit('update-ride-status', {
            rideId: currentRide._id,
            status: 'in-progress',
            riderId: currentRide.rider?._id,
            driverId: user?._id
          });
        }
        
        toast.success('🚗 Ride started!');
      }
    } catch (error) {
      console.error('❌ Failed to start ride:', error);
      toast.error(error.response?.data?.error || 'Failed to start ride');
    } finally {
      setIsLoading(false);
    }
  };

  // ============ HANDLE LOGOUT ============
  const handleLogout = () => {
    localStorage.removeItem('driverRoutePoints');
    localStorage.removeItem('driverRideId');
    localStorage.removeItem('driverRideStatus');
    localStorage.removeItem('lastDriverRouteUpdate');
    
    if (isAvailable) {
      socket?.emit('driver-offline', { 
        driverId: user?._id 
      });
    }
    logout();
    navigate('/login');
  };

  // ============ FETCH DRIVER STATS ============
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/rides/history`);
        const completed = response.data.filter(r => r.status === 'completed');
        setEarnings(completed.reduce((sum, r) => sum + r.fare, 0));
        setCompletedRides(completed.length);
        setTotalDistance(completed.reduce((sum, r) => sum + (r.distance || 0), 0));
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, [currentRide]);

  // ============ SOCKET EVENTS ============
  useEffect(() => {
    if (!socket) return;

    socket.on('new-ride-request', (ride) => {
      console.log('🚗 New ride request received:', ride);
      
      playRideRequestSound();
      
      if (isAvailable) {
        setRideRequests(prev => {
          const exists = prev.some(r => r.rideId === ride.rideId);
          if (!exists) {
            return [...prev, ride];
          }
          return prev;
        });
        toast.success('🚗 New ride request!', { duration: 10000, icon: '🔔' });
      }
    });

    socket.on('pending-ride-requests', (data) => {
      console.log(`📤 Received ${data.count} pending ride requests`);
      if (data.requests?.length > 0) {
        setRideRequests(prev => {
          const newRequests = [...prev];
          data.requests.forEach(request => {
            const exists = newRequests.some(r => r.rideId === request.rideId);
            if (!exists) {
              newRequests.push(request);
            }
          });
          return newRequests.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        });
        toast.success(`📱 ${data.count} pending ride${data.count > 1 ? 's' : ''} available!`, { icon: '🚗' });
      }
    });

    socket.on('ride-request-cancelled', (data) => {
      console.log('❌ Ride request cancelled by rider:', data);
      setRideRequests(prev => {
        const filtered = prev.filter(ride => ride.rideId !== data.rideId);
        if (filtered.length !== prev.length) {
          toast('Ride request cancelled', { icon: '❌' });
        }
        return filtered;
      });
    });

    socket.on(`ride-${currentRide?._id}-status`, (status) => {
      setRideStatus(status);
      if (status === 'completed') {
        toast.success('✅ Ride completed!');
        setEarnings(prev => prev + currentRide?.fare || 0);
        setCompletedRides(prev => prev + 1);
        setTotalDistance(prev => prev + currentRide?.distance || 0);
        setRoutePoints([]);
        setDriverRoute([]);
        setEta(null);
        setDistanceToPickup(null);
        setArrivalChecked(false);
        setIsAtPickup(false);
        setShowManualArrival(false);
        setArrivalAttempts(0);
        setIsChatOpen(false);
        setUnreadMessages(0);
        setRiderInfo(null);
        setRideStartLocation(null);
        setRideStartTime(null);
        setRideDistanceTraveled(0);
        
        localStorage.removeItem('driverRoutePoints');
        localStorage.removeItem('driverRideId');
        localStorage.removeItem('driverRideStatus');
        
        setTimeout(() => {
          setRideToRate(currentRide);
          setShowRatingModal(true);
        }, 2000);
        
        setTimeout(() => {
          setCurrentRide(null);
          setRideStatus(null);
          setIsAvailable(true);
          if (socket) {
            socket.emit('driver-online', {
              driverId: user?._id,
              location: currentLocation,
              vehicle: user?.vehicle
            });
          }
        }, 3000);
      }
      if (status === 'cancelled') {
        toast.error('Ride cancelled');
        setCurrentRide(null);
        setRideStatus(null);
        setRoutePoints([]);
        setDriverRoute([]);
        setEta(null);
        setDistanceToPickup(null);
        setArrivalChecked(false);
        setIsAtPickup(false);
        setShowManualArrival(false);
        setArrivalAttempts(0);
        setIsChatOpen(false);
        setUnreadMessages(0);
        setRiderInfo(null);
        setRideStartLocation(null);
        setRideStartTime(null);
        setRideDistanceTraveled(0);
        
        localStorage.removeItem('driverRoutePoints');
        localStorage.removeItem('driverRideId');
        localStorage.removeItem('driverRideStatus');
      }
    });

    socket.on(`ride-${currentRide?._id}-accepted`, (data) => {
      if (data.driverId === user?._id) {
        playRideAcceptedSound();
        toast.success('✅ Ride accepted! Proceed to pickup');
        setArrivalChecked(false);
        setIsAtPickup(false);
        setShowManualArrival(false);
        setArrivalAttempts(0);
        if (currentRide) {
          drawRouteToPickup(currentRide);
        }
      }
    });

    socket.on('ride-cancelled', (data) => {
      if (currentRide && data.rideId === currentRide._id) {
        toast.error('Ride cancelled by rider', { icon: '❌' });
        setCurrentRide(null);
        setRideStatus(null);
        setRoutePoints([]);
        setDriverRoute([]);
        setEta(null);
        setDistanceToPickup(null);
        setArrivalChecked(false);
        setIsAtPickup(false);
        setShowManualArrival(false);
        setArrivalAttempts(0);
        setIsChatOpen(false);
        setUnreadMessages(0);
        setRideRequests([]);
        setRiderInfo(null);
        setRideStartLocation(null);
        setRideStartTime(null);
        setRideDistanceTraveled(0);
        
        localStorage.removeItem('driverRoutePoints');
        localStorage.removeItem('driverRideId');
        localStorage.removeItem('driverRideStatus');
        
        setIsAvailable(true);
        if (socket) {
          socket.emit('driver-online', {
            driverId: user?._id,
            location: currentLocation,
            vehicle: user?.vehicle
          });
        }
      }
    });

    socket.on(`driver-${user?._id}-ride-cancelled`, (data) => {
      if (currentRide && data.rideId === currentRide._id) {
        toast.error('Ride cancelled by rider', { icon: '❌' });
        setCurrentRide(null);
        setRideStatus(null);
        setRoutePoints([]);
        setDriverRoute([]);
        setEta(null);
        setDistanceToPickup(null);
        setArrivalChecked(false);
        setIsAtPickup(false);
        setShowManualArrival(false);
        setArrivalAttempts(0);
        setIsChatOpen(false);
        setUnreadMessages(0);
        setRideRequests([]);
        setRiderInfo(null);
        setRideStartLocation(null);
        setRideStartTime(null);
        setRideDistanceTraveled(0);
        
        localStorage.removeItem('driverRoutePoints');
        localStorage.removeItem('driverRideId');
        localStorage.removeItem('driverRideStatus');
        
        setIsAvailable(true);
        if (socket) {
          socket.emit('driver-online', {
            driverId: user?._id,
            location: currentLocation,
            vehicle: user?.vehicle
          });
        }
      } else {
        setRideRequests(prev => {
          const filtered = prev.filter(ride => ride.rideId !== data.rideId);
          if (filtered.length !== prev.length) {
            toast('Ride request cancelled', { icon: '❌' });
          }
          return filtered;
        });
      }
    });

    socket.on('drivers-update', (drivers) => {
      console.log('📡 Received drivers update:', drivers.length);
    });

    socket.on('new-message', (msg) => {
      if (msg.senderId !== user?._id && !isChatOpen) {
        setUnreadMessages(prev => prev + 1);
        const senderName = msg.senderRole === 'rider' ? (currentRide?.rider?.name || 'Rider') : 'Driver';
        toast.success(`💬 ${senderName}: ${msg.message}`, { duration: 3000, icon: '💬' });
      }
    });

    socket.on('account-deactivated', (data) => {
      toast.error('Your account has been deactivated. Please contact support.', { duration: 8000 });
      setShowDeactivationModal(true);
      setIsAvailable(false);
      if (updateUser) {
        updateUser({ isDeactivated: true, isAvailable: false, isOnline: false });
      }
    });

    return () => {
      socket.off('new-ride-request');
      socket.off('pending-ride-requests');
      socket.off('ride-request-cancelled');
      socket.off(`ride-${currentRide?._id}-status`);
      socket.off(`ride-${currentRide?._id}-accepted`);
      socket.off('ride-cancelled');
      socket.off(`driver-${user?._id}-ride-cancelled`);
      socket.off('drivers-update');
      socket.off('new-message');
      socket.off('account-deactivated');
    };
  }, [socket, isAvailable, currentRide, user, currentLocation]);

  // Reset unread count when chat opens
  useEffect(() => {
    if (isChatOpen) setUnreadMessages(0);
  }, [isChatOpen]);

  // Calculate arrival time for display
  const arrivalTime = eta !== null ? getArrivalTime(eta) : null;

  // Request driver location (for debugging)
  const requestDriverLocation = () => {
    if (socket && user?._id) {
      socket.emit('request-driver-location', { 
        driverId: user._id, 
        rideId: currentRide?._id 
      });
      toast('📍 Requesting location...');
    }
  };

  if (isRestoring) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#03060F]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A6BFF] mx-auto mb-4"></div>
          <p className="text-gray-400">Restoring...</p>
        </div>
      </div>
    );
  }

  // Get status message
  const getDriverStatusMessage = () => {
    if (rideStatus === 'accepted' && !isAtPickup) return '🚗 Heading to pickup';
    if (rideStatus === 'accepted' && isAtPickup) return '📍 Arrived at pickup';
    if (rideStatus === 'arrived') return '📍 Arrived at pickup';
    if (rideStatus === 'in-progress') return '🚗 Ride in progress';
    if (rideStatus === 'completed') return '✅ Ride completed';
    return '';
  };

  // Get rating display
  const getRatingDisplay = () => {
    const avg = user?.rating?.average || 0;
    if (avg === 0) return 'New';
    return `${avg.toFixed(1)} ★`;
  };

  return (
    <div className="h-screen flex flex-col bg-[#03060F] overflow-hidden">
      {/* Header - Dark theme */}
      <header className="w-full bg-[#080E1F] border-b border-[#1A2A4A] px-4 py-3 flex justify-between items-center shadow-none z-30 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#1A6BFF] rounded-xl flex items-center justify-center text-white font-bold text-sm mr-2 shadow-lg shadow-[#1A6BFF]/30">
              V
            </div>
            <h1 className="text-xl font-bold text-white">Vai</h1>
          </div>
          <button 
            onClick={() => navigate('/profile')} 
            className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
          >
            Driver
          </button>
          {isGettingLocation && (
            <span className="text-[10px] text-gray-500">📍 GPS</span>
          )}
          {isAvailable && (
            <span className="text-[10px] text-green-400">● Online</span>
          )}
          {isAtPickup && (
            <span className="text-[10px] text-purple-400">📍 Arrived</span>
          )}
          {rideRequests.length > 0 && (
            <span className="text-[10px] text-red-400 font-medium">
              {rideRequests.length} 📬
            </span>
          )}
          {speed > 5 && (
            <span className="text-[10px] text-blue-400">{Math.round(speed)} km/h</span>
          )}
          {user?.isVerified && (
            <span className="text-[10px] text-blue-400 flex items-center">
              <FaCheckCircle className="mr-0.5" /> Verified
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {!isMobile && (
            <button 
              onClick={() => navigate('/history')} 
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FaHistory className="h-5 w-5" />
            </button>
          )}
          <button 
            onClick={() => setShowDebug(!showDebug)} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaBug className="h-5 w-5" />
          </button>
          <ProfileDropdown user={user} logout={handleLogout} />
        </div>
      </header>

      {/* Deactivation Modal - Dark theme */}
      {showDeactivationModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0E1A2A] rounded-2xl p-6 max-w-md w-full border border-[#1A2A4A]">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaExclamationTriangle className="text-red-400 text-3xl" />
              </div>
              <h3 className="text-xl font-bold text-red-400 mb-2">Account Deactivated</h3>
              <p className="text-gray-400 mb-4">
                Your account has been deactivated. Please contact support for more information.
              </p>
              <div className="bg-[#080E1F] p-3 rounded-lg mb-4 text-left border border-[#1A2A4A]">
                <p className="text-sm text-gray-500">Reason:</p>
                <p className="text-sm text-white">{user?.deactivationReason || 'No reason provided'}</p>
              </div>
              <button
                onClick={() => {
                  setShowDeactivationModal(false);
                  navigate('/support');
                }}
                className="w-full py-2 bg-[#1A6BFF] text-white rounded-lg hover:bg-[#5294FF] transition"
              >
                Contact Support
              </button>
              <button
                onClick={() => setShowDeactivationModal(false)}
                className="w-full mt-2 py-2 bg-[#1A2A4A] text-gray-300 rounded-lg hover:bg-[#2A3A5A] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative overflow-hidden">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
          minZoom={5}
          maxBounds={[
            [SA_BOUNDS.sw.lat, SA_BOUNDS.sw.lng],
            [SA_BOUNDS.ne.lat, SA_BOUNDS.ne.lng]
          ]}
          maxBoundsViscosity={1.0}
          whenReady={() => { setMapLoaded(true); setTileLoading(false); }}
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={19}
            eventHandlers={{
              loading: () => setTileLoading(true),
              load: () => setTileLoading(false),
              error: () => setTileLoading(false)
            }}
          />
          
          <ChangeMapView targetLocation={[mapCenter.lat, mapCenter.lng]} zoom={15} />
          
          <Marker 
            position={[currentLocation.lat, currentLocation.lng]}
            icon={carIcon}
            rotationAngle={carRotation}
            rotationOrigin="center"
          >
            <Popup>
              <div className="text-center bg-[#0E1A2A] text-white">
                <p className="font-bold">🚗 You are here</p>
                <p className="text-xs text-gray-400">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.vehicle?.model} • {user?.vehicle?.color}</p>
                {isAtPickup && <p className="text-xs text-green-400 font-bold">📍 Arrived!</p>}
                {distanceToPickup !== null && !isAtPickup && (
                  <p className="text-xs text-gray-400">{formatDistance(distanceToPickup)} to pickup</p>
                )}
                {rideStatus === 'in-progress' && (
                  <p className="text-xs text-gray-400">{formatDistance(rideDistanceTraveled)} traveled</p>
                )}
                {user?.isVerified && (
                  <p className="text-xs text-blue-400 flex items-center justify-center mt-1">
                    <FaCheckCircle className="mr-1" /> Verified Driver
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
          
          {currentRide && (
            <>
              <Marker 
                position={[currentRide.pickupLocation.lat, currentRide.pickupLocation.lng]} 
                icon={pickupIcon}
              >
                <Popup>
                  <div className="text-center bg-[#0E1A2A] text-white">
                    <p className="font-bold text-green-400">📍 Pickup</p>
                    <p className="text-xs text-gray-400">{currentRide.pickupLocation.address}</p>
                    {distanceToPickup !== null && rideStatus !== 'arrived' && (
                      <p className="text-xs text-gray-400">{formatDistance(distanceToPickup)} away</p>
                    )}
                    {isAtPickup && <p className="text-xs text-green-400 font-bold">✅ Arrived!</p>}
                    {eta !== null && rideStatus === 'accepted' && !isAtPickup && (
                      <p className="text-xs text-green-400">ETA: {formatTime(eta)}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
              <Marker 
                position={[currentRide.dropoffLocation.lat, currentRide.dropoffLocation.lng]} 
                icon={dropoffIcon}
              >
                <Popup>
                  <div className="text-center bg-[#0E1A2A] text-white">
                    <p className="font-bold text-red-400">🏁 Dropoff</p>
                    <p className="text-xs text-gray-400">{currentRide.dropoffLocation.address}</p>
                    {rideStatus === 'in-progress' && (
                      <p className="text-xs text-gray-400">{formatDistance(rideDistanceTraveled)} traveled</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            </>
          )}
          
          {/* Driver Route Line - BLUE color */}
          {driverRoute.length > 0 && (
            <Polyline
              positions={driverRoute.map(p => [p.lat, p.lng])}
              color="#1A6BFF"
              weight={4}
              opacity={0.8}
              smoothFactor={1}
            />
          )}
          
          {routePoints.length > 1 && (
            <Polyline
              positions={routePoints.map(p => [p.lat, p.lng])}
              color="#1A2A4A"
              weight={2}
              opacity={0.3}
            />
          )}
        </MapContainer>

        {/* Loading overlay - Dark theme */}
        {(tileLoading || !mapLoaded) && (
          <div className="absolute inset-0 bg-[#080E1F] flex flex-col items-center justify-center z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1A6BFF] mb-3"></div>
            <p className="text-gray-400 text-sm">Loading map...</p>
          </div>
        )}

        {/* Location error */}
        {locationError && !isGettingLocation && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-orange-500/90 text-white px-3 py-1 rounded-xl shadow-lg text-xs z-30 backdrop-blur-sm">
            {locationError}
          </div>
        )}

        {/* Debug Panel - Dark theme */}
        {showDebug && (
          <div className="absolute top-2 left-2 bg-[#080E1F]/90 text-white p-3 rounded-xl z-50 max-w-xs text-xs font-mono overflow-auto max-h-60 border border-[#1A2A4A]">
            <p className="font-bold mb-1 text-blue-400">🐛 Debug Info</p>
            <p className="text-gray-400">Ride Status: {rideStatus || 'none'}</p>
            <p className="text-gray-400">Driver ID: {user?._id?.slice(-6) || 'none'}</p>
            <p className="text-gray-400">Is At Pickup: {isAtPickup ? '✅' : '❌'}</p>
            <p className="text-gray-400">Arrival Checked: {arrivalChecked ? '✅' : '❌'}</p>
            <p className="text-gray-400">Distance: {distanceToPickup !== null ? formatDistance(distanceToPickup) : '--'}</p>
            <p className="text-gray-400">ETA: {eta !== null ? formatTime(eta) : '--'}</p>
            <p className="text-gray-400">Speed: {speed > 0 ? `${Math.round(speed)} km/h` : '--'}</p>
            <p className="text-gray-400">Socket: {socket?.isConnected ? '✅ Connected' : '❌'}</p>
            <p className="text-gray-400">Ride ID: {currentRide?._id?.slice(-6) || 'none'}</p>
            <p className="text-gray-400">Distance Traveled: {formatDistance(rideDistanceTraveled)}</p>
            <p className="text-gray-400">Route Points: {driverRoute.length}</p>
            <p className="text-gray-400">Deactivated: {user?.isDeactivated ? '❌ YES' : '✅ No'}</p>
            <p className="text-gray-400">Verified: {user?.isVerified ? '✅' : '❌'}</p>
            <p className="text-yellow-400 text-[10px] mt-1">Pickup: {currentRide?.pickupLocation?.lat?.toFixed(4)}, {currentRide?.pickupLocation?.lng?.toFixed(4)}</p>
            
            <button 
              onClick={testArrival}
              className="mt-2 bg-[#1A6BFF] text-white px-2 py-1 rounded text-xs w-full hover:bg-[#5294FF] transition"
            >
              🧪 Test Arrival
            </button>
            <button 
              onClick={requestDriverLocation}
              className="mt-1 bg-[#1A6BFF] text-white px-2 py-1 rounded text-xs w-full hover:bg-[#5294FF] transition"
            >
              📡 Request Location
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/*              MOBILE LAYOUT - Dark theme */}
        {/* ============================================================ */}
        {isMobile && (
          <>
            {/* Mobile Ride Requests Sheet - Dark theme */}
            {!currentRide && isAvailable && rideRequests.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#0E1A2A] rounded-t-2xl shadow-lg p-3 z-30 border-t border-[#1A2A4A] safe-area-bottom max-h-64 overflow-y-auto" style={{ marginBottom: '56px' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-white flex items-center">
                    <span className="text-yellow-400 mr-2">🔔</span> Ride Requests
                    <span className="ml-2 bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-500/20">
                      {rideRequests.length}
                    </span>
                  </h3>
                </div>
                {rideRequests.slice(0, 3).map((ride) => (
                  <div key={ride.rideId} className="p-3 bg-[#080E1F] rounded-lg mb-2 border border-[#1A2A4A]">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center space-x-1">
                          <p className="text-sm font-medium text-white truncate">Ride #{ride.rideId?.slice(-6) || 'New'}</p>
                          {ride.riderVerified && (
                            <FaCheckCircle className="text-blue-400 text-xs" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{ride.pickup?.address || 'Pickup location'}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>📍 {ride.distance?.toFixed(1) || '0'}km</span>
                          <span className="text-green-400 font-bold">R{ride.fare?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => acceptRide(ride.rideId)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-[#1A6BFF] text-white text-sm font-medium rounded-lg hover:bg-[#5294FF] transition whitespace-nowrap flex-shrink-0"
                      >
                        {isLoading ? '...' : 'Accept'}
                      </button>
                    </div>
                  </div>
                ))}
                {rideRequests.length > 3 && (
                  <p className="text-center text-xs text-gray-500">+ {rideRequests.length - 3} more requests</p>
                )}
              </div>
            )}

            {/* Mobile Navigation Info - Dark theme */}
            {currentRide && rideStatus === 'accepted' && !isAtPickup && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#0E1A2A]/95 backdrop-blur-sm rounded-t-2xl shadow-lg p-4 z-30 border-t border-[#1A2A4A] safe-area-bottom" style={{ marginBottom: '56px' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-[#1A6BFF]/20 p-2 rounded-full">
                      <FaRoute className="text-[#1A6BFF] h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Distance to pickup</p>
                      <p className="font-bold text-lg text-white">
                        {distanceToPickup !== null ? formatDistance(distanceToPickup) : '...'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Estimated arrival</p>
                    <p className="font-bold text-lg text-green-400">
                      {eta !== null ? formatTime(eta) : '--'}
                    </p>
                    {arrivalTime && eta !== null && (
                      <p className="text-xs text-gray-500">at {arrivalTime}</p>
                    )}
                  </div>
                </div>
                
                {riderInfo && (
                  <div className="mt-3 p-3 bg-[#080E1F] rounded-lg border border-[#1A2A4A]">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-[#1A2A4A] rounded-full flex items-center justify-center">
                        <FaUser className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1">
                          <p className="text-sm font-medium text-white">{riderInfo.name}</p>
                          {riderInfo.isVerified && (
                            <FaCheckCircle className="text-blue-400 text-xs" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{riderInfo.phone || 'No phone'}</span>
                          <span>•</span>
                          <span className="text-yellow-400">{riderInfo.rating?.average?.toFixed(1) || 'New'} ★</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Pickup</p>
                        <p className="text-xs font-medium text-white truncate max-w-[100px]">
                          {currentRide?.pickupLocation?.address?.split(',')[0] || 'Pickup'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {distanceToPickup !== null && eta !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{formatDistance(distanceToPickup)} remaining</span>
                      <span>~{formatTime(eta)}</span>
                    </div>
                    <div className="w-full bg-[#1A2A4A] rounded-full h-1.5">
                      <div 
                        className="bg-[#1A6BFF] h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (1 - distanceToPickup / 10) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Ride Status Sheet - Dark theme - ALL BUTTONS PRESERVED */}
            {currentRide && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#0E1A2A] rounded-t-2xl shadow-lg p-4 z-30 border-t border-[#1A2A4A] safe-area-bottom" style={{ marginBottom: '56px' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      rideStatus === 'completed' ? 'bg-green-400' : 
                      rideStatus === 'in-progress' ? 'bg-blue-400' :
                      rideStatus === 'arrived' ? 'bg-purple-400' :
                      'bg-yellow-400'
                    } animate-pulse`}></div>
                    <span className="text-sm font-semibold text-white">{getDriverStatusMessage()}</span>
                  </div>
                  <span className="text-lg font-bold text-green-400">R{currentRide?.fare?.toFixed(2)}</span>
                </div>
                
                {riderInfo && (
                  <div className="flex items-center space-x-2 mt-2 p-2 bg-[#080E1F] rounded-lg border border-[#1A2A4A]">
                    <div className="w-8 h-8 bg-[#1A2A4A] rounded-full flex items-center justify-center">
                      <FaUser className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-1">
                        <p className="text-sm font-medium text-white">{riderInfo.name}</p>
                        {riderInfo.isVerified && (
                          <FaCheckCircle className="text-blue-400 text-xs" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {riderInfo.phone || 'No phone provided'}
                      </p>
                    </div>
                    {distanceToPickup !== null && rideStatus === 'accepted' && !isAtPickup && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Distance</p>
                        <p className="text-sm font-medium text-white">{formatDistance(distanceToPickup)}</p>
                      </div>
                    )}
                    {eta !== null && rideStatus === 'accepted' && !isAtPickup && (
                      <div className="text-right ml-2">
                        <p className="text-xs text-gray-500">ETA</p>
                        <p className="text-sm font-medium text-green-400">{formatTime(eta)}</p>
                      </div>
                    )}
                    {rideStatus === 'in-progress' && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Traveled</p>
                        <p className="text-sm font-medium text-white">{formatDistance(rideDistanceTraveled)}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* ALL BUTTONS - PRESERVED */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* "I'm Here" Button - Heading to pickup */}
                  {rideStatus === 'accepted' && !isAtPickup && (
                    <>
                      <button
                        onClick={manualArrival}
                        disabled={isLoading}
                        className="flex-1 py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm hover:bg-orange-500/30 transition font-medium border border-orange-500/20"
                      >
                        📍 I'm Here (Arrived)
                      </button>
                      <button
                        onClick={cancelRide}
                        disabled={isLoading}
                        className="py-2 px-3 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition border border-red-500/20"
                      >
                        <FaTimes className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  
                  {/* Arrived - Show Start Ride Button */}
                  {(rideStatus === 'accepted' && isAtPickup) || rideStatus === 'arrived' ? (
                    <>
                      <button
                        onClick={startRide}
                        disabled={isLoading}
                        className="flex-1 py-2 bg-[#1A6BFF] text-white rounded-lg text-sm hover:bg-[#5294FF] transition font-medium"
                      >
                        🚗 Start Ride
                      </button>
                      <button
                        onClick={cancelRide}
                        disabled={isLoading}
                        className="py-2 px-3 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition border border-red-500/20"
                      >
                        <FaTimes className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}
                  
                  {/* In Progress - Show Complete Ride with Reason option */}
                  {rideStatus === 'in-progress' && (
                    <>
                      <button
                        onClick={showEarlyCompletion}
                        disabled={isLoading || completingRide}
                        className="flex-1 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30 transition font-medium border border-yellow-500/20"
                      >
                        <FaQuestionCircle className="inline mr-1" /> Complete
                      </button>
                    </>
                  )}
                  
                  {/* Completed - Go Online */}
                  {rideStatus === 'completed' && (
                    <button
                      onClick={() => {
                        setCurrentRide(null);
                        setRideStatus(null);
                        setRoutePoints([]);
                        setDriverRoute([]);
                        setEta(null);
                        setDistanceToPickup(null);
                        setArrivalChecked(false);
                        setIsAtPickup(false);
                        setShowManualArrival(false);
                        setArrivalAttempts(0);
                        setIsChatOpen(false);
                        setUnreadMessages(0);
                        setRiderInfo(null);
                        setRideStartLocation(null);
                        setRideStartTime(null);
                        setRideDistanceTraveled(0);
                        localStorage.removeItem('driverRoutePoints');
                        localStorage.removeItem('driverRideId');
                        localStorage.removeItem('driverRideStatus');
                        setIsAvailable(true);
                        if (socket) {
                          socket.emit('driver-online', {
                            driverId: user?._id,
                            location: currentLocation,
                            vehicle: user?.vehicle
                          });
                        }
                      }}
                      className="flex-1 py-2 bg-[#1A6BFF] text-white rounded-lg text-sm hover:bg-[#5294FF] transition font-medium"
                    >
                      Go Online
                    </button>
                  )}
                </div>

                {/* Chat button - mobile */}
                {rideStatus !== 'completed' && rideStatus !== 'cancelled' && (
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="w-full mt-2 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition flex items-center justify-center relative border border-blue-500/20"
                  >
                    <FaComment className="mr-2" /> Chat with {riderInfo?.name || 'Rider'}
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadMessages}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Mobile Bottom Navigation - Dark theme */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#080E1F] border-t border-[#1A2A4A] z-50 safe-area-bottom">
              <div className="flex items-center justify-around h-14 max-w-screen-lg mx-auto px-4">
                <button
                  onClick={() => navigate('/driver')}
                  className="flex flex-col items-center justify-center text-gray-500 hover:text-white transition-colors"
                >
                  <FaHome className="h-5 w-5" />
                  <span className="text-[9px] mt-0.5 text-gray-500">Home</span>
                </button>
                <button
                  onClick={() => navigate('/history')}
                  className="flex flex-col items-center justify-center text-gray-500 hover:text-white transition-colors"
                >
                  <FaHistory className="h-5 w-5" />
                  <span className="text-[9px] mt-0.5 text-gray-500">History</span>
                </button>
                <button
                  onClick={toggleAvailability}
                  disabled={isLoading || user?.isDeactivated}
                  className="flex flex-col items-center justify-center text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  {user?.isDeactivated ? (
                    <>
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <span className="text-[9px] mt-0.5 text-red-400 font-medium">Deactivated</span>
                    </>
                  ) : isAvailable ? (
                    <>
                      <div className="h-3 w-3 rounded-full bg-green-400"></div>
                      <span className="text-[9px] mt-0.5 text-green-400 font-medium">Online</span>
                    </>
                  ) : (
                    <>
                      <div className="h-3 w-3 rounded-full bg-gray-600"></div>
                      <span className="text-[9px] mt-0.5 text-gray-500">Offline</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/*              DESKTOP LAYOUT - Dark theme - ALL BUTTONS PRESERVED */}
        {/* ============================================================ */}
        {!isMobile && (
          <div className="absolute top-0 right-0 h-full w-96 bg-[#080E1F] border-l border-[#1A2A4A] shadow-lg overflow-y-auto z-20">
            <div className="p-6 pb-20">
              <h2 className="text-xl font-bold mb-6 flex items-center text-white">
                <FaCar className="mr-2 text-[#1A6BFF]" /> Driver Dashboard
                {user?.isVerified && (
                  <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full flex items-center border border-blue-500/20">
                    <FaCheckCircle className="mr-1 text-xs" /> Verified
                  </span>
                )}
              </h2>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[#0E1A2A] rounded-lg p-3 text-center border border-[#1A2A4A]">
                  <FaMoneyBill className="h-5 w-5 text-green-400 mx-auto mb-1" />
                  <p className="text-sm text-gray-400">Earnings</p>
                  <p className="text-xl font-bold text-white">R{earnings.toFixed(2)}</p>
                </div>
                <div className="bg-[#0E1A2A] rounded-lg p-3 text-center border border-[#1A2A4A]">
                  <FaCar className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-xl font-bold text-white">{completedRides}</p>
                </div>
                <div className="bg-[#0E1A2A] rounded-lg p-3 text-center border border-[#1A2A4A]">
                  <FaClock className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                  <p className="text-sm text-gray-400">Distance</p>
                  <p className="text-xl font-bold text-white">{totalDistance.toFixed(1)} km</p>
                </div>
                <div className="bg-[#0E1A2A] rounded-lg p-3 text-center border border-[#1A2A4A]">
                  <FaStar className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-sm text-gray-400">Rating</p>
                  <p className="text-xl font-bold text-white">{getRatingDisplay()}</p>
                </div>
              </div>

              {/* Toggle Online/Offline - Dark theme */}
              <div className="flex items-center justify-between p-4 bg-[#0E1A2A] rounded-lg mb-6 border border-[#1A2A4A]">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${user?.isDeactivated ? 'bg-red-500' : isAvailable ? 'bg-green-400' : 'bg-red-500'} mr-3`}></div>
                  <div>
                    <p className="font-medium text-white">
                      {user?.isDeactivated ? 'Deactivated' : isAvailable ? 'Online' : 'Offline'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {user?.isDeactivated ? 'Account deactivated. Contact support.' : isAvailable ? 'Ready to accept rides' : 'Tap to go online'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleAvailability}
                  disabled={isLoading || isGettingLocation || user?.isDeactivated}
                  className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 ${
                    user?.isDeactivated ? 'bg-gray-600 text-white cursor-not-allowed' :
                    isAvailable ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20' :
                    'bg-[#1A6BFF] text-white hover:bg-[#5294FF]'
                  }`}
                >
                  {isLoading ? '...' : 
                   user?.isDeactivated ? 'Deactivated' :
                   isAvailable ? 'Go Offline' : 'Go Online'}
                </button>
              </div>

              {/* Vehicle Info - Dark theme */}
              {user?.vehicle && (
                <div className="bg-[#0E1A2A] rounded-lg p-4 mb-6 border border-[#1A2A4A]">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Your Vehicle</h3>
                  <div className="space-y-1 text-sm text-gray-400">
                    <p><span className="text-gray-500">Model:</span> {user.vehicle.model}</p>
                    <p><span className="text-gray-500">Color:</span> {user.vehicle.color}</p>
                    <p><span className="text-gray-500">Plate:</span> {user.vehicle.plateNumber}</p>
                    <p><span className="text-gray-500">Seats:</span> {user.vehicle.seats || 4}</p>
                  </div>
                </div>
              )}

              {/* Ride Requests - Dark theme */}
              {!currentRide && isAvailable && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-white flex items-center">
                    <span className="text-yellow-400 mr-2">🔔</span> Ride Requests
                    <span className="ml-2 bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-500/20">
                      {rideRequests.length}
                    </span>
                  </h3>
                  
                  {rideRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-[#1A2A4A] rounded-lg">
                      <div className="text-4xl mb-2">🚗</div>
                      <p className="text-lg">No ride requests yet</p>
                      <p className="text-sm">Waiting for riders in your area</p>
                    </div>
                  ) : (
                    rideRequests.map((ride) => (
                      <div key={ride.rideId} className="p-4 border border-[#1A2A4A] rounded-lg hover:border-[#1A6BFF] transition bg-[#0E1A2A]">
                        <div className="flex justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-white">Ride #{ride.rideId?.slice(-6) || 'New'}</span>
                            {ride.riderVerified && (
                              <FaCheckCircle className="text-blue-400 text-xs" />
                            )}
                          </div>
                          <span className="text-green-400 font-bold">R{ride.fare?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                          <div className="flex items-start">
                            <FaMapMarkerAlt className="text-green-400 mr-1 mt-0.5 flex-shrink-0" />
                            <p className="truncate">{ride.pickup?.address || 'Pickup location'}</p>
                          </div>
                          <div className="flex items-start">
                            <FaFlag className="text-red-400 mr-1 mt-0.5 flex-shrink-0" />
                            <p className="truncate">{ride.dropoff?.address || 'Destination'}</p>
                          </div>
                          <p className="text-xs text-gray-500">📍 {ride.distance?.toFixed(1) || '0'} km away</p>
                        </div>
                        <button
                          onClick={() => acceptRide(ride.rideId)}
                          disabled={isLoading}
                          className="mt-3 w-full py-2 bg-[#1A6BFF] text-white rounded-lg hover:bg-[#5294FF] transition disabled:opacity-50"
                        >
                          Accept Ride
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Offline State - Dark theme */}
              {!currentRide && !isAvailable && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-[#1A2A4A] rounded-lg">
                  <div className="text-4xl mb-2">⏰</div>
                  <p className="text-lg">You're offline</p>
                  <p className="text-sm">Go online to start receiving ride requests</p>
                </div>
              )}

              {/* Active Ride Info - Desktop - ALL BUTTONS PRESERVED */}
              {currentRide && (
                <div className="bg-[#0E1A2A] rounded-lg p-4 border border-[#1A2A4A]">
                  <h3 className="font-semibold text-white mb-3">Active Ride</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <span className="font-medium text-white">{getDriverStatusMessage()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fare</span>
                      <span className="font-bold text-green-400">R{currentRide.fare?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Distance</span>
                      <span className="font-medium text-white">{currentRide.distance?.toFixed(1) || '0'} km</span>
                    </div>
                    
                    {currentRide?.tripReference && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Trip Reference</span>
                        <span className="font-mono font-medium text-xs text-white bg-[#1A2A4A] px-2 py-0.5 rounded border border-[#1A2A4A]">
                          {currentRide.tripReference}
                        </span>
                      </div>
                    )}
                    
                    {riderInfo && (
                      <div className="pt-2 border-t border-[#1A2A4A]">
                        <p className="text-xs font-medium text-gray-400 mb-2 flex items-center">
                          <FaUserFriends className="mr-1" /> Rider Information
                          {riderInfo.isVerified && (
                            <FaCheckCircle className="ml-1 text-blue-400 text-xs" />
                          )}
                        </p>
                        <div className="p-3 bg-[#080E1F] rounded-lg border border-[#1A2A4A]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white">{riderInfo.name}</p>
                              <p className="text-xs text-gray-400">{riderInfo.phone || 'No phone provided'}</p>
                              <p className="text-xs text-yellow-400 flex items-center mt-0.5">
                                <FaStar className="text-xs mr-1" />
                                {riderInfo.rating?.average?.toFixed(1) || 'New'} ({riderInfo.rating?.count || 0} reviews)
                              </p>
                            </div>
                            {riderInfo.isVerified && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full flex items-center border border-blue-500/20">
                                <FaCheckCircle className="mr-1 text-xs" /> Verified
                              </span>
                            )}
                          </div>
                          {currentRide?.pickupLocation?.address && (
                            <p className="text-xs text-gray-400 mt-1">
                              <FaMapMarkerAlt className="inline mr-1 text-green-400" />
                              {currentRide.pickupLocation.address}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {distanceToPickup !== null && rideStatus === 'accepted' && !isAtPickup && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Distance to pickup</span>
                          <span className="font-medium text-white">{formatDistance(distanceToPickup)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">ETA</span>
                          <span className="font-medium text-green-400">
                            {eta !== null ? formatTime(eta) : '--'}
                            {arrivalTime && eta !== null && (
                              <span className="text-xs text-gray-500 ml-1">(at {arrivalTime})</span>
                            )}
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{formatDistance(distanceToPickup)} remaining</span>
                            <span>~{formatTime(eta)}</span>
                          </div>
                          <div className="w-full bg-[#1A2A4A] rounded-full h-1.5">
                            <div 
                              className="bg-[#1A6BFF] h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (1 - distanceToPickup / 10) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {rideStatus === 'in-progress' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Distance Traveled</span>
                          <span className="font-medium text-white">{formatDistance(rideDistanceTraveled)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status</span>
                          <span className="font-medium text-blue-400">🚗 Ride in progress</span>
                        </div>
                      </>
                    )}
                    
                    {isAtPickup && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status</span>
                        <span className="font-medium text-green-400">📍 Arrived!</span>
                      </div>
                    )}
                    
                    {speed > 0 && rideStatus === 'accepted' && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Speed</span>
                        <span className="font-medium text-white">{Math.round(speed)} km/h</span>
                      </div>
                    )}
                    
                    {/* Desktop Buttons - ALL PRESERVED */}
                    
                    {/* I'm Here (Arrived) Button - Heading to pickup */}
                    {rideStatus === 'accepted' && !isAtPickup && (
                      <div className="pt-2 border-t border-[#1A2A4A] mt-2">
                        <button
                          onClick={manualArrival}
                          disabled={isLoading}
                          className="w-full py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition font-medium border border-orange-500/20"
                        >
                          📍 I'm Here (Arrived)
                        </button>
                      </div>
                    )}
                    
                    {/* Start Ride Button */}
                    {(rideStatus === 'accepted' && isAtPickup) || rideStatus === 'arrived' ? (
                      <div className="pt-2 border-t border-[#1A2A4A] mt-2">
                        <button
                          onClick={startRide}
                          disabled={isLoading}
                          className="w-full py-2 bg-[#1A6BFF] text-white rounded-lg hover:bg-[#5294FF] transition font-medium"
                        >
                          🚗 Start Ride
                        </button>
                      </div>
                    ) : null}
                    
                    {/* Complete Ride Button (with reason) - Only in progress */}
                    {rideStatus === 'in-progress' && (
                      <div className="pt-2 border-t border-[#1A2A4A] mt-2">
                        <button
                          onClick={showEarlyCompletion}
                          disabled={isLoading || completingRide}
                          className="w-full py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition font-medium flex items-center justify-center border border-yellow-500/20"
                        >
                          <FaQuestionCircle className="mr-2" /> Complete Ride
                        </button>
                      </div>
                    )}
                    
                    {/* Chat Button */}
                    {rideStatus !== 'completed' && rideStatus !== 'cancelled' && (
                      <div className="pt-2 border-t border-[#1A2A4A] mt-2">
                        <button
                          onClick={() => setIsChatOpen(true)}
                          className="w-full py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition flex items-center justify-center relative border border-blue-500/20"
                        >
                          <FaComment className="mr-2" /> Chat with {riderInfo?.name || 'Rider'}
                          {unreadMessages > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {unreadMessages}
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                    
                    {/* Cancel Ride Button - Only for accepted/arrived */}
                    {(rideStatus === 'accepted' || rideStatus === 'arrived') && (
                      <div className="pt-2 border-t border-[#1A2A4A] mt-2">
                        <button
                          onClick={cancelRide}
                          disabled={isLoading}
                          className="w-full py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50 flex items-center justify-center border border-red-500/20"
                        >
                          <FaTimes className="mr-2" /> Cancel Ride
                        </button>
                      </div>
                    )}
                    
                    {/* No cancel for in-progress - show message */}
                    {rideStatus === 'in-progress' && (
                      <div className="pt-2 border-t border-[#1A2A4A] mt-2">
                        <p className="text-center text-xs text-gray-500">
                          ⚠️ Cannot cancel ride while in progress. Use "Complete Ride" instead.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Early Completion Modal - Dark theme */}
      {showEarlyCompletionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0E1A2A] rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-[#1A2A4A]">
            <h3 className="text-xl font-bold mb-4 flex items-center text-white">
              <FaQuestionCircle className="text-yellow-400 mr-2" />
              Complete Ride Early
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Please select a reason for completing this ride before reaching the destination.
            </p>
            
            <div className="space-y-3">
              {EARLY_COMPLETION_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setEarlyCompletionReason(reason.id)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition ${
                    earlyCompletionReason === reason.id
                      ? 'border-yellow-500/50 bg-yellow-500/10 text-white'
                      : 'border-[#1A2A4A] text-gray-400 hover:border-[#1A6BFF] hover:text-white'
                  }`}
                >
                  <span className="font-medium">{reason.label}</span>
                </button>
              ))}
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                value={earlyCompletionNote}
                onChange={(e) => setEarlyCompletionNote(e.target.value)}
                placeholder="Add any additional details..."
                className="w-full px-3 py-2 bg-[#080E1F] border border-[#1A2A4A] rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-white placeholder-gray-500 resize-none"
                rows="3"
              />
            </div>
            
            <div className="mt-4 flex gap-2">
              <button
                onClick={completeRideWithReason}
                disabled={!earlyCompletionReason || completingRide}
                className="flex-1 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition disabled:opacity-50 font-medium border border-yellow-500/20"
              >
                {completingRide ? (
                  <FaSpinner className="animate-spin mx-auto h-5 w-5" />
                ) : (
                  'Confirm Complete'
                )}
              </button>
              <button
                onClick={() => {
                  setShowEarlyCompletionModal(false);
                  setEarlyCompletionReason('');
                  setEarlyCompletionNote('');
                }}
                className="px-4 py-2 bg-[#1A2A4A] text-gray-300 rounded-lg hover:bg-[#2A3A5A] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && rideToRate && (
        <RatingModal
          rideId={rideToRate._id}
          userRole="driver"
          onClose={() => {
            setShowRatingModal(false);
            setRideToRate(null);
          }}
          onSubmitted={() => {
            toast.success('Rating submitted!');
          }}
        />
      )}

      {/* Chat Component */}
      {currentRide && (
        <Chat
          rideId={currentRide._id}
          driverInfo={user}
          riderInfo={currentRide.rider}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      <style>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        .car-marker {
          filter: drop-shadow(0 4px 6px rgba(26, 107, 255, 0.3));
        }
        .driver-available-marker {
          filter: drop-shadow(0 2px 4px rgba(26, 107, 255, 0.3));
          animation: driverPulse 2s ease-in-out infinite;
          cursor: pointer;
        }
        .driver-available-marker:hover {
          animation: none;
          transform: scale(1.2);
        }
        @keyframes driverPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #0E1A2A;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #1A6BFF;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default DriverDashboard;