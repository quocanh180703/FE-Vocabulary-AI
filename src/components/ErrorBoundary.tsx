import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ApiErrorState } from './states/SageStates';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <ApiErrorState
            title="Đã xảy ra sự cố hiển thị"
            description="Dữ liệu học tập của bạn vẫn an toàn. Hãy tải lại trang để tiếp tục buổi học cùng Vi."
            errorDetail={this.state.error?.message}
            onRetry={() => window.location.reload()}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
