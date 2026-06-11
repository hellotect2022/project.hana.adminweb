import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import SopTemplatePreview, { parsePreviewStructure } from "@/components/sop/SopTemplatePreview";
import { fetchSopTemplate, sopTemplateKey } from "@/services/sopService";

const SopTemplatePreviewPage = () => {
  const { templateId } = useParams();

  const { data: template, isLoading, isError, error } = useQuery({
    queryKey: sopTemplateKey(templateId),
    queryFn: () => fetchSopTemplate(Number(templateId)),
    enabled: Boolean(templateId),
  });

  const structure = parsePreviewStructure(null, template);

  return (
    <AdminPageTemplate
      title="SOP 템플릿 미리보기"
      description={
        template
          ? `${template.title} · revision ${template.revision}`
          : `templateId: ${templateId}`
      }
    >
      <TopBar>
        <Link to="/sop/templates">← 목록</Link>
        <Link to={`/sop/templates/edit/${templateId}`}>JSON 편집</Link>
      </TopBar>

      {isLoading && <p>불러오는 중…</p>}
      {isError && <ErrorBox>{error?.message ?? "조회 실패"}</ErrorBox>}
      {!isLoading && !isError && <SopTemplatePreview structure={structure} />}
    </AdminPageTemplate>
  );
};

export default SopTemplatePreviewPage;

const TopBar = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  a {
    color: #4a6380;
    font-size: 14px;
  }
`;

const ErrorBox = styled.div`
  padding: 12px;
  background: #fef2f2;
  color: #991b1b;
  border-radius: 8px;
`;
