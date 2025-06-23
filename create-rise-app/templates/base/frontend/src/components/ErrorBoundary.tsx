'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error);
    console.error('Error info:', errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Something went wrong</h2>
                <p className="text-sm text-muted-foreground">
                  An unexpected error occurred. Please try refreshing the page.
                </p>
                {this.state.error && (
                  <details className="mt-4 text-left">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Error details
                    </summary>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleReset}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="gap-2"
                >
                  Refresh page
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}