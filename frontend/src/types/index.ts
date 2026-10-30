export interface Connection {
  id: string;
  name: string;
  provider_type: string;
  base_url: string;
  api_key_masked: string;
  is_active: boolean;
  status?: string;
  last_checked?: string;
  models_count?: number;
  headers?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

export interface ModelItem {
  id: string;
  connection_id: string;
  connection_name?: string;
  provider_type?: string;
  model_id: string;
  display_name: string;
  context_window: number;
  max_tokens: number;
  rpm_limit: number;
  tpm_limit: number;
  supports_streaming: boolean;
  supports_tools: boolean;
  supports_vision: boolean;
  supports_json: boolean;
  is_favorite?: boolean;
  verification_status?: 'DISCOVERED' | 'VERIFIED' | 'UNSUPPORTED' | 'UNKNOWN' | 'ERROR';
  status: 'ready' | 'error' | 'untested';
  last_tested?: string;
  capabilities?: {
    chat?: string;
    streaming?: string;
    native_tool_calling?: string;
    json_output?: string;
    vision?: string;
    long_context?: string;
    structured_output?: string;
  };
  benchmark?: {
    coding_score?: number;
    reasoning_score?: number;
    tools_score?: number;
    avg_latency_ms?: number;
    tps?: number;
    status?: string;
  };
}

export interface ModelRoles {
  chat: string;
  agentic_coding: string;
  planning: string;
  coding: string;
  debugging: string;
  vision: string;
  benchmark: string;
}

export interface BenchmarkTestItem {
  name: string;
  passed: boolean;
  latency_ms?: number;
  ttft_ms?: number;
  details?: string;
  output?: string;
}

export interface BenchmarkReport {
  benchmark_id: string;
  model_id: string;
  results: {
    status: string;
    passed_count: number;
    total_count: number;
    coding_score: number;
    reasoning_score: number;
    tools_score: number;
    avg_latency_ms: number;
    ttft_ms: number;
    tests: BenchmarkTestItem[];
  };
}

export interface RateLimitStats {
  active_requests: number;
  queue_length: number;
  current_rpm: number;
  max_rpm: number;
  current_tpm: number;
  max_tpm: number;
  errors_429_count: number;
  failed_requests: number;
  total_tokens_consumed: number;
  avg_latency_ms: number;
}

export interface AgentEvent {
  event_type: 'model_selected' | 'thought' | 'plan' | 'tool_start' | 'tool_end' | 'error' | 'message' | 'done';
  content?: string;
  model_name?: string;
  reason?: string;
  data?: any;
  timestamp?: number;
}

export interface EditorTab {
  id: string;
  path: string;
  title: string;
  content: string;
  isDirty?: boolean;
}

export interface MCPServerInfo {
  id: string;
  name: string;
  transport: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  is_active: boolean;
  status: 'running' | 'stopped';
}
