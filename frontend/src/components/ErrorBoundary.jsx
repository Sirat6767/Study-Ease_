import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-10 max-w-md w-full text-center border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 mx-auto mb-5 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-slate-500 text-sm mb-1">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Check the browser console for more details.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-400 text-white rounded-xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
