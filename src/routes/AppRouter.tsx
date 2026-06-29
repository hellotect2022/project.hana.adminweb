import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom"
import PrivateRoute from "./PrivateRoute"
import LoginPage from "@/pages/LoginPage"
import MainLayout from "@/components/layout/MainLayout"
import TestPage from "@/pages/TestPage"
// 사용자 관리

// 권한 관리
import AuthGroupsPage from "@/pages/auth/AuthGroupsPage"
import AuthMenuPermissionPage from "@/pages/auth/AuthMenuPermissionPage"
import AuthFeaturePermissionPage from "@/pages/auth/AuthFeaturePermissionPage"
// 메뉴 관리
import MenuDisplayPage from "@/pages/menu/MenuDisplayPage"
import MenuEditPage from "@/pages/menu/MenuEditPage"
// 로그 관리 (접속·사용·통계 통합 허브)
import LogHubPage from "@/pages/log/LogHubPage"
// 시스템 관리
import SystemServerPage from "@/pages/system/SystemServerPage"
import SystemLogRetentionPage from "@/pages/system/SystemLogRetentionPage"
import UserManagePage from "@/pages/users/UserManagePage"
import UserManageGroupPage from "@/pages/users/UserManageGroupPage"
import { menuData } from "@/constants/menuData"
import SopTemplateEditorPage from "@/pages/sop/SopTemplateEditorPage"
import SopTemplatePreviewPage from "@/pages/sop/SopTemplatePreviewPage"
import { ViewerPage } from "@/viewer/ViewerPage"

const AppRouter = () => {

    const allRoutes = menuData.flatMap(group=>group.items)

    return(
        <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
                {/* 공용 페이지 */}
                <Route path="/login" element={<LoginPage/>}/>
                {/* WebGL 디지털트윈 뷰어 (전체화면) */}
                <Route path="/webgl" element={<ViewerPage/>}/>

                {/* 로그인 후 토큰 발급받아서 사용 */}
                <Route element={<PrivateRoute/>}>
                    <Route element={<MainLayout/>}>
                        {allRoutes.map(item=>{
                            if (item.path.startsWith('/log')) {
                                return (<Route key={item.path} path="/log/:section" element={item.element} />)
                            }

                            return (<Route key={item.path} path={item.path} element={item.element}/>)
                        })}

                        <Route path="/sop/templates/edit/:templateId" element={<SopTemplateEditorPage />} />
                        <Route path="/sop/templates/preview/:templateId" element={<SopTemplatePreviewPage />} />
                        <Route path="/" element={<Navigate to="/manage/user" replace />}/>
                        <Route path="/log" element={<Navigate to="/log/access" replace />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default AppRouter;