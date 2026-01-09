import os
import pandas as pd
import re
import datetime
import calendar
from collections import defaultdict

# =================================================================
# === CÁC HÀM HỖ TRỢ (PARSE VÀ CONVERT) ===
# =================================================================

def parse_file_date(filename):
    """Phân tích ngày tháng từ tên file, trả về đối tượng date."""
    # ==========================================================
    # >>> ĐÃ SỬA: dùng \d{1,2} cho ngày & tháng
    # ==========================================================
    match = re.search(r"DS_(\d{1,2})\.(\d{1,2})\.(\d{2,4})", filename)
    
    if match:
        day_str, month_str, year_str = match.groups()
        day, month = int(day_str), int(month_str)
        if len(year_str) == 2:
            year = int(f"20{year_str}")
        else:
            year = int(year_str)
        try:
            return datetime.date(year, month, day)
        except ValueError:
            # Một số file đặt ngày 31 cho tháng chỉ có 30 ngày, tự động co về cuối tháng
            try:
                last_day = calendar.monthrange(year, month)[1]
                if day > last_day:
                    return datetime.date(year, month, last_day)
            except Exception:
                pass
            return None
    return None

def convert_date(value):
    """Chuyển đổi giá trị ngày tháng trong cột về dạng DD/MM/YYYY."""
    try:
        if pd.isna(value) or value == "":
            return ""
        if str(value).isdigit():
            return pd.to_datetime(int(value), origin='1899-12-30', unit='D').strftime('%d/%m/%Y')
        for fmt in ("%d%m%Y", "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y"):
            try:
                return pd.to_datetime(value, format=fmt).strftime('%d/%m/%Y')
            except ValueError:
                continue
        return value
    except:
        return value

# =================================================================
# === HÀM 1: XỬ LÝ DATA (FILE MỚI NHẤT MỖI THÁNG) ===
# =================================================================

def process_latest_data_files_to_csv(source_folder, output_csv_folder):
    """
    Lọc file mới nhất mỗi tháng:
      - Nhóm theo tháng dựa trên ngày trong TÊN FILE (DS_DD.MM.YYYY / DS_DD.MM.YY)
      - Với mỗi tháng, chọn file có:
          1. Ngày trong tên file lớn nhất
          2. Nếu nhiều file cùng ngày, chọn file có Date modified mới nhất
    Sau đó đọc sheet 'DATA'/'Data', thêm cột Source_Date và xuất ra CSV.
    """
    os.makedirs(output_csv_folder, exist_ok=True)
    print(f"Thư mục nguồn data: {source_folder}")
    print(f"Thư mục lưu data CSV: {output_csv_folder}\n")

    # Gom file theo tháng
    files_by_month = defaultdict(list)
    for file in os.listdir(source_folder):
        if file.endswith((".xls", ".xlsx")):
            file_path = os.path.join(source_folder, file)
            file_date = parse_file_date(file)
            if file_date:
                month_key = file_date.strftime("%Y-%m")
                mtime = os.path.getmtime(file_path)  # thời gian modified (timestamp)
                # Lưu: (ngày trong tên, mtime, tên file, full path)
                files_by_month[month_key].append((file_date, mtime, file, file_path))

    files_to_process = []
    print("--- Bắt đầu lọc file data mới nhất mỗi tháng ---")
    for month_key, file_list in files_by_month.items():
        # Sort giảm dần theo: (ngày trong tên file, thời gian modified)
        file_list.sort(key=lambda x: (x[0], x[1]), reverse=True)
        latest_file_tuple = file_list[0]
        files_to_process.append(latest_file_tuple)

        chosen_date, chosen_mtime, chosen_name, _ = latest_file_tuple
        print(
            f"Tháng {month_key}: chọn {chosen_name} "
            f"(ngày {chosen_date}, modified {datetime.datetime.fromtimestamp(chosen_mtime)})"
        )

    print("\n--- Bắt đầu chuyển đổi data (sẽ bỏ qua file đã có) ---")
    processed_count = 0
    skipped_count = 0

    for file_date, file_mtime, file, file_path in files_to_process:
        base_filename = os.path.splitext(file)[0]
        date_prefix = file_date.strftime("%Y-%m-%d")
        new_csv_filename = f"{date_prefix}_{base_filename}.csv"
        dest_csv_path = os.path.join(output_csv_folder, new_csv_filename)

        if os.path.exists(dest_csv_path):
            skipped_count += 1
            continue
        
        try:
            xls = pd.ExcelFile(file_path)
            sheet_name = (
                "Data"
                if "Data" in xls.sheet_names
                else "DATA"
                if "DATA" in xls.sheet_names
                else None
            )
            if sheet_name:
                df = pd.read_excel(
                    file_path,
                    sheet_name=sheet_name,
                    header=None,
                    dtype=object,
                    keep_default_na=False,
                )
                date_str = file_date.strftime("%Y%m%d")
                df.insert(0, "Source_Date", date_str)
                cols = df.columns.tolist()
                df = df[cols[1:] + [cols[0]]]
                if df.shape[1] > 1:
                    df.iloc[:, 1] = df.iloc[:, 1].apply(convert_date)
                df.to_csv(dest_csv_path, index=False, header=False, encoding="utf-8-sig")
                print(f"ĐÃ XUẤT MỚI (Data): {file} -> {new_csv_filename}")
                processed_count += 1
        except Exception as e:
            print(f"Lỗi nghiêm trọng khi xử lý file {file}: {e}")
    
    print(f"\n--- Hoàn tất Data CSV ---")
    print(f"File xử lý mới: {processed_count}")
    print(f"File đã có (bỏ qua): {skipped_count}")

# =================================================================
# === HÀM 2: XỬ LÝ LOOKUP 'ten_sp_nhan' (FILE RIÊNG LẺ) ===
# =================================================================

def process_lookup_file_to_csv(config, output_lookup_folder):
    """Xử lý 1 file Excel lookup riêng lẻ, khử trùng lặp, và lưu ra CSV."""
    os.makedirs(output_lookup_folder, exist_ok=True)
    print(f"\n--- Bắt đầu xử lý Bảng Lookup: {config['output_csv_filename']} ---")
    
    source_path = config["source_excel_path"]
    sheet_name = config["sheet_name"]
    output_filename = config["output_csv_filename"]
    dedupe_columns = config["dedupe_columns"]
    dest_csv_path = os.path.join(output_lookup_folder, output_filename)

    if not os.path.exists(source_path):
        print(f"LỖI: Không tìm thấy file nguồn: {source_path}")
        return
        
    if os.path.exists(dest_csv_path):
        print(f"Đã tồn tại, bỏ qua: {output_filename}")
        return
        
    try:
        df = pd.read_excel(
            source_path,
            sheet_name=sheet_name,
            header=0,
            dtype=object,
            keep_default_na=False,
        )
        original_rows = len(df)
        if dedupe_columns:
            df = df.drop_duplicates(subset=dedupe_columns, keep='last')
        final_rows = len(df)
        df.to_csv(dest_csv_path, index=False, encoding="utf-8-sig")
        print(f"ĐÃ XUẤT MỚI: {output_filename} (Lọc từ {original_rows} -> {final_rows} dòng)")
    except Exception as e:
        print(f"Lỗi nghiêm trọng khi xử lý file lookup {source_path}: {e}")

# =================================================================
# === HÀM 3: XỬ LÝ LOOKUP 'CUSTOMERS' (GOM TỪ FOLDER) ===
# =================================================================

def process_customer_lookup_from_folder(source_folder, output_lookup_folder):
    """
    Gom sheet 'CUSTOMER' từ TẤT CẢ file trong folder, thêm NAM/THANG,
    khử trùng lặp, và lưu 1 file CUSTOMERS.csv
    """
    print(f"\n--- Bắt đầu xử lý Bảng Lookup CUSTOMERS (từ TẤT CẢ file) ---")
    output_csv_path = os.path.join(output_lookup_folder, "CUSTOMERS.csv")
    
    all_customer_data = []
    
    for file in os.listdir(source_folder):
        if file.endswith((".xls", ".xlsx")):
            file_path = os.path.join(source_folder, file)
            file_date = parse_file_date(file)
            
            if not file_date:
                continue

            try:
                xls = pd.ExcelFile(file_path)
                sheet_name = "CUSTOMER"  # Tên sheet ĐÚNG của bạn
                
                if sheet_name in xls.sheet_names:
                    df = pd.read_excel(
                        file_path,
                        sheet_name=sheet_name,
                        header=0,
                        dtype=object,
                        keep_default_na=False,
                    )
                    df["NAM"] = file_date.year
                    df["THANG"] = file_date.month
                    all_customer_data.append(df)
            except Exception as e:
                print(f"Lỗi khi đọc 'CUSTOMER' từ {file}: {e}")

    if not all_customer_data:
        print("LỖI: Không tìm thấy bất kỳ data 'CUSTOMER' nào.")
        return

    master_df = pd.concat(all_customer_data, ignore_index=True)
    original_rows = len(master_df)

    dedupe_columns = ["NAM", "SYSTEM CODE"]
    master_df = master_df.drop_duplicates(subset=dedupe_columns, keep='last')
    final_rows = len(master_df)

    master_df.to_csv(output_csv_path, index=False, encoding="utf-8-sig")
    print(f"ĐÃ XUẤT MASTER LOOKUP: CUSTOMERS.csv (Gộp {original_rows} -> {final_rows} dòng duy nhất)")

# ===========================================================
# ================== CHẠY TOÀN BỘ CHUYỂN ĐỔI ==================
# ===========================================================

# 1. Cấu hình thư mục
source_data_folder = r"C:\Users\sa01\Desktop\2023-2024"
output_data_csv_folder = r"C:\Users\sa01\Desktop\CSV_Output_Latest_Only"
output_lookup_csv_folder = r"C:\Users\sa01\Desktop\CSV_Lookups"

# 2. Cấu hình cho 'ten_sp_nhan' (file riêng lẻ)
ten_sp_nhan_config = {
    "source_excel_path": r"C:\Users\sa01\Desktop\Total sale 2023-10.2025.xlsx",
    "sheet_name": "Sheet2",
    "output_csv_filename": "ten_sp_nhan.csv",
    "dedupe_columns": ["TEN SP"],
}

# 3. Chạy xử lý DATA chính (Hàm 1)
process_latest_data_files_to_csv(source_data_folder, output_data_csv_folder)

# 4. Chạy xử lý 'ten_sp_nhan' (Hàm 2)
process_lookup_file_to_csv(ten_sp_nhan_config, output_lookup_csv_folder)

# 5. Chạy xử lý 'CUSTOMERS' (Hàm 3)
process_customer_lookup_from_folder(source_data_folder, output_lookup_csv_folder)

print("\n=== TẤT CẢ ĐÃ HOÀN TẤT ===")