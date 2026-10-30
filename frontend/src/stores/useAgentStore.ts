import { create } from 'zustand';
import type { AgentEvent } from '../types';
import { api } from '../services/api';

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  modelName?: string;
  toolCall?: {
    tool: string;
    parameters: any;
    success?: boolean;
    output?: string;
  };
  timestamp: number;
}

interface AgentState {
  messages: ChatMessageItem[];
  isRunning: boolean;
  currentModelRouted: string | null;
  routingReason: string | null;
  abortFn: (() => void) | null;

  sendMessage: (instruction: string, workspaceRoot: string, modelId: string) => void;
  stopExecution: () => void;
  clearHistory: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  messages: [
    {
      id: 'welcome_msg',
      role: 'assistant',
      content:
        'Xin chào! Tôi là NTK Studio Agent – Universal AI Coding IDE. Tôi có thể đọc/viết file thật, chạy Terminal thật và thực thi các tác vụ lập trình độc lập qua nhiều mô hình NVIDIA API. Bạn muốn bắt đầu dự án gì?',
      timestamp: Date.now(),
    },
  ],
  isRunning: false,
  currentModelRouted: null,
  routingReason: null,
  abortFn: null,

  sendMessage: (instruction: string, workspaceRoot: string, modelId: string) => {
    const userMsg: ChatMessageItem = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: instruction,
      timestamp: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isRunning: true,
      currentModelRouted: null,
      routingReason: null,
    }));

    let assistantMsgId = `asst_${Date.now()}`;
    let assistantContent = '';

    const abort = api.executeAgentStream(
      instruction,
      workspaceRoot,
      modelId,
      (event: AgentEvent) => {
        if (event.event_type === 'model_selected') {
          set({
            currentModelRouted: event.model_name || 'NVIDIA NIM',
            routingReason: event.reason || null,
          });
        } else if (event.event_type === 'message') {
          assistantContent += event.content || '';
          set((state) => {
            const existing = state.messages.find((m) => m.id === assistantMsgId);
            if (existing) {
              return {
                messages: state.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: assistantContent } : m
                ),
              };
            } else {
              return {
                messages: [
                  ...state.messages,
                  {
                    id: assistantMsgId,
                    role: 'assistant',
                    content: assistantContent,
                    timestamp: Date.now(),
                  },
                ],
              };
            }
          });
        } else if (event.event_type === 'tool_start') {
          const toolCallId = `tool_${Date.now()}`;
          set((state) => ({
            messages: [
              ...state.messages,
              {
                id: toolCallId,
                role: 'tool',
                content: event.content || '',
                toolCall: {
                  tool: event.data?.tool,
                  parameters: event.data?.parameters,
                },
                timestamp: Date.now(),
              },
            ],
          }));
        } else if (event.event_type === 'tool_end') {
          set((state) => {
            const last = state.messages[state.messages.length - 1];
            if (last && last.role === 'tool' && last.toolCall) {
              const updated = {
                ...last,
                content: event.content || last.content,
                toolCall: {
                  ...last.toolCall,
                  success: event.data?.success,
                  output: event.data?.output,
                },
              };
              return {
                messages: [...state.messages.slice(0, -1), updated],
              };
            }
            return state;
          });
        } else if (event.event_type === 'error') {
          set((state) => ({
            messages: [
              ...state.messages,
              {
                id: `err_${Date.now()}`,
                role: 'system',
                content: event.content || 'Đã xảy ra lỗi khi thực thi',
                timestamp: Date.now(),
              },
            ],
          }));
        }
      },
      (err: any) => {
        set((state) => ({
          isRunning: false,
          abortFn: null,
          messages: [
            ...state.messages,
            {
              id: `err_${Date.now()}`,
              role: 'system',
              content: `Lỗi kết nối: ${err.message}`,
              timestamp: Date.now(),
            },
          ],
        }));
      },
      () => {
        set({ isRunning: false, abortFn: null });
      }
    );

    set({ abortFn: abort });
  },

  stopExecution: () => {
    const { abortFn } = get();
    if (abortFn) {
      abortFn();
      set({ isRunning: false, abortFn: null });
    }
  },

  clearHistory: () => {
    set({
      messages: [
        {
          id: 'welcome_msg',
          role: 'assistant',
          content: 'Lịch sử đã được làm mới. Tôi sẵn sàng cho tác vụ tiếp theo.',
          timestamp: Date.now(),
        },
      ],
      currentModelRouted: null,
      routingReason: null,
    });
  },
}));
