'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getErrorMessage, getResponseMessage } from '@/utils/errorMessage';
import { toastSuccess } from '@/utils/toast';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!token) {
      setError('Mã token đặt lại mật khẩu không hợp lệ hoặc thiếu.');
    }
  }, [token]);

  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      router.push('/login');
    }
  }, [success, countdown, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Mã token không hợp lệ.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải dài ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json() as { message?: string };

      if (!res.ok) {
        throw new Error(getResponseMessage(data.message, 'Đặt lại mật khẩu thất bại.'));
      }

      toastSuccess(data.message || 'Đặt lại mật khẩu thành công!');
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể đặt lại mật khẩu. Có thể liên kết đã hết hạn hoặc không hợp lệ.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] py-10 px-4 bg-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Đặt Lại Mật Khẩu</h2>
          <p className="mt-2 text-sm text-gray-500">Nhập mật khẩu mới cho tài khoản của bạn.</p>
        </div>

        {error && (
          <div className="p-3 text-sm text-center text-red-600 bg-red-50 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-6 text-center animate-fadeIn">
            <div className="p-4 text-sm text-green-700 bg-green-50 rounded-lg border border-green-100">
              Đặt lại mật khẩu thành công! Hệ thống sẽ tự động chuyển hướng về trang đăng nhập sau {countdown} giây.
            </div>
            <div className="pt-2">
              <Link
                href="/login"
                className="block w-full px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/30 transition-all text-center"
              >
                Đăng Nhập Ngay
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">Mật khẩu mới</label>
              <input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg
                      bg-gray-50 border border-gray-200 
                      text-gray-900 text-sm font-medium
                      focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                      transition-all duration-200"
                required
                disabled={!token}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg
                      bg-gray-50 border border-gray-200 
                      text-gray-900 text-sm font-medium
                      focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                      transition-all duration-200"
                required
                disabled={!token}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/30 transition-all disabled:opacity-70"
            >
              {loading ? 'Đang thực hiện...' : 'Đặt Lại Mật Khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] py-10 px-4 bg-gray-50/50">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Đang tải...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
