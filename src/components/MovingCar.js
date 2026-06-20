import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-rotatedmarker';
import carIcon from '../assets/car-icon.png'; // We'll create this

const MovingCar = ({ position, rotation, map }) => {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !position) return;

    // Create car marker with rotation support
    const carMarker = L.marker([position.lat, position.lng], {
      icon: L.icon({
        iconUrl: carIcon,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: 'car-marker'
      }),
      rotationAngle: rotation || 0,
      rotationOrigin: 'center'
    }).addTo(map);

    markerRef.current = carMarker;

    // Add pulsing glow effect
    const pulseLayer = L.circle([position.lat, position.lng], {
      radius: 20,
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.3,
      weight: 2,
      className: 'car-pulse'
    }).addTo(map);

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
      if (pulseLayer) {
        map.removeLayer(pulseLayer);
      }
    };
  }, [map, position]);

  // Update position when it changes
  useEffect(() => {
    if (!markerRef.current || !position) return;

    markerRef.current.setLatLng([position.lat, position.lng]);
    if (rotation !== undefined) {
      markerRef.current.setRotationAngle(rotation);
    }
  }, [position, rotation]);

  return null;
};

export default MovingCar;