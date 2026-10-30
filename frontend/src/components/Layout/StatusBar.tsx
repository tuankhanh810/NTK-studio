import React from 'react';
import { GitBranch, Activity, Cpu, CheckCircle } from 'lucide-react';
import { useModelStore } from '../../stores/useModelStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

export const StatusBar: React.FC = () => {
  const { selectedModelId, models, metrics } = useModelStore();
  const { gitStatus, workspaceRoot } = useWorkspaceStore();

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const modelDisplayName =
    selectedModelId === 'auto'
      ? '⚡ Auto Model Router'
      : selectedModel?.display_name || selectedModelId;

  const hasGitChanges = gitStatus && gitStatus.trim().length > 0;

  return (
    <footer className="h-6 bg-[#0c1017] border-t border-[#1d2533] px-3 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0 font-mono">
      <div className="flex items-center space-x-3">
        {/* Status */}
        <div className="flex items-center space-x-1.5 text-emerald-400">
          <CheckCircle className="w-3 h-3" />
          <span className="font-sans">NTK Studio v1.1.0 Sẵn Sàng</span>
        </div>

        <span className="text-slate-700">|</span>

        {/* Current Active Model */}
        <div className="flex items-center space-x-1 text-slate-300">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span>{modelDisplayName}</span>
        </div>

        <span className="text-slate-700">|</span>

        {/* Git */}
        <div className="flex items-center space-x-1">
          <GitBranch className="w-3 h-3 text-indigo-400" />
          <span className={hasGitChanges ? 'text-amber-400' : 'text-slate-400'}>
            {hasGitChanges ? 'Thay đổi chưa commit' : 'Clean'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {metrics && (
          <div className="flex items-center space-x-3 text-[10px]">
            <span>
              RPM: <strong className="text-emerald-400">{metrics.current_rpm}</strong>/{metrics.max_rpm}
            </span>
            <span>
              TPM: <strong className="text-cyan-400">{(metrics.current_tpm / 1000).toFixed(1)}k</strong>
            </span>
            <span>
              Queue: <strong className="text-slate-300">{metrics.queue_length}</strong>
            </span>
          </div>
        )}

        <span className="text-slate-500 font-sans truncate max-w-[250px]">{workspaceRoot}</span>
      </div>
    </footer>
  );
};
