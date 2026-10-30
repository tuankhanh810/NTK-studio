import { create } from 'zustand';
import type { EditorTab } from '../types';
import { api } from '../services/api';

interface WorkspaceState {
  workspaceRoot: string;
  treeSummary: any | null;
  tabs: EditorTab[];
  activeTabId: string | null;
  gitStatus: string;
  isSaving: boolean;

  setWorkspaceRoot: (path: string) => Promise<void>;
  refreshTree: () => Promise<void>;
  openFile: (filePath: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  setActiveTabId: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  saveActiveFile: () => Promise<void>;
  fetchGitStatus: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaceRoot: 'D:/NTK Studio',
  treeSummary: null,
  tabs: [],
  activeTabId: null,
  gitStatus: '',
  isSaving: false,

  setWorkspaceRoot: async (path: string) => {
    set({ workspaceRoot: path, tabs: [], activeTabId: null });
    await get().refreshTree();
    await get().fetchGitStatus();
  },

  refreshTree: async () => {
    const { workspaceRoot } = get();
    if (!workspaceRoot) return;
    try {
      const summary = await api.getWorkspaceTree(workspaceRoot);
      set({ treeSummary: summary });
    } catch (e) {
      console.error(e);
    }
  },

  openFile: async (filePath: string) => {
    const { workspaceRoot, tabs } = get();
    const existing = tabs.find((t) => t.path === filePath);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    try {
      const content = await api.readFile(workspaceRoot, filePath);
      const fileName = filePath.split(/[/\\]/).pop() || filePath;
      const newTab: EditorTab = {
        id: `tab_${Date.now()}_${Math.random()}`,
        path: filePath,
        title: fileName,
        content,
        isDirty: false,
      };
      set({ tabs: [...tabs, newTab], activeTabId: newTab.id });
    } catch (e: any) {
      alert(`Không thể mở file: ${e.message}`);
    }
  },

  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get();
    const newTabs = tabs.filter((t) => t.id !== tabId);
    let nextActiveId = activeTabId;
    if (activeTabId === tabId) {
      nextActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
    }
    set({ tabs: newTabs, activeTabId: nextActiveId });
  },

  setActiveTabId: (tabId: string) => set({ activeTabId: tabId }),

  updateTabContent: (tabId: string, content: string) => {
    const { tabs } = get();
    set({
      tabs: tabs.map((t) => (t.id === tabId ? { ...t, content, isDirty: true } : t)),
    });
  },

  saveActiveFile: async () => {
    const { tabs, activeTabId, workspaceRoot } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab || !activeTab.isDirty) return;

    set({ isSaving: true });
    try {
      await api.writeFile(workspaceRoot, activeTab.path, activeTab.content);
      set({
        tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t)),
      });
      await get().fetchGitStatus();
    } catch (e: any) {
      alert(`Lỗi khi lưu file: ${e.message}`);
    } finally {
      set({ isSaving: false });
    }
  },

  fetchGitStatus: async () => {
    const { workspaceRoot } = get();
    try {
      const res = await api.getGitStatus(workspaceRoot);
      set({ gitStatus: res.output });
    } catch (e) {
      // quiet
    }
  },
}));
