#!/usr/bin/env python3
"""Check Fujitsu data in CSV files"""
import csv
import os

def check_fujitsu_data():
    csv_dir = 'CSV_Output_Latest_Only'
    if not os.path.exists(csv_dir):
        print(f"Error: Directory {csv_dir} not found")
        return
    
    files = [f for f in os.listdir(csv_dir) if f.startswith('2025-') and f.endswith('.csv')]
    print(f"Found {len(files)} 2025 CSV files")
    print("Checking all systems in 2025 files...\n")
    
    all_systems = set()
    fujitsu_data = {}
    
    # Check last 3 files
    for f in sorted(files)[-3:]:
        path = os.path.join(csv_dir, f)
        print(f"Reading {f}...")
        try:
            with open(path, 'r', encoding='utf-8-sig') as file:
                reader = csv.DictReader(file)
                rows = list(reader)
                print(f"  Loaded {len(rows)} rows")
                
                # Get all systems
                systems = set([r.get('HỆ THỐNG', '').strip() for r in rows if r.get('HỆ THỐNG', '').strip()])
                all_systems.update(systems)
                print(f"  Found {len(systems)} unique systems")
                
                # Find Fujitsu rows (case-insensitive, partial match)
                fujitsu_rows = [r for r in rows if r.get('HỆ THỐNG', '') and ('FUJITSU' in r.get('HỆ THỐNG', '').upper() or 'FUJI' in r.get('HỆ THỐNG', '').upper())]
                
                if fujitsu_rows:
                    fujitsu_systems = set([r.get('HỆ THỐNG', '') for r in fujitsu_rows])
                    fujitsu_stores = set([r.get('CỬA HÀNG', '') for r in fujitsu_rows])
                    
                    fujitsu_data[f] = {
                        'rows': len(fujitsu_rows),
                        'systems': list(fujitsu_systems),
                        'stores': list(fujitsu_stores)
                    }
                    print(f"  ✅ Found {len(fujitsu_rows)} Fujitsu rows")
        except Exception as e:
            print(f"  ❌ Error reading {f}: {e}")
            import traceback
            traceback.print_exc()
    
    print("All systems found in 2025:")
    for s in sorted(all_systems):
        if s:  # Skip empty
            print(f"  - {s}")
    
    print("\n" + "="*60)
    if fujitsu_data:
        print("Fujitsu data found:")
        for f, data in fujitsu_data.items():
            print(f"\n{f}:")
            print(f"  Rows: {data['rows']}")
            print(f"  Systems: {data['systems']}")
            print(f"  Stores: {data['stores'][:10]}")
    else:
        print("No Fujitsu data found in 2025 files")
        print("\nSearching for similar names...")
        similar = [s for s in all_systems if 'FUJI' in s.upper() or 'FUI' in s.upper()]
        if similar:
            print("Similar system names found:")
            for s in similar:
                print(f"  - {s}")
        else:
            print("No similar names found")

if __name__ == '__main__':
    check_fujitsu_data()
