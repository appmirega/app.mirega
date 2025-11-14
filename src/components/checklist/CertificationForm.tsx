import { useEffect, useMemo, useState, FormEvent } from 'react';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  onSubmit: (data: {
    lastCertificationDate: string | null;
    nextCertificationDate: string | null;
    certificationNotLegible: boolean;
  }) => void;
  onCancel: () => void;

  /**
   * Clasificación interna del ascensor según tu BD:
   *  - 'ascensor_residencial'
   *  - 'ascensor_corporativo'
   *  - 'montacargas'
   *  - 'montaplatos'
   *  - etc.
   *
   * Soportamos ambos nombres por si el padre usa uno u otro.
   */
  classification?: string | null;
  elevatorClassification?: string | null;
}

// Devuelve la cantidad de años de vigencia según la clasificación
function getFrequencyYears(classification: string | null | undefined): number {
  if (!classification) return 1;

  // Según MINVU: edificios con destino vivienda → 2 años
  // Otros destinos → 1 o 2 años según capacidad.
  // Aquí aplicamos la regla base: residencial = 2, resto = 1.
  if (classification === 'ascensor_residencial') {
    return 2;
  }

  return 1;
}

export function CertificationForm({
  onSubmit,
  onCancel,
  classification,
  elevatorClassification,
}: Props) {
  const effectiveClassification = useMemo(
    () => classification ?? elevatorClassification ?? null,
    [classification, elevatorClassification]
  );

  const [lastDate, setLastDate] = useState<string>('');
  const [nextDate, setNextDate] = useState<string>('');
  const [notLegible, setNotLegible] = useState<boolean>(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  const frequencyYears = getFrequencyYears(effectiveClassification);

  // Calcula próxima certificación y días restantes
  useEffect(() => {
    if (!lastDate || notLegible) {
      setNextDate('');
      setDaysLeft(null);
      return;
    }

    const last = new Date(lastDate);
    if (isNaN(last.getTime())) {
      setNextDate('');
      setDaysLeft(null);
      return;
    }

    const next = new Date(last);
    next.setFullYear(next.getFullYear() + frequencyYears);

    const iso = next.toISOString().slice(0, 10); // YYYY-MM-DD
    setNextDate(iso);

    const today = new Date();
    const diffMs = next.getTime() - today.setHours(0, 0, 0, 0);
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    setDaysLeft(diffDays);
  }, [lastDate, notLegible, frequencyYears]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Si la placa es legible, exigimos una fecha
    if (!notLegible && !lastDate) {
      alert('Debes ingresar la fecha de la última certificación o marcar como no legible.');
      return;
    }

    onSubmit({
      lastCertificationDate: notLegible ? null : lastDate,
      nextCertificationDate: notLegible ? null : nextDate || null,
      certificationNotLegible: notLegible,
    });
  };

  const statusLabel = useMemo(() => {
    if (notLegible || daysLeft === null) return null;
    if (daysLeft < 0) return 'Vencida';
    if (daysLeft <= 90) return 'Por vencer';
    return 'Vigente';
  }, [daysLeft, notLegible]);

  const statusColorClasses = useMemo(() => {
    if (notLegible || daysLeft === null) return '';
    if (daysLeft < 0) return 'bg-red-50 text-red-800 border-red-200';
    if (daysLeft <= 90) return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    return 'bg-green-50 text-green-800 border-green-200';
  }, [daysLeft, notLegible]);

  const statusIconColorClasses = useMemo(() => {
    if (notLegible || daysLeft === null) return 'text-slate-400';
    if (daysLeft < 0) return 'text-red-500';
    if (daysLeft <= 90) return 'text-yellow-500';
    return 'text-green-500';
  }, [daysLeft, notLegible]);

  const frequencyText =
    frequencyYears === 2
      ? 'Las certificaciones para este tipo de ascensor se renuevan cada 2 años (destino vivienda).'
      : 'Las certificaciones para este tipo de ascensor se renuevan anualmente (1 año desde la última).';

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Fecha última certificación */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Fecha de Última Certificación
        </label>
        <div className="relative">
          <input
            type="date"
            value={lastDate}
            onChange={(e) => setLastDate(e.target.value)}
            disabled={notLegible}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
          />
          <Calendar className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Fecha que aparece en la placa de certificación del ascensor.
        </p>
      </div>

      {/* Próxima certificación (solo lectura) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Próxima Certificación (Calculada Automáticamente)
        </label>
        <input
          type="text"
          value={nextDate ? nextDate.split('-').reverse().join('-') : ''}
          readOnly
          disabled
          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
        />
        <p className="mt-1 text-xs text-slate-500">{frequencyText}</p>
      </div>

      {/* Estado de vigencia */}
      {!notLegible && statusLabel && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${statusColorClasses}`}
        >
          <CheckCircle className={`w-5 h-5 ${statusIconColorClasses}`} />
          <div>
            <p className="font-semibold text-sm">{statusLabel}</p>
            {daysLeft !== null && daysLeft >= 0 && (
              <p className="text-xs">
                Vence en <span className="font-semibold">{daysLeft}</span> día
                {daysLeft === 1 ? '' : 's'}.
              </p>
            )}
            {daysLeft !== null && daysLeft < 0 && (
              <p className="text-xs">
                Venció hace <span className="font-semibold">{Math.abs(daysLeft)}</span> día
                {Math.abs(daysLeft) === 1 ? '' : 's'}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Check de placa no legible */}
      <div className="flex items-start gap-3">
        <input
          id="not-legible"
          type="checkbox"
          checked={notLegible}
          onChange={(e) => setNotLegible(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <label htmlFor="not-legible" className="text-sm font-medium text-slate-800">
            Certificación no legible o no disponible
          </label>
          <p className="text-xs text-slate-500">
            Si la placa no es legible, marca esta opción y podrás actualizar la información
            más adelante. El sistema registrará que se debe regularizar la certificación.
          </p>
        </div>
      </div>

      {/* Información importante */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 mt-1" />
        <div className="space-y-1 text-sm text-blue-900">
          <p className="font-semibold">Información Importante</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              La certificación debe renovarse según la normativa vigente para el tipo de
              ascensor (vivienda: cada 2 años; otros destinos: al menos cada 1 año).
            </li>
            <li>
              El sistema generará alertas considerando la fecha de la próxima certificación
              (120, 90 y 30 días antes del vencimiento).
            </li>
            <li>
              Si la placa no es legible, marca la opción correspondiente para actualizarla
              después con el certificado emitido por el organismo competente.
            </li>
          </ul>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={!notLegible && !lastDate}
        >
          Continuar
        </button>
      </div>
    </form>
  );
}

