import { FC } from "react";

export interface Elevator {
  id: string;
  client_id: string;
  tower_name: string | null;
  index_number: number | null;
  manufacturer: string | null;
  model: string | null;
  elevator_type: "hydraulic" | "electromechanical" | null;
  floors: number | null;
  capacity_kg: number | null;
  has_machine_room: boolean | null;
  no_machine_room: boolean | null;
  stops_all_floors: boolean | null;
  stops_odd_floors: boolean | null;
  stops_even_floors: boolean | null;
  classification:
    | "ascensor_corporativo"
    | "ascensor_residencial"
    | "montacargas"
    | "montaplatos"
    | null;
}

type Props = {
  e: Elevator;
  onView?: (e: Elevator) => void;
  onParts?: (e: Elevator) => void;
  onManageParts?: (e: Elevator) => void;
};

export const ElevatorCard: FC<Props> = ({ e, onView, onParts, onManageParts }) => {
  const n = e.index_number ?? 0;
  const t = (e.tower_name ?? "").trim() || "Sin Torre";
  const machineRoom =
    e.has_machine_room ? "Con sala de máquinas"
    : e.no_machine_room ? "Sin sala de máquinas"
    : "—";

  const stops =
    e.stops_all_floors ? "Todos los pisos"
    : e.stops_odd_floors ? "Sólo impares"
    : e.stops_even_floors ? "Sólo pares"
    : "—";

  const typeLabel =
    e.elevator_type === "hydraulic" ? "Hidráulico"
    : e.elevator_type === "electromechanical" ? "Electromecánico"
    : "—";

  const classLabel =
    e.classification === "ascensor_corporativo" ? "Ascensor Corporativo"
    : e.classification === "ascensor_residencial" ? "Ascensor Residencial"
    : e.classification === "montacargas" ? "Montacargas"
    : e.classification === "montaplatos" ? "Montaplatos"
    : "—";

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      {/* Encabezado con # y torre */}
      <div className="mb-3 flex items-baseline justify-between">
        <h4 className="text-lg font-semibold text-slate-900">
          Ascensor #{n} — Torre {t}
        </h4>
        <span className="text-xs text-slate-500">{classLabel}</span>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">Tipo</p>
          <p className="font-medium">{typeLabel}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Fabricante</p>
          <p className="font-medium">{e.manufacturer || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Modelo</p>
          <p className="font-medium">{e.model || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Capacidad</p>
          <p className="font-medium">{e.capacity_kg ? `${e.capacity_kg} kg` : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Pisos</p>
          <p className="font-medium">{e.floors ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Sala de Máquinas</p>
          <p className="font-medium">{machineRoom}</p>
        </div>
        <div className="md:col-span-3">
          <p className="text-xs text-slate-500">Paradas</p>
          <p className="font-medium">{stops}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {onView && (
          <button
            onClick={() => onView(e)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            Ver Detalles
          </button>
        )}
        {onParts && (
          <button
            onClick={() => onParts(e)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
          >
            Llenar Partes
          </button>
        )}
        {onManageParts && (
          <button
            onClick={() => onManageParts(e)}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700"
          >
            Gestionar Partes
          </button>
        )}
      </div>
    </div>
  );
};
