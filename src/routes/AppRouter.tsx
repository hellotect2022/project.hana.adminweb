import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layout/MainLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { DevicesPage } from '@/pages/DevicesPage';
import { ViewerPage } from '@/viewer/ViewerPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* admin 영역: 공통 레이아웃(헤더) 안 */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/devices" element={<DevicesPage />} />
        </Route>

        {/* WebGL 뷰어: 전체화면(헤더 WebGL 버튼 → 여기로 전환) */}
        <Route path="/webgl" element={<ViewerPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
