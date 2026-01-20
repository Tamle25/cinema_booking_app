# Hướng Dẫn Tích Hợp MoMo Payment Gateway

## 1. Tổng Quan Luồng Thanh Toán

```
[Frontend] -> [Backend API] -> [MoMo API] -> [Redirect User] -> [MoMo App/Web]
                                                  |
                                                  v
[Frontend] <- [Backend API] <- [MoMo Callback/IPN]
```

### Các bước thanh toán:
1. **User chọn ghế** → Click "Thanh toán MoMo"
2. **Frontend** gọi `POST /payments/create-momo` với `showtime_id` và `seats`
3. **Backend** tạo booking (status=pending), tạo MoMo payment URL
4. **Frontend** redirect user đến `payUrl` của MoMo
5. **User** thanh toán trên MoMo (quét QR / nhập OTP)
6. **MoMo** gọi IPN callback (POST) đến backend → cập nhật booking
7. **MoMo** redirect user về `returnUrl` → Frontend hiển thị kết quả

---

## 2. Cấu Hình Environment (.env)

```env
# MoMo Sandbox Configuration
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_RETURN_URL=http://localhost:3000/payment/momo-return
MOMO_IPN_URL=https://your-ngrok-url.ngrok.io/payments/momo-ipn
```

---

## 3. Setup Ngrok cho IPN URL (BẮT BUỘC)

**MoMo không thể gọi localhost!** Bạn cần dùng ngrok để expose backend ra internet.

### Bước 1: Cài đặt ngrok
```bash
# Windows (dùng Chocolatey)
choco install ngrok

# Hoặc download từ https://ngrok.com/download
```

### Bước 2: Đăng ký & lấy authtoken
1. Đăng ký tài khoản tại https://ngrok.com
2. Lấy authtoken từ dashboard
3. Cấu hình:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Bước 3: Chạy ngrok
```bash
# Expose port 4000 (backend)
ngrok http 4000
```

Bạn sẽ nhận được URL như: `https://abc123.ngrok.io`

### Bước 4: Cập nhật .env
```env
MOMO_IPN_URL=https://abc123.ngrok.io/payments/momo-ipn
```

### Bước 5: Restart backend
```bash
npm run start:dev
```

---

## 4. API Endpoints

### 4.1. Tạo thanh toán MoMo
```http
POST /payments/create-momo
Authorization: Bearer <token>
Content-Type: application/json

{
  "showtime_id": "648abc123def456",
  "seats": ["A1", "A2"]
}
```

Response:
```json
{
  "payUrl": "https://test-payment.momo.vn/...",
  "bookingId": "648xyz789...",
  "orderId": "MOMO1737380000123456"
}
```

### 4.2. MoMo Return URL (xử lý sau thanh toán)
```http
GET /payments/momo-return?orderId=...&resultCode=0&...
```

### 4.3. MoMo IPN URL (server-to-server)
```http
POST /payments/momo-ipn
Content-Type: application/json

{
  "partnerCode": "MOMO",
  "orderId": "MOMO1737380000123456",
  "resultCode": "0",
  ...
}
```

### 4.4. Kiểm tra trạng thái booking
```http
GET /payments/status/:bookingId
```

### 4.5. Test thanh toán (không cần auth)
```http
GET /payments/test-payment
```

---

## 5. Tài Khoản Test MoMo Sandbox

| Thông tin | Giá trị |
|-----------|---------|
| Số điện thoại | 0900000000 - 0900000009 |
| OTP | 000000 |
| Môi trường | Sandbox (test-payment.momo.vn) |

**Lưu ý:** Cần cài app MoMo Test hoặc quét QR bằng camera để test

---

## 6. MoMo Result Codes

| Code | Ý nghĩa |
|------|---------|
| 0 | Thành công |
| 1000 | Hệ thống đang bảo trì |
| 1001 | Tài khoản không đủ số dư |
| 1002 | Giao dịch bị từ chối |
| 1003 | Giao dịch bị hủy bỏ |
| 1004 | Số tiền vượt quá hạn mức |
| 1005 | URL/QR đã hết hạn |
| 1006 | User từ chối thanh toán |
| 1017 | Giao dịch bị hủy bởi user |

---

## 7. Booking Status Flow

```
[pending] -----> [confirmed]  (thanh toán thành công)
    |
    +-----> [failed]      (thanh toán thất bại)
    |
    +-----> [expired]     (hết hạn 15 phút)
    |
    +-----> [cancelled]   (user hủy)
```

---

## 8. Troubleshooting

### Lỗi "Không thể tạo thanh toán MoMo"
- Kiểm tra config trong .env
- Kiểm tra log backend để xem response từ MoMo

### IPN không được gọi
- Đảm bảo ngrok đang chạy
- Kiểm tra MOMO_IPN_URL trong .env đã cập nhật URL ngrok chưa
- Restart backend sau khi thay đổi .env

### Booking không được confirm sau thanh toán
- Kiểm tra log IPN trong backend
- Verify signature có đúng không
- Kiểm tra amount có khớp không

---

## 9. Test Nhanh

1. Start backend: `cd backend/server && npm run start:dev`
2. Start ngrok: `ngrok http 4000`
3. Cập nhật MOMO_IPN_URL trong .env
4. Restart backend
5. Truy cập: `http://localhost:4000/payments/test-payment`
6. Copy `payUrl` và mở trong browser
7. Quét QR bằng app MoMo Test hoặc dùng số test

---

## 10. Production Checklist

- [ ] Thay thế sandbox credentials bằng production credentials
- [ ] Đổi endpoint sang production: `https://payment.momo.vn/v2/gateway/api/create`
- [ ] Cập nhật MOMO_RETURN_URL sang domain production
- [ ] Cập nhật MOMO_IPN_URL sang domain production
- [ ] Enable HTTPS cho cả frontend và backend
- [ ] Test đầy đủ các case: thành công, thất bại, hủy, timeout
