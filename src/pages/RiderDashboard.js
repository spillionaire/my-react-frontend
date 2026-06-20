import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaMapMarkerAlt, 
  FaFlag, 
  FaCar, 
  FaHistory, 
  FaSignOutAlt,
  FaUser,
  FaCrosshairs,
  FaSearch,
  FaSpinner,
  FaComment,
  FaHome,
  FaClock,
  FaRoad,
  FaBug,
  FaCreditCard,
  FaMoneyBillWave,
  FaWallet
} from 'react-icons/fa';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  calculateFareSA, 
  isPeakHour, 
  getServiceTypes, 
  getSouthAfricaBounds 
} from '../utils/pricing';
import { 
  calculateDistance, 
  formatDistance, 
  formatTime,
  getRoutePoints,
  getRoutePointsWithCurve,
  calculateETA,
  getArrivalTime,
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

// Custom icons
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Car icon for driver
const carIcon = new L.Icon({
  iconUrl: getCarIconUrl(),
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  className: 'car-marker'
});

const SA_BOUNDS = getSouthAfricaBounds();

// Location Picker
function LocationPicker({ setPickup, setPickupAddress }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPickup({ lat, lng });
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
          if (data.display_name) setPickupAddress(data.display_name);
        })
        .catch(() => {});
      toast.success('📍 Pickup updated');
    },
  });
  return null;
}

// Place Search
function PlaceSearch({ onSelect, placeholder, value, setValue }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const debounceTimer = useRef(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  const searchPlaces = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=za`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setValue(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      searchPlaces(value);
      setShowSuggestions(true);
    }, 300);
  };

  const handleSelect = (item) => {
    setSearchTerm(item.display_name);
    setValue(item.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    onSelect(item);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchTerm && searchTerm.length >= 2) {
              setShowSuggestions(true);
              searchPlaces(searchTerm);
            }
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {isLoading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
          {suggestions.map((item, index) => (
            <div
              key={index}
              className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              onMouseDown={() => handleSelect(item)}
            >
              <div className="flex items-start">
                <FaSearch className="mt-1 mr-2 text-gray-400 flex-shrink-0 h-4 w-4" />
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {item.display_name?.split(',')[0] || item.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{item.display_name}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MAIN COMPONENT ============
const RiderDashboard = () => {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  
  // State
  const [pickup, setPickup] = useState({ lat: -26.2041, lng: 28.0473 });
  const [dropoff, setDropoff] = useState({ lat: -26.2041, lng: 28.0473 });
  const [pickupAddress, setPickupAddress] = useState('');
  const [destination, setDestination] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [locationMethod, setLocationMethod] = useState('default');
  
  const [isRequesting, setIsRequesting] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [rideStatus, setRideStatus] = useState(null);
  const [estimatedFare, setEstimatedFare] = useState(0);
  const [distance, setDistance] = useState(0);
  const [fareBreakdown, setFareBreakdown] = useState(null);
  const [selectedService, setSelectedService] = useState('standard');
  const [isPeak, setIsPeak] = useState(isPeakHour());
  const [isLoading, setIsLoading] = useState(false);
  
  const [driverLocation, setDriverLocation] = useState(null);
  const [driverRotation, setDriverRotation] = useState(0);
  const [driverInfo, setDriverInfo] = useState(null);
  const [driverRoute, setDriverRoute] = useState([]);
  const [distanceToDriver, setDistanceToDriver] = useState(null);
  const [driverEta, setDriverEta] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [driverSpeed, setDriverSpeed] = useState(0);
  const [driverArrivalTime, setDriverArrivalTime] = useState(null);
  
  // Payment method state
  const [selectedPayment, setSelectedPayment] = useState('cash');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Store driver ID separately for reliable access
  const [driverId, setDriverId] = useState(null);
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState({});
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [tileLoading, setTileLoading] = useState(true);
  
  // Responsive detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mapRef = useRef();
  const serviceTypes = getServiceTypes();
  const locationAttempted = useRef(false);
  const activeRideFetched = useRef(false);
  const locationRequestInterval = useRef(null);

  // Fetch active ride on load
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
          
          if (ride.pickupLocation) {
            setPickup(ride.pickupLocation);
            setPickupAddress(ride.pickupLocation.address || 'Pickup');
          }
          
          if (ride.dropoffLocation) {
            setDropoff(ride.dropoffLocation);
            setDestination(ride.dropoffLocation.address || 'Destination');
          }
          
          if (ride.driver) {
            const driverIdValue = ride.driver._id || ride.driver;
            setDriverId(driverIdValue);
            setDriverInfo(ride.driver);
            
            if (socket) {
              socket.emit('join-ride-room', { rideId: ride._id, userId: user?._id, role: 'rider' });
              socket.emit('request-driver-location', { driverId: driverIdValue, rideId: ride._id });
            }
          }
          toast.success('🔄 Restored your active ride');
        }
      } catch (error) {
        console.error('Error fetching active ride:', error);
      }
    };
    fetchActiveRide();
  }, [socket, user]);

  // Peak hour check
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPeak(isPeakHour());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Get location
  useEffect(() => {
    if (locationAttempted.current) return;
    locationAttempted.current = true;

    setIsGettingLocation(true);
    setLocationError(null);

    if (!isGPSAvailable()) {
      setLocationError('GPS not available. Click map to set pickup.');
      setIsGettingLocation(false);
      setLocationMethod('manual');
      return;
    }

    if (isHTTPSRequired()) {
      setLocationError('HTTPS required for GPS.');
      setIsGettingLocation(false);
      setLocationMethod('manual');
      return;
    }

    toast.loading('Getting GPS...', { id: 'gps' });

    getLocationWithFallback().then((result) => {
      toast.dismiss('gps');

      if (result.success) {
        const location = { lat: result.lat, lng: result.lng, accuracy: result.accuracy };
        setPickup(location);
        setIsGettingLocation(false);
        setLocationMethod(result.source === 'gps' ? 'gps' : 'network');
        setLocationError(null);
        
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`)
          .then(res => res.json())
          .then(data => {
            if (data.display_name) setPickupAddress(data.display_name);
          })
          .catch(() => {});
      } else {
        setIsGettingLocation(false);
        setLocationMethod('manual');
        setLocationError(getGPSErrorMessage(result.code));
      }
    });
  }, []);

  // Calculate fare
  useEffect(() => {
    const dLat = dropoff.lat - pickup.lat;
    const dLng = dropoff.lng - pickup.lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111.32;
    setDistance(Math.round(dist * 10) / 10);
    
    if (dist > 0) {
      const fareData = calculateFareSA(dist, 'johannesburg', isPeak, selectedService);
      setEstimatedFare(fareData.total);
      setFareBreakdown(fareData.breakdown);
    }
  }, [pickup, dropoff, selectedService, isPeak]);

  // ============ SOCKET EVENTS ============
  useEffect(() => {
    if (!socket) return;

    const handleDriverLocation = (data) => {
      if (driverId && data.driverId === driverId) {
        setDriverLocation(data.location);
        setDebugInfo(prev => ({ 
          ...prev, 
          lastLocation: data.location, 
          timestamp: new Date().toISOString(),
          locationReceived: true 
        }));
        
        if (data.rotation) setDriverRotation(data.rotation);
        if (data.speed) setDriverSpeed(data.speed * 3.6);
        
        const pickupLat = pickup?.lat || -26.2041;
        const pickupLng = pickup?.lng || 28.0473;
        
        const dist = calculateDistance(pickupLat, pickupLng, data.location.lat, data.location.lng);
        setDistanceToDriver(dist);
        
        const avgSpeed = Math.max((data.speed || 0) * 3.6, 10);
        const etaMinutes = calculateETA(dist, avgSpeed);
        setDriverEta(etaMinutes);
        
        if (etaMinutes > 0 && etaMinutes < 120) {
          setDriverArrivalTime(getArrivalTime(etaMinutes));
        }
        
        try {
          const route = getRoutePointsWithCurve(
            { lat: data.location.lat, lng: data.location.lng },
            { lat: pickupLat, lng: pickupLng },
            30
          );
          if (route && route.length > 0) {
            setDriverRoute(route);
          } else {
            const straightRoute = getRoutePoints(
              { lat: data.location.lat, lng: data.location.lng },
              { lat: pickupLat, lng: pickupLng },
              20
            );
            setDriverRoute(straightRoute);
          }
        } catch (error) {
          console.error('Error creating route:', error);
        }
      }
    };

    const handleRideStatus = (status) => {
      setRideStatus(status);
      if (status === 'arrived') {
        toast.success('📍 Driver arrived!');
        setDriverRoute([]);
      } else if (status === 'in-progress') {
        toast('🚗 Ride started');
        setDriverRoute([]);
      } else if (status === 'completed') {
        toast.success('✅ Ride completed!');
        setTimeout(() => {
          setCurrentRide(null);
          setRideStatus(null);
          setDriverLocation(null);
          setDriverInfo(null);
          setDriverRoute([]);
          setDistanceToDriver(null);
          setDriverEta(null);
          setDriverSpeed(0);
          setDriverArrivalTime(null);
          setDriverId(null);
        }, 3000);
      } else if (status === 'cancelled') {
        toast.error('Ride cancelled');
        setCurrentRide(null);
        setRideStatus(null);
        setDriverLocation(null);
        setDriverInfo(null);
        setDriverRoute([]);
        setDistanceToDriver(null);
        setDriverEta(null);
        setDriverSpeed(0);
        setDriverArrivalTime(null);
        setDriverId(null);
      }
    };

    const handleRideAccepted = (data) => {
      toast.success('✅ Driver accepted!');
      setRideStatus('accepted');
      
      const driverIdValue = data.driverId;
      setDriverId(driverIdValue);
      setCurrentRide(prev => ({ ...prev, driver: driverIdValue }));
      
      if (driverIdValue) {
        axios.get(`${API_URL}/api/auth/${driverIdValue}`)
          .then(res => {
            setDriverInfo(res.data);
            if (socket && currentRide?._id) {
              socket.emit('join-ride-room', { 
                rideId: currentRide._id, 
                userId: user?._id, 
                role: 'rider' 
              });
              socket.emit('request-driver-location', { 
                driverId: driverIdValue, 
                rideId: currentRide._id 
              });
            }
          })
          .catch(err => console.error('Error fetching driver info:', err));
      }
    };

    const handleDriverCancelled = (data) => {
      if (currentRide && data.rideId === currentRide._id) {
        toast.error('🚫 Driver cancelled the ride');
        setCurrentRide(null);
        setRideStatus(null);
        setDriverLocation(null);
        setDriverInfo(null);
        setDriverRoute([]);
        setDistanceToDriver(null);
        setDriverEta(null);
        setDriverSpeed(0);
        setDriverArrivalTime(null);
        setDriverId(null);
        setIsChatOpen(false);
        setUnreadMessages(0);
      }
    };

    socket.on('driver-location', handleDriverLocation);
    socket.on(`ride-${currentRide?._id}-status`, handleRideStatus);
    socket.on(`ride-${currentRide?._id}-accepted`, handleRideAccepted);
    socket.on('ride-driver-cancelled', handleDriverCancelled);

    if (driverId && rideStatus === 'accepted') {
      if (locationRequestInterval.current) clearInterval(locationRequestInterval.current);
      locationRequestInterval.current = setInterval(() => {
        socket.emit('request-driver-location', { driverId, rideId: currentRide?._id });
      }, 5000);
    }

    return () => {
      if (locationRequestInterval.current) clearInterval(locationRequestInterval.current);
      socket.off('driver-location', handleDriverLocation);
      socket.off(`ride-${currentRide?._id}-status`, handleRideStatus);
      socket.off(`ride-${currentRide?._id}-accepted`, handleRideAccepted);
      socket.off('ride-driver-cancelled', handleDriverCancelled);
    };
  }, [socket, currentRide, pickup, user, rideStatus, driverId]);

  // Reset unread messages
  useEffect(() => {
    if (isChatOpen) setUnreadMessages(0);
  }, [isChatOpen]);

  // Handlers
  const handlePickupSelect = (item) => {
    const newPickup = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
    setPickup(newPickup);
    setPickupAddress(item.display_name);
    setLocationMethod('manual');
    mapRef.current?.flyTo([parseFloat(item.lat), parseFloat(item.lon)], 15);
    toast.success('📍 Pickup set');
  };

  const handleDestinationSelect = (item) => {
    setDropoff({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
    setDestination(item.display_name);
    toast.success('🏁 Destination set');
  };

  const requestRide = async () => {
    try {
      setIsRequesting(true);
      setIsLoading(true);

      const response = await axios.post(`${API_URL}/api/rides/request`, {
        pickup: { lat: pickup.lat, lng: pickup.lng, address: pickupAddress || 'Current Location' },
        dropoff: { lat: dropoff.lat, lng: dropoff.lng, address: destination || 'Destination' },
        distance: distance || 5,
        duration: Math.round(distance * 2) || 10,
        fare: estimatedFare,
        serviceType: selectedService,
        isPeak: isPeak,
        paymentMethod: selectedPayment
      });

      const ride = response.data.ride;
      setCurrentRide(ride);
      setRideStatus('requested');
      
      if (socket) {
        socket.emit('join-ride-room', { 
          rideId: ride._id, 
          userId: user?._id, 
          role: 'rider' 
        });
      }
      
      socket?.emit('request-ride', {
        rideId: ride._id,
        riderId: user?._id,
        pickup: ride.pickupLocation,
        dropoff: ride.dropoffLocation,
        fare: ride.fare,
      });
      toast.success(`Ride requested! R${ride.fare.toFixed(2)}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to request ride');
    } finally {
      setIsRequesting(false);
      setIsLoading(false);
    }
  };

  const cancelRide = async () => {
    if (!currentRide || !window.confirm('Cancel this ride?')) return;
    
    if (rideStatus === 'in-progress') {
      toast.error('Cannot cancel ride while in progress');
      return;
    }
    
    try {
      setIsLoading(true);
      await axios.put(`${API_URL}/api/rides/${currentRide._id}/cancel`);
      socket?.emit('cancel-ride', { rideId: currentRide._id, riderId: user?._id, driverId: driverId });
      socket?.emit('ride-request-cancelled', { rideId: currentRide._id, riderId: user?._id });
      toast.success('Ride cancelled');
      setCurrentRide(null);
      setRideStatus(null);
      setDriverLocation(null);
      setDriverInfo(null);
      setDriverRoute([]);
      setDistanceToDriver(null);
      setDriverEta(null);
      setDriverSpeed(0);
      setDriverArrivalTime(null);
      setDriverId(null);
      setIsChatOpen(false);
      setUnreadMessages(0);
      if (locationRequestInterval.current) {
        clearInterval(locationRequestInterval.current);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel');
    } finally {
      setIsLoading(false);
    }
  };

  const updateLocation = () => {
    if (!navigator.geolocation) {
      toast('GPS not available', { icon: '⚠️' });
      return;
    }
    setIsGettingLocation(true);
    toast.loading('Getting GPS...', { id: 'update-gps' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = { lat: position.coords.latitude, lng: position.coords.longitude };
        setPickup(location);
        setIsGettingLocation(false);
        setLocationMethod('gps');
        toast.dismiss('update-gps');
        toast.success('📍 Location updated');
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`)
          .then(res => res.json())
          .then(data => {
            if (data.display_name) setPickupAddress(data.display_name);
          })
          .catch(() => {});
        mapRef.current?.flyTo([location.lat, location.lng], 15);
      },
      () => {
        setIsGettingLocation(false);
        toast.dismiss('update-gps');
        toast('Unable to get GPS', { icon: '⚠️' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Calculate status message
  const getRiderStatusMessage = () => {
    if (rideStatus === 'requested') return '⏳ Looking for driver...';
    if (rideStatus === 'accepted') {
      if (distanceToDriver !== null && distanceToDriver < 0.1) {
        return '📍 Driver is here!';
      }
      return '🚗 Driver on the way';
    }
    if (rideStatus === 'arrived') return '📍 Driver arrived';
    if (rideStatus === 'in-progress') return '🚗 Ride in progress';
    if (rideStatus === 'completed') return '✅ Ride completed';
    if (rideStatus === 'cancelled') return '❌ Cancelled';
    return '';
  };

  // Debug toggle
  const [showDebug, setShowDebug] = useState(false);

  // Manual location request
  const requestDriverLocation = () => {
    if (socket && driverId) {
      socket.emit('request-driver-location', { 
        driverId: driverId, 
        rideId: currentRide?._id 
      });
      toast('📍 Requesting driver location...');
    } else {
      toast('No driver found');
    }
  };

  // Payment options
  const paymentOptions = [
    { id: 'cash', label: 'Cash', icon: FaMoneyBillWave },
    { id: 'card', label: 'Card', icon: FaCreditCard },
    { id: 'wallet', label: 'Wallet', icon: FaWallet }
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-black text-white px-4 py-3 flex justify-between items-center shadow-lg z-30 flex-shrink-0">
        <div className="flex items-center">
          <h1 className="text-xl font-bold">🇿🇦 Vai</h1>
          <button 
            onClick={() => navigate('/profile')} 
            className="ml-2 text-sm font-bold bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-lg transition"
          >
            {user?.role === 'driver' ? '🚗 Driver' : '👤 Rider'}
          </button>
          {isGettingLocation && (
            <span className="ml-2 text-[10px] bg-yellow-600 px-2 py-0.5 rounded-full animate-pulse">📍 GPS</span>
          )}
          {isPeak && (
            <span className="ml-2 text-[10px] bg-red-600 px-2 py-0.5 rounded-full animate-pulse">⚡ Peak</span>
          )}
          {driverSpeed > 0 && rideStatus === 'accepted' && (
            <span className="ml-2 text-[10px] bg-blue-600 px-2 py-0.5 rounded-full">{Math.round(driverSpeed)} km/h</span>
          )}
          {driverLocation && (
            <span className="ml-2 text-[10px] bg-green-600 px-2 py-0.5 rounded-full animate-pulse">📍 Live</span>
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
            onClick={requestDriverLocation}
            className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg transition"
          >
            📍 Get Driver
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
          center={[pickup.lat, pickup.lng]}
          zoom={14}
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
          
          <LocationPicker setPickup={setPickup} setPickupAddress={setPickupAddress} />
          
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup>
              <p className="font-bold text-green-600">📍 Pickup</p>
              <p className="text-xs">{pickupAddress || 'Your location'}</p>
            </Popup>
          </Marker>
          
          <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
            <Popup>
              <p className="font-bold text-red-600">🏁 Dropoff</p>
              <p className="text-xs">{destination || 'Destination'}</p>
            </Popup>
          </Marker>
          
          {driverLocation && currentRide && rideStatus !== 'completed' && rideStatus !== 'cancelled' && (
            <Marker 
              position={[driverLocation.lat, driverLocation.lng]} 
              icon={carIcon} 
              rotationAngle={driverRotation || 0} 
              rotationOrigin="center"
            >
              <Popup>
                <div className="text-center min-w-[150px]">
                  <p className="font-bold text-blue-600">🚗 Driver</p>
                  {driverInfo && (
                    <>
                      <p className="text-sm font-medium">{driverInfo.name}</p>
                      <p className="text-xs text-gray-500">
                        {driverInfo.vehicle?.model} • {driverInfo.vehicle?.plateNumber}
                      </p>
                    </>
                  )}
                  {distanceToDriver !== null && (
                    <p className="text-xs mt-1">{formatDistance(distanceToDriver)} away</p>
                  )}
                  {driverEta !== null && rideStatus === 'accepted' && (
                    <p className="text-xs text-green-600 font-medium">ETA: {formatTime(driverEta)}</p>
                  )}
                  {driverArrivalTime && rideStatus === 'accepted' && (
                    <p className="text-xs text-gray-400">Arrives at {driverArrivalTime}</p>
                  )}
                  {driverSpeed > 0 && (
                    <p className="text-xs text-gray-400">{Math.round(driverSpeed)} km/h</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
          
          {driverRoute.length > 0 && currentRide && rideStatus === 'accepted' && (
            <Polyline 
              positions={driverRoute.map(p => [p.lat, p.lng])} 
              color="#2563eb" 
              weight={3} 
              opacity={0.7} 
              dashArray="8, 6"
            />
          )}
        </MapContainer>

        {/* Debug Panel */}
        {showDebug && (
          <div className="absolute top-2 left-2 bg-black/90 text-white p-3 rounded-lg z-50 max-w-xs text-xs font-mono overflow-auto max-h-60">
            <p className="font-bold mb-1">🐛 Debug Info</p>
            <p>Ride Status: {rideStatus || 'none'}</p>
            <p>Driver ID: {driverId || '❌ none'}</p>
            <p>Driver Location: {driverLocation ? '✅' : '❌'}</p>
            <p>Route Points: {driverRoute.length}</p>
            <p>Distance: {distanceToDriver !== null ? formatDistance(distanceToDriver) : '--'}</p>
            <p>ETA: {driverEta !== null ? formatTime(driverEta) : '--'}</p>
            <p>Speed: {driverSpeed > 0 ? `${Math.round(driverSpeed)} km/h` : '--'}</p>
            <p>Socket: {socket ? '✅ Connected' : '❌'}</p>
            <p>Ride ID: {currentRide?._id?.slice(-6) || 'none'}</p>
            <p>Pickup: {pickup ? `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}` : '❌'}</p>
            <p className="text-yellow-300 text-[10px] mt-1">Last update: {debugInfo.timestamp || 'never'}</p>
            <button 
              onClick={requestDriverLocation}
              className="mt-2 bg-blue-600 text-white px-2 py-1 rounded text-xs w-full"
            >
              📡 Request Location Now
            </button>
          </div>
        )}

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

        {/* ============ MOBILE: INPUT SHEET ============ */}
        {isMobile && !currentRide && (
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-3 z-30 border-t border-gray-200 safe-area-bottom" style={{ marginBottom: '56px' }}>
            <div className="flex items-center space-x-2">
              <button
                onClick={updateLocation}
                disabled={isGettingLocation}
                className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 flex-shrink-0"
              >
                <FaCrosshairs className="h-4 w-4" />
              </button>
              <div className="flex-1 space-y-1">
                <PlaceSearch
                  onSelect={handlePickupSelect}
                  placeholder="Pickup location..."
                  value={pickupAddress}
                  setValue={setPickupAddress}
                />
                <PlaceSearch
                  onSelect={handleDestinationSelect}
                  placeholder="Where to?"
                  value={destination}
                  setValue={setDestination}
                />
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="p-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition flex-shrink-0"
              >
                <FaWallet className="h-5 w-5" />
              </button>
              <button
                onClick={requestRide}
                disabled={isRequesting || !destination || distance === 0 || isGettingLocation}
                className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 flex-shrink-0"
              >
                {isRequesting ? (
                  <FaSpinner className="h-5 w-5 animate-spin" />
                ) : (
                  <FaCar className="h-5 w-5" />
                )}
              </button>
            </div>
            {fareBreakdown && (
              <div className="flex justify-between items-center mt-2 px-1">
                <div>
                  <p className="text-xs text-gray-500">{distance.toFixed(1)} km • ~{Math.round(distance * 2)} min</p>
                  <p className="text-xs text-gray-500 capitalize">{selectedService}</p>
                  <p className="text-xs text-gray-500">Payment: {selectedPayment.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">R{estimatedFare.toFixed(2)}</p>
                </div>
              </div>
            )}
            {!destination && (
              <p className="text-xs text-red-500 text-center mt-1">Please enter a destination</p>
            )}
          </div>
        )}

        {/* ============ MOBILE: RIDE STATUS SHEET ============ */}
        {isMobile && currentRide && rideStatus !== 'completed' && rideStatus !== 'cancelled' && (
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-4 z-30 border-t border-gray-200 safe-area-bottom" style={{ marginBottom: '56px' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  rideStatus === 'arrived' ? 'bg-purple-500' :
                  rideStatus === 'in-progress' ? 'bg-blue-500' :
                  rideStatus === 'accepted' ? 'bg-yellow-500' :
                  'bg-gray-400'
                } animate-pulse`}></div>
                <span className="text-sm font-semibold">{getRiderStatusMessage()}</span>
              </div>
              <span className="text-lg font-bold text-green-600">R{currentRide.fare?.toFixed(2)}</span>
            </div>

            {driverInfo && rideStatus === 'accepted' && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                      <FaUser className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{driverInfo.name}</p>
                      <p className="text-xs text-gray-500">
                        {driverInfo.vehicle?.model} • {driverInfo.vehicle?.plateNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">ETA</p>
                    <p className="text-sm font-bold text-green-600">
                      {driverEta !== null ? formatTime(driverEta) : '...'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">Driver distance</p>
                      <p className="font-semibold text-sm">
                        {distanceToDriver !== null ? formatDistance(distanceToDriver) : '...'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Arrival time</p>
                      <p className="font-semibold text-sm text-green-600">
                        {driverArrivalTime || '...'}
                      </p>
                    </div>
                  </div>
                  {distanceToDriver !== null && driverEta !== null && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{formatDistance(distanceToDriver)} away</span>
                        <span>~{formatTime(driverEta)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, 100 - (distanceToDriver / 10) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {driverSpeed > 0 && (
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <FaRoad className="mr-1" />
                      <span>Driver speed: {Math.round(driverSpeed)} km/h</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {rideStatus === 'arrived' && (
              <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200 text-center">
                <p className="text-purple-700 font-medium">📍 Driver has arrived at your location</p>
                <p className="text-xs text-purple-500 mt-1">Please meet your driver at the pickup point</p>
              </div>
            )}

            {rideStatus === 'in-progress' && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaCar className="text-blue-600 h-4 w-4" />
                    <span className="text-sm text-gray-600">Ride in progress</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {distance > 0 && `${formatDistance(distance)} to destination`}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              {rideStatus === 'requested' && (
                <button
                  onClick={cancelRide}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
                >
                  Cancel Request
                </button>
              )}
              {(rideStatus === 'accepted' || rideStatus === 'arrived') && (
                <>
                  <button
                    onClick={cancelRide}
                    disabled={isLoading}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
                  >
                    Cancel Ride
                  </button>
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="py-2 px-4 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition relative flex items-center"
                  >
                    <FaComment className="mr-1" /> Chat
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadMessages}
                      </span>
                    )}
                  </button>
                </>
              )}
              {/* No cancel button for in-progress - only chat */}
              {rideStatus === 'in-progress' && (
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition flex items-center justify-center relative"
                >
                  <FaComment className="mr-2" /> Contact Driver
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadMessages}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============ DESKTOP: SIDE PANEL ============ */}
        {!isMobile && (
          <div className="absolute top-0 right-0 h-full w-96 bg-white border-l shadow-lg overflow-y-auto z-20">
            <div className="p-6 pb-20">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <FaCar className="mr-2" /> Request a Ride
              </h2>
              
              {!currentRide ? (
                <div className="space-y-6">
                  <div className="p-3 bg-gray-50 rounded-lg text-xs flex items-center justify-between">
                    <span className="text-gray-500">Location:</span>
                    <span className="font-medium">
                      {locationMethod === 'gps' && '📡 GPS'}
                      {locationMethod === 'network' && '📶 Network'}
                      {locationMethod === 'manual' && '📍 Manual'}
                      {locationMethod === 'default' && '⚠️ Default'}
                    </span>
                    {locationMethod === 'default' && (
                      <button onClick={updateLocation} className="text-blue-600 hover:underline">
                        Try Again
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaMapMarkerAlt className="inline mr-1 text-green-600" /> Pickup
                    </label>
                    <PlaceSearch
                      onSelect={handlePickupSelect}
                      placeholder="Search for pickup..."
                      value={pickupAddress}
                      setValue={setPickupAddress}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {pickupAddress ? pickupAddress : `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}`}
                      </div>
                      <button
                        onClick={updateLocation}
                        disabled={isGettingLocation}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        <FaCrosshairs className="mr-1" /> 
                        {isGettingLocation ? 'Locating...' : 'Use My Location'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaFlag className="inline mr-1 text-red-600" /> Destination
                    </label>
                    <PlaceSearch
                      onSelect={handleDestinationSelect}
                      placeholder="Where to?"
                      value={destination}
                      setValue={setDestination}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaCar className="inline mr-1" /> Service
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {serviceTypes.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => setSelectedService(service.id)}
                          className={`p-3 rounded-lg border-2 text-sm transition ${
                            selectedService === service.id
                              ? 'border-black bg-gray-50'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div className="font-medium">{service.name}</div>
                          <div className="text-xs text-gray-500">{service.description}</div>
                          <div className="text-xs font-bold mt-1">
                            {service.id === 'economy' && '💰 Budget'}
                            {service.id === 'standard' && '⭐ Standard'}
                            {service.id === 'premium' && '💎 Luxury'}
                            {service.id === 'moto' && '🏍️ Fast'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaWallet className="inline mr-1" /> Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {paymentOptions.map((method) => {
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.id}
                            onClick={() => setSelectedPayment(method.id)}
                            className={`p-3 rounded-lg border-2 text-sm transition flex flex-col items-center ${
                              selectedPayment === method.id
                                ? 'border-black bg-gray-50'
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            <Icon className="h-5 w-5 mb-1" />
                            <span>{method.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {isPeak && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                      <FaClock className="text-red-500 mr-2" />
                      <span className="text-sm text-red-700">⚡ Peak pricing active</span>
                    </div>
                  )}

                  {distance > 0 && fareBreakdown && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h3 className="font-medium text-gray-700">Estimated Fare</h3>
                          <p className="text-xs text-gray-500">
                            {distance.toFixed(1)} km • ~{Math.round(distance * 2)} min
                          </p>
                          <p className="text-xs text-gray-500">Payment: {selectedPayment.toUpperCase()}</p>
                        </div>
                        <p className="text-2xl font-bold text-green-600">R{estimatedFare.toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={requestRide}
                    disabled={isRequesting || !destination || distance === 0 || isGettingLocation}
                    className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
                  >
                    {isGettingLocation ? (
                      <span className="flex items-center justify-center">
                        <FaSpinner className="animate-spin mr-2" /> Getting location...
                      </span>
                    ) : isRequesting ? (
                      <span className="flex items-center justify-center">
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                        Requesting...
                      </span>
                    ) : (
                      `🚗 Request Ride (R${estimatedFare.toFixed(2)})`
                    )}
                  </button>

                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      {nearbyDrivers.length} drivers nearby (within 5km)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-3">Ride Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status</span>
                        <span className="font-medium">{getRiderStatusMessage()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fare</span>
                        <span className="font-bold text-green-600">R{currentRide.fare?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Distance</span>
                        <span className="font-medium">{currentRide.distance?.toFixed(1) || '0'} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment</span>
                        <span className="font-medium capitalize">{currentRide.paymentMethod || 'Cash'}</span>
                      </div>
                      
                      {driverInfo && rideStatus === 'accepted' && (
                        <div className="pt-2 border-t">
                          <p className="text-xs font-medium text-gray-700 mb-2">Driver Information</p>
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-800">{driverInfo.name}</p>
                                <p className="text-xs text-gray-500">Vehicle: {driverInfo.vehicle?.model}</p>
                                <p className="text-xs text-gray-500">Plate: {driverInfo.vehicle?.plateNumber}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">ETA</p>
                                <p className="font-bold text-sm text-green-600">
                                  {driverEta !== null ? formatTime(driverEta) : '...'}
                                </p>
                                {driverArrivalTime && (
                                  <p className="text-xs text-gray-400">at {driverArrivalTime}</p>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-blue-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-xs text-gray-500">Distance</p>
                                  <p className="font-semibold text-sm">
                                    {distanceToDriver !== null ? formatDistance(distanceToDriver) : '...'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Speed</p>
                                  <p className="font-semibold text-sm">
                                    {driverSpeed > 0 ? `${Math.round(driverSpeed)} km/h` : '...'}
                                  </p>
                                </div>
                              </div>
                              {distanceToDriver !== null && driverEta !== null && (
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>{formatDistance(distanceToDriver)} away</span>
                                    <span>~{formatTime(driverEta)}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                                      style={{ width: `${Math.min(100, 100 - (distanceToDriver / 10) * 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {rideStatus === 'arrived' && (
                        <div className="pt-2 border-t">
                          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-purple-700 font-medium">📍 Driver has arrived</p>
                            <p className="text-xs text-purple-500">Please meet your driver at the pickup point</p>
                          </div>
                        </div>
                      )}
                      
                      {rideStatus === 'in-progress' && (
                        <div className="pt-2 border-t">
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FaCar className="text-blue-600 h-4 w-4" />
                              <span className="text-sm text-gray-600">Ride in progress</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {distance > 0 && `${formatDistance(distance)} to destination`}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Chat Button - Desktop */}
                      {rideStatus !== 'completed' && rideStatus !== 'cancelled' && (
                        <div className="pt-2 border-t mt-2">
                          <button
                            onClick={() => setIsChatOpen(true)}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center relative"
                          >
                            <FaComment className="mr-2" /> Chat with {driverInfo?.name || 'Driver'}
                            {unreadMessages > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {unreadMessages}
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                      
                      {/* Cancel Button - Only show for requested, accepted, or arrived */}
                      {(rideStatus === 'requested' || rideStatus === 'accepted' || rideStatus === 'arrived') && (
                        <button
                          onClick={cancelRide}
                          disabled={isLoading}
                          className="w-full mt-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                          Cancel Ride
                        </button>
                      )}
                      
                      {/* No cancel button for in-progress */}
                      {rideStatus === 'in-progress' && (
                        <p className="text-center text-xs text-gray-500 mt-2">
                          Ride in progress - Cannot cancel
                        </p>
                      )}
                      
                      {rideStatus === 'completed' && (
                        <button
                          onClick={() => {
                            setCurrentRide(null);
                            setRideStatus(null);
                            setDriverLocation(null);
                            setDriverInfo(null);
                            setDriverRoute([]);
                            setDistanceToDriver(null);
                            setDriverEta(null);
                            setDriverSpeed(0);
                            setDriverArrivalTime(null);
                            setDriverId(null);
                            setIsChatOpen(false);
                            setUnreadMessages(0);
                            if (locationRequestInterval.current) {
                              clearInterval(locationRequestInterval.current);
                            }
                          }}
                          className="w-full mt-2 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4">Select Payment Method</h3>
            <div className="space-y-2">
              {paymentOptions.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => {
                      setSelectedPayment(method.id);
                      setShowPaymentModal(false);
                      toast.success(`Payment method: ${method.label}`);
                    }}
                    className={`w-full p-4 rounded-lg border-2 flex items-center space-x-3 transition ${
                      selectedPayment === method.id
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="font-medium">{method.label}</span>
                    {selectedPayment === method.id && (
                      <span className="ml-auto text-green-600">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full mt-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Chat Component */}
      {currentRide && (
        <Chat
          rideId={currentRide._id}
          driverInfo={driverInfo}
          riderInfo={user}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* Bottom Navigation - Mobile */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
          <div className="flex items-center justify-around h-14 max-w-screen-lg mx-auto px-4">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-600"
            >
              <FaWallet className="h-5 w-5" />
              <span className="text-[9px] mt-0.5">Payment</span>
            </button>
            <button
              onClick={requestRide}
              disabled={isRequesting || !destination || distance === 0}
              className="flex flex-col items-center justify-center w-12 h-12 bg-black text-white rounded-full shadow-lg -mt-6 transition hover:bg-gray-800 disabled:opacity-50"
            >
              <FaCar className="h-5 w-5" />
              <span className="text-[8px] mt-0.5 font-medium">Ride</span>
            </button>
            <button
              onClick={() => navigate('/history')}
              className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-600"
            >
              <FaHistory className="h-5 w-5" />
              <span className="text-[9px] mt-0.5">History</span>
            </button>
          </div>
        </div>
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

export default RiderDashboard;