========================================================================
                      NTK STUDIO - UNIVERSAL AI CODING IDE
             NVIDIA Multi-Model Agentic Platform for Windows
========================================================================

Phien ban: 1.1.0 (Advanced Hardening & Optimization)
He dieu hanh: Windows 10, Windows 11 (64-bit)
Ngon ngu giao dien: 100% Tieng Viet

1. GIOI THIEU PHIEN BAN 1.1.0
-----------------------------
NTK Studio 1.1.0 la ban nang cap toan dien ve kien truc an toan, hieu nang
va kha nang dinh tuyen da mo hinh NVIDIA:
- Bao mat Windows DPAPI: Ma hoa API Key truc tiep thong qua Windows Data
  Protection API, khong con phu thuoc vao file khoa plaintext tren dia.
- Ho tro Shared Quota Groups: Quan ly han muc RPM / TPM chung giua cac
  API Key cua cung mot tai khoan NVIDIA, ngan chan loi vuot quota.
- Model Capability Profile: Ho tro phan loai nang luc tung model thanh 3
  trang thai: VERIFIED, UNSUPPORTED, UNKNOWN.
- So sanh Model (Model Comparison): Cho phep doi chieu diem Coding,
  Reasoning, Tool Calling, TTFT va TPS giua nhieu model tren bang truc quan.
- Symbol Indexing: Tich hop cong cu `find_symbols` tim kiem nhanh dinh nghia
  class, ham va interface tren toan bo workspace.
- Auto-Debug Loop & Checkpoint Rollback: Tu dong phan tich traceback, sua ma
  nguon va kiem thu lai (toi da 3 chu ky) kem tinh nang khoi phuc checkpoint.

2. CAC TEP TIN PHAT HANH TRONG THU MUC RELEASE
----------------------------------------------
- `NTK Studio Setup 1.1.0.exe`: Bo cai dat Windows NSIS tu dong tao shortcut.
- `NTK Studio 1.1.0.exe`: Ban Portable chay ngay khong can cai dat.
- `ntk_backend.exe`: File thuc thi backend FastAPI doc lap (Python standalone binary).
- `NTK Studio Setup 1.0.0.exe`: Ban cai dat 1.0.0 du phong rollback.
- `NTK Studio 1.0.0.exe`: Ban portable 1.0.0 du phong rollback.
- `checksums.txt`: Bang ma bam toan ven SHA256 cho tat ca cac file thuc thi.

3. HUONG DAN SU DUNG NHANH
--------------------------
1. Khoi dong `NTK Studio Setup 1.1.0.exe` hoac `NTK Studio 1.1.0.exe`.
2. Nhan "Quan ly Model" tren thanh TopBar -> Nhap NVIDIA API Key -> Kiem tra.
3. Chuyen sang the "2. Danh muc Model" -> Nhan "Lam moi tu NVIDIA" -> Chon model.
4. Chuyen sang the "4. Kiem dinh Benchmark" de chay test va so sanh model.
5. Mo thu muc lam viec va ra lenh cho Agent thuc thi du an!
========================================================================
