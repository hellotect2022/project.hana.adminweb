import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import MenuDisplaySettings from "@/components/menu/MenuDisplaySettings";

const MenuDisplayPage = () => {
  return (
    <AdminPageTemplate
      title="BMS 시스템 표시 설정"
      description="BMS 시스템을 등록하고 소분류 카테고리와 매핑한 뒤, 목록에서 표시 순서를 조정할 수 있습니다."
    >
      <MenuDisplaySettings />
    </AdminPageTemplate>
  );
};

export default MenuDisplayPage;
