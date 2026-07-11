# CineMax — Hệ thống đặt vé xem phim trực tuyến

Ứng dụng web **full-stack** cho phép người dùng tìm phim, chọn suất chiếu, đặt ghế theo thời gian thực và thanh toán online qua **VNPay** / **MoMo**. Hệ thống bao gồm trang quản trị (admin), tích hợp loyalty/voucher và một **chatbot AI** hỗ trợ tư vấn phim.

> Đây là một monorepo gồm 3 service độc lập: **Backend API + Realtime**, **Frontend**, và **Chatbot**.

---

## Mục lục

- [Tính năng chính](#tính-năng-chính)
- [Kiến trúc & Công nghệ](#kiến-trúc--công-nghệ)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Yêu cầu môi trường](#yêu-cầu-môi-trường)
- [Cài đặt & Chạy dự án](#cài-đặt--chạy-dự-án)
- [Cấu hình biến môi trường](#cấu-hình-biến-môi-trường)
- [Thanh toán (VNPay & MoMo)](#thanh-toán-vnpay--momo)
- [Ghi chú phát triển](#ghi-chú-phát-triển)

---

## Tính năng chính

- **Quản lý phim & suất chiếu** — danh sách phim, thể loại, lịch chiếu theo rạp/phòng.
- **Đặt ghế realtime** — khoá ghế qua WebSocket (Socket.IO), tránh xung đột khi nhiều người cùng chọn một ghế.
- **Thanh toán online** — tích hợp **VNPay Sandbox** và **MoMo Sandbox**, có xử lý IPN và settle đơn hàng.
- **Combo, Voucher & Loyalty** — ưu đãi bắp nước, mã giảm giá, tích điểm thành viên.
- **Đánh giá phim** — người dùng đánh giá & bình luận sau khi xem.
- **Xác thực** — đăng ký/đăng nhập bằng JWT, gửi email xác nhận (Nodemailer).
- **Trang quản trị** — quản lý phim, rạp, phòng, suất chiếu, combo, voucher, người dùng.
- **Chatbot AI** — tư vấn phim/suất chiếu dựa trên Google Gemini.
- **Upload ảnh** — lưu trữ poster/ảnh qua Cloudinary.

---

## Kiến trúc & Công nghệ

| Thành phần | Công nghệ | Cổng mặc định |
|------------|-----------|----------------|
| **Frontend** | Next.js 16, React 19, TailwindCSS 4, Socket.IO Client | `3000` |
| **Backend API + Realtime** | NestJS 11, Mongoose, Socket.IO Gateway, Passport JWT | `4000` |
| **Chatbot** | NestJS 11, Google Generative AI (Gemini) | `5005` |
| **Database** | MongoDB | `27017` |
| **Lưu trữ ảnh** | Cloudinary | — |
| **Thanh toán** | VNPay Sandbox, MoMo Sandbox | — |

> Realtime đặt ghế được tích hợp trực tiếp trong backend NestJS (`src/realtime` — Socket.IO Gateway), chạy chung cổng `4000`.

---

## Cấu trúc thư mục

```
GR2/
├── backend/
│   └── server/                 # NestJS API + Realtime (Socket.IO)
│       └── src/
│           ├── auth/           # Đăng ký, đăng nhập, JWT
│           ├── users/          # Người dùng
│           ├── movies/         # Phim
│           ├── genres/         # Thể loại
│           ├── cinemas/        # Rạp
│           ├── cinema-systems/ # Hệ thống rạp
│           ├── rooms/          # Phòng chiếu
│           ├── showtimes/      # Suất chiếu
│           ├── bookings/       # Đặt vé
│           ├── realtime/       # WebSocket khoá ghế (seat.gateway)
│           ├── payments/       # VNPay & MoMo
│           ├── combos/         # Combo bắp nước
│           ├── vouchers/       # Mã giảm giá
│           ├── loyalty/        # Tích điểm thành viên
│           ├── reviews/        # Đánh giá phim
│           ├── news/           # Tin tức
│           ├── mail/           # Gửi email
│           ├── cloudinary/     # Upload ảnh
│           └── uploads/        # Quản lý file
│
├── frontend/
│   └── client/                 # Next.js App Router
│       └── src/
│           ├── app/
│           │   ├── (user)/     # Giao diện người dùng
│           │   └── (admin)/    # Trang quản trị
│           ├── components/
│           ├── context/        # SocketContext, ...
│           ├── hooks/
│           └── lib/
│
├── chatbot/                    # NestJS + Gemini API
│   └── src/
│       ├── chatbot/
│       ├── gemini/
│       ├── intent/
│       ├── prompts/
│       └── backend-api/
│
└── diagrams/                   # Sơ đồ DB (DBML), PlantUML, tài liệu báo cáo
```

---

## Yêu cầu môi trường

- **Node.js** ≥ 18
- **MongoDB** (chạy local tại `localhost:27017` hoặc MongoDB Atlas)
- Tài khoản **Cloudinary** (upload ảnh)
- Tài khoản sandbox **VNPay** và/hoặc **MoMo** (đã có sẵn key sandbox mẫu)
- **Google Gemini API key** (cho chatbot)
- (Tuỳ chọn) **ngrok** — khi test thanh toán MoMo/VNPay từ điện thoại

---

## Cài đặt & Chạy dự án

Mỗi service được cài và chạy độc lập. Mở 3 terminal riêng.

### 1. Backend API + Realtime

```bash
cd backend/server
npm install
cp .env.example .env        # rồi điền các giá trị thật (xem mục bên dưới)
npm run start:dev           # chạy tại http://localhost:4000
```

### 2. Frontend

```bash
cd frontend/client
npm install
npm run dev                 # chạy tại http://localhost:3000
```

### 3. Chatbot

```bash
cd chatbot
npm install
# tạo file .env với GEMINI_API_KEY, PORT=5005, FRONTEND_ORIGIN=http://localhost:3000
npm run start:dev           # chạy tại http://localhost:5005
```

> Đảm bảo **MongoDB đang chạy** trước khi khởi động backend.

---

## Cấu hình biến môi trường

Tạo file `backend/server/.env` dựa trên `backend/server/.env.example`:

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/cinema_db

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# VNPay (Sandbox)
VNPAY_TMN_CODE=...
VNPAY_HASH_SECRET=...
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:4000/payments/vnpay-return
VNPAY_IPN_URL=http://localhost:4000/payments/vnpay-ipn

# MoMo (Sandbox)
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=...
MOMO_SECRET_KEY=...
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_RETURN_URL=http://localhost:4000/payments/momo/return
MOMO_IPN_URL=http://localhost:4000/payments/momo/ipn

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM="Cinema Booking" <your_email@gmail.com>

# Frontend
FRONTEND_URL=http://localhost:3000
```

> **Không commit** file `.env` thật. Chỉ commit `.env.example`. Tuyệt đối không hard-code API Secret trong source.

---

## Thanh toán (VNPay & MoMo)

Cả hai cổng đều redirect browser về **backend** để verify checksum + settle đơn, rồi redirect tiếp về frontend.

### Thẻ test VNPay (Sandbox / NCB)

| Thông tin | Giá trị |
|-----------|---------|
| Ngân hàng | NCB |
| Số thẻ | `9704198526191432198` |
| Tên chủ thẻ | NGUYEN VAN A |
| Ngày phát hành | `07/15` |
| OTP | `123456` |

### Tài khoản test MoMo (Sandbox)

- SĐT: `0900000000` → `0900000009`, OTP: `000000`



---

## Ghi chú phát triển

- **Đặt ghế realtime:** server giữ lock ghế qua cả khi client disconnect ngắn (reconnect không mất ghế). Logic khoá ghế ở `backend/server/src/realtime/seat-lock.service.ts` và `seat.gateway.ts`.
- **Restart backend** sau mỗi lần đổi `.env` để nạp cấu hình mới.
- **Lint & format (backend):**
  ```bash
  npm run lint
  npm run format
  ```
- **Build production:**
  ```bash
  npm run build && npm run start:prod   # backend / chatbot
  npm run build && npm run start         # frontend
  ```
- Sơ đồ cơ sở dữ liệu và tài liệu thiết kế nằm trong thư mục [`diagrams/`](diagrams/).

---

> Dự án phục vụ mục đích học tập / đồ án tốt nghiệp. Các key thanh toán trong `.env.example` là key **sandbox** công khai từ tài liệu chính thức của VNPay/MoMo.
