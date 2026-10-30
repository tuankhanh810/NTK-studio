import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Play, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { api } from '../../services/api';

interface TerminalLog {
  id: string;
  command: string;
  output: string;
  success: boolean;
  timestamp: string;
}

export const TerminalPanel: React.FC = () => {
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { workspaceRoot } = useWorkspaceStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleRun = async () => {
    if (!command.trim() || isRunning) return;
    const cmd = command.trim();
    setCommand('');
    setIsRunning(true);

    const logId = `cmd_${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString('vi-VN');

    try {
      const res = await api.execTerminal(workspaceRoot, cmd);
      setLogs((prev) => [
        ...prev,
        {
          id: logId,
          command: cmd,
          output: res.output || res.error || '(Không có phản hồi)',
          success: res.success,
          timestamp: timeStr,
        },
      ]);
    } catch (e: any) {
      setLogs((prev) => [
        ...prev,
        {
          id: logId,
          command: cmd,
          output: `Lỗi thực thi: ${e.message}`,
          success: false,
          timestamp: timeStr,
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0f17] text-slate-200 font-mono text-xs select-none">
      {/* Header */}
      <div className="h-8 bg-[#101622] border-b border-[#202938] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
            TERMINAL (POWERSHELL)
          </span>
          <span className="text-[10px] text-slate-500 font-normal truncate max-w-[250px]">
            {workspaceRoot}
          </span>
        </div>

        <button
          onClick={() => setLogs([])}
          className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition"
          title="Xóa màn hình terminal"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Output Console */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 select-text text-[11px] leading-relaxed">
        {logs.length === 0 ? (
          <div className="text-slate-600">
            NTK Studio Windows Terminal v1.0. Nhập lệnh CLI hoặc PowerShell bên dưới...
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="space-y-1">
              <div className="flex items-center space-x-2 text-slate-400">
                <span className="text-emerald-400 font-bold">PS&gt;</span>
                <span className="text-slate-100 font-semibold">{log.command}</span>
                <span className="text-[10px] text-slate-600">({log.timestamp})</span>
              </div>
              <pre className="p-2 bg-[#101622] text-slate-300 rounded border border-slate-800/80 whitespace-pre-wrap overflow-x-auto">
                {log.output}
              </pre>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="h-9 bg-[#101622] border-t border-[#202938] px-3 flex items-center space-x-2 shrink-0">
        <span className="text-emerald-400 font-bold">PS&gt;</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập lệnh PowerShell..."
          disabled={isRunning}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none text-xs"
        />
        <button
          onClick={handleRun}
          disabled={!command.trim() || isRunning}
          className={`p-1 rounded transition ${
            command.trim() && !isRunning
              ? 'text-emerald-400 hover:bg-emerald-500/20'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Thực thi lệnh"
        >
          <Play className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
