'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/utils/toast';
import { getCloudinaryImageUrl, movieImagePresets } from '@/lib/cloudinary';

interface IBooking {
  _id: string;
  showtime: {
    movie: { title: string; poster_url: string };
    cinema: { name: string };
    start_time: string;
  };
  total_price: number;
  status: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { user, updateUser, loading: authLoading } = useAuth();
  const router = useRouter();

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  
  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Password form state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Bookings state
  const [recentBookings, setRecentBookings] = useState<IBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    
    setFullName(user.full_name || '');
    setAvatarUrl(user.avatar_url || '');

    // Lấy lịch sử vé
    const fetchRecentBookings = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/bookings/my-bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRecentBookings(data.slice(0, 3)); // Lấy 3 vé gần nhất
        }
      } catch (error) {
        console.error('Lỗi tải danh sách vé:', error);
      } finally {
        setIsLoadingBookings(false);
      }
    };
    
    fetchRecentBookings();
  }, [user, authLoading, router, API_URL]);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setProfileMessage({ type: 'error', text: 'Tên hiển thị không được để trống' });
      return;
    }

    setIsUpdatingProfile(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ full_name: fullName, avatar_url: avatarUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        updateUser(data); // Cập nhật AuthContext
        toastSuccess('Cập nhật thông tin thành công!');
      } else {
        const err = await res.json();
        toastError(err.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      toastError('Không thể kết nối đến server');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Avatar Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage({ type: 'error', text: 'Kích thước ảnh không được vượt quá 2MB' });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/users/upload-avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.avatar_url);
        
        // Auto update profile to save the new avatar url
        const updateRes = await fetch(`${API_URL}/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ avatar_url: data.avatar_url }),
        });

        if (updateRes.ok) {
          const updatedUser = await updateRes.json();
          updateUser(updatedUser);
          toastSuccess('Cập nhật ảnh đại diện thành công!');
        }
      } else {
        toastError('Upload ảnh thất bại');
      }
    } catch (error) {
      toastError('Lỗi khi upload ảnh');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/users/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });

      if (res.ok) {
        toastSuccess('Đổi mật khẩu thành công!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setIsPasswordModalOpen(false), 1500);
      } else {
        const err = await res.json();
        toastError(err.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      toastError('Không thể kết nối đến server');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500">Đang tải thông tin...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
        <p className="text-gray-500 mt-1">Quản lý thông tin tài khoản và xem lịch sử của bạn</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cột trái: Avatar & Nav */}
        <div className="w-full lg:w-1/3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
            <div className="relative mb-4 group">
              {avatarUrl ? (
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <img src={avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
                  {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload} 
                accept="image/jpeg, image/png, image/webp" 
                className="hidden" 
              />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
            <p className="text-gray-500 text-sm mb-4">{user.email}</p>
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold capitalize">
              Thành viên {user.role === 'admin' ? 'Quản trị' : 'Thường'}
            </span>
          </div>

          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <Link href="/my-tickets" className="block p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center justify-between">
              <span className="font-semibold text-gray-700">Vé của tôi</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <button onClick={() => { localStorage.removeItem('access_token'); router.push('/login'); }} className="w-full p-4 hover:bg-red-50 text-red-600 transition-colors flex items-center justify-between font-semibold text-left">
              Đăng xuất
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cột phải: Form & Lịch sử */}
        <div className="w-full lg:w-2/3 space-y-6">
          
          {/* Form Thông tin cá nhân */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6">Thông tin cá nhân</h3>
            
            {profileMessage.text && profileMessage.type === 'error' && (
              <div className="p-4 rounded-lg mb-6 text-sm bg-red-50 text-red-700 border border-red-100">
                {profileMessage.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 text-gray-900 font-medium bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                  placeholder="Nhập họ và tên"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(Không thể thay đổi)</span></label>
                <input 
                  type="email" 
                  value={user.email}
                  disabled
                  className="w-full px-4 py-2 font-medium bg-gray-100 border border-gray-200 rounded-lg text-gray-800 cursor-not-allowed"
                />
              </div>
              <div className="pt-4 flex justify-between items-center mt-2 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="px-4 py-2 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 border border-gray-200 transition shadow-sm hover:shadow flex items-center gap-2"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Đổi mật khẩu
                </button>

                <button 
                  type="submit" 
                  disabled={isUpdatingProfile}
                  className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition shadow-sm hover:shadow-md disabled:bg-red-400 flex items-center gap-2"
                >
                  {isUpdatingProfile ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : null}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>

          {/* Vé gần đây */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <h3 className="text-xl font-bold text-gray-900">Vé mua gần đây</h3>
              <Link href="/my-tickets" className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline">
                Xem tất cả
              </Link>
            </div>
            
            {isLoadingBookings ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex gap-4 p-4 border border-gray-100 rounded-xl">
                    <div className="w-16 h-20 bg-gray-200 rounded-lg shrink-0"></div>
                    <div className="flex-1 space-y-3 py-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentBookings.length > 0 ? (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div key={booking._id} className="flex gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-16 h-20 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                      {booking.showtime?.movie?.poster_url ? (
                        <img
                          src={getCloudinaryImageUrl(booking.showtime.movie.poster_url, movieImagePresets.posterThumb)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-red-100 flex items-center justify-center text-red-300">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-gray-900 truncate">
                          {booking.showtime?.movie?.title || 'Phim không xác định'}
                        </h4>
                        <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-md shrink-0">
                          {booking.status === 'pending' ? 'Chờ thanh toán' : booking.status === 'confirmed' ? 'Đã thanh toán' : booking.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {booking.showtime?.cinema?.name} • {new Date(booking.showtime?.start_time).toLocaleDateString('vi-VN')}
                      </p>
                      <div className="mt-2 text-red-600 font-semibold text-sm">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.total_price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <p className="text-gray-500">Bạn chưa có vé nào.</p>
                <Link href="/" className="inline-block mt-3 text-red-600 font-medium hover:underline">
                  Đặt vé ngay
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Đổi mật khẩu
              </h3>
              
              {passwordMessage.text && passwordMessage.type === 'error' && (
                <div className="p-4 rounded-lg mb-6 text-sm bg-red-50 text-red-700 border border-red-100">
                  {passwordMessage.text}
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu hiện tại</label>
                  <input 
                    type="password" 
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-2.5 text-gray-900 font-medium bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu mới</label>
                  <input 
                    type="password" 
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 text-gray-900 font-medium bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                    placeholder="Ít nhất 6 ký tự"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Xác nhận mật khẩu</label>
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 text-gray-900 font-medium bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-5 py-2.5 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    disabled={isUpdatingPassword}
                    className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition shadow-sm hover:shadow-md disabled:bg-red-400 flex items-center gap-2"
                  >
                    {isUpdatingPassword ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : null}
                    Xác nhận đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
