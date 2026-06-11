import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import SopTemplatePreview, { parsePreviewStructure } from "@/components/sop/SopTemplatePreview";
import {
  fetchSopTemplate,
  saveSopTemplateStructure,
  sopTemplateKey,
  SOP_TEMPLATES_QUERY_KEY,
} from "@/services/sopService";

const SopTemplateEditorPage = () => {
  const { templateId } = useParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("preview");
  const [jsonText, setJsonText] = useState("");
  const [jsonParseError, setJsonParseError] = useState("");

  const { data: template, isLoading } = useQuery({
    queryKey: sopTemplateKey(templateId),
    queryFn: () => fetchSopTemplate(Number(templateId)),
    enabled: Boolean(templateId),
  });

  useEffect(() => {
    if (!template) return;
    const payload = {
      title: template.title,
      timeoutMinutes: template.timeoutMinutes,
      steps: template.steps ?? [],
      transitions: template.transitions ?? [],
    };
    setJsonText(JSON.stringify(payload, null, 2));
    setJsonParseError("");
  }, [template]);

  const previewStructure = useMemo(
    () => parsePreviewStructure(tab === "json" ? jsonText : null, template),
    [tab, jsonText, template]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      let structure;
      try {
        structure = JSON.parse(jsonText);
        setJsonParseError("");
      } catch {
        setJsonParseError("JSON 형식이 올바르지 않습니다.");
        throw new Error("JSON parse error");
      }
      return saveSopTemplateStructure(Number(templateId), structure);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sopTemplateKey(templateId) });
      queryClient.invalidateQueries({ queryKey: SOP_TEMPLATES_QUERY_KEY });
      setTab("preview");
      window.alert("구조가 저장되었습니다.");
    },
    onError: (err) => {
      if (err?.message !== "JSON parse error") {
        window.alert(err?.response?.data?.message ?? err?.message ?? "저장 실패");
      }
    },
  });

  return (
    <AdminPageTemplate
      title="SOP 템플릿"
      description={`templateId: ${templateId} · revision: ${template?.revision ?? "—"}`}
    >
      <TopBar>
        <NavLinks>
          <Link to="/sop/templates">← 목록</Link>
          <Link to={`/sop/templates/preview/${templateId}`}>전체 화면 미리보기</Link>
        </NavLinks>
        <BtnGroup>
          <button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "저장 중…" : "구조 저장"}
          </button>
        </BtnGroup>
      </TopBar>

      <TabRow>
        <TabBtn type="button" $active={tab === "preview"} onClick={() => setTab("preview")}>
          흐름 미리보기
        </TabBtn>
        <TabBtn type="button" $active={tab === "json"} onClick={() => setTab("json")}>
          JSON 편집
        </TabBtn>
      </TabRow>

      {isLoading ? (
        <p>불러오는 중…</p>
      ) : tab === "preview" ? (
        <SopTemplatePreview structure={previewStructure} parseError={jsonParseError} />
      ) : (
        <>
          <Hint>저장 시 revision이 올라가며, 이미 진행 중인 SOP는 기존 스냅샷을 유지합니다.</Hint>
          {jsonParseError && <ErrorBox>{jsonParseError}</ErrorBox>}
          <JsonArea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />
        </>
      )}
    </AdminPageTemplate>
  );
};

export default SopTemplateEditorPage;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;
const NavLinks = styled.div`
  display: flex;
  gap: 16px;
  a {
    color: #4a6380;
    font-size: 14px;
  }
`;
const BtnGroup = styled.div`
  display: flex;
  gap: 8px;
  button {
    padding: 8px 14px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #fff;
    cursor: pointer;
  }
`;
const TabRow = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
`;
const TabBtn = styled.button`
  padding: 10px 18px;
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  color: ${(p) => (p.$active ? "#1e3a5f" : "#64748b")};
  background: ${(p) => (p.$active ? "#fff" : "transparent")};
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? "#4a6380" : "transparent")};
  margin-bottom: -1px;
  cursor: pointer;
`;
const Hint = styled.p`
  font-size: 12px;
  color: #64748b;
  margin: 0 0 8px;
`;
const JsonArea = styled.textarea`
  width: 100%;
  min-height: 480px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-sizing: border-box;
`;
const ErrorBox = styled.div`
  background: #fef2f2;
  color: #991b1b;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
`;
