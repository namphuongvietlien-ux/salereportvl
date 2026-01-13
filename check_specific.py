import pandas as pd
df = pd.read_csv('ten_sp_nhan.csv', encoding='utf-8')

# Check R03(4B) F-GP entry
fujitsu = df[df['TEN SP'].str.contains('R03\\(4B\\) F-GP', na=False)]
print('Found R03(4B) entries:')
for i, row in fujitsu.iterrows():
    print(f'Original: "{row["TEN SP"]}"')
    print(f'Short:    "{row["TEN RUT GON"]}"')
    spaces = row["TEN SP"].count(' ')
    print(f'Spaces:   {spaces}')
    print('---')

# Check another one that's not working
pin_entries = df[df['TEN SP'].str.contains('Pin Fujitsu', na=False)]
print(f'\nTotal Pin Fujitsu entries: {len(pin_entries)}')
print('\nFirst 3 entries:')
for i, row in pin_entries.head(3).iterrows():
    print(f'Original: "{row["TEN SP"]}"')
    print(f'Short:    "{row["TEN RUT GON"]}"')
    print('---')