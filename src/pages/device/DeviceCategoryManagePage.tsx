import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import CategoryManageForm from "@/components/modal/device/CategoryManageForm";

const DeviceCategoryManagePage = () => {
  return (
    <AdminPageTemplate
      title="장비 카테고리 관리"
      description="대·중·소분류를 추가·삭제하고, 카테고리별 스키마 정의(schema_definition)를 설정합니다."
    >
      <CategoryManageForm />
    </AdminPageTemplate>
  );
};

export default DeviceCategoryManagePage;
