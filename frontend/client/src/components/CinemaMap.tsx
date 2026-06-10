'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IComparedCinema } from '@/types';

const DEFAULT_MAP_CENTER: L.LatLngExpression = [21.0285, 105.8542];

const isValidCoords = (coords: { lat: number; lng: number } | null | undefined): coords is { lat: number; lng: number } => {
  return (
    !!coords &&
    typeof coords.lat === 'number' &&
    typeof coords.lng === 'number' &&
    !isNaN(coords.lat) &&
    !isNaN(coords.lng)
  );
};

function FitBounds({ cinemas, userCoords }: {
  cinemas: IComparedCinema[];
  userCoords: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const points: L.LatLngExpression[] = [];

    cinemas.forEach(c => {
      if (
        typeof c.latitude === 'number' &&
        typeof c.longitude === 'number' &&
        !isNaN(c.latitude) &&
        !isNaN(c.longitude)
      ) {
        points.push([c.latitude, c.longitude]);
      }
    });

    if (isValidCoords(userCoords)) {
      points.push([userCoords.lat, userCoords.lng]);
    }

    if (points.length > 0) {
      try {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch (err) {
        console.error('Error fitting bounds:', err);
      }
    }
  }, [cinemas, userCoords, map]);

  return null;
}

interface CinemaMapProps {
  cinemas: IComparedCinema[];
  userCoords: { lat: number; lng: number } | null;
  onSelectCinema?: (cinemaId: string) => void;
}

export default function CinemaMapInner({ cinemas, userCoords, onSelectCinema }: CinemaMapProps) {
  const [icons, setIcons] = useState<{
    user: L.Icon;
    cinema: L.Icon;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      L.Marker.prototype.options.icon = defaultIcon;

      const userIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const cinemaIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      setIcons({ user: userIcon, cinema: cinemaIcon });
    }
  }, []);

  const defaultCenter: L.LatLngExpression = isValidCoords(userCoords)
    ? [userCoords.lat, userCoords.lng]
    : DEFAULT_MAP_CENTER;

  const cinemasWithCoords = cinemas.filter(
    (c): c is IComparedCinema & { latitude: number; longitude: number } =>
      typeof c.latitude === 'number' &&
      typeof c.longitude === 'number' &&
      !isNaN(c.latitude) &&
      !isNaN(c.longitude)
  );

  if (!icons) {
    return (
      <div className="w-full h-full rounded-xl bg-gray-100 flex items-center justify-center text-sm text-gray-500 animate-pulse" style={{ minHeight: '400px' }}>
        Đang khởi tạo bản đồ...
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds cinemas={cinemas} userCoords={userCoords} />

        {/* User location marker */}
        {isValidCoords(userCoords) && (
          <Marker position={[userCoords.lat, userCoords.lng]} icon={icons.user}>
            <Popup>
              <div className="text-center">
                <p className="font-bold text-gray-800 text-sm">Vị trí của bạn</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Cinema markers */}
        {cinemasWithCoords.map(cinema => (
          <Marker
            key={cinema.cinemaId}
            position={[cinema.latitude, cinema.longitude]}
            icon={icons.cinema}
          >
            <Popup>
              <div className="min-w-[200px]">
                <p className="font-bold text-gray-900 text-sm mb-1">{cinema.cinemaName}</p>
                <p className="text-xs text-gray-500 mb-1">{cinema.brand}</p>
                <p className="text-xs text-gray-500 mb-2">{cinema.address}</p>
                {cinema.minPrice != null && (
                  <p className="text-xs mb-1">
                    <span className="text-gray-600">Giá từ: </span>
                    <span className="font-bold text-red-600">{cinema.minPrice.toLocaleString()}đ</span>
                  </p>
                )}
                {cinema.distanceKm != null && (
                  <p className="text-xs mb-2">
                    <span className="text-gray-600">Khoảng cách: </span>
                    <span className="font-semibold">{cinema.distanceKm} km</span>
                  </p>
                )}
                {onSelectCinema && (
                  <button
                    onClick={() => onSelectCinema(cinema.cinemaId)}
                    className="w-full mt-1 text-xs bg-red-600 text-white py-1.5 rounded-md hover:bg-red-700 transition font-medium"
                  >
                    Xem suất chiếu
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
