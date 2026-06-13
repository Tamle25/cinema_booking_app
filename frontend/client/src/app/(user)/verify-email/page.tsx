'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getErrorMessage, getResponseMessage } from '@/utils/errorMessage';
import { toastSuccess, toastError } from '@/utils/toast';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang tiến hành xác thực tài khoản của bạn...');
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Không tìm thấy mã xác thực. Liên kết này không hợp lệ.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email?token=${token}`, {
          method: 'GET',
        });
        const data = await res.json() as { message?: string };
        if (!res.ok) {
          throw new Error(getResponseMessage(data.message, 'Xác thực tài khoản thất bại.'));
        }
        setStatus('success');
        setMessage(data.message || 'Xác thực tài khoản thành công!');
      } catch (err) {
        setStatus('error');
        setMessage(getErrorMessage(err, 'Mã xác thực không hợp lệ hoặc đã hết hạn.'));
      }
    };

    verify();
  }, [token]);

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || resendCooldown > 0) return;
    setResendLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] py-10 px-4 bg-gray-50/50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-gray-100/80 text-center transition-all duration-300">
        
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-blue-50 rounded-full animate-pulse">
              <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 animate-pulse">Đang xác thực</h2>
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-50 rounded-full scale-110 transition-transform duration-500">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Xác thực thành công!</h2>
              <p className="text-sm text-gray-600">{message}</p>
              <p className="text-xs text-gray-400">Tài khoản của bạn đã được kích hoạt và sẵn sàng sử dụng.</p>
            </div>
            <div className="pt-2">
              <Link
                href="/login"
                className="block w-full px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/20 active:scale-[0.98] transition-all text-center"
              >
                Đăng Nhập Ngay
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-50 rounded-full">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Xác thực thất bại</h2>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
            <div className="pt-2 space-y-3">
              <Link
                href="/login"
                className="block w-full px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 active:scale-[0.98] transition-all text-center"
              >
                Về Trang Đăng Nhập
              </Link>
              <Link
                href="/"
                className="block w-full px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all text-center"
              >
                Về Trang Chủ
              </Link>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100 text-left">
              <p className="text-xs text-gray-500 mb-3 text-center">Bạn chưa nhận được email hoặc liên kết đã hết hạn?</p>
              <form onSubmit={handleResendEmail} className="space-y-3">
                <input
                  type="email"
                  placeholder="Nhập email của bạn để nhận liên kết mới"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-500 text-gray-800 transition-colors"
                />
                <button
                  type="submit"
                  disabled={resendLoading || resendCooldown > 0}
                  className={`w-full px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all text-center disabled:opacity-75`}
                >
                  {resendLoading
                    ? 'Đang gửi...'
                    : resendCooldown > 0
                    ? `Gửi lại sau (${resendCooldown}s)`
                    : 'Gửi lại link kích hoạt'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] py-10 px-4 bg-gray-50/50">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Đang tải...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
