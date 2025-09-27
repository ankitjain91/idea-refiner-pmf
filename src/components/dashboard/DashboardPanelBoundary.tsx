import React from 'react';

interface DashboardPanelBoundaryProps {
  children: React.ReactNode;
  label: string;
}

interface DashboardPanelBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class DashboardPanelBoundary extends React.Component<DashboardPanelBoundaryProps, DashboardPanelBoundaryState> {
  state: DashboardPanelBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): DashboardPanelBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[DashboardPanelBoundary] Error in panel ${this.props.label}:`, error, info);
    // Dispatch accessible status event
    document.dispatchEvent(new CustomEvent('status:announce', { detail: `Panel ${this.props.label} failed to load.` }));
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border rounded-lg bg-destructive/5 text-sm space-y-3">
          <p className="font-semibold">Failed to load {this.props.label} panel.</p>
          <p className="text-muted-foreground">{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={this.handleRetry} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs hover:opacity-90">
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default DashboardPanelBoundary;
