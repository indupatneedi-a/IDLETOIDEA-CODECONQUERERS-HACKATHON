import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed && parsed.error) {
          friendly = `Database access error (${parsed.operationType || 'operation'} on ${parsed.path || 'record'}): ${parsed.error}`;
        }
      } catch {
        // Use plain message
      }

      return (
        <div className="min-h-screen bg-[#0D0D0F] text-[#F5F1F2] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#7A1F3D]/25 border border-[#E0555F]/50 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-[#E0555F]" />
            </div>
            <h1 className="text-xl font-bold text-[#F5F1F2]">Something went wrong</h1>
            <p className="text-sm text-[#B8AEB2] leading-relaxed break-words">{friendly}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-sm font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
