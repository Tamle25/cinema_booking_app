'use client';

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface IMovie {
  _id: string;
  title: string;
  slug: string;
  poster_url: string;
  genre: string;
  duration: number;
  rating: number;
  release_date: string;
}

// Debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

const Header = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [mobileSearchResults, setMobileSearchResults] = useState<IMovie[]>([]);
  const [isMobileSearching, setIsMobileSearching] = useState(false);
  const [showMobileResults, setShowMobileResults] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  const debouncedMobileSearch = useDebounce(mobileSearchQuery, 300);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Search function
  const performSearch = useCallback(async (query: string, isMobile = false) => {
    if (!query.trim()) {
      if (isMobile) {
        setMobileSearchResults([]);
        setShowMobileResults(false);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
      return;
    }

    if (isMobile) {
      setIsMobileSearching(true);
    } else {
      setIsSearching(true);
    }

    try {
      const res = await fetch(`${API_URL}/movies`);
      if (res.ok) {
        const movies: IMovie[] = await res.json();
        // Filter movies by search query
        const filtered = movies.filter(movie => 
          movie.title.toLowerCase().includes(query.toLowerCase()) ||
          movie.genre.toLowerCase().includes(query.toLowerCase())
        );
        
        if (isMobile) {
          setMobileSearchResults(filtered.slice(0, 5));
          setShowMobileResults(true);
        } else {
          setSearchResults(filtered.slice(0, 5));
          setShowResults(true);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      if (isMobile) {
        setIsMobileSearching(false);
      } else {
        setIsSearching(false);
      }
    }
  }, [API_URL]);

  // Desktop search effect
  useEffect(() => {
    performSearch(debouncedSearch, false);
  }, [debouncedSearch, performSearch]);

  // Mobile search effect
  useEffect(() => {
    performSearch(debouncedMobileSearch, true);
  }, [debouncedMobileSearch, performSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setShowMobileResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle movie click
  const handleMovieClick = (movieId: string) => {
    setShowResults(false);
    setShowMobileResults(false);
    setSearchQuery('');
    setMobileSearchQuery('');
    setMobileMenuOpen(false);
    router.push(`/movie/${movieId}`);
  };

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent, query: string) => {
    e.preventDefault();
    if (query.trim()) {
      setShowResults(false);
      setShowMobileResults(false);
      setMobileMenuOpen(false);
      // Navigate to search results page or filter on homepage
      router.push(`/?search=${encodeURIComponent(query.trim())}`);
    }
  };

  // Search Result Item Component
  const SearchResultItem = ({ movie, onClick }: { movie: IMovie; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 hover:bg-red-50 transition-colors text-left"
    >
      <div className="w-12 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
        {movie.poster_url ? (
          <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{movie.title}</p>
        <p className="text-sm text-gray-500 truncate">{movie.genre}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{movie.duration} phút</span>
          {movie.rating > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-yellow-600">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {movie.rating}
            </span>
          )}
        </div>
      </div>
      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );

  // Search Results Dropdown
  const SearchResultsDropdown = ({ 
    results, 
    isLoading, 
    query,
    onMovieClick,
    onSubmit
  }: { 
    results: IMovie[]; 
    isLoading: boolean;
    query: string;
    onMovieClick: (id: string) => void;
    onSubmit: (e: React.FormEvent) => void;
  }) => (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
      {isLoading ? (
        <div className="p-6 text-center">
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
        </div>
      ) : results.length > 0 ? (
        <div>
          <div className="divide-y divide-gray-100">
            {results.map(movie => (
              <SearchResultItem 
                key={movie._id} 
                movie={movie} 
                onClick={() => onMovieClick(movie._id)}
              />
            ))}
          </div>
          <button
            onClick={onSubmit as any}
            className="w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 border-t border-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Xem tất cả kết quả cho "{query}"
          </button>
        </div>
      ) : (
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 font-medium">Không tìm thấy kết quả</p>
          <p className="text-xs text-gray-400 mt-1">Thử tìm với từ khóa khác</p>
        </div>
      )}
    </div>
  );

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-50">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-full">
          {/* LEFT: Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/30">
                C
              </div>
              <span className="text-xl font-bold tracking-tight">
                <span className="text-red-600">CINE</span>
                <span className="text-gray-800">MAX</span>
              </span>
            </Link>
          </div>

          {/* CENTER: Navigation Menu (Desktop) */}
          <nav className="hidden lg:flex items-center justify-center flex-1 px-8">
            <div className="flex items-center gap-1">
              <Link href="/" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                Trang Chủ
              </Link>
              <Link href="/booking" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                Lịch Chiếu
              </Link>
              <Link href="#" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                Tin Tức
              </Link>
              <Link href="#" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                Khuyến Mãi
              </Link>
            </div>
          </nav>

          {/* RIGHT: Search + User Actions */}
          <div className="flex items-center gap-3">
            {/* Search (Desktop) */}
            <div className="hidden md:flex items-center" ref={searchRef}>
              <form onSubmit={(e) => handleSearchSubmit(e, searchQuery)} className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Tìm phim..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowResults(true)}
                  className="w-40 lg:w-56 pl-9 pr-4 py-2 text-sm bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-red-500 focus:bg-white focus:w-64 transition-all placeholder:text-gray-400"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                
                {/* Clear button */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setShowResults(false);
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                
                {/* Search Results Dropdown */}
                {showResults && searchQuery && (
                  <SearchResultsDropdown
                    results={searchResults}
                    isLoading={isSearching}
                    query={searchQuery}
                    onMovieClick={handleMovieClick}
                    onSubmit={(e) => handleSearchSubmit(e, searchQuery)}
                  />
                )}
              </form>
            </div>

            {/* Divider */}
            <div className="hidden md:block h-6 w-px bg-gray-200" />

            {/* User Section */}
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* My Tickets Button */}
                <Link 
                  href="/my-tickets"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Vé của tôi"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <span className="hidden sm:inline">Vé của tôi</span>
                </Link>

                {/* User Info Dropdown */}
                <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                  <Link href="/profile" className="flex items-center gap-2 group" title="Hồ sơ cá nhân">
                    <div className="hidden sm:block text-right">
                      <p className="text-xs text-gray-500 leading-none group-hover:text-red-500 transition-colors">Xin chào</p>
                      <p className="text-sm font-semibold text-gray-900 leading-tight truncate max-w-[100px] group-hover:text-red-600 transition-colors">
                        {user.full_name}
                      </p>
                    </div>
                    {user.avatar_url ? (
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 shadow-md">
                        <img src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`} alt={user.full_name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </Link>
                  <button 
                    onClick={logout}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                    title="Đăng xuất"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Đăng Nhập
                </Link>
                <Link 
                  href="/register" 
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm hover:shadow-md transition-all"
                >
                  Đăng Ký
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors ml-1"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-white border-t border-gray-100 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Mobile Search */}
          <div className="px-4 pt-4 pb-2" ref={mobileSearchRef}>
            <form onSubmit={(e) => handleSearchSubmit(e, mobileSearchQuery)} className="relative">
              <input
                type="text"
                placeholder="Tìm phim, thể loại..."
                value={mobileSearchQuery}
                onChange={(e) => setMobileSearchQuery(e.target.value)}
                onFocus={() => mobileSearchQuery && setShowMobileResults(true)}
                className="w-full pl-10 pr-10 py-3 text-sm bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
              />
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              
              {/* Clear button */}
              {mobileSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileSearchQuery('');
                    setShowMobileResults(false);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </form>
            
            {/* Mobile Search Results */}
            {showMobileResults && mobileSearchQuery && (
              <div className="mt-2 bg-gray-50 rounded-xl overflow-hidden">
                {isMobileSearching ? (
                  <div className="p-4 text-center">
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : mobileSearchResults.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {mobileSearchResults.map(movie => (
                      <SearchResultItem 
                        key={movie._id} 
                        movie={movie} 
                        onClick={() => handleMovieClick(movie._id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Không tìm thấy kết quả
                  </div>
                )}
              </div>
            )}
          </div>
          
          <nav className="px-4 py-3 space-y-1">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
              Trang Chủ
            </Link>
            <Link href="/booking" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
              Lịch Chiếu
            </Link>
            <Link href="#" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
              Tin Tức
            </Link>
            <Link href="#" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
              Khuyến Mãi
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
