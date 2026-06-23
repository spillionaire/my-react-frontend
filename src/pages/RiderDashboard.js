import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
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
  FaWallet,
  FaStar,
  FaCheckCircle,
  FaUserCircle
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
import RatingModal from '../components/RatingModal';
import ProfileDropdown from '../components/ProfileDropdown';
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

// Small car icon for available drivers
const getDriverMarkerIcon = () => {
  return new L.Icon({
    iconUrl: getCarIconUrl(),
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    className: 'driver-available-marker'
  });
};

const SA_BOUNDS = getSouthAfricaBounds();

// ============ CHANGE MAP VIEW ============
function ChangeMapView({ targetLocation, zoom = 14 }) {
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

// ============ LOCATION PICKER ============
function LocationPicker({ setPickup, setPickupAddress, isRideActive }) {
  useMapEvents({
    click(e) {
      if (isRideActive) {
        toast.error('Cannot change pickup during active ride', { icon: '🚗' });
        return;
      }
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

// Place Search - Updated with dark theme styling
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
          className="w-full px-3 py-2 pr-8 bg-[#0E1A2A] border border-[#1A2A4A] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] placeholder:text-gray-500"
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
            <div className="animate-spin h-4 w-4 border-2 border-[#1A6BFF] border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-[#0E1A2A] border border-[#1A2A4A] rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
          {suggestions.map((item, index) => (
            <div
              key={index}
              className="px-3 py-2 hover:bg-[#1A2A4A] cursor-pointer border-b border-[#1A2A4A] last:border-b-0"
              onMouseDown={() => handleSelect(item)}
            >
              <div className="flex items-start">
                <FaSearch className="mt-1 mr-2 text-gray-500 flex-shrink-0 h-4 w-4" />
                <div>
                  <div className="text-sm font-medium text-white">
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
  const { user, logout, updateUser } = useAuth();
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
  
  // ROUTING STATE
  const [routeData, setRouteData] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  
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
  
  // Rating Modal
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rideToRate, setRideToRate] = useState(null);
  
  // Responsive detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // ============ AVAILABLE DRIVERS STATE ============
  const [availableDrivers, setAvailableDrivers] = useState([]);

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
  const routeCalculationTimeout = useRef(null);

  // ============ FETCH AVAILABLE DRIVERS ============
  useEffect(() => {
    if (!user || currentRide) return;
    
    const fetchAvailableDrivers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/auth/online-drivers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 Online drivers response:', response.data);
        
        if (response.data && response.data.drivers) {
          const nearby = response.data.drivers.filter(driver => {
            if (!driver.location || !driver.location.lat || !driver.location.lng) {
              return false;
            }
            const dist = calculateDistance(
              pickup.lat,
              pickup.lng,
              driver.location.lat,
              driver.location.lng
            );
            return dist <= 10;
          });
          setAvailableDrivers(nearby);
          console.log(`📍 Found ${nearby.length} nearby drivers out of ${response.data.drivers.length} total`);
        } else {
          console.log('⚠️ No drivers found or invalid response');
          setAvailableDrivers([]);
        }
      } catch (error) {
        console.error('❌ Error fetching drivers:', error);
        setAvailableDrivers([]);
      }
    };

    fetchAvailableDrivers();
    
    const interval = setInterval(fetchAvailableDrivers, 30000);
    
    return () => clearInterval(interval);
  }, [user, currentRide, pickup]);

  // ============ PERSIST ROUTE DATA ============
  useEffect(() => {
    if (routeData) {
      try {
        localStorage.setItem('riderRouteData', JSON.stringify(routeData));
        localStorage.setItem('riderPickup', JSON.stringify(pickup));
        localStorage.setItem('riderDropoff', JSON.stringify(dropoff));
        localStorage.setItem('riderPickupAddress', pickupAddress);
        localStorage.setItem('riderDestination', destination);
      } catch (error) {
        console.error('Error saving route data:', error);
      }
    }
  }, [routeData, pickup, dropoff, pickupAddress, destination]);

  // Restore route data from localStorage on mount
  useEffect(() => {
    try {
      const savedRoute = localStorage.getItem('riderRouteData');
      if (savedRoute) {
        const parsed = JSON.parse(savedRoute);
        setRouteData(parsed);
        console.log('🔄 Restored route data from localStorage');
      }
      
      const savedPickup = localStorage.getItem('riderPickup');
      if (savedPickup) {
        const parsed = JSON.parse(savedPickup);
        setPickup(parsed);
      }
      
      const savedDropoff = localStorage.getItem('riderDropoff');
      if (savedDropoff) {
        const parsed = JSON.parse(savedDropoff);
        setDropoff(parsed);
      }
      
      const savedPickupAddress = localStorage.getItem('riderPickupAddress');
      if (savedPickupAddress) {
        setPickupAddress(savedPickupAddress);
      }
      
      const savedDestination = localStorage.getItem('riderDestination');
      if (savedDestination) {
        setDestination(savedDestination);
      }
    } catch (error) {
      console.error('Error restoring route data:', error);
    }
  }, []);

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
          
          if (ride.routePoints && ride.routePoints.length > 0) {
            const restoredRoute = {
              points: ride.routePoints,
              distance: ride.distance,
              duration: ride.duration,
              distanceText: formatDistance(ride.distance),
              durationText: formatTime(ride.duration || 10),
              estimatedFare: ride.fare,
              provider: 'OSM (OpenStreetMap)',
              isFallback: false
            };
            setRouteData(restoredRoute);
            console.log('🔄 Restored route points from ride');
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

  // AUTO-CALCULATE ROUTE when pickup or dropoff changes
  useEffect(() => {
    if (routeCalculationTimeout.current) {
      clearTimeout(routeCalculationTimeout.current);
    }

    const isDefaultPickup = pickup.lat === -26.2041 && pickup.lng === 28.0473;
    const isDefaultDropoff = dropoff.lat === -26.2041 && dropoff.lng === 28.0473;

    if (pickup && dropoff && pickup.lat && dropoff.lat && 
        pickup.lng && dropoff.lng && !currentRide &&
        !isDefaultPickup && !isDefaultDropoff) {
      routeCalculationTimeout.current = setTimeout(() => {
        autoCalculateRoute();
      }, 800);
    } else {
      if (isDefaultPickup && isDefaultDropoff) {
        setRouteData(null);
        localStorage.removeItem('riderRouteData');
      }
    }

    return () => {
      if (routeCalculationTimeout.current) {
        clearTimeout(routeCalculationTimeout.current);
      }
    };
  }, [pickup, dropoff]);

  // AUTO-CALCULATE ROUTE function
  const autoCalculateRoute = async () => {
    if (currentRide) return;
    
    const isDefaultPickup = pickup.lat === -26.2041 && pickup.lng === 28.0473;
    const isDefaultDropoff = dropoff.lat === -26.2041 && dropoff.lng === 28.0473;
    
    if (isDefaultPickup || isDefaultDropoff) {
      console.log('📍 Using default coordinates, skipping route calculation');
      return;
    }
    
    const dist = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    if (dist < 0.1) {
      return;
    }

    setIsCalculatingRoute(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsCalculatingRoute(false);
        return;
      }

      console.log('📍 Calculating route from:', pickup, 'to:', dropoff);

      const response = await axios.post(
        `${API_URL}/api/rides/calculate-route`,
        {
          pickup: { lat: pickup.lat, lng: pickup.lng, address: pickupAddress || 'Pickup' },
          dropoff: { lat: dropoff.lat, lng: dropoff.lng, address: destination || 'Dropoff' }
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      console.log('📦 Route API response:', response.data);

      if (response.data && response.data.success) {
        const route = response.data.route;
        
        console.log('📍 Route details:', {
          distance: route.distanceText,
          duration: route.durationText,
          points: route.points?.length || 0,
          isFallback: route.isFallback || false,
          provider: route.provider
        });
        
        setRouteData(route);
        setDistance(route.distance);
        setEstimatedFare(parseFloat(route.estimatedFare));
        
        const fareData = calculateFareSA(route.distance, 'johannesburg', isPeak, selectedService);
        setFareBreakdown(fareData.breakdown);
        
        if (route.isFallback) {
          toast('Using approximate route (OSM unavailable)', { icon: '⚠️' });
        }
      } else {
        console.error('❌ Route API returned error:', response.data);
        toast.error('Could not calculate route');
      }
    } catch (error) {
      console.error('❌ Route calculation error:', error);
      toast.error(error.response?.data?.error || 'Error calculating route');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Calculate fare (fallback if route not available)
  useEffect(() => {
    if (!routeData && pickup && dropoff) {
      const dLat = dropoff.lat - pickup.lat;
      const dLng = dropoff.lng - pickup.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111.32;
      setDistance(Math.round(dist * 10) / 10);
      
      if (dist > 0) {
        const fareData = calculateFareSA(dist, 'johannesburg', isPeak, selectedService);
        setEstimatedFare(fareData.total);
        setFareBreakdown(fareData.breakdown);
      }
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
          setRideToRate(currentRide);
          setShowRatingModal(true);
        }, 2000);
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
          setRouteData(null);
          localStorage.removeItem('riderRouteData');
          localStorage.removeItem('riderPickup');
          localStorage.removeItem('riderDropoff');
          localStorage.removeItem('riderPickupAddress');
          localStorage.removeItem('riderDestination');
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
        setRouteData(null);
        localStorage.removeItem('riderRouteData');
        localStorage.removeItem('riderPickup');
        localStorage.removeItem('riderDropoff');
        localStorage.removeItem('riderPickupAddress');
        localStorage.removeItem('riderDestination');
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
        setRouteData(null);
        localStorage.removeItem('riderRouteData');
      }
    };

    socket.on('new-message', (msg) => {
      if (msg.senderId !== user?._id && !isChatOpen) {
        setUnreadMessages(prev => prev + 1);
        const senderName = msg.senderRole === 'driver' ? (driverInfo?.name || 'Driver') : 'Rider';
        toast.success(`💬 ${senderName}: ${msg.message}`, { duration: 3000, icon: '💬' });
      }
    });

    socket.on('drivers-update', (drivers) => {
      console.log('📡 Received drivers update:', drivers.length);
      if (currentRide) return;
      
      const nearby = drivers.filter(driver => {
        if (!driver.location || !driver.location.lat || !driver.location.lng) {
          return false;
        }
        const dist = calculateDistance(
          pickup.lat,
          pickup.lng,
          driver.location.lat,
          driver.location.lng
        );
        return dist <= 10;
      });
      setAvailableDrivers(nearby);
    });

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
      socket.off('new-message');
      socket.off('drivers-update');
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
    toast.success('📍 Pickup set');
  };

  const handleDestinationSelect = (item) => {
    setDropoff({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
    setDestination(item.display_name);
    toast.success('🏁 Destination set');
  };

  const requestRide = async () => {
    if (!routeData) {
      toast.error('Please wait for route to calculate');
      return;
    }

    try {
      setIsRequesting(true);
      setIsLoading(true);

      const response = await axios.post(`${API_URL}/api/rides/request`, {
        pickup: { 
          lat: pickup.lat, 
          lng: pickup.lng, 
          address: pickupAddress || 'Current Location' 
        },
        dropoff: { 
          lat: dropoff.lat, 
          lng: dropoff.lng, 
          address: destination || 'Destination' 
        },
        distance: routeData.distance || distance,
        duration: routeData.duration || Math.round(distance * 2) || 10,
        fare: estimatedFare,
        serviceType: selectedService,
        isPeak: isPeak,
        paymentMethod: selectedPayment,
        routePoints: routeData.points || []
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
        routePoints: routeData.points || []
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
      setRouteData(null);
      localStorage.removeItem('riderRouteData');
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
    localStorage.removeItem('riderRouteData');
    localStorage.removeItem('riderPickup');
    localStorage.removeItem('riderDropoff');
    localStorage.removeItem('riderPickupAddress');
    localStorage.removeItem('riderDestination');
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

  // Check if ride is active
  const isRideActive = currentRide && rideStatus !== 'completed' && rideStatus !== 'cancelled';

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
            {user?.role === 'driver' ? 'Driver' : 'Rider'}
          </button>
          {isGettingLocation && (
            <span className="text-[10px] text-gray-500">📍 GPS</span>
          )}
          {isPeak && (
            <span className="text-[10px] text-orange-400">⚡ Peak</span>
          )}
          {driverLocation && (
            <span className="text-[10px] text-green-400">● Live</span>
          )}
          {driverSpeed > 0 && rideStatus === 'accepted' && (
            <span className="text-[10px] text-blue-400">{Math.round(driverSpeed)} km/h</span>
          )}
          {user?.isVerified && (
            <span className="text-[10px] text-blue-400 flex items-center">
              <FaCheckCircle className="mr-0.5 text-xs" /> Verified
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
            onClick={requestDriverLocation}
            className="text-gray-400 hover:text-blue-400 transition-colors"
          >
            <FaCrosshairs className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setShowDebug(!showDebug)} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaBug className="h-5 w-5" />
          </button>
          <ProfileDropdown user={user} logout={handleLogout} />
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden">
        <MapContainer
          center={[pickup.lat, pickup.lng]}
          zoom={14}
          style={{ height: '100%', width: '100%', paddingBottom: isMobile ? '130px' : '0' }}
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
          
          <ChangeMapView targetLocation={[pickup.lat, pickup.lng]} zoom={14} />
          
          <LocationPicker 
            setPickup={setPickup} 
            setPickupAddress={setPickupAddress} 
            isRideActive={isRideActive}
          />
          
          {/* Pickup Marker */}
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup>
              <p className="font-bold text-green-500">📍 Pickup</p>
              <p className="text-xs text-gray-600">{pickupAddress || 'Your location'}</p>
            </Popup>
          </Marker>
          
          {/* Dropoff Marker */}
          <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
            <Popup>
              <p className="font-bold text-red-500">🏁 Dropoff</p>
              <p className="text-xs text-gray-600">{destination || 'Destination'}</p>
            </Popup>
          </Marker>

          {/* ============ AVAILABLE DRIVER MARKERS ============ */}
          {!currentRide && availableDrivers.length > 0 && availableDrivers.map((driver) => {
            const driverIcon = getDriverMarkerIcon();
            return (
              <Marker 
                key={driver._id || Math.random().toString()}
                position={[driver.location.lat, driver.location.lng]}
                icon={driverIcon}
              >
                <Popup>
                  <div className="text-center min-w-[160px] bg-[#0E1A2A] text-white">
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <span className="font-medium text-sm">{driver.name || 'Driver'}</span>
                      {driver.isVerified && (
                        <span className="text-blue-400 text-xs">✓</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{driver.vehicle?.model || 'Car'}</p>
                    <p className="text-xs text-green-400 font-medium">● Available</p>
                    <div className="flex items-center justify-center space-x-2 mt-1">
                      <span className="text-xs text-yellow-400">★ {driver.rating?.average?.toFixed(1) || 'New'}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">{driver.totalTrips || 0} trips</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          
          {/* Route Line - BLUE accent color */}
          {routeData && routeData.points && routeData.points.length > 1 && (
            <Polyline 
              positions={routeData.points.map(p => [p.lat, p.lng])} 
              color="#1A6BFF" 
              weight={4} 
              opacity={0.8}
              smoothFactor={1}
            />
          )}
          
          {/* Driver Car Marker */}
          {driverLocation && currentRide && rideStatus !== 'completed' && rideStatus !== 'cancelled' && (
            <Marker 
              position={[driverLocation.lat, driverLocation.lng]} 
              icon={carIcon} 
              rotationAngle={driverRotation || 0} 
              rotationOrigin="center"
            >
              <Popup>
                <div className="text-center min-w-[150px] bg-[#0E1A2A] text-white">
                  <p className="font-bold text-blue-400">🚗 Driver</p>
                  {driverInfo && (
                    <>
                      <p className="text-sm font-medium">{driverInfo.name}</p>
                      <p className="text-xs text-gray-400">
                        {driverInfo.vehicle?.model} • {driverInfo.vehicle?.plateNumber}
                      </p>
                    </>
                  )}
                  {distanceToDriver !== null && (
                    <p className="text-xs mt-1 text-gray-400">{formatDistance(distanceToDriver)} away</p>
                  )}
                  {driverEta !== null && rideStatus === 'accepted' && (
                    <p className="text-xs text-green-400 font-medium">ETA: {formatTime(driverEta)}</p>
                  )}
                  {driverArrivalTime && rideStatus === 'accepted' && (
                    <p className="text-xs text-gray-500">Arrives at {driverArrivalTime}</p>
                  )}
                  {driverSpeed > 0 && (
                    <p className="text-xs text-gray-500">{Math.round(driverSpeed)} km/h</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Driver route line (driver to pickup) - BLUE dashed */}
          {driverRoute.length > 0 && currentRide && rideStatus === 'accepted' && (
            <Polyline 
              positions={driverRoute.map(p => [p.lat, p.lng])} 
              color="#1A6BFF" 
              weight={3} 
              opacity={0.7} 
              dashArray="8, 6"
            />
          )}
          
          {/* Pickup to Dropoff Route Line - BLUE dashed */}
          {currentRide && currentRide.pickupLocation && currentRide.dropoffLocation && rideStatus !== 'cancelled' && (
            <Polyline 
              positions={[
                [currentRide.pickupLocation.lat, currentRide.pickupLocation.lng],
                [currentRide.dropoffLocation.lat, currentRide.dropoffLocation.lng]
              ]} 
              color="#1A6BFF"
              weight={3} 
              opacity={0.4}
              dashArray="10, 8"
            />
          )}
        </MapContainer>

        {/* Debug Panel - Dark theme */}
        {showDebug && (
          <div className="absolute top-2 left-2 bg-[#080E1F]/90 text-white p-3 rounded-xl z-50 max-w-xs text-xs font-mono overflow-auto max-h-60 border border-[#1A2A4A]">
            <p className="font-bold mb-1 text-blue-400">🐛 Debug Info</p>
            <p className="text-gray-400">Ride Status: {rideStatus || 'none'}</p>
            <p className="text-gray-400">Driver ID: {driverId || '❌ none'}</p>
            <p className="text-gray-400">Driver Location: {driverLocation ? '✅' : '❌'}</p>
            <p className="text-gray-400">Route Points: {driverRoute.length}</p>
            <p className="text-gray-400">Distance: {distanceToDriver !== null ? formatDistance(distanceToDriver) : '--'}</p>
            <p className="text-gray-400">ETA: {driverEta !== null ? formatTime(driverEta) : '--'}</p>
            <p className="text-gray-400">Speed: {driverSpeed > 0 ? `${Math.round(driverSpeed)} km/h` : '--'}</p>
            <p className="text-gray-400">Socket: {socket ? '✅ Connected' : '❌'}</p>
            <p className="text-gray-400">Ride ID: {currentRide?._id?.slice(-6) || 'none'}</p>
            <p className="text-gray-400">Pickup: {pickup ? `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}` : '❌'}</p>
            <p className="text-gray-400">Route Points Saved: {routeData?.points?.length || 0}</p>
            <p className="text-gray-400">Available Drivers: {availableDrivers.length}</p>
            <p className="text-yellow-400 text-[10px] mt-1">Last update: {debugInfo.timestamp || 'never'}</p>
            <button 
              onClick={requestDriverLocation}
              className="mt-2 bg-[#1A6BFF] text-white px-2 py-1 rounded text-xs w-full hover:bg-[#5294FF] transition"
            >
              📡 Request Location Now
            </button>
          </div>
        )}

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

        {/* ============ MOBILE: INPUT SHEET - Dark theme ============ */}
        {isMobile && !currentRide && (
          <div className="absolute bottom-0 left-0 right-0 bg-[#0E1A2A] rounded-t-2xl shadow-lg p-3 z-30 border-t border-[#1A2A4A] safe-area-bottom" 
               style={{ marginBottom: '70px', paddingBottom: '12px' }}>
            <div className="flex items-center space-x-2">
              <button
                onClick={updateLocation}
                disabled={isGettingLocation}
                className="p-2 bg-[#1A6BFF] text-white rounded-xl hover:bg-[#5294FF] transition disabled:opacity-50 flex-shrink-0"
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
                onClick={requestRide}
                disabled={isRequesting || !destination || distance === 0 || isGettingLocation || !routeData}
                className="p-2 bg-[#1A6BFF] text-white rounded-xl hover:bg-[#5294FF] transition disabled:opacity-50 flex-shrink-0"
              >
                {isRequesting ? (
                  <FaSpinner className="h-5 w-5 animate-spin" />
                ) : (
                  <FaCar className="h-5 w-5" />
                )}
              </button>
            </div>
            {fareBreakdown && routeData && (
              <div className="flex justify-between items-center mt-2 px-1">
                <div>
                  <p className="text-xs text-gray-400">{routeData.distanceText} • {routeData.durationText}</p>
                  <p className="text-xs text-gray-400 capitalize">{selectedService}</p>
                  <p className="text-xs text-gray-400">Payment: {selectedPayment.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">R{estimatedFare.toFixed(2)}</p>
                </div>
              </div>
            )}
            {!destination && (
              <p className="text-xs text-red-400 text-center mt-1">Please enter a destination</p>
            )}
            {isCalculatingRoute && (
              <p className="text-xs text-blue-400 text-center mt-1">Calculating route...</p>
            )}
          </div>
        )}

        {/* ============ MOBILE: RIDE STATUS SHEET - Dark theme ============ */}
        {isMobile && currentRide && rideStatus !== 'completed' && rideStatus !== 'cancelled' && (
          <div className="absolute bottom-0 left-0 right-0 bg-[#0E1A2A] rounded-t-2xl shadow-lg p-4 z-30 border-t border-[#1A2A4A] safe-area-bottom" 
               style={{ marginBottom: '70px', paddingBottom: '12px' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  rideStatus === 'arrived' ? 'bg-purple-500' :
                  rideStatus === 'in-progress' ? 'bg-blue-500' :
                  rideStatus === 'accepted' ? 'bg-yellow-500' :
                  'bg-gray-500'
                } animate-pulse`}></div>
                <span className="text-sm font-semibold text-white">{getRiderStatusMessage()}</span>
              </div>
              <span className="text-lg font-bold text-green-400">R{currentRide.fare?.toFixed(2)}</span>
            </div>

            {currentRide?.tripReference && (
              <div className="flex justify-between items-center bg-[#0A1228] px-3 py-1.5 rounded-lg mb-2 border border-[#1A2A4A]">
                <span className="text-xs text-gray-500">Trip Reference</span>
                <span className="text-xs font-mono font-medium text-white bg-[#1A2A4A] px-2 py-0.5 rounded border border-[#1A2A4A]">
                  {currentRide.tripReference}
                </span>
              </div>
            )}

            {/* ALWAYS SHOW PICKUP AND DROPOFF ADDRESSES */}
            <div className="mt-2 p-3 bg-[#0A1228] rounded-xl border border-[#1A2A4A]">
              <div className="flex items-start space-x-2">
                <FaMapMarkerAlt className="text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-400">Pickup</p>
                  <p className="text-sm text-white truncate">{currentRide?.pickupLocation?.address || pickupAddress || 'Pickup location'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 mt-2">
                <FaFlag className="text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-400">Dropoff</p>
                  <p className="text-sm text-white truncate">{currentRide?.dropoffLocation?.address || destination || 'Destination'}</p>
                </div>
              </div>
            </div>

            {/* Searching for drivers animation */}
            {rideStatus === 'requested' && (
              <div className="mt-2 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-ping delay-75"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-ping delay-150"></div>
                </div>
                <p className="text-sm text-yellow-400 mt-2">🔍 Searching for nearby drivers...</p>
                <p className="text-xs text-yellow-400/60">Your pickup location is being broadcasted to drivers</p>
              </div>
            )}

            {driverInfo && rideStatus === 'accepted' && (
              <div className="mt-2 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <FaUser className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{driverInfo.name}</p>
                      <p className="text-xs text-gray-400">
                        {driverInfo.vehicle?.model} • {driverInfo.vehicle?.plateNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">ETA</p>
                    <p className="text-sm font-bold text-green-400">
                      {driverEta !== null ? formatTime(driverEta) : '...'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-blue-500/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-400">Driver distance</p>
                      <p className="font-semibold text-sm text-white">
                        {distanceToDriver !== null ? formatDistance(distanceToDriver) : '...'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Arrival time</p>
                      <p className="font-semibold text-sm text-green-400">
                        {driverArrivalTime || '...'}
                      </p>
                    </div>
                  </div>
                  {distanceToDriver !== null && driverEta !== null && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{formatDistance(distanceToDriver)} away</span>
                        <span>~{formatTime(driverEta)}</span>
                      </div>
                      <div className="w-full bg-[#1A2A4A] rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
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
              <div className="mt-2 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-center">
                <p className="text-purple-400 font-medium">📍 Driver has arrived at your location</p>
                <p className="text-xs text-purple-400/60 mt-1">Please meet your driver at the pickup point</p>
              </div>
            )}

            {rideStatus === 'in-progress' && (
              <div className="mt-2 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaCar className="text-blue-400 h-4 w-4" />
                    <span className="text-sm text-gray-300">Ride in progress</span>
                  </div>
                  <span className="text-xs text-gray-400">
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
                  className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/30 transition border border-red-500/20"
                >
                  Cancel Request
                </button>
              )}
              {(rideStatus === 'accepted' || rideStatus === 'arrived') && (
                <>
                  <button
                    onClick={cancelRide}
                    disabled={isLoading}
                    className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/30 transition border border-red-500/20"
                  >
                    Cancel Ride
                  </button>
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="py-2 px-4 bg-blue-500/20 text-blue-400 rounded-xl text-sm hover:bg-blue-500/30 transition relative flex items-center border border-blue-500/20"
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
              {rideStatus === 'in-progress' && (
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="flex-1 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm hover:bg-blue-500/30 transition flex items-center justify-center relative border border-blue-500/20"
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

        {/* ============ DESKTOP: SIDE PANEL - Dark theme ============ */}
        {!isMobile && (
          <div className="absolute top-0 right-0 h-full w-96 bg-[#080E1F] border-l border-[#1A2A4A] shadow-lg overflow-y-auto z-20">
            <div className="p-6 pb-20">
              <h2 className="text-xl font-bold mb-6 flex items-center text-white">
                <FaCar className="mr-2 text-[#1A6BFF]" /> Request a Ride
                {user?.isVerified && (
                  <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full flex items-center border border-blue-500/20">
                    <FaCheckCircle className="mr-1 text-xs" /> Verified
                  </span>
                )}
              </h2>
              
              {!currentRide ? (
                <div className="space-y-6">
                  <div className="p-3 bg-[#0E1A2A] rounded-xl text-xs flex items-center justify-between border border-[#1A2A4A]">
                    <span className="text-gray-500">Location:</span>
                    <span className="font-medium text-white">
                      {locationMethod === 'gps' && '📡 GPS'}
                      {locationMethod === 'network' && '📶 Network'}
                      {locationMethod === 'manual' && '📍 Manual'}
                      {locationMethod === 'default' && '⚠️ Default'}
                    </span>
                    {locationMethod === 'default' && (
                      <button onClick={updateLocation} className="text-[#1A6BFF] hover:text-[#5294FF]">
                        Try Again
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <FaMapMarkerAlt className="inline mr-1 text-green-400" /> Pickup
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
                        className="text-[#1A6BFF] hover:text-[#5294FF] text-sm flex items-center"
                      >
                        <FaCrosshairs className="mr-1" /> 
                        {isGettingLocation ? 'Locating...' : 'Use My Location'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <FaFlag className="inline mr-1 text-red-400" /> Destination
                    </label>
                    <PlaceSearch
                      onSelect={handleDestinationSelect}
                      placeholder="Where to?"
                      value={destination}
                      setValue={setDestination}
                    />
                  </div>

                  {/* Service Section - Only Economy and Standard */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <FaCar className="inline mr-1" /> Service
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedService('economy')}
                        className={`p-3 rounded-xl border-2 text-sm transition ${
                          selectedService === 'economy'
                            ? 'border-[#1A6BFF] bg-[#1A6BFF]/10 text-white'
                            : 'border-[#1A2A4A] text-gray-400 hover:border-[#1A6BFF] hover:text-white'
                        }`}
                      >
                        <div className="font-medium">Vai Go</div>
                        <div className="text-xs text-gray-500">Budget-friendly</div>
                      </button>
                      <button
                        onClick={() => setSelectedService('standard')}
                        className={`p-3 rounded-xl border-2 text-sm transition ${
                          selectedService === 'standard'
                            ? 'border-[#1A6BFF] bg-[#1A6BFF]/10 text-white'
                            : 'border-[#1A2A4A] text-gray-400 hover:border-[#1A6BFF] hover:text-white'
                        }`}
                      >
                        <div className="font-medium">Vai X</div>
                        <div className="text-xs text-gray-500">Standard ride</div>
                      </button>
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <FaWallet className="inline mr-1" /> Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {paymentOptions.map((method) => {
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.id}
                            onClick={() => setSelectedPayment(method.id)}
                            className={`p-3 rounded-xl border-2 text-sm transition flex flex-col items-center ${
                              selectedPayment === method.id
                                ? 'border-[#1A6BFF] bg-[#1A6BFF]/10 text-white'
                                : 'border-[#1A2A4A] text-gray-400 hover:border-[#1A6BFF] hover:text-white'
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
                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center">
                      <FaClock className="text-orange-400 mr-2" />
                      <span className="text-sm text-orange-400">⚡ Peak pricing active (20%)</span>
                    </div>
                  )}

                  {distance > 0 && routeData && (
                    <div className="p-4 bg-[#0E1A2A] rounded-xl border border-[#1A2A4A]">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-white">Trip Details</h3>
                          <p className="text-sm text-gray-400">
                            {routeData.distanceText} • {routeData.durationText}
                          </p>
                          <p className="text-xs text-gray-500">Provider: {routeData.provider}</p>
                          {routeData.isFallback && (
                            <p className="text-xs text-yellow-400">⚠️ Approximate route</p>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-green-400">R{estimatedFare.toFixed(2)}</p>
                      </div>
                      
                      <button
                        onClick={requestRide}
                        disabled={isRequesting || !destination || distance === 0 || isGettingLocation || !routeData}
                        className="w-full mt-3 py-3 bg-[#1A6BFF] text-white rounded-xl font-medium hover:bg-[#5294FF] transition disabled:opacity-50"
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
                    </div>
                  )}

                  {isCalculatingRoute && (
                    <div className="text-center py-4">
                      <FaSpinner className="animate-spin mx-auto h-8 w-8 text-[#1A6BFF]" />
                      <p className="text-sm text-gray-500 mt-2">Calculating route...</p>
                    </div>
                  )}

                  <div className="border-t border-[#1A2A4A] pt-4">
                    <p className="text-sm text-gray-400 flex items-center">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      {availableDrivers.length} drivers nearby
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-[#0E1A2A] rounded-xl border border-[#1A2A4A]">
                    <h3 className="font-medium text-white mb-3">Ride Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status</span>
                        <span className="font-medium text-white">{getRiderStatusMessage()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fare</span>
                        <span className="font-bold text-green-400">R{currentRide.fare?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Distance</span>
                        <span className="font-medium text-white">{currentRide.distance?.toFixed(1) || '0'} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Payment</span>
                        <span className="font-medium text-white capitalize">{currentRide.paymentMethod || 'Cash'}</span>
                      </div>
                      
                      {currentRide?.tripReference && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Trip Reference</span>
                          <span className="font-mono font-medium text-xs text-white bg-[#1A2A4A] px-2 py-0.5 rounded border border-[#1A2A4A]">
                            {currentRide.tripReference}
                          </span>
                        </div>
                      )}

                      {/* ALWAYS SHOW PICKUP AND DROPOFF ADDRESSES - DESKTOP */}
                      <div className="pt-2 border-t border-[#1A2A4A] mt-2">
                        <div className="p-3 bg-[#0A1228] rounded-xl border border-[#1A2A4A]">
                          <div className="flex items-start space-x-2">
                            <FaMapMarkerAlt className="text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-green-400">Pickup</p>
                              <p className="text-sm text-white truncate">{currentRide?.pickupLocation?.address || pickupAddress || 'Pickup location'}</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2 mt-2">
                            <FaFlag className="text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-red-400">Dropoff</p>
                              <p className="text-sm text-white truncate">{currentRide?.dropoffLocation?.address || destination || 'Destination'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Searching for drivers animation - Desktop */}
                      {rideStatus === 'requested' && (
                        <div className="mt-2 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-ping delay-75"></div>
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-ping delay-150"></div>
                          </div>
                          <p className="text-sm text-yellow-400 mt-2">🔍 Searching for nearby drivers...</p>
                          <p className="text-xs text-yellow-400/60">Your pickup location is being broadcasted to drivers</p>
                        </div>
                      )}
                      
                      {driverInfo && rideStatus === 'accepted' && (
                        <div className="pt-2 border-t border-[#1A2A4A]">
                          <p className="text-xs font-medium text-gray-400 mb-2">Driver Information</p>
                          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-white">{driverInfo.name}</p>
                                <p className="text-xs text-gray-400">Vehicle: {driverInfo.vehicle?.model}</p>
                                <p className="text-xs text-gray-400">Plate: {driverInfo.vehicle?.plateNumber}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-400">ETA</p>
                                <p className="font-bold text-sm text-green-400">
                                  {driverEta !== null ? formatTime(driverEta) : '...'}
                                </p>
                                {driverArrivalTime && (
                                  <p className="text-xs text-gray-500">at {driverArrivalTime}</p>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-blue-500/20">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-xs text-gray-400">Distance</p>
                                  <p className="font-semibold text-sm text-white">
                                    {distanceToDriver !== null ? formatDistance(distanceToDriver) : '...'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">Speed</p>
                                  <p className="font-semibold text-sm text-white">
                                    {driverSpeed > 0 ? `${Math.round(driverSpeed)} km/h` : '...'}
                                  </p>
                                </div>
                              </div>
                              {distanceToDriver !== null && driverEta !== null && (
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>{formatDistance(distanceToDriver)} away</span>
                                    <span>~{formatTime(driverEta)}</span>
                                  </div>
                                  <div className="w-full bg-[#1A2A4A] rounded-full h-1.5">
                                    <div 
                                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
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
                        <div className="pt-2 border-t border-[#1A2A4A]">
                          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                            <p className="text-purple-400 font-medium">📍 Driver has arrived</p>
                            <p className="text-xs text-purple-400/60">Please meet your driver at the pickup point</p>
                          </div>
                        </div>
                      )}
                      
                      {rideStatus === 'in-progress' && (
                        <div className="pt-2 border-t border-[#1A2A4A]">
                          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FaCar className="text-blue-400 h-4 w-4" />
                              <span className="text-sm text-gray-300">Ride in progress</span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {distance > 0 && `${formatDistance(distance)} to destination`}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {rideStatus !== 'completed' && rideStatus !== 'cancelled' && (
                        <div className="pt-2 border-t border-[#1A2A4A] mt-2">
                          <button
                            onClick={() => setIsChatOpen(true)}
                            className="w-full py-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition flex items-center justify-center relative border border-blue-500/20"
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
                      
                      {(rideStatus === 'requested' || rideStatus === 'accepted' || rideStatus === 'arrived') && (
                        <button
                          onClick={cancelRide}
                          disabled={isLoading}
                          className="w-full mt-2 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition border border-red-500/20"
                        >
                          Cancel Ride
                        </button>
                      )}
                      
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
                            setRouteData(null);
                            localStorage.removeItem('riderRouteData');
                            if (locationRequestInterval.current) {
                              clearInterval(locationRequestInterval.current);
                            }
                          }}
                          className="w-full mt-2 py-2 bg-[#1A6BFF] text-white rounded-xl hover:bg-[#5294FF] transition"
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

      {/* Payment Modal - Dark theme */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0E1A2A] rounded-2xl p-6 max-w-sm w-full border border-[#1A2A4A]">
            <h3 className="text-xl font-bold text-white mb-4">Select Payment Method</h3>
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
                    className={`w-full p-4 rounded-xl border-2 flex items-center space-x-3 transition ${
                      selectedPayment === method.id
                        ? 'border-[#1A6BFF] bg-[#1A6BFF]/10 text-white'
                        : 'border-[#1A2A4A] text-gray-400 hover:border-[#1A6BFF] hover:text-white'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="font-medium">{method.label}</span>
                    {selectedPayment === method.id && (
                      <span className="ml-auto text-green-400">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full mt-4 py-2 bg-[#1A2A4A] text-white rounded-xl hover:bg-[#2A3A5A] transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && rideToRate && (
        <RatingModal
          rideId={rideToRate._id}
          userRole="rider"
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
          driverInfo={driverInfo}
          riderInfo={user}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* Bottom Navigation - Mobile - Dark theme */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#080E1F] border-t border-[#1A2A4A] z-50 safe-area-bottom" style={{ height: '60px' }}>
          <div className="flex items-center justify-around h-14 max-w-screen-lg mx-auto px-4">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex flex-col items-center justify-center text-gray-500 hover:text-white transition-colors"
            >
              <FaWallet className="h-5 w-5" />
              <span className="text-[9px] mt-0.5 text-gray-500">Payment</span>
            </button>
            <button
              onClick={requestRide}
              disabled={isRequesting || !destination || distance === 0 || !routeData}
              className="flex flex-col items-center justify-center text-gray-500 hover:text-white transition-colors disabled:opacity-50"
            >
              <FaCar className="h-6 w-6 text-[#1A6BFF]" />
              <span className="text-[9px] mt-0.5 font-medium text-white">Ride</span>
            </button>
            <button
              onClick={() => navigate('/history')}
              className="flex flex-col items-center justify-center text-gray-500 hover:text-white transition-colors"
            >
              <FaHistory className="h-5 w-5" />
              <span className="text-[9px] mt-0.5 text-gray-500">History</span>
            </button>
          </div>
        </div>
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
        .pickup-radar {
          animation: radarPulse 1.5s ease-out infinite;
        }
        @keyframes radarPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
            transform: scale(1);
          }
          100% {
            box-shadow: 0 0 0 30px rgba(34, 197, 94, 0);
            transform: scale(1.5);
          }
        }
        @media (max-width: 767px) {
          .leaflet-control-container {
            margin-bottom: 56px;
          }
        }
        /* Scrollbar styling */
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

export default RiderDashboard;