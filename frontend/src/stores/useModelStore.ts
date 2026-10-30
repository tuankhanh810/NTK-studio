import { create } from 'zustand';
import type { Connection, ModelItem, RateLimitStats, ModelRoles } from '../types';
import { api } from '../services/api';

interface ModelState {
  connections: Connection[];
  models: ModelItem[];
  selectedModelId: string;
  roles: ModelRoles;
  metrics: RateLimitStats | null;
  isLoading: boolean;
  error: string | null;

  fetchConnections: () => Promise<void>;
  fetchModels: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchRoles: () => Promise<void>;
  updateRoles: (roles: Partial<ModelRoles>) => Promise<void>;
  toggleFavorite: (modelId: string) => Promise<void>;
  verifyModel: (modelId: string) => Promise<boolean>;
  setSelectedModelId: (id: string) => void;
}

const defaultRoles: ModelRoles = {
  chat: 'auto',
  agentic_coding: 'auto',
  planning: 'auto',
  coding: 'auto',
  debugging: 'auto',
  vision: 'auto',
  benchmark: 'auto',
};

export const useModelStore = create<ModelState>((set, get) => ({
  connections: [],
  models: [],
  selectedModelId: 'auto',
  roles: defaultRoles,
  metrics: null,
  isLoading: false,
  error: null,

  fetchConnections: async () => {
    try {
      const data = await api.getConnections();
      set({ connections: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchModels: async () => {
    try {
      const data = await api.getModels();
      set({ models: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchMetrics: async () => {
    try {
      const data = await api.getMetrics();
      set({ metrics: data });
    } catch (e: any) {
      // quiet
    }
  },

  fetchRoles: async () => {
    try {
      const rolesData = await api.getModelRoles();
      set({ roles: { ...defaultRoles, ...rolesData } });
    } catch (e: any) {
      // quiet
    }
  },

  updateRoles: async (newRoles: Partial<ModelRoles>) => {
    const updated = { ...get().roles, ...newRoles };
    try {
      await api.updateModelRoles(updated);
      set({ roles: updated });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  toggleFavorite: async (modelId: string) => {
    try {
      const res = await api.toggleFavorite(modelId);
      set((state) => ({
        models: state.models.map((m) =>
          m.id === modelId ? { ...m, is_favorite: res.is_favorite } : m
        ),
      }));
    } catch (e: any) {
      // quiet
    }
  },

  verifyModel: async (modelId: string) => {
    try {
      const res = await api.verifyModel(modelId);
      set((state) => ({
        models: state.models.map((m) =>
          m.id === modelId
            ? {
                ...m,
                verification_status: res.verification_status as any,
                status: res.success ? 'ready' : 'error',
              }
            : m
        ),
      }));
      return res.success;
    } catch (e: any) {
      return false;
    }
  },

  setSelectedModelId: (id: string) => set({ selectedModelId: id }),
}));
