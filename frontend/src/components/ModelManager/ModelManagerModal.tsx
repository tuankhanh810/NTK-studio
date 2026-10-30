import React, { useState, useEffect } from 'react';
import { X, Plus, RefreshCw, CheckCircle2, XCircle, Play, Database, Cpu, Activity, Gauge, Trash2, Key, Link2, Zap, Star, ShieldCheck } from 'lucide-react';
import { useModelStore } from '../../stores/useModelStore';
import { api } from '../../services/api';
import type { BenchmarkReport } from '../../types';

interface ModelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelManagerModal: React.FC<ModelManagerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'connections' | 'catalog' | 'active_models' | 'benchmark' | 'quota'>('connections');
  const { connections, models, metrics, fetchConnections, fetchModels, fetchMetrics, toggleFavorite, verifyModel } = useModelStore();

  // Connection form state
  const [newConnName, setNewConnName] = useState('NVIDIA NIM Official');
  const [newConnUrl, setNewConnUrl] = useState('https://integrate.api.nvidia.com/v1');
  const [newConnKey, setNewConnKey] = useState('');
  const [newConnType, setNewConnType] = useState('nvidia');
  const [isSubmittingConn, setIsSubmittingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<Record<string, any>>({});

  // Catalog discovery state
  const [selectedConnForCatalog, setSelectedConnForCatalog] = useState<string>('');
  const [discoveredModels, setDiscoveredModels] = useState<any[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Record<string, boolean>>({});
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState(false);
  const [manualModelId, setManualModelId] = useState('');
  const [manualDisplayName, setManualDisplayName] = useState('');
  const [manualProbe, setManualProbe] = useState(true);

  // Benchmark state
  const [benchModelId, setBenchModelId] = useState<string>('');
  const [benchLevel, setBenchLevel] = useState<'quick' | 'standard' | 'full'>('standard');
  const [isRunningBench, setIsRunningBench] = useState(false);
  const [latestReport, setLatestReport] = useState<BenchmarkReport | null>(null);
  const [benchHistory, setBenchHistory] = useState<any[]>([]);
  const [compareModelIds, setCompareModelIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConnections();
      fetchModels();
      fetchMetrics();
      loadBenchHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    if (connections.length > 0 && !selectedConnForCatalog) {
      setSelectedConnForCatalog(connections[0].id);
    }
    if (models.length > 0 && !benchModelId) {
      setBenchModelId(models[0].id);
    }
  }, [connections, models]);

  const loadBenchHistory = async () => {
    try {
      const data = await api.getBenchmarkHistory();
      setBenchHistory(data);
    } catch (e) {
      // quiet
    }
  };

  const handleSelectPreset = (presetKey: string) => {
    setNewConnType(presetKey);
    if (presetKey === 'nvidia') {
      setNewConnName('NVIDIA NIM Official');
      setNewConnUrl('https://integrate.api.nvidia.com/v1');
    } else if (presetKey === 'openai') {
      setNewConnName('OpenAI Official');
      setNewConnUrl('https://api.openai.com/v1');
    } else if (presetKey === 'anthropic') {
      setNewConnName('Anthropic Claude');
      setNewConnUrl('https://api.anthropic.com/v1');
    } else if (presetKey === 'gemini') {
      setNewConnName('Google Gemini');
      setNewConnUrl('https://generativelanguage.googleapis.com/v1beta/openai');
    } else if (presetKey === 'openai_compatible') {
      setNewConnName('OpenRouter / Ollama');
      setNewConnUrl('https://openrouter.ai/api/v1');
    } else {
      setNewConnName('Custom AI Provider');
      setNewConnUrl('http://localhost:8000/v1');
    }
  };

  const handleCreateConnection = async () => {
    if (!newConnKey.trim() && newConnType !== 'openai_compatible') {
      alert('Vui lòng nhập API Key');
      return;
    }
    setIsSubmittingConn(true);
    try {
      await api.createConnection({
        name: newConnName,
        base_url: newConnUrl,
        api_key: newConnKey,
        provider_type: newConnType,
      });
      setNewConnKey('');
      await fetchConnections();
      alert(`Đã thêm nhà cung cấp ${newConnName} thành công!`);
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    } finally {
      setIsSubmittingConn(false);
    }
  };

  const handleConnectProvider = async (connId: string) => {
    setConnTestResult((prev) => ({ ...prev, [connId]: { loading: true } }));
    try {
      const res = await api.connectProvider(connId);
      setConnTestResult((prev) => ({ ...prev, [connId]: { ...res, loading: false } }));
      await fetchConnections();
      await fetchModels();
    } catch (e: any) {
      setConnTestResult((prev) => ({
        ...prev,
        [connId]: { success: false, message: e.message, loading: false },
      }));
    }
  };

  const handleDeleteConnection = async (connId: string) => {
    if (!confirm('Bạn có chắc muốn xóa kết nối này? Các model thuộc kết nối cũng sẽ bị gỡ bỏ.')) return;
    try {
      await api.deleteConnection(connId);
      await fetchConnections();
      await fetchModels();
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    }
  };

  const handleRefreshCatalog = async () => {
    if (!selectedConnForCatalog) {
      alert('Vui lòng chọn một kết nối trước');
      return;
    }
    setIsRefreshingCatalog(true);
    try {
      const catalog = await api.refreshCatalog(selectedConnForCatalog);
      setDiscoveredModels(catalog);
      setSelectedCatalogIds({});
      await fetchModels();
    } catch (e: any) {
      alert(`Không thể làm mới danh mục: ${e.message}`);
    } finally {
      setIsRefreshingCatalog(false);
    }
  };

  const handleAddSelectedModels = async () => {
    const toAdd = discoveredModels.filter((m) => selectedCatalogIds[m.model_id]);
    if (toAdd.length === 0) {
      alert('Vui lòng chọn ít nhất một model để thêm');
      return;
    }
    try {
      await api.addModelsBatch(selectedConnForCatalog, toAdd);
      await fetchModels();
      alert(`Đã thêm thành công ${toAdd.length} models vào NTK Studio!`);
      setActiveTab('active_models');
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    }
  };

  const handleAddManualModel = async () => {
    if (!manualModelId.trim() || !selectedConnForCatalog) {
      alert('Vui lòng chọn kết nối và nhập Model ID');
      return;
    }
    try {
      const res = await api.addManualModel(selectedConnForCatalog, {
        model_id: manualModelId.trim(),
        display_name: manualDisplayName.trim() || undefined,
        probe: manualProbe,
      });
      setManualModelId('');
      setManualDisplayName('');
      await fetchModels();
      alert(`Đã thêm model '${res.display_name}' (${res.verification_status}) thành công!`);
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Bạn có chắc muốn gỡ bỏ model này?')) return;
    try {
      await api.deleteModel(modelId);
      await fetchModels();
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    }
  };

  const handleRunBenchmark = async () => {
    if (!benchModelId) {
      alert('Vui lòng chọn model cần benchmark');
      return;
    }
    setIsRunningBench(true);
    setLatestReport(null);
    try {
      const report = await api.runBenchmark(benchModelId, benchLevel);
      setLatestReport(report);
      await fetchModels();
      await loadBenchHistory();
    } catch (e: any) {
      alert(`Lỗi benchmark: ${e.message}`);
    } finally {
      setIsRunningBench(false);
    }
  };

  const handleCompareModels = async () => {
    if (compareModelIds.length < 2) {
      alert('Vui lòng chọn ít nhất 2 model để so sánh năng lực');
      return;
    }
    setIsComparing(true);
    try {
      const data = await api.compareModels(compareModelIds);
      setComparisonData(data);
    } catch (e: any) {
      alert(`Lỗi so sánh: ${e.message}`);
    } finally {
      setIsComparing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4">
      <div className="bg-[#121824] border border-[#263245] rounded-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-[#202938] flex items-center justify-between bg-[#151c2b] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 tracking-wide uppercase">
                QUẢN LÝ MODEL &amp; KẾT NỐI NVIDIA
              </h2>
              <p className="text-[11px] text-slate-400">
                NVIDIA Multi-Model Platform &bull; Dynamic Discovery &bull; Benchmark &bull; RPM/TPM Router
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Nav Tabs */}
        <div className="h-11 px-6 bg-[#0e141f] border-b border-[#202938] flex items-center space-x-2 text-xs shrink-0">
          {[
            { id: 'connections', label: '1. Kết nối NVIDIA' },
            { id: 'catalog', label: '2. Danh mục Model' },
            { id: 'active_models', label: `3. Models Đang Dùng (${models.length})` },
            { id: 'benchmark', label: '4. Kiểm định Benchmark' },
            { id: 'quota', label: '5. Hạn mức RPM / TPM' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded font-medium transition ${
                activeTab === tab.id
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-slate-300">
          {/* TAB 1: PROVIDERS / CONNECTIONS */}
          {activeTab === 'connections' && (
            <div className="space-y-6">
              {/* Form Add Provider */}
              <div className="p-4 bg-[#161f2e] border border-slate-700/60 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-slate-100 flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Thêm Nhà Cung Cấp AI (AI Provider) Mới</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">DPAPI Encrypted</span>
                </div>

                {/* Presets Row */}
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1.5 font-medium">Mẫu cấu hình sẵn (Presets):</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'nvidia', label: 'NVIDIA NIM' },
                      { key: 'openai', label: 'OpenAI Official' },
                      { key: 'anthropic', label: 'Anthropic Claude' },
                      { key: 'gemini', label: 'Google Gemini' },
                      { key: 'openai_compatible', label: 'OpenRouter / Ollama' },
                      { key: 'custom', label: 'Custom Provider' },
                    ].map((p) => (
                      <button
                        key={p.key}
                        onClick={() => handleSelectPreset(p.key)}
                        className={`px-3 py-1 rounded text-xs transition border ${
                          newConnType === p.key
                            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 font-medium'
                            : 'bg-[#101724] text-slate-400 hover:text-slate-200 border-slate-800'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Tên hiển thị</label>
                    <input
                      type="text"
                      value={newConnName}
                      onChange={(e) => setNewConnName(e.target.value)}
                      className="w-full bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Loại Provider</label>
                    <select
                      value={newConnType}
                      onChange={(e) => handleSelectPreset(e.target.value)}
                      className="w-full bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="nvidia">NVIDIA NIM</option>
                      <option value="openai">OpenAI Official</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="openai_compatible">OpenAI-Compatible</option>
                      <option value="custom">Custom Endpoint</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Endpoint Base URL</label>
                    <input
                      type="text"
                      value={newConnUrl}
                      onChange={(e) => setNewConnUrl(e.target.value)}
                      className="w-full bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">API Key</label>
                    <input
                      type="password"
                      value={newConnKey}
                      onChange={(e) => setNewConnKey(e.target.value)}
                      placeholder={newConnType === 'anthropic' ? 'sk-ant-...' : 'nvapi-... hoặc sk-...'}
                      className="w-full bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleCreateConnection}
                    disabled={isSubmittingConn}
                    className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-1.5 rounded transition shadow shadow-emerald-600/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSubmittingConn ? 'Đang lưu...' : 'Thêm Nhà Cung Cấp'}</span>
                  </button>
                </div>
              </div>

              {/* Providers List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
                    Nhà cung cấp đã lưu ({connections.length})
                  </h3>
                  <span className="text-[11px] text-slate-500">Mã hóa bảo vệ bằng Windows DPAPI</span>
                </div>

                {connections.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    Chưa có nhà cung cấp nào. Vui lòng thêm nhà cung cấp ở biểu mẫu trên.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {connections.map((c) => {
                      const test = connTestResult[c.id];
                      return (
                        <div
                          key={c.id}
                          className="p-3.5 bg-[#141b27] border border-slate-700/60 rounded-lg space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <Link2 className="w-4 h-4 text-emerald-400" />
                                <strong className="text-slate-100 text-sm">{c.name}</strong>
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono uppercase">
                                  {c.provider_type}
                                </span>
                                <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded font-mono">
                                  {c.models_count || 0} models
                                </span>
                                {c.status === 'connected' && (
                                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded flex items-center space-x-1">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    <span>CONNECTED</span>
                                  </span>
                                )}
                                {c.status === 'error' && (
                                  <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded flex items-center space-x-1">
                                    <XCircle className="w-2.5 h-2.5" />
                                    <span>ERROR</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-3 text-slate-400 text-[11px] font-mono">
                                <span>URL: {c.base_url}</span>
                                <span>&bull;</span>
                                <span>Key: {c.api_key_masked}</span>
                                {c.last_checked && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="text-slate-500 font-sans">
                                      Kiểm tra: {new Date(c.last_checked).toLocaleTimeString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleConnectProvider(c.id)}
                                className="px-3 py-1.5 bg-emerald-700/30 hover:bg-emerald-700/50 text-emerald-300 rounded text-xs transition border border-emerald-500/30 flex items-center space-x-1"
                                title="Chạy quy trình 7 bước kiểm tra & Discovery models"
                              >
                                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Kết nối &amp; Discovery</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedConnForCatalog(c.id);
                                  handleRefreshCatalog();
                                  setActiveTab('catalog');
                                }}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition border border-slate-700"
                              >
                                Xem Catalog
                              </button>
                              <button
                                onClick={() => handleDeleteConnection(c.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition"
                                title="Xóa nhà cung cấp"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* 7-Step Connection Diagnostic Output */}
                          {test && (
                            <div className="pt-2 border-t border-slate-800/80">
                              <div
                                className={`text-[11px] font-medium flex items-center space-x-1.5 ${
                                  test.success ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {test.loading ? (
                                  <span className="flex items-center space-x-1 text-slate-400">
                                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                                    <span>Đang chạy quy trình 7 bước kiểm tra kết nối &amp; discovery...</span>
                                  </span>
                                ) : (
                                  <>
                                    {test.success ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                    )}
                                    <span>
                                      {test.message} ({test.latency_ms || 0}ms)
                                    </span>
                                  </>
                                )}
                              </div>

                              {test.steps && Array.isArray(test.steps) && (
                                <div className="mt-2 bg-[#0e131d] p-2 rounded border border-slate-800 font-mono text-[10px] space-y-1">
                                  {test.steps.map((st: string, idx: number) => (
                                    <div key={idx} className="text-slate-300">
                                      {st}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CATALOG DISCOVERY */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#151c2a] p-3 rounded-lg border border-slate-700/60">
                <div className="flex items-center space-x-3">
                  <span className="text-slate-400">Chọn kết nối:</span>
                  <select
                    value={selectedConnForCatalog}
                    onChange={(e) => setSelectedConnForCatalog(e.target.value)}
                    className="bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-emerald-400 font-medium focus:outline-none"
                  >
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.base_url})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleRefreshCatalog}
                    disabled={isRefreshingCatalog}
                    className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded transition shadow"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCatalog ? 'animate-spin' : ''}`} />
                    <span>{isRefreshingCatalog ? 'Đang tải danh mục...' : 'Làm mới từ NVIDIA'}</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Tìm kiếm model..."
                    className="bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAddSelectedModels}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-1.5 rounded transition font-medium"
                  >
                    Thêm các Model đã chọn
                  </button>
                </div>
              </div>

              {/* Discovered models list */}
              <div className="border border-slate-700/60 rounded-lg overflow-hidden bg-[#131924]">
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-800 font-mono text-[11px]">
                  {discoveredModels
                    .filter((m) => m.model_id.toLowerCase().includes(catalogSearch.toLowerCase()))
                    .map((m) => {
                      const isChecked = !!selectedCatalogIds[m.model_id];
                      return (
                        <div
                          key={m.model_id}
                          onClick={() =>
                            setSelectedCatalogIds((prev) => ({ ...prev, [m.model_id]: !isChecked }))
                          }
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                            isChecked ? 'bg-emerald-950/20 text-emerald-300' : 'hover:bg-slate-800/40 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                            />
                            <div>
                              <strong className="text-slate-100 block">{m.model_id}</strong>
                              <span className="text-[10px] text-slate-500">{m.display_name}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {m.supports_tools && (
                              <span className="bg-indigo-900/40 text-indigo-300 border border-indigo-700/50 px-1.5 py-0.5 rounded text-[10px]">
                                Tools
                              </span>
                            )}
                            {m.supports_vision && (
                              <span className="bg-pink-900/40 text-pink-300 border border-pink-700/50 px-1.5 py-0.5 rounded text-[10px]">
                                Vision
                              </span>
                            )}
                            <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">
                              Streaming
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  {discoveredModels.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      Nhấn nút "Làm mới từ NVIDIA" để quét toàn bộ model khả dụng từ endpoint.
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Model ID Add */}
              <div className="p-4 bg-[#151c2a] border border-slate-700/60 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 text-xs font-semibold uppercase tracking-wider flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Thêm Model Thủ Công (Khi Provider không hỗ trợ Discovery hoặc dùng Model ID riêng)</span>
                  </span>
                  <span className="text-[11px] text-slate-500">NTK Studio sẽ không tự ý bịa đặt Model ID</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Model ID (Bắt buộc):</label>
                    <input
                      type="text"
                      value={manualModelId}
                      onChange={(e) => setManualModelId(e.target.value)}
                      placeholder="vd: meta/llama-3.3-70b-instruct"
                      className="w-full bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Tên hiển thị (Tùy chọn):</label>
                    <input
                      type="text"
                      value={manualDisplayName}
                      onChange={(e) => setManualDisplayName(e.target.value)}
                      placeholder="vd: Llama 3.3 70B Turbo"
                      className="w-full bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={manualProbe}
                          onChange={(e) => setManualProbe(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                        />
                        <span>Probe kiểm tra thực tế</span>
                      </label>
                      <button
                        onClick={handleAddManualModel}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-1.5 rounded text-xs transition flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm Model</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVE MODELS */}
          {activeTab === 'active_models' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
                  Danh sách Model đã thêm vào Studio ({models.length})
                </h3>
              </div>

              <div className="border border-slate-700/60 rounded-lg overflow-hidden bg-[#131924]">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#182130] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                    <tr>
                      <th className="p-3 w-8">★</th>
                      <th className="p-3">Model &amp; Kết nối</th>
                      <th className="p-3">Năng lực</th>
                      <th className="p-3">Giới hạn RPM/TPM</th>
                      <th className="p-3">Xác minh / Trạng thái</th>
                      <th className="p-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {models.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleFavorite(m.id)}
                            className="p-1 hover:text-amber-400 transition"
                            title={m.is_favorite ? "Bỏ yêu thích" : "Đánh dấu yêu thích"}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                m.is_favorite ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="p-3">
                          <strong className="text-slate-100 block">{m.display_name}</strong>
                          <span className="text-[10px] text-slate-500 font-mono">{m.model_id}</span>
                          <span className="text-[10px] text-emerald-400 block mt-0.5">({m.connection_name})</span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {m.supports_tools && (
                              <span className="bg-indigo-900/40 text-indigo-300 border border-indigo-700/50 px-1 py-0.5 rounded text-[10px]">
                                Tool Calling
                              </span>
                            )}
                            {m.supports_vision && (
                              <span className="bg-pink-900/40 text-pink-300 border border-pink-700/50 px-1 py-0.5 rounded text-[10px]">
                                Vision
                              </span>
                            )}
                            {m.supports_json && (
                              <span className="bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 px-1 py-0.5 rounded text-[10px]">
                                JSON
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-slate-300">
                          <div>RPM: {m.rpm_limit} req/m</div>
                          <div className="text-slate-500">TPM: {m.tpm_limit.toLocaleString()} tok/m</div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col space-y-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium uppercase inline-flex items-center w-fit space-x-1 ${
                                m.verification_status === 'VERIFIED'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : m.verification_status === 'DISCOVERED'
                                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                  : m.verification_status === 'UNSUPPORTED'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>{m.verification_status || 'UNKNOWN'}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans">
                              {m.status === 'ready' ? 'Sẵn sàng phục vụ' : m.status}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={async () => {
                              try {
                                const res = await verifyModel(m.id);
                                alert(`Kết quả xác minh: ${res.status}\n${res.message}`);
                              } catch (e: any) {
                                alert(`Lỗi kiểm tra: ${e.message}`);
                              }
                            }}
                            className="text-sky-400 hover:underline mr-3 font-sans text-xs"
                            title="Chạy probe API thực tế"
                          >
                            Xác minh
                          </button>
                          <button
                            onClick={() => {
                              setBenchModelId(m.id);
                              setActiveTab('benchmark');
                            }}
                            className="text-emerald-400 hover:underline mr-3 font-sans text-xs"
                          >
                            Benchmark
                          </button>
                          <button
                            onClick={() => handleDeleteModel(m.id)}
                            className="text-rose-400 hover:text-rose-300 font-sans text-xs"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                    {models.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                          Chưa có model nào. Hãy sang tab "2. Danh mục Model" để chọn và thêm model.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: BENCHMARK */}
          {activeTab === 'benchmark' && (
            <div className="space-y-5">
              {/* Benchmark Trigger Card */}
              <div className="p-4 bg-[#151c2a] border border-slate-700/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-slate-100 flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Bộ Kiểm Định Năng Lực Model (Full Model Benchmark Suite)</span>
                  </h3>

                  <div className="flex items-center space-x-3">
                    <select
                      value={benchModelId}
                      onChange={(e) => setBenchModelId(e.target.value)}
                      className="bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-emerald-400 font-medium focus:outline-none"
                    >
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.display_name} ({m.connection_name})
                        </option>
                      ))}
                    </select>

                    <select
                      value={benchLevel}
                      onChange={(e) => setBenchLevel(e.target.value as any)}
                      className="bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-slate-200 focus:outline-none"
                    >
                      <option value="quick">Nhanh (Tests 1-3)</option>
                      <option value="standard">Tiêu chuẩn (Tests 1-7)</option>
                      <option value="full">Toàn diện (Tests 1-10)</option>
                    </select>

                    <button
                      onClick={handleRunBenchmark}
                      disabled={isRunningBench || !benchModelId}
                      className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-1.5 rounded transition shadow shadow-emerald-600/30"
                    >
                      <Play className={`w-3.5 h-3.5 ${isRunningBench ? 'animate-spin' : ''}`} />
                      <span>{isRunningBench ? 'Đang kiểm định...' : 'Bắt đầu Benchmark'}</span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Kiểm tra thực tế: Kết nối &bull; Hội thoại &bull; Truyền luồng &bull; Lập trình thuật toán &bull; Suy luận logic &bull; Định dạng JSON &bull; Gọi công cụ an toàn.
                </p>
              </div>

              {/* Compare Models Section */}
              <div className="p-4 bg-[#151c2a] border border-slate-700/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-xs text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      <span>So Sánh Năng Lực Model (Model Comparison)</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">Chọn 2 hoặc nhiều model để đối chiếu điểm benchmark và năng lực thực tế</p>
                  </div>
                  <button
                    onClick={handleCompareModels}
                    disabled={isComparing || compareModelIds.length < 2}
                    className={`px-3 py-1.5 rounded font-medium text-xs transition ${
                      compareModelIds.length >= 2 && !isComparing
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isComparing ? 'Đang so sánh...' : `So sánh (${compareModelIds.length} models)`}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {models.map((m) => {
                    const isSelected = compareModelIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setCompareModelIds((prev) =>
                            isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                          );
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono border transition ${
                          isSelected
                            ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/60'
                            : 'bg-[#101622] text-slate-400 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {m.display_name}
                      </button>
                    );
                  })}
                </div>

                {comparisonData.length > 0 && (
                  <div className="overflow-x-auto border border-slate-700/60 rounded-lg mt-3 bg-[#111722]">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#161f2e] text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <tr>
                          <th className="p-2.5">Model</th>
                          <th className="p-2.5 text-center">Coding</th>
                          <th className="p-2.5 text-center">Reasoning</th>
                          <th className="p-2.5 text-center">Tool Calling</th>
                          <th className="p-2.5 text-center">Vision</th>
                          <th className="p-2.5 text-center">TTFT</th>
                          <th className="p-2.5 text-center">TPS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono">
                        {comparisonData.map((cd) => (
                          <tr key={cd.model_id} className="hover:bg-slate-800/30">
                            <td className="p-2.5">
                              <strong className="text-slate-100 block">{cd.display_name}</strong>
                              <span className="text-[10px] text-slate-500">{cd.raw_model_id}</span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={cd.coding_score > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                {cd.coding_score * 100}%
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={cd.reasoning_score > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                {cd.reasoning_score * 100}%
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] ${
                                  cd.capabilities?.native_tool_calling === 'VERIFIED'
                                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-700/50'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {cd.capabilities?.native_tool_calling || 'UNKNOWN'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] ${
                                  cd.capabilities?.vision === 'VERIFIED'
                                    ? 'bg-pink-950/40 text-pink-400 border border-pink-700/50'
                                    : 'bg-slate-800 text-slate-500'
                                }`}
                              >
                                {cd.capabilities?.vision || 'UNSUPPORTED'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center text-cyan-400">
                              {cd.ttft_ms ? `${cd.ttft_ms}ms` : '-'}
                            </td>
                            <td className="p-2.5 text-center text-slate-200">
                              {cd.tps ? `${cd.tps} t/s` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Latest Report Details */}
              {latestReport && (
                <div className="p-4 bg-[#141b27] border border-emerald-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="font-bold text-slate-100">Kết Quả Kiểm Định Trực Tiếp</span>
                    <span className="text-emerald-400 font-mono font-semibold">
                      Đạt {latestReport.results.passed_count}/{latestReport.results.total_count} bài test
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="p-2.5 bg-[#0e131d] rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Lập trình</span>
                      <strong className="text-emerald-400 text-sm">
                        {latestReport.results.coding_score > 0 ? 'ĐẠT (PASS)' : 'KHÔNG ĐẠT'}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-[#0e131d] rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Suy luận</span>
                      <strong className="text-emerald-400 text-sm">
                        {latestReport.results.reasoning_score > 0 ? 'ĐẠT (PASS)' : 'KHÔNG ĐẠT'}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-[#0e131d] rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Tool Calling</span>
                      <strong className="text-emerald-400 text-sm">
                        {latestReport.results.tools_score > 0 ? 'HỖ TRỢ' : 'CHƯA HỖ TRỢ'}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-[#0e131d] rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Thời gian đáp ứng (TTFT)</span>
                      <strong className="text-cyan-400 text-sm font-mono">
                        {latestReport.results.ttft_ms} ms
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    {latestReport.results.tests.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-[#101622] rounded text-[11px]"
                      >
                        <div className="flex items-center space-x-2">
                          {t.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                          <span className="text-slate-200">{t.name}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-slate-400 text-[10px]">
                          {t.latency_ms && <span>{t.latency_ms} ms</span>}
                          <span>{t.details}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Benchmark History */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
                  Lịch sử kiểm định trước đó
                </h4>
                <div className="divide-y divide-slate-800 border border-slate-700/60 rounded-lg overflow-hidden bg-[#131924]">
                  {benchHistory.map((h) => (
                    <div key={h.id} className="p-3 flex items-center justify-between text-[11px]">
                      <div>
                        <strong className="text-slate-100">{h.display_name}</strong>
                        <span className="text-slate-500 block text-[10px] font-mono">{h.tested_at}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-emerald-400 font-medium">Coding: {h.coding_score * 100}%</span>
                        <span className="text-emerald-400 font-medium">Reasoning: {h.reasoning_score * 100}%</span>
                        <span className="text-cyan-400 font-mono">TTFT: {h.ttft_ms}ms</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                            h.status === 'passed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {h.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {benchHistory.length === 0 && !latestReport && (
                    <div className="p-8 text-center text-slate-500">
                      Chưa có lịch sử benchmark. Nhấn "Bắt đầu Benchmark" để kiểm tra model đầu tiên.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RPM / TPM QUOTA */}
          {activeTab === 'quota' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-[#141b27] border border-slate-700/60 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>RPM Hiện tại</span>
                  </span>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {metrics?.current_rpm || 0} / {metrics?.max_rpm || 40}
                  </div>
                  <span className="text-[10px] text-slate-500">Yêu cầu mỗi phút (Sliding window)</span>
                </div>

                <div className="p-4 bg-[#141b27] border border-slate-700/60 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    <span>TPM Hiện tại</span>
                  </span>
                  <div className="text-2xl font-bold font-mono text-cyan-400">
                    {((metrics?.current_tpm || 0) / 1000).toFixed(1)}k / {((metrics?.max_tpm || 100000) / 1000).toFixed(0)}k
                  </div>
                  <span className="text-[10px] text-slate-500">Tokens mỗi phút</span>
                </div>

                <div className="p-4 bg-[#141b27] border border-slate-700/60 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                    <Cpu className="w-3.5 h-3.5 text-amber-400" />
                    <span>Hàng đợi / Đang chạy</span>
                  </span>
                  <div className="text-2xl font-bold font-mono text-slate-100">
                    {metrics?.active_requests || 0} / {metrics?.queue_length || 0}
                  </div>
                  <span className="text-[10px] text-slate-500">Requests đang xử lý</span>
                </div>

                <div className="p-4 bg-[#141b27] border border-slate-700/60 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-400" />
                    <span>Lỗi 429 Rate Limit</span>
                  </span>
                  <div className="text-2xl font-bold font-mono text-slate-100">
                    {metrics?.errors_429_count || 0}
                  </div>
                  <span className="text-[10px] text-slate-500">Đã tự động phục hồi với Backoff</span>
                </div>
              </div>

              {/* Policy description */}
              <div className="p-4 bg-[#141b27] border border-slate-700/60 rounded-xl space-y-2 text-[11px] text-slate-300">
                <h4 className="font-semibold text-slate-100 text-xs uppercase">
                  Cơ chế Quản lý &amp; Phục hồi Rate Limit NVIDIA
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>
                    <strong className="text-slate-200">Sliding Window Counter:</strong> Theo dõi chính xác số lượng request theo cửa sổ trượt 60 giây.
                  </li>
                  <li>
                    <strong className="text-slate-200">Khoảng đệm an toàn (Safety Margin):</strong> Tự động trừ hao 5 RPM để đảm bảo không chạm ngưỡng ngắt kết nối từ NVIDIA API.
                  </li>
                  <li>
                    <strong className="text-slate-200">Exponential Backoff &amp; Jitter:</strong> Khi nhận HTTP 429, hệ thống đọc header `Retry-After`, tạm dừng hàng đợi của connection đó và tự động thử lại với jitter ngẫu nhiên, không tạo vòng lặp vô hạn.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
