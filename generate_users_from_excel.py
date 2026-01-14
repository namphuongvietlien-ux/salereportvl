#!/usr/bin/env python3
"""
Script để đọc file Excel DS_6.1.26.xlsx, sheet "sale by stores"
và tạo file users.json với phân quyền cửa hàng cho từng sale
"""
import pandas as pd
import json
import os
import re

def normalize_store_name(store_name):
    """Chuẩn hóa tên cửa hàng để so sánh"""
    if pd.isna(store_name) or store_name == '':
        return ''
    # Loại bỏ khoảng trắng thừa, chuyển về uppercase
    return str(store_name).strip().upper()

def normalize_sale_name(sale_name):
    """Chuẩn hóa tên sale để tạo username"""
    if pd.isna(sale_name) or sale_name == '':
        return ''
    # Loại bỏ dấu, khoảng trắng, chuyển về lowercase
    name = str(sale_name).strip()
    # Loại bỏ dấu tiếng Việt (đơn giản)
    name = name.lower()
    name = name.replace(' ', '')
    name = name.replace('đ', 'd').replace('Đ', 'd')
    name = re.sub(r'[^a-z0-9]', '', name)
    return name

def generate_password(username, role='sales'):
    """Tạo mật khẩu mặc định dựa trên username và role"""
    base_password = f"{username}123"
    if role == 'admin':
        return "admin123"
    elif role == 'supervisor':
        return f"{username}123"
    else:
        return f"{username}123"

def read_sale_by_stores(excel_path):
    """Đọc sheet 'sale by stores' từ file Excel"""
    try:
        # Đọc Excel file
        xls = pd.ExcelFile(excel_path)
        
        # Tìm sheet có tên tương tự "sale by stores" hoặc "sale by store"
        sheet_name = None
        for sheet in xls.sheet_names:
            sheet_lower = sheet.lower()
            if ('sale' in sheet_lower and 'store' in sheet_lower) or 'sale by store' in sheet_lower:
                sheet_name = sheet
                break
        
        if not sheet_name:
            print(f"⚠️ Không tìm thấy sheet 'sale by stores'. Các sheet có sẵn:")
            for sheet in xls.sheet_names:
                print(f"  - {sheet}")
            return None
        
        print(f"✅ Đọc sheet: {sheet_name}")
        df = pd.read_excel(excel_path, sheet_name=sheet_name, header=0, dtype=object, keep_default_na=False)
        
        print(f"📊 Số dòng dữ liệu: {len(df)}")
        print(f"📋 Các cột: {list(df.columns)}")
        
        return df
    except Exception as e:
        print(f"❌ Lỗi khi đọc file Excel: {e}")
        return None

def is_valid_sale_name(sale_name):
    """Kiểm tra xem tên sale có hợp lệ không"""
    if not sale_name or sale_name == '':
        return False
    
    sale_upper = str(sale_name).strip().upper()
    # Loại bỏ các giá trị không hợp lệ
    invalid_values = ['NO SALE', 'VACANCY', 'NO PG', 'NAN', 'VAVANCY', 'VACANT']
    if sale_upper in invalid_values:
        return False
    
    # Loại bỏ số thuần túy
    if sale_upper.isdigit() or (len(sale_upper) <= 2 and sale_upper.isdigit()):
        return False
    
    # Loại bỏ giá trị chỉ là "VAVANCY" hoặc "VACANCY" (nhưng giữ lại nếu có tên sau đó)
    if sale_upper == 'VAVANCY' or sale_upper == 'VACANCY':
        return False
    # Loại bỏ nếu bắt đầu bằng "VAVANCY-" hoặc "VACANCY-" nhưng không có tên sau
    if (sale_upper.startswith('VAVANCY-') or sale_upper.startswith('VACANCY-')) and len(sale_upper) < 15:
        return False
    
    # Phải có ít nhất 3 ký tự và chứa chữ cái
    if len(sale_name.strip()) < 3:
        return False
    
    # Phải chứa ít nhất một chữ cái (không phải chỉ số)
    if not any(c.isalpha() for c in sale_name):
        return False
    
    return True

def parse_sale_stores_mapping(df):
    """Parse dữ liệu để tạo mapping sale -> stores, SUP -> stores, KA -> stores"""
    sale_stores = {}
    sup_stores = {}
    ka_stores = {}
    
    # Tìm các cột
    sale_col = None
    sup_col = None
    ka_col = None
    store_col = None
    
    for col in df.columns:
        col_str = str(col).strip().upper()
        if col_str == 'SALE':
            sale_col = col
        elif col_str == 'SUP':
            sup_col = col
        elif col_str == 'KA':
            ka_col = col
        elif col_str == 'STORE':
            store_col = col
    
    if not store_col:
        print("⚠️ Không tìm thấy cột STORE. Các cột có sẵn:")
        for col in df.columns:
            print(f"  - {col}")
        return {}, {}, {}
    
    print(f"✅ Sử dụng cột Store: {store_col}")
    if sale_col:
        print(f"✅ Sử dụng cột Sale: {sale_col}")
    if sup_col:
        print(f"✅ Sử dụng cột SUP: {sup_col}")
    if ka_col:
        print(f"✅ Sử dụng cột KA: {ka_col}")
    
    # Group by sale và lấy danh sách cửa hàng
    for idx, row in df.iterrows():
        store_name = normalize_store_name(row[store_col])
        
        if not store_name or store_name == '':
            continue
        
        # Parse SALE
        if sale_col:
            sale_name = str(row[sale_col]).strip()
            if is_valid_sale_name(sale_name):
                if sale_name not in sale_stores:
                    sale_stores[sale_name] = []
                if store_name not in sale_stores[sale_name]:
                    sale_stores[sale_name].append(store_name)
        
        # Parse SUP
        if sup_col:
            sup_name = str(row[sup_col]).strip()
            if is_valid_sale_name(sup_name):
                if sup_name not in sup_stores:
                    sup_stores[sup_name] = []
                if store_name not in sup_stores[sup_name]:
                    sup_stores[sup_name].append(store_name)
        
        # Parse KA
        if ka_col:
            ka_name = str(row[ka_col]).strip()
            if is_valid_sale_name(ka_name):
                if ka_name not in ka_stores:
                    ka_stores[ka_name] = []
                if store_name not in ka_stores[ka_name]:
                    ka_stores[ka_name].append(store_name)
    
    return sale_stores, sup_stores, ka_stores

def create_users_json(sale_stores_mapping, sup_stores_mapping, ka_stores_mapping, output_path='users.json'):
    """Tạo file users.json từ mapping sale -> stores, sup -> stores, ka -> stores"""
    users = []
    used_usernames = set()
    
    # 1. Tạo admin account
    users.append({
        "username": "admin",
        "password": "admin123",
        "role": "admin",
        "name": "Administrator",
        "permissions": {
            "viewAll": True,
            "editTarget": True,
            "importExport": True,
            "systems": [],
            "stores": []
        }
    })
    used_usernames.add("admin")
    
    # 2. Tạo supervisor accounts từ SUP
    for sup_name, stores in sup_stores_mapping.items():
        username = normalize_sale_name(sup_name)
        if not username:
            continue
        
        # Đảm bảo username là duy nhất
        base_username = username
        counter = 1
        while username in used_usernames:
            username = f"{base_username}{counter}"
            counter += 1
        
        used_usernames.add(username)
        password = generate_password(username, 'supervisor')
        
        users.append({
            "username": username,
            "password": password,
            "role": "supervisor",
            "name": sup_name,
            "permissions": {
                "viewAll": True,
                "editTarget": False,
                "importExport": False,
                "systems": [],
                "stores": stores  # Supervisor có thể xem tất cả, nhưng lưu stores để tham khảo
            }
        })
    
    # 3. Tạo KAM accounts từ KA (cũng là supervisor role)
    for ka_name, stores in ka_stores_mapping.items():
        username = normalize_sale_name(ka_name)
        if not username:
            continue
        
        # Đảm bảo username là duy nhất
        base_username = username
        counter = 1
        while username in used_usernames:
            username = f"{base_username}{counter}"
            counter += 1
        
        used_usernames.add(username)
        password = generate_password(username, 'supervisor')
        
        users.append({
            "username": username,
            "password": password,
            "role": "supervisor",
            "name": f"KAM {ka_name}",
            "permissions": {
                "viewAll": True,
                "editTarget": False,
                "importExport": False,
                "systems": [],
                "stores": stores
            }
        })
    
    # 4. Tạo sales accounts với phân quyền cửa hàng
    for sale_name, stores in sale_stores_mapping.items():
        username = normalize_sale_name(sale_name)
        if not username:
            continue
        
        # Đảm bảo username là duy nhất
        base_username = username
        counter = 1
        while username in used_usernames:
            username = f"{base_username}{counter}"
            counter += 1
        
        used_usernames.add(username)
        password = generate_password(username, 'sales')
        
        users.append({
            "username": username,
            "password": password,
            "role": "sales",
            "name": sale_name,
            "permissions": {
                "viewAll": False,
                "editTarget": False,
                "importExport": False,
                "systems": [],  # Có thể thêm hệ thống nếu cần
                "stores": stores  # Danh sách cửa hàng được phân quyền
            }
        })
    
    # Tạo structure cuối cùng
    users_data = {
        "version": "1.0",
        "users": users
    }
    
    # Ghi ra file JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(users_data, f, ensure_ascii=False, indent=2)
    
    admin_count = sum(1 for u in users if u['role'] == 'admin')
    supervisor_count = sum(1 for u in users if u['role'] == 'supervisor')
    sales_count = sum(1 for u in users if u['role'] == 'sales')
    
    print(f"\n✅ Đã tạo file {output_path}")
    print(f"📊 Tổng số users: {len(users)}")
    print(f"   - Admin: {admin_count}")
    print(f"   - Supervisor/KAM: {supervisor_count}")
    print(f"   - Sales: {sales_count}")
    
    # In danh sách supervisor
    if supervisor_count > 0:
        print(f"\n📋 Danh sách Supervisor/KAM accounts:")
        for user in users:
            if user['role'] == 'supervisor':
                store_count = len(user['permissions']['stores'])
                print(f"   - {user['username']} ({user['name']}): {store_count} cửa hàng")
    
    # In danh sách sales
    if sales_count > 0:
        print(f"\n📋 Danh sách Sales accounts:")
        for user in users:
            if user['role'] == 'sales':
                store_count = len(user['permissions']['stores'])
                print(f"   - {user['username']} ({user['name']}): {store_count} cửa hàng")
                if store_count <= 5:
                    print(f"     Cửa hàng: {', '.join(user['permissions']['stores'][:5])}")
                else:
                    print(f"     Cửa hàng: {', '.join(user['permissions']['stores'][:5])} ... và {store_count - 5} cửa hàng khác")
    
    return users_data

def main():
    excel_path = 'DS_6.1.26.xlsx'
    output_path = 'users.json'
    
    if not os.path.exists(excel_path):
        print(f"❌ Không tìm thấy file: {excel_path}")
        print(f"💡 Vui lòng đảm bảo file Excel nằm trong thư mục hiện tại")
        return
    
    print("=" * 60)
    print("TẠO USERS.JSON TỪ EXCEL")
    print("=" * 60)
    print(f"📁 File Excel: {excel_path}")
    print(f"📄 Sheet: sale by stores")
    print(f"💾 Output: {output_path}\n")
    
    try:
        # Đọc Excel
        df = read_sale_by_stores(excel_path)
        if df is None or df.empty:
            print("❌ Không đọc được dữ liệu từ Excel")
            return
    except Exception as e:
        print(f"❌ Lỗi khi đọc Excel: {e}")
        import traceback
        traceback.print_exc()
        return
    
    try:
    
    # Parse mapping
    print("\n" + "=" * 60)
    print("PHÂN TÍCH DỮ LIỆU")
    print("=" * 60)
    sale_stores, sup_stores, ka_stores = parse_sale_stores_mapping(df)
    
    if not sale_stores and not sup_stores and not ka_stores:
        print("❌ Không tìm thấy dữ liệu sale/sup/ka - stores mapping")
        return
    
    print(f"\n✅ Tìm thấy:")
    print(f"   - {len(sale_stores)} sales")
    if sup_stores:
        print(f"   - {len(sup_stores)} supervisors (SUP)")
    if ka_stores:
        print(f"   - {len(ka_stores)} KAMs (KA)")
    
        # Tạo users.json
        print("\n" + "=" * 60)
        print("TẠO USERS.JSON")
        print("=" * 60)
        create_users_json(sale_stores, sup_stores, ka_stores, output_path)
        
        print("\n" + "=" * 60)
        print("HOÀN TẤT")
        print("=" * 60)
        print(f"✅ File {output_path} đã được tạo thành công!")
        print(f"💡 Bạn có thể commit file này lên GitHub để áp dụng cho tất cả users.")
    except Exception as e:
        print(f"❌ Lỗi khi tạo users.json: {e}")
        import traceback
        traceback.print_exc()
        return

if __name__ == '__main__':
    main()
