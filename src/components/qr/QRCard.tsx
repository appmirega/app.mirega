
import { useMemo } from 'react';

interface QRCardProps {
  elevator: {
    id: string;
    internal_code: string;
    brand: string;
    model: string;
    serial_number: string;
    location_building: string;
    location_floor: string;
    location_specific?: string | null;
    clients?: {
      company_name?: string;
      address?: string;
    };
  };
}

export function QRCard({ elevator }: QRCardProps) {
  // Generate QR URL and Data URL
  const qrUrl = useMemo(() => `${window.location.origin}/elevator/${elevator.id}`, [elevator.id]);
  const qrImgUrl = useMemo(() =>
    `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUrl)}&margin=1`,
    [qrUrl]
  );

  return (
    <div
      className="bg-white border-2 border-black rounded-2xl overflow-hidden"
      style={{
        width: '112px',
        height: '150px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="bg-white flex items-center justify-center"
        style={{
          width: '100px',
          height: '100px',
          margin: '6px auto 0',
        }}
      >
        <img
          src={qrImgUrl}
          alt={`QR ${elevator.location_building}`}
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />
      </div>

      <div
        className="bg-white text-center"
        style={{
          padding: '4px 6px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <div style={{ fontSize: '10pt', color: '#000', fontWeight: 'normal', lineHeight: '1.2' }}>
          {elevator.clients?.company_name || ''}
        </div>
        <div style={{ fontSize: '13pt', color: '#DC2626', fontWeight: 'bold', lineHeight: '1.1', marginTop: '2px' }}>
          {elevator.location_building}
        </div>
        <div style={{ fontSize: '10pt', color: '#222', fontWeight: 'normal', lineHeight: '1.1', marginTop: '2px' }}>
          {elevator.internal_code}
        </div>
      </div>
    </div>
  );
}
