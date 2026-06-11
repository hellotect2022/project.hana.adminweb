import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import DeviceRegistForm from "@/components/modal/device/DeviceRegistForm";

const DeviceRegistPage = () => {
  return (
    <AdminPageTemplate
      title="장비 등록"
      description="대·중·소 분류를 선택한 뒤 장비 이름과 자동 생성된 deviceKey로 장비를 등록합니다."
    >
      <DeviceRegistForm />
    </AdminPageTemplate>
  );
};

export default DeviceRegistPage;
