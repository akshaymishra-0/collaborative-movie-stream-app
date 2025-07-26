import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-8">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 max-w-2xl">
            <h2 className="text-red-400 text-xl font-bold mb-4">⚠️ Application Error</h2>
            <p className="text-red-300 mb-4">
              Something went wrong while loading the application. This might be due to:
            </p>
            <ul className="text-red-300 list-disc list-inside mb-4 space-y-1">
              <li>Browser compatibility issues with WebRTC</li>
              <li>Missing dependencies or polyfills</li>
              <li>Network connectivity problems</li>
            </ul>
            <details className="mb-4">
              <summary className="text-red-400 cursor-pointer">Click to see technical details</summary>
              <pre className="text-red-300 text-sm mt-2 bg-red-900/10 p-3 rounded border border-red-500/20 overflow-auto">
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
