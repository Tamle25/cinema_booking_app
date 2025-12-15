import Link from "next/link";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-md z-50 flex items-center">
      <div className="max-w-6xl mx-auto w-full px-4 flex justify-between items-center">
        {/* 1. LOGO */}
        <Link href="/" className="flex items-center gap-2">
          {/* Bạn có thể thay bằng thẻ <img> logo của bạn sau này */}
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
            C
          </div>
          <span className="text-xl font-bold text-red-600 tracking-tighter">
            CINEMA<span className="text-gray-800">BOOKING</span>
          </span>
        </Link>

        {/* 2. MENU ĐIỀU HƯỚNG (Ẩn trên mobile, hiện trên PC) */}
        <nav className="hidden md:flex items-center gap-8 font-medium text-gray-600">
          <Link href="/" className="hover:text-red-600 transition">
            Trang Chủ
          </Link>
          <Link href="#" className="hover:text-red-600 transition">
            Lịch Chiếu
          </Link>
          <Link href="#" className="hover:text-red-600 transition">
            Tin Tức
          </Link>
          <Link href="#" className="hover:text-red-600 transition">
            Khuyến Mãi
          </Link>
        </nav>

        {/* 3. TÌM KIẾM & NÚT ĐĂNG NHẬP */}
        <div className="flex items-center gap-4">
          {/* Ô tìm kiếm giả lập */}
          <div className="hidden lg:flex items-center bg-gray-100 rounded-full px-3 py-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Tìm tên phim..."
              className="bg-transparent border-none focus:ring-0 text-sm px-2 text-gray-700 outline-none"
            />
          </div>

          <Link
            href="/login"
            className="text-gray-600 font-medium hover:text-red-600"
          >
            Đăng Nhập
          </Link>
          <Link
            href="/register"
            className="bg-red-600 text-white px-4 py-1.5 rounded-full font-bold hover:bg-red-700 transition text-sm"
          >
            Đăng Ký
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
