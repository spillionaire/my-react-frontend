import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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
  FaInfoCircle
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
import { API_URL } from '../config';
import { getLocationWithFallback, isGPSAvailable, isHTTPSRequired, getGPSErrorMessage } from '../utils/location';

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
  
  const watchIdRef = useRef(null);
  const mapRef = useRef();
  const locationAttempted = useRef(false);
  const activeRideFetched = useRef(false);

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
          console.log('🔄 Restoring online status for driver:', user.name);
          setIsAvailable(true);
          if (socket) {
            socket.emit('driver-online', {
              driverId: user._id,
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
          
          if (ride.status === 'in-progress' && ride.startLocation) {
            setRideStartLocation(ride.startLocation);
            setRideStartTime(ride.startTime);
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
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || 0
        };

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

        // Track distance traveled during ride
        if (rideStatus === 'in-progress' && rideStartLocation) {
          const dist = calculateDistance(
            rideStartLocation.lat,
            rideStartLocation.lng,
            location.lat,
            location.lng
          );
          setRideDistanceTraveled(dist);
        }

        // AUTO-ARRIVAL CHECK
        if (currentRide && rideStatus === 'accepted' && !arrivalChecked) {
          checkArrival(location);
        }

        // Update ETA to pickup
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
          
          try {
            const route = getRoutePointsWithCurve(location, currentRide.pickupLocation, 30);
            setDriverRoute(route);
          } catch (error) {
            const route = getRoutePoints(location, currentRide.pickupLocation, 20);
            setDriverRoute(route);
          }
        }

        if (isAvailable || currentRide) {
          setRoutePoints(prev => {
            const newPoints = [...prev, location];
            if (newPoints.length > 200) return newPoints.slice(-200);
            return newPoints;
          });
        }

        if (socket) {
          socket.emit('driver-location', {
            driverId: user?._id,
            location,
            rotation: carRotation,
            speed: position.coords.speed || 0,
            rideId: currentRide?._id || null,
            distanceToPickup: distanceToPickup,
            eta: eta
          });
        }

        if (isAvailable) {
          axios.put(`${API_URL}/api/auth/location`, { location })
            .catch(() => {});
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 2000 }
    );

    watchIdRef.current = watchId;
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
      
      if (socket) {
        socket.emit('update-ride-status', {
          rideId: currentRide._id,
          status: 'arrived',
          riderId: currentRide.rider?._id,
          driverId: user._id
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
          driverId: user._id
        });
      }

      setShowEarlyCompletionModal(false);
      setEarlyCompletionReason('');
      setEarlyCompletionNote('');

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
    
    if (rideStatus === 'in-progress ') {
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
          driverId: user._id
        });
        
        socket.emit('ride-driver-cancelled', {
          rideId: currentRide._id,
          riderId: currentRide.rider?._id,
          driverId: user._id,
          driverName: user.name
        });
        
        socket.emit(`rider-${currentRide.rider?._id}-driver-cancelled`, {
          rideId: currentRide._id,
          driverId: user._id,
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
        socket.emit('driver-offline', { driverId: user?._id });
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
      
      setDriverRoute(getRoutePointsWithCurve(currentLocation, response.data.pickupLocation, 30));
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
          socket.emit('accept-ride', { rideId, driverId: user?._id });
        }
      }
    } catch (error) {
      console.error('❌ Accept ride error:', error);
      toast.error(error.response?.data?.error || 'Failed to accept ride');
    } finally {
      setIsLoading(false);
    }
  };

  // ============ START RIDE - FIXED ============
const startRide = async () => {
  try {
    setIsLoading(true);
    console.log('🚗 Starting ride...');
    console.log('📡 Ride ID:', currentRide?._id);
    console.log('📡 Current status:', rideStatus);
    
    const token = localStorage.getItem('token');
    const startLocation = { 
      lat: currentLocation.lat, 
      lng: currentLocation.lng 
    };
    
    console.log('📍 Start Location:', startLocation);
    
    // Step 1: If not already arrived, set to arrived first
    if (rideStatus === 'accepted') {
      console.log('🔄 Setting status to arrived first...');
      try {
        await axios.put(
          `${API_URL}/api/drivers/manual-arrival/${currentRide._id}`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log('✅ Status set to arrived');
        setRideStatus('arrived');
        setIsAtPickup(true);
        setArrivalChecked(true);
      } catch (arrivalError) {
        console.warn('⚠️ Manual arrival failed, continuing anyway:', arrivalError.message);
      }
    }
    
    // Step 2: Now set to in-progress
    console.log('🔄 Setting status to in-progress...');
    
    try {
      const response = await axios.put(
        `${API_URL}/api/drivers/ride-status/${currentRide._id}`,
        { status: 'in-progress' },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      console.log('✅ Ride started via driver endpoint:', response.data);
      
      setRideStatus('in-progress');
      setRideStartLocation(startLocation);
      setRideStartTime(new Date());
      setRideDistanceTraveled(0);
      
      if (socket) {
        socket.emit('update-ride-status', {
          rideId: currentRide._id,
          status: 'in-progress',
          riderId: currentRide.rider?._id,
          driverId: user._id
        });
      }
      
      setDriverRoute(getRoutePointsWithCurve(currentLocation, currentRide.dropoffLocation, 30));
      toast.success('🚗 Ride started!');
      setIsLoading(false);
      return;
    } catch (error) {
      console.error('❌ Driver endpoint failed:', error.response?.data);
      
      // Fallback to rides endpoint
      try {
        const response = await axios.put(
          `${API_URL}/api/rides/${currentRide._id}/status`,
          { status: 'in-progress' },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log('✅ Ride started via rides endpoint:', response.data);
        
        setRideStatus('in-progress');
        setRideStartLocation(startLocation);
        setRideStartTime(new Date());
        setRideDistanceTraveled(0);
        
        if (socket) {
          socket.emit('update-ride-status', {
            rideId: currentRide._id,
            status: 'in-progress',
            riderId: currentRide.rider?._id,
            driverId: user._id
          });
        }
        
        setDriverRoute(getRoutePointsWithCurve(currentLocation, currentRide.dropoffLocation, 30));
        toast.success('🚗 Ride started!');
        setIsLoading(false);
        return;
      } catch (fallbackError) {
        console.error('❌ Both endpoints failed:', fallbackError.response?.data);
        throw fallbackError;
      }
    }
  } catch (error) {
    console.error('❌ Failed to start ride:', error);
    console.error('❌ Error details:', error.response?.data);
    toast.error(error.response?.data?.error || 'Failed to start ride');
  } finally {
    setIsLoading(false);
  }
};

  // ============ HANDLE LOGOUT ============
  const handleLogout = () => {
    if (isAvailable) {
      socket?.emit('driver-offline', { driverId: user?._id });
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
      }
    });

    socket.on(`ride-${currentRide?._id}-accepted`, (data) => {
      if (data.driverId === user?._id) {
        toast.success('✅ Ride accepted! Proceed to pickup');
        setArrivalChecked(false);
        setIsAtPickup(false);
        setShowManualArrival(false);
        setArrivalAttempts(0);
        if (currentRide) {
          setDriverRoute(getRoutePointsWithCurve(currentLocation, currentRide.pickupLocation, 30));
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
      console.log('Online drivers:', drivers.length);
    });

    socket.on('new-message', (msg) => {
      if (msg.senderId !== user?.id && !isChatOpen) {
        setUnreadMessages(prev => prev + 1);
        const senderName = msg.senderRole === 'rider' ? (currentRide?.rider?.name || 'Rider') : 'Driver';
        toast.success(`💬 ${senderName}: ${msg.message}`, { duration: 3000, icon: '💬' });
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
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-500">Restoring...</p>
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

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-black text-white px-5 py-3 flex justify-between items-center shadow-lg z-30 flex-shrink-0">
        <div className="flex items-center">
          <h1 className="text-xl font-bold">🇿🇦 Vai </h1>
          <button 
            onClick={() => navigate('/profile')} 
            className="ml-2 text-sm font-bold bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-lg transition"
          >
            {user?.role === 'driver' ? '🚗 Driver' : 'Rider'}
          </button>
          {isGettingLocation && (
            <span className="ml-2 text-[10px] bg-yellow-600 px-2 py-0.5 rounded-full animate-pulse">📍 GPS</span>
          )}
          {isAvailable && (
            <span className="ml-2 text-[10px] bg-green-600 px-2 py-0.5 rounded-full animate-pulse">● Online</span>
          )}
          {isAtPickup && (
            <span className="ml-2 text-[10px] bg-purple-600 px-2 py-0.5 rounded-full animate-pulse">📍 Arrived</span>
          )}
          {rideRequests.length > 0 && (
            <span className="ml-2 text-[10px] bg-red-600 px-2 py-0.5 rounded-full animate-pulse">
              {rideRequests.length} 📬
            </span>
          )}
          {speed > 5 && (
            <span className="ml-2 text-[10px] bg-blue-600 px-2 py-0.5 rounded-full">{Math.round(speed)} km/h</span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/history')} 
            className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-lg transition"
          >
            History
          </button>
          <button 
            onClick={() => setShowDebug(!showDebug)} 
            className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-lg transition"
          >
            <FaBug className="inline mr-1" /> Debug
          </button>
          <button onClick={handleLogout} className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg transition">
            Logout
          </button>
        </div>
      </header>

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
          
          <Marker 
            position={[currentLocation.lat, currentLocation.lng]}
            icon={carIcon}
            rotationAngle={carRotation}
            rotationOrigin="center"
          >
            <Popup>
              <div className="text-center">
                <p className="font-bold">🚗 You are here</p>
                <p className="text-xs text-gray-500">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.vehicle?.model} • {user?.vehicle?.color}</p>
                {isAtPickup && <p className="text-xs text-green-600 font-bold">📍 Arrived!</p>}
                {distanceToPickup !== null && !isAtPickup && (
                  <p className="text-xs text-gray-400">{formatDistance(distanceToPickup)} to pickup</p>
                )}
                {rideStatus === 'in-progress' && (
                  <p className="text-xs text-gray-400">{formatDistance(rideDistanceTraveled)} traveled</p>
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
                  <div className="text-center">
                    <p className="font-bold text-green-600">📍 Pickup</p>
                    <p className="text-xs text-gray-500">{currentRide.pickupLocation.address}</p>
                    {distanceToPickup !== null && rideStatus !== 'arrived' && (
                      <p className="text-xs text-gray-400">{formatDistance(distanceToPickup)} away</p>
                    )}
                    {isAtPickup && <p className="text-xs text-green-600 font-bold">✅ Arrived!</p>}
                    {eta !== null && rideStatus === 'accepted' && !isAtPickup && (
                      <p className="text-xs text-gray-400">ETA: {formatTime(eta)}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
              <Marker 
                position={[currentRide.dropoffLocation.lat, currentRide.dropoffLocation.lng]} 
                icon={dropoffIcon}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-red-600">🏁 Dropoff</p>
                    <p className="text-xs text-gray-500">{currentRide.dropoffLocation.address}</p>
                    {rideStatus === 'in-progress' && (
                      <p className="text-xs text-gray-400">{formatDistance(rideDistanceTraveled)} traveled</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            </>
          )}
          
          {driverRoute.length > 0 && (
            <Polyline
              positions={driverRoute.map(p => [p.lat, p.lng])}
              color={isAtPickup ? '#22c55e' : '#2563eb'}
              weight={4}
              opacity={0.7}
              dashArray={isAtPickup ? undefined : '10, 8'}
            />
          )}
          
          {routePoints.length > 1 && (
            <Polyline
              positions={routePoints.map(p => [p.lat, p.lng])}
              color="#3b82f6"
              weight={3}
              opacity={0.4}
            />
          )}
        </MapContainer>

        {/* Loading overlay */}
        {(tileLoading || !mapLoaded) && (
          <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mb-3"></div>
            <p className="text-gray-500 text-sm">Loading map...</p>
          </div>
        )}

        {/* Location error */}
        {locationError && !isGettingLocation && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-3 py-1 rounded-lg shadow-lg text-xs z-30">
            {locationError}
          </div>
        )}

        {/* Debug Panel */}
        {showDebug && (
          <div className="absolute top-2 left-2 bg-black/90 text-white p-3 rounded-lg z-50 max-w-xs text-xs font-mono overflow-auto max-h-60">
            <p className="font-bold mb-1">🐛 Debug Info</p>
            <p>Ride Status: {rideStatus || 'none'}</p>
            <p>Driver ID: {user?._id?.slice(-6) || 'none'}</p>
            <p>Is At Pickup: {isAtPickup ? '✅' : '❌'}</p>
            <p>Arrival Checked: {arrivalChecked ? '✅' : '❌'}</p>
            <p>Distance: {distanceToPickup !== null ? formatDistance(distanceToPickup) : '--'}</p>
            <p>ETA: {eta !== null ? formatTime(eta) : '--'}</p>
            <p>Speed: {speed > 0 ? `${Math.round(speed)} km/h` : '--'}</p>
            <p>Socket: {socket?.isConnected ? '✅ Connected' : '❌'}</p>
            <p>Ride ID: {currentRide?._id?.slice(-6) || 'none'}</p>
            <p>Distance Traveled: {formatDistance(rideDistanceTraveled)}</p>
            <p className="text-yellow-300 text-[10px] mt-1">Pickup: {currentRide?.pickupLocation?.lat?.toFixed(4)}, {currentRide?.pickupLocation?.lng?.toFixed(4)}</p>
            
            <button 
              onClick={testArrival}
              className="mt-2 bg-green-600 text-white px-2 py-1 rounded text-xs w-full hover:bg-green-700 transition"
            >
              🧪 Test Arrival
            </button>
            <button 
              onClick={requestDriverLocation}
              className="mt-1 bg-blue-600 text-white px-2 py-1 rounded text-xs w-full hover:bg-blue-700 transition"
            >
              📡 Request Location
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/*              MOBILE LAYOUT */}
        {/* ============================================================ */}
        {isMobile && (
          <>
            {/* Mobile Ride Requests Sheet */}
            {!currentRide && isAvailable && rideRequests.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-3 z-30 border-t border-gray-200 safe-area-bottom max-h-64 overflow-y-auto" style={{ marginBottom: '56px' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm flex items-center">
                    <span className="text-yellow-500 mr-2">🔔</span> Ride Requests
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {rideRequests.length}
                    </span>
                  </h3>
                </div>
                {rideRequests.slice(0, 3).map((ride) => (
                  <div key={ride.rideId} className="p-3 bg-gray-50 rounded-lg mb-2">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-medium truncate">Ride #{ride.rideId?.slice(-6) || 'New'}</p>
                        <p className="text-xs text-gray-500 truncate">{ride.pickup?.address || 'Pickup location'}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>📍 {ride.distance?.toFixed(1) || '0'}km</span>
                          <span className="text-green-600 font-bold">R{ride.fare?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => acceptRide(ride.rideId)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition whitespace-nowrap flex-shrink-0"
                      >
                        {isLoading ? '...' : 'Accept'}
                      </button>
                    </div>
                  </div>
                ))}
                {rideRequests.length > 3 && (
                  <p className="text-center text-xs text-gray-400">+ {rideRequests.length - 3} more requests</p>
                )}
              </div>
            )}

            {/* Mobile Navigation Info */}
            {currentRide && rideStatus === 'accepted' && !isAtPickup && (
              <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm rounded-t-2xl shadow-2xl p-4 z-30 border-t border-gray-200 safe-area-bottom" style={{ marginBottom: '56px' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <FaRoute className="text-blue-600 h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Distance to pickup</p>
                      <p className="font-bold text-lg">
                        {distanceToPickup !== null ? formatDistance(distanceToPickup) : '...'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Estimated arrival</p>
                    <p className="font-bold text-lg text-green-600">
                      {eta !== null ? formatTime(eta) : '--'}
                    </p>
                    {arrivalTime && eta !== null && (
                      <p className="text-xs text-gray-400">at {arrivalTime}</p>
                    )}
                  </div>
                </div>
                
                {riderInfo && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <FaUser className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{riderInfo.name}</p>
                        <p className="text-xs text-gray-500">
                          {riderInfo.phone || 'No phone provided'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Pickup</p>
                        <p className="text-xs font-medium truncate max-w-[100px]">
                          {currentRide?.pickupLocation?.address?.split(',')[0] || 'Pickup'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {distanceToPickup !== null && eta !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{formatDistance(distanceToPickup)} remaining</span>
                      <span>~{formatTime(eta)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (1 - distanceToPickup / 10) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Ride Status Sheet */}
            {currentRide && (
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-4 z-30 border-t border-gray-200 safe-area-bottom" style={{ marginBottom: '56px' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      rideStatus === 'completed' ? 'bg-green-500' : 
                      rideStatus === 'in-progress' ? 'bg-blue-500' :
                      rideStatus === 'arrived' ? 'bg-purple-500' :
                      'bg-yellow-500'
                    } animate-pulse`}></div>
                    <span className="text-sm font-semibold">{getDriverStatusMessage()}</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">R{currentRide?.fare?.toFixed(2)}</span>
                </div>
                
                {riderInfo && (
                  <div className="flex items-center space-x-2 mt-2 p-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <FaUser className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{riderInfo.name}</p>
                      <p className="text-xs text-gray-500">
                        {riderInfo.phone || 'No phone provided'}
                      </p>
                    </div>
                    {distanceToPickup !== null && rideStatus === 'accepted' && !isAtPickup && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Distance</p>
                        <p className="text-sm font-medium">{formatDistance(distanceToPickup)}</p>
                      </div>
                    )}
                    {eta !== null && rideStatus === 'accepted' && !isAtPickup && (
                      <div className="text-right ml-2">
                        <p className="text-xs text-gray-500">ETA</p>
                        <p className="text-sm font-medium text-green-600">{formatTime(eta)}</p>
                      </div>
                    )}
                    {rideStatus === 'in-progress' && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Traveled</p>
                        <p className="text-sm font-medium">{formatDistance(rideDistanceTraveled)}</p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* Heading to pickup - Show "I'm Here" button */}
                  {rideStatus === 'accepted' && !isAtPickup && (
                    <>
                      <button
                        onClick={manualArrival}
                        disabled={isLoading}
                        className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition font-medium"
                      >
                        📍 I'm Here (Arrived)
                      </button>
                      <button
                        onClick={cancelRide}
                        disabled={isLoading}
                        className="py-2 px-3 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
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
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition font-medium"
                      >
                        🚗 Start Ride
                      </button>
                      <button
                        onClick={cancelRide}
                        disabled={isLoading}
                        className="py-2 px-3 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
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
                        className="flex-1 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 transition font-medium"
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
                        setIsAvailable(true);
                        if (socket) {
                          socket.emit('driver-online', {
                            driverId: user?._id,
                            location: currentLocation,
                            vehicle: user?.vehicle
                          });
                        }
                      }}
                      className="flex-1 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition font-medium"
                    >
                      Go Online
                    </button>
                  )}
                </div>

                {/* Chat button - mobile */}
                {rideStatus !== 'completed' && rideStatus !== 'cancelled' && (
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="w-full mt-2 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition flex items-center justify-center relative"
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

            {/* Mobile Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
              <div className="flex items-center justify-around h-14 max-w-screen-lg mx-auto px-4">
                <button
                  onClick={() => navigate('/driver')}
                  className="flex flex-col items-center justify-center text-black"
                >
                  <FaHome className="h-5 w-5" />
                  <span className="text-[9px] mt-0.5">Home</span>
                </button>
                <button
                  onClick={() => navigate('/history')}
                  className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <FaHistory className="h-5 w-5" />
                  <span className="text-[9px] mt-0.5">History</span>
                </button>
                <button
                  onClick={toggleAvailability}
                  disabled={isLoading}
                  className={`flex flex-col items-center justify-center w-12 h-12 rounded-full shadow-lg -mt-6 transition ${
                    isAvailable
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  } disabled:opacity-50`}
                >
                  {isAvailable ? '●' : '○'}
                  <span className="text-[8px] mt-0.5 font-medium">
                    {isAvailable ? 'Online' : 'Offline'}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/*              DESKTOP LAYOUT */}
        {/* ============================================================ */}
        {!isMobile && (
          <div className="absolute top-0 right-0 h-full w-96 bg-white border-l shadow-lg overflow-y-auto z-20">
            <div className="p-6 pb-20">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <FaCar className="mr-2" /> Driver Dashboard
              </h2>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <FaMoneyBill className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <p className="text-sm text-gray-500">Earnings</p>
                  <p className="text-xl font-bold">R{earnings.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <FaCar className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-xl font-bold">{completedRides}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <FaClock className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                  <p className="text-sm text-gray-500">Distance</p>
                  <p className="text-xl font-bold">{totalDistance.toFixed(1)} km</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <FaClock className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-sm text-gray-500">Avg Fare</p>
                  <p className="text-xl font-bold">
                    {completedRides > 0 ? `R${(earnings / completedRides).toFixed(2)}` : 'R0.00'}
                  </p>
                </div>
              </div>

              {/* Toggle Online/Offline */}
              <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg mb-6">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'} mr-3`}></div>
                  <div>
                    <p className="font-medium">{isAvailable ? 'Online' : 'Offline'}</p>
                    <p className="text-xs text-gray-500">
                      {isAvailable ? 'Ready to accept rides' : 'Tap to go online'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleAvailability}
                  disabled={isLoading || isGettingLocation}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    isAvailable
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } disabled:opacity-50`}
                >
                  {isLoading ? '...' : isAvailable ? 'Go Offline' : 'Go Online'}
                </button>
              </div>

              {/* Vehicle Info */}
              {user?.vehicle && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Your Vehicle</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500">Model:</span> {user.vehicle.model}</p>
                    <p><span className="text-gray-500">Color:</span> {user.vehicle.color}</p>
                    <p><span className="text-gray-500">Plate:</span> {user.vehicle.plateNumber}</p>
                  </div>
                </div>
              )}

              {/* Ride Requests (Desktop) */}
              {!currentRide && isAvailable && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center">
                    <span className="text-yellow-500 mr-2">🔔</span> Ride Requests
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {rideRequests.length}
                    </span>
                  </h3>
                  
                  {rideRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                      <div className="text-4xl mb-2">🚗</div>
                      <p className="text-lg">No ride requests yet</p>
                      <p className="text-sm">Waiting for riders in your area</p>
                    </div>
                  ) : (
                    rideRequests.map((ride) => (
                      <div key={ride.rideId} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition bg-white">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">Ride #{ride.rideId?.slice(-6) || 'New'}</span>
                          <span className="text-green-600 font-bold">R{ride.fare?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-start">
                            <FaMapMarkerAlt className="text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                            <p className="truncate">{ride.pickup?.address || 'Pickup location'}</p>
                          </div>
                          <div className="flex items-start">
                            <FaFlag className="text-red-500 mr-1 mt-0.5 flex-shrink-0" />
                            <p className="truncate">{ride.dropoff?.address || 'Destination'}</p>
                          </div>
                          <p className="text-xs text-gray-400">📍 {ride.distance?.toFixed(1) || '0'} km away</p>
                        </div>
                        <button
                          onClick={() => acceptRide(ride.rideId)}
                          disabled={isLoading}
                          className="mt-3 w-full py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                        >
                          Accept Ride
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Offline State */}
              {!currentRide && !isAvailable && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-4xl mb-2">⏰</div>
                  <p className="text-lg">You're offline</p>
                  <p className="text-sm">Go online to start receiving ride requests</p>
                </div>
              )}

              {/* Active Ride Info - Desktop */}
              {currentRide && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Active Ride</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className="font-medium">{getDriverStatusMessage()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fare</span>
                      <span className="font-bold text-green-600">R{currentRide.fare?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Distance</span>
                      <span className="font-medium">{currentRide.distance?.toFixed(1) || '0'} km</span>
                    </div>
                    
                    {/* Rider Information */}
                    {riderInfo && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                          <FaUserFriends className="mr-1" /> Rider Information
                        </p>
                        <div className="p-3 bg-gray-100 rounded-lg">
                          <p className="text-sm font-medium">{riderInfo.name}</p>
                          <p className="text-xs text-gray-500">{riderInfo.phone || 'No phone provided'}</p>
                          {currentRide?.pickupLocation?.address && (
                            <p className="text-xs text-gray-500 mt-1">
                              <FaMapMarkerAlt className="inline mr-1 text-green-500" />
                              {currentRide.pickupLocation.address}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Distance and ETA Display */}
                    {distanceToPickup !== null && rideStatus === 'accepted' && !isAtPickup && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Distance to pickup</span>
                          <span className="font-medium">{formatDistance(distanceToPickup)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ETA</span>
                          <span className="font-medium text-green-600">
                            {eta !== null ? formatTime(eta) : '--'}
                            {arrivalTime && eta !== null && (
                              <span className="text-xs text-gray-400 ml-1">(at {arrivalTime})</span>
                            )}
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>{formatDistance(distanceToPickup)} remaining</span>
                            <span>~{formatTime(eta)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (1 - distanceToPickup / 10) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* In Progress - Show distance traveled */}
                    {rideStatus === 'in-progress' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Distance Traveled</span>
                          <span className="font-medium">{formatDistance(rideDistanceTraveled)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status</span>
                          <span className="font-medium text-blue-600">🚗 Ride in progress</span>
                        </div>
                      </>
                    )}
                    
                    {isAtPickup && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status</span>
                        <span className="font-medium text-green-600">📍 Arrived!</span>
                      </div>
                    )}
                    
                    {speed > 0 && rideStatus === 'accepted' && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Speed</span>
                        <span className="font-medium">{Math.round(speed)} km/h</span>
                      </div>
                    )}
                    
                    {/* Action Buttons - Desktop */}
                    
                    {/* Manual Arrival Button */}
                    {rideStatus === 'accepted' && !isAtPickup && (
                      <div className="pt-2 border-t mt-2">
                        <button
                          onClick={manualArrival}
                          disabled={isLoading}
                          className="w-full py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
                        >
                          📍 I'm Here (Arrived)
                        </button>
                      </div>
                    )}
                    
                    {/* Start Ride Button */}
                    {(rideStatus === 'accepted' && isAtPickup) || rideStatus === 'arrived' ? (
                      <div className="pt-2 border-t mt-2">
                        <button
                          onClick={startRide}
                          disabled={isLoading}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                        >
                          🚗 Start Ride
                        </button>
                      </div>
                    ) : null}
                    
                    {/* Complete Ride Button (with reason) - Only in progress */}
                    {rideStatus === 'in-progress' && (
                      <div className="pt-2 border-t mt-2">
                        <button
                          onClick={showEarlyCompletion}
                          disabled={isLoading || completingRide}
                          className="w-full py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium flex items-center justify-center"
                        >
                          <FaQuestionCircle className="mr-2" /> Complete Ride
                        </button>
                      </div>
                    )}
                    
                    {/* Chat Button */}
                    {rideStatus !== 'completed' && rideStatus !== 'cancelled' && (
                      <div className="pt-2 border-t mt-2">
                        <button
                          onClick={() => setIsChatOpen(true)}
                          className="w-full py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition flex items-center justify-center relative"
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
                      <div className="pt-2 border-t mt-2">
                        <button
                          onClick={cancelRide}
                          disabled={isLoading}
                          className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center"
                        >
                          <FaTimes className="mr-2" /> Cancel Ride
                        </button>
                      </div>
                    )}
                    
                    {/* No cancel for in-progress - show message */}
                    {rideStatus === 'in-progress' && (
                      <div className="pt-2 border-t mt-2">
                        <p className="text-center text-xs text-gray-500">
                          ⚠️ Cannot cancel ride while in progress!
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

      {/* ============ EARLY COMPLETION MODAL ============ */}
      {showEarlyCompletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <FaQuestionCircle className="text-yellow-600 mr-2" />
              Complete Ride Early
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please select a reason for completing this ride before reaching the destination.
            </p>
            
            <div className="space-y-3">
              {EARLY_COMPLETION_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setEarlyCompletionReason(reason.id)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition ${
                    earlyCompletionReason === reason.id
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className="font-medium">{reason.label}</span>
                </button>
              ))}
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                value={earlyCompletionNote}
                onChange={(e) => setEarlyCompletionNote(e.target.value)}
                placeholder="Add any additional details..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                rows="3"
              />
            </div>
            
            <div className="mt-4 flex gap-2">
              <button
                onClick={completeRideWithReason}
                disabled={!earlyCompletionReason || completingRide}
                className="flex-1 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 font-medium"
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
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
        }
        @media (max-width: 767px) {
          .leaflet-control-container {
            margin-bottom: 56px;
          }
        }
      `}</style>
    </div>
  );
};

export default DriverDashboard;