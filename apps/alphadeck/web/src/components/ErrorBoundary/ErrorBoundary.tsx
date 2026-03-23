import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>오류가 발생했습니다. 페이지를 새로고침해주세요.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
