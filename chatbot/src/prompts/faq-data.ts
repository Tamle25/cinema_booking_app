export interface FAQItem {
  keywords: string[];
  question: string;
  answer: string;
  url?: string;
  label?: string;
}

export const FAQ_DATA: FAQItem[] = [
  {
    keywords: ['hoàn vé', 'hoan ve', 'trả vé', 'tra ve', 'hủy vé', 'huy ve', 'hoàn tiền', 'hoan tien'],
    question: 'Chính sách hoàn vé và hủy vé như thế nào?',
    answer: 'CineMax hỗ trợ hoàn/hủy vé trước giờ chiếu ít nhất 60 phút đối với vé đã thanh toán online. Số tiền hoàn sẽ được cộng vào Ví thành viên hoặc chuyển về tài khoản ngân hàng của bạn trong vòng 3-5 ngày làm việc. Vui lòng truy cập Lịch sử đặt vé trong trang cá nhân để thực hiện hoàn vé.',
    url: '/my-tickets',
    label: 'Vé của tôi'
  },
  {
    keywords: ['đổi vé', 'doi ve', 'đổi suất', 'doi suat', 'thay đổi vé', 'thay doi ve'],
    question: 'Tôi có được đổi vé sau khi đã mua không?',
    answer: 'Bạn có thể đổi vé sang suất chiếu khác của cùng một bộ phim hoặc đổi vị trí ghế trước giờ chiếu 60 phút. Vui lòng mang vé đến trực tiếp quầy vé tại rạp để được nhân viên hỗ trợ đổi vé nhé.',
    url: '/news',
    label: 'Xem hướng dẫn'
  },
  {
    keywords: ['thanh toán', 'thanh toan', 'momo', 'vnpay', 'thẻ', 'atm', 'credit card'],
    question: 'Các phương thức thanh toán được hỗ trợ là gì?',
    answer: 'CineMax hỗ trợ nhiều phương thức thanh toán trực tuyến linh hoạt bao gồm: Ví điện tử MoMo, Cổng VNPAY, Thẻ ATM nội địa và Thẻ tín dụng quốc tế (Visa/Mastercard/JCB). Mọi giao dịch đều được bảo mật tuyệt đối.',
    url: '/booking',
    label: 'Xem lịch chiếu'
  },
  {
    keywords: ['hướng dẫn đặt', 'huong dan dat', 'cách đặt vé', 'cach dat ve', 'đặt vé thế nào', 'dat ve the nao'],
    question: 'Làm thế nào để đặt vé xem phim trên website?',
    answer: 'Để đặt vé trên CineMax, bạn thực hiện các bước sau:\n1. Chọn bộ phim bạn muốn xem.\n2. Chọn Rạp và Suất chiếu phù hợp.\n3. Chọn vị trí ghế ngồi trên sơ đồ phòng chiếu.\n4. Chọn combo bắp nước đi kèm (nếu có).\n5. Xác nhận thông tin và tiến hành thanh toán trực tuyến. Sau khi thành công, vé sẽ xuất hiện trong phần "Vé của tôi".'
  },
  {
    keywords: ['thành viên', 'thanh vien', 'tích điểm', 'tich diem', 'hạng thành viên', 'membership', 'loyalty', 'điểm tích lũy'],
    question: 'Chương trình thành viên CineMax Loyalty là gì?',
    answer: 'Khi đăng ký tài khoản thành viên, bạn sẽ được tích lũy 5% giá trị mỗi đơn đặt vé thành điểm thưởng. Điểm thưởng này có thể sử dụng để đổi các Voucher giảm giá 10K, 20K, 50K hoặc các combo bắp nước miễn phí tại rạp.',
    url: '/profile',
    label: 'Trang cá nhân'
  },
  {
    keywords: ['điều khoản', 'dieu khoan', 'chính sách bảo mật', 'chinh sach bao mat', 'quy định', 'quy dinh'],
    question: 'Điều khoản sử dụng và chính sách bảo mật của CineMax?',
    answer: 'CineMax cam kết bảo vệ thông tin cá nhân của người dùng và tuân thủ các quy định pháp luật về bảo mật. Bằng cách đăng ký và sử dụng dịch vụ, bạn đồng ý với các điều khoản đặt vé, quy định độ tuổi xem phim và quy định an toàn tại rạp chiếu phim.'
  }
];
