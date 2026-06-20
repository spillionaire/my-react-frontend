import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { getSouthAfricaBounds } from '../utils/pricing';

const SA_BOUNDS = getSouthAfricaBounds();

const VaiMap = ({ 
  children, 
  center, 
  zoom = 13, 
  style = { height: '100%', width: '100%' },
  onReady 
}) => {
  const [tileLoading, setTileLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={zoom}
        style={style}
        minZoom={5}
        maxBounds={[
          [SA_BOUNDS.sw.lat, SA_BOUNDS.sw.lng],
          [SA_BOUNDS.ne.lat, SA_BOUNDS.ne.lng]
        ]}
        maxBoundsViscosity={1.0}
        whenReady={() => {
          setMapLoaded(true);
          setTileLoading(false);
          if (onReady) onReady();
        }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; CartoDB'
          maxZoom={19}
          eventHandlers={{
            loading: () => setTileLoading(true),
            load: () => setTileLoading(false),
            error: () => {
              setTileLoading(false);
              console.log('Map tile error, using fallback');
            }
          }}
        />
        {children}
      </MapContainer>
      
      {tileLoading && (
        <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mb-3"></div>
          <p className="text-gray-400 text-sm">Loading map...</p>
        </div>
      )}
    </div>
  );
};

export default VaiMap;