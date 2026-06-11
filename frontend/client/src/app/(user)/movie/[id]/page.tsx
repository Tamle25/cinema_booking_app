'use client';

import SafeImage from '@/components/SafeImage';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { IMovie, IShowtime, ICinemaSystem, ICinema, IReview } from '@/types';
import Link from 'next/link';
import { VIETNAM_PROVINCES } from '@/constants/provinces';
import TrailerModal from '@/components/TrailerModal';
import { useAuth } from '@/context/AuthContext';
import { toastError } from '@/utils/toast';
import { getCloudinaryImageUrl, movieImagePresets } from '@/lib/cloudinary';
import CompareCinemaSection from '@/components/CompareCinemaSection';

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

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type MovieShowtime = Omit<IShowtime, 'cinema'> & {
  cinema: ICinema | string;
};

export default function MovieDetailPage() {
  const params = useParams();
  const id = params.id;

  const [movie, setMovie] = useState<IMovie | null>(null);
  const [showtimes, setShowtimes] = useState<MovieShowtime[]>([]);
  const [relatedMovies, setRelatedMovies] = useState<IMovie[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  const [canReview, setCanReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [userReview, setUserReview] = useState<IReview | null>(null);
  const [isCheckingReview, setIsCheckingReview] = useState(false);

  const [rating, setRating] = useState(10);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [reviews, setReviews] = useState<IReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [totalReviews, setTotalReviews] = useState(0);

  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

  const [cinemaSystems, setCinemaSystems] = useState<ICinemaSystem[]>([]);
  const [cinemas, setCinemas] = useState<ICinema[]>([]);

  const [selectedCity, setSelectedCity] = useState<string>('Hà Nội');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [days, setDays] = useState<Date[]>([]);

  useEffect(() => {
    setDays(getNext14Days());
    const today = formatLocalDate(new Date());
    setSelectedDate(today);
  }, []);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const fetchData = async () => {
      try {
        const [resMovie, resShow, resAllMovies, resCinemaSystems, resCinemas] = await Promise.all([
          fetch(`${API_URL}/movies/${id}`),
          fetch(`${API_URL}/showtimes/movie/${id}`),
          fetch(`${API_URL}/movies`),
          fetch(`${API_URL}/cinema-systems`),
          fetch(`${API_URL}/cinemas`)
        ]);

        const dataMovie = await resMovie.json();
        const dataShow = await resShow.json();
        const dataAllMovies = await resAllMovies.json();
        const dataCinemaSystems = await resCinemaSystems.json();
        const dataCinemas = await resCinemas.json();

        setMovie(dataMovie);
        setShowtimes(dataShow);
        setRelatedMovies(dataAllMovies.filter((m: IMovie) => m._id !== id).slice(0, 5));
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

  const fetchReviews = useCallback(async (page: number, reset = false) => {
    if (!id) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    try {
      setReviewsLoading(true);
      const res = await fetch(`${API_URL}/reviews/${id}?page=${page}&limit=10&sort=highest_rating`);
      const json = await res.json();
      if (reset) {
        setReviews(json.data || []);
      } else {
        setReviews(prev => [...prev, ...(json.data || [])]);
      }
      setHasMoreReviews(json.meta?.hasNextPage || false);
      setTotalReviews(json.meta?.totalItems || 0);
    } catch (err) {
      console.error('Lỗi tải reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      setReviewsPage(1);
      fetchReviews(1, true);
    }
  }, [id, fetchReviews]);

  useEffect(() => {
    if (id && user) {
      const checkReviewPermission = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        
        setIsCheckingReview(true);
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
          const res = await fetch(`${API_URL}/reviews/check/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setCanReview(data.canReview);
            setReviewMessage(data.message);
            
            if (data.hasReviewed && data.review) {
              setUserReview(data.review);
            } else {
              setUserReview(null);
            }
          }
        } catch (err) {
          console.error('Lỗi kiểm tra quyền review:', err);
        } finally {
          setIsCheckingReview(false);
        }
      };
      checkReviewPermission();
    }
  }, [id, user]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!reviewContent.trim() || !canReview || !token) return;

    setIsSubmitting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const url = isEditing && userReview 
        ? `${API_URL}/reviews/${userReview._id}` 
        : `${API_URL}/reviews`;
        
      const method = isEditing && userReview ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          movie_id: id,
          rating,
          content: reviewContent
        })
      });

      if (res.ok) {
        setIsEditing(false);
        setReviewContent('');
        setRating(10);
        
        const resCheck = await fetch(`${API_URL}/reviews/check/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const dataCheck = await resCheck.json();
        if (dataCheck.hasReviewed && dataCheck.review) {
          setUserReview(dataCheck.review);
        }
        
        fetchReviews(1, true);
      } else {
        const errData = await res.json();
        toastError(errData.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error(err);
      toastError('Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    const token = localStorage.getItem('access_token');
    if (!userReview || !token) return;
    if (!confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;
    
    setIsSubmitting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_URL}/reviews/${userReview._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        setUserReview(null);
        fetchReviews(1, true);
        const resCheck = await fetch(`${API_URL}/reviews/check/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const dataCheck = await resCheck.json();
        setCanReview(dataCheck.canReview);
        setReviewMessage(dataCheck.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadMoreReviews = () => {
    const next = reviewsPage + 1;
    setReviewsPage(next);
    fetchReviews(next);
  };

  const getRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(diff / 86400000);
    if (days < 30) return `${days} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  useEffect(() => {
    setSelectedBrand(null);
  }, [selectedCity]);

  const filteredCinemas = useMemo(() => {
    return cinemas.filter(cinema => {
      const matchCity = cinema.city === selectedCity;
      const matchBrand = !selectedBrand ||
        (typeof cinema.cinema_system === 'object'
          ? cinema.cinema_system?._id === selectedBrand
          : cinema.cinema_system === selectedBrand);
      return matchCity && matchBrand;
    });
  }, [cinemas, selectedCity, selectedBrand]);

  const filteredShowtimes = useMemo(() => {
    const filteredCinemaIds = filteredCinemas.map(c => c._id);
    return showtimes.filter(show => {
      if (!show.cinema) return false;
      const showDateTime = new Date(show.start_time);
      const showDate = `${showDateTime.getFullYear()}-${String(showDateTime.getMonth() + 1).padStart(2, '0')}-${String(showDateTime.getDate()).padStart(2, '0')}`;
      const cinemaId = typeof show.cinema === 'object' ? show.cinema?._id : show.cinema;
      if (!cinemaId) return false;
      return showDate === selectedDate && filteredCinemaIds.includes(String(cinemaId));
    });
  }, [showtimes, selectedDate, filteredCinemas]);

  const groupedShowtimes = useMemo(() => {
    const groups: Record<string, { cinema: ICinema; roomTypes: Record<string, MovieShowtime[]> }> = {};

    filteredShowtimes.forEach(show => {
      if (!show.cinema) return;
      const cinema = typeof show.cinema === 'object' && show.cinema?._id ? show.cinema : filteredCinemas.find(c => c._id === show.cinema);
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

    Object.values(groups).forEach(group => {
      Object.keys(group.roomTypes).forEach(roomType => {
        group.roomTypes[roomType].sort((a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
      });
    });

    return groups;
  }, [filteredShowtimes, filteredCinemas]);

  const availableBrands = useMemo(() => {
    const brandIds = new Set<string>();
    cinemas.forEach(cinema => {
      if (cinema.city === selectedCity) {
        const systemId = typeof cinema.cinema_system === 'object'
          ? cinema.cinema_system?._id
          : cinema.cinema_system;
        if (systemId) {
          brandIds.add(systemId);
        }
      }
    });
    return cinemaSystems.filter(system => brandIds.has(system._id));
  }, [cinemas, cinemaSystems, selectedCity]);


  if (loading) return <div className="text-center py-20 text-gray-600">Đang tải dữ liệu...</div>;
  if (!movie) return <div className="text-center py-20 text-gray-600">Không tìm thấy phim</div>;

  const detailBannerUrl = getCloudinaryImageUrl(
    movie.banner_url || movie.poster_url,
    movieImagePresets.bannerHero,
  );

  return (
    <div className="min-h-screen bg-white">

      
      
      <div
        className="relative w-full -mt-16 pt-16 bg-cover bg-center"
        style={{ backgroundImage: `url(${detailBannerUrl})` }}
      >
        
        <div className="bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/60 pt-8 pb-10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end min-h-[380px] md:min-h-[420px]">
              
              <div className="hidden md:block col-span-1">
                <SafeImage
                  src={getCloudinaryImageUrl(movie.poster_url, movieImagePresets.posterDetail)}
                  alt={movie.title}
                  className="w-full aspect-[2/3] rounded-lg shadow-2xl border-2 border-gray-600 object-cover"
                />
              </div>

              
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
                  <span className="uppercase">
                    {movie.genres && movie.genres.length > 0
                      ? movie.genres.map(g => g.name).join(', ')
                      : ''}
                  </span>
                </div>

                
                <p className="text-gray-300 mb-6 line-clamp-3 md:line-clamp-none max-w-3xl leading-relaxed">
                  {movie.description || "Đang cập nhật nội dung phim..."}
                </p>

                
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsTrailerOpen(true)}
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

      
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-4 gap-10 bg-white">

        
        <div className="lg:col-span-3" id="showtimes">
          
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

          {filteredCinemas.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
              <button
                onClick={() => setSelectedBrand(null)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-[70px] h-[70px] rounded-lg border-2 transition ${selectedBrand === null
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
              >
                <span className="text-xs font-bold text-yellow-600">ALL</span>
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
                    <SafeImage src={system.logo_url} alt={system.name} className="w-12 h-12 object-contain" />
                  ) : (
                    <span className="text-xs font-bold text-center px-1">{system.name}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          
          <div className="space-y-4 max-h-[450px] md:max-h-[600px] overflow-y-auto pr-2 movie-detail-scroll-container">
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
                const systemInfo = typeof cinema.cinema_system === 'object'
                  ? cinema.cinema_system
                  : cinemaSystems.find(s => s._id === cinema.cinema_system);

                return (
                  <div key={cinemaId} className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    
                    <div className="flex items-start gap-4 p-4 border-b border-gray-100 bg-gray-50">
                      
                      <div className="flex-shrink-0 w-12 h-12 rounded bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                        {systemInfo?.logo_url ? (
                          <SafeImage src={systemInfo.logo_url} alt={systemInfo.name} className="w-10 h-10 object-contain" />
                        ) : (
                          <span className="text-xs font-bold text-gray-600">{systemInfo?.name?.slice(0, 3) || 'N/A'}</span>
                        )}
                      </div>

                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-lg">{cinema.name}</h3>
                        <p className="text-gray-500 text-sm truncate">{cinema.address}</p>
                      </div>
                    </div>

                    
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


        
        <div className="lg:col-span-1">
          <h3 className="text-xl font-bold mb-6 text-gray-800">Phim Đang Chiếu</h3>
          <div className="flex flex-col gap-4">
            {relatedMovies.map((m) => (
              <Link key={m._id} href={`/movie/${m._id}`} className="group flex gap-4 items-start hover:bg-gray-50 p-2 rounded-lg transition border border-transparent hover:border-gray-200">
                <SafeImage
                  src={getCloudinaryImageUrl(m.poster_url, movieImagePresets.posterThumb)}
                  alt={m.title}
                  className="w-20 h-28 object-cover rounded shadow-md group-hover:scale-105 transition"
                />
                <div>
                  <h4 className="font-bold text-sm text-gray-800 group-hover:text-pink-600 transition line-clamp-2">
                    {m.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {m.genres && m.genres.length > 0
                      ? m.genres.map(g => g.name).join(', ')
                      : ''}
                  </p>
                  <p className="text-xs text-yellow-500 mt-1 font-semibold">★ {m.rating || 9.0}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>

      
      <div className="bg-gray-50 border-t border-gray-100">
        <CompareCinemaSection movieId={id as string} />
      </div>

      
      <div className="container mx-auto px-4 py-12 bg-white">
        <div className="max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold border-l-4 border-red-500 pl-3 text-gray-800">
              Bình Luận Phim
              {totalReviews > 0 && (
                <span className="text-base font-normal text-gray-400 ml-2">({totalReviews})</span>
              )}
            </h2>
          </div>

          
          <div className="mb-10 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            {!user ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">Bạn cần đăng nhập để tham gia đánh giá phim.</p>
                <Link href={`/login?redirect=/movie/${id}`} className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                  Đăng nhập ngay
                </Link>
              </div>
            ) : isCheckingReview ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : userReview && !isEditing ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800">Đánh giá của bạn</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setIsEditing(true);
                        setRating(userReview.rating);
                        setReviewContent(userReview.content);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 bg-blue-50 px-3 py-1 rounded-lg transition-colors"
                    >
                      Sửa
                    </button>
                    <button 
                      onClick={handleDeleteReview}
                      className="text-sm text-red-600 hover:text-red-800 font-medium border border-red-200 bg-red-50 px-3 py-1 rounded-lg transition-colors"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <svg key={i} className={`w-5 h-5 ${i < userReview.rating ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-yellow-600 ml-2 bg-yellow-100 px-2.5 py-0.5 rounded-full">{userReview.rating}/10</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{userReview.content}</p>
                </div>
              </div>
            ) : !canReview && !isEditing ? (
              <div className="text-center py-6 bg-red-50 rounded-lg border border-red-100 shadow-inner">
                <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-700 font-medium">{reviewMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="animate-fade-in">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {isEditing ? 'Chỉnh sửa đánh giá của bạn' : 'Đánh giá bộ phim này'}
                </h3>
                
                
                <div className="mb-8 flex flex-col items-center p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex gap-1.5 md:gap-2 mb-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRating(i + 1)}
                        onMouseEnter={() => setHoverRating(i + 1)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="focus:outline-none transition-transform hover:scale-125"
                      >
                        <svg 
                          className={`w-7 h-7 md:w-9 md:h-9 transition-colors duration-200 ${(hoverRating || rating) > i ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'text-gray-300 hover:text-gray-400'}`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-black text-yellow-600 bg-yellow-100/50 px-6 py-1.5 rounded-full border border-yellow-200 shadow-sm">
                      {hoverRating || rating} <span className="text-sm font-medium text-yellow-700">/ 10</span>
                    </span>
                    <span className="text-xs text-gray-500 mt-2 font-medium">Nhấn vào sao để đánh giá</span>
                  </div>
                </div>

                
                <div className="mb-6 relative">
                  <textarea
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    placeholder="Hãy chia sẻ cảm nhận chân thực của bạn về bộ phim này nhé..."
                    className="w-full border border-gray-300 rounded-xl p-5 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none h-36 text-gray-800 bg-white shadow-inner transition-all"
                    required
                  />
                  <div className="absolute bottom-3 right-4 text-xs text-gray-400 font-medium">
                    {reviewContent.length} ký tự
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setRating(userReview!.rating);
                        setReviewContent(userReview!.content);
                      }}
                      className="px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      Hủy bỏ
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting || !reviewContent.trim()}
                    className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        {isEditing ? 'Lưu thay đổi' : 'Gửi đánh giá'}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          
          {reviews.length === 0 && !reviewsLoading ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <svg className="w-14 h-14 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-500 font-medium">Chưa có đánh giá nào</p>
              <p className="text-gray-400 text-sm mt-1">Hãy mua vé và trở thành người đầu tiên đánh giá!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rv) => {
                const userName = rv.user?.full_name || 'Người dùng';
                const userInitial = userName.charAt(0).toUpperCase();
                return (
                  <div key={rv._id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {userInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">{userName}</span>
                          {rv.is_verified && (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-green-200">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              Đã mua vé
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 10 }).map((_, i) => (
                              <svg key={i} className={`w-3.5 h-3.5 ${i < rv.rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-sm font-bold text-yellow-600">{rv.rating}/10</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-400">{getRelativeTime(rv.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-gray-700 text-sm leading-relaxed">{rv.content}</p>
                  </div>
                );
              })}
            </div>
          )}

          
          {reviewsLoading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          
          {hasMoreReviews && !reviewsLoading && (
            <div className="text-center mt-8">
              <button
                onClick={handleLoadMoreReviews}
                className="px-8 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-full hover:border-red-300 hover:text-red-600 transition-all shadow-sm"
              >
                Xem thêm đánh giá
              </button>
            </div>
          )}
        </div>
      </div>

      
      {movie && (
        <TrailerModal
          isOpen={isTrailerOpen}
          onClose={() => setIsTrailerOpen(false)}
          videoUrl={movie.trailer_url}
        />
      )}
    </div>
  );
}
