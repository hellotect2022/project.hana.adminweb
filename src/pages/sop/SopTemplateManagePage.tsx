import { showAlert, showConfirm } from "@/utils/dialogBridge";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Button, Badge } from "@/components/ui";
import SopTemplateCreateForm from "@/components/modal/sop/SopTemplateCreateForm";
import { useModal } from "@/contexts/ModalContext";
import {
  deleteSopTemplate,
  fetchSopTemplates,
  SOP_TEMPLATES_QUERY_KEY,
  type SopTemplateSummary,
} from "@/services/sopService";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const SopTemplateManagePage = () => {
  const { openModal, closeModal } = useModal();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: SOP_TEMPLATES_QUERY_KEY,
    queryFn: () => fetchSopTemplates(false),
  });

  const deactivateMutation = useMutation({
    mutationFn: (templateId: number) => deleteSopTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOP_TEMPLATES_QUERY_KEY });
    },
    onError: (err) => showAlert(getApiErrorMessage(err, "비활성화 실패")),
  });

  const openCreateModal = () => {
    openModal({
      title: "새 SOP 템플릿",
      hideFooter: true,
      wide: true,
      content: (
        <SopTemplateCreateForm
          onClose={closeModal}
          onCreated={(created: SopTemplateSummary) => {
            if (created?.templateId != null) {
              navigate(`/sop/templates/edit/${created.templateId}`);
            }
          }}
        />
      ),
    });
  };

  const handleDeactivate = async (t: SopTemplateSummary) => {
    const ok = await showConfirm(
      `'${t.templateName}' 템플릿을 비활성화(soft delete) 하시겠습니까?`
    );
    if (ok) {
      deactivateMutation.mutate(t.templateId);
    }
  };

  return (
    <AdminPageTemplate
      title="SOP 템플릿 관리"
      description="디지털 SOP 템플릿(v2 SDUI)을 등록·수정합니다. 저장 즉시 반영되며, Unity가 body(JSON)를 자기 UI로 렌더합니다."
    >
      <Toolbar>
        <Button variant="primary" onClick={openCreateModal}>
          + 템플릿 생성
        </Button>
      </Toolbar>

      <TableWrap>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>코드</th>
              <th>이름</th>
              <th>SOP 제목</th>
              <th>revision</th>
              <th>상태</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7}>불러오는 중…</td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={7}>등록된 템플릿이 없습니다.</td>
              </tr>
            ) : (
              templates.map((t) => (
                <tr key={t.templateId} className={t.active ? "" : "inactive"}>
                  <td>{t.templateId}</td>
                  <td>
                    <RowLink to={`/sop/templates/edit/${t.templateId}`}>
                      <code>{t.templateCode}</code>
                    </RowLink>
                  </td>
                  <td>{t.templateName}</td>
                  <td>{t.title ?? "—"}</td>
                  <td>{t.revision ?? "—"}</td>
                  <td>
                    {t.active ? (
                      <Badge tone="success">활성</Badge>
                    ) : (
                      <Badge tone="neutral">비활성</Badge>
                    )}
                  </td>
                  <td>
                    <ActionCell>
                      <Link to={`/sop/templates/edit/${t.templateId}`}>편집</Link>
                      <span>·</span>
                      <Link to={`/sop/templates/preview/${t.templateId}`}>
                        미리보기
                      </Link>
                      {t.active && (
                        <>
                          <span>·</span>
                          <DangerBtn
                            type="button"
                            onClick={() => handleDeactivate(t)}
                            disabled={deactivateMutation.isPending}
                          >
                            비활성화
                          </DangerBtn>
                        </>
                      )}
                    </ActionCell>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>
    </AdminPageTemplate>
  );
};

export default SopTemplateManagePage;

const Toolbar = styled.div`
  margin-bottom: 16px;
`;
const TableWrap = styled.div`
  overflow-x: auto;
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    th,
    td {
      border-bottom: 1px solid #e5e7eb;
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background: #f9fafb;
    }
    tr.inactive td {
      color: #94a3b8;
    }
  }
`;
const RowLink = styled(Link)`
  color: inherit;
  text-decoration: none;
  &:hover code {
    text-decoration: underline;
  }
`;
const ActionCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  a {
    color: #4a6380;
  }
  span {
    color: #cbd5e1;
  }
`;
const DangerBtn = styled.button`
  background: none;
  border: none;
  color: #d83b3b;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
