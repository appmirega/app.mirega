import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus,
  Trash2,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import QRCode from 'qrcode';

type ElevatorType = 'hydraulic' | 'electromechanical';
type Classification =
  | 'ascensor_corporativo'
  | 'ascensor_residencial'
  | 'montacargas'
  | 'montaplatos';

interface ElevatorData {
  location_name: string;
  address: string;
  use_client_address: boolean;
  elevator_type: ElevatorType;
  manufacturer: string;
  model: string;
  serial_number: string;
  serial_number_not_legible: boolean;
  capacity_kg: number;
  floors: number;
  installation_date: string;
  has_machine_room: boolean;
  no_machine_room: boolean;
  stops_all_floors: boolean;
  stops_odd_floors: boolean;
  stops_even_floors: boolean;
  classification: Classification;
}

interface ClientFormProps {
  client?: {
    id: string;
    company_name: string;
    building_name: string | null;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    address: string;
  } | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const manufacturerOptions = [
  'Orona',
  'Otis',
  'Schindler',
  'Mitsubishi Electric',
  'TK Elevator (ThyssenKrupp)',
  'KONE',
  'FUJI Elevators',
  'HEAVENWARD',
  'MAC PUARSA',
  'FBLT',
  'SAITEK',
  'CARLOS SILVA',
  'CEA',
  'Otros',
];

const createEmptyElevator = (): ElevatorData => ({
  location_name: '',
  address: '',
  use_client_address: true,
  elevator_type: 'hydraulic',
  manufacturer: '',
  model: '',
  serial_number: '',
  serial_number_not_legible: false,
  capacity_kg: 450,
  floors: 0,
  installation_date: new Date().toISOString().split('T')[0],
  has_machine_room: false,
  no_machine_room: false,
  stops_all_floors: true,
  stops_odd_floors: false,
  stops_even_floors: false,
  classification: 'ascensor_corporativo',
});

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const isEditMode = !!client;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientData, setClientData] = useState({
    company_name: client?.company_name || '',
    building_name: client?.building_name || '',
    contact_name: client?.contact_name || '',
    contact_email: client?.contact_email || '',
    contact_phone: client?.contact_phone || '',
    rut: '',
    address: client?.address || '',
    password: '',
    confirmPassword: '',
  });

  const [generatedClientCode, setGeneratedClientCode] =
    useState<string | null>(null);
  const [generatedQRCode, setGeneratedQRCode] =
    useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [totalEquipments, setTotalEquipments] = useState(1);
  const [identicalElevators, setIdenticalElevators] =
    useState(false);
  const [elevatorCount, setElevatorCount] = useState(1);

  const [templateElevator, setTemplateElevator] =
    useState<ElevatorData>(createEmptyElevator());

  const [elevators, setElevators] = useState<ElevatorData[]>([
    createEmptyElevator(),
  ]);

  // Helpers

  const setErr = (msg: string) => {
    setError(msg);
    setLoading(false);
    return false;
  };

  const updateElevator = (
    index: number,
    patch: Partial<ElevatorData>
  ) => {
    setElevators((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], ...patch };
      return arr;
    });
  };

  const handleClientAddressChange = (address: string) => {
    setClientData((prev) => ({ ...prev, address }));

    // Actualizar todos los ascensores que usan la dirección del cliente
    setElevators((prev) =>
      prev.map((e) =>
        e.use_client_address ? { ...e, address } : e
      )
    );

    // Y el template si corresponde
    if (templateElevator.use_client_address) {
      setTemplateElevator((prev) => ({ ...prev, address }));
    }
  };

  const addElevator = () => {
    if (!identicalElevators && elevators.length >= totalEquipments) {
      alert(
        `No puedes agregar más de ${totalEquipments} ascensores.`
      );
      return;
    }
    setElevators((prev) => [
      ...prev,
      {
        ...createEmptyElevator(),
        address: clientData.address,
      },
    ]);
  };

  const removeElevator = (index: number) => {
    setElevators((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  const validateElevators = (): boolean => {
    const list = identicalElevators
      ? [templateElevator]
      : elevators;

    for (let i = 0; i < list.length; i++) {
      const e = list[i];

      if (!e.location_name)
        return setErr(
          `El ascensor ${i + 1} debe tener un nombre de ubicación`
        );

      const addr =
        e.use_client_address ? clientData.address : e.address;
      if (!addr)
        return setErr(
          `El ascensor ${i + 1} debe tener una dirección`
        );

      if (!e.manufacturer)
        return setErr(
          `El ascensor ${i + 1} debe tener un fabricante`
        );
      if (!e.model)
        return setErr(
          `El ascensor ${i + 1} debe tener un modelo`
        );
      if (!e.serial_number && !e.serial_number_not_legible)
        return setErr(
          `El ascensor ${i + 1} debe tener número de serie o marcar que no es legible`
        );
      if (e.capacity_kg <= 0)
        return setErr(
          `El ascensor ${i + 1} debe tener una capacidad válida`
        );
      if (e.floors <= 0)
        return setErr(
          `El ascensor ${i + 1} debe tener un número de pisos válido`
        );
      if (e.has_machine_room && e.no_machine_room)
        return setErr(
          `El ascensor ${i + 1} no puede tener ambas opciones de sala de máquinas`
        );
      if (!e.has_machine_room && !e.no_machine_room)
        return setErr(
          `El ascensor ${i + 1} debe indicar si tiene o no sala de máquinas`
        );
      const stops = [
        e.stops_all_floors,
        e.stops_odd_floors,
        e.stops_even_floors,
      ].filter(Boolean).length;
      if (stops !== 1)
        return setErr(
          `El ascensor ${i + 1} debe tener exactamente una opción de paradas seleccionada`
        );
    }

    return true;
  };

  // Submit

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // EDITAR CLIENTE
    if (isEditMode) {
      try {
        if (
          !clientData.company_name ||
          !clientData.contact_name ||
          !clientData.contact_email ||
          !clientData.contact_phone ||
          !clientData.address
        ) {
          return setErr(
            'Todos los campos del cliente son obligatorios'
          );
        }

        const { error: updateError } = await supabase
          .from('clients')
          .update({
            company_name: clientData.company_name,
            building_name: clientData.building_name || null,
            contact_name: clientData.contact_name,
            contact_email: clientData.contact_email,
            contact_phone: clientData.contact_phone,
            address: clientData.address,
          })
          .eq('id', client!.id);

        if (updateError) throw updateError;

        alert('Cliente actualizado exitosamente');
        onSuccess?.();
      } catch (err: any) {
        console.error(err);
        setErr(
          err.message || 'Error al actualizar el cliente'
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    // NUEVO CLIENTE

    if (
      !clientData.company_name ||
      !clientData.building_name ||
      !clientData.contact_name ||
      !clientData.contact_email ||
      !clientData.contact_phone ||
      !clientData.address
    ) {
      return setErr(
        'Todos los campos del cliente son obligatorios'
      );
    }

    if (!identicalElevators && elevators.length !== totalEquipments) {
      return setErr(
        `Debes agregar exactamente ${totalEquipments} ascensores. Actualmente tienes ${elevators.length}.`
      );
    }

    if (identicalElevators && elevatorCount !== totalEquipments) {
      return setErr(
        `El número de ascensores idénticos (${elevatorCount}) debe coincidir con el N° de Equipos (${totalEquipments}).`
      );
    }

    if (!validateElevators()) return;

    if (clientData.password !== clientData.confirmPassword) {
      return setErr('Las contraseñas no coinciden');
    }
    if (clientData.password.length < 8) {
      return setErr(
        'La contraseña debe tener al menos 8 caracteres'
      );
    }

    try {
      // Llamamos a la función serverless en Vercel
      const resp = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: clientData.contact_email,
          password: clientData.password,
          full_name: clientData.contact_name,
          phone: clientData.contact_phone,
          role: 'client',
        }),
      });

      const text = await resp.text();
      let data: any = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          console.error('Respuesta no JSON de /api/users/create:', text);
          throw new Error(
            'Error en /api/users/create: la respuesta no es JSON válido.'
          );
        }
      }

      if (!data.ok || !data.profile) {
        throw new Error(
          data.error || 'Error al crear el usuario del cliente.'
        );
      }

      const profile = data.profile;

      const clientCode = `CLI-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 11)
        .toUpperCase()}`;

      const {
        data: createdClient,
        error: clientError,
      } = await supabase
        .from('clients')
        .insert({
          profile_id: profile.id,
          company_name: clientData.company_name,
          building_name: clientData.building_name,
          contact_name: clientData.contact_name,
          contact_email: clientData.contact_email,
          contact_phone: clientData.contact_phone,
          rut: clientData.rut || null,
          address: clientData.address,
          is_active: true,
        })
        .select()
        .single();

      if (clientError || !createdClient)
        throw clientError || new Error('No se pudo crear el cliente');

      const elevatorList = identicalElevators
        ? Array.from({ length: elevatorCount }).map((_, idx) => {
            const e = templateElevator;
            const addr = e.use_client_address
              ? clientData.address
              : e.address;
            return {
              client_id: createdClient.id,
              location_name:
                e.location_name || `Ascensor ${idx + 1}`,
              address: addr,
              elevator_type: e.elevator_type,
              manufacturer: e.manufacturer,
              model: e.model,
              serial_number: e.serial_number
                ? `${e.serial_number}-${idx + 1}`
                : '',
              serial_number_not_legible:
                e.serial_number_not_legible,
              capacity_kg: e.capacity_kg,
              floors: e.floors,
              installation_date: e.installation_date,
              has_machine_room: e.has_machine_room,
              no_machine_room: e.no_machine_room,
              stops_all_floors: e.stops_all_floors,
              stops_odd_floors: e.stops_odd_floors,
              stops_even_floors: e.stops_even_floors,
              classification: e.classification,
              status: 'active' as const,
            };
          })
        : elevators.map((e) => {
            const addr = e.use_client_address
              ? clientData.address
              : e.address;
            return {
              client_id: createdClient.id,
              location_name: e.location_name,
              address: addr,
              elevator_type: e.elevator_type,
              manufacturer: e.manufacturer,
              model: e.model,
              serial_number: e.serial_number,
              serial_number_not_legible:
                e.serial_number_not_legible,
              capacity_kg: e.capacity_kg,
              floors: e.floors,
              installation_date: e.installation_date,
              has_machine_room: e.has_machine_room,
              no_machine_room: e.no_machine_room,
              stops_all_floors: e.stops_all_floors,
              stops_odd_floors: e.stops_odd_floors,
              stops_even_floors: e.stops_even_floors,
              classification: e.classification,
              status: 'active' as const,
            };
          });

      const { error: elevatorsError } = await supabase
        .from('elevators')
        .insert(elevatorList);

      if (elevatorsError) throw elevatorsError;

      const qrDataURL = await QRCode.toDataURL(clientCode, {
        width: 300,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      setGeneratedClientCode(clientCode);
      setGeneratedQRCode(qrDataURL);

      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      setErr(
        err.message || 'Error al crear el cliente'
      );
    } finally {
      setLoading(false);
    }
  };

  // UI (resumen; estructura igual a la que ya tienes)

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-slate-50 p-6 rounded-2xl"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {isEditMode ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Información del Cliente */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">
          Información del Cliente
        </h3>
        <input
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="Razón Social *"
          value={clientData.company_name}
          onChange={(e) =>
            setClientData((p) => ({
              ...p,
              company_name: e.target.value,
            }))
          }
        />
        <input
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="Nombre Edificio *"
          value={clientData.building_name}
          onChange={(e) =>
            setClientData((p) => ({
              ...p,
              building_name: e.target.value,
            }))
          }
        />
        <input
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="RUT"
          value={clientData.rut}
          onChange={(e) =>
            setClientData((p) => ({
              ...p,
              rut: e.target.value,
            }))
          }
        />
        <input
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="Contacto *"
          value={clientData.contact_name}
          onChange={(e) =>
            setClientData((p) => ({
              ...p,
              contact_name: e.target.value,
            }))
          }
        />
        <input
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="Email *"
          value={clientData.contact_email}
          onChange={(e) =>
            setClientData((p) => ({
              ...p,
              contact_email: e.target.value,
            }))
          }
        />
        <input
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="Teléfono *"
          value={clientData.contact_phone}
          onChange={(e) =>
            setClientData((p) => ({
              ...p,
              contact_phone: e.target.value,
            }))
          }
        />
        <input
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="Dirección *"
          value={clientData.address}
          onChange={(e) =>
            handleClientAddressChange(e.target.value)
          }
        />
      </div>

      {/* Credenciales */}
      {!isEditMode && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800">
            Credenciales de Acceso
          </h3>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full px-4 py-2 pr-10 border rounded-lg"
              placeholder="Contraseña (mínimo 8 caracteres)"
              value={clientData.password}
              onChange={(e) =>
                setClientData((p) => ({
                  ...p,
                  password: e.target.value,
                }))
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              className="w-full px-4 py-2 pr-10 border rounded-lg"
              placeholder="Confirmar contraseña"
              value={clientData.confirmPassword}
              onChange={(e) =>
                setClientData((p) => ({
                  ...p,
                  confirmPassword: e.target.value,
                }))
              }
            />
            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword((v) => !v)
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Configuración de ascensores y formularios individuales */}
      {/* Usa elevators, manufacturerOptions y updateElevator como ya está definido arriba.
          Si quieres, en un siguiente mensaje te puedo detallar solo esta sección con el JSX completo. */}

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-60"
        >
          {loading
            ? 'Guardando...'
            : isEditMode
            ? 'Guardar Cambios'
            : 'Crear Cliente'}
        </button>
      </div>
    </form>
  );
}
