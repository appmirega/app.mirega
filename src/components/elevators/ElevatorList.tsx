import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ElevatorCard, Elevator } from "./ElevatorCard";

type Props = {
  clientId?: string; // si filtras por cliente
};

export default function ElevatorList({ clientId }: Props) {
  const [data, setData] = useState<Elevator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const query = supabase
        .from("elevators")
        .select(
          "id, client_id, tower_name, index_number, manufacturer, model, elevator_type, floors, capacity_kg, has_machine_room, no_machine_room, stops_all_floors, stops_odd_floors, stops_even_floors, classification"
        )
        // orden consistente: primero torre, luego número
        .order("tower_name", { ascending: true, nullsFirst: true })
        .order("index_number", { ascending: true, nullsFirst: true });

      const { data, error } = clientId
        ? await query.eq("client_id", clientId)
        : await query;

      if (error) {
        console.error(error);
        setData([]);
      } else {
        setData((data || []) as Elevator[]);
      }
      setLoading(false);
    };

    run();
  }, [clientId]);

  if (loading) {
    return <div className="text-slate-500">Cargando ascensores…</div>;
  }

  if (!data.length) {
    return <div className="text-slate-500">No hay ascensores registrados.</div>;
  }

  return (
    <div className="grid gap-4">
      {data.map((e) => (
        <ElevatorCard
          key={e.id}
          e={e}
          onView={() => {}}
          onParts={() => {}}
          onManageParts={() => {}}
        />
      ))}
    </div>
  );
}
