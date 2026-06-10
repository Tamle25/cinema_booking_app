'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError, toastWarning } from '@/utils/toast';

interface PaymentResult {
  success: boolean;
  message: string;
  bookingId?: string;
  transactionId?: string;
}

function MomoReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [momoInfo, setMomoInfo] = useState<{
    amount?: string;
    orderId?: string;
    transId?: string;
    resultCode?: string;
    message?: string;
  }>({});

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        setMomoInfo({
          amount: searchParams.get('amount') || undefined,
          orderId: searchParams.get('orderId') || undefined,
          transId: searchParams.get('transId') || undefined,
          resultCode: searchParams.get('resultCode') || undefined,
          message: searchParams.get('message') || undefined,
        });

        const params = new URLSearchParams();
        searchParams.forEach((value, key) => {
          params.append(key, value);
        });

        const response = await fetch(
          `${API_URL}/payments/momo-return?${params.toString()}`
        );
        const data = await response.json();
        setResult(data);
      } catch (error) {
        console.error('Lỗi xác thực thanh toán:', error);
        setResult({
          success: false,
          message: 'Không thể xác thực thanh toán. Vui lòng liên hệ hỗ trợ.',
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, API_URL]);

  const formatAmount = (amount?: string) => {
    if (!amount) return '0';
    const num = parseInt(amount);
    return num.toLocaleString('vi-VN');
  };

  const handleRetryPayment = async () => {
    if (!result?.bookingId) {
      toastWarning('Không tìm thấy mã đặt vé để thử lại.');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      toastWarning('Bạn cần đăng nhập để thực hiện thanh toán.');
      router.push('/login');
      return;
    }

    setRetrying(true);
    try {
      const response = await fetch(`${API_URL}/payments/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId: result.bookingId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.payUrl) {
        window.location.href = data.payUrl;
      } else {
        toastError(data.message || 'Không thể tạo lại thanh toán. Vui lòng đặt vé mới.');
        setRetrying(false);
      }
    } catch (error) {
      console.error('Lỗi retry payment:', error);
      toastError('Có lỗi xảy ra, vui lòng thử lại.');
      setRetrying(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!result?.bookingId) {
      router.push('/');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/');
      return;
    }

    if (!confirm('Bạn có chắc muốn hủy đơn hàng này? Ghế sẽ được mở lại cho người khác.')) {
      return;
    }

    setCancelling(true);
    try {
      const response = await fetch(`${API_URL}/payments/cancel-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId: result.bookingId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toastSuccess('Đã hủy đơn hàng. Bạn có thể đặt vé mới.');
        router.push('/');
      } else {
        toastError(data.message || 'Không thể hủy đơn hàng.');
        setCancelling(false);
      }
    } catch (error) {
      console.error('Lỗi cancel booking:', error);
      toastError('Có lỗi xảy ra.');
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Đang xác thực thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          
          <div className={`px-6 py-8 text-center ${result?.success ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
            {result?.success ? (
              <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <h1 className="text-2xl font-bold text-white">
              {result?.success ? 'Thanh Toán Thành Công!' : 'Thanh Toán Thất Bại'}
            </h1>
          </div>

          
          <div className="px-6 py-8">
            <p className="text-center text-gray-600 mb-6">{result?.message}</p>

            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
              {result?.bookingId && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-500">Mã đặt vé:</span>
                  <span className="font-semibold text-gray-900">{result.bookingId}</span>
                </div>
              )}
              {(result?.transactionId || momoInfo.transId) && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-500">Mã giao dịch MoMo:</span>
                  <span className="font-semibold text-gray-900">{result?.transactionId || momoInfo.transId}</span>
                </div>
              )}
              {momoInfo.orderId && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-500">Mã đơn hàng:</span>
                  <span className="font-semibold text-gray-900">{momoInfo.orderId}</span>
                </div>
              )}
              {momoInfo.amount && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-500">Số tiền:</span>
                  <span className="font-semibold text-pink-600">{formatAmount(momoInfo.amount)} VNĐ</span>
                </div>
              )}
              {momoInfo.resultCode && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500">Mã kết quả:</span>
                  <span className={`font-semibold ${momoInfo.resultCode === '0' ? 'text-green-600' : 'text-red-600'}`}>
                    {momoInfo.resultCode}
                  </span>
                </div>
              )}
            </div>

            
            <div className="space-y-3">
              {result?.success ? (
                <>
                  <Link
                    href="/my-tickets"
                    className="block w-full bg-pink-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-pink-700 transition-colors"
                  >
                    Xem Vé Của Tôi
                  </Link>
                  <Link
                    href="/"
                    className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Về Trang Chủ
                  </Link>
                </>
              ) : (
                <>
                  
                  {result?.bookingId && (
                    <button
                      onClick={handleRetryPayment}
                      disabled={retrying || cancelling}
                      className="block w-full bg-pink-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {retrying ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Đang tạo thanh toán mới...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Thanh Toán Lại
                        </>
                      )}
                    </button>
                  )}

                  
                  {result?.bookingId && (
                    <button
                      onClick={handleCancelBooking}
                      disabled={retrying || cancelling}
                      className="block w-full bg-orange-500 text-white text-center py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      {cancelling ? 'Đang hủy đơn...' : 'Hủy Đơn & Đặt Vé Mới'}
                    </button>
                  )}

                  <Link
                    href="/"
                    className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Về Trang Chủ
                  </Link>
                </>
              )}
            </div>
          </div>

          
          <div className="px-6 py-4 bg-gray-50 border-t">
            <p className="text-xs text-gray-500 text-center">
              Nếu có vấn đề về thanh toán, vui lòng liên hệ hotline: <span className="font-semibold">1900 1234</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MomoReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Đang tải...</p>
        </div>
      </div>
    }>
      <MomoReturnContent />
    </Suspense>
  );
}

