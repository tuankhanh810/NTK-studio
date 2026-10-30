import React from 'react';
import { Files, Search, GitBranch, Database, Terminal, Settings } from 'lucide-react';

export type SidebarTab = 'files' | 'search' | 'git' | 'models' | 'terminal';

interface ActivityBarProps {
  activeTab: SidebarTab;
  onChangeTab: (tab: SidebarTab) => void;
  onOpenSettings: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  onChangeTab,
  onOpenSettings,
}) => {
  const items = [
    { id: 'files' as SidebarTab, icon: Files, title: 'Tập tin (Explorer)' },
    { id: 'git' as SidebarTab, icon: GitBranch, title: 'Kiểm soát phiên bản (Git)' },
    { id: 'models' as SidebarTab, icon: Database, title: 'Quản lý Model NVIDIA' },
    { id: 'terminal' as SidebarTab, icon: Terminal, title: 'Terminal / CLI' },
  ];

  return (
    <aside className="w-12 bg-[#0d121a] border-r border-[#202938] flex flex-col items-center justify-between py-2 select-none shrink-0 z-10">
      <div className="flex flex-col items-center space-y-2">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = activeTab === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChangeTab(it.id)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title={it.title}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      <button
        onClick={onOpenSettings}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
        title="Cài đặt hệ thống"
      >
        <Settings className="w-5 h-5" />
      </button>
    </aside>
  );
};
