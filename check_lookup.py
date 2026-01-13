import pandas as pd

df = pd.read_csv('ten_sp_nhan.csv', encoding='utf-8')
print('Total rows:', len(df))
print('\nSample TEN SP:')
for i, row in df.head(10).iterrows():
    print(f'  "{row["TEN SP"]}" -> "{row["TEN RUT GON"]}"')

print('\nPin Fujitsu samples:')
fujitsu = df[df['TEN SP'].str.contains('Pin Fujitsu', na=False)]
for i, row in fujitsu.head(5).iterrows():
    print(f'  "{row["TEN SP"]}" -> "{row["TEN RUT GON"]}"')