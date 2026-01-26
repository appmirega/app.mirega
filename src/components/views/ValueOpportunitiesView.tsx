import React, { useEffect, useState } from 'react';
import { getKPISummary, getRecurrentElevators, getClientsAttention, KPISummary, RecurrentElevator, ClientAttention } from '../../lib/valueAnalyticsService';
import { Banknote, TrendingUp, AlertTriangle, Handshake, Loader2 } from 'lucide-react';

export default function ValueOpportunitiesView() {
  const [kpi, setKpi] = useState<KPISummary | null>(null);
  const [elevators, setElevators] = useState<RecurrentElevator[]>([]);
  const [clients, setClients] = useState<ClientAttention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const [k, e, c] = await Promise.all([
          getKPISummary(),
          getRecurrentElevators(),
          getClientsAttention(),
        ]);
        if (!mounted) return;
        setKpi(k);
        setElevators(e);
        setClients(c);
      } catch (err) {
        console.error('Value & Opportunities load error:', err);
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        setError(`No pudimos cargar Valor y Oportunidades. Detalle: ${msg}`);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Cargando Valor y Oportunidades...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-rose-600">{error}</p>
        <p className="text-xs text-slate-500">Revisa permisos y nombres de columnas en Supabase.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Análisis Estratégico</h1>
        <p className="text-slate-600">En simple: ¿Dónde estamos generando valor y dónde podemos reducir pérdidas por emergencias repetidas?</p>
      </div>

      {kpi && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border p-4 bg-emerald-50 border-emerald-200 text-emerald-800">
            <p className="text-sm font-semibold">Ingresos 90 días</p>
            <p className="text-2xl font-bold">${(kpi.revenue90 / 1000).toFixed(0)}k</p>
            <p className="text-xs">Órdenes completadas</p>
          </div>
          <div className="rounded-xl border p-4 bg-sky-50 border-sky-200 text-sky-800">
            <p className="text-sm font-semibold">Margen 90 días</p>
            <p className="text-2xl font-bold">${(kpi.profit90 / 1000).toFixed(0)}k</p>
            <p className="text-xs">Ingreso - costo</p>
          </div>
          <div className="rounded-xl border p-4 bg-indigo-50 border-indigo-200 text-indigo-800">
            <p className="text-sm font-semibold">Ingresos en progreso</p>
            <p className="text-2xl font-bold">${(kpi.inProgressRevenue / 1000).toFixed(0)}k</p>
            <p className="text-xs">Órdenes asignadas/en ejecución</p>
          </div>
          <div className="rounded-xl border p-4 bg-amber-50 border-amber-200 text-amber-800">
            <p className="text-sm font-semibold">Costo evitable 90 días</p>
            <p className="text-2xl font-bold">${(kpi.avoidableCost90 / 1000).toFixed(0)}k</p>
            <p className="text-xs">Por emergencias repetidas</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Equipos con emergencias repetidas</p>
              <p className="text-xs text-slate-500">Top 20 por costo en 90 días</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="space-y-2">
            {elevators.map((e) => (
              <div key={e.elevatorId} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{e.elevatorName}</p>
                  <p className="text-xs text-slate-500">{e.countEmergency90} emergencias • Sugerencia: {e.suggestion}</p>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <p className="font-semibold">Costo: ${(e.costEmergency90 / 1000).toFixed(0)}k</p>
                  <p>Ingreso: ${(e.revenueEmergency90 / 1000).toFixed(0)}k</p>
                </div>
              </div>
            ))}
            {elevators.length === 0 && <p className="text-sm text-slate-500">Sin emergencias repetidas en 90 días.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Clientes que requieren atención</p>
              <p className="text-xs text-slate-500">Top 20 por costo evitable</p>
            </div>
            <Handshake className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="space-y-2">
            {clients.map((c) => (
              <div key={c.clientId} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{c.clientName || c.clientId}</p>
                  <p className="text-xs text-slate-500">{c.elevatorsAffected} equipos • {c.repeatEmergencies} emergencias repetidas</p>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <p className="font-semibold">Evitable: ${(c.avoidableCost90 / 1000).toFixed(0)}k</p>
                  <p className="text-emerald-700">Acción: {c.callToAction}</p>
                </div>
              </div>
            ))}
            {clients.length === 0 && <p className="text-sm text-slate-500">Sin clientes con alta recurrencia en 90 días.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Banknote className="h-4 w-4 text-slate-600" />
          <p className="text-sm font-semibold text-slate-700">Cómo usar esta vista</p>
        </div>
        <ul className="list-disc pl-6 text-sm text-slate-700 space-y-1">
          <li>Primero, prioriza equipos con mayor costo por emergencias repetidas.</li>
          <li>Luego, agenda reuniones con clientes que concentran esas recurrencias.</li>
          <li>Presenta propuestas claras (Ahorro vs Costo) para reducir visitas repetidas.</li>
          <li>Haz seguimiento del impacto: ingresos realizados y reducción del costo evitable.</li>
        </ul>
      </div>
    </div>
  );
}
