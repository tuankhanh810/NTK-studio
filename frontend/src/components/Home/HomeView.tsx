import React from 'react';
import {
  Code2,
  Cpu,
  Gamepad2,
  Gauge,
  FolderOpen,
  Sliders,
  Bot,
  Activity,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { useModelStore } from '../../stores/useModelStore';

interface HomeViewProps {
  onOpenProject: () => void;
  onOpenModelManager: () => void;
  onOpenAgent: () => void;
  onOpenBenchmark: () => void;
  onOpenModelSelector: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onOpenProject,
  onOpenModelManager,
  onOpenAgent,
  onOpenBenchmark,
  onOpenModelSelector,
}) => {
  const { connections, models, activeModelId } = useModelStore();
  const activeModel = models.find((m) => m.id === activeModelId);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#0b101c] via-[#090d17] to-[#070a12] text-slate-100 p-6 md:p-10 select-none">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* HERO SECTION */}
        <div className="relative text-center pt-4 pb-6 overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-cyan-500/15 via-purple-500/15 to-transparent rounded-full blur-3xl pointer-events-none"></div>

          {/* Large Stylized Logo */}
          <div className="inline-block relative mb-5 group">
            <div className="w-24 h-24 md:w-28 md:h-28 mx-auto rounded-3xl bg-gradient-to-br from-[#131d33] via-[#0d1424] to-[#080d18] border-2 border-cyan-400/40 p-4 shadow-2xl shadow-cyan-500/20 transition-transform duration-500 group-hover:scale-105">
              <svg viewBox="0 0 512 512" className="w-full h-full drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
                <defs>
                  <linearGradient id="heroBorderG" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
                <path d="M 132 136 L 180 136 L 180 376 L 132 376 Z" fill="#ffffff" />
                <path d="M 172 136 L 222 136 L 312 376 L 262 376 Z" fill="#38bdf8" />
                <path d="M 264 136 L 312 136 L 312 376 L 264 376 Z" fill="#38bdf8" />
                <path d="M 292 272 L 382 144 L 436 144 L 332 284 Z" fill="#c084fc" />
                <path d="M 314 260 L 436 368 L 380 376 L 276 288 Z" fill="#a855f7" />
                <circle cx="316" cy="276" r="16" fill="#ffffff" />
                <circle cx="316" cy="276" r="8" fill="#38bdf8" />
              </svg>
            </div>
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500 to-purple-500 opacity-20 blur group-hover:opacity-40 transition duration-500 pointer-events-none"></div>
          </div>

          {/* Titles & Slogans */}
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2">
            NTK STUDIO
          </h1>
          <p className="text-base md:text-lg font-semibold tracking-wide bg-gradient-to-r from-sky-300 via-indigo-200 to-purple-300 bg-clip-text text-transparent mb-3">
            Universal AI Coding IDE
          </p>

          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-950/40 via-purple-950/40 to-blue-950/40 border border-cyan-500/30 px-4 py-1.5 rounded-full text-xs font-medium text-cyan-200 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Đa mô hình · Đa nền tảng · Agentic Coding · Sáng tạo không giới hạn</span>
          </div>
        </div>

        {/* 4 FEATURE HIGHLIGHT CARDS */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Năng lực cốt lõi của NTK Studio</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#101726]/80 border border-[#1e2a40] hover:border-cyan-500/40 rounded-2xl p-5 transition group hover:shadow-xl hover:shadow-cyan-500/5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-100 mb-1.5">Lập Trình Chuyên Sâu</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Trình soạn thảo Monaco Editor mạnh mẽ, tô sáng mã nguồn hơn 60 ngôn ngữ, phím tắt linh hoạt và tích hợp PowerShell.
              </p>
            </div>

            <div className="bg-[#101726]/80 border border-[#1e2a40] hover:border-indigo-500/40 rounded-2xl p-5 transition group hover:shadow-xl hover:shadow-indigo-500/5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-100 mb-1.5">AI Đa Nhà Cung Cấp</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Kết nối đồng thời NVIDIA NIM, OpenAI, Anthropic Claude, Gemini, Ollama mà không cần chỉnh sửa mã nguồn.
              </p>
            </div>

            <div className="bg-[#101726]/80 border border-[#1e2a40] hover:border-purple-500/40 rounded-2xl p-5 transition group hover:shadow-xl hover:shadow-purple-500/5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-100 mb-1.5">Phát Triển Đa Dạng</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hỗ trợ lập trình ứng dụng Desktop, Web hiện đại và tích hợp giao thức MCP dành cho Game Development.
              </p>
            </div>

            <div className="bg-[#101726]/80 border border-[#1e2a40] hover:border-emerald-500/40 rounded-2xl p-5 transition group hover:shadow-xl hover:shadow-emerald-500/5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <Gauge className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-100 mb-1.5">Hiệu Suất & Quota Tối Ưu</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Giám sát RPM/TPM thời gian thực, thuật toán tự động backoff phục hồi lỗi 429 và định tuyến Auto Router thông minh.
              </p>
            </div>
          </div>
        </div>

        {/* 4 QUICK ACTION CARDS */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Thao tác nhanh</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={onOpenProject}
              className="text-left bg-gradient-to-br from-[#121a2c] to-[#0c121e] border border-cyan-500/25 hover:border-cyan-400/60 rounded-2xl p-5 transition group hover:shadow-xl hover:shadow-cyan-500/10 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition" />
              </div>
              <h4 className="font-bold text-sm text-slate-100 mb-1">Mở Dự Án</h4>
              <p className="text-[11px] text-slate-400">Truy cập không gian làm việc, mở thư mục và bắt đầu viết code.</p>
            </button>

            <button
              onClick={onOpenModelManager}
              className="text-left bg-gradient-to-br from-[#121a2c] to-[#0c121e] border border-indigo-500/25 hover:border-indigo-400/60 rounded-2xl p-5 transition group hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
              </div>
              <h4 className="font-bold text-sm text-slate-100 mb-1">Quản Lý Model</h4>
              <p className="text-[11px] text-slate-400">Thêm API Key, kết nối 7 bước và quét danh mục Dynamic Discovery.</p>
            </button>

            <button
              onClick={onOpenAgent}
              className="text-left bg-gradient-to-br from-[#121a2c] to-[#0c121e] border border-purple-500/25 hover:border-purple-400/60 rounded-2xl p-5 transition group hover:shadow-xl hover:shadow-purple-500/10 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition" />
              </div>
              <h4 className="font-bold text-sm text-slate-100 mb-1">Agentic Coding</h4>
              <p className="text-[11px] text-slate-400">Trợ lý AI đa bước tự phân tích, chỉnh sửa file và tự sửa lỗi.</p>
            </button>

            <button
              onClick={onOpenBenchmark}
              className="text-left bg-gradient-to-br from-[#121a2c] to-[#0c121e] border border-emerald-500/25 hover:border-emerald-400/60 rounded-2xl p-5 transition group hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
              </div>
              <h4 className="font-bold text-sm text-slate-100 mb-1">Bộ Kiểm Định Model</h4>
              <p className="text-[11px] text-slate-400">Đo đạc TTFT, TPS, năng lực suy luận và sinh mã thuật toán.</p>
            </button>
          </div>
        </div>

        {/* STATUS & GETTING STARTED SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Model Snapshot */}
          <div className="bg-[#101726] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mô hình hiện tại</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {activeModel?.verification_status || 'VERIFIED'}
                </span>
              </div>
              <h4 className="font-bold text-base text-slate-100 truncate">
                {activeModel?.display_name || 'DeepSeek R1 / Llama 3.3 Auto'}
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-1 truncate">
                {activeModel?.model_id || 'Chế độ Auto Router thông minh'}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Nhà cung cấp:</span>
                <span className="text-slate-200 font-medium">{activeModel?.connection_name || 'Auto Router'}</span>
              </div>
            </div>

            <button
              onClick={onOpenModelSelector}
              className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition flex items-center justify-center space-x-1.5"
            >
              <span>Mở bộ chọn Antigravity Model</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3 Steps Getting Started Guide */}
          <div className="lg:col-span-2 bg-[#101726] border border-slate-800 rounded-2xl p-6">
            <h4 className="font-bold text-sm text-slate-100 mb-4 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Hướng Dẫn Khởi Đầu Nhanh cùng NTK Studio</span>
            </h4>

            <div className="space-y-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h5 className="font-semibold text-xs text-slate-200">Kết nối Nhà cung cấp AI</h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    Vào <strong>Quản lý Model</strong>, chọn Preset (NVIDIA NIM, OpenAI, Anthropic, Gemini...) và dán API Key. Nhấn <strong>"Kết nối & Discovery"</strong> để tự động quét toàn bộ model khả dụng.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h5 className="font-semibold text-xs text-slate-200">Phân vai trò Model (Model Roles)</h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    Mở <strong>Bộ chọn Model</strong> để gán model riêng biệt cho Chat, Coding, Planning, Debugging hoặc kích hoạt <strong>Auto Router</strong> để hệ thống tự lựa chọn tối ưu theo benchmark.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h5 className="font-semibold text-xs text-slate-200">Lập trình & Agentic Coding tự động</h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    Mở thư mục dự án và gửi yêu cầu cho AI Agent. Agent sẽ phân tích kiến trúc, trực tiếp thao tác tệp, thực thi terminal và tự động sửa lỗi (Auto-Debug Loop).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
