import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import UserGroupManagement from "@/components/auth/UserGroupManagement";

const AuthGroupsPage = () => {
  return (
    <AdminPageTemplate
      title="사용자 그룹 관리"
      description="사용자 그룹을 등록·수정·삭제합니다."
    >
      <UserGroupManagement />
    </AdminPageTemplate>
  );
};

export default AuthGroupsPage;
