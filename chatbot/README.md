# CineMax Chatbot Service 🤖

Chatbot hỗ trợ khách hàng cho website đặt vé xem phim CineMax. Chạy như một microservice độc lập, nhận câu hỏi từ frontend, xử lý bằng Gemini API và lấy dữ liệu thật từ backend.

## Công nghệ sử dụng

- **NestJS** v11 + TypeScript
- **Gemini API** (Google AI) — diễn đạt câu trả lời tự nhiên
- **Axios** — gọi API backend
- **Throttler** — rate limiting

## Cài đặt

```bash
cd chatbot
npm install
```

## Cấu hình

Tạo file `.env` trong thư mục `chatbot/`:

```env
PORT=5005
GEMINI_API_KEY=your_gemini_api_key
BACKEND_BASE_URL=http://localhost:4000
FRONTEND_ORIGIN=http://localhost:3000
```

> ⚠️ **Không commit file `.env`** — đã có trong `.gitignore`.

## Chạy

```bash
# Development (auto-reload)
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoint

### POST `/api/chatbot/message`

**Request body:**
```json
{
  "message": "Hôm nay có phim gì đang chiếu?",
  "userId": "optional_user_id",
  "isAuthenticated": false
}
```

**Headers** (nếu user đã đăng nhập):
```
Authorization: Bearer <access_token>
```

**Response thành công:**
```json
{
  "success": true,
  "reply": "Hiện tại có các phim đang chiếu: ..."
}
```

**Response lỗi:**
```json
{
  "success": false,
  "reply": "Xin lỗi, hiện tại chatbot đang gặp sự cố. Vui lòng thử lại sau."
}
```

## Test bằng Postman / cURL

```bash
curl -X POST http://localhost:5005/api/chatbot/message \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Hôm nay có phim gì?\", \"isAuthenticated\": false}"
```

## Chức năng hỗ trợ

| Chức năng | Cần đăng nhập |
|---|---|
| Phim đang chiếu | ❌ |
| Phim sắp chiếu | ❌ |
| Chi tiết phim | ❌ |
| Lịch chiếu / suất chiếu | ❌ |
| Rạp chiếu | ❌ |
| Ghế trống | ❌ |
| Combo bắp nước | ❌ |
| Tin tức phim | ❌ |
| Hướng dẫn đặt vé | ❌ |
| Hướng dẫn thanh toán | ❌ |
| Vé đã đặt / lịch sử | ✅ |

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `GEMINI_API_KEY is required` | Chưa set API key | Tạo file `.env` với `GEMINI_API_KEY` |
| CORS error | Frontend origin không khớp | Kiểm tra `FRONTEND_ORIGIN` trong `.env` |
| Backend API error | Backend chưa chạy | Chạy backend trước: `cd backend/server && npm run start:dev` |
| 429 Too Many Requests | Vượt rate limit | Đợi 1 phút rồi thử lại |

## Kiến trúc

```
Frontend (3000) → Chatbot (5005) → Backend (4000)
                        ↓
                  Gemini API (AI)
```

Chatbot không truy cập trực tiếp MongoDB. Mọi dữ liệu đều lấy qua Backend API.
