import Link from 'next/link';
import React from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar bên trái */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 text-2xl font-bold text-center border-b border-gray-700">
          Admin Panel
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin/dashboard" className="block px-4 py-3 rounded hover:bg-slate-800 transition">
            📊 Dashboard
          </Link>
          <Link href="/admin/movies" className="block px-4 py-3 rounded bg-blue-700 text-white font-medium">
            🎬 Quản lý Phim
          </Link>
          <Link href="/admin/users" className="block px-4 py-3 rounded hover:bg-slate-800 transition">
            👤 Quản lý User
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button className="w-full text-left px-4 py-2 text-red-400 hover:text-red-300">
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Khu vực nội dung chính */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}