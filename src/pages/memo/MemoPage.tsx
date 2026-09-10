import { showAlert, showConfirm } from "@/utils/dialogBridge";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import Pagination from "@/components/common/Pagination";
import { Button } from "@/components/ui";
import {
  MEMO_QUERY_KEY,
  createMemoAPI,
  deleteMemoAPI,
  fetchMemosAPI,
  updateMemoAPI,
} from "@/services/memoService";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const PAGE_SIZE = 20;

/** 목록에 보일 일시 — "2026-09-08 14:22" */
const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

/**
 * 운영 메모 — 임시 기록용 메모장.
 *
 * 좌측에서 메모를 고르고 우측에서 편집한다. 저장하지 않은 변경이 있으면
 * 다른 메모로 이동하기 전에 확인을 받는다.
 */
const MemoPage = () => {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");

  /** 편집 중인 메모 id. null 이면 신규 작성 상태 */
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  /** 편집기에 로드된 원본 — 변경 여부 판정용 */
  const [loaded, setLoaded] = useState({ title: "", content: "" });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...MEMO_QUERY_KEY, page, keyword],
    queryFn: () => fetchMemosAPI({ page, size: PAGE_SIZE, keyword }),
  });

  const memos = data?.content ?? [];
  const pagination = data?.page;

  const isDirty = title !== loaded.title || content !== loaded.content;

  // 목록이 갱신됐는데 편집 중이던 메모가 사라졌다면(삭제 등) 신규 작성 상태로 되돌린다.
  useEffect(() => {
    if (selectedId == null) return;
    if (isLoading) return;
    if (!memos.some((m) => m.memoId === selectedId)) {
      resetEditor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memos, isLoading]);

  const resetEditor = () => {
    setSelectedId(null);
    setTitle("");
    setContent("");
    setLoaded({ title: "", content: "" });
  };

  const openMemo = async (memo) => {
    if (isDirty) {
      const ok = await showConfirm("저장하지 않은 변경이 있습니다. 버리고 이동할까요?");
      if (!ok) return;
    }
    setSelectedId(memo.memoId);
    setTitle(memo.title ?? "");
    setContent(memo.content ?? "");
    setLoaded({ title: memo.title ?? "", content: memo.content ?? "" });
  };

  const startNew = async () => {
    if (isDirty) {
      const ok = await showConfirm("저장하지 않은 변경이 있습니다. 버리고 새로 작성할까요?");
      if (!ok) return;
    }
    resetEditor();
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: MEMO_QUERY_KEY });

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: () => {
      const body = { title: title.trim(), content };
      return selectedId == null
        ? createMemoAPI(body)
        : updateMemoAPI(selectedId, body);
    },
    onSuccess: (res) => {
      const saved = res?.data;
      if (saved?.memoId != null) {
        setSelectedId(saved.memoId);
        setLoaded({ title: saved.title ?? "", content: saved.content ?? "" });
        setTitle(saved.title ?? "");
        setContent(saved.content ?? "");
      }
      invalidate();
      showAlert(res?.message || "저장되었습니다.");
    },
    onError: (e) => showAlert(getApiErrorMessage(e, "저장에 실패했습니다.")),
  });

  const { mutate: remove, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteMemoAPI(selectedId),
    onSuccess: (res) => {
      resetEditor();
      invalidate();
      showAlert(res?.message || "삭제되었습니다.");
    },
    onError: (e) => showAlert(getApiErrorMessage(e, "삭제에 실패했습니다.")),
  });

  const handleSave = () => {
    if (!title.trim()) {
      showAlert("제목을 입력하세요.");
      return;
    }
    save();
  };

  const handleDelete = async () => {
    if (selectedId == null) return;
    const ok = await showConfirm("이 메모를 삭제할까요? 되돌릴 수 없습니다.");
    if (ok) remove();
  };

  const handleSearch = () => {
    setKeyword(keywordInput.trim());
    setPage(0);
  };

  return (
    <AdminPageTemplate
      title="메모"
      description="임시 기록용 메모장입니다. 제목과 내용을 남기고 언제든 수정·삭제할 수 있습니다."
    >
      <Layout>
        {/* ── 좌측: 목록 ── */}
        <ListPane>
          <ListHeader>
            <SearchInput
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="제목·내용 검색"
            />
            <Button size="sm" onClick={handleSearch}>
              검색
            </Button>
          </ListHeader>

          <NewButtonRow>
            <Button variant="primary" size="sm" onClick={startNew} style={{ width: "100%" }}>
              + 새 메모
            </Button>
          </NewButtonRow>

          <ListBody>
            {isLoading ? (
              <EmptyText>불러오는 중…</EmptyText>
            ) : isError ? (
              <EmptyText>{getApiErrorMessage(error, "목록을 불러오지 못했습니다.")}</EmptyText>
            ) : memos.length === 0 ? (
              <EmptyText>{keyword ? "검색 결과가 없습니다." : "메모가 없습니다."}</EmptyText>
            ) : (
              memos.map((memo) => (
                <ListItem
                  key={memo.memoId}
                  $active={memo.memoId === selectedId}
                  onClick={() => openMemo(memo)}
                >
                  <ItemTitle>{memo.title}</ItemTitle>
                  <ItemPreview>
                    {(memo.content ?? "").replace(/\s+/g, " ").slice(0, 60) || "내용 없음"}
                  </ItemPreview>
                  <ItemDate>{formatDateTime(memo.updatedAt)}</ItemDate>
                </ListItem>
              ))
            )}
          </ListBody>

          {pagination && pagination.totalPages > 1 && (
            <Pagination data={pagination} onPageChange={setPage} showSummary={false} />
          )}
        </ListPane>

        {/* ── 우측: 편집기 ── */}
        <EditorPane>
          <EditorHeader>
            <EditorMode>
              {selectedId == null ? "새 메모" : `메모 #${selectedId}`}
              {isDirty && <DirtyBadge>수정됨</DirtyBadge>}
            </EditorMode>
            <EditorActions>
              {selectedId != null && (
                <Button variant="danger" size="sm" onClick={handleDelete} disabled={isDeleting}>
                  삭제
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
              >
                {isSaving ? "저장 중…" : "저장"}
              </Button>
            </EditorActions>
          </EditorHeader>

          <TitleInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            maxLength={200}
          />

          <ContentArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요."
            spellCheck={false}
          />

          <EditorFooter>
            {selectedId != null && (
              <MetaText>
                작성 {formatDateTime(memos.find((m) => m.memoId === selectedId)?.createdAt)} · 수정{" "}
                {formatDateTime(memos.find((m) => m.memoId === selectedId)?.updatedAt)}
              </MetaText>
            )}
            <CharCount>{content.length.toLocaleString()}자</CharCount>
          </EditorFooter>
        </EditorPane>
      </Layout>
    </AdminPageTemplate>
  );
};

export default MemoPage;

/* ─────────────────────────────────────────── */

const Layout = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  min-height: 560px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const ListPane = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px;
  background: #fafbfc;
`;

const ListHeader = styled.div`
  display: flex;
  gap: 6px;
`;

const NewButtonRow = styled.div`
  display: flex;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #d0d3d8;
  border-radius: 4px;
  font-size: 13px;
`;

const ListBody = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 520px;
`;

const ListItem = styled.button<{ $active?: boolean }>`
  text-align: left;
  border: 1px solid ${(p) => (p.$active ? "#2563eb" : "#e5e7eb")};
  background: ${(p) => (p.$active ? "#eff6ff" : "#fff")};
  border-radius: 5px;
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;

  &:hover {
    border-color: #93c5fd;
  }
`;

const ItemTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ItemPreview = styled.span`
  font-size: 11px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ItemDate = styled.span`
  font-size: 11px;
  color: #9ca3af;
`;

const EmptyText = styled.div`
  padding: 24px 8px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
`;

const EditorPane = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 14px;
  background: #fff;
`;

const EditorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const EditorMode = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
`;

const DirtyBadge = styled.span`
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: #fef3c7;
  color: #92400e;
`;

const EditorActions = styled.div`
  display: flex;
  gap: 6px;
`;

const TitleInput = styled.input`
  height: 38px;
  padding: 0 10px;
  border: 1px solid #d0d3d8;
  border-radius: 4px;
  font-size: 15px;
  font-weight: 600;
`;

const ContentArea = styled.textarea`
  flex: 1;
  min-height: 400px;
  padding: 10px;
  border: 1px solid #d0d3d8;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.7;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  resize: vertical;
`;

const EditorFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const MetaText = styled.span`
  font-size: 11px;
  color: #9ca3af;
`;

const CharCount = styled.span`
  margin-left: auto;
  font-size: 11px;
  color: #9ca3af;
`;
