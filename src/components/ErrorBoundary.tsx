import { Component, type ErrorInfo, type ReactNode } from 'react';

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
        <div style={{ padding: 48, textAlign: 'center', maxWidth: 600, margin: '40px auto' }}>
          <h2>Đã có lỗi xảy ra</h2>
          <p className="sub mt8" style={{ color: 'var(--text-sub)' }}>
            Không thể tải nội dung trang này. Vui lòng tải lại trang hoặc quay về trang chủ.
          </p>
          {this.state.error && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: 8,
                fontSize: 13,
                textAlign: 'left',
                overflowX: 'auto',
                fontFamily: 'monospace',
              }}
            >
              {this.state.error.message}
            </div>
          )}
          <div className="btn-row mt16" style={{ justifyContent: 'center' }}>
            <button className="btn ghost" onClick={() => window.location.href = '/'}>
              Về trang chủ
            </button>
            <button className="btn" onClick={() => this.setState({ hasError: false, error: null })}>
              Thử lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
