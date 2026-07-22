'use client';

import { useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function MapClickHandler({ onAddMode, onMapClick }: {
  onAddMode: boolean;
  onMapClick: (latlng: { lat: number; lng: number }) => void;
}) {
  const map = useMap();
  const onAddModeRef = useRef(onAddMode);
  const onMapClickRef = useRef(onMapClick);
  onAddModeRef.current = onAddMode;
  onMapClickRef.current = onMapClick;

  useEffect(() => {
    const handler = (e: any) => {
      if (onAddModeRef.current) {
        onMapClickRef.current({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) });
      }
    };
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [map]);

  return null;
}
