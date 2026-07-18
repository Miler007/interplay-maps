'use client';

import dynamic from 'next/dynamic';
import Sidebar from '@/components/layout/Sidebar';

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

export default function MapPage() {
  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <MapView />
      </main>
    </div>
  );
}
