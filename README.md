# NTK STUDIO – UNIVERSAL AI CODING IDE
## NVIDIA Multi-Model Agentic Platform for Windows

**NTK Studio** là một AI Coding IDE độc lập trên Windows (10/11 64-bit), có khả năng khai thác toàn bộ sức mạnh của các mô hình AI thông qua NVIDIA API (NVIDIA NIM Platform), tích hợp Agentic Coding thực thi tự động nhiều bước tương tự trải nghiệm của Antigravity.

---

## 🌟 TÍNH NĂNG NỔI BẬT

### 1. NVIDIA Multi-Model System
- **Hỗ trợ không giới hạn mô hình NVIDIA**: Kết nối với bất kỳ model nào có trên tài khoản NVIDIA API của bạn (DeepSeek V3, DeepSeek R1, Llama 3.1/3.3, NVIDIA Nemotron, Qwen 2.5 Coder, Mistral, v.v.).
- **Đa kết nối độc lập (Multi-Connection)**: Hỗ trợ thêm nhiều endpoint NVIDIA và API Key khác nhau cùng lúc.
- **Tự động quét danh mục (Dynamic Catalog Discovery)**: Gọi `/v1/models` để tự động khám phá và thêm hàng loạt model chỉ bằng một cú nhấp chuột.
- **Mã hóa API Key an toàn**: Khóa API được mã hóa cục bộ bằng chuẩn AES-128 (Fernet/Windows DPAPI) và không bao giờ lộ ra ngoài giao diện hay log.

### 2. Định Tuyến Model Thông Minh (Manual + Auto Model)
- **Manual Model**: Tự do chọn thủ công model mặc định hoặc model riêng cho từng Agent (Coder, Debugger, Reviewer).
- **Auto Model Router**: Phân tích câu lệnh của người dùng, phân loại nhiệm vụ (Viết code, Sửa lỗi, Phân tích kiến trúc, Xử lý ảnh giao diện, Định dạng JSON), đánh giá điểm benchmark và tình trạng hạn mức để tự động chọn model tối ưu nhất.

### 3. Bộ Kiểm Định Năng Lực Model (Full Model Benchmark Suite)
10 bài kiểm tra đánh giá độc lập trước khi đưa vào sử dụng:
1. **Connection**: Kiểm tra độ trễ endpoint và tính hợp lệ của API Key.
2. **Basic Chat**: Kiểm tra khả năng hiểu và trả lời hội thoại cơ bản.
3. **Streaming**: Đo thời gian trả về token đầu tiên (TTFT) và tính ổn định của luồng SSE.
4. **Coding**: Đánh giá năng lực sinh mã thuật toán chính xác.
5. **Reasoning**: Kiểm tra khả năng suy luận logic và giải toán.
6. **JSON Output**: Kiểm tra tuân thủ cấu trúc dữ liệu JSON.
7. **Tool Calling**: Kiểm thử gọi công cụ qua Function Calling hoặc JSON Fallback.
8. **Vision**: Thử nghiệm nhận diện ảnh giao diện nếu model hỗ trợ.
9. **Context**: Thử nghiệm ngữ cảnh an toàn.
10. **Performance**: Đo đạc TPS, TTFT, tỷ lệ lỗi và thống kê chi tiết.

### 4. Quản Lý Quota RPM / TPM & Hàng Đợi Request
- **Sliding Window Counter**: Giám sát chính xác số lượt gọi mỗi phút (RPM) theo cửa sổ trượt 60 giây.
- **Khoảng đệm an toàn (Safety Margin)**: Tự động trừ hao (ví dụ: cấp 40 RPM -> giới hạn nội bộ 35 RPM) để triệt tiêu nguy cơ vi phạm quota.
- **Tự động phục hồi lỗi 429 (Rate Limit Recovery)**: Đọc header `Retry-After`, tạm dừng hàng đợi và áp dụng thuật toán Exponential Backoff kèm Jitter ngẫu nhiên, không tạo vòng lặp vô hạn.

### 5. Agentic Coding Engine & Auto-Debug Loop
- **Điều phối viên thông minh (Agent Coordinator)**: Phân tích dự án, lập kế hoạch, kích hoạt Coder và chạy vòng lặp tự sửa lỗi:
  $$\text{Phân tích} \longrightarrow \text{Lập kế hoạch} \longrightarrow \text{Chỉnh sửa code} \longrightarrow \text{Kiểm thử} \longrightarrow \text{Lỗi?} \longrightarrow \text{Tự động sửa (Auto-Fix)}$$
- **Hệ thống công cụ cục bộ (Local Tool Engine)**:
  - `read_file`, `write_file`, `edit_file`, `delete_file`, `list_directory`, `search_code`.
  - `run_terminal`: Thực thi lệnh PowerShell với sandbox, timeout và chống lệnh phá hoại hệ thống.
  - `git_status`, `git_diff`, `create_checkpoint`: Quản lý phiên bản và khôi phục khi cần.

### 6. Mở Rộng Qua Model Context Protocol (MCP)
- Quản lý các MCP Server bên thứ ba (Unity MCP, Unreal MCP, Filesystem, Browser, SQLite Database) qua giao thức `stdio` hoặc `sse`.

---

## 🏗 KIẾN TRÚC HỆ THỐNG

```text
NTK Studio
│
├── Desktop UI (Electron + React 19 + Monaco Editor + Tailwind CSS + Zustand)
│   ├── TopBar: Bộ chọn Model (Auto/Manual), RPM/TPM live chips, Workspace picker
│   ├── ActivityBar & Sidebar: Explorer thư mục, Git source control, Terminal
│   ├── Editor: Monaco Editor đa tab, highlight cú pháp, lưu file (Ctrl+S)
│   ├── Agentic Studio: Chatbox SSE live stream, thẻ thực thi công cụ trực quan
│   └── Model Manager: Quản lý kết nối, Catalog discovery, Benchmark & Quota
│
├── Local Backend (FastAPI + AsyncIO + SQLite + aiosqlite + greenlet)
│   ├── Model Router & Rate Limiter (Priority queue, Backoff, Sliding windows)
│   ├── NVIDIA Provider Adapter (Streaming SSE, Tool calling, JSON fallback)
│   ├── Local Tool Registry (File sandbox, PowerShell safe executor, Git diff)
│   ├── Context Manager & Project Memory (Tree scanner, budgeted snippets)
│   └── MCP Manager (External tools integration)
│
└── Bản phát hành độc lập (Release)
    ├── ntk_backend.exe (Biên dịch bằng PyInstaller)
    ├── NTK-Studio-Setup.exe (Bộ cài đặt Windows NSIS)
    └── NTK-Studio-Portable.exe (Bản chạy ngay không cần cài đặt)
```

---

## 🚀 HƯỚNG DẪN PHÁT TRIỂN & CHẠY LOCAL

### Yêu cầu môi trường phát triển:
- Windows 10 hoặc 11 (64-bit)
- Python 3.11+
- Node.js 20+

### 1. Khởi động Backend
```powershell
cd "d:\NTK Studio\backend"
python run_backend.py
```
Backend sẽ khởi chạy tại: `http://127.0.0.1:8765`  
Tài liệu API Swagger: `http://127.0.0.1:8765/docs`

### 2. Khởi động Frontend
```powershell
cd "d:\NTK Studio\frontend"
npm run dev
```
Giao diện phát triển sẽ khả dụng tại: `http://localhost:5173`

### 3. Chạy kiểm thử tự động
```powershell
cd "d:\NTK Studio"
pytest backend/tests
```

### 4. Đóng gói bản phát hành Windows EXE
```powershell
# Chạy script tự động đóng gói toàn diện
.\build_scripts\build_release.bat
```

---

## 🔒 AN TOÀN & BẢO MẬT
- Mọi thao tác ghi/sửa file đều bị ràng buộc trong phạm vi thư mục Workspace được chọn.
- Các lệnh dòng lệnh nguy hại (`rmdir /s`, `format`, `del /f`, fork bombs...) đều bị bộ lọc an toàn chặn tự động.
- API Key lưu trữ trong cơ sở dữ liệu SQLite `%USERPROFILE%\.ntk_studio\ntk_studio.db` luôn ở trạng thái mã hóa.

---
*Phát triển bởi đội ngũ kỹ sư phần mềm NTK Studio.*
