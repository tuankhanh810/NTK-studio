import type { Connection, ModelItem, BenchmarkReport, RateLimitStats, MCPServerInfo, AgentEvent } from '../types';

const API_BASE = '/api';

export const api = {
  // Connections
  async getConnections(): Promise<Connection[]> {
    const res = await fetch(`${API_BASE}/connections`);
    if (!res.ok) throw new Error('Không thể tải danh sách kết nối');
    return res.json();
  },

  async createConnection(data: { name: string; base_url: string; api_key: string; provider_type?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Không thể tạo kết nối');
    }
    return res.json();
  },

  async deleteConnection(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/connections/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa kết nối');
  },

  async testConnection(id: string): Promise<{ success: boolean; message: string; latency_ms?: number }> {
    const res = await fetch(`${API_BASE}/connections/${id}/test`, { method: 'POST' });
    return res.json();
  },

  async refreshCatalog(connId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/connections/${connId}/refresh-catalog`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Không thể làm mới danh mục');
    }
    return res.json();
  },

  async addModelsBatch(connId: string, models: any[]): Promise<any> {
    const res = await fetch(`${API_BASE}/connections/${connId}/models/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ models }),
    });
    if (!res.ok) throw new Error('Lỗi thêm models');
    return res.json();
  },

  async connectProvider(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/connections/${id}/connect`, { method: 'POST' });
    return res.json();
  },

  async addManualModel(connId: string, data: { model_id: string; display_name?: string; probe?: boolean }): Promise<any> {
    const res = await fetch(`${API_BASE}/connections/${connId}/models/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Lỗi thêm model thủ công');
    }
    return res.json();
  },

  // Models
  async getModels(): Promise<ModelItem[]> {
    const res = await fetch(`${API_BASE}/models`);
    if (!res.ok) throw new Error('Không thể tải danh sách models');
    return res.json();
  },

  async deleteModel(modelId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/models/${modelId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa model');
  },

  async verifyModel(modelId: string): Promise<{ success: boolean; verification_status: string; latency_ms: number; message: string }> {
    const res = await fetch(`${API_BASE}/models/${modelId}/verify`, { method: 'POST' });
    return res.json();
  },

  async toggleFavorite(modelId: string): Promise<{ success: boolean; is_favorite: boolean }> {
    const res = await fetch(`${API_BASE}/models/${modelId}/favorite`, { method: 'POST' });
    return res.json();
  },

  async getModelRoles(): Promise<Record<string, string>> {
    const res = await fetch(`${API_BASE}/models/roles`);
    return res.json();
  },

  async updateModelRoles(roles: Record<string, string>): Promise<any> {
    const res = await fetch(`${API_BASE}/models/roles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles }),
    });
    return res.json();
  },

  async getAdapters(): Promise<Record<string, any>> {
    const res = await fetch(`${API_BASE}/models/adapters`);
    return res.json();
  },

  // Benchmark
  async runBenchmark(modelId: string, level: string = 'standard'): Promise<BenchmarkReport> {
    const res = await fetch(`${API_BASE}/benchmark/${modelId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Lỗi chạy benchmark');
    }
    return res.json();
  },

  async compareModels(modelIds: string[]): Promise<any[]> {
    const res = await fetch(`${API_BASE}/benchmark/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_ids: modelIds }),
    });
    if (!res.ok) throw new Error('Lỗi khi so sánh models');
    return res.json();
  },

  async getBenchmarkHistory(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/benchmark/history`);
    return res.json();
  },

  // Metrics
  async getMetrics(): Promise<RateLimitStats> {
    const res = await fetch(`${API_BASE}/metrics/stats`);
    return res.json();
  },

  // Workspace
  async getWorkspaceTree(root: string): Promise<any> {
    const res = await fetch(`${API_BASE}/workspace/tree?root=${encodeURIComponent(root)}`);
    if (!res.ok) throw new Error('Không thể đọc cây thư mục');
    return res.json();
  },

  async findSymbols(root: string, query: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/workspace/symbols?root=${encodeURIComponent(root)}&q=${encodeURIComponent(query)}`);
    return res.json();
  },

  async readFile(workspaceRoot: string, filePath: string): Promise<string> {
    const res = await fetch(`${API_BASE}/workspace/file/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_root: workspaceRoot, path: filePath }),
    });
    if (!res.ok) throw new Error('Không thể mở file');
    const data = await res.json();
    return data.content;
  },

  async writeFile(workspaceRoot: string, filePath: string, content: string): Promise<void> {
    const res = await fetch(`${API_BASE}/workspace/file/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_root: workspaceRoot, path: filePath, content }),
    });
    if (!res.ok) throw new Error('Không thể lưu file');
  },

  async execTerminal(workspaceRoot: string, command: string): Promise<any> {
    const res = await fetch(`${API_BASE}/workspace/terminal/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_root: workspaceRoot, command }),
    });
    return res.json();
  },

  async getGitStatus(workspaceRoot: string): Promise<{ output: string; success: boolean }> {
    const res = await fetch(`${API_BASE}/workspace/git/status?root=${encodeURIComponent(workspaceRoot)}`);
    return res.json();
  },

  async createCheckpoint(workspaceRoot: string, description: string): Promise<any> {
    const res = await fetch(`${API_BASE}/workspace/checkpoint/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_root: workspaceRoot, description }),
    });
    return res.json();
  },

  async rollbackCheckpoint(workspaceRoot: string, checkpointId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/workspace/checkpoint/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_root: workspaceRoot, checkpoint_id: checkpointId }),
    });
    return res.json();
  },

  // MCP
  async getMCPServers(): Promise<MCPServerInfo[]> {
    const res = await fetch(`${API_BASE}/mcp/servers`);
    return res.json();
  },

  async addMCPServer(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/mcp/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async removeMCPServer(id: string): Promise<void> {
    await fetch(`${API_BASE}/mcp/servers/${id}`, { method: 'DELETE' });
  },

  // Agent SSE Task Execution
  executeAgentStream(
    instruction: string,
    workspaceRoot: string,
    modelId: string = 'auto',
    onEvent: (event: AgentEvent) => void,
    onError: (err: any) => void,
    onComplete: () => void
  ): () => void {
    const controller = new AbortController();

    fetch(`${API_BASE}/agent/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction,
        workspace_root: workspaceRoot,
        model_id: modelId,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Lỗi từ Agent Engine');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Không thể khởi tạo luồng dữ liệu SSE');

        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              try {
                const eventData: AgentEvent = JSON.parse(trimmed.slice(5).trim());
                onEvent(eventData);
              } catch (e) {
                // quiet
              }
            }
          }
        }
        onComplete();
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          onError(err);
        }
      });

    return () => controller.abort();
  },
};
