// src/app/(user)/login/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext'; // <--- Import Context

export default function LoginPage() {
  const { login } = useAuth(); // <--- Lấy hàm login từ Context
  const [formData, setFormData] = useState({ email: '', password: '' });
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
      // BƯỚC 1: GỌI API LOGIN ĐỂ LẤY TOKEN
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error('Email hoặc mật khẩu không đúng');

      // BƯỚC 2: GỌI TIẾP API PROFILE ĐỂ LẤY TÊN USER (QUAN TRỌNG)
      // Vì API login chưa trả về tên, ta phải dùng token vừa có để hỏi server "Tôi là ai?"
      const profileRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
        headers: { 
          'Authorization': `Bearer ${data.access_token}` 
        },
      });

      let userData;
      if (profileRes.ok) {
        userData = await profileRes.json(); // { full_name: "...", email: "..." }
      } else {
        // Nếu lỗi lấy profile, ta tạm thời dùng email làm tên để không bị crash
        userData = { full_name: 'Người dùng', email: formData.email };
      }

      // BƯỚC 3: CẬP NHẬT CONTEXT
      // Truyền cả token và thông tin user vừa lấy được vào hàm login
      login(data.access_token, userData);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] py-10 px-4 bg-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Đăng Nhập</h2>
          <p className="mt-2 text-sm text-gray-500">Chào mừng bạn quay trở lại!</p>
        </div>

        {error && <div className="p-3 text-sm text-center text-red-600 bg-red-50 rounded-lg">{error}</div>}

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
               <a href="#" className="text-xs text-red-600 hover:underline">Quên mật khẩu?</a>
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