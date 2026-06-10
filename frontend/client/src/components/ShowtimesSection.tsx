'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { getCloudinaryImageUrl, movieImagePresets } from '@/lib/cloudinary';

interface ICinemaSystem {
  _id: string;
  name: string;
  logo_url?: string;
}

interface ICinema {
  _id: string;
  name: string;
  address: string;
  city: string;
  cinema_system: { _id: string; name: string; logo_url?: string };
}

interface IMovie {
  _id: string;
  title: string;
  poster_url: string;
  rating: number;
}

interface IShowtime {
  _id: string;
  movie: IMovie;
  room: { _id: string; name: string; type: string };
  start_time: string;
  end_time: string;
}

interface IMovieGroup {
  movie: IMovie;
  showtimes: IShowtime[];
}

export default function ShowtimesSection() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const [cities, setCities] = useState<string[]>([]);
  const [cinemaSystems, setCinemaSystems] = useState<ICinemaSystem[]>([]);
  const [cinemas, setCinemas] = useState<ICinema[]>([]);
  const [showtimes, setShowtimes] = useState<IShowtime[]>([]);

  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedSystemId, setSelectedSystemId] = useState<string>('all');
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [cinemaSearchTerm, setCinemaSearchTerm] = useState('');
  const [isCinemasExpanded, setIsCinemasExpanded] = useState(false);

  const [isLoadingCinemas, setIsLoadingCinemas] = useState(false);
  const [isLoadingShowtimes, setIsLoadingShowtimes] = useState(false);

  const dateTabs = useMemo(() => {
    const tabs: { dateISO: string; dayName: string; dayOfMonth: number; month: number }[] = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
       const nextDate = new Date(today);
       nextDate.setDate(today.getDate() + i);
       
       const dateISO = nextDate.toISOString().split('T')[0];
       
       let dayName = '';
       if (i === 0) dayName = 'Hôm nay';
       else {
         const day = nextDate.getDay();
         dayName = day === 0 ? 'CN' : `Thứ ${day + 1}`;
       }

       tabs.push({
         dateISO,
         dayName,
         dayOfMonth: nextDate.getDate(),
         month: nextDate.getMonth() + 1
       });
    }
    return tabs;
  }, []);

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [citiesRes, systemsRes] = await Promise.all([
          axios.get(`${API_URL}/cinemas/cities`),
          axios.get(`${API_URL}/cinema-systems`)
        ]);
        
        if (citiesRes.data && citiesRes.data.length > 0) {
          setCities(citiesRes.data);
          setSelectedCity('Hà Nội');
          if (!citiesRes.data.includes('Hà Nội')) {
             setSelectedCity(citiesRes.data[0]);
          }
        }
        
        if (systemsRes.data) {
          setCinemaSystems(systemsRes.data);
        }
        
        setSelectedDate(dateTabs[0].dateISO);
      } catch (error) {
        console.error('Lỗi khi tải filter rạp:', error);
      }
    };
    fetchInitData();
  }, [API_URL, dateTabs]);

  useEffect(() => {
    if (!selectedCity) return;
    
    const fetchCinemas = async () => {
      setIsLoadingCinemas(true);
      try {
        let url = `${API_URL}/cinemas/filter?city=${encodeURIComponent(selectedCity)}`;
        if (selectedSystemId !== 'all') {
           url += `&systemId=${selectedSystemId}`;
        }
        const res = await axios.get(url);
        setCinemas(res.data);
        
        if (res.data.length > 0) {
          setSelectedCinemaId(res.data[0]._id);
        } else {
          setSelectedCinemaId('');
        }
      } catch (error) {
        console.error('Lỗi tải danh sách rạp:', error);
      } finally {
        setIsLoadingCinemas(false);
      }
    };
    
    fetchCinemas();
  }, [selectedCity, selectedSystemId, API_URL]);

  useEffect(() => {
    if (!selectedCinemaId || !selectedDate) {
      setShowtimes([]);
      return;
    }

    const fetchShowtimes = async () => {
      setIsLoadingShowtimes(true);
      try {
        const res = await axios.get(`${API_URL}/showtimes/filter?cinemaId=${selectedCinemaId}&date=${selectedDate}`);
        setShowtimes(res.data);
      } catch (error) {
        console.error('Lỗi tải lịch chiếu:', error);
      } finally {
        setIsLoadingShowtimes(false);
      }
    };

    fetchShowtimes();
  }, [selectedCinemaId, selectedDate, API_URL]);

  const filteredCinemas = useMemo(() => {
    if (!cinemaSearchTerm) return cinemas;
    return cinemas.filter(c => c.name.toLowerCase().includes(cinemaSearchTerm.toLowerCase()));
  }, [cinemas, cinemaSearchTerm]);

  const groupedShowtimes = useMemo(() => {
    if (!showtimes || showtimes.length === 0) return [];
    
    const map = new Map<string, IMovieGroup>();
    showtimes.forEach(st => {
       const movieId = st.movie?._id;
       if (!movieId) return;
       
       if (!map.has(movieId)) {
         map.set(movieId, { movie: st.movie, showtimes: [] });
       }
       map.get(movieId)!.showtimes.push(st);
    });
    
    Array.from(map.values()).forEach(group => {
      group.showtimes.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    });

    return Array.from(map.values());
  }, [showtimes]);


  return (
    <div className="max-w-7xl mx-auto px-4 py-12 border-t border-gray-200">
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 inline-block relative pb-2 uppercase tracking-wide">
          Lịch chiếu phim
          <div className="absolute w-1/2 h-1 bg-red-600 bottom-0 left-1/4 rounded-full"></div>
        </h2>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        
        <div className="flex flex-col md:flex-row items-center border-b border-gray-200 bg-gray-50/50">
          
          
          <div className="w-full md:w-[30%] lg:w-[25%] p-3 md:p-4 border-b md:border-b-0 md:border-r border-gray-200 flex items-center shrink-0">
             <span className="text-gray-500 font-medium mr-3 hidden lg:block whitespace-nowrap">Vị trí</span>
             <div className="relative w-full">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <select 
                  className="w-full pl-9 pr-8 py-2 bg-white border border-red-200 text-gray-800 text-sm font-semibold rounded-lg focus:ring-2 focus:ring-red-500 appearance-none outline-none transition shadow-sm cursor-pointer"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
             </div>
          </div>

          <div className="w-full flex-1 overflow-x-auto scrollbar-hide py-2 px-4 flex gap-4 min-w-0">
             <button
                onClick={() => setSelectedSystemId('all')}
                className={`flex flex-col items-center justify-center min-w-[70px] transition-all p-2 rounded-xl group relative ${selectedSystemId === 'all' ? '' : 'opacity-70 hover:opacity-100 hover:bg-gray-100'}`}
             >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border mb-1 transition-all ${selectedSystemId === 'all' ? 'border-red-500 bg-white ring-2 ring-red-100' : 'border-gray-200 bg-white group-hover:border-gray-300'}`}>
                  <span className="text-xs font-bold text-red-600">ALL</span>
                </div>
                <span className={`text-xs font-semibold whitespace-nowrap ${selectedSystemId === 'all' ? 'text-red-600' : 'text-gray-600'}`}>Tất cả</span>
                {selectedSystemId === 'all' && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-600 rounded-full"></div>}
             </button>

             {cinemaSystems.map(system => (
               <button
                  key={system._id}
                  onClick={() => setSelectedSystemId(system._id)}
                  className={`flex flex-col items-center justify-center min-w-[70px] transition-all p-2 rounded-xl group relative ${selectedSystemId === system._id ? '' : 'opacity-70 hover:opacity-100 hover:bg-gray-100'}`}
                  title={system.name}
               >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border mb-1 overflow-hidden bg-white p-1 transition-all ${selectedSystemId === system._id ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200 group-hover:border-gray-300'}`}>
                    {system.logo_url ? (
                      <img src={system.logo_url} alt={system.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="font-bold text-gray-400 text-xs text-center">{system.name.slice(0, 3)}</span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap truncate max-w-[70px] ${selectedSystemId === system._id ? 'text-red-600' : 'text-gray-600'}`}>
                    {system.name}
                  </span>
                  {selectedSystemId === system._id && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-600 rounded-full"></div>}
               </button>
             ))}
          </div>
        </div>

        
        <div className="flex flex-col md:flex-row min-h-[500px]">
          
          
          <div className="w-full md:w-[30%] lg:w-[25%] flex flex-col border-r border-gray-200 bg-white shrink-0 h-[400px] md:h-auto overflow-hidden">
            <div className="p-4 border-b border-gray-100 z-10 shrink-0 bg-white">
               <div className="relative group">
                 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                   <svg className="w-4 h-4 text-gray-400 group-focus-within:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                   </svg>
                 </div>
                 <input 
                   type="text" 
                   placeholder="Tìm theo tên rạp..." 
                   value={cinemaSearchTerm}
                   onChange={e => setCinemaSearchTerm(e.target.value)}
                   className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white hover:border-gray-400 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all shadow-sm"
                 />
                 {cinemaSearchTerm && (
                   <button 
                     onClick={() => setCinemaSearchTerm('')}
                     className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-red-600 transition-colors"
                     title="Xóa tìm kiếm"
                   >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                 )}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 pb-16">
               {isLoadingCinemas ? (
                 <div className="p-4 flex justify-center"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div></div>
               ) : filteredCinemas.length > 0 ? (
                 <div className="divide-y divide-gray-100/60">
                   {(isCinemasExpanded ? filteredCinemas : filteredCinemas.slice(0, 10)).map(cinema => (
                     <button
                       key={cinema._id}
                       onClick={() => setSelectedCinemaId(cinema._id)}
                       className={`w-full text-left flex items-start justify-between p-4 transition-all relative overflow-hidden group ${
                         selectedCinemaId === cinema._id 
                           ? 'bg-red-50/50' 
                           : 'hover:bg-gray-50'
                       }`}
                     >
                        {selectedCinemaId === cinema._id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]"></div>}
                        <div className="flex items-center gap-3 w-full">
                           {cinema.cinema_system?.logo_url ? (
                             <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-white shadow-sm border border-gray-100 p-0.5">
                               <img 
                                 src={cinema.cinema_system.logo_url} 
                                 alt={cinema.cinema_system.name}
                                 className="w-full h-full object-contain"
                                 onError={(e) => {
                                   (e.target as HTMLImageElement).style.display = 'none';
                                   if (e.currentTarget.nextElementSibling) {
                                     (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                   }
                                 }}
                               />
                               <div style={{ display: 'none' }} className={`w-full h-full flex items-center justify-center font-bold text-xs uppercase ${selectedCinemaId === cinema._id ? 'text-red-600' : 'text-gray-500'}`}>
                                 {cinema.name.charAt(0)}
                               </div>
                             </div>
                           ) : (
                             <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-bold text-xs uppercase ${
                                selectedCinemaId === cinema._id ? 'bg-white text-red-600 shadow-sm' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm'
                             }`}>
                               {cinema.cinema_system?.name?.charAt(0) || cinema.name.charAt(0)}
                             </div>
                           )}
                           <h4 className={`text-sm font-semibold pr-2 leading-snug transition-colors flex-1 truncate ${selectedCinemaId === cinema._id ? 'text-red-600' : 'text-gray-800'}`}>
                             {cinema.name}
                           </h4>
                        </div>
                     </button>
                   ))}
                   
                   
                   {filteredCinemas.length > 10 && (
                     <div className="p-3 sticky bottom-0 bg-white border-t border-gray-100/60 shadow-[0_-10px_10px_-10px_rgba(0,0,0,0.05)] z-10 w-full mt-auto">
                       <button
                         onClick={() => setIsCinemasExpanded(!isCinemasExpanded)}
                         className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                       >
                         {isCinemasExpanded ? 'Thu gọn' : `Xem thêm (${filteredCinemas.length - 10} rạp)`}
                         <svg className={`w-4 h-4 transition-transform duration-300 ${isCinemasExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       </button>
                     </div>
                   )}
                 </div>
               ) : (
                 <div className="p-8 text-center text-gray-500 text-sm">
                   Không tìm thấy rạp nào
                 </div>
               )}
            </div>
          </div>

          
          <div className="w-full md:w-[70%] lg:w-[75%] flex flex-col bg-white min-h-[500px]">
            {selectedCinemaId ? (
              <>
                 
                 <div className="p-4 border-b border-gray-100 flex items-start justify-between bg-gray-50/30 shrink-0">
                    <div>
                       <h3 className="text-lg font-bold text-gray-900 leading-tight">
                         Lịch chiếu phim {cinemas.find(c => c._id === selectedCinemaId)?.name}
                       </h3>
                       <p className="text-xs text-gray-500 mt-1 max-w-lg truncate">
                         {cinemas.find(c => c._id === selectedCinemaId)?.address}
                       </p>
                    </div>
                    <a href="#" className="hidden sm:inline-block shrink-0 px-3 py-1 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded hover:bg-gray-50 hover:text-red-600 transition">
                      [ Bản đồ ]
                    </a>
                 </div>

                 
                 <div className="border-b border-gray-200 bg-white z-10 shrink-0">
                   <div className="flex overflow-x-auto scrollbar-hide py-3 px-4 gap-2">
                      {dateTabs.map(tab => {
                        const isActive = selectedDate === tab.dateISO;
                        return (
                          <button
                            key={tab.dateISO}
                            onClick={() => setSelectedDate(tab.dateISO)}
                            className={`flex flex-col items-center justify-center min-w-[65px] sm:min-w-[80px] py-2 rounded-xl transition-all border ${
                               isActive 
                                ? 'bg-red-600 border-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)] scale-105' 
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                             <span className={`text-xs ${isActive ? 'font-medium opacity-90' : 'text-gray-500'}`}>{tab.dayName}</span>
                             <span className="text-xl font-bold mt-0.5">{tab.dayOfMonth.toString().padStart(2, '0')}</span>
                             <span className={`text-[10px] ${isActive ? 'opacity-90' : 'text-gray-400'}`}>Tháng {tab.month}</span>
                          </button>
                        );
                      })}
                   </div>
                 </div>

                 
                 <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-gray-200 bg-gray-50/20">
                    {isLoadingShowtimes ? (
                      <div className="space-y-6">
                        {[1, 2].map(i => (
                          <div key={i} className="flex gap-4 animate-pulse">
                            <div className="w-24 h-36 bg-gray-200 rounded-lg"></div>
                            <div className="flex-1">
                              <div className="h-5 w-2/3 bg-gray-200 rounded mb-2"></div>
                              <div className="h-4 w-1/3 bg-gray-200 rounded mb-4"></div>
                              <div className="flex gap-2">
                                 <div className="h-9 w-24 bg-gray-200 rounded"></div>
                                 <div className="h-9 w-24 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : groupedShowtimes.length > 0 ? (
                       <div className="space-y-6 lg:space-y-8">
                         {groupedShowtimes.map(group => (
                           <div key={group.movie._id} className="flex flex-col sm:flex-row gap-4 lg:gap-6 border-b border-gray-100 pb-6 lg:pb-8 last:border-0">
                              
                              <Link href={`/movie/${group.movie._id}`} className="w-24 sm:w-32 shrink-0 group/img relative rounded-xl overflow-hidden shadow-sm self-start">
                                <img 
                                  src={getCloudinaryImageUrl(group.movie.poster_url, movieImagePresets.posterCard)}
                                  alt={group.movie.title} 
                                  className="w-full object-cover aspect-[2/3] transition-transform duration-500 group-hover/img:scale-110" 
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
                                {group.movie.rating >= 16 && (
                                  <div className="absolute top-1 left-1 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">16+</div>
                                )}
                              </Link>
                              
                              
                              <div className="flex-1">
                                 <Link href={`/movie/${group.movie._id}`}>
                                   <h4 className="text-lg md:text-xl font-bold text-gray-900 hover:text-red-600 transition-colors leading-tight">
                                     {group.movie.title}
                                   </h4>
                                 </Link>
                                 <div className="flex items-center gap-3 text-sm text-gray-500 mt-1.5">
                                   <span className="font-medium text-gray-700">2D Phụ đề</span> 
                                   <span className="opacity-50">•</span>
                                   <span>Bản tiêu chuẩn {group.movie.rating < 16 ? '' : '| Rùng rợn, Ám ảnh'}</span>
                                 </div>
                                 
                                 <div className="mt-4 flex flex-wrap gap-2.5">
                                    {group.showtimes.map(st => {
                                      const start = new Date(st.start_time);
                                      const end = new Date(st.end_time);
                                      
                                      const startStr = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                      const endStr = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                      
                                      return (
                                        <Link 
                                          key={st._id} 
                                          href={`/booking/${st._id}`}
                                          className="group/time relative inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 hover:text-red-600 transition-colors bg-white shadow-sm hover:shadow"
                                        >
                                           <span className="font-bold text-gray-900 group-hover/time:text-red-600 text-lg">
                                             {startStr}
                                           </span>
                                           <span className="text-gray-400 text-xs">
                                             ~ {endStr}
                                           </span>
                                        </Link>
                                      );
                                    })}
                                 </div>
                              </div>
                           </div>
                         ))}
                       </div>
                    ) : (
                       <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl">
                          <h4 className="text-lg font-bold text-gray-900 mb-1">Không có suất chiếu</h4>
                          <p className="text-gray-500 max-w-sm">
                            Rất tiếc rạp này chưa có hoặc đã kết thúc phiên chiếu trong ngày <strong>{dateTabs.find(t=>t.dateISO === selectedDate)?.dayName} ({new Date(selectedDate).toLocaleDateString('vi-VN')})</strong>. Vui lòng chọn ngày hoặc rạp khác!
                          </p>
                       </div>
                    )}
                 </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50/50">
                 <div className="text-center group border border-dashed border-gray-300 rounded-2xl p-8 bg-white shadow-sm">
                   <p className="font-medium text-gray-600">Vui lòng chọn nhánh rạp từ danh sách bên trái<br/>để xem lịch chiếu!</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
