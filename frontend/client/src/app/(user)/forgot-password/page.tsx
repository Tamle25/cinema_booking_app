'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getErrorMessage, getResponseMessage } from '@/utils/errorMessage';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json() as { message?: string };

      if (!res.ok) {
        throw new Error(getResponseMessage(data.message, 'Gửi yêu cầu đặt lại mật khẩu thất bại.'));
      }

      setSuccessMessage(data.message || 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] py-10 px-4 bg-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Quên Mật Khẩu</h2>
          <p className="mt-2 text-sm text-gray-500">
            Nhập email của bạn để nhận liên kết đặt lại mật khẩu.
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-center text-red-600 bg-red-50 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {successMessage ? (
          <div className="space-y-6 text-center animate-fadeIn">
            <div className="p-4 text-sm text-green-700 bg-green-50 rounded-lg border border-green-100">
              {successMessage}
            </div>
            <p className="text-xs text-gray-500">
              Vui lòng kiểm tra hộp thư đến (và hòm thư rác/spam) của bạn.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="block w-full px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/30 transition-all text-center"
              >
                Về Trang Đăng Nhập
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">Email tài khoản</label>
              <input
                type="email"
                name="email"
                placeholder="abc@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg
                      bg-gray-50 border border-gray-200 
                      text-gray-900 text-sm font-medium
                      placeholder-gray-400
                      focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                      transition-all duration-200"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/30 transition-all disabled:opacity-70"
            >
              {loading ? 'Đang gửi yêu cầu...' : 'Gửi Hướng Dẫn Đặt Lại'}
            </button>
            
            <div className="text-sm text-center text-gray-600 pt-2">
              Quay lại <Link href="/login" className="font-bold text-red-600 hover:underline">Đăng nhập</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
