'use client';

import { useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function MapClickHandler({ onAddMode, onMapClick, onEditAsset }: {
  onAddMode: boolean;
  onMapClick: (latlng: { lat: number; lng: number }) => void;
  onEditAsset: (asset: { id: string; code: string; name: string; type: string; lat: number; lng: number }) => void;
}) {
  const map = useMap();
  const onAddModeRef = useRef(onAddMode);
  const onMapClickRef = useRef(onMapClick);
  const onEditAssetRef = useRef(onEditAsset);
  onAddModeRef.current = onAddMode;
  onMapClickRef.current = onMapClick;
  onEditAssetRef.current = onEditAsset;

  useEffect(() => {
    const clickHandler = (e: any) => {
      if (onAddModeRef.current) {
        onMapClickRef.current({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) });
      }
    };
    map.on('click', clickHandler);

    const popupHandler = (e: any) => {
      const popupEl = e.popup.getElement();
      if (!popupEl) return;
      const btn = popupEl.querySelector('.edit-asset-btn') as HTMLElement;
      if (!btn) return;
      btn.onclick = () => {
        onEditAssetRef.current({
          id: btn.dataset.id || '',
          code: btn.dataset.code || '',
          name: btn.dataset.name || '',
          type: btn.dataset.type || '',
          lat: parseFloat(btn.dataset.lat || '0'),
          lng: parseFloat(btn.dataset.lng || '0'),
        });
        map.closePopup();
      };
    };
    map.on('popupopen', popupHandler);

    return () => {
      map.off('click', clickHandler);
      map.off('popupopen', popupHandler);
    };
  }, [map]);

  return null;
}
