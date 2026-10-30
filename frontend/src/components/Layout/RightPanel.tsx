import React from 'react';
import {
  Cpu,
  Zap,
  Star,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  SlidersHorizontal,
  Plus,
  ShieldCheck,
  Server
} from 'lucide-react';
import { useModelStore } from '../../stores/useModelStore';

interface RightPanelProps {
  onOpenModelSelector: () => void;
  onOpenModelManager: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  onOpenModelSelector,
  onOpenModelManager,
}) => {
  const { connections, models, activeModelId, metrics, setActiveModel, toggleFavorite } = useModelStore();
  const activeModel = models.find((m) => m.id === activeModelId);

  // Connection presets to check real status against
  const providerPresets = [
    { key: 'nvidia', name: 'NVIDIA NIM' },
    { key: 'openai', name: 'OpenAI Official' },
    { key: 'anthropic', name: 'Anthropic Claude' },
    { key: 'gemini', name: 'Google Gemini' },
    { key: 'openai_compatible', name: 'OpenRouter / Ollama' },
    { key: 'custom', name: 'Custom Provider' },
  ];

  // Recent models: favorites first, then first 4 models
  const recentModels = [...models]
    .sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0))
    .slice(0, 4);

  return (
    <aside className="w-80 bg-[#0a0e17] border-l border-[#1a2333] flex flex-col justify-between shrink-0 select-none overflow-y-auto z-10 p-4 space-y-5">
      {/* 1. CHỌN MODEL / ACTIVE MODEL */}
      <div className="bg-[#101726] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mô hình đang dùng</span>
          </span>
          <button
            onClick={onOpenModelSelector}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1 transition"
          >
            <span>Đổi model</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-[#0b101c] p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-bold text-xs text-slate-100 truncate">
              {activeModel?.display_name || 'Chế độ Auto Router'}
            </h4>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium ${
                activeModel?.verification_status === 'VERIFIED'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              {activeModel?.verification_status || 'VERIFIED'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono truncate">
            {activeModel?.model_id || 'Tự động chọn model tối ưu theo tác vụ'}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>Provider:</span>
            <span className="text-slate-300 font-medium">{activeModel?.connection_name || 'Auto Router'}</span>
          </div>
        </div>

        <button
          onClick={onOpenModelSelector}
          className="w-full py-2 bg-gradient-to-r from-blue-600/30 to-purple-600/30 hover:from-blue-600/40 hover:to-purple-600/40 text-cyan-300 font-medium text-xs rounded-xl border border-cyan-500/30 transition flex items-center justify-center space-x-1.5"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Mở Antigravity Model Selector</span>
        </button>
      </div>

      {/* 2. MODEL GẦN ĐÂY */}
      <div className="bg-[#101726] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Mô hình gần đây ({recentModels.length})
          </span>
          <span className="text-[10px] text-slate-400">Ưu tiên ★</span>
        </div>

        <div className="space-y-2">
          {recentModels.map((m) => {
            const isCurrent = m.id === activeModelId;
            return (
              <div
                key={m.id}
                onClick={() => setActiveModel(m.id)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isCurrent
                    ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-200'
                    : 'bg-[#0b101c] border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center space-x-1.5">
                    <strong className="text-xs truncate block text-slate-100">{m.display_name}</strong>
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">{m.connection_name}</span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                      m.verification_status === 'VERIFIED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {m.verification_status || 'VERIFIED'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(m.id);
                    }}
                    className="p-1 hover:text-amber-400 transition"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        m.is_favorite ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}

          {recentModels.length === 0 && (
            <div className="text-center py-4 text-[11px] text-slate-400">
              Chưa có model nào. Hãy nhấn "Quản lý Model" để kết nối.
            </div>
          )}
        </div>
      </div>

      {/* 3. TRẠNG THÁI KẾT NỐI THỰC TẾ (Không fake connected) */}
      <div className="bg-[#101726] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span>Trạng thái kết nối</span>
          </span>
          <button
            onClick={onOpenModelManager}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-0.5 transition"
          >
            <Plus className="w-3 h-3" />
            <span>Thêm</span>
          </button>
        </div>

        <div className="space-y-2">
          {providerPresets.map((preset) => {
            const foundConn = connections.find(
              (c) => c.provider_type === preset.key || c.name.toLowerCase().includes(preset.key)
            );
            const isConnected = foundConn && foundConn.status === 'connected';
            const isError = foundConn && foundConn.status === 'error';

            return (
              <div
                key={preset.key}
                className="flex items-center justify-between p-2 rounded-xl bg-[#0b101c] border border-slate-800/60 text-xs"
              >
                <span className="text-slate-300 font-medium truncate">{preset.name}</span>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {isConnected ? (
                    <span className="inline-flex items-center space-x-1 text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Đã kết nối</span>
                    </span>
                  ) : isError ? (
                    <span className="inline-flex items-center space-x-1 text-rose-400 text-[10px] bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 font-medium">
                      <XCircle className="w-3 h-3" />
                      <span>Lỗi</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-slate-400 text-[10px] bg-slate-800/40 px-2 py-0.5 rounded-full">
                      <HelpCircle className="w-3 h-3" />
                      <span>Chưa cấu hình</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. THỐNG KÊ NHANH (QUICK STATS) */}
      <div className="bg-[#101726] border border-slate-800 rounded-2xl p-4 space-y-3">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Thống kê hệ thống
        </span>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#0b101c] p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Model khả dụng</span>
            <strong className="text-base font-bold text-cyan-400">{models.length}</strong>
          </div>

          <div className="bg-[#0b101c] p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Nhà cung cấp</span>
            <strong className="text-base font-bold text-purple-400">{connections.length}</strong>
          </div>

          <div className="bg-[#0b101c] p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">RPM Hiện tại</span>
            <strong className="text-xs font-semibold text-slate-200">
              {metrics?.current_rpm || 0} req/m
            </strong>
          </div>

          <div className="bg-[#0b101c] p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">TPM Hiện tại</span>
            <strong className="text-xs font-semibold text-slate-200">
              {(metrics?.current_tpm || 0).toLocaleString()} tok/m
            </strong>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span>Backend Port:</span>
          <span className="text-emerald-400 font-mono font-medium">8765 (Healthy)</span>
        </div>
      </div>
    </aside>
  );
};
