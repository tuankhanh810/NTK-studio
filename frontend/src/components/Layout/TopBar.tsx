import React from 'react';
import { Folder, Activity, Settings as SettingsIcon, Server, Database, Zap, Cpu } from 'lucide-react';
import { useModelStore } from '../../stores/useModelStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

interface TopBarProps {
  onOpenModelManager: () => void;
  onOpenMCPModal: () => void;
  onOpenSettings: () => void;
  onOpenModelSelector?: () => void;
  onNavigateHome?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenModelManager,
  onOpenMCPModal,
  onOpenSettings,
  onOpenModelSelector,
  onNavigateHome,
}) => {
  const { models, activeModelId, metrics } = useModelStore();
  const { workspaceRoot, setWorkspaceRoot } = useWorkspaceStore();

  const activeModel = models.find((m) => m.id === activeModelId);

  const handleOpenFolder = () => {
    const input = prompt('Nhập đường dẫn thư mục dự án (Workspace):', workspaceRoot);
    if (input && input.trim()) {
      setWorkspaceRoot(input.trim());
    }
  };

  return (
    <header className="h-13 bg-[#0a0e17] border-b border-[#1a2333] flex items-center justify-between px-4 select-none shrink-0 z-10">
      {/* Brand & Workspace Directory */}
      <div className="flex items-center space-x-3">
        <div
          onClick={onNavigateHome}
          className="flex items-center space-x-2.5 cursor-pointer hover:opacity-90 transition group"
          title="Về Trang chủ NTK Studio"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#131d33] to-[#080d18] border border-cyan-500/40 flex items-center justify-center p-1.5 shadow-md shadow-cyan-500/10 shrink-0">
            <svg viewBox="0 0 512 512" className="w-full h-full">
              <path d="M 132 136 L 180 136 L 180 376 L 132 376 Z" fill="#ffffff" />
              <path d="M 172 136 L 222 136 L 312 376 L 262 376 Z" fill="#38bdf8" />
              <path d="M 264 136 L 312 136 L 312 376 L 264 376 Z" fill="#38bdf8" />
              <path d="M 292 272 L 382 144 L 436 144 L 332 284 Z" fill="#c084fc" />
              <path d="M 314 260 L 436 368 L 380 376 L 276 288 Z" fill="#a855f7" />
              <circle cx="316" cy="276" r="14" fill="#ffffff" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-sm tracking-wider text-white">NTK STUDIO</span>
              <span className="text-[9px] bg-gradient-to-r from-cyan-500/15 to-purple-500/15 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                1.2.0
              </span>
            </div>
            <span className="text-[9px] text-slate-400 tracking-wider hidden sm:block">Universal AI Coding IDE</span>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 mx-1" />

        {/* Workspace directory */}
        <button
          onClick={handleOpenFolder}
          className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-[#111724] hover:bg-[#172133] border border-slate-800 px-2.5 py-1.5 rounded-lg transition"
          title="Chọn thư mục làm việc"
        >
          <Folder className="w-3.5 h-3.5 text-amber-400" />
          <span className="truncate max-w-[200px] font-mono text-[11px]">
            {workspaceRoot.split(/[/\\]/).pop() || workspaceRoot}
          </span>
        </button>
      </div>

      {/* Model Selector & Live Quota Gauge */}
      <div className="flex items-center space-x-3">
        {/* Antigravity Model Trigger Button */}
        <button
          onClick={onOpenModelSelector || onOpenModelManager}
          className="flex items-center space-x-2 bg-[#101726] hover:bg-[#162136] border border-slate-700/80 hover:border-cyan-500/60 px-3 py-1.5 rounded-xl text-xs transition shadow-sm group"
          title="Nhấn để mở Bộ chọn Model Antigravity & Phân vai trò"
        >
          {!activeModelId || activeModelId === 'auto' ? (
            <>
              <div className="w-4 h-4 rounded bg-cyan-500/20 flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-cyan-400 group-hover:scale-110 transition" />
              </div>
              <span className="font-semibold text-cyan-300">⚡ Auto Router (Tự động định tuyến)</span>
            </>
          ) : (
            <>
              <div className="w-4 h-4 rounded bg-purple-500/20 flex items-center justify-center">
                <Cpu className="w-2.5 h-2.5 text-purple-400" />
              </div>
              <span className="font-semibold text-slate-100 max-w-[190px] truncate">
                {activeModel?.display_name || activeModelId}
              </span>
              {activeModel?.provider_type && (
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                  {activeModel.provider_type}
                </span>
              )}
            </>
          )}
          <span className="text-slate-500 group-hover:text-slate-300 text-[10px] pl-1 font-mono">▼</span>
        </button>

        {/* Rate Limit Stats chip */}
        {metrics && (
          <div
            onClick={onOpenModelManager}
            className="hidden lg:flex items-center space-x-2 bg-[#101726] border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] cursor-pointer hover:border-slate-700 transition"
            title="Nhấn để mở Quản lý Quota & Model"
          >
            <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span className="text-slate-300">
              RPM: <strong className="text-emerald-400">{metrics.current_rpm}</strong>/{metrics.max_rpm}
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-300">
              TPM: <strong className="text-cyan-400">{(metrics.current_tpm / 1000).toFixed(1)}k</strong>
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenModelManager}
          className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-[#101726] hover:bg-[#162136] border border-slate-800 px-2.5 py-1.5 rounded-xl transition"
        >
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Quản lý Model</span>
        </button>

        <button
          onClick={onOpenMCPModal}
          className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-[#101726] hover:bg-[#162136] border border-slate-800 px-2.5 py-1.5 rounded-xl transition"
        >
          <Server className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">MCP</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-400 hover:text-white bg-[#101726] hover:bg-[#162136] border border-slate-800 rounded-xl transition"
          title="Cài đặt hệ thống"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
