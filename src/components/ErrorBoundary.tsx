import { Component, type ErrorInfo, type ReactNode } from 'react';
import vi3dImg from '../assets/vi-3d.webp';

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
          <div className="errcard">
            <img src={vi3dImg} alt="Vi Mascot" />
            <h1>Đã có lỗi xảy ra</h1>
            <p className="sub" style={{ marginTop: '10px', lineHeight: 1.65 }}>
              Rất tiếc, đã có sự cố ngoài ý muốn khi tải nội dung này. Dữ liệu học của bạn vẫn an toàn — bạn thử lại hoặc quay về trang chính nhé.
            </p>
            {this.state.error && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 14px',
                  background: 'var(--red-bg)',
                  color: 'var(--red-dark)',
                  borderRadius: '12px',
                  fontSize: '13px',
                  textAlign: 'left',
                  overflowX: 'auto',
                  fontFamily: 'monospace',
                }}
              >
                {this.state.error.message}
              </div>
            )}
            <div className="btn-row" style={{ justifyContent: 'center', marginTop: '24px', gap: '12px' }}>
              <button
                type="button"
                className="btn ghost"
                style={{ minHeight: '48px', padding: '0 22px' }}
                onClick={() => { window.location.href = '/dashboard'; }}
              >
                Về trang chính
              </button>
              <button
                type="button"
                className="btn"
                style={{ minHeight: '48px', padding: '0 22px' }}
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Thử lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
