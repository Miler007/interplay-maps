'use client';

import { useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function MapClickHandler({ onAddMode, onMapClick, onContextMenu, onMouseMove, onZoomChange }: {
  onAddMode: boolean;
  onMapClick: (latlng: { lat: number; lng: number }) => void;
  onContextMenu?: (latlng: { lat: number; lng: number }, e: MouseEvent) => void;
  onMouseMove?: (latlng: { lat: number; lng: number }) => void;
  onZoomChange?: (zoom: number) => void;
}) {
  const map = useMap();
  const propsRef = useRef({ onAddMode, onMapClick, onContextMenu, onMouseMove, onZoomChange });
  propsRef.current = { onAddMode, onMapClick, onContextMenu, onMouseMove, onZoomChange };

  useEffect(() => {
    const clickHandler = (e: any) => {
      if (propsRef.current.onAddMode) {
        propsRef.current.onMapClick({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) });
      }
    };
    const ctxHandler = (e: any) => {
      e.originalEvent.preventDefault();
      propsRef.current.onContextMenu?.({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) }, e.originalEvent);
    };
    const moveHandler = (e: any) => {
      propsRef.current.onMouseMove?.({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) });
    };
    const zoomHandler = () => {
      propsRef.current.onZoomChange?.(map.getZoom());
    };
    map.on('click', clickHandler);
    map.on('contextmenu', ctxHandler);
    map.on('mousemove', moveHandler);
    map.on('zoomend', zoomHandler);
    return () => {
      map.off('click', clickHandler);
      map.off('contextmenu', ctxHandler);
      map.off('mousemove', moveHandler);
      map.off('zoomend', zoomHandler);
    };
  }, [map]);

  return null;
}
