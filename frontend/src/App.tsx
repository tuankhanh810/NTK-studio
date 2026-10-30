import React, { useState, useEffect } from 'react';
import { TopBar } from './components/Layout/TopBar';
import { ActivityBar } from './components/Layout/ActivityBar';
import type { SidebarTab } from './components/Layout/ActivityBar';
import { FileExplorer } from './components/Explorer/FileExplorer';
import { CodeEditor } from './components/Editor/CodeEditor';
import { AgentChatPanel } from './components/AgentChat/AgentChatPanel';
import { TerminalPanel } from './components/Terminal/TerminalPanel';
import { StatusBar } from './components/Layout/StatusBar';
import { ModelManagerModal } from './components/ModelManager/ModelManagerModal';
import { ModelSelectorModal } from './components/ModelSelector/ModelSelectorModal';
import { MCPModal } from './components/MCP/MCPModal';
import { SettingsModal } from './components/Settings/SettingsModal';
import { useModelStore } from './stores/useModelStore';
import { useWorkspaceStore } from './stores/useWorkspaceStore';

export const App: React.FC = () => {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files');
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isMCPOpen, setIsMCPOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { fetchConnections, fetchModels, fetchMetrics } = useModelStore();
  const { refreshTree, fetchGitStatus } = useWorkspaceStore();

  useEffect(() => {
    // Initial fetch
    fetchConnections();
    fetchModels();
    fetchMetrics();
    refreshTree();
    fetchGitStatus();

    // Poll metrics every 4s for real-time RPM/TPM gauge
    const interval = setInterval(() => {
      fetchMetrics();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f141c] text-slate-100 overflow-hidden select-none">
      {/* Top Header */}
      <TopBar
        onOpenModelManager={() => setIsModelManagerOpen(true)}
        onOpenModelSelector={() => setIsModelSelectorOpen(true)}
        onOpenMCPModal={() => setIsMCPOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Leftmost Activity Bar */}
        <ActivityBar
          activeTab={sidebarTab}
          onChangeTab={(tab) => {
            if (tab === 'models') {
              setIsModelSelectorOpen(true);
            } else {
              setSidebarTab(tab);
            }
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Sidebar Panel (240px) */}
        <div className="w-64 border-r border-[#202938] flex flex-col shrink-0 overflow-hidden">
          {sidebarTab === 'files' && <FileExplorer />}
          {sidebarTab === 'terminal' && <TerminalPanel />}
          {sidebarTab === 'git' && (
            <div className="h-full flex flex-col p-4 bg-[#111722] text-xs space-y-3">
              <span className="font-semibold text-slate-200 tracking-wider uppercase text-[11px]">
                SOURCE CONTROL (GIT)
              </span>
              <p className="text-slate-400">Tự động theo dõi các file được chỉnh sửa bởi Agent hoặc Editor.</p>
              <button
                onClick={fetchGitStatus}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded transition text-xs border border-slate-700"
              >
                Kiểm tra Git Diff
              </button>
            </div>
          )}
        </div>

        {/* Middle Code Editor */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <CodeEditor />
          </div>

          {/* Bottom Integrated Terminal (collapsible / compact) */}
          {sidebarTab !== 'terminal' && (
            <div className="h-44 border-t border-[#202938] shrink-0">
              <TerminalPanel />
            </div>
          )}
        </div>

        {/* Rightmost AI Agentic Studio Panel (380px) */}
        <div className="w-96 shrink-0 overflow-hidden">
          <AgentChatPanel />
        </div>
      </div>

      {/* Footer Status Bar */}
      <StatusBar />

      {/* Modals */}
      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        onOpenProviderManager={() => setIsModelManagerOpen(true)}
      />
      <ModelManagerModal isOpen={isModelManagerOpen} onClose={() => setIsModelManagerOpen(false)} />
      <MCPModal isOpen={isMCPOpen} onClose={() => setIsMCPOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default App;
