import React from 'react';
import {
  Home,
  FolderCode,
  Cpu,
  Activity,
  Bot,
  GitBranch,
  Terminal,
  Settings,
  Layers,
} from 'lucide-react';

export type MainViewTab = 'home' | 'project' | 'models' | 'benchmark' | 'agent' | 'git' | 'terminal';

interface LeftSidebarProps {
  activeTab: MainViewTab;
  onChangeTab: (tab: MainViewTab) => void;
  onOpenModelManager: () => void;
  onOpenSettings: () => void;
  onOpenMCP: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab,
  onChangeTab,
  onOpenModelManager,
  onOpenSettings,
  onOpenMCP,
}) => {
  const navItems = [
    {
      id: 'home' as MainViewTab,
      label: 'Trang chủ',
      icon: Home,
      action: () => onChangeTab('home'),
    },
    {
      id: 'project' as MainViewTab,
      label: 'Dự án',
      icon: FolderCode,
      action: () => onChangeTab('project'),
    },
    {
      id: 'models' as MainViewTab,
      label: 'Quản lý Model',
      icon: Cpu,
      action: () => onOpenModelManager(),
    },
    {
      id: 'benchmark' as MainViewTab,
      label: 'Benchmark',
      icon: Activity,
      action: () => {
        onChangeTab('benchmark');
        onOpenModelManager();
      },
    },
    {
      id: 'agent' as MainViewTab,
      label: 'Agentic Coding',
      icon: Bot,
      action: () => onChangeTab('agent'),
    },
    {
      id: 'git' as MainViewTab,
      label: 'Git Source',
      icon: GitBranch,
      action: () => onChangeTab('git'),
    },
    {
      id: 'terminal' as MainViewTab,
      label: 'Terminal',
      icon: Terminal,
      action: () => onChangeTab('terminal'),
    },
  ];

  return (
    <aside className="w-16 md:w-56 bg-[#0a0e17] border-r border-[#1a2333] flex flex-col justify-between shrink-0 select-none z-20">
      {/* Brand Header */}
      <div>
        <div
          onClick={() => onChangeTab('home')}
          className="h-14 px-3 md:px-4 border-b border-[#1a2333] flex items-center space-x-3 cursor-pointer hover:bg-slate-800/40 transition"
          title="Về Trang chủ NTK Studio"
        >
          {/* Logo Emblem */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#121929] to-[#070b13] border border-cyan-500/40 flex items-center justify-center p-1.5 shadow-lg shadow-cyan-500/10 shrink-0">
            <svg viewBox="0 0 512 512" className="w-full h-full">
              <rect x="28" y="28" width="456" height="456" rx="96" fill="#0d1424" stroke="url(#sbG)" strokeWidth="18" />
              <defs>
                <linearGradient id="sbG" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
              <path d="M 132 136 L 180 136 L 180 376 L 132 376 Z" fill="#ffffff" />
              <path d="M 172 136 L 222 136 L 312 376 L 262 376 Z" fill="#38bdf8" />
              <path d="M 264 136 L 312 136 L 312 376 L 264 376 Z" fill="#38bdf8" />
              <path d="M 292 272 L 382 144 L 436 144 L 332 284 Z" fill="#c084fc" />
              <path d="M 314 260 L 436 368 L 380 376 L 276 288 Z" fill="#a855f7" />
              <circle cx="316" cy="276" r="14" fill="#ffffff" />
            </svg>
          </div>

          <div className="hidden md:flex flex-col min-w-0">
            <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-white via-slate-100 to-sky-300 bg-clip-text text-transparent truncate">
              NTK STUDIO
            </span>
            <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase truncate">
              AI Coding IDE
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-2 space-y-1">
          <div className="hidden md:block px-3 py-1.5 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
            Điều hướng
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/10 text-cyan-300 border border-blue-500/30 shadow-md shadow-blue-500/5'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#141b2a] border border-transparent'
                }`}
                title={item.label}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300'
                  }`}
                />
                <span className="hidden md:inline truncate">{item.label}</span>
                {isActive && (
                  <div className="hidden md:block absolute right-2.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Navigation (MCP & Settings) */}
      <div className="p-2 border-t border-[#1a2333] space-y-1">
        <button
          onClick={onOpenMCP}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-[#141b2a] border border-transparent transition"
          title="MCP (Model Context Protocol)"
        >
          <Layers className="w-4 h-4 shrink-0 text-slate-400" />
          <span className="hidden md:inline truncate">MCP Protocol</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-[#141b2a] border border-transparent transition"
          title="Cài đặt hệ thống"
        >
          <Settings className="w-4 h-4 shrink-0 text-slate-400" />
          <span className="hidden md:inline truncate">Cài đặt</span>
        </button>
      </div>
    </aside>
  );
};
