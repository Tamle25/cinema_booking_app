'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage, getResponseMessage } from '@/utils/errorMessage';
import { toastSuccess, toastError } from '@/utils/toast';

interface LoginResponse {
  access_token: string;
  message?: unknown;
}

interface LoginUser {
  full_name: string;
  email: string;
  role?: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowResend(false);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json() as LoginResponse;

      if (!res.ok) throw new Error(getResponseMessage(data.message, 'Email hoặc mật khẩu không đúng'));

      const profileRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
        headers: { 
          'Authorization': `Bearer ${data.access_token}` 
        },
      });

      let userData: LoginUser;
      if (profileRes.ok) {
        userData = await profileRes.json();
      } else {
        userData = { full_name: 'Người dùng', email: formData.email };
      }
      
      if (login) {
         login(data.access_token, userData);
      }
      
    } catch (err) {
      const errMsg = getErrorMessage(err, 'Không thể đăng nhập');
      setError(errMsg);
      if (errMsg.toLowerCase().includes('chưa được xác thực') || errMsg.toLowerCase().includes('xác thực tài khoản')) {
        setShowResend(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!formData.email || resendCooldown > 0) return;
    setResendLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) {
        throw new Error(getResponseMessage(data.message, 'Gửi lại email xác thực thất bại'));
      }
      toastSuccess(data.message || 'Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư của bạn.');
      
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
    } catch (err) {
      toastError(getErrorMessage(err, 'Không thể gửi lại email xác thực'));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] py-10 px-4 bg-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Đăng Nhập</h2>
          <p className="mt-2 text-sm text-gray-500">Chào mừng bạn quay trở lại!</p>
        </div>

        {error && (
          <div className="p-3.5 text-sm text-center text-red-600 bg-red-50 rounded-lg border border-red-100 space-y-2">
            <div>{error}</div>
            {showResend && (
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={resendLoading || resendCooldown > 0}
                className="text-xs font-bold text-blue-600 hover:underline focus:outline-none block mx-auto disabled:opacity-50"
              >
                {resendLoading
                  ? 'Đang gửi lại...'
                  : resendCooldown > 0
                  ? `Gửi lại sau (${resendCooldown}s)`
                  : 'Gửi lại email xác thực ngay'}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900">Email</label>
            <input
              type="email"
              name="email"
              placeholder="abc@gmail.com"
              className="w-full px-4 py-3 rounded-lg
                    bg-gray-50 border border-gray-200 
                    text-gray-900 text-sm font-medium
                    placeholder-gray-400
                    focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                    transition-all duration-200"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
               <label className="text-sm font-medium text-gray-900">Mật khẩu</label>
               <Link href="/forgot-password" className="text-xs text-red-600 hover:underline">Quên mật khẩu?</Link>
            </div>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg
                    bg-gray-50 border border-gray-200 
                    text-gray-900 text-sm font-medium
                    placeholder-gray-400
                    focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                    transition-all duration-200"
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/30 transition-all disabled:opacity-70"
          >
            {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
          </button>
        </form>
        
        <p className="text-sm text-center text-gray-600">
          Chưa có tài khoản? <Link href="/register" className="font-bold text-red-600 hover:underline">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}
