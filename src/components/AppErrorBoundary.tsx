import React from 'react';
import ErrorScreen from '@/src/components/ErrorScreen';
import { crashReporter } from '@/src/services/crashReporter';

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    crashReporter.captureException(error, 'AppErrorBoundary');
    if (__DEV__) {
      console.error('AppErrorBoundary caught error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen />;
    }

    return this.props.children;
  }
}
