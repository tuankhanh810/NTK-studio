import React, { useState, useEffect } from 'react';
import { GitBranch, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';
import { useModelStore } from '../../stores/useModelStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

export const StatusBar: React.FC = () => {
  const { activeModelId, models, metrics } = useModelStore();
  const { gitStatus, workspaceRoot } = useWorkspaceStore();
  const [backendReady, setBackendReady] = useState(true);

  useEffect(() => {
    // Check if Electron provided IPC status listener
    const ntkWin = (window as any).ntkStudio;
    if (ntkWin && ntkWin.onBackendStatus) {
      ntkWin.onBackendStatus((status: { ready: boolean; port: number }) => {
        setBackendReady(status.ready);
      });
    }

    // Periodic health check ping
    const checkHealth = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8765/api/health');
        setBackendReady(res.ok);
      } catch (e) {
        setBackendReady(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeModel = models.find((m) => m.id === activeModelId);
  const modelDisplayName =
    !activeModelId || activeModelId === 'auto'
      ? '⚡ Auto Router'
      : activeModel?.display_name || activeModelId;

  const hasGitChanges = gitStatus && gitStatus.trim().length > 0;

  return (
    <footer className="h-6 bg-[#080c14] border-t border-[#1a2333] px-3 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0 font-mono z-20">
      <div className="flex items-center space-x-3">
        {/* Backend Status */}
        {backendReady ? (
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span className="font-sans text-[11px]">Backend Sẵn sàng (8765)</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-amber-400 animate-pulse">
            <AlertCircle className="w-3 h-3" />
            <span className="font-sans text-[11px]">Backend: Đang kết nối...</span>
          </div>
        )}

        <span className="text-slate-800">|</span>

        {/* Current Active Model */}
        <div className="flex items-center space-x-1 text-slate-300">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span className="truncate max-w-[220px]">{modelDisplayName}</span>
        </div>

        <span className="text-slate-800">|</span>

        {/* Git status */}
        <div className="flex items-center space-x-1">
          <GitBranch className="w-3 h-3 text-indigo-400" />
          <span className={hasGitChanges ? 'text-amber-400' : 'text-slate-500'}>
            {hasGitChanges ? 'Git: Thay đổi chưa commit' : 'Git: Clean'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {metrics && (
          <div className="hidden sm:flex items-center space-x-3 text-[10px]">
            <span>
              RPM: <strong className="text-emerald-400">{metrics.current_rpm}</strong>/{metrics.max_rpm}
            </span>
            <span>
              TPM: <strong className="text-cyan-400">{(metrics.current_tpm / 1000).toFixed(1)}k</strong>
            </span>
            <span>
              Hàng đợi: <strong className="text-slate-300">{metrics.queue_length}</strong>
            </span>
          </div>
        )}

        <span className="text-slate-500 font-sans truncate max-w-[240px] text-[10px]">
          {workspaceRoot}
        </span>

        <span className="text-[10px] text-cyan-400/90 font-sans font-bold pl-1">
          NTK Studio 1.2.0
        </span>
      </div>
    </footer>
  );
};
