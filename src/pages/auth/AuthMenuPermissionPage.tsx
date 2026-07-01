import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import MenuPermissionByRole from "@/components/auth/MenuPermissionByRole";

const AuthMenuPermissionPage = () => {
  return (
    <AdminPageTemplate
      title="그룹별 시스템메뉴 권한"
      //description="역할(그룹)별로 접근 가능한 시스템을 허용하거나 제한합니다."
    >
      <MenuPermissionByRole />
    </AdminPageTemplate>
  );
};

export default AuthMenuPermissionPage;
