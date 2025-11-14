import { useEffect, useState } from 'react';

interface CertificationFormProps {
  elevatorClassification?: string | null;
  onSubmit: (data: {
    lastCertificationDate: string | null;
    nextCertificationDate: string | null;
    certificationNotLegible: boolean;
  }) => void;
  onCancel: () => void;
}

type Status = 'sin_fecha' | 'vigente' | 'por_vencer' | 'vencida';

export function CertificationForm({
  elevatorClassification,
  onSubmit,
  onCancel,
}: CertificationFormProps) {
  const [lastCertificationDate, setLastCertificationDate] = useState('');
  const [nextCertificationDate, setNextCertificationDate] = useState('');
  const [certificationNotLegible, setCertificationNotLegible] = useState(false);

  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('sin_fecha');

  // Etiqueta amigable de la clasificación
  const getClassificationLabel = () => {
    switch (elevatorClassification) {
      case 'ascensor_residencial':
        return 'Ascensor residencial (uso habitacional)';
      case 'ascensor_corporativo':
        return 'Ascensor corporativo / oficinas';
      case 'montacargas':
        return 'Montacargas';
      case 'montaplatos':
        return 'Montaplatos';
      default:
        return 'No definido';
    }
  };

  // Cálculo de días restantes sólo en base a la próxima certificación
  useEffect(() => {
    if (certificationNotLegible || !nextCertificationDate) {
      setDaysRemaining(null);
      setStatus('sin_fecha');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const next = new Date(nextCertificationDate);
    next.setHours(0, 0, 0, 0);

    const diffMs = next.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    setDaysRemaining(diffDays);

    if (diffDays < 0) {
      setStatus('vencida');
    } else if (diffDays <= 30) {
      setStatus('por_vencer');
    } else {
      setStatus('vigente');
    }
  }, [nextCertificationDate, certificationNotLegible]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

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
        : lastCertificationDate || null,
      nextCertificationDate: certificationNotLegible
        ? null
        : nextCertificationDate || null,
      certificationNotLegible,
    });
  };

  const renderStatusCard = () => {
    if (certificationNotLegible || !nextCertificationDate || daysRemaining === null) {
      return (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Ingresa la fecha de la próxima certificación para calcular cuántos días
          faltan para el vencimiento.
        </div>
      );
    }

    if (status === 'vencida') {
      const daysAgo = Math.abs(daysRemaining);
      return (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Certificación vencida</p>
          <p className="text-sm text-red-700">
            Venció hace {daysAgo} día{daysAgo === 1 ? '' : 's'}.
          </p>
        </div>
      );
    }

    if (status === 'por_vencer') {
      return (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-yellow-800">Por vencer</p>
          <p className="text-sm text-yellow-700">
            Vence en {daysRemaining} día{daysRemaining === 1 ? '' : 's'}.
          </p>
        </div>
      );
    }

    // vigente
    return (
      <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-semibold text-green-800">Certificación vigente</p>
        <p className="text-sm text-green-700">
          Vence en {daysRemaining} día{daysRemaining === 1 ? '' : 's'}.
        </p>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      {/* Clasificación detectada (solo informativa) */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
        <span className="font-semibold">Clasificación detectada: </span>
        <span>{getClassificationLabel()}</span>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Última certificación vigente */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Última certificación vigente
          </label>
          <input
            type="date"
            value={lastCertificationDate}
            onChange={(e) => setLastCertificationDate(e.target.value)}
            disabled={certificationNotLegible}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Fecha que aparece en el certificado actual. Si el certificado no está
            disponible o no es legible, marca la opción de abajo.
          </p>
        </div>

        {/* Próxima certificación (ingreso manual) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Próxima certificación
          </label>
          <input
            type="date"
            value={nextCertificationDate}
            onChange={(e) => setNextCertificationDate(e.target.value)}
            disabled={certificationNotLegible}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Fecha de la próxima certificación según el certificado o la resolución
            vigente del edificio. Si aún no está definida, acordar con el
            administrador y registrarla aquí.
          </p>

          {/* Estado / días restantes */}
          {renderStatusCard()}
        </div>
      </div>

      {/* Checkbox certificado no legible */}
      <div className="pt-2 border-t border-slate-200">
        <label className="inline-flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={certificationNotLegible}
            onChange={(e) => setCertificationNotLegible(e.target.checked)}
            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            El certificado de inspección periódica no es legible / no está
            disponible en terreno.
          </span>
        </label>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Volver
        </button>
        <button
          type="submit"
          className="px-5 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Continuar al checklist
        </button>
      </div>
    </form>
  );
}


