import React, { useState, useEffect } from 'react';
import { X, Server, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import type { MCPServerInfo } from '../../types';

interface MCPModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MCPModal: React.FC<MCPModalProps> = ({ isOpen, onClose }) => {
  const [servers, setServers] = useState<MCPServerInfo[]>([]);
  const [name, setName] = useState('Unity MCP Server');
  const [transport, setTransport] = useState('stdio');
  const [command, setCommand] = useState('npx');
  const [args, setArgs] = useState('-y @modelcontextprotocol/server-filesystem');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadServers();
    }
  }, [isOpen]);

  const loadServers = async () => {
    try {
      const data = await api.getMCPServers();
      setServers(data);
    } catch (e) {
      // quiet
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await api.addMCPServer({
        name,
        transport,
        command,
        args: args.split(' ').filter(Boolean),
      });
      setName('');
      await loadServers();
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn gỡ bỏ MCP Server này?')) return;
    try {
      await api.removeMCPServer(id);
      await loadServers();
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4">
      <div className="bg-[#121824] border border-[#263245] rounded-xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="h-14 px-6 border-b border-[#202938] flex items-center justify-between bg-[#151c2b] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
                MODEL CONTEXT PROTOCOL (MCP)
              </h2>
              <p className="text-[11px] text-slate-400">Kết nối công cụ mở rộng từ bên thứ ba (Unity, Unreal, Database...)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-300">
          {/* Add form */}
          <div className="p-4 bg-[#161f2e] border border-slate-700/60 rounded-xl space-y-3">
            <h3 className="font-semibold text-xs text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Đăng Ký MCP Server Mới</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tên Server</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Giao thức (Transport)</label>
                <select
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  className="w-full bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-slate-100 focus:outline-none"
                >
                  <option value="stdio">stdio (Standard I/O)</option>
                  <option value="sse">sse (Server-Sent Events)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Lệnh thực thi &amp; Đối số (Command &amp; Args)</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="npx / python / uv"
                  className="w-1/3 bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-slate-100 focus:outline-none"
                />
                <input
                  type="text"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="đối số cách nhau bằng dấu cách"
                  className="flex-1 bg-[#0e131d] border border-slate-700 px-3 py-1.5 rounded text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleAdd}
                disabled={isSubmitting || !name.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded transition font-medium"
              >
                {isSubmitting ? 'Đang thêm...' : 'Thêm Server'}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
              Danh sách MCP Server ({servers.length})
            </h4>
            <div className="divide-y divide-slate-800 border border-slate-700/60 rounded-lg overflow-hidden bg-[#131924]">
              {servers.map((s) => (
                <div key={s.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <strong className="text-slate-100">{s.name}</strong>
                      <span className="text-[10px] bg-slate-800 text-indigo-400 px-1.5 py-0.5 rounded font-mono">
                        {s.transport}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                      {s.command} {s.args?.join(' ')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1 text-emerald-400 text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sẵn sàng</span>
                    </span>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {servers.length === 0 && (
                <div className="p-6 text-center text-slate-500">Chưa có MCP Server nào được thêm.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
