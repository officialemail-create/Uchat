import React from 'react';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // log to console for now; could be sent to external monitoring
    console.error('Uncaught error in component tree:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-lg rounded-lg border bg-white p-8 text-center shadow-md dark:bg-gray-800">
            <h2 className="mb-2 text-lg font-semibold">Something went wrong</h2>
            <p className="mb-4 text-sm text-gray-600">An unexpected error occurred. Please reload the page to continue.</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => window.location.reload()} className="rounded bg-purple-600 px-4 py-2 text-white">Reload</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
