# Sales Dashboard 2023-2025

Dashboard phân tích doanh số theo Hệ thống, Nhãn hàng và Sản phẩm (2023-2025).

## Features

- 📊 6 KPI cards (Tổng doanh số, Đơn hàng, Trung bình, Sản phẩm, Hệ thống, Nhãn hàng)
- 📈 5 interactive charts (Chart.js)
- 🔍 Filter theo thời gian, hệ thống, nhãn hàng
- 📉 Phân tích sản phẩm theo năm với dự đoán 2026
- 🎯 Top 20 sản phẩm bán chạy

## Tech Stack

- HTML5 + JavaScript (ES6)
- Chart.js 4.4.1
- PapaParse 5.4.1
- Python (data processing)

## Data

- **37 CSV files** (2023-2025) - Monthly sales data
- **CUSTOMERS.csv** - Customer system mapping
- **ten_sp_nhan.csv** - Product name lookup table

## Local Development

```bash
# Start HTTP server
python -m http.server 8000

# Open browser
http://localhost:8000/sales_dashboard.html
```

## Deployment

Deployed on [Vercel](https://vercel.com)

## License

Private - Internal use only
