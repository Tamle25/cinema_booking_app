'use client';

import SafeImage from '@/components/SafeImage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/utils/toast';
import { getCloudinaryImageUrl, movieImagePresets } from '@/lib/cloudinary';
import type { IPointTransaction, IMembershipInfo, IVoucher, IUserVoucher } from '@/types';
import Pagination from '@/components/Pagination';

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

  const [activeTab, setActiveTab] = useState<'personal' | 'membership' | 'exchange' | 'my-vouchers' | 'tickets'>('personal');

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  const [membershipInfo, setMembershipInfo] = useState<IMembershipInfo | null>(null);
  const [pointsHistory, setPointsHistory] = useState<IPointTransaction[]>([]);
  const [isLoadingMembership, setIsLoadingMembership] = useState(false);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);

  const [exchangeableVouchers, setExchangeableVouchers] = useState<IVoucher[]>([]);
  const [myVouchers, setMyVouchers] = useState<IUserVoucher[]>([]);
  const [isLoadingExchange, setIsLoadingExchange] = useState(false);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [isExchangingId, setIsExchangingId] = useState<string | null>(null);

  const [exchangeModal, setExchangeModal] = useState<{
    open: boolean;
    voucher: IVoucher | null;
  }>({ open: false, voucher: null });

  const [allBookings, setAllBookings] = useState<IBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  // States phân trang & lọc cho các tab
  const [pointsPage, setPointsPage] = useState(1);
  const [pointsTotalPages, setPointsTotalPages] = useState(1);
  const [pointsTotal, setPointsTotal] = useState(0);
  const pointsLimit = 5;

  const [exchangePage, setExchangePage] = useState(1);
  const [exchangeTotalPages, setExchangeTotalPages] = useState(1);
  const [exchangeTotal, setExchangeTotal] = useState(0);
  const exchangeLimit = 4;

  const [myVouchersPage, setMyVouchersPage] = useState(1);
  const [myVouchersTotalPages, setMyVouchersTotalPages] = useState(1);
  const [myVouchersTotal, setMyVouchersTotal] = useState(0);
  const myVouchersLimit = 4;

  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsTotalPages, setBookingsTotalPages] = useState(1);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingStatus, setBookingStatus] = useState<string>('');
  const bookingsLimit = 5;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const userId = user?._id || user?.id;
  const userFullName = user?.full_name;
  const userAvatarUrl = user?.avatar_url;

  const getRankGradient = (rank?: string) => {
    switch (rank) {
      case 'Silver': return 'from-slate-400 to-slate-600';
      case 'Gold': return 'from-amber-500 via-yellow-500 to-amber-600 border border-yellow-400/30';
      case 'Platinum': return 'from-teal-500 via-cyan-500 to-emerald-600';
      case 'Diamond': return 'from-indigo-600 via-purple-600 to-pink-600';
      default: return 'from-gray-500 to-gray-700';
    }
  };

  const getRankDiscount = (rank?: string) => {
    switch (rank) {
      case 'Silver': return 1;
      case 'Gold': return 3;
      case 'Platinum': return 5;
      case 'Diamond': return 8;
      default: return 0;
    }
  };

  const getTransactionTypeStyle = (type: string) => {
    switch (type) {
      case 'EARN': return { bg: 'bg-green-50 text-green-700 border-green-200', text: '+', label: 'Tích điểm' };
      case 'REFUND': return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: '+', label: 'Hoàn điểm' };
      case 'REDEEM': return { bg: 'bg-red-50 text-red-700 border-red-200', text: '-', label: 'Đổi voucher' };
      case 'EXPIRE': return { bg: 'bg-gray-50 text-gray-500 border-gray-200', text: '-', label: 'Hết hạn' };
      case 'ADJUST': return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: '', label: 'Điều chỉnh' };
      default: return { bg: 'bg-gray-50 text-gray-700 border-gray-200', text: '', label: 'Khác' };
    }
  };

  const loadMembershipData = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setIsLoadingMembership(true);
    try {
      const res = await fetch(`${API_URL}/loyalty/membership`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembershipInfo(data);
        updateUser({
          availablePoints: data.availablePoints,
          lifetimePoints: data.lifetimePoints,
          membershipRank: data.membershipRank
        });
      }
    } catch (error) {
      console.error('Lỗi tải thông tin membership:', error);
    } finally {
      setIsLoadingMembership(false);
    }
  }, [API_URL, updateUser]);

  const loadPointsHistory = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setIsLoadingPoints(true);
    try {
      const res = await fetch(`${API_URL}/loyalty/points-history?page=${pointsPage}&limit=${pointsLimit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPointsHistory(data.transactions || data || []);
        if (data.pagination) {
          setPointsTotalPages(data.pagination.totalPages || 1);
          setPointsTotal(data.pagination.total || 0);
        } else {
          setPointsTotalPages(Math.ceil((data.length || 0) / pointsLimit) || 1);
          setPointsTotal(data.length || 0);
        }
      }
    } catch (error) {
      console.error('Lỗi tải lịch sử điểm:', error);
    } finally {
      setIsLoadingPoints(false);
    }
  }, [API_URL, pointsPage]);

  const loadExchangeableVouchers = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setIsLoadingExchange(true);
    try {
      const res = await fetch(`${API_URL}/vouchers/exchangeable?page=${exchangePage}&limit=${exchangeLimit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.vouchers) {
          setExchangeableVouchers(data.vouchers);
          setExchangeTotalPages(data.pagination?.totalPages || 1);
          setExchangeTotal(data.pagination?.total || 0);
        } else {
          setExchangeableVouchers(data);
          setExchangeTotalPages(1);
          setExchangeTotal(data.length || 0);
        }
      }
    } catch (error) {
      console.error('Lỗi tải danh sách voucher đổi điểm:', error);
    } finally {
      setIsLoadingExchange(false);
    }
  }, [API_URL, exchangePage]);

  const loadMyVouchers = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setIsLoadingVouchers(true);
    try {
      const res = await fetch(`${API_URL}/vouchers/my-vouchers?page=${myVouchersPage}&limit=${myVouchersLimit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.vouchers) {
          setMyVouchers(data.vouchers);
          setMyVouchersTotalPages(data.pagination?.totalPages || 1);
          setMyVouchersTotal(data.pagination?.total || 0);
        } else {
          setMyVouchers(data);
          setMyVouchersTotalPages(1);
          setMyVouchersTotal(data.length || 0);
        }
      }
    } catch (error) {
      console.error('Lỗi tải danh sách voucher cá nhân:', error);
    } finally {
      setIsLoadingVouchers(false);
    }
  }, [API_URL, myVouchersPage]);

  const loadBookings = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setIsLoadingBookings(true);
    try {
      const statusQuery = bookingStatus ? `&status=${bookingStatus}` : '';
      const res = await fetch(`${API_URL}/bookings/my-bookings?page=${bookingsPage}&limit=${bookingsLimit}${statusQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bookings) {
          setAllBookings(data.bookings);
          setBookingsTotalPages(data.pagination?.totalPages || 1);
          setBookingsTotal(data.pagination?.total || 0);
        } else {
          let filtered = data;
          if (bookingStatus) {
            filtered = data.filter((b: IBooking) => b.status === bookingStatus);
          }
          setAllBookings(filtered);
          setBookingsTotalPages(1);
          setBookingsTotal(filtered.length || 0);
        }
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [API_URL, bookingsPage, bookingStatus]);

  useEffect(() => {
    if (userFullName || userAvatarUrl) {
      setFullName(userFullName || '');
      setAvatarUrl(userAvatarUrl || '');
    }
  }, [userFullName, userAvatarUrl]);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      router.push('/login');
      return;
    }
    loadMembershipData();
  }, [userId, authLoading, router, loadMembershipData]);

  useEffect(() => {
    if (activeTab === 'membership') {
      loadPointsHistory();
    } else if (activeTab === 'exchange') {
      loadExchangeableVouchers();
    } else if (activeTab === 'my-vouchers') {
      loadMyVouchers();
    } else if (activeTab === 'tickets') {
      loadBookings();
    }
  }, [activeTab, loadExchangeableVouchers, loadMyVouchers, loadPointsHistory, loadBookings]);

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
        updateUser(data);
        toastSuccess('Cập nhật thông tin thành công!');
      } else {
        const err = await res.json();
        toastError(err.message || 'Có lỗi xảy ra');
      }
    } catch {
      toastError('Không thể kết nối đến server');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

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
        
        const updateRes = await fetch(`${API_URL}/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            avatar_url: data.avatar_url,
            avatar_public_id: data.avatar_public_id || data.public_id || '',
          }),
        });

        if (updateRes.ok) {
          const updatedUser = await updateRes.json();
          updateUser(updatedUser);
          toastSuccess('Cập nhật ảnh đại diện thành công!');
        }
      } else {
        toastError('Upload ảnh thất bại');
      }
    } catch {
      toastError('Lỗi khi upload ảnh');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
    } catch {
      toastError('Không thể kết nối đến server');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleOpenExchangeModal = (voucher: IVoucher) => {
    const currentPoints = user?.availablePoints || 0;
    if (currentPoints < voucher.requiredPoints) {
      toastError('Bạn không đủ điểm để đổi voucher này!');
      return;
    }
    setExchangeModal({ open: true, voucher });
  };

  const handleConfirmExchange = async () => {
    const voucher = exchangeModal.voucher;
    if (!voucher) return;

    setIsExchangingId(voucher._id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/vouchers/exchange/${voucher._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const result = await res.json();
        toastSuccess(`Đổi voucher thành công! Mã của bạn: ${result.voucher?.code || result.code || ''}`); 
        setExchangeModal({ open: false, voucher: null });
        loadMembershipData();
        loadExchangeableVouchers();
        loadPointsHistory();
      } else {
        const err = await res.json();
        toastError(err.message || 'Đổi voucher thất bại');
      }
    } catch {
      toastError('Không thể kết nối đến server');
    } finally {
      setIsExchangingId(null);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toastSuccess('Đã copy mã voucher!');
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
        <p className="text-gray-500 mt-1">Quản lý thông tin tài khoản, tích điểm thành viên và voucher của bạn</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        <div className="w-full lg:w-1/3 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
            <div className="relative mb-4 group">
              {avatarUrl ? (
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <SafeImage src={avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`} alt="Avatar" className="w-full h-full object-cover" />
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
              Thành viên {user.role === 'admin' ? 'Quản trị' : user.membershipRank || 'Thường'}
            </span>

            
            <div className={`w-full mt-5 p-5 rounded-2xl bg-gradient-to-r ${getRankGradient(user.membershipRank)} text-white shadow-lg relative overflow-hidden text-left border border-white/10`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl transform translate-x-8 -translate-y-8"></div>
              <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-black/15 rounded-full blur-lg"></div>
              
              <div className="relative z-10 flex flex-col justify-between h-28">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/70">Thẻ Thành Viên</p>
                    <p className="text-lg font-extrabold tracking-wide mt-0.5">{user.membershipRank || 'Member'}</p>
                  </div>
                  <div className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                    Giảm {getRankDiscount(user.membershipRank)}%
                  </div>
                </div>
                
                <div className="flex justify-between items-end mt-auto">
                  <div>
                    <p className="text-[10px] text-white/70 uppercase tracking-widest">Điểm khả dụng</p>
                    <p className="text-xl font-black tracking-wide mt-0.5">
                      {new Intl.NumberFormat('vi-VN').format(user.availablePoints || 0)} <span className="text-xs font-medium">điểm</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/70 uppercase tracking-widest">Mã TV</p>
                    <p className="font-mono text-xs font-bold bg-black/20 px-2 py-0.5 rounded border border-white/5">
                      #{user._id?.substring(user._id.length - 8).toUpperCase() || '00000000'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={() => setActiveTab('personal')} 
              className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center justify-between font-semibold text-left ${activeTab === 'personal' ? 'bg-red-50/70 text-red-600 border-l-4 border-l-red-600' : 'text-gray-700'}`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Thông tin cá nhân
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('membership')} 
              className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center justify-between font-semibold text-left ${activeTab === 'membership' ? 'bg-red-50/70 text-red-600 border-l-4 border-l-red-600' : 'text-gray-700'}`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Hạng & Lịch sử điểm
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('exchange')} 
              className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center justify-between font-semibold text-left ${activeTab === 'exchange' ? 'bg-red-50/70 text-red-600 border-l-4 border-l-red-600' : 'text-gray-700'}`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 10v4m0-4h-4m4 0h4m-5 10h6a2 2 0 002-2V9a2 2 0 00-2-2h-6A2 2 0 006 9v10a2 2 0 002 2z" />
                </svg>
                Đổi điểm lấy Voucher
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('my-vouchers')} 
              className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center justify-between font-semibold text-left ${activeTab === 'my-vouchers' ? 'bg-red-50/70 text-red-600 border-l-4 border-l-red-600' : 'text-gray-700'}`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                Voucher của tôi
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('tickets')} 
              className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center justify-between font-semibold text-left ${activeTab === 'tickets' ? 'bg-red-50/70 text-red-600 border-l-4 border-l-red-600' : 'text-gray-700'}`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                Vé của tôi
              </span>
            </button>
          </div>
        </div>

        
        <div className="w-full lg:w-2/3 space-y-6">
          
          
          {activeTab === 'personal' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-200">
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
          )}

          
          {activeTab === 'membership' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6">Thông tin Hạng Thành Viên</h3>
                
                {isLoadingMembership ? (
                  <div className="flex justify-center py-6">
                    <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : membershipInfo ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Hạng hiện tại:</span>
                          <span className="font-bold text-red-600">{membershipInfo.membershipRank}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Ưu đãi giảm giá vé/combo:</span>
                          <span className="font-bold text-gray-900">{membershipInfo.discountPercent}%</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Điểm trọn đời (lifetime):</span>
                          <span className="font-bold text-gray-900">
                            {new Intl.NumberFormat('vi-VN').format(membershipInfo.lifetimePoints)} điểm
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl flex flex-col justify-center border border-gray-100">
                        {membershipInfo.nextRank ? (
                          <>
                            <p className="text-xs text-gray-500">Hạng tiếp theo: <span className="font-bold text-gray-700">{membershipInfo.nextRank.nextRank}</span></p>
                            <p className="text-lg font-bold text-gray-900 mt-1">
                              Cần tích lũy thêm {new Intl.NumberFormat('vi-VN').format(membershipInfo.nextRank.pointsNeeded)} điểm
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            Chúc mừng! Bạn đã đạt hạng cao nhất (Diamond)
                          </p>
                        )}
                      </div>
                    </div>

                    
                    {membershipInfo.nextRank && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                            {membershipInfo.membershipRank} (Hiện tại)
                          </span>
                          <span className="flex items-center gap-1 text-red-600 font-extrabold">
                            {membershipInfo.nextRank.nextRank} (Mục tiêu)
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                          </span>
                        </div>
                        
                        <div className="relative">
                          <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden border border-gray-200 shadow-inner flex items-center">
                            {(() => {
                              const currentPoints = membershipInfo.lifetimePoints;
                              const targetPoints = membershipInfo.nextRank.nextRankMinPoints;
                              const percent = Math.min(Math.max((currentPoints / targetPoints) * 100, 0), 100);
                              
                              return (
                                <>
                                  <div 
                                    className={`h-full bg-gradient-to-r ${getRankGradient(membershipInfo.nextRank.nextRank)} transition-all duration-500 ease-out flex items-center justify-end pr-2`}
                                    style={{ width: `${percent}%` }}
                                  >
                                    {percent > 15 && (
                                      <span className="text-[10px] font-black text-white drop-shadow-md">
                                        {percent.toFixed(1)}%
                                      </span>
                                    )}
                                  </div>
                                  {percent <= 15 && (
                                    <span className="absolute left-2 text-[10px] font-black text-gray-700">
                                      {percent.toFixed(1)}%
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>0 điểm</span>
                          <span className="font-semibold text-gray-700">
                            Đã tích lũy: {new Intl.NumberFormat('vi-VN').format(membershipInfo.lifetimePoints)} / {new Intl.NumberFormat('vi-VN').format(membershipInfo.nextRank.nextRankMinPoints)} điểm
                          </span>
                        </div>

                        <div className="p-3 bg-red-50/60 rounded-xl border border-red-100/50 text-xs text-red-800 leading-relaxed shadow-sm">
                          Bạn đã đi được <strong className="font-extrabold">{((membershipInfo.lifetimePoints / membershipInfo.nextRank.nextRankMinPoints) * 100).toFixed(1)}%</strong> chặng đường. Chỉ cần tích lũy thêm <strong className="font-extrabold text-red-600">{new Intl.NumberFormat('vi-VN').format(membershipInfo.nextRank.pointsNeeded)}</strong> điểm nữa để thăng hạng lên <strong className="font-extrabold">{membershipInfo.nextRank.nextRank}</strong> và nhận đặc quyền giảm giá <strong className="font-extrabold text-red-600">{getRankDiscount(membershipInfo.nextRank.nextRank)}%</strong> cho mọi đơn hàng!
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Không thể tải thông tin hạng.</p>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6">Lịch sử điểm thưởng</h3>
                
                {isLoadingPoints ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl w-full"></div>
                    ))}
                  </div>
                ) : pointsHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="pb-3">Mô tả</th>
                          <th className="pb-3">Loại</th>
                          <th className="pb-3 text-center">Số điểm</th>
                          <th className="pb-3 text-right">Ngày giao dịch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-sm">
                        {pointsHistory.map((tx) => {
                          const style = getTransactionTypeStyle(tx.type);
                          return (
                            <tr key={tx._id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 font-semibold text-gray-800">{tx.description}</td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${style.bg}`}>
                                  {style.label}
                                </span>
                              </td>
                              <td className="py-4 text-center font-bold">
                                <span className={tx.points > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {style.text}{new Intl.NumberFormat('vi-VN').format(Math.abs(tx.points))}
                                </span>
                              </td>
                              <td className="py-4 text-right text-gray-500">
                                {new Date(tx.createdAt).toLocaleDateString('vi-VN')} {new Date(tx.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <Pagination
                      currentPage={pointsPage}
                      totalPages={pointsTotalPages}
                      onPageChange={setPointsPage}
                      totalItems={pointsTotal}
                      itemsPerPage={pointsLimit}
                      theme="red"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    Bạn chưa có giao dịch điểm nào. Điểm sẽ tự động tích lũy khi bạn thanh toán thành công vé xem phim!
                  </div>
                )}
              </div>
            </div>
          )}

          
          {activeTab === 'exchange' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                <h3 className="text-xl font-bold text-gray-900">Đổi điểm lấy quà</h3>
                <div className="text-sm">
                  Điểm của bạn: <span className="font-extrabold text-red-600">{new Intl.NumberFormat('vi-VN').format(user.availablePoints || 0)}</span>
                </div>
              </div>

              {isLoadingExchange ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse border border-gray-100 rounded-2xl h-44 w-full"></div>
                  ))}
                </div>
              ) : exchangeableVouchers.length > 0 ? (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {exchangeableVouchers.map((voucher) => {
                      const isPointsEnough = (user.availablePoints || 0) >= voucher.requiredPoints;
                      
                      return (
                        <div key={voucher._id} className="border border-gray-100 hover:border-red-100 hover:shadow-md transition duration-200 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-white to-gray-50 group">
                          
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>

                          <div className="pl-2">
                            <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-full border border-red-100">
                              Yêu cầu {new Intl.NumberFormat('vi-VN').format(voucher.requiredPoints)} điểm
                            </span>
                            <h4 className="font-extrabold text-gray-900 text-lg mt-2 group-hover:text-red-600 transition-colors">
                              {voucher.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {voucher.description}
                            </p>
                            <div className="mt-3 space-y-1 text-xs text-gray-400">
                              <div>• Đơn tối thiểu: {new Intl.NumberFormat('vi-VN').format(voucher.minOrderAmount)}đ</div>
                              <div>• Hiệu lực: {voucher.validDaysAfterExchange} ngày kể từ khi đổi</div>
                              {voucher.usageLimit > 0 && (
                                <div>• Đã đổi: {voucher.exchangedCount}/{voucher.usageLimit}</div>
                              )}
                            </div>
                          </div>

                          <div className="mt-5 pl-2 pt-3 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-sm font-black text-red-600">
                              {voucher.discountType === 'PERCENT' ? `Giảm ${voucher.discountValue}%` : `Giảm ${new Intl.NumberFormat('vi-VN').format(voucher.discountValue)}đ`}
                            </span>
                            <button
                              onClick={() => handleOpenExchangeModal(voucher)}
                              disabled={!isPointsEnough || isExchangingId === voucher._id}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                                isPointsEnough
                                  ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {isExchangingId === voucher._id ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : isPointsEnough ? (
                                'Đổi ngay'
                              ) : (
                                'Chưa đủ điểm'
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Pagination
                    currentPage={exchangePage}
                    totalPages={exchangeTotalPages}
                    onPageChange={setExchangePage}
                    totalItems={exchangeTotal}
                    itemsPerPage={exchangeLimit}
                    theme="red"
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Hiện tại không có voucher nào cho phép đổi điểm. Vui lòng quay lại sau!
                </div>
              )}
            </div>
          )}

          
          {activeTab === 'my-vouchers' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-200">
              <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6">Mã giảm giá của bạn</h3>

              {isLoadingVouchers ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse border border-gray-100 rounded-2xl h-36 w-full"></div>
                  ))}
                </div>
              ) : myVouchers.length > 0 ? (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {myVouchers.map((uv) => {
                      const isUnused = uv.status === 'UNUSED';
                      const isExpired = uv.status === 'EXPIRED' || new Date(uv.expiredAt) < new Date();
                      const isUsed = uv.status === 'USED';

                      let statusBadge = (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-bold border border-green-200">Chưa dùng</span>
                      );
                      if (isUsed) {
                        statusBadge = (
                          <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded text-xs font-bold border border-gray-200">Đã sử dụng</span>
                        );
                      } else if (isExpired) {
                        statusBadge = (
                          <span className="px-2 py-0.5 bg-red-50 text-red-400 rounded text-xs font-bold border border-red-200">Hết hạn</span>
                        );
                      }

                      return (
                        <div 
                          key={uv._id} 
                          className={`border rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between bg-white ${
                            isUnused ? 'border-gray-200 shadow-sm hover:shadow-md' : 'border-gray-100 opacity-60'
                          }`}
                        >
                          
                          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-r border-gray-200 rounded-full z-10 hidden md:block"></div>
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-l border-gray-200 rounded-full z-10 hidden md:block"></div>

                          <div className="md:px-2">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-black text-red-600">
                                {uv.voucherTemplate.discountType === 'PERCENT' ? `GIẢM ${uv.voucherTemplate.discountValue}%` : `GIẢM ${new Intl.NumberFormat('vi-VN').format(uv.voucherTemplate.discountValue)}đ`}
                              </span>
                              {statusBadge}
                            </div>

                            <h4 className="font-extrabold text-gray-900 mt-2 text-md leading-snug">
                              {uv.voucherTemplate.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {uv.voucherTemplate.description}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-2">
                              Hạn dùng: {new Date(uv.expiredAt).toLocaleDateString('vi-VN')}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-dashed border-gray-100 flex justify-between items-center md:px-2">
                            <span className="font-mono text-sm font-extrabold text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                              {uv.code}
                            </span>
                            
                            {isUnused && !isExpired ? (
                              <button
                                onClick={() => handleCopyCode(uv.code)}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition cursor-pointer"
                              >
                                Copy mã
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">Không khả dụng</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Pagination
                    currentPage={myVouchersPage}
                    totalPages={myVouchersTotalPages}
                    onPageChange={setMyVouchersPage}
                    totalItems={myVouchersTotal}
                    itemsPerPage={myVouchersLimit}
                    theme="red"
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Bạn chưa đổi voucher nào. Hãy tích điểm và đổi voucher ở tab bên cạnh nhé!
                </div>
              )}
            </div>
          )}

          
          {activeTab === 'tickets' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6 flex-wrap gap-4">
                <h3 className="text-xl font-bold text-gray-900">Tất cả vé của bạn</h3>
                
                {/* Bộ lọc trạng thái vé */}
                <div className="flex gap-2 text-xs font-semibold overflow-x-auto py-1">
                  {[
                    { value: '', label: 'Tất cả' },
                    { value: 'confirmed', label: 'Đã thanh toán' },
                    { value: 'pending', label: 'Chờ thanh toán' },
                    { value: 'cancelled', label: 'Đã hủy' }
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => {
                        setBookingStatus(filter.value);
                        setBookingsPage(1); // Reset page về 1 khi đổi bộ lọc
                      }}
                      className={`px-3 py-1.5 rounded-full border transition cursor-pointer shrink-0 ${
                        bookingStatus === filter.value
                          ? 'bg-red-50 text-red-600 border-red-200 font-bold'
                          : 'bg-white text-gray-600 border-gray-200 hover:text-red-600 hover:border-red-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
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
              ) : allBookings.length > 0 ? (
                <div>
                  <div className="space-y-4">
                    {allBookings.map((booking) => (
                      <div key={booking._id} className="flex gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="w-16 h-20 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                          {booking.showtime?.movie?.poster_url ? (
                            <SafeImage
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
                            <span className={`text-xs font-semibold px-2 py-1 rounded-md shrink-0 ${
                              booking.status === 'confirmed' 
                                ? 'bg-green-100 text-green-700' 
                                : booking.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {booking.status === 'pending' ? 'Chờ thanh toán' : booking.status === 'confirmed' ? 'Đã thanh toán' : booking.status === 'cancelled' ? 'Đã hủy' : booking.status === 'expired' ? 'Hết hạn' : booking.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {booking.showtime?.cinema?.name} • {new Date(booking.showtime?.start_time).toLocaleDateString('vi-VN')} {new Date(booking.showtime?.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <div className="mt-2 text-red-600 font-semibold text-sm">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.total_price)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    currentPage={bookingsPage}
                    totalPages={bookingsTotalPages}
                    onPageChange={setBookingsPage}
                    totalItems={bookingsTotal}
                    itemsPerPage={bookingsLimit}
                    theme="red"
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">Bạn chưa có vé nào ở trạng thái này.</p>
                  <Link href="/" className="inline-block mt-3 text-red-600 font-medium hover:underline">
                    Đặt vé ngay
                  </Link>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in duration-200">
            <button 
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition cursor-pointer"
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
                    className="px-5 py-2.5 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition cursor-pointer"
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

      
      {exchangeModal.open && exchangeModal.voucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in duration-200">
            <button 
              onClick={() => setExchangeModal({ open: false, voucher: null })}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-6">
              
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 10v4m0-4h-4m4 0h4" />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-gray-900 text-center mb-1">Xác nhận đổi điểm</h3>
              <p className="text-sm text-gray-500 text-center mb-6">Bạn có chắc chắn muốn đổi điểm lấy voucher này không?</p>

              
              <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4 mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Tên voucher</span>
                  <span className="text-sm font-bold text-gray-900 text-right max-w-[60%] truncate">{exchangeModal.voucher.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Giá trị</span>
                  <span className="text-sm font-bold text-red-600">
                    {exchangeModal.voucher.discountType === 'PERCENT' 
                      ? `Giảm ${exchangeModal.voucher.discountValue}%` 
                      : `Giảm ${new Intl.NumberFormat('vi-VN').format(exchangeModal.voucher.discountValue)}đ`}
                  </span>
                </div>
                <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-center">
                  <span className="text-sm text-gray-500">Điểm cần dùng</span>
                  <span className="text-sm font-extrabold text-orange-600">
                    {new Intl.NumberFormat('vi-VN').format(exchangeModal.voucher.requiredPoints)} điểm
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Điểm hiện có</span>
                  <span className="text-sm font-extrabold text-green-600">
                    {new Intl.NumberFormat('vi-VN').format(user?.availablePoints || 0)} điểm
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Điểm còn lại sau đổi</span>
                  <span className="text-sm font-bold text-gray-700">
                    {new Intl.NumberFormat('vi-VN').format((user?.availablePoints || 0) - exchangeModal.voucher.requiredPoints)} điểm
                  </span>
                </div>
              </div>

              
              <div className="flex gap-3">
                <button 
                  onClick={() => setExchangeModal({ open: false, voucher: null })}
                  className="flex-1 px-4 py-2.5 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 border border-gray-200 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleConfirmExchange}
                  disabled={isExchangingId === exchangeModal.voucher._id}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition shadow-sm hover:shadow-md disabled:bg-red-400 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isExchangingId === exchangeModal.voucher._id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Xác nhận đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
