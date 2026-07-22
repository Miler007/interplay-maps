'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function DraggableMarker({ lat, lng, onMove, markerRef }: {
  lat: number; lng: number;
  onMove: (lat: number, lng: number) => void;
  markerRef: React.MutableRefObject<any>;
}) {
  const map = useMap();
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    const marker = L.marker([lat, lng], {
      draggable: true,
      autoPan: true,
      autoPanSpeed: 20,
      zIndexOffset: 10000,
      icon: L.divIcon({
        className: '',
        html: '<div style="width:28px;height:28px;background:#a855f7;border-radius:50%;border:3px solid rgba(255,255,255,.95);box-shadow:0 2px 16px rgba(168,85,247,.6),0 0 0 4px rgba(168,85,247,.2);cursor:grab"></div><div style="width:2px;height:16px;background:rgba(168,85,247,.4);margin:0 auto"></div>',
        iconSize: [28, 46],
        iconAnchor: [14, 46],
      }),
    }).addTo(map);

    markerRef.current = marker;

    marker.on('dragend', (e: any) => {
      const p = e.target.getLatLng();
      const latVal = +p.lat.toFixed(5);
      const lngVal = +p.lng.toFixed(5);
      onMoveRef.current(latVal, lngVal);
    });

    return () => { marker.remove(); markerRef.current = null; };
  }, [map]);

  return null;
}
