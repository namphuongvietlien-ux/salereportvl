#!/usr/bin/env python3
"""
Script để khởi động HTTP server cho dashboard
"""
import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Thêm CORS headers để tránh lỗi khi load CSV
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # Cache control cho CSV files
        if self.path.endswith('.csv'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def start_server():
    """Khởi động HTTP server"""
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print("=" * 60)
            print(f"🚀 HTTP Server đã khởi động!")
            print(f"📊 Dashboard: http://localhost:{PORT}/sales_dashboard.html")
            print(f"🏠 Trang chủ: http://localhost:{PORT}/")
            print("=" * 60)
            print("\nNhấn Ctrl+C để dừng server\n")
            
            # Tự động mở browser (tùy chọn)
            try:
                webbrowser.open(f'http://localhost:{PORT}/sales_dashboard.html')
            except:
                pass
            
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98 or e.errno == 48:  # Address already in use
            print(f"❌ LỖI: Port {PORT} đã được sử dụng!")
            print(f"   Hãy đóng ứng dụng khác đang dùng port {PORT} hoặc đổi port khác.")
        else:
            print(f"❌ LỖI: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n✅ Server đã dừng.")
        sys.exit(0)

if __name__ == '__main__':
    start_server()
