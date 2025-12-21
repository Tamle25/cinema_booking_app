// src/app/(admin)/layout.tsx
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      
      {/* --- SIDEBAR CỦA ADMIN --- */}
      <aside style={{ width: '250px', backgroundColor: '#2c3e50', color: 'white', padding: '20px' }}>
        <h2 style={{ marginBottom: '30px', borderBottom: '1px solid #555', paddingBottom: '10px' }}>
          🛡️ QUẢN TRỊ
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <Link href="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>📊 Thống kê (Dashboard)</Link>
          <Link href="/admin/users" style={{ color: 'white', textDecoration: 'none' }}>👥 Quản lý Users</Link>
          <Link href="/admin/movies" style={{ color: 'white', textDecoration: 'none' }}>🎬 Quản lý Phim</Link>
          <hr style={{ borderColor: '#555', width: '100%' }} />
          <Link href="/" style={{ color: '#ff6b6b' }}>⬅️ Về trang chủ</Link>
        </nav>
      </aside>

      {/* --- NỘI DUNG CHÍNH CỦA ADMIN --- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '15px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>
          Xin chào, <strong>Admin</strong>
        </header>
        <main style={{ padding: '20px', backgroundColor: '#f4f6f7', flex: 1 }}>
          {children}
        </main>
      </div>

    </div>
  );
}