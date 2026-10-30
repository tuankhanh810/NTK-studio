import React, { useState, useEffect } from 'react';
import { TopBar } from './components/Layout/TopBar';
import { LeftSidebar } from './components/Layout/LeftSidebar';
import type { MainViewTab } from './components/Layout/LeftSidebar';
import { RightPanel } from './components/Layout/RightPanel';
import { HomeView } from './components/Home/HomeView';
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
  const [currentView, setCurrentView] = useState<MainViewTab>('home');
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isMCPOpen, setIsMCPOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { fetchConnections, fetchModels, fetchMetrics, fetchRoles } = useModelStore();
  const { refreshTree, fetchGitStatus, gitStatus } = useWorkspaceStore();

  useEffect(() => {
    // Initial fetch of data
    fetchConnections();
    fetchModels();
    fetchMetrics();
    fetchRoles();
    refreshTree();
    fetchGitStatus();

    // Periodic telemetry polling
    const interval = setInterval(() => {
      fetchMetrics();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b101c] text-slate-100 overflow-hidden select-none">
      {/* Top Header */}
      <TopBar
        onOpenModelManager={() => setIsModelManagerOpen(true)}
        onOpenModelSelector={() => setIsModelSelectorOpen(true)}
        onOpenMCPModal={() => setIsMCPOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNavigateHome={() => setCurrentView('home')}
      />

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Column 1) */}
        <LeftSidebar
          activeTab={currentView}
          onChangeTab={(tab) => setCurrentView(tab)}
          onOpenModelManager={() => setIsModelManagerOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenMCP={() => setIsMCPOpen(true)}
        />

        {/* Center Workspace (Column 2) */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* VIEW: HOME */}
          {currentView === 'home' && (
            <HomeView
              onOpenProject={() => setCurrentView('project')}
              onOpenModelManager={() => setIsModelManagerOpen(true)}
              onOpenAgent={() => setCurrentView('agent')}
              onOpenBenchmark={() => setIsModelManagerOpen(true)}
              onOpenModelSelector={() => setIsModelSelectorOpen(true)}
            />
          )}

          {/* VIEW: PROJECT / CODE EDITOR */}
          {currentView === 'project' && (
            <div className="flex-1 flex overflow-hidden">
              {/* File Explorer Panel */}
              <div className="w-60 border-r border-[#1a2333] flex flex-col shrink-0 overflow-hidden bg-[#0a0e17]">
                <FileExplorer />
              </div>

              {/* Code Editor & Bottom Terminal */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex-1 overflow-hidden">
                  <CodeEditor />
                </div>
                <div className="h-44 border-t border-[#1a2333] shrink-0 bg-[#090d16]">
                  <TerminalPanel />
                </div>
              </div>
            </div>
          )}

          {/* VIEW: AGENTIC CODING STUDIO */}
          {currentView === 'agent' && (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <CodeEditor />
              </div>
              <div className="w-96 border-l border-[#1a2333] shrink-0 overflow-hidden bg-[#0a0e17]">
                <AgentChatPanel />
              </div>
            </div>
          )}

          {/* VIEW: TERMINAL DEDICATED */}
          {currentView === 'terminal' && (
            <div className="flex-1 flex flex-col bg-[#090d16] p-2">
              <TerminalPanel />
            </div>
          )}

          {/* VIEW: GIT SOURCE CONTROL */}
          {currentView === 'git' && (
            <div className="flex-1 flex flex-col bg-[#090d16] p-6 space-y-4 max-w-4xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
                  Source Control (Git)
                </h3>
                <button
                  onClick={fetchGitStatus}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition"
                >
                  Kiểm tra thay đổi
                </button>
              </div>

              <div className="bg-[#101726] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300">
                <p className="text-slate-400 mb-2">Trạng thái thay đổi hiện tại:</p>
                {gitStatus && gitStatus.trim().length > 0 ? (
                  <pre className="text-amber-400 whitespace-pre-wrap">{gitStatus}</pre>
                ) : (
                  <p className="text-emerald-400">Không có thay đổi nào chưa commit (Working tree clean).</p>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right Panel (Column 3) */}
        <RightPanel
          onOpenModelSelector={() => setIsModelSelectorOpen(true)}
          onOpenModelManager={() => setIsModelManagerOpen(true)}
        />
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
