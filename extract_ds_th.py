# -*- coding: utf-8 -*-
"""
Smart DS_TH Extractor
Đọc file DS_TH.xlsx từ các sheet năm (2023, 2024, 2025) và xuất ra CSV chuẩn
với thông tin năm/tháng đầy đủ.
"""
import pandas as pd
import os

def extract_ds_th_data():
    """Trích xuất dữ liệu từ DS_TH.xlsx"""
    
    excel_file = 'DS_TH.xlsx'
    if not os.path.exists(excel_file):
        print(f"Lỗi: Không tìm thấy file {excel_file}")
        return None
    
    xls = pd.ExcelFile(excel_file)
    print(f"Các sheet có sẵn: {xls.sheet_names}")
    
    # Các sheet năm cần đọc
    year_sheets = ['2023', '2024', '2025']
    
    all_data = []
    
    for year_sheet in year_sheets:
        if year_sheet not in xls.sheet_names:
            print(f"Cảnh báo: Sheet {year_sheet} không tồn tại")
            continue
        
        print(f"\nĐang xử lý sheet: {year_sheet}")
        
        # Đọc sheet không có header
        df = pd.read_excel(excel_file, sheet_name=year_sheet, header=None)
        
        # Dữ liệu tháng nằm ở dòng 3-14 (index 3-14 tương ứng với dòng 4-15 trong Excel)
        # Cột 0: THÁNG, Cột 1: TARGET, Cột 2: FUJITSU, Cột 3: COLEMAN, 
        # Cột 4: ADIDAS/AZARINE, Cột 5: BAKING SODA, Cột 6: SALE IN
        
        for row_idx in range(3, 15):  # Dòng 4-15 (12 tháng)
            try:
                thang_raw = str(df.iloc[row_idx, 0]).strip()
                
                # Bỏ qua nếu không phải dữ liệu tháng
                if not thang_raw.startswith('THÁNG'):
                    continue
                
                # Parse số tháng từ text (THÁNG 1 -> 1, THÁNG 12 -> 12)
                thang_num = int(thang_raw.replace('THÁNG', '').strip())
                
                target = df.iloc[row_idx, 1]
                fujitsu = df.iloc[row_idx, 2]
                coleman = df.iloc[row_idx, 3]
                adidas = df.iloc[row_idx, 4]
                baking_soda = df.iloc[row_idx, 5]
                sale_in = df.iloc[row_idx, 6]
                
                # Chuyển đổi sang số
                def to_number(val):
                    if pd.isna(val) or val == '' or val == '-':
                        return 0
                    try:
                        return float(str(val).replace(',', '').strip())
                    except:
                        return 0
                
                row_data = {
                    'NAM': int(year_sheet),
                    'THANG': thang_num,
                    'NAM_THANG': f"{year_sheet}-{thang_num:02d}",
                    'TARGET': to_number(target),
                    'FUJITSU': to_number(fujitsu),
                    'COLEMAN': to_number(coleman),
                    'ADIDAS': to_number(adidas),
                    'BAKING_SODA': to_number(baking_soda),
                    'SALE_IN': to_number(sale_in),
                }
                
                # Tính phần trăm đạt
                if row_data['TARGET'] > 0:
                    row_data['PERCENT'] = round(row_data['SALE_IN'] / row_data['TARGET'] * 100, 1)
                else:
                    row_data['PERCENT'] = 0
                
                all_data.append(row_data)
                print(f"  {year_sheet}-{thang_num:02d}: Target={target:,.0f}, SaleIn={sale_in:,.0f}" if not pd.isna(target) else f"  {year_sheet}-{thang_num:02d}: No data")
                
            except Exception as e:
                print(f"  Lỗi dòng {row_idx}: {e}")
                continue
    
    if not all_data:
        print("Không có dữ liệu được trích xuất!")
        return None
    
    # Tạo DataFrame và sắp xếp theo năm-tháng
    result_df = pd.DataFrame(all_data)
    result_df = result_df.sort_values(['NAM', 'THANG']).reset_index(drop=True)
    
    return result_df


def main():
    print("=" * 60)
    print("DS_TH Smart Extractor")
    print("=" * 60)
    
    df = extract_ds_th_data()
    
    if df is not None:
        # Xuất ra CSV
        output_file = 'DS_TH_clean.csv'
        df.to_csv(output_file, index=False, encoding='utf-8-sig')
        print(f"\n✅ Đã xuất {len(df)} dòng dữ liệu ra file: {output_file}")
        
        # Thống kê
        print("\n=== THỐNG KÊ ===")
        for year in df['NAM'].unique():
            year_data = df[df['NAM'] == year]
            total_target = year_data['TARGET'].sum()
            total_sale = year_data['SALE_IN'].sum()
            percent = round(total_sale / total_target * 100, 1) if total_target > 0 else 0
            print(f"Năm {year}: {len(year_data)} tháng | Target: {total_target:,.0f} | Sale: {total_sale:,.0f} | {percent}%")
        
        # Xem preview
        print("\n=== DỮ LIỆU MẪU ===")
        print(df.head(15).to_string())


if __name__ == '__main__':
    main()
