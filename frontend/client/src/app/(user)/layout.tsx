import Header from "@/components/Header";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* Header nằm ở đây */}
      <Header />

      {/* Quan trọng: Vì Header đang để chế độ 'fixed' (trôi nổi), 
        nó sẽ che mất một phần nội dung trên cùng.
        Ta cần thêm padding-top (pt-16) cho phần nội dung chính để đẩy nó xuống.
      */}
      <main className="flex-1 pt-16">{children}</main>

      {/* Footer tạm thời */}
      <footer className="bg-gray-900 text-white py-8 text-center mt-auto">
        <p>© 2024 CinemaBooking. Dự án học tập Next.js & Nest.js.</p>
      </footer>
    </div>
  );
}
