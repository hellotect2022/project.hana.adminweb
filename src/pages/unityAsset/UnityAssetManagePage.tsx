import { useState } from "react";
import styled from "styled-components";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import AssetManageTab from "./AssetManageTab";
import ColliderManageTab from "./ColliderManageTab";

const TABS = [
  { key: "asset", label: "3D Asset" },
  { key: "collider", label: "콜라이더(Collider)" },
];

const UnityAssetManagePage = () => {
  const [activeTab, setActiveTab] = useState("asset");

  const description =
    activeTab === "asset"
      ? "Unity 3D 에셋(asset_name) 정보를 조회·등록·수정·삭제합니다."
      : "콜라이더(존) 정보를 층별로 조회하고 등록·수정합니다. (mesh_name 중복 검사)";

  return (
    <AdminPageTemplate title="Unity Asset 관리" description={description}>
      <TabBar>
        {TABS.map((tab) => (
          <TabButton
            key={tab.key}
            type="button"
            $active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </TabButton>
        ))}
      </TabBar>

      {activeTab === "asset" ? <AssetManageTab /> : <ColliderManageTab />}
    </AdminPageTemplate>
  );
};

export default UnityAssetManagePage;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
`;

const TabButton = styled.button`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: ${(p) => (p.$active ? "#2563eb" : "#6b7280")};
  background: none;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? "#2563eb" : "transparent")};
  margin-bottom: -1px;
  cursor: pointer;
  &:hover {
    color: #2563eb;
  }
`;
