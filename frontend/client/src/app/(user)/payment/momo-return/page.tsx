'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [momoInfo, setMomoInfo] = useState<{
    amount?: string;
    orderId?: string;
    transId?: string;
    resultCode?: string;
    message?: string;
  }>({});

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Lưu thông tin MoMo để hiển thị
        setMomoInfo({
          amount: searchParams.get('amount') || undefined,
          orderId: searchParams.get('orderId') || undefined,
          transId: searchParams.get('transId') || undefined,
          resultCode: searchParams.get('resultCode') || undefined,
          message: searchParams.get('message') || undefined,
        });

        // Lấy tất cả query params từ URL
        const params = new URLSearchParams();
        searchParams.forEach((value, key) => {
          params.append(key, value);
        });

        // Gọi API backend để xác thực
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/payments/momo-return?${params.toString()}`
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
  }, [searchParams]);

  // Format số tiền
  const formatAmount = (amount?: string) => {
    if (!amount) return '0';
    const num = parseInt(amount);
    return num.toLocaleString('vi-VN');
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
          {/* Header */}
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

          {/* Content */}
          <div className="px-6 py-8">
            <p className="text-center text-gray-600 mb-6">{result?.message}</p>

            {/* Chi tiết giao dịch */}
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

            {/* Actions */}
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
                  <button
                    onClick={() => router.back()}
                    className="block w-full bg-pink-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-pink-700 transition-colors"
                  >
                    Thử Lại
                  </button>
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

          {/* Footer Note */}
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
