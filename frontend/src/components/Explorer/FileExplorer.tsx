import React, { useEffect, useState } from 'react';
import { Folder, FileCode, RefreshCw, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

export const FileExplorer: React.FC = () => {
  const { workspaceRoot, treeSummary, refreshTree, openFile } = useWorkspaceStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    refreshTree();
  }, [workspaceRoot]);

  return (
    <div className="h-full flex flex-col bg-[#111722] text-slate-300 text-xs select-none">
      {/* Header */}
      <div className="h-9 px-3 border-b border-[#202938] flex items-center justify-between">
        <span className="font-semibold text-slate-200 tracking-wider uppercase text-[11px]">
          EXPLORER
        </span>
        <button
          onClick={refreshTree}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
          title="Làm mới thư mục"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Root folder accordion */}
      <div className="p-2 border-b border-[#1d2635] flex items-center justify-between bg-[#141b27]">
        <div
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center space-x-1 cursor-pointer font-medium text-slate-200 truncate"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <Folder className="w-3.5 h-3.5 text-amber-400" />
          <span className="truncate">{treeSummary?.root_name || 'Workspace'}</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          {treeSummary?.total_files || 0} files
        </span>
      </div>

      {/* Tree view */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed">
        {treeSummary?.tree_text ? (
          <div className="space-y-1">
            {treeSummary.tree_text.split('\n').map((line: string, idx: number) => {
              const isDir = line.endsWith('/');
              // extract filename from tree line
              const cleanName = line.replace(/^[│├└──\s]+/, '').replace(/\/$/, '');
              return (
                <div
                  key={idx}
                  onClick={() => !isDir && openFile(cleanName)}
                  className={`flex items-center space-x-1.5 px-1.5 py-0.5 rounded cursor-pointer transition ${
                    isDir
                      ? 'text-slate-400 font-semibold'
                      : 'text-slate-300 hover:bg-[#1a2332] hover:text-emerald-400'
                  }`}
                >
                  {isDir ? (
                    <Folder className="w-3 h-3 text-amber-400 shrink-0" />
                  ) : (
                    <FileCode className="w-3 h-3 text-cyan-400 shrink-0" />
                  )}
                  <span className="truncate">{line}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-slate-500 py-8">
            <Folder className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>Đang tải thư mục...</p>
          </div>
        )}
      </div>

      {/* Framework tags */}
      {treeSummary?.detected_frameworks?.length > 0 && (
        <div className="p-2 border-t border-[#202938] bg-[#0f1520] text-[10px] text-slate-400 flex flex-wrap gap-1">
          {treeSummary.detected_frameworks.map((f: string, i: number) => (
            <span key={i} className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
