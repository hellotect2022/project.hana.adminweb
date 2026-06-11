import { Component, type ReactNode } from 'react';

// 장비 GLB 로드 실패(404 등) 시 fallback(큐브)로 대체 — 한 장비 오류가 씬 전체를 막지 않게.
export class DeviceErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
