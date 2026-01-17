'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ICinemaSystem, ICinema, IShowtime } from '@/types';
import { useAuth } from '@/context/AuthContext';

// Step enum để quản lý flow
enum BookingStep {
  SELECT_SYSTEM_AND_CITY = 1,
  SELECT_CINEMA = 2,
  SELECT_DATE_AND_SHOWTIME = 3,
  SELECT_SEATS = 4,
}

// Hàm chuyển đổi số thành chữ (0 -> A, 1 -> B...)
const getRowLabel = (index: number) => String.fromCharCode(65 + index);

// Format ngày tiếng Việt
const formatDateVN = (dateStr: string) => {
  const date = new Date(dateStr);
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return {
    dayOfWeek: days[date.getDay()],
    day: date.getDate(),
    month: date.getMonth() + 1,
  };
};

export default function BookingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // State quản lý step
  const [currentStep, setCurrentStep] = useState<BookingStep>(BookingStep.SELECT_SYSTEM_AND_CITY);

  // Data từ API
  const [cinemaSystems, setCinemaSystems] = useState<ICinemaSystem[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [cinemas, setCinemas] = useState<ICinema[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showtimes, setShowtimes] = useState<IShowtime[]>([]);

  // User selections
  const [selectedSystem, setSelectedSystem] = useState<ICinemaSystem | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedCinema, setSelectedCinema] = useState<ICinema | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShowtime, setSelectedShowtime] = useState<IShowtime | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // =============== FETCH DATA ===============

  // Fetch cinema systems và cities khi mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [systemsRes, citiesRes] = await Promise.all([
          fetch(`${API_URL}/cinema-systems`),
          fetch(`${API_URL}/cinemas/cities`),
        ]);
        
        const systemsData = await systemsRes.json();
        const citiesData = await citiesRes.json();
        
        setCinemaSystems(systemsData);
        setCities(citiesData);
      } catch (error) {
        console.error('Lỗi tải dữ liệu ban đầu:', error);
      }
    };
    fetchInitialData();
  }, [API_URL]);

  // Fetch cinemas khi chọn system hoặc city
  useEffect(() => {
    if (!selectedSystem && !selectedCity) {
      setCinemas([]);
      return;
    }

    const fetchCinemas = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedSystem) params.append('systemId', selectedSystem._id);
        if (selectedCity) params.append('city', selectedCity);

        const res = await fetch(`${API_URL}/cinemas/filter?${params.toString()}`);
        const data = await res.json();
        setCinemas(data);
      } catch (error) {
        console.error('Lỗi tải danh sách rạp:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCinemas();
  }, [selectedSystem, selectedCity, API_URL]);

  // Fetch available dates khi chọn cinema
  useEffect(() => {
    if (!selectedCinema) {
      setAvailableDates([]);
      return;
    }

    const fetchDates = async () => {
      try {
        const res = await fetch(`${API_URL}/showtimes/dates/${selectedCinema._id}`);
        const data = await res.json();
        setAvailableDates(data);
        
        // Auto-select ngày đầu tiên nếu có
        if (data.length > 0) {
          setSelectedDate(data[0]);
        }
      } catch (error) {
        console.error('Lỗi tải ngày chiếu:', error);
      }
    };
    fetchDates();
  }, [selectedCinema, API_URL]);

  // Fetch showtimes khi chọn date
  useEffect(() => {
    if (!selectedCinema || !selectedDate) {
      setShowtimes([]);
      return;
    }

    const fetchShowtimes = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('cinemaId', selectedCinema._id);
        params.append('date', selectedDate);

        const res = await fetch(`${API_URL}/showtimes/filter?${params.toString()}`);
        const data = await res.json();
        setShowtimes(data);
      } catch (error) {
        console.error('Lỗi tải suất chiếu:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchShowtimes();
  }, [selectedCinema, selectedDate, API_URL]);

  // =============== HANDLERS ===============

  const handleSelectSystem = (system: ICinemaSystem) => {
    setSelectedSystem(prev => prev?._id === system._id ? null : system);
    setSelectedCinema(null);
    setSelectedShowtime(null);
    setSelectedSeats([]);
  };

  const handleSelectCity = (city: string) => {
    setSelectedCity(prev => prev === city ? '' : city);
    setSelectedCinema(null);
    setSelectedShowtime(null);
    setSelectedSeats([]);
  };

  const handleSelectCinema = (cinema: ICinema) => {
    setSelectedCinema(cinema);
    setSelectedShowtime(null);
    setSelectedSeats([]);
    setCurrentStep(BookingStep.SELECT_DATE_AND_SHOWTIME);
  };

  const handleSelectShowtime = (showtime: IShowtime) => {
    setSelectedShowtime(showtime);
    setSelectedSeats([]);
    setCurrentStep(BookingStep.SELECT_SEATS);
  };

  const handleSeatClick = (seatName: string, isBooked: boolean) => {
    if (isBooked) return;

    if (selectedSeats.includes(seatName)) {
      setSelectedSeats(prev => prev.filter(s => s !== seatName));
    } else {
      if (selectedSeats.length >= 8) {
        alert('Bạn chỉ được chọn tối đa 8 ghế!');
        return;
      }
      setSelectedSeats(prev => [...prev, seatName]);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      alert('Bạn cần đăng nhập để đặt vé!');
      router.push('/login');
      return;
    }

    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ghế!');
      return;
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          showtime_id: selectedShowtime?._id,
          seats: selectedSeats,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('🎉 Đặt vé thành công!');
        router.push('/');
      } else {
        alert(`Lỗi: ${data.message}`);
      }
    } catch (error) {
      console.error('Lỗi đặt vé:', error);
      alert('Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  const handleBack = () => {
    if (currentStep === BookingStep.SELECT_SEATS) {
      setSelectedShowtime(null);
      setSelectedSeats([]);
      setCurrentStep(BookingStep.SELECT_DATE_AND_SHOWTIME);
    } else if (currentStep === BookingStep.SELECT_DATE_AND_SHOWTIME) {
      setSelectedCinema(null);
      setSelectedDate('');
      setCurrentStep(BookingStep.SELECT_SYSTEM_AND_CITY);
    }
  };

  // =============== RENDER HELPERS ===============

  // Group showtimes by movie
  const groupedShowtimes = showtimes.reduce((acc, showtime) => {
    const movieId = showtime.movie._id;
    if (!acc[movieId]) {
      acc[movieId] = {
        movie: showtime.movie,
        showtimes: [],
      };
    }
    acc[movieId].showtimes.push(showtime);
    return acc;
  }, {} as Record<string, { movie: typeof showtimes[0]['movie']; showtimes: IShowtime[] }>);

  // =============== RENDER ===============

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header với Stepper */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Đặt Vé Xem Phim</h1>
            
            {/* Stepper */}
            <div className="hidden md:flex items-center gap-2">
              {[
                { step: 1, label: 'Chọn Rạp' },
                { step: 2, label: 'Chọn Suất' },
                { step: 3, label: 'Chọn Ghế' },
              ].map((item, index) => (
                <div key={item.step} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${currentStep >= item.step + 1 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}
                  `}>
                    {item.step}
                  </div>
                  <span className={`ml-2 text-sm ${currentStep >= item.step + 1 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    {item.label}
                  </span>
                  {index < 2 && <div className="w-8 h-0.5 bg-gray-200 mx-2" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* STEP 1 & 2: Chọn Hệ thống, Khu vực và Rạp */}
        {(currentStep === BookingStep.SELECT_SYSTEM_AND_CITY || currentStep === BookingStep.SELECT_CINEMA) && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column: Chọn Hệ thống & Khu vực */}
            <div className="lg:col-span-1 space-y-6">
              {/* Hệ thống rạp */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                  Chọn Hệ Thống Rạp
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {cinemaSystems.map(system => (
                    <button
                      key={system._id}
                      onClick={() => handleSelectSystem(system)}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-center
                        ${selectedSystem?._id === system._id
                          ? 'border-red-600 bg-red-50'
                          : 'border-gray-200 hover:border-red-300 bg-white'
                        }
                      `}
                    >
                      {system.logo_url ? (
                        <img src={system.logo_url} alt={system.name} className="h-8 mx-auto mb-1 object-contain" />
                      ) : (
                        <div 
                          className="h-8 w-full rounded flex items-center justify-center text-white font-bold text-xs mb-1"
                          style={{ backgroundColor: system.color_code || '#EF4444' }}
                        >
                          {system.name.substring(0, 3).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-700">{system.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Khu vực */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                  Chọn Khu Vực
                </h2>
                <div className="flex flex-wrap gap-2">
                  {cities.map(city => (
                    <button
                      key={city}
                      onClick={() => handleSelectCity(city)}
                      className={`
                        px-4 py-2 rounded-full text-sm font-medium transition-all
                        ${selectedCity === city
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Danh sách rạp */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
                  Chọn Rạp Chiếu
                  {(selectedSystem || selectedCity) && (
                    <span className="text-sm font-normal text-gray-500">
                      ({cinemas.length} rạp{selectedSystem && ` thuộc ${selectedSystem.name}`}{selectedCity && ` tại ${selectedCity}`})
                    </span>
                  )}
                </h2>

                {loading ? (
                  <div className="text-center py-10 text-gray-500">Đang tải...</div>
                ) : !selectedSystem && !selectedCity ? (
                  <div className="text-center py-10 text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p>Vui lòng chọn hệ thống rạp hoặc khu vực để xem danh sách rạp</p>
                  </div>
                ) : cinemas.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <p>Không tìm thấy rạp nào phù hợp</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cinemas.map(cinema => (
                      <button
                        key={cinema._id}
                        onClick={() => handleSelectCinema(cinema)}
                        className="w-full p-4 rounded-lg border-2 border-gray-100 hover:border-red-300 hover:bg-red-50 transition-all text-left flex items-start gap-4"
                      >
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ backgroundColor: cinema.cinema_system?.color_code || '#EF4444' }}
                        >
                          {cinema.cinema_system?.name?.substring(0, 3).toUpperCase() || 'CIN'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900">{cinema.name}</h3>
                          <p className="text-sm text-gray-500 truncate">{cinema.address}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                            {cinema.city}
                          </span>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Chọn Ngày và Suất chiếu */}
        {currentStep === BookingStep.SELECT_DATE_AND_SHOWTIME && selectedCinema && (
          <div className="space-y-6">
            {/* Back button & Cinema info */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedCinema.name}</h2>
                <p className="text-sm text-gray-500">{selectedCinema.address}</p>
              </div>
            </div>

            {/* Date selector */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Chọn Ngày</h3>
              {availableDates.length === 0 ? (
                <p className="text-gray-500">Hiện tại chưa có suất chiếu nào</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {availableDates.map(date => {
                    const formatted = formatDateVN(date);
                    const isSelected = selectedDate === date;
                    const isToday = date === new Date().toISOString().split('T')[0];
                    
                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`
                          flex-shrink-0 w-16 py-3 rounded-xl text-center transition-all
                          ${isSelected
                            ? 'bg-red-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        <div className="text-xs font-medium opacity-75">
                          {isToday ? 'Hôm nay' : formatted.dayOfWeek}
                        </div>
                        <div className="text-2xl font-bold">{formatted.day}</div>
                        <div className="text-xs">Th{formatted.month}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Showtimes grouped by movie */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Chọn Suất Chiếu</h3>
              
              {loading ? (
                <div className="text-center py-10 text-gray-500">Đang tải...</div>
              ) : Object.keys(groupedShowtimes).length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p>Không có suất chiếu nào trong ngày này</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.values(groupedShowtimes).map(({ movie, showtimes: movieShowtimes }) => (
                    <div key={movie._id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                      <div className="flex gap-4 mb-4">
                        <img
                          src={movie.poster_url}
                          alt={movie.title}
                          className="w-20 h-28 object-cover rounded-lg"
                        />
                        <div>
                          <h4 className="font-bold text-gray-900">{movie.title}</h4>
                          <p className="text-sm text-gray-500">{movie.genre} • {movie.duration} phút</p>
                          <div className="flex items-center gap-1 mt-1">
                            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">{movie.rating}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Group by room type */}
                      <div className="space-y-3">
                        {['2D', '3D', 'IMAX', '4DX'].map(type => {
                          const typeShowtimes = movieShowtimes.filter(s => s.room?.type === type);
                          if (typeShowtimes.length === 0) return null;
                          
                          return (
                            <div key={type} className="flex items-start gap-4">
                              <span className="w-16 text-sm font-medium text-gray-500 pt-2">{type}</span>
                              <div className="flex flex-wrap gap-2">
                                {typeShowtimes.map(showtime => (
                                  <button
                                    key={showtime._id}
                                    onClick={() => handleSelectShowtime(showtime)}
                                    className="px-4 py-2 rounded-lg border-2 border-gray-200 hover:border-red-500 hover:text-red-600 transition text-sm font-medium"
                                  >
                                    {new Date(showtime.start_time).toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Chọn Ghế */}
        {currentStep === BookingStep.SELECT_SEATS && selectedShowtime && (
          <div className="max-w-4xl mx-auto">
            {/* Back button & Showtime info */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedShowtime.movie?.title}</h2>
                <p className="text-sm text-gray-500">
                  {selectedCinema?.name} • {selectedShowtime.room?.name} ({selectedShowtime.room?.type}) • {new Date(selectedShowtime.start_time).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 text-white">
              {/* Screen */}
              <div className="mb-10">
                <div className="w-full h-2 bg-white shadow-[0_10px_30px_rgba(255,255,255,0.3)] rounded-full mb-2"></div>
                <p className="text-center text-gray-500 text-sm uppercase tracking-widest">Màn hình</p>
              </div>

              {/* Seat Grid */}
              <div className="flex flex-col gap-2 mb-8 overflow-x-auto">
                {selectedShowtime.room && Array.from({ length: selectedShowtime.room.rows }).map((_, rowIndex) => {
                  const rowLabel = getRowLabel(rowIndex);
                  
                  return (
                    <div key={rowIndex} className="flex gap-2 justify-center min-w-max">
                      <span className="w-6 text-gray-500 text-sm flex items-center justify-center">{rowLabel}</span>
                      {Array.from({ length: selectedShowtime.room.columns }).map((_, colIndex) => {
                        const seatNumber = colIndex + 1;
                        const seatName = `${rowLabel}${seatNumber}`;
                        const isBooked = selectedShowtime.booked_seats?.includes(seatName);
                        const isSelected = selectedSeats.includes(seatName);

                        return (
                          <button
                            key={seatName}
                            disabled={isBooked}
                            onClick={() => handleSeatClick(seatName, isBooked)}
                            className={`
                              w-9 h-9 rounded-t-lg text-xs font-bold transition flex items-center justify-center
                              ${isBooked
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-green-500 text-white shadow-[0_0_10px_#22c55e] transform scale-110'
                                  : 'bg-gray-200 text-gray-900 hover:bg-white'
                              }
                            `}
                          >
                            {isBooked ? 'X' : seatName}
                          </button>
                        );
                      })}
                      <span className="w-6 text-gray-500 text-sm flex items-center justify-center">{rowLabel}</span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-200 rounded"></div>
                  <span className="text-gray-400">Ghế trống</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-500 rounded shadow-[0_0_5px_#22c55e]"></div>
                  <span className="text-gray-400">Đang chọn</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-700 rounded flex items-center justify-center font-bold text-xs">X</div>
                  <span className="text-gray-400">Đã bán</span>
                </div>
              </div>
            </div>

            {/* Payment Footer */}
            <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <p className="text-sm text-gray-500">Ghế đang chọn</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn'}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Tổng tiền</p>
                    <p className="text-2xl font-bold text-red-600">
                      {(selectedSeats.length * selectedShowtime.price).toLocaleString()}đ
                    </p>
                  </div>

                  <button
                    onClick={handleBooking}
                    disabled={processing || selectedSeats.length === 0}
                    className={`
                      px-8 py-3 rounded-lg font-bold text-lg transition
                      ${processing || selectedSeats.length === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/50'
                      }
                    `}
                  >
                    {processing ? 'Đang xử lý...' : 'ĐẶT VÉ NGAY'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
