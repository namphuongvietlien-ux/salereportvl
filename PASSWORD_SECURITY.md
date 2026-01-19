# 🔒 Hướng Dẫn Bảo Mật Mật Khẩu

## Tổng Quan

Hệ thống đã được nâng cấp để sử dụng mã hóa SHA-256 cho mật khẩu, cải thiện bảo mật đáng kể so với việc lưu mật khẩu dạng plaintext.

## Cơ Chế Hoạt Động

### 1. Mã Hóa Mật Khẩu
- Tất cả mật khẩu trong `users.json` được lưu dưới dạng SHA-256 hash (64 ký tự hex)
- Khi người dùng đăng nhập, mật khẩu nhập vào được hash và so sánh với hash đã lưu
- Sử dụng Web Crypto API cho bảo mật tốt hơn

### 2. File Quan Trọng
- **users.json**: Chứa thông tin người dùng với mật khẩu đã hash
- **users.json.backup**: Bản backup với mật khẩu plaintext (nên xóa sau khi xác nhận hệ thống hoạt động)
- **hash_passwords.py**: Script để hash mật khẩu

## Cách Thêm/Thay Đổi Mật Khẩu

### Phương pháp 1: Sử dụng Python Script

1. **Thêm user mới vào users.json với mật khẩu plaintext**:
\`\`\`json
{
  "username": "newuser",
  "password": "mypassword123",
  "role": "sales",
  "name": "New User",
  "permissions": {...}
}
\`\`\`

2. **Chạy script hash**:
\`\`\`bash
python hash_passwords.py
\`\`\`

Script sẽ tự động:
- Phát hiện mật khẩu chưa hash
- Hash các mật khẩu đó
- Tạo backup

### Phương pháp 2: Hash Thủ Công

Sử dụng Python để tạo hash:

\`\`\`python
import hashlib

password = "your_password_here"
hashed = hashlib.sha256(password.encode('utf-8')).hexdigest()
print(hashed)
\`\`\`

Hoặc sử dụng console trình duyệt:

\`\`\`javascript
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Sử dụng
hashPassword("your_password").then(console.log);
\`\`\`

## Ví Dụ Mật Khẩu Đã Hash

Một số tài khoản mẫu (giữ nguyên mật khẩu gốc cho dễ test):

| Username | Mật khẩu gốc | Hash SHA-256 |
|----------|-------------|--------------|
| admin | admin123 | 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9 |

## Lưu Ý Bảo Mật

### ✅ Cải Thiện
- Mật khẩu không còn lưu dạng plaintext trong database
- Ngay cả admin không thể xem mật khẩu gốc
- Tăng độ khó khi bị tấn công vào database

### ⚠️ Hạn Chế & Khuyến Nghị
1. **Client-side hashing**: Mật khẩu được hash ở client, vẫn có thể bị chặn qua network
   - **Khuyến nghị**: Sử dụng HTTPS trong production

2. **Không có salt**: SHA-256 đơn giản không dùng salt
   - **Khuyến nghị**: Nâng cấp lên bcrypt hoặc PBKDF2 với salt

3. **Backend authentication**: Cần có backend API thực sự cho production
   - **Khuyến nghị**: Chuyển sang backend authentication (Node.js, Python Flask/Django, etc.)

## Khôi Phục Khi Quên Mật Khẩu

Nếu user quên mật khẩu:

1. Admin thêm mật khẩu mới (plaintext) vào users.json
2. Chạy `python hash_passwords.py`
3. User đăng nhập với mật khẩu mới

## Testing

Sau khi hash mật khẩu, test đăng nhập với:
- Username: `admin`
- Password: `admin123`

Nếu đăng nhập thành công, hệ thống hoạt động đúng!

## Xóa Backup

Sau khi xác nhận hệ thống hoạt động ổn định, xóa file backup:

\`\`\`bash
del users.json.backup  # Windows
rm users.json.backup   # Linux/Mac
\`\`\`

## Roadmap Cải Thiện Tương Lai

1. ✅ Hash mật khẩu với SHA-256
2. 🔄 Thêm salt cho mỗi mật khẩu
3. 🔄 Sử dụng bcrypt/scrypt thay vì SHA-256
4. 🔄 Implement backend API
5. 🔄 Thêm rate limiting cho login attempts
6. 🔄 2FA (Two-Factor Authentication)
7. 🔄 Session timeout
8. 🔄 Password strength requirements

---

**Tạo ngày**: January 17, 2026  
**Phiên bản**: 1.0
