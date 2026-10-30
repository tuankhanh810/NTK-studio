import React, { useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { X, Save, FileCode } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py':
      return 'python';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'cs':
      return 'csharp';
    case 'cpp':
    case 'c':
    case 'h':
      return 'cpp';
    case 'sh':
    case 'ps1':
    case 'bat':
      return 'shell';
    default:
      return 'plaintext';
  }
}

export const CodeEditor: React.FC = () => {
  const { tabs, activeTabId, setActiveTabId, closeTab, updateTabContent, saveActiveFile, isSaving } =
    useWorkspaceStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveActiveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveActiveFile]);

  if (!activeTab) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#131924] text-slate-500 select-none">
        <FileCode className="w-16 h-16 mb-4 text-slate-700" />
        <h3 className="text-base font-medium text-slate-400 mb-1">Không có tập tin nào đang mở</h3>
        <p className="text-xs text-slate-600">Chọn một file từ Explorer hoặc để Agent tự tạo mã nguồn</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#131924] overflow-hidden">
      {/* Tabs Bar */}
      <div className="h-9 bg-[#0e141e] border-b border-[#202938] flex items-center justify-between px-2 overflow-x-auto select-none shrink-0">
        <div className="flex items-center space-x-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-t text-xs cursor-pointer border-t-2 transition ${
                  isActive
                    ? 'bg-[#131924] text-slate-100 border-emerald-400 font-medium'
                    : 'bg-[#0b1018] text-slate-400 border-transparent hover:bg-[#111722] hover:text-slate-200'
                }`}
              >
                <span>{tab.title}</span>
                {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-0.5 hover:text-rose-400 rounded transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <button
          onClick={saveActiveFile}
          disabled={!activeTab.isDirty || isSaving}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition ${
            activeTab.isDirty
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
          title="Lưu file (Ctrl + S)"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Đang lưu...' : 'Lưu'}</span>
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="h-6 bg-[#111722] border-b border-[#1c2534] px-3 flex items-center text-[11px] text-slate-400 font-mono select-none">
        <span>{activeTab.path}</span>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={getLanguageFromPath(activeTab.path)}
          value={activeTab.content}
          theme="vs-dark"
          options={{
            fontSize: 13,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
          }}
          onChange={(val) => updateTabContent(activeTab.id, val || '')}
        />
      </div>
    </div>
  );
};
