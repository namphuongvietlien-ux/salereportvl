import pandas as pd

# Xem chi tiết sheet 2024 và 2025
xls = pd.ExcelFile('DS_TH.xlsx')

with open('sheet_analysis.txt', 'w', encoding='utf-8') as f:
    for sheet in ['2024', '2025', '2023']:
        f.write(f'\n=== Sheet: {sheet} ===\n')
        df = pd.read_excel('DS_TH.xlsx', sheet_name=sheet, header=None)
        f.write(f'Shape: {df.shape}\n')
        f.write('Columns 0-6, first 25 rows:\n')
        f.write(df.iloc[:25, :7].to_string())
        f.write('\n---\n')

print('Done! Check sheet_analysis.txt')
