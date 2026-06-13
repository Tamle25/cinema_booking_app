'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/utils/toast';
import { getErrorMessage, getResponseMessage } from '@/utils/errorMessage';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json() as { message?: unknown };

      if (!res.ok) {
        throw new Error(getResponseMessage(data.message, 'Đăng ký thất bại'));
      }

      toastSuccess('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
      setIsRegistered(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể đăng ký'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) {
        throw new Error(data.message || 'Không thể gửi lại email xác thực.');
      }
      toastSuccess(data.message || 'Đã gửi lại email xác thực thành công!');
      
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      toastError(err.message || 'Không thể gửi lại email xác thực.');
    } finally {
      setResendLoading(false);
    }
  };

  if (isRegistered) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] py-10 px-4 bg-white">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-md border border-gray-100 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-50 rounded-full">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l8-4.666a2 2 0 012.22 0l8 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Kiểm tra Email của bạn</h2>
            <p className="text-sm text-gray-500">
              Chúng tôi đã gửi một liên kết xác thực tài khoản đến địa chỉ:
            </p>
            <p className="text-sm font-semibold text-gray-900 bg-gray-50 py-1.5 px-3 rounded-lg inline-block border border-gray-100">{formData.email}</p>
            <p className="text-xs text-gray-400 mt-2">
              Vui lòng nhấp vào liên kết trong email để kích hoạt tài khoản của bạn.
            </p>
          </div>
          <div className="pt-2 space-y-3">
            <Link
              href="/login"
              className="block w-full px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/30 transition-all text-center"
            >
              Đi tới Đăng Nhập
            </Link>
            <button
              onClick={handleResendEmail}
              disabled={resendLoading || resendCooldown > 0}
              className={`w-full px-4 py-3 text-sm font-bold border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all text-center ${
                resendLoading || resendCooldown > 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              {resendLoading
                ? 'Đang gửi...'
                : resendCooldown > 0
                ? `Gửi lại sau (${resendCooldown}s)`
                : 'Gửi lại email xác thực'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] py-10 px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full border border-gray-100">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Đăng Ký</h2>
          <p className="text-gray-500 mt-2 text-sm">Tạo tài khoản để đặt vé ngay</p>
        </div>

        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm text-center border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-sm">Họ và tên</label>
            <input
              type="text"
              name="full_name"
              placeholder="Ví dụ: Nguyễn Văn A"
                className="
                    w-full px-4 py-3 rounded-lg
                    bg-gray-50 border border-gray-200 
                    text-gray-900 text-sm font-medium
                    placeholder-gray-400
                    focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                    transition-all duration-200
                "
                onChange={handleChange}
                required
            />
          </div>

          
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-sm">Email</label>
            <input
              type="email"
              name="email"
              placeholder="abc@gmail.com"
                className="
                    w-full px-4 py-3 rounded-lg
                    bg-gray-50 border border-gray-200 
                    text-gray-900 text-sm font-medium
                    placeholder-gray-400
                    focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                    transition-all duration-200
                "
                onChange={handleChange}
                required
            />
          </div>

          
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-sm">Mật khẩu</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
                className="
                    w-full px-4 py-3 rounded-lg
                    bg-gray-50 border border-gray-200 
                    text-gray-900 text-sm font-medium
                    placeholder-gray-400
                    focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                    transition-all duration-200
                "
                onChange={handleChange}
                required
            />
          </div>

          
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-red-600 text-white font-bold py-2.5 rounded-md hover:bg-red-700 transition duration-200 ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Đang xử lý...' : 'Đăng Ký Tài Khoản'}
          </button>
        </form>

        
        <div className="mt-6 text-center text-sm text-gray-600">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-red-600 font-bold hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
