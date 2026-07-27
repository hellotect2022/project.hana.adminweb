import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import MenuDisplaySettings from "@/components/menu/MenuDisplaySettings";

const MenuDisplayPage = () => {
  return (
    <AdminPageTemplate
      title="시스템 표시 설정"
      description="시스템 → 서브시스템 → 소분류 카테고리의 3단 구조로 등록하고, 각 단계의 표시 순서를 조정할 수 있습니다."
    >
      <MenuDisplaySettings />
    </AdminPageTemplate>
  );
};

export default MenuDisplayPage;
