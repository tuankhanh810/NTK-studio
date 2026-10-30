import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[NTK Studio ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyError = () => {
    const errorText = `[NTK Studio 1.2.0 Error Report]\nTime: ${new Date().toISOString()}\nMessage: ${this.state.error?.message}\nStack: ${this.state.error?.stack}\nComponentStack: ${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errorText);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#090d16] text-slate-100 flex items-center justify-center p-6 z-[99999]">
          <div className="bg-[#121929] border border-rose-500/30 rounded-2xl p-8 max-w-xl w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500"></div>

            <div className="flex items-center space-x-3 text-rose-400 mb-4">
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Đã xảy ra sự cố hiển thị trong NTK Studio</h2>
                <p className="text-xs text-slate-400">Giao diện đã gặp lỗi không mong muốn nhưng hệ thống dữ liệu vẫn an toàn.</p>
              </div>
            </div>

            <div className="bg-[#0a0e18] border border-slate-800 rounded-xl p-4 my-4 font-mono text-xs text-rose-300 max-h-48 overflow-y-auto leading-relaxed select-text">
              <strong className="text-rose-400 block mb-1">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Lỗi không xác định'}
              </strong>
              {this.state.error?.stack && (
                <pre className="text-[10px] text-slate-500 whitespace-pre-wrap mt-2">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={this.handleCopyError}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center space-x-1.5"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép chi tiết lỗi</span>
                  </>
                )}
              </button>

              <button
                onClick={this.handleReload}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition flex items-center space-x-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tải lại giao diện</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
