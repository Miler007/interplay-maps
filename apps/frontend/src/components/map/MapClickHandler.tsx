'use client';

import { useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function MapClickHandler({ onAddMode, onMapClick, onContextMenu }: {
  onAddMode: boolean;
  onMapClick: (latlng: { lat: number; lng: number }) => void;
  onContextMenu?: (latlng: { lat: number; lng: number }, e: MouseEvent) => void;
}) {
  const map = useMap();
  const onAddModeRef = useRef(onAddMode);
  const onMapClickRef = useRef(onMapClick);
  const onContextMenuRef = useRef(onContextMenu);
  onAddModeRef.current = onAddMode;
  onMapClickRef.current = onMapClick;
  onContextMenuRef.current = onContextMenu;

  useEffect(() => {
    const clickHandler = (e: any) => {
      if (onAddModeRef.current) {
        onMapClickRef.current({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) });
      }
    };
    const ctxHandler = (e: any) => {
      e.originalEvent.preventDefault();
      onContextMenuRef.current?.({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) }, e.originalEvent);
    };
    map.on('click', clickHandler);
    map.on('contextmenu', ctxHandler);
    return () => {
      map.off('click', clickHandler);
      map.off('contextmenu', ctxHandler);
    };
  }, [map]);

  return null;
}
