'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IComparedCinema } from '@/types';

const DEFAULT_MAP_CENTER: L.LatLngExpression = [21.0285, 105.8542];

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

const mapIcons = {
  user: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  cinema: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
};

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

    let cancelled = false;
    let timer: NodeJS.Timeout | null = null;

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
      // Dùng setTimeout ngắn để đảm bảo DOM container đã hoàn thành mount và có kích thước thực tế
      timer = setTimeout(() => {
        if (cancelled) return;

        try {
          // Kiểm tra map container còn trong DOM trước khi thao tác
          const container = map.getContainer();
          if (!container || !document.body.contains(container)) {
            return;
          }

          // Kiểm tra xem pane chính của Leaflet map đã được tạo chưa
          const pane = map.getPane('mapPane');
          if (!pane) return;

          const bounds = L.latLngBounds(points);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        } catch (err) {
          console.error('Error fitting bounds:', err);
        }
      }, 100);
    }

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [cinemas, userCoords, map]);

  return null;
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    let cancelled = false;

    // Tránh việc map render bị vỡ (gray tiles) khi container thay đổi kích thước hoặc mới mount
    const timer = setTimeout(() => {
      if (cancelled) return;
      try {
        const container = map.getContainer();
        if (!container || !document.body.contains(container)) return;

        const pane = map.getPane('mapPane');
        if (!pane) return;

        map.invalidateSize();
      } catch (err) {
        console.error('Error invalidating map size:', err);
      }
    }, 150);

    const handleResize = () => {
      if (cancelled) return;
      try {
        const container = map.getContainer();
        if (!container || !document.body.contains(container)) return;

        const pane = map.getPane('mapPane');
        if (!pane) return;

        map.invalidateSize();
      } catch (err) {
        console.error('Error invalidating map size on resize:', err);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
}

interface CinemaMapProps {
  cinemas: IComparedCinema[];
  userCoords: { lat: number; lng: number } | null;
  onSelectCinema?: (cinemaId: string) => void;
  isLoading?: boolean;
}

export default function CinemaMapInner({ cinemas, userCoords, onSelectCinema, isLoading }: CinemaMapProps) {
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

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="w-full h-full"
        style={{ minHeight: '450px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds cinemas={cinemas} userCoords={userCoords} />
        <MapResizeHandler />

        {/* User location marker */}
        {isValidCoords(userCoords) && (
          <Marker position={[userCoords.lat, userCoords.lng]} icon={mapIcons.user}>
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
            icon={mapIcons.cinema}
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

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px] z-[1000] flex items-center justify-center transition-all duration-300">
          <div className="bg-white/95 p-3 rounded-xl shadow-lg border border-gray-100 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-bold text-gray-700">Đang cập nhật rạp chiếu...</span>
          </div>
        </div>
      )}
    </div>
  );
}
