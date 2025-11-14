import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

type CertificationFormProps = {
  classification?: string | null; // ascensor_residencial, ascensor_corporativo, etc.
  onSubmit: (data: {
    lastCertificationDate: string | null;
    nextCertificationDate: string | null;
    certificationNotLegible: boolean;
  }) => void | Promise<void>;
  onCancel: () => void;
};

export function CertificationForm({
  classification,
  onSubmit,
  onCancel,
}: CertificationFormProps) {
  const [lastCertificationDate, setLastCertificationDate] = useState<string>('');
  const [nextCertificationDate, setNextCertificationDate] = useState<string>('');
  const [certificationNotLegible, setCertificationNotLegible] = useState(false);

  // 1) Años que dura la certificación según ley
  const validityYears = useMemo(() => {
    if (!classification) return 1;

    const lowered = classification.toLowerCase();
    if (lowered.includes('residencial')) return 2; // ascensor_residencial
    // el resto (corporativo, montacargas, montaplatos, etc.) = 1 año
    return 1;
  }, [classification]);

  // 2) Calcular próxima certificación cuando cambia la fecha
  useEffect(() => {
    if (!lastCertificationDate || certificationNotLegible) {
      setNextCertificationDate('');
      return;
    }

    const base = new Date(lastCertificationDate);
    if (Number.isNaN(base.getTime())) {
      setNextCertificationDate('');
      return;
    }

    const next = new Date(base);
    next.setFullYear(next.getFullYear() + validityYears);

    // formato ISO yyyy-mm-dd para <input type="date">
    const iso = next.toISOString().substring(0, 10);
    setNextCertificationDate(iso);
  }, [lastCertificationDate, certificationNotLegible, validityYears]);

  // 3) Cálculo de días restantes
  const daysInfo = useMemo(() => {
    if (!nextCertificationDate || certificationNotLegible) {
      return { label: 'Pendiente', days: null, variant: 'warning' as const };
    }

    const today = new Date();
    const next = new Date(nextCertificationDate);

    // normalizar a medianoche para no tener off-by-one
    today.setHours(0, 0, 0, 0);
    next.setHours(0, 0, 0, 0);

    const diffMs = next.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: 'Vencida',
        days: Math.abs(diffDays),
        variant: 'danger' as const,
      };
    }

    if (diffDays <= 120) {
      // zona de alertas 120 / 90 / 30 días
      return {
        label: 'Próxima a vencer',
        days: diffDays,
        variant: 'warning' as const,
      };
    }

    return {
      label: 'Vigente',
      days: diffDays,
      variant: 'success' as const,
    };
  }, [nextCertificationDate, certificationNotLegible]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // si es no legible, guardamos null en las fechas
    const payload = {
      lastCertificationDate:
        certificationNotLegible || !lastCertificationDate
          ? null
          : lastCertificationDate,
      nextCertificationDate:
        certificationNotLegible || !nextCertificationDate
          ? null
          : nextCertificationDate,
      certificationNotLegible,
    };

    // protegemos la llamada por si en algún momento onSubmit no viene
    if (typeof onSubmit === 'function') {
      onSubmit(payload);
    }
  };

  const statusColorClasses =
    daysInfo.variant === 'success'
      ? 'bg-green-50 border-green-200 text-green-800'
      : daysInfo.variant === 'warning'
      ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
      : 'bg-red-50 border-red-200 text-red-800';

  const StatusIcon =
    daysInfo.variant === 'success' ? CheckCircle2 : AlertCircle;

  const humanValidityText =
    validityYears === 2
      ? 'Las certificaciones para ascensores residenciales se renuevan cada 2 años desde la última.'
      : 'Las certificaciones para este tipo de ascensor se renuevan anualmente (1 año desde la última).';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Fecha última certificación */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Fecha de Última Certificación
        </label>
        <input
          type="date"
          value={lastCertificationDate}
          onChange={(e) => setLastCertificationDate(e.target.value)}
          disabled={certificationNotLegible}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
        />
        <p className="mt-1 text-xs text-slate-500">
          Fecha que aparece en la placa de certificación del ascensor
        </p>
      </div>

      {/* Próxima certificación (solo lectura) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Próxima Certificación (Calculada Automáticamente)
        </label>
        <input
          type="date"
          value={nextCertificationDate}
          readOnly
          disabled
          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
        />
        <p className="mt-1 text-xs text-slate-500">{humanValidityText}</p>
      </div>

      {/* Estado / días restantes */}
      <div
        className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${statusColorClasses}`}
      >
        <StatusIcon className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-semibold">
            {daysInfo.label}
            {daysInfo.days !== null && daysInfo.days >= 0 && ' '}
          </p>
          {daysInfo.days !== null && daysInfo.days >= 0 && (
            <p className="text-sm">
              Vence en <strong>{daysInfo.days}</strong> días
            </p>
          )}
          {daysInfo.variant === 'warning' && (
            <p className="text-xs mt-1">
              Se generarán alertas de seguimiento a 120, 90 y 30 días del
              vencimiento.
            </p>
          )}
          {daysInfo.variant === 'danger' && (
            <p className="text-xs mt-1">
              Este ascensor tiene la certificación vencida. Debe
              regularizarse a la brevedad.
            </p>
          )}
        </div>
      </div>

      {/* Checkbox: placa no legible */}
      <div className="flex items-start gap-2">
        <input
          id="cert-not-legible"
          type="checkbox"
          checked={certificationNotLegible}
          onChange={(e) => setCertificationNotLegible(e.target.checked)}
          className="mt-1 h-4 w-4 text-blue-600 border-slate-300 rounded"
        />
        <label
          htmlFor="cert-not-legible"
          className="text-sm text-slate-700 cursor-pointer"
        >
          Certificación no legible o no disponible
          <span className="block text-xs text-slate-500">
            Si la placa no es legible, marca esta opción y podrás actualizar
            la información más adelante.
          </span>
        </label>
      </div>

      {/* Información importante */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h3 className="font-semibold text-slate-900 mb-2">
          Información Importante
        </h3>
        <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
          <li>
            La certificación debe renovarse según la normativa vigente para el
            tipo de ascensor.
          </li>
          <li>
            Recibirás alertas 120, 90 y 30 días antes del vencimiento usando la
            fecha de la próxima certificación.
          </li>
          <li>
            Si la placa no es legible, marca la opción correspondiente para
            actualizarla después.
          </li>
        </ul>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          Continuar
        </button>
      </div>
    </form>
  );
}
