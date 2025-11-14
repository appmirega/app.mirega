import { useState, useEffect } from 'react';
import { Calendar, Info, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CertificationFormProps {
  elevatorClassification: string | null;
  onSubmit: (data: {
    lastCertificationDate: string | null;
    nextCertificationDate: string | null;
    certificationNotLegible: boolean;
  }) => void;
  onCancel: () => void;
}

export function CertificationForm({
  elevatorClassification,
  onSubmit,
  onCancel,
}: CertificationFormProps) {
  const [lastCertificationDate, setLastCertificationDate] = useState<string>('');
  const [nextCertificationDate, setNextCertificationDate] = useState<string>('');
  const [certificationNotLegible, setCertificationNotLegible] =
    useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  // Calcula días restantes hasta la próxima certificación
  useEffect(() => {
    if (!nextCertificationDate) {
      setDaysRemaining(null);
      return;
    }

    const today = new Date();
    const next = new Date(nextCertificationDate);

    // Normalizamos a medianoche para evitar diferencias por timezone
    today.setHours(0, 0, 0, 0);
    next.setHours(0, 0, 0, 0);

    const diffMs = next.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    setDaysRemaining(diffDays);
  }, [nextCertificationDate]);

  const classificationLabel = (() => {
    if (!elevatorClassification) return 'No definido';
    switch (elevatorClassification) {
      case 'ascensor_residencial':
        return 'Ascensor residencial';
      case 'ascensor_corporativo':
        return 'Ascensor corporativo';
      case 'montacargas':
        return 'Montacargas';
      case 'montaplatos':
        return 'Montaplatos';
      default:
        return elevatorClassification;
    }
  })();

  const handleContinueClick = () => {
    if (!certificationNotLegible) {
      if (!lastCertificationDate || !nextCertificationDate) {
        alert(
          'Debes ingresar la fecha de la última certificación y la próxima certificación, o marcar que el certificado no es legible.'
        );
        return;
      }
    }

    onSubmit({
      lastCertificationDate: certificationNotLegible
        ? null
        : lastCertificationDate,
      nextCertificationDate: certificationNotLegible
        ? null
        : nextCertificationDate,
      certificationNotLegible,
    });
  };

  const renderStatusBadge = () => {
    if (!nextCertificationDate || daysRemaining === null) return null;

    if (daysRemaining < 0) {
      return (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">Certificación vencida</p>
            <p>Venció hace {Math.abs(daysRemaining)} día(s).</p>
          </div>
        </div>
      );
    }

    if (daysRemaining <= 60) {
      return (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">Próximo a vencer</p>
            <p>Vence en {daysRemaining} día(s).</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        <div>
          <p className="font-semibold">Vigente</p>
          <p>Vence en {daysRemaining} día(s).</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Clasificación detectada (solo informativo) */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 flex items-center gap-2">
        <Info className="h-4 w-4 text-slate-500" />
        <div>
          <span className="font-semibold">Clasificación detectada: </span>
          <span>{classificationLabel}</span>
          <p className="text-xs text-slate-500 mt-1">
            Esta clasificación es solo referencial. La vigencia real de la
            certificación depende de la resolución del edificio y de la
            autoridad competente.
          </p>
        </div>
      </div>

      {/* Fechas de certificación */}
      <div className="grid gap-6 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-2">
        {/* Última certificación vigente */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-800">
            Última certificación vigente
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Calendar className="h-4 w-4" />
            </span>
            <input
              type="date"
              value={lastCertificationDate}
              onChange={(e) => setLastCertificationDate(e.target.value)}
              disabled={certificationNotLegible}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Fecha que aparece en el certificado actual. Si el certificado no
            está disponible o no es legible, marca la opción de abajo.
          </p>
        </div>

        {/* Próxima certificación */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-800">
            Próxima certificación
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Calendar className="h-4 w-4" />
            </span>
            <input
              type="date"
              value={nextCertificationDate}
              onChange={(e) => setNextCertificationDate(e.target.value)}
              disabled={certificationNotLegible}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Ingresa la fecha de vencimiento indicada en el certificado o en la
            resolución del edificio (mes y año asignados por dirección).
          </p>
        </div>

        {/* Estado de vigencia basado en próxima certificación */}
        <div className="md:col-span-2">{renderStatusBadge()}</div>

        {/* Certificado no legible */}
        <div className="md:col-span-2 mt-2">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={certificationNotLegible}
              onChange={(e) => {
                setCertificationNotLegible(e.target.checked);
                if (e.target.checked) {
                  // opcional: mantener los valores pero deshabilitados
                  // o podríamos limpiarlos si prefieres:
                  // setLastCertificationDate('');
                  // setNextCertificationDate('');
                }
              }}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              El certificado de inspección periódica no es legible / no está
              disponible en terreno.
            </span>
          </label>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={handleContinueClick}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Continuar al checklist
        </button>
      </div>
    </div>
  );
}


