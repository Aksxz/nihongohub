import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-red-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1918]">
            {this.props.fallbackTitle || 'Something went wrong rendering this section'}
          </h2>
          <p className="text-xs text-[#8c8880] max-w-md mx-auto">
            {this.state.error?.message || 'An unexpected error occurred while displaying this view.'}
          </p>
          <div className="pt-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a1918] text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
