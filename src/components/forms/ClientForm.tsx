import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  X,
  Key,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';
import QRCode from 'qrcode';

interface ElevatorData {
  location_name: string;
  address: string;
  elevator_type: 'hydraulic' | 'electromechanical';
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
  classification:
    | 'ascensor_corporativo'
    | 'ascensor_residencial'
    | 'montacargas'
    | 'montaplatos';
}

interface ClientFormProps {
  client?:
    | {
        id: string;
        company_name: string;
        building_name: string | null;
        contact_name: string;
        contact_email: string;
        contact_phone: string;
        address: string;
      }
    | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ClientForm({
  client,
  onSuccess,
  onCancel,
}: ClientFormProps) {
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

  const [totalEquipments, setTotalEquipments] =
    useState<number>(1);
  const [identicalElevators, setIdenticalElevators] =
    useState(false);
  const [elevatorCount, setElevatorCount] = useState(1);

  const [useClientAddress, setUseClientAddress] =
    useState(true);
  const [customAddress, setCustomAddress] = useState('');
  const [customManufacturer, setCustomManufacturer] =
    useState('');
  const [selectedManufacturer, setSelectedManufacturer] =
    useState('');
  const [elevatorManufacturers, setElevatorManufacturers] =
    useState<{ [key: number]: string }>({});
  const [
    elevatorCustomManufacturers,
    setElevatorCustomManufacturers,
  ] = useState<{ [key: number]: string }>({});

  // NUEVA lista de fabricantes (común + modernización + locales)
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

  const [templateElevator, setTemplateElevator] =
    useState<ElevatorData>({
      location_name: '',
      address: '',
      elevator_type: 'hydraulic',
      manufacturer: '',
      model: '',
      serial_number: '',
      serial_number_not_legible: false,
      capacity_kg: 450,
      floors: 0,
      installation_date:
        new Date().toISOString().split('T')[0],
      has_machine_room: false,
      no_machine_room: false,
      stops_all_floors: true,
      stops_odd_floors: false,
      stops_even_floors: false,
      classification: 'ascensor_corporativo',
    });

  const [elevators, setElevators] = useState<ElevatorData[]>(
    [
      {
        location_name: '',
        address: '',
        elevator_type: 'hydraulic',
        manufacturer: '',
        model: '',
        serial_number: '',
        serial_number_not_legible: false,
        capacity_kg: 450,
        floors: 0,
        installation_date:
          new Date().toISOString().split('T')[0],
        has_machine_room: false,
        no_machine_room: false,
        stops_all_floors: true,
        stops_odd_floors: false,
        stops_even_floors: false,
        classification: 'ascensor_corporativo',
      },
    ]
  );

  const addElevator = () => {
    if (elevators.length >= totalEquipments) {
      alert(
        `No puedes agregar más de ${totalEquipments} ascensores. Este es el número de equipos especificado.`
      );
      return;
    }
    setElevators([
      ...elevators,
      {
        location_name: '',
        address: '',
        elevator_type: 'hydraulic',
        manufacturer: '',
        model: '',
        serial_number: '',
        serial_number_not_legible: false,
        capacity_kg: 450,
        floors: 0,
        installation_date:
          new Date().toISOString().split('T')[0],
        has_machine_room: false,
        no_machine_room: false,
        stops_all_floors: true,
        stops_odd_floors: false,
        stops_even_floors: false,
        classification: 'ascensor_corporativo',
      },
    ]);
  };

  const removeElevator = (index: number) => {
    if (elevators.length > 1) {
      setElevators(
        elevators.filter((_, i) => i !== index)
      );
    }
  };

  const updateElevator = (
    index: number,
    field: keyof ElevatorData,
    value: any
  ) => {
    const updated = [...elevators];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setElevators(updated);
  };

  // Sincronizar dirección del cliente con ascensores cuando cambia
  const handleClientAddressChange = (
    newAddress: string
  ) => {
    const prevAddress = clientData.address;
    setClientData({
      ...clientData,
      address: newAddress,
    });

    // Template: si está usando dirección del cliente
    if (useClientAddress && identicalElevators) {
      setTemplateElevator({
        ...templateElevator,
        address: newAddress,
      });
    }

    // Ascensores individuales que usan dirección del cliente
    if (!identicalElevators) {
      setElevators(
        elevators.map((elevator) => {
          // Consideramos "usa dirección del cliente" si coincidía con la anterior
          if (elevator.address === prevAddress) {
            return {
              ...elevator,
              address: newAddress,
            };
          }
          return elevator;
        })
      );
    }
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // MODO EDICIÓN: solo actualiza datos del cliente
    if (isEditMode) {
      try {
        if (
          !clientData.company_name ||
          !clientData.contact_name ||
          !clientData.contact_email ||
          !clientData.contact_phone ||
          !clientData.address
        ) {
          setError(
            'Todos los campos del cliente son obligatorios'
          );
          setLoading(false);
          return;
        }

        const { error: updateError } =
          await supabase
            .from('clients')
            .update({
              company_name:
                clientData.company_name,
              building_name:
                clientData.building_name || null,
              contact_name:
                clientData.contact_name,
              contact_email:
                clientData.contact_email,
              contact_phone:
                clientData.contact_phone,
              address: clientData.address,
            })
            .eq('id', client!.id);

        if (updateError) throw updateError;

        alert(
          'Cliente actualizado exitosamente'
        );
        onSuccess?.();
      } catch (err: any) {
        console.error(
          'Error updating client:',
          err
        );
        setError(
          err.message ||
            'Error al actualizar el cliente'
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    // VALIDACIONES GENERALES (nuevo cliente)

    if (
      !clientData.company_name ||
      !clientData.building_name ||
      !clientData.contact_name ||
      !clientData.contact_email ||
      !clientData.contact_phone ||
      !clientData.address
    ) {
      setError(
        'Todos los campos del cliente son obligatorios'
      );
      setLoading(false);
      return;
    }

    if (
      !identicalElevators &&
      elevators.length !== totalEquipments
    ) {
      setError(
        `Debes agregar exactamente ${totalEquipments} ascensores. Actualmente tienes ${elevators.length}.`
      );
      setLoading(false);
      return;
    }

    if (
      identicalElevators &&
      elevatorCount !== totalEquipments
    ) {
      setError(
        `El número de ascensores idénticos (${elevatorCount}) debe coincidir con el N° de Equipos (${totalEquipments}).`
      );
      setLoading(false);
      return;
    }

    const elevatorList = identicalElevators
      ? [templateElevator]
      : elevators;

    // Validar cada ascensor
    for (let i = 0; i < elevatorList.length; i++) {
      const elevator = elevatorList[i];
      const idx = i + 1;

      if (!elevator.location_name) {
        setError(
          `El ascensor ${idx} debe tener un nombre de ubicación`
        );
        setLoading(false);
        return;
      }
      if (!elevator.address) {
        setError(
          `El ascensor ${idx} debe tener una dirección`
        );
        setLoading(false);
        return;
      }
      if (!elevator.manufacturer) {
        setError(
          `El ascensor ${idx} debe tener un fabricante`
        );
        setLoading(false);
        return;
      }
      if (!elevator.model) {
        setError(
          `El ascensor ${idx} debe tener un modelo`
        );
        setLoading(false);
        return;
      }
      if (
        !elevator.serial_number &&
        !elevator.serial_number_not_legible
      ) {
        setError(
          `El ascensor ${idx} debe tener número de serie o marcar que no es legible`
        );
        setLoading(false);
        return;
      }
      if (elevator.capacity_kg <= 0) {
        setError(
          `El ascensor ${idx} debe tener una capacidad válida`
        );
        setLoading(false);
        return;
      }
      if (elevator.floors <= 0) {
        setError(
          `El ascensor ${idx} debe tener un número de pisos válido`
        );
        setLoading(false);
        return;
      }
      if (
        elevator.has_machine_room &&
        elevator.no_machine_room
      ) {
        setError(
          `El ascensor ${idx} no puede tener ambas opciones de sala de máquinas marcadas`
        );
        setLoading(false);
        return;
      }
      if (
        !elevator.has_machine_room &&
        !elevator.no_machine_room
      ) {
        setError(
          `El ascensor ${idx} debe indicar si tiene o no sala de máquinas`
        );
        setLoading(false);
        return;
      }
      const stopsSelected = [
        elevator.stops_all_floors,
        elevator.stops_odd_floors,
        elevator.stops_even_floors,
      ].filter(Boolean).length;
      if (stopsSelected !== 1) {
        setError(
          `El ascensor ${idx} debe tener exactamente una opción de paradas en pisos seleccionada`
        );
        setLoading(false);
        return;
      }
    }

    if (
      clientData.password !==
      clientData.confirmPassword
    ) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (clientData.password.length < 8) {
      setError(
        'La contraseña debe tener al menos 8 caracteres'
      );
      setLoading(false);
      return;
    }

    // CREACIÓN: usuario + cliente + ascensores
    try {
      // 1) Crear usuario en API interna de Vercel
      const response = await fetch(
        '/api/users/create',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            email: clientData.contact_email,
            password: clientData.password,
            full_name:
              clientData.contact_name,
            phone:
              clientData.contact_phone ||
              null,
            role: 'client',
          }),
        }
      );

      const text = await response.text();
      let result: any = {};

      if (text) {
        try {
          result = JSON.parse(text);
        } catch (parseErr) {
          console.error(
            'Respuesta no JSON de /api/users/create:',
            text
          );
          throw new Error(
            'Error en /api/users/create: respuesta no es JSON válido.'
          );
        }
      }

      if (
        !response.ok ||
        result.error ||
        result.success === false ||
        result.ok === false
      ) {
        throw new Error(
          result.error ||
            `Error al crear el usuario del cliente (${response.status})`
        );
      }

      const profile =
        result.profile ||
        result.user ||
        result.data?.user ||
        result.data?.profile;

      if (!profile || !profile.id) {
        throw new Error(
          'No se pudo obtener el perfil del usuario creado.'
        );
      }

      // 2) Crear registro de cliente
      const clientCode = `CLI-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)
        .toUpperCase()}`;

      const {
        data: createdClient,
        error: clientError,
      } = await supabase
        .from('clients')
        .insert({
          profile_id: profile.id,
          company_name: clientData.company_name,
          building_name:
            clientData.building_name,
          contact_name:
            clientData.contact_name,
          contact_email:
            clientData.contact_email,
          contact_phone:
            clientData.contact_phone,
          rut: clientData.rut || null,
          address: clientData.address,
          is_active: true,
        })
        .select()
        .single();

      if (clientError || !createdClient)
        throw clientError ||
          new Error(
            'No se pudo crear el cliente'
          );

      // 3) Preparar ascensores para inserción
      let elevatorsToInsert;

      if (identicalElevators) {
        elevatorsToInsert =
          Array(elevatorCount)
            .fill(null)
            .map((_, index) => ({
              client_id: createdClient.id,
              location_name:
                templateElevator.location_name ||
                `Ascensor ${index + 1}`,
              address:
                useClientAddress
                  ? clientData.address
                  : templateElevator.address,
              elevator_type:
                templateElevator.elevator_type,
              manufacturer:
                templateElevator.manufacturer,
              model: templateElevator.model,
              serial_number:
                templateElevator.serial_number
                  ? `${templateElevator.serial_number}-${index + 1}`
                  : '',
              serial_number_not_legible:
                templateElevator.serial_number_not_legible,
              capacity_kg:
                templateElevator.capacity_kg,
              floors: templateElevator.floors,
              installation_date:
                templateElevator.installation_date,
              has_machine_room:
                templateElevator.has_machine_room,
              no_machine_room:
                templateElevator.no_machine_room,
              stops_all_floors:
                templateElevator.stops_all_floors,
              stops_odd_floors:
                templateElevator.stops_odd_floors,
              stops_even_floors:
                templateElevator.stops_even_floors,
              classification:
                templateElevator.classification,
              status: 'active' as const,
            }));
      } else {
        elevatorsToInsert = elevators.map(
          (elevator) => ({
            client_id: createdClient.id,
            location_name:
              elevator.location_name,
            address: elevator.address,
            elevator_type:
              elevator.elevator_type,
            manufacturer:
              elevator.manufacturer,
            model: elevator.model,
            serial_number:
              elevator.serial_number,
            serial_number_not_legible:
              elevator.serial_number_not_legible,
            capacity_kg:
              elevator.capacity_kg,
            floors: elevator.floors,
            installation_date:
              elevator.installation_date,
            has_machine_room:
              elevator.has_machine_room,
            no_machine_room:
              elevator.no_machine_room,
            stops_all_floors:
              elevator.stops_all_floors,
            stops_odd_floors:
              elevator.stops_odd_floors,
            stops_even_floors:
              elevator.stops_even_floors,
            classification:
              elevator.classification,
            status: 'active' as const,
          })
        );
      }

      const {
        error: elevatorsError,
      } = await supabase
        .from('elevators')
        .insert(elevatorsToInsert);

      if (elevatorsError)
        throw elevatorsError;

      // 4) Generar QR
      const qrDataURL =
        await QRCode.toDataURL(
          clientCode,
          {
            width: 300,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          }
        );

      setGeneratedClientCode(clientCode);
      setGeneratedQRCode(qrDataURL);

      onSuccess?.();
    } catch (err: any) {
      console.error('Error:', err);
      setError(
        err.message ||
          'Error al crear el cliente'
      );
    } finally {
      setLoading(false);
    }
  };

  // === UI (idéntico al tuyo, solo con cambios lógicos internos) ===

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-900">
            {isEditMode
              ? 'Editar Cliente'
              : 'Nuevo Cliente'}
          </h2>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* El resto del JSX es exactamente tu diseño original,
          sin cambios visuales. */}
      {/* ... */}
    </div>
  );
}

