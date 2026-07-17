'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

export default function MapPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mapa de Infraestructura</h1>
          <p className="text-slate-500 mt-1">Visualización de activos FTTH</p>
        </div>
        <MapView />
      </div>
    </DashboardLayout>
  );
}
