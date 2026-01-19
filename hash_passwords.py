"""
Script để hash tất cả mật khẩu trong users.json
Chuyển đổi từ plaintext sang SHA-256 hash để tăng bảo mật
"""
import json
import hashlib

def hash_password(password):
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def main():
    # Đọc file users.json
    print("📖 Đọc users.json...")
    with open('users.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Backup file gốc
    print("💾 Tạo backup users.json.backup...")
    with open('users.json.backup', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    # Hash tất cả mật khẩu
    print("🔒 Đang hash mật khẩu...")
    hashed_count = 0
    for user in data['users']:
        # Chỉ hash nếu chưa được hash (kiểm tra độ dài, SHA-256 = 64 ký tự hex)
        if len(user['password']) != 64 or not all(c in '0123456789abcdef' for c in user['password'].lower()):
            original_password = user['password']
            user['password'] = hash_password(original_password)
            print(f"  ✅ Hashed password for {user['username']} (was: {original_password[:3]}...)")
            hashed_count += 1
        else:
            print(f"  ⏭️  Skipped {user['username']} (already hashed)")
    
    # Lưu file đã hash
    print("💾 Lưu users.json với mật khẩu đã hash...")
    with open('users.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Hoàn thành! Đã hash {hashed_count} mật khẩu")
    print(f"📁 Backup được lưu tại: users.json.backup")
    
    # Hiển thị một vài ví dụ
    print("\n📋 Ví dụ mật khẩu đã hash:")
    for user in data['users'][:3]:
        print(f"  {user['username']}: {user['password'][:16]}...")

if __name__ == '__main__':
    main()
