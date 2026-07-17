'use client';

import { useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

type ReportType = 'infrastructure' | 'capacity' | 'topology' | 'inventory';
type ReportFormat = 'pdf' | 'excel';

interface Report {
  id: string;
  type: ReportType;
  format: ReportFormat;
  municipality: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  dataUrl: string;
  filename: string;
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'infrastructure', label: 'Infraestructura' },
  { value: 'capacity', label: 'Capacidad' },
  { value: 'topology', label: 'Topología' },
  { value: 'inventory', label: 'Inventario' },
];

const MOCK_MUNICIPALITIES = [
  { id: 'fresno', name: 'Fresno', department: 'Tolima' },
  { id: 'mariquita', name: 'Mariquita', department: 'Tolima' },
  { id: 'honda', name: 'Honda', department: 'Tolima' },
  { id: 'ibague', name: 'Ibagué', department: 'Tolima' },
  { id: 'libano', name: 'Líbano', department: 'Tolima' },
];

const MOCK_HISTORY: Report[] = [
  { id: 'rpt-1', type: 'infrastructure', format: 'pdf', municipality: 'Fresno', dateFrom: '2026-07-01', dateTo: '2026-07-16', generatedAt: '2026-07-16 10:30', dataUrl: '#', filename: 'reporte_infraestructura_fresno_20260716.pdf' },
  { id: 'rpt-2', type: 'capacity', format: 'excel', municipality: 'Mariquita', dateFrom: '2026-06-01', dateTo: '2026-07-15', generatedAt: '2026-07-15 14:00', dataUrl: '#', filename: 'reporte_capacidad_mariquita_20260715.xlsx' },
  { id: 'rpt-3', type: 'topology', format: 'pdf', municipality: 'Honda', dateFrom: '2026-07-01', dateTo: '2026-07-14', generatedAt: '2026-07-14 09:15', dataUrl: '#', filename: 'reporte_topologia_honda_20260714.pdf' },
  { id: 'rpt-4', type: 'inventory', format: 'excel', municipality: 'Fresno', dateFrom: '2026-07-01', dateTo: '2026-07-13', generatedAt: '2026-07-13 11:45', dataUrl: '#', filename: 'inventario_fresno_20260713.xlsx' },
  { id: 'rpt-5', type: 'infrastructure', format: 'pdf', municipality: 'Ibagué', dateFrom: '2026-06-15', dateTo: '2026-07-12', generatedAt: '2026-07-12 08:30', dataUrl: '#', filename: 'reporte_infraestructura_ibague_20260712.pdf' },
];

const TYPE_LABELS: Record<ReportType, string> = {
  infrastructure: 'Infraestructura',
  capacity: 'Capacidad',
  topology: 'Topología',
  inventory: 'Inventario',
};

const FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: 'PDF',
  excel: 'Excel',
};

function generateMockReportData(type: ReportType, municipality: string) {
  const rows: Record<string, any>[] = [];
  const count = type === 'inventory' ? 15 : 8;
  for (let i = 1; i <= count; i++) {
    rows.push({
      Código: `${type === 'inventory' ? 'CAJ' : type === 'capacity' ? 'MUF' : 'CTO'}-${String(i).padStart(3, '0')}`,
      Nombre: `${municipality} - ${type === 'inventory' ? 'Caja' : type === 'capacity' ? 'Mufla' : 'CTO'} ${String.fromCharCode(64 + i)}`,
      Tipo: type === 'inventory' ? 'CAJA' : type === 'capacity' ? 'MUFFLE' : 'CTO',
      Estado: ['ACTIVO', 'EN_CONSTRUCCION', 'ACTIVO', 'EN_MANTENIMIENTO', 'ACTIVO'][i % 5],
      Puertos: type === 'capacity' ? Math.floor(Math.random() * 16 + 4) : '-',
      Ocupación: type === 'capacity' ? `${Math.floor(Math.random() * 100)}%` : '-',
      Latitud: (5.15 + Math.random() * 0.04).toFixed(6),
      Longitud: (-75.04 + Math.random() * 0.03).toFixed(6),
    });
  }
  return rows;
}

function generateReportContent(type: ReportType, format: ReportFormat, municipality: string, dateFrom: string, dateTo: string): { dataUrl: string; filename: string } {
  const rows = generateMockReportData(type, municipality);
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeName = municipality.toLowerCase().replace(/\s+/g, '_');

  if (format === 'pdf') {
    const lines = [
      `======================================================================`,
      `  REPORTE DE ${TYPE_LABELS[type].toUpperCase()}`,
      `  Municipio: ${municipality}`,
      `  Período: ${dateFrom} — ${dateTo}`,
      `  Generado: ${new Date().toLocaleString('es-CO')}`,
      `======================================================================`,
      ``,
    ];
    rows.forEach((r, i) => {
      lines.push(`${String(i + 1).padStart(2, '0')}. ${r.Código} — ${r.Nombre}`);
      lines.push(`   Tipo: ${r.Tipo}  |  Estado: ${r.Estado}`);
      if (r.Puertos !== '-') lines.push(`   Puertos: ${r.Puertos}  |  Ocupación: ${r.Ocupación}`);
      lines.push(`   Coord: ${r.Latitud}, ${r.Longitud}`);
      lines.push('');
    });
    lines.push(`======================================================================`);
    lines.push(`  Total registros: ${rows.length}`);
    lines.push(`======================================================================`);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    return { dataUrl: URL.createObjectURL(blob), filename: `reporte_${type}_${safeName}_${ts}.txt` };
  } else {
    const headers = Object.keys(rows[0]);
    const csvLines = [headers.join(',')];
    rows.forEach((r) => {
      csvLines.push(headers.map((h) => `"${r[h]}"`).join(','));
    });
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    return { dataUrl: URL.createObjectURL(blob), filename: `reporte_${type}_${safeName}_${ts}.csv` };
  }
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('infrastructure');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [municipality, setMunicipality] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [preview, setPreview] = useState<{ rows: Record<string, any>[]; dataUrl: string; filename: string } | null>(null);
  const [history, setHistory] = useState<Report[]>(MOCK_HISTORY);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const validate = useCallback(() => {
    const errs: Partial<Record<string, string>> = {};
    if (!municipality) errs.municipality = 'Seleccione un municipio';
    if (!dateFrom) errs.dateFrom = 'Seleccione fecha inicial';
    if (!dateTo) errs.dateTo = 'Seleccione fecha final';
    if (dateFrom && dateTo && dateFrom > dateTo) errs.dateTo = 'Debe ser posterior a la fecha inicial';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [municipality, dateFrom, dateTo]);

  const handleGenerate = useCallback(() => {
    if (!validate()) return;
    const result = generateReportContent(reportType, format, MOCK_MUNICIPALITIES.find((m) => m.id === municipality)?.name || municipality, dateFrom, dateTo);
    const rows = generateMockReportData(reportType, MOCK_MUNICIPALITIES.find((m) => m.id === municipality)?.name || municipality);
    setPreview({ rows, dataUrl: result.dataUrl, filename: result.filename });

    const newReport: Report = {
      id: `rpt-${Date.now()}`,
      type: reportType,
      format,
      municipality: MOCK_MUNICIPALITIES.find((m) => m.id === municipality)?.name || municipality,
      dateFrom,
      dateTo,
      generatedAt: new Date().toLocaleString('es-CO', { hour12: false }),
      dataUrl: result.dataUrl,
      filename: result.filename,
    };
    setHistory((prev) => [newReport, ...prev]);
  }, [reportType, format, municipality, dateFrom, dateTo, validate]);

  const handleDownload = (report: Report) => {
    const a = document.createElement('a');
    a.href = report.dataUrl;
    a.download = report.filename;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
          <p className="text-slate-500 mt-1">Generación de reportes de infraestructura FTTH</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">Generar Reporte</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo de Reporte</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500 bg-white"
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Formato</label>
              <div className="flex gap-2">
                {(['pdf', 'excel'] as ReportFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      format === f
                        ? 'bg-interplay-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {FORMAT_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Municipio</label>
              <select
                value={municipality}
                onChange={(e) => { setMunicipality(e.target.value); setErrors((prev) => ({ ...prev, municipality: undefined })); }}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500 bg-white ${errors.municipality ? 'border-red-400' : 'border-slate-200'}`}
              >
                <option value="">Seleccionar...</option>
                {MOCK_MUNICIPALITIES.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.department})</option>
                ))}
              </select>
              {errors.municipality && <p className="text-xs text-red-500 mt-1">{errors.municipality}</p>}
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setErrors((prev) => ({ ...prev, dateFrom: undefined })); }}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500 ${errors.dateFrom ? 'border-red-400' : 'border-slate-200'}`}
                />
                {errors.dateFrom && <p className="text-xs text-red-500 mt-1">{errors.dateFrom}</p>}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setErrors((prev) => ({ ...prev, dateTo: undefined })); }}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-interplay-500 ${errors.dateTo ? 'border-red-400' : 'border-slate-200'}`}
                />
                {errors.dateTo && <p className="text-xs text-red-500 mt-1">{errors.dateTo}</p>}
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleGenerate}
              className="bg-interplay-600 hover:bg-interplay-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Generar Reporte
            </button>
          </div>
        </div>

        {preview && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Vista Previa</h2>
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = preview.dataUrl;
                  a.download = preview.filename;
                  a.click();
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Descargar {format === 'pdf' ? 'PDF' : 'Excel'}
              </button>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {Object.keys(preview.rows[0]).map((header) => (
                      <th key={header} className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 uppercase whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="px-3 py-2 text-slate-700 whitespace-nowrap">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Reportes Generados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-3 py-3 text-xs font-medium text-slate-500 uppercase">Fecha</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-slate-500 uppercase">Tipo</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-slate-500 uppercase">Formato</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-slate-500 uppercase">Municipio</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-400">No hay reportes generados</td></tr>
                ) : history.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{r.generatedAt}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-interplay-100 text-interplay-700 font-medium">
                        {TYPE_LABELS[r.type]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{FORMAT_LABELS[r.format]}</td>
                    <td className="px-3 py-3 text-slate-700">{r.municipality}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleDownload(r)}
                        className="text-interplay-600 hover:text-interplay-800 text-xs font-medium"
                      >
                        Descargar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
