import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message?: string;
}

/** 렌더링 중 예외가 나도 흰 화면 대신 복구 안내를 보여줍니다. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("렌더링 오류:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center dark:bg-slate-950">
          <span className="text-4xl">😵</span>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            문제가 발생했습니다
          </h1>
          <p className="max-w-md text-sm text-slate-500">
            화면을 그리는 중 오류가 났습니다. 새로고침하면 대부분 해결됩니다.
          </p>
          {this.state.message && (
            <pre className="max-w-md overflow-auto rounded-lg bg-slate-900 p-3 text-left text-xs text-slate-300">
              {this.state.message}
            </pre>
          )}
          <button
            onClick={() => location.reload()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
