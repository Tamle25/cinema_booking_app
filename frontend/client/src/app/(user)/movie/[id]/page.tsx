'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { IMovie, IShowtime, ICinemaSystem, ICinema } from '@/types';
import Link from 'next/link';
import { VIETNAM_PROVINCES } from '@/constants/provinces';

const getNext14Days = () => {
  const dates = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const getDayName = (date: Date, index: number) => {
  if (index === 0) return 'Hôm nay';
  const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return dayNames[date.getDay()];
};

// Helper: Format date thành YYYY-MM-DD theo LOCAL timezone (tránh lệch ngày do UTC)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [movie, setMovie] = useState<IMovie | null>(null);
  const [showtimes, setShowtimes] = useState<IShowtime[]>([]);
  const [relatedMovies, setRelatedMovies] = useState<IMovie[]>([]);
  const [loading, setLoading] = useState(true);

  // New states for booking flow
  const [cities, setCities] = useState<string[]>([]);
  const [cinemaSystems, setCinemaSystems] = useState<ICinemaSystem[]>([]);
  const [cinemas, setCinemas] = useState<ICinema[]>([]);

  // Selected states - flow: City -> Date -> Brand -> Cinema -> Showtime
  const [selectedCity, setSelectedCity] = useState<string>('Hà Nội');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null); // null = Tất cả
  const [days, setDays] = useState<Date[]>([]);

  // Initialize dates
  useEffect(() => {
    setDays(getNext14Days());
    // FIX: Dùng local date thay vì UTC
    const today = formatLocalDate(new Date());
    setSelectedDate(today);
  }, []);

  // Fetch initial data
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const fetchData = async () => {
      try {
        const [resMovie, resShow, resAllMovies, resCities, resCinemaSystems, resCinemas] = await Promise.all([
          fetch(`${API_URL}/movies/${id}`),
          fetch(`${API_URL}/showtimes/movie/${id}`),
          fetch(`${API_URL}/movies`),
          fetch(`${API_URL}/cinemas/cities`),
          fetch(`${API_URL}/cinema-systems`),
          fetch(`${API_URL}/cinemas`)
        ]);

        const dataMovie = await resMovie.json();
        const dataShow = await resShow.json();
        const dataAllMovies = await resAllMovies.json();
        const dataCities = await resCities.json();
        const dataCinemaSystems = await resCinemaSystems.json();
        const dataCinemas = await resCinemas.json();

        setMovie(dataMovie);
        setShowtimes(dataShow);
        setRelatedMovies(dataAllMovies.filter((m: IMovie) => m._id !== id).slice(0, 5));
        setCities(dataCities);
        setCinemaSystems(dataCinemaSystems);
        setCinemas(dataCinemas);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  // Reset brand when city changes
  useEffect(() => {
    setSelectedBrand(null);
  }, [selectedCity]);

  // Filter cinemas by selected city and brand
  const filteredCinemas = useMemo(() => {
    return cinemas.filter(cinema => {
      const matchCity = cinema.city === selectedCity;
      const matchBrand = !selectedBrand ||
        (typeof cinema.cinema_system === 'object'
          ? cinema.cinema_system._id === selectedBrand
          : cinema.cinema_system === selectedBrand);
      return matchCity && matchBrand;
    });
  }, [cinemas, selectedCity, selectedBrand]);

  // Filter showtimes by date and filtered cinemas
  const filteredShowtimes = useMemo(() => {
    const filteredCinemaIds = filteredCinemas.map(c => c._id);
    return showtimes.filter(show => {
      // FIX: Dùng local date thay vì UTC để tránh lệch ngày do timezone
      const showDateTime = new Date(show.start_time);
      const showDate = `${showDateTime.getFullYear()}-${String(showDateTime.getMonth() + 1).padStart(2, '0')}-${String(showDateTime.getDate()).padStart(2, '0')}`;
      const cinemaId = typeof show.cinema === 'object' ? show.cinema._id : show.cinema;
      return showDate === selectedDate && filteredCinemaIds.includes(cinemaId);
    });
  }, [showtimes, selectedDate, filteredCinemas]);

  // Group showtimes by cinema, then by room type
  const groupedShowtimes = useMemo(() => {
    const groups: Record<string, { cinema: ICinema; roomTypes: Record<string, IShowtime[]> }> = {};

    filteredShowtimes.forEach(show => {
      if (!show.cinema) return;
      // @ts-ignore - cinema can be string or object depending on populate
      const cinema = typeof show.cinema === 'object' && show.cinema._id ? show.cinema : filteredCinemas.find(c => c._id === show.cinema);
      if (!cinema) return;

      const cinemaId = cinema._id;
      const roomType = show.room?.type || '2D Phụ đề';

      if (!groups[cinemaId]) {
        groups[cinemaId] = { cinema: cinema as ICinema, roomTypes: {} };
      }
      if (!groups[cinemaId].roomTypes[roomType]) {
        groups[cinemaId].roomTypes[roomType] = [];
      }
      groups[cinemaId].roomTypes[roomType].push(show);
    });

    // Sort showtimes within each room type
    Object.values(groups).forEach(group => {
      Object.keys(group.roomTypes).forEach(roomType => {
        group.roomTypes[roomType].sort((a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
      });
    });

    return groups;
  }, [filteredShowtimes, filteredCinemas]);

  // Get available brands that have cinemas in selected city
  const availableBrands = useMemo(() => {
    const brandIds = new Set<string>();
    cinemas.forEach(cinema => {
      if (cinema.city === selectedCity) {
        const systemId = typeof cinema.cinema_system === 'object'
          ? cinema.cinema_system._id
          : cinema.cinema_system;
        brandIds.add(systemId);
      }
    });
    return cinemaSystems.filter(system => brandIds.has(system._id));
  }, [cinemas, cinemaSystems, selectedCity]);


  if (loading) return <div className="text-center py-20 text-gray-600">Đang tải dữ liệu...</div>;
  if (!movie) return <div className="text-center py-20 text-gray-600">Không tìm thấy phim</div>;

  return (
    <div className="min-h-screen bg-white">

      {/* --- PHẦN 1: BANNER & INFO --- */}
      {/* 
        Banner sử dụng margin-top âm (-mt-16) để kéo lên che padding-top của layout,
        sau đó thêm padding-top (pt-20) để đẩy nội dung xuống dưới header.
        Điều này tạo hiệu ứng banner "full-bleed" nhưng nội dung vẫn an toàn.
      */}
      <div
        className="relative w-full -mt-16 pt-16 bg-cover bg-center"
        style={{ backgroundImage: `url(${movie.banner_url})` }}
      >
        {/* Overlay gradient + Content container */}
        <div className="bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/60 pt-8 pb-10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end min-h-[380px] md:min-h-[420px]">
              {/* Poster */}
              <div className="hidden md:block col-span-1">
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full rounded-lg shadow-2xl border-2 border-gray-600 object-cover"
                />
              </div>

              {/* Info Text */}
              <div className="col-span-1 md:col-span-3 mb-2">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-white drop-shadow-lg">
                  {movie.title}
                </h1>

                <div className="flex flex-wrap items-center gap-3 md:gap-4 text-gray-300 text-sm mb-4">
                  <span className="bg-yellow-500 text-black px-2 py-0.5 rounded font-bold">
                    {movie.rating || 9.5} ★
                  </span>
                  <span>{movie.duration} phút</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{new Date(movie.release_date).toLocaleDateString()}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="uppercase">{movie.genre}</span>
                </div>

                {/* Description */}
                <p className="text-gray-300 mb-6 line-clamp-3 md:line-clamp-none max-w-3xl leading-relaxed">
                  {movie.description || "Đang cập nhật nội dung phim..."}
                </p>

                {/* Buttons - Only Trailer */}
                <div className="flex gap-4">
                  <button
                    onClick={() => window.open(movie.trailer_url, '_blank')}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition transform hover:scale-105"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                    </svg>
                    Xem Trailer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- PHẦN 2: MAIN CONTENT (Chia cột) --- */}
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-4 gap-10 bg-white">

        {/* CỘT TRÁI: Lịch chiếu & Bộ lọc (Chiếm 3 phần) */}
        <div className="lg:col-span-3" id="showtimes">
          {/* Header with title and city selector */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold border-l-4 border-red-500 pl-3 text-gray-800">
              Lịch Chiếu {movie.title}
            </h2>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-pink-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <select
                className="bg-transparent border-none text-pink-500 font-semibold focus:outline-none cursor-pointer max-h-[300px]"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                {VIETNAM_PROVINCES.map(city => (
                  <option key={city} value={city} className="bg-white text-gray-800">{city}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Picker - Horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
            {days.map((date, index) => {
              const dateStr = formatLocalDate(date);
              const isActive = selectedDate === dateStr;
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex-shrink-0 min-w-[70px] px-3 py-2 rounded-lg flex flex-col items-center transition border ${isActive
                    ? 'bg-pink-500 border-pink-500 text-white'
                    : 'bg-gray-100 border-gray-200 text-gray-600 hover:border-pink-300 hover:bg-pink-50'
                    }`}
                >
                  <span className="text-2xl font-bold">{date.getDate()}</span>
                  <span className="text-xs">
                    {getDayName(date, index)}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Brand/Cinema System Selector - Only show if there are cinemas in selected city */}
          {filteredCinemas.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
              {/* "Tất cả" option */}
              <button
                onClick={() => setSelectedBrand(null)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-[70px] h-[70px] rounded-lg border-2 transition ${selectedBrand === null
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
              >
                <span className="text-2xl">⭐</span>
                <span className="text-xs mt-1 text-gray-600">Tất cả</span>
              </button>

              {availableBrands.map(system => (
                <button
                  key={system._id}
                  onClick={() => setSelectedBrand(system._id)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-[70px] h-[70px] rounded-lg border-2 transition overflow-hidden ${selectedBrand === system._id
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                >
                  {system.logo_url ? (
                    <img src={system.logo_url} alt={system.name} className="w-12 h-12 object-contain" />
                  ) : (
                    <span className="text-xs font-bold text-center px-1">{system.name}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Cinemas and Showtimes List */}
          <div className="space-y-4">
            {Object.keys(groupedShowtimes).length === 0 ? (
              <div className="text-center text-gray-500 py-16 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
                {filteredCinemas.length === 0 ? (
                  <>
                    <p className="font-medium text-gray-600">Chưa có rạp chiếu phim tại {selectedCity}</p>
                    <p className="text-sm mt-2">Hệ thống đang mở rộng. Vui lòng chọn tỉnh/thành khác.</p>
                  </>
                ) : selectedBrand ? (
                  <>
                    <p>Không có suất chiếu nào cho hãng này tại {selectedCity} vào ngày đã chọn.</p>
                    <p className="text-sm mt-2">Vui lòng chọn ngày khác hoặc thay đổi hệ thống rạp.</p>
                  </>
                ) : (
                  <>
                    <p>Không có suất chiếu nào tại {selectedCity} vào ngày đã chọn.</p>
                    <p className="text-sm mt-2">Vui lòng chọn ngày khác.</p>
                  </>
                )}
              </div>
            ) : (
              Object.entries(groupedShowtimes).map(([cinemaId, { cinema, roomTypes }]) => {
                // Get cinema system info
                const systemInfo = typeof cinema.cinema_system === 'object'
                  ? cinema.cinema_system
                  : cinemaSystems.find(s => s._id === cinema.cinema_system);

                return (
                  <div key={cinemaId} className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    {/* Cinema Header */}
                    <div className="flex items-start gap-4 p-4 border-b border-gray-100 bg-gray-50">
                      {/* Cinema System Logo */}
                      <div className="flex-shrink-0 w-12 h-12 rounded bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                        {systemInfo?.logo_url ? (
                          <img src={systemInfo.logo_url} alt={systemInfo.name} className="w-10 h-10 object-contain" />
                        ) : (
                          <span className="text-xs font-bold text-gray-600">{systemInfo?.name?.slice(0, 3) || 'N/A'}</span>
                        )}
                      </div>

                      {/* Cinema Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-lg">{cinema.name}</h3>
                        <p className="text-gray-500 text-sm truncate">{cinema.address}</p>
                      </div>
                    </div>

                    {/* Room Types and Showtimes */}
                    <div className="p-4 space-y-4">
                      {Object.entries(roomTypes).map(([roomType, shows]) => (
                        <div key={roomType}>
                          <p className="text-gray-500 text-sm mb-3">{roomType}</p>
                          <div className="flex flex-wrap gap-2">
                            {shows.map(show => {
                              const startTime = new Date(show.start_time);
                              const endTime = new Date(show.end_time);
                              return (
                                <Link
                                  key={show._id}
                                  href={`/booking/${show._id}`}
                                  className="group border border-gray-200 hover:border-pink-500 px-4 py-2 rounded-lg transition duration-200 hover:bg-pink-50"
                                >
                                  <span className="text-pink-600 font-bold">
                                    {startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span className="text-gray-400 text-sm">
                                    {' '}~ {endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CỘT PHẢI: Phim nổi bật (Sidebar) (Chiếm 1 phần) */}
        <div className="lg:col-span-1">
          <h3 className="text-xl font-bold mb-6 text-gray-800">Phim Đang Chiếu</h3>
          <div className="flex flex-col gap-4">
            {relatedMovies.map((m) => (
              <Link key={m._id} href={`/movie/${m._id}`} className="group flex gap-4 items-start hover:bg-gray-50 p-2 rounded-lg transition border border-transparent hover:border-gray-200">
                <img
                  src={m.poster_url}
                  alt={m.title}
                  className="w-20 h-28 object-cover rounded shadow-md group-hover:scale-105 transition"
                />
                <div>
                  <h4 className="font-bold text-sm text-gray-800 group-hover:text-pink-600 transition line-clamp-2">
                    {m.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">{m.genre}</p>
                  <p className="text-xs text-yellow-500 mt-1 font-semibold">★ {m.rating || 9.0}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}