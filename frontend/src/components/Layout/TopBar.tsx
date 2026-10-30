import React from 'react';
import { Cpu, Folder, Activity, Settings as SettingsIcon, Server, Database } from 'lucide-react';
import { useModelStore } from '../../stores/useModelStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

interface TopBarProps {
  onOpenModelManager: () => void;
  onOpenMCPModal: () => void;
  onOpenSettings: () => void;
  onOpenModelSelector?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenModelManager,
  onOpenMCPModal,
  onOpenSettings,
  onOpenModelSelector,
}) => {
  const { models, selectedModelId, metrics } = useModelStore();
  const { workspaceRoot, setWorkspaceRoot } = useWorkspaceStore();

  const activeModel = models.find((m) => m.id === selectedModelId);

  const handleOpenFolder = () => {
    const input = prompt('Nhập đường dẫn thư mục dự án (Workspace):', workspaceRoot);
    if (input && input.trim()) {
      setWorkspaceRoot(input.trim());
    }
  };

  return (
    <header className="h-12 bg-[#121824] border-b border-[#252f3f] flex items-center justify-between px-4 select-none shrink-0 z-10">
      {/* Brand & Project */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-100 tracking-wide text-sm">NTK STUDIO</span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-medium">
            v1.1.0 PRO
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-700 mx-2" />

        {/* Workspace directory */}
        <button
          onClick={handleOpenFolder}
          className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-[#1a2332] hover:bg-[#222d3d] border border-slate-700/60 px-2.5 py-1 rounded transition"
          title="Chọn thư mục làm việc"
        >
          <Folder className="w-3.5 h-3.5 text-amber-400" />
          <span className="truncate max-w-[200px]">{workspaceRoot.split(/[/\\]/).pop() || workspaceRoot}</span>
        </button>
      </div>

      {/* Model Selector & Live Quota Gauge */}
      <div className="flex items-center space-x-3">
        {/* Antigravity-Style Model Trigger Button */}
        <button
          onClick={onOpenModelSelector || onOpenModelManager}
          className="flex items-center space-x-2 bg-[#16212e] hover:bg-[#1b2a3b] border border-slate-700 hover:border-emerald-500/70 px-3 py-1.5 rounded-lg text-xs transition shadow-sm group"
          title="Nhấn để mở Bộ chọn Model Antigravity & Phân vai trò"
        >
          {selectedModelId === 'auto' ? (
            <>
              <div className="w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-emerald-400 group-hover:scale-110 transition" />
              </div>
              <span className="font-semibold text-emerald-400">⚡ Tự động định tuyến (Auto Router)</span>
            </>
          ) : (
            <>
              <div className="w-4 h-4 rounded bg-cyan-500/20 flex items-center justify-center">
                <Cpu className="w-2.5 h-2.5 text-cyan-400" />
              </div>
              <span className="font-semibold text-slate-100 max-w-[180px] truncate">
                {activeModel?.display_name || selectedModelId}
              </span>
              {activeModel?.provider_type && (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
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
            className="flex items-center space-x-2 bg-[#1a2230] border border-slate-700/60 px-2.5 py-1 rounded text-[11px] cursor-pointer hover:border-slate-500 transition"
            title="Nhấn để mở Quản lý Quota & Model"
          >
            <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span className="text-slate-300">
              RPM: <strong className="text-emerald-400">{metrics.current_rpm}</strong>/{metrics.max_rpm}
            </span>
            <span className="text-slate-600">|</span>
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
          className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-[#1a2332] hover:bg-[#243044] border border-slate-700/60 px-2.5 py-1.5 rounded transition"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Quản lý Model</span>
        </button>

        <button
          onClick={onOpenMCPModal}
          className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-[#1a2332] hover:bg-[#243044] border border-slate-700/60 px-2.5 py-1.5 rounded transition"
        >
          <Server className="w-3.5 h-3.5 text-indigo-400" />
          <span>MCP</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-400 hover:text-white bg-[#1a2332] hover:bg-[#243044] border border-slate-700/60 rounded transition"
          title="Cài đặt hệ thống"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
