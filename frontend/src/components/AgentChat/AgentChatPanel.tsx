import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles, Terminal, CheckCircle2, XCircle, RotateCcw, ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { useAgentStore } from '../../stores/useAgentStore';
import type { ChatMessageItem } from '../../stores/useAgentStore';
import { useModelStore } from '../../stores/useModelStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

export const AgentChatPanel: React.FC = () => {
  const [input, setInput] = useState('');
  const { messages, isRunning, sendMessage, stopExecution, clearHistory, currentModelRouted, routingReason } =
    useAgentStore();
  const { selectedModelId } = useModelStore();
  const { workspaceRoot } = useWorkspaceStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isRunning) return;
    sendMessage(input.trim(), workspaceRoot, selectedModelId);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0f141d] border-l border-[#202938] overflow-hidden select-none">
      {/* Header */}
      <div className="h-10 px-3 border-b border-[#202938] bg-[#121824] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs text-slate-100 tracking-wide uppercase">
            AI AGENTIC STUDIO
          </span>
          {isRunning && (
            <span className="flex items-center space-x-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đang thực thi</span>
            </span>
          )}
        </div>

        <button
          onClick={clearHistory}
          className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition"
          title="Làm mới lịch sử trò chuyện"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Routed Model Banner */}
      {currentModelRouted && (
        <div className="px-3 py-1.5 bg-[#141d2b] border-b border-[#202a3a] text-[11px] text-slate-300 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 truncate">
            <span className="text-slate-400">Model:</span>
            <strong className="text-emerald-400 font-mono truncate">{currentModelRouted}</strong>
          </div>
          {routingReason && (
            <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={routingReason}>
              {routingReason}
            </span>
          )}
        </div>
      )}

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans text-xs">
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-[#202938] bg-[#121824] shrink-0">
        <div className="relative border border-slate-700/80 focus-within:border-emerald-500/70 rounded-lg bg-[#0e131c] overflow-hidden transition shadow-inner">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Giao việc cho AI Agent (vd: Đọc file app/main.py, viết hàm xử lý, chạy test và sửa lỗi)..."
            rows={2}
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 p-2.5 pr-20 text-xs resize-none focus:outline-none"
          />

          <div className="absolute right-2 bottom-2 flex items-center space-x-1">
            {isRunning ? (
              <button
                onClick={stopExecution}
                className="flex items-center space-x-1 bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded text-xs transition shadow"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Dừng</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={`flex items-center space-x-1 px-3 py-1 rounded text-xs transition ${
                  input.trim()
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-600/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-3 h-3" />
                <span>Gửi</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-1">
          <span>Nhấn Enter để gửi, Shift+Enter xuống dòng</span>
          <span>NVIDIA Multi-Model Platform</span>
        </div>
      </div>
    </div>
  );
};

const MessageItem: React.FC<{ message: ChatMessageItem }> = ({ message }) => {
  const [showToolOutput, setShowToolOutput] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="flex justify-end select-text">
        <div className="max-w-[85%] bg-gradient-to-r from-emerald-700 to-teal-800 text-slate-50 p-2.5 rounded-lg rounded-tr-none shadow">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.role === 'tool' && message.toolCall) {
    const { tool, parameters, success, output } = message.toolCall;
    return (
      <div className="border border-slate-700/60 bg-[#141b27] rounded-lg p-2 text-[11px] space-y-1.5">
        <div
          onClick={() => setShowToolOutput(!showToolOutput)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span>Công cụ:</span>
            <strong className="font-mono text-cyan-400">{tool}</strong>
          </div>

          <div className="flex items-center space-x-1">
            {success === true && (
              <span className="flex items-center space-x-1 text-emerald-400 text-[10px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Thành công</span>
              </span>
            )}
            {success === false && (
              <span className="flex items-center space-x-1 text-rose-400 text-[10px]">
                <XCircle className="w-3 h-3" />
                <span>Thất bại</span>
              </span>
            )}
            {showToolOutput ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </div>
        </div>

        {/* Collapsible details */}
        {showToolOutput && (
          <div className="pt-2 border-t border-slate-700/40 space-y-1 select-text font-mono text-[10px]">
            {parameters && (
              <div className="text-slate-400">
                <span className="text-slate-500">Tham số:</span> {JSON.stringify(parameters)}
              </div>
            )}
            {output && (
              <div className="p-1.5 bg-[#0b1018] text-slate-300 rounded border border-slate-800 max-h-40 overflow-y-auto whitespace-pre-wrap">
                {output}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Assistant & System messages
  return (
    <div className="flex justify-start select-text">
      <div className="max-w-[90%] bg-[#151c28] border border-slate-700/50 text-slate-200 p-2.5 rounded-lg rounded-tl-none shadow-sm">
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
};
