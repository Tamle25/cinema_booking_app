'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(Array.isArray(data.message) ? data.message[0] : data.message);
      }

      // Đăng ký thành công -> Chuyển sang login
      alert('Đăng ký thành công! Vui lòng đăng nhập.');
      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] py-10 px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full border border-gray-100">
        {/* Tiêu đề */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Đăng Ký</h2>
          <p className="text-gray-500 mt-2 text-sm">Tạo tài khoản để đặt vé ngay</p>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm text-center border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Họ tên */}
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

          {/* Email */}
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

          {/* Mật khẩu */}
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

          {/* Button Submit */}
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

        {/* Link chuyển trang */}
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