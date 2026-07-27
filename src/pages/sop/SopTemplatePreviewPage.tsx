import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import SopTemplatePreview from "@/components/sop/SopTemplatePreview";
import {
  fetchSopMeta,
  fetchSopTemplate,
  sopTemplateKey,
  SOP_META_QUERY_KEY,
  type SopMeta,
  type SopTemplateBody,
} from "@/services/sopService";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const SopTemplatePreviewPage = () => {
  const { templateId } = useParams();

  const {
    data: template,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: sopTemplateKey(templateId ?? ""),
    queryFn: () => fetchSopTemplate(Number(templateId)),
    enabled: Boolean(templateId),
  });

  // SOP 메타(색 팔레트) — 실패 시 조용히 fallback
  const { data: sopMeta } = useQuery<SopMeta>({
    queryKey: SOP_META_QUERY_KEY,
    queryFn: fetchSopMeta,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const body: SopTemplateBody | null =
    template?.body ?? { version: 2, steps: [] };

  return (
    <AdminPageTemplate
      title="SOP 템플릿 미리보기 (v2)"
      description={
        template
          ? `${template.templateName} · ${template.title ?? "—"} · revision ${
              template.revision ?? "—"
            }`
          : `templateId: ${templateId}`
      }
    >
      <TopBar>
        <Link to="/sop/templates">← 목록</Link>
        <Link to={`/sop/templates/edit/${templateId}`}>body 편집</Link>
      </TopBar>

      {isLoading && <p>불러오는 중…</p>}
      {isError && <ErrorBox>{getApiErrorMessage(error, "조회 실패")}</ErrorBox>}
      {!isLoading && !isError && (
        <SopTemplatePreview
          body={body}
          eventName={template?.title || template?.templateName}
          variantColors={sopMeta?.variant}
        />
      )}
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
