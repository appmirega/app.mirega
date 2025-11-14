import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, Info } from 'lucide-react';

interface CertificationFormProps {
  onSubmit: (data: {
    lastCertificationDate: string | null;
    nextCertificationDate: string | null;
    certificationNotLegible: boolean;
  }) => void;
  onCancel: () => void;
  /**
   * Clasificación del ascensor que viene desde la tabla `elevators`.
   * Ejemplos esperados:
   *  - "ascensor_residencial"
   *  - "ascensor_corporativo"
   *  - "montacargas"
   *  - "montaplatos"
   */
  elevatorClassification?: string | null;
}

// Normaliza la clasificación a minúsculas y sin espacios extras
function normalizeClassification(raw?: string | null): string {
  if (!raw) return '';
  return raw.toString().trim().toLowerCase();
}

/**
 * Devuelve los años de vigencia sugeridos según la clasificación:
 *  - Residencial: 2 años
 *  - Otros usos (corporativo, montacargas, montaplatos, etc.): 1 año
 *
 * Esta lógica sigue el criterio general usado en Chile:
 *  - Uso habitacional/residencial → plazo mayor (2 años en condiciones normales)
 *  - Otros destinos → 1 año
 */
function getSuggestedYears(classification?: string | null): number {
  const norm = normalizeClassification(classification);

  // Cualquier cosa que contenga "residencial" lo tratamos como uso residencial
  if (norm.includes('residencial')) {
    return 2;
  }

  // Por defecto: 1 año
  return 1;
}

/**
 * Suma N años a una fecha (YYYY-MM-DD) y devuelve también YYYY-MM-DD.
 * Si la fecha es inválida, devolvemos string vacío.
 */
function addYears(dateStr: string, years: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  d.setFullYear(d.getFullYear() + years);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CertificationForm({
  onSubmit,
  onCancel,
  elevatorClassification,
}: CertificationFormProps) {
  const [lastCertificationDate, setLastCertificationDate] = useState('');
  const [nextCertificationDate, setNextCertificationDate] = useState('');
  const [certificationNotLegible, setCertificationNotLegible] = useState(false);
  const [hasEditedNextDate, setHasEditedNextDate] = useState(false);

  const suggestedYears = getSuggestedYears(elevatorClassification);
  const isResidential = suggestedYears === 2;

  // Cada vez que cambia la fecha de última certificación *y*
  // el usuario aún NO ha editado manualmente la próxima,
  // calculamos una sugerencia automática.
  useEffect(() => {
    if (
      !certificationNotLegible &&
      lastCertificationDate &&
      !hasEditedNextDate
    ) {
      const suggested = addYears(lastCertificationDate, suggestedYears);
      setNextCertificationDate(suggested);
    }
  }, [lastCertificationDate, certificationNotLegible, hasEditedNextDate, suggestedYears]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validación manual: o hay fecha, o se marca como no legible.
    if (!certificationNotLegible && !lastCertificationDate) {
      alert(
        'Debes ingresar la fecha de última certificación o marcar que el certificado no es legible / no está disponible.'
      );
      return;
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

  const handleChangeLastDate = (value: string) => {
    setLastCertificationDate(value);
    // Si el usuario ya editó la próxima fecha, NO la tocamos.
    // Si no la ha editado, useEffect calculará el valor sugerido.
  };

  const handleChangeNextDate = (value: string) => {
    setNextCertificationDate(value);
    setHasEditedNextDate(true);
  };

  const handleToggleNotLegible = (checked: boolean) => {
    setCertificationNotLegible(checked);
    if (checked) {
      // Si no hay certificado legible, limpiamos fechas
      setLastCertificationDate('');
      setNextCertificationDate('');
      setHasEditedNextDate(false);
    }
  };

  const classificationLabel = (() => {
    const norm = normalizeClassification(elevatorClassification);
    if (!norm) return 'No definido (se asume 1 año de vigencia)';

    if (norm.includes('residencial')) return 'Ascensor Residencial (2 años sugeridos)';
    if (norm.includes('corporativo')) return 'Ascensor Corporativo (1 año sugerido)';
    if (norm.includes('montacargas')) return 'Montacargas (1 año sugerido)';
    if (norm.includes('montaplatos')) return 'Montaplatos (1 año sugerido)';

    return `${elevatorClassification} (1 año sugerido)`;
  })();

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6"
    >
      {/* Info general de la lógica de certificación */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="text-sm text-slate-700">
          <p className="font-semibold mb-1">Vigencia de la certificación</p>
          <p className="mb-1">
            Según el criterio general usado en Chile, los ascensores de uso
            <span className="font-semibold"> residencial</span> suelen tener certificaciones
            con vigencia de <span className="font-semibold">hasta 2 años</span>, mientras que
            los ascensores de uso <span className="font-semibold">no residencial</span> 
            (corporativos, montacargas, montaplatos, etc.) tienen vigencia de
            <span className="font-semibold"> 1 año</span>, siempre que no existan
            observaciones o anomalías.
          </p>
          <p className="text-xs text-slate-500">
            El sistema te sugiere la próxima fecha de certificación según la
            clasificación del ascensor, pero siempre puedes ajustarla manualmente
            de acuerdo con la resolución específica del edificio o del MINVU/SEREMI.
          </p>
        </div>
      </div>

      {/* Clasificación detectada */}
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
        <p className="text-blue-900">
          <span className="font-semibold">Clasificación detectada:</span>{' '}
          {classificationLabel}
        </p>
      </div>

      {/* Campos de fechas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Última certificación */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Última certificación vigente
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={lastCertificationDate}
              onChange={(e) => handleChangeLastDate(e.target.value)}
              disabled={certificationNotLegible}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fecha que aparece en el certificado actual. Si el certificado no está disponible o
            no es legible, marca la opción de abajo.
          </p>
        </div>

        {/* Próxima certificación */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Próxima certificación
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={nextCertificationDate}
              onChange={(e) => handleChangeNextDate(e.target.value)}
              disabled={certificationNotLegible}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            El sistema sugiere{' '}
            <span className="font-semibold">
              {suggestedYears} año(s)
            </span>{' '}
            desde la última certificación ({isResidential ? 'uso residencial' : 'uso no residencial'}).
            Puedes ajustar esta fecha según la resolución del edificio (por ejemplo,
            mes fijo asignado por dirección).
          </p>
        </div>
      </div>

      {/* No legible */}
      <div className="flex items-start gap-2 mt-1">
        <input
          id="cert-not-legible"
          type="checkbox"
          className="mt-1"
          checked={certificationNotLegible}
          onChange={(e) => handleToggleNotLegible(e.target.checked)}
        />
        <label
          htmlFor="cert-not-legible"
          className="text-sm text-slate-700"
        >
          El certificado de inspección periódica no es legible / no está disponible
          en terreno.
        </label>
      </div>

      {/* Aviso si falta info */}
      {!certificationNotLegible && !lastCertificationDate && (
        <div className="mt-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 flex items-start gap-2 text-xs text-yellow-800">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <p>
            Para continuar debes ingresar la fecha de la última certificación vigente
            o marcar que el certificado no es legible / no está disponible.
          </p>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          Volver
        </button>
        <button
          type="submit"
          className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
        >
          Continuar al checklist
        </button>
      </div>
    </form>
  );
}

