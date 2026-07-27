import { showAlert } from "@/utils/dialogBridge";
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Button } from "@/components/ui";
import SopTemplatePreview from "@/components/sop/SopTemplatePreview";
import {
  fetchSopMeta,
  fetchSopTemplate,
  saveSopTemplateBody,
  sopTemplateKey,
  SOP_META_QUERY_KEY,
  SOP_TEMPLATES_QUERY_KEY,
  updateSopTemplate,
  type SopMeta,
  type SopTemplateBody,
} from "@/services/sopService";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const EMPTY_BODY = `{
  "version": 2,
  "steps": []
}`;

const SopTemplateEditorPage = () => {
  const { templateId } = useParams();
  const queryClient = useQueryClient();

  // 메타
  const [meta, setMeta] = useState({
    templateName: "",
    title: "",
    description: "",
    active: true,
  });

  // body 편집기
  const [jsonText, setJsonText] = useState(EMPTY_BODY);
  const [jsonParseError, setJsonParseError] = useState("");

  // "사용 가능한 값" 참조 패널 접기 상태
  const [refOpen, setRefOpen] = useState(false);

  const { data: template, isLoading } = useQuery({
    queryKey: sopTemplateKey(templateId ?? ""),
    queryFn: () => fetchSopTemplate(Number(templateId)),
    enabled: Boolean(templateId),
  });

  // SOP 메타(enum/색 팔레트) — 실패 시 조용히 fallback
  const { data: sopMeta } = useQuery<SopMeta>({
    queryKey: SOP_META_QUERY_KEY,
    queryFn: fetchSopMeta,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!template) return;
    setMeta({
      templateName: template.templateName ?? "",
      title: template.title ?? "",
      description: template.description ?? "",
      active: template.active ?? true,
    });
    const body: SopTemplateBody = template.body ?? {
      version: 2,
      steps: [],
    };
    setJsonText(JSON.stringify(body, null, 2));
    setJsonParseError("");
  }, [template]);

  // JSON 유효할 때만 미리보기 갱신
  const parsedBody = useMemo<SopTemplateBody | null>(() => {
    const txt = jsonText.trim();
    if (!txt) return { version: 2, steps: [] };
    try {
      const parsed = JSON.parse(txt);
      if (!parsed || !Array.isArray(parsed.steps)) {
        return null;
      }
      return parsed as SopTemplateBody;
    } catch {
      return null;
    }
  }, [jsonText]);

  // 파싱 상태 표시
  useEffect(() => {
    const txt = jsonText.trim();
    if (!txt) {
      setJsonParseError("");
      return;
    }
    try {
      const parsed = JSON.parse(txt);
      if (!parsed || !Array.isArray(parsed.steps)) {
        setJsonParseError("최상위에 steps 배열이 필요합니다.");
      } else {
        setJsonParseError("");
      }
    } catch (e) {
      setJsonParseError("JSON 파싱 오류: " + (e as Error).message);
    }
  }, [jsonText]);

  const metaMutation = useMutation({
    mutationFn: () =>
      updateSopTemplate(Number(templateId), {
        templateName: meta.templateName.trim() || undefined,
        title: meta.title.trim() || undefined,
        description: meta.description.trim() || undefined,
        active: meta.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sopTemplateKey(templateId ?? "") });
      queryClient.invalidateQueries({ queryKey: SOP_TEMPLATES_QUERY_KEY });
      showAlert("메타 정보가 저장되었습니다.");
    },
    onError: (err) => showAlert(getApiErrorMessage(err, "메타 저장 실패")),
  });

  const bodyMutation = useMutation({
    mutationFn: async () => {
      let body: SopTemplateBody;
      try {
        body = JSON.parse(jsonText);
      } catch {
        setJsonParseError("JSON 형식이 올바르지 않습니다.");
        throw new Error("JSON parse error");
      }
      if (!body || !Array.isArray(body.steps)) {
        setJsonParseError("최상위에 steps 배열이 필요합니다.");
        throw new Error("body shape error");
      }
      if (body.version == null) body.version = 2;
      return saveSopTemplateBody(Number(templateId), body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sopTemplateKey(templateId ?? "") });
      queryClient.invalidateQueries({ queryKey: SOP_TEMPLATES_QUERY_KEY });
      showAlert("body(steps)가 저장되었습니다.");
    },
    onError: (err) => {
      const msg = (err as Error)?.message;
      if (msg !== "JSON parse error" && msg !== "body shape error") {
        showAlert(getApiErrorMessage(err, "저장 실패"));
      }
    },
  });

  return (
    <AdminPageTemplate
      title="SOP 템플릿 편집 (v2)"
      description={`templateId: ${templateId} · 코드: ${
        template?.templateCode ?? "—"
      } · revision: ${template?.revision ?? "—"}`}
    >
      <TopBar>
        <NavLinks>
          <Link to="/sop/templates">← 목록</Link>
          <Link to={`/sop/templates/preview/${templateId}`}>
            전체 화면 미리보기
          </Link>
        </NavLinks>
      </TopBar>

      {isLoading ? (
        <p>불러오는 중…</p>
      ) : (
        <>
          {/* (a) 메타 수정 */}
          <MetaCard>
            <MetaHead>메타 정보</MetaHead>
            <MetaGrid>
              <MetaField>
                <label>templateName</label>
                <input
                  value={meta.templateName}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, templateName: e.target.value }))
                  }
                />
              </MetaField>
              <MetaField>
                <label>title (SOP 이벤트명)</label>
                <input
                  value={meta.title}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, title: e.target.value }))
                  }
                />
              </MetaField>
              <MetaField className="wide">
                <label>description</label>
                <input
                  value={meta.description}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, description: e.target.value }))
                  }
                />
              </MetaField>
              <MetaField className="checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={meta.active}
                    onChange={(e) =>
                      setMeta((m) => ({ ...m, active: e.target.checked }))
                    }
                  />
                  active
                </label>
              </MetaField>
            </MetaGrid>
            <MetaActions>
              <Button
                variant="secondary"
                onClick={() => metaMutation.mutate()}
                disabled={metaMutation.isPending}
              >
                {metaMutation.isPending ? "저장 중…" : "메타 저장"}
              </Button>
            </MetaActions>
          </MetaCard>

          {/* (b) body 편집기 + (c) 미리보기 좌우 2단 */}
          <SplitHead>
            <span>body 편집 (steps JSON)</span>
            <Button
              variant="primary"
              onClick={() => bodyMutation.mutate()}
              disabled={bodyMutation.isPending || Boolean(jsonParseError)}
            >
              {bodyMutation.isPending ? "저장 중…" : "body 저장"}
            </Button>
          </SplitHead>
          <Split>
            <EditorPane>
              {jsonParseError ? (
                <ErrorBox>{jsonParseError}</ErrorBox>
              ) : (
                <OkBox>JSON 유효 · 미리보기 실시간 반영 중</OkBox>
              )}
              <JsonArea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                spellCheck={false}
                $error={Boolean(jsonParseError)}
              />
              {sopMeta && (
                <RefPanel>
                  <RefHead
                    type="button"
                    onClick={() => setRefOpen((v) => !v)}
                    aria-expanded={refOpen}
                  >
                    <span>사용 가능한 값 (서버 기준)</span>
                    <span>{refOpen ? "▲" : "▼"}</span>
                  </RefHead>
                  {refOpen && (
                    <RefBody>
                      <RefRow>
                        <RefKey>componentType</RefKey>
                        <RefVals>
                          {Object.entries(sopMeta.componentType).map(
                            ([v, desc]) => (
                              <RefTag key={v}>
                                {v} <RefDesc>— {desc}</RefDesc>
                              </RefTag>
                            )
                          )}
                        </RefVals>
                      </RefRow>
                      <RefRow>
                        <RefKey>actionKind</RefKey>
                        <RefVals>
                          {Object.entries(sopMeta.actionKind).map(
                            ([v, desc]) => (
                              <RefTag key={v}>
                                {v} <RefDesc>— {desc}</RefDesc>
                              </RefTag>
                            )
                          )}
                        </RefVals>
                      </RefRow>
                      <RefRow>
                        <RefKey>variant</RefKey>
                        <RefVals>
                          {Object.entries(sopMeta.variant).map(([v, hex]) => (
                            <RefTag key={v}>
                              <Swatch style={{ background: hex }} />
                              {v} <RefDesc>— {hex}</RefDesc>
                            </RefTag>
                          ))}
                        </RefVals>
                      </RefRow>
                      <RefRow>
                        <RefKey>stepState</RefKey>
                        <RefVals>
                          {Object.entries(sopMeta.stepState).map(
                            ([v, desc]) => (
                              <RefTag key={v}>
                                {v} <RefDesc>— {desc}</RefDesc>
                              </RefTag>
                            )
                          )}
                        </RefVals>
                      </RefRow>
                      <RefRow>
                        <RefKey>completionState</RefKey>
                        <RefVals>
                          {Object.entries(sopMeta.completionState).map(
                            ([v, desc]) => (
                              <RefTag key={v}>
                                {v} <RefDesc>— {desc}</RefDesc>
                              </RefTag>
                            )
                          )}
                        </RefVals>
                      </RefRow>
                    </RefBody>
                  )}
                </RefPanel>
              )}
            </EditorPane>
            <PreviewPane>
              <SopTemplatePreview
                body={parsedBody}
                parseError={jsonParseError || null}
                eventName={meta.title || template?.templateName}
                variantColors={sopMeta?.variant}
              />
            </PreviewPane>
          </Split>
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

const MetaCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
`;
const MetaHead = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1e3a5f;
  margin-bottom: 12px;
`;
const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  .wide {
    grid-column: 1 / -1;
  }
  .checkbox label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
`;
const MetaField = styled.div`
  label {
    display: block;
    font-size: 12px;
    color: #64748b;
    margin-bottom: 4px;
  }
  input[type="text"],
  input:not([type]) {
    width: 100%;
    padding: 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    box-sizing: border-box;
  }
`;
const MetaActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
`;

const SplitHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1e3a5f;
`;
const Split = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;
const EditorPane = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;
const PreviewPane = styled.div`
  min-width: 0;
`;
const JsonArea = styled.textarea<{ $error?: boolean }>`
  width: 100%;
  min-height: 520px;
  font-family: "Cascadia Code", ui-monospace, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.55;
  tab-size: 2;
  padding: 12px;
  border: 1px solid ${(p) => (p.$error ? "#d83b3b" : "#d1d5db")};
  border-radius: 8px;
  box-sizing: border-box;
  white-space: pre;
  resize: vertical;
`;
const ErrorBox = styled.div`
  background: #fef2f2;
  color: #991b1b;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 12px;
`;
const OkBox = styled.div`
  background: #f0fdf4;
  color: #166534;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 12px;
`;

const RefPanel = styled.div`
  margin-top: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
`;
const RefHead = styled.button`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  border: 0;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #1e3a5f;
  cursor: pointer;
  &:hover {
    background: #f1f5f9;
  }
`;
const RefBody = styled.div`
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #e5e7eb;
`;
const RefRow = styled.div`
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 8px;
  align-items: start;
`;
const RefKey = styled.div`
  font-size: 11.5px;
  font-weight: 600;
  color: #64748b;
  font-family: "Cascadia Code", ui-monospace, Consolas, monospace;
`;
const RefVals = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;
const RefTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-family: "Cascadia Code", ui-monospace, Consolas, monospace;
  color: #334155;
  background: #eef2f7;
  border: 1px solid #dbe3ec;
  border-radius: 4px;
  padding: 1px 6px;
`;
const RefDesc = styled.span`
  color: #64748b;
  font-family: system-ui, sans-serif;
`;
const Swatch = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.15);
`;
