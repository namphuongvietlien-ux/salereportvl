#!/usr/bin/env python3
"""
Script test để kiểm tra các file CSV và cấu trúc dự án
"""
import os
import csv
import json

def test_csv_files():
    """Kiểm tra các file CSV có tồn tại và đúng format không"""
    print("=" * 60)
    print("KIỂM TRA FILE CSV")
    print("=" * 60)
    
    # Kiểm tra file lookup
    lookup_files = ['ten_sp_nhan.csv', 'CUSTOMERS.csv']
    for file in lookup_files:
        if os.path.exists(file):
            print(f"✓ {file} - TỒN TẠI")
            try:
                with open(file, 'r', encoding='utf-8-sig') as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)
                    print(f"  - Số dòng: {len(rows)}")
                    if rows:
                        print(f"  - Các cột: {list(rows[0].keys())}")
            except Exception as e:
                print(f"  ✗ LỖI đọc file: {e}")
        else:
            print(f"✗ {file} - KHÔNG TỒN TẠI")
    
    # Kiểm tra thư mục CSV_Output_Latest_Only
    csv_folder = 'CSV_Output_Latest_Only'
    if os.path.exists(csv_folder):
        csv_files = [f for f in os.listdir(csv_folder) if f.endswith('.csv')]
        print(f"\n✓ Thư mục {csv_folder} - TỒN TẠI")
        print(f"  - Số file CSV: {len(csv_files)}")
        
        # Kiểm tra một vài file mẫu
        sample_files = csv_files[:3]
        for file in sample_files:
            file_path = os.path.join(csv_folder, file)
            try:
                with open(file_path, 'r', encoding='utf-8-sig') as f:
                    reader = csv.reader(f)
                    headers = next(reader)
                    row_count = sum(1 for _ in reader)
                    print(f"  - {file}: {row_count} dòng, {len(headers)} cột")
            except Exception as e:
                print(f"  ✗ LỖI đọc {file}: {e}")
    else:
        print(f"\n✗ Thư mục {csv_folder} - KHÔNG TỒN TẠI")

def test_html_structure():
    """Kiểm tra cấu trúc HTML"""
    print("\n" + "=" * 60)
    print("KIỂM TRA CẤU TRÚC HTML")
    print("=" * 60)
    
    html_file = 'sales_dashboard.html'
    if os.path.exists(html_file):
        print(f"✓ {html_file} - TỒN TẠI")
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Kiểm tra các thư viện CDN
            checks = {
                'Chart.js': 'chart.js' in content.lower(),
                'PapaParse': 'papaparse' in content.lower(),
                'pptxgenjs': 'pptxgen' in content.lower(),
            }
            
            for lib, found in checks.items():
                status = "✓" if found else "✗"
                print(f"  {status} {lib}")
            
            # Kiểm tra các hàm quan trọng
            functions = [
                'loadAllData',
                'loadProductNameLookup',
                'loadCustomers',
                'updateDashboard'
            ]
            
            print("\n  Kiểm tra các hàm JavaScript:")
            for func in functions:
                found = func in content
                status = "✓" if found else "✗"
                print(f"  {status} {func}()")
    else:
        print(f"✗ {html_file} - KHÔNG TỒN TẠI")

def test_file_list():
    """Kiểm tra danh sách file trong code có khớp với thực tế không"""
    print("\n" + "=" * 60)
    print("KIỂM TRA DANH SÁCH FILE")
    print("=" * 60)
    
    csv_folder = 'CSV_Output_Latest_Only'
    if os.path.exists(csv_folder):
        actual_files = set([f for f in os.listdir(csv_folder) if f.endswith('.csv')])
        
        # Đọc danh sách file từ HTML
        html_file = 'sales_dashboard.html'
        if os.path.exists(html_file):
            with open(html_file, 'r', encoding='utf-8') as f:
                content = f.read()
                # Tìm các file CSV trong code
                import re
                pattern = r"'(\d{4}-\d{2}-\d{2}_DS_.*?\.csv)'"
                code_files = set(re.findall(pattern, content))
                
                print(f"File trong code: {len(code_files)}")
                print(f"File thực tế: {len(actual_files)}")
                
                missing_in_code = actual_files - code_files
                missing_in_folder = code_files - actual_files
                
                if missing_in_code:
                    print(f"\n⚠ File có trong thư mục nhưng KHÔNG có trong code ({len(missing_in_code)}):")
                    for f in sorted(missing_in_code)[:5]:
                        print(f"  - {f}")
                
                if missing_in_folder:
                    print(f"\n⚠ File có trong code nhưng KHÔNG có trong thư mục ({len(missing_in_folder)}):")
                    for f in sorted(missing_in_folder)[:5]:
                        print(f"  - {f}")
                
                if not missing_in_code and not missing_in_folder:
                    print("\n✓ Tất cả file đều khớp!")

if __name__ == '__main__':
    test_csv_files()
    test_html_structure()
    test_file_list()
    print("\n" + "=" * 60)
    print("HOÀN TẤT KIỂM TRA")
    print("=" * 60)
