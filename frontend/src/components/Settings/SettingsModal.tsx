import React from 'react';
import { X, Settings, ShieldCheck, Cpu, Sliders, Folder } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { workspaceRoot } = useWorkspaceStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4">
      <div className="bg-[#121824] border border-[#263245] rounded-xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="h-14 px-6 border-b border-[#202938] flex items-center justify-between bg-[#151c2b] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
                CÀI ĐẶT HỆ THỐNG NTK STUDIO
              </h2>
              <p className="text-[11px] text-slate-400">Cấu hình giao diện, định tuyến AI và cơ chế an toàn</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300">
          {/* Section 1: General */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-100 uppercase text-xs flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Giao Diện &amp; Ngôn Ngữ</span>
            </h3>
            <div className="p-3 bg-[#161f2e] border border-slate-700/60 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-slate-200 block">Ngôn ngữ hiển thị</strong>
                  <span className="text-[11px] text-slate-500">Toàn bộ giao diện đã được Việt hóa 100%</span>
                </div>
                <select className="bg-[#0e131d] border border-slate-700 px-3 py-1 rounded text-slate-200 focus:outline-none">
                  <option value="vi">Tiếng Việt (Mặc định)</option>
                  <option value="en">English (Tùy chọn tương lai)</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-slate-200 block">Giao diện màu sắc</strong>
                  <span className="text-[11px] text-slate-500">Chế độ tối hiện đại tối ưu cho lập trình</span>
                </div>
                <select className="bg-[#0e131d] border border-slate-700 px-3 py-1 rounded text-slate-200 focus:outline-none">
                  <option value="dark">NTK Dark Cyberpunk</option>
                  <option value="light">Light Mode</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: AI Settings */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-100 uppercase text-xs flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Thông Số Sinh Mã AI</span>
            </h3>
            <div className="p-3 bg-[#161f2e] border border-slate-700/60 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-slate-200 block">Định tuyến thông minh (Auto Model)</strong>
                  <span className="text-[11px] text-slate-500">Tự động phân tích tác vụ (Coding, Debug, Review) để chọn model tối ưu nhất</span>
                </div>
                <input type="checkbox" defaultChecked className="accent-emerald-500 w-4 h-4" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-slate-200 block">Nhiệt độ sinh mã (Temperature)</strong>
                  <span className="text-[11px] text-slate-500">0.2: Tối ưu cho code chuẩn xác và logic</span>
                </div>
                <input
                  type="number"
                  defaultValue={0.2}
                  step={0.1}
                  min={0.0}
                  max={1.0}
                  className="w-20 bg-[#0e131d] border border-slate-700 px-2 py-1 rounded text-slate-200 focus:outline-none text-right font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Security & Safety */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-100 uppercase text-xs flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Bảo Mật &amp; Cô Lập Workspace</span>
            </h3>
            <div className="p-3 bg-[#161f2e] border border-slate-700/60 rounded-lg space-y-2 text-[11px]">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-300">Mã hóa NVIDIA API Key</span>
                <span className="text-emerald-400 font-medium">Bật (Fernet AES-128-CBC)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-300">Chặn duyệt file ngoài Workspace (Anti-Traversal)</span>
                <span className="text-emerald-400 font-medium">Kích hoạt nghiêm ngặt</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-300">Cơ chế an toàn lệnh nguy hiểm (rmdir, format...)</span>
                <span className="text-emerald-400 font-medium">Yêu cầu xác nhận thủ công</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
