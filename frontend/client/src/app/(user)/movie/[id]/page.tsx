'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { IMovie, IShowtime } from '@/types';
import Link from 'next/link';

const getNext7Days = () => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
};

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [movie, setMovie] = useState<IMovie | null>(null);
  const [showtimes, setShowtimes] = useState<IShowtime[]>([]);
  const [relatedMovies, setRelatedMovies] = useState<IMovie[]>([]); // State cho phim nổi bật
  const [loading, setLoading] = useState(true);

  // State bộ lọc
  const [selectedDate, setSelectedDate] = useState<string>(""); 
  const [selectedCity, setSelectedCity] = useState<string>("All");
  const [days, setDays] = useState<Date[]>([]);

  useEffect(() => {
    setDays(getNext7Days());
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);

    const fetchData = async () => {
      try {
        // Gọi thêm API lấy danh sách tất cả phim để làm phần "Phim nổi bật"
        const [resMovie, resShow, resAllMovies] = await Promise.all([
          fetch(`http://localhost:4000/movies/${id}`),
          fetch(`http://localhost:4000/showtimes/movie/${id}`),
          fetch(`http://localhost:4000/movies`) // Lấy list phim gợi ý
        ]);
        
        const dataMovie = await resMovie.json();
        const dataShow = await resShow.json();
        const dataAllMovies = await resAllMovies.json();
        
        setMovie(dataMovie);
        setShowtimes(dataShow);
        
        // Lọc bỏ phim hiện tại ra khỏi danh sách gợi ý & lấy 5 phim đầu
        setRelatedMovies(dataAllMovies.filter((m: IMovie) => m._id !== id).slice(0, 5));

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  // Logic lọc lịch chiếu
  const uniqueCities = useMemo(() => {
    // @ts-ignore
    const cities = showtimes.map(s => s.cinema?.city || "Khác");
    return ["All", ...Array.from(new Set(cities))];
  }, [showtimes]);

  const filteredShowtimes = useMemo(() => {
    return showtimes.filter(show => {
      const showDate = new Date(show.start_time).toISOString().split('T')[0];
      // @ts-ignore
      const matchCity = selectedCity === "All" || show.cinema?.city === selectedCity;
      return showDate === selectedDate && matchCity;
    });
  }, [showtimes, selectedDate, selectedCity]);

  const groupedShowtimes = useMemo(() => {
    const groups: Record<string, IShowtime[]> = {};
    filteredShowtimes.forEach(show => {
      if (!show.cinema) return;
      const cinemaName = show.cinema.name;
      if (!groups[cinemaName]) groups[cinemaName] = [];
      groups[cinemaName].push(show);
    });
    return groups;
  }, [filteredShowtimes]);


  if (loading) return <div className="text-center py-20 text-white">Đang tải dữ liệu...</div>;
  if (!movie) return <div className="text-center py-20 text-white">Không tìm thấy phim</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      
      {/* --- PHẦN 1: BANNER & INFO (Đã nâng cấp) --- */}
      <div 
        className="relative w-full h-[500px] bg-cover bg-center"
        style={{ backgroundImage: `url(${movie.banner_url})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent flex items-end pb-10">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
                {/* Poster */}
                <div className="hidden md:block col-span-1">
                    <img src={movie.poster_url} className="w-full rounded-lg shadow-2xl border-2 border-gray-600 object-cover" />
                </div>

                {/* Info Text */}
                <div className="col-span-3 mb-2">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-white drop-shadow-lg">
                        {movie.title}
                    </h1>
                    
                    <div className="flex items-center gap-4 text-gray-300 text-sm mb-4">
                        <span className="bg-yellow-500 text-black px-2 py-0.5 rounded font-bold">
                            {movie.rating || 9.5} ★
                        </span>
                        <span>{movie.duration} phút</span>
                        <span>•</span>
                        <span>{new Date(movie.release_date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="uppercase">{movie.genre}</span>
                    </div>

                    {/* Description (Mới thêm) */}
                    <p className="text-gray-300 mb-6 line-clamp-3 md:line-clamp-none max-w-3xl leading-relaxed">
                        {movie.description || "Đang cập nhật nội dung phim..."}
                    </p>

                    {/* Buttons (Mới thêm) */}
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

      {/* --- PHẦN 2: MAIN CONTENT (Chia cột) --- */}
      <div className="container mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-4 gap-10">
        
        {/* CỘT TRÁI: Lịch chiếu & Bộ lọc (Chiếm 3 phần) */}
        <div className="lg:col-span-3">
            <h2 className="text-2xl font-bold mb-6 border-l-4 border-red-500 pl-3">Lịch Chiếu</h2>
            
            {/* Date Picker */}
            <div className="flex gap-4 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                {days.map((date, index) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const isActive = selectedDate === dateStr;
                    return (
                    <button
                        key={index}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`flex-shrink-0 min-w-[80px] px-4 py-3 rounded-lg flex flex-col items-center transition border ${
                            isActive 
                            ? 'bg-red-600 border-red-600 text-white shadow-lg scale-105' 
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                        <span className="text-xs uppercase font-semibold mb-1">
                            {index === 0 ? "Hôm nay" : `Thứ ${date.getDay() + 1}`}
                        </span>
                        <span className="text-2xl font-bold">{date.getDate()}</span>
                    </button>
                    )
                })}
            </div>

            {/* Filter City */}
            <div className="mb-8">
                 <select 
                    className="bg-gray-800 border border-gray-600 text-white px-4 py-2 rounded focus:outline-none focus:border-red-500 min-w-[200px]"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                >
                    {uniqueCities.map(city => (
                        <option key={city} value={city}>{city === "All" ? "Toàn quốc" : city}</option>
                    ))}
                </select>
            </div>

            {/* Showtimes List */}
            <div className="space-y-6">
                {Object.keys(groupedShowtimes).length === 0 ? (
                    <div className="text-center text-gray-500 py-16 bg-gray-800/50 rounded-lg border border-gray-700 border-dashed">
                        Không có suất chiếu nào phù hợp cho ngày này.
                    </div>
                ) : (
                    Object.entries(groupedShowtimes).map(([cinemaName, shows]) => (
                    <div key={cinemaName} className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                            {cinemaName}
                        </h3>
                        <div className="flex flex-wrap gap-3">
                        {shows.sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                            .map(show => (
                            <Link 
                                key={show._id}
                                href={`/booking/${show._id}`}
                                className="group relative bg-gray-700 hover:bg-white hover:text-black border border-gray-600 px-6 py-3 rounded-lg text-center transition duration-200"
                            >
                                <div className="text-lg font-bold">
                                    {new Date(show.start_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                </div>
                                <div className="text-[10px] text-gray-400 group-hover:text-gray-600 uppercase mt-1">
                                    {show.room?.type || 'Standard'}
                                </div>
                            </Link>
                        ))}
                        </div>
                    </div>
                    ))
                )}
            </div>
        </div>

        {/* CỘT PHẢI: Phim nổi bật (Sidebar) (Chiếm 1 phần) */}
        <div className="lg:col-span-1">
            <h3 className="text-xl font-bold mb-6 text-yellow-500">Phim Đang Chiếu</h3>
            <div className="flex flex-col gap-6">
                {relatedMovies.map((m) => (
                    <Link key={m._id} href={`/movies/${m._id}`} className="group flex gap-4 items-start hover:bg-gray-800 p-2 rounded transition">
                        <img 
                            src={m.poster_url} 
                            alt={m.title} 
                            className="w-20 h-28 object-cover rounded shadow-md group-hover:scale-105 transition" 
                        />
                        <div>
                            <h4 className="font-bold text-sm group-hover:text-red-500 transition line-clamp-2">
                                {m.title}
                            </h4>
                            <p className="text-xs text-gray-400 mt-1">{m.genre}</p>
                            <p className="text-xs text-yellow-500 mt-1">★ {m.rating || 9.0}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}