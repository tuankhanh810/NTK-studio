import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Star,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Cpu,
  Layers,
  Wrench,
  Eye,
  Sliders,
  Check,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useModelStore } from '../../stores/useModelStore';
import type { ModelItem } from '../../types';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProviderManager?: () => void;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  onOpenProviderManager,
}) => {
  const {
    models,
    selectedModelId,
    setSelectedModelId,
    roles,
    updateRoles,
    fetchRoles,
    toggleFavorite,
    verifyModel,
  } = useModelStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState<string>('all');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [activeRoleModal, setActiveRoleModal] = useState<ModelItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  // Unique list of providers
  const providers = useMemo(() => {
    const set = new Set<string>();
    models.forEach((m) => {
      if (m.provider_type) set.add(m.provider_type);
      else if (m.connection_name) set.add(m.connection_name);
    });
    return Array.from(set);
  }, [models]);

  // Filtered models
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      // Search filter
      const matchesSearch =
        m.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.model_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.connection_name || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Provider filter
      if (selectedProvider !== 'all') {
        const pType = m.provider_type || m.connection_name;
        if (pType !== selectedProvider) return false;
      }

      // Favorite filter
      if (onlyFavorites && !m.is_favorite) return false;

      // Capability filter
      if (selectedCapability === 'tools' && !m.supports_tools) return false;
      if (selectedCapability === 'vision' && !m.supports_vision) return false;
      if (selectedCapability === 'verified' && m.verification_status !== 'VERIFIED') return false;

      return true;
    });
  }, [models, searchQuery, selectedProvider, onlyFavorites, selectedCapability]);

  const handleSelectModel = (modelId: string) => {
    setSelectedModelId(modelId);
    onClose();
  };

  const handleVerifyProbe = async (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    setVerifyingId(modelId);
    await verifyModel(modelId);
    setVerifyingId(null);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    await toggleFavorite(modelId);
  };

  const getProviderBadge = (providerType?: string) => {
    const p = (providerType || 'nvidia').toLowerCase();
    if (p.includes('nvidia')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          NVIDIA NIM
        </span>
      );
    }
    if (p.includes('anthropic')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          Anthropic
        </span>
      );
    }
    if (p.includes('openai') && !p.includes('compatible')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
          OpenAI
        </span>
      );
    }
    if (p.includes('gemini')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
          Google Gemini
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
        {providerType || 'Custom'}
      </span>
    );
  };

  const getVerificationBadge = (status?: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-600/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>VERIFIED</span>
          </span>
        );
      case 'UNSUPPORTED':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-950/60 text-red-300 border border-red-600/40">
            <AlertCircle className="w-3 h-3 text-red-400" />
            <span>UNSUPPORTED</span>
          </span>
        );
      case 'DISCOVERED':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950/60 text-blue-300 border border-blue-600/40">
            <ShieldCheck className="w-3 h-3 text-blue-400" />
            <span>DISCOVERED</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            <span>UNKNOWN</span>
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#0f141c] border border-slate-700/80 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#141a24]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
                <span>Chọn Mô Hình AI (Model Selector)</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {models.length} Models
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Lựa chọn mô hình cho phiên làm việc, tự động định tuyến hoặc cấu hình vai trò chuyên biệt.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenProviderManager && (
              <button
                onClick={() => {
                  onClose();
                  onOpenProviderManager();
                }}
                className="text-xs px-3 py-1.5 rounded-md bg-[#1a2230] text-slate-300 hover:text-emerald-400 hover:bg-[#202b3d] border border-slate-700/80 transition flex items-center space-x-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Quản lý Nhà cung cấp</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-[#121822] space-y-3">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm model theo tên, Model ID hoặc nhà cung cấp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#18212f] border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                onlyFavorites
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-[#18212f] text-slate-400 border-slate-700/80 hover:text-slate-200'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>Yêu thích ({models.filter((m) => m.is_favorite).length})</span>
            </button>
          </div>

          {/* Provider & Capability Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-500 mr-1 font-medium">Nhà cung cấp:</span>
            <button
              onClick={() => setSelectedProvider('all')}
              className={`px-2.5 py-1 rounded text-xs transition ${
                selectedProvider === 'all'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'bg-[#18212f] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Tất cả
            </button>
            {providers.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedProvider(p)}
                className={`px-2.5 py-1 rounded text-xs capitalize transition ${
                  selectedProvider === p
                    ? 'bg-emerald-600 text-white font-medium'
                    : 'bg-[#18212f] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {p}
              </button>
            ))}

            <div className="h-4 w-[1px] bg-slate-700 mx-2" />

            <span className="text-[11px] text-slate-500 mr-1 font-medium">Khả năng:</span>
            <button
              onClick={() => setSelectedCapability(selectedCapability === 'tools' ? 'all' : 'tools')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition ${
                selectedCapability === 'tools'
                  ? 'bg-cyan-600 text-white font-medium'
                  : 'bg-[#18212f] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Wrench className="w-3 h-3" />
              <span>Tools</span>
            </button>
            <button
              onClick={() => setSelectedCapability(selectedCapability === 'vision' ? 'all' : 'vision')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition ${
                selectedCapability === 'vision'
                  ? 'bg-purple-600 text-white font-medium'
                  : 'bg-[#18212f] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Vision</span>
            </button>
            <button
              onClick={() => setSelectedCapability(selectedCapability === 'verified' ? 'all' : 'verified')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition ${
                selectedCapability === 'verified'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'bg-[#18212f] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Verified Only</span>
            </button>
          </div>
        </div>

        {/* Model Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40">
          {/* Card: Auto Model Option */}
          <div
            onClick={() => handleSelectModel('auto')}
            className={`p-3.5 rounded-lg border cursor-pointer transition flex items-start justify-between ${
              selectedModelId === 'auto'
                ? 'bg-emerald-950/30 border-emerald-500/80 ring-1 ring-emerald-500/30'
                : 'bg-[#141b26] border-slate-800/80 hover:border-slate-700 hover:bg-[#182230]'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-semibold text-emerald-400">⚡ Tự động định tuyến (Auto Router 1.1.0)</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Khuyến nghị
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Hệ thống tự động phân tích prompt, chấm điểm benchmark (Coding, Reasoning, Tools), theo dõi RPM/TPM còn lại và chọn model tối ưu nhất theo thời gian thực.
                </p>
                <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-2">
                  <span>• Ưu tiên Reasoning cho Debug/Review</span>
                  <span>• Cân bằng tải tránh HTTP 429</span>
                  <span>• Minh bạch trong tiến trình Agent</span>
                </div>
              </div>
            </div>
            {selectedModelId === 'auto' && (
              <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/30">
                <Check className="w-3.5 h-3.5" />
                <span>Đang chọn</span>
              </span>
            )}
          </div>

          {/* Individual Models */}
          {filteredModels.map((m) => {
            const isSelected = selectedModelId === m.id;
            const isVerifying = verifyingId === m.id;

            return (
              <div
                key={m.id}
                onClick={() => handleSelectModel(m.id)}
                className={`p-3.5 rounded-lg border cursor-pointer transition flex items-start justify-between pt-3 ${
                  isSelected
                    ? 'bg-[#15212e] border-emerald-500/70 ring-1 ring-emerald-500/30'
                    : 'bg-[#121822] border-slate-800/80 hover:border-slate-700 hover:bg-[#16202c]'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <button
                    onClick={(e) => handleToggleFavorite(e, m.id)}
                    className="mt-1 text-slate-500 hover:text-amber-400 transition"
                    title={m.is_favorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        m.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                      }`}
                    />
                  </button>

                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-semibold text-slate-100">{m.display_name}</h3>
                      {getProviderBadge(m.provider_type || m.connection_name)}
                      {getVerificationBadge(m.verification_status)}
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                      <span>{m.model_id}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400 font-sans text-[11px]">
                        Context: {Math.round(m.context_window / 1000)}k | RPM: {m.rpm_limit}
                      </span>
                    </div>

                    {/* Capabilities & Benchmark Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {m.supports_tools && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center space-x-1">
                          <Wrench className="w-2.5 h-2.5" />
                          <span>Tool Calling</span>
                        </span>
                      )}
                      {m.supports_vision && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800 flex items-center space-x-1">
                          <Eye className="w-2.5 h-2.5" />
                          <span>Vision</span>
                        </span>
                      )}
                      {m.supports_streaming && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          Streaming
                        </span>
                      )}
                      {m.benchmark && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/90 text-emerald-400 font-mono">
                          Code: {Math.round(m.benchmark.coding_score || 0)}/100
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2 shrink-0">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={(e) => handleVerifyProbe(e, m.id)}
                      disabled={isVerifying}
                      className="px-2 py-1 rounded text-[11px] bg-[#1a2230] text-slate-300 hover:text-emerald-400 hover:bg-[#222e42] border border-slate-700/80 transition flex items-center space-x-1"
                      title="Gửi request probe để kiểm tra quyền truy cập model"
                    >
                      <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin text-emerald-400' : ''}`} />
                      <span>{isVerifying ? 'Đang probe...' : 'Kiểm tra'}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveRoleModal(m);
                      }}
                      className="px-2 py-1 rounded text-[11px] bg-[#1a2230] text-slate-300 hover:text-cyan-400 hover:bg-[#222e42] border border-slate-700/80 transition flex items-center space-x-1"
                      title="Gán model này cho các vai trò đặc thù"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Vai trò</span>
                    </button>
                  </div>

                  {isSelected && (
                    <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                      <Check className="w-3.5 h-3.5" />
                      <span>Đang chọn</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredModels.length === 0 && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm">Không tìm thấy model nào phù hợp với bộ lọc.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedProvider('all');
                  setOnlyFavorites(false);
                  setSelectedCapability('all');
                }}
                className="text-xs text-emerald-400 hover:underline"
              >
                Đặt lại tất cả bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Role Assignment Sub-Modal */}
        {activeRoleModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-[#121822] border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Phân Vai Trò: {activeRoleModal.display_name}</span>
                </h3>
                <button
                  onClick={() => setActiveRoleModal(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Gán model này làm model mặc định cho từng nhiệm vụ chuyên biệt:
              </p>

              <div className="space-y-2">
                {[
                  { key: 'chat', label: 'Trò chuyện cơ bản (Chat)' },
                  { key: 'agentic_coding', label: 'Agentic Coding đa bước' },
                  { key: 'planning', label: 'Lập kế hoạch kiến trúc (Planning)' },
                  { key: 'coding', label: 'Viết mã nguồn (Coding)' },
                  { key: 'debugging', label: 'Gỡ lỗi tự động (Debugging)' },
                  { key: 'vision', label: 'Thị giác hình ảnh (Vision)' },
                  { key: 'benchmark', label: 'Chạy kiểm định (Benchmark)' },
                ].map((item) => {
                  const isAssigned = (roles as any)[item.key] === activeRoleModal.id;
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-2 rounded bg-[#18212f] border border-slate-800 text-xs"
                    >
                      <span className="text-slate-200">{item.label}</span>
                      <button
                        onClick={async () => {
                          const updated = {
                            [item.key]: isAssigned ? 'auto' : activeRoleModal.id,
                          };
                          await updateRoles(updated);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                          isAssigned
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {isAssigned ? '✓ Đang gán' : 'Gán model này'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActiveRoleModal(null)}
                  className="px-4 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#141a24] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span>Model hiện hành:</span>
            <strong className="text-emerald-400 font-medium">
              {selectedModelId === 'auto'
                ? '⚡ Tự động định tuyến (Auto Model)'
                : models.find((m) => m.id === selectedModelId)?.display_name || selectedModelId}
            </strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
