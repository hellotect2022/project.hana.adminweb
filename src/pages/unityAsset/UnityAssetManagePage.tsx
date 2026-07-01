import { useState } from "react";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Tab, TabBar } from "@/components/ui";
import AssetManageTab from "./AssetManageTab";
import ColliderManageTab from "./ColliderManageTab";

const TABS = [
  { key: "asset", label: "장비 에셋" },
  { key: "collider", label: "콜라이더(Collider)" },
];

const UnityAssetManagePage = () => {
  const [activeTab, setActiveTab] = useState("asset");

  const description =
    activeTab === "asset"
      ? "장비 에셋(asset_name·타입) 정보를 조회·등록·수정·삭제합니다."
      : "콜라이더(존) 정보를 층별로 조회하고 등록·수정합니다. (mesh_name 중복 검사)";

  return (
    <AdminPageTemplate title="장비 에셋 관리" description={description}>
      <TabBar>
        {TABS.map((tab) => (
          <Tab
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Tab>
        ))}
      </TabBar>

      {activeTab === "asset" ? <AssetManageTab /> : <ColliderManageTab />}
    </AdminPageTemplate>
  );
};

export default UnityAssetManagePage;
