import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import styled from "styled-components";

/**
 * API 미연동·미구현 메뉴 — 직접 URL 접근 시 안내
 */
const DisabledMenuPlaceholder = ({ title, description, reason }) => {
  return (
    <AdminPageTemplate title={title} description={description}>
      <Notice>
        <NoticeTitle>현재 사용할 수 없는 메뉴입니다</NoticeTitle>
        <NoticeText>{reason}</NoticeText>
      </Notice>
    </AdminPageTemplate>
  );
};

const Notice = styled.div`
  padding: 24px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
`;

const NoticeTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
`;

const NoticeText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #64748b;
`;

export default DisabledMenuPlaceholder;
