import React from 'react';
import { AlertTriangle, RotateCw, ArrowLeft } from 'lucide-react';
import BreezeButton from './BreezeButton.jsx';
import BreezeIcon from './BreezeIcon.jsx';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React render error in ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[350px] p-8 flex flex-col items-center justify-center text-center bg-s2/80 border-2 border-red-500/30 rounded-3xl my-6 max-w-2xl mx-auto shadow-lg backdrop-blur-md">
          <div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-inner">
            <BreezeIcon icon={AlertTriangle} size={28} />
          </div>
          <h2 className="text-lg font-bold text-p4 mb-2">Something went wrong in this view</h2>
          <p className="text-xs text-p5/80 max-w-md mb-6 leading-relaxed">
            An unexpected error occurred while rendering this workspace. You can retry rendering or navigate back to another tab.
          </p>

          {this.state.error?.message && (
            <div className="p-3 mb-6 rounded-xl bg-s1 border border-red-500/20 text-red-400/90 font-mono text-[11px] max-w-lg overflow-x-auto text-left w-full select-all">
              {this.state.error.message}
            </div>
          )}

          <div className="flex items-center gap-3">
            <BreezeButton
              variant="secondary"
              size="sm"
              icon={RotateCw}
              onClick={this.handleReset}
            >
              Try Again
            </BreezeButton>
            <BreezeButton
              variant="primary"
              size="sm"
              icon={ArrowLeft}
              onClick={() => {
                this.handleReset();
                window.history.back();
              }}
            >
              Go Back
            </BreezeButton>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
