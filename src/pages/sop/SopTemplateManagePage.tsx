import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import SopTemplateCreateForm from "@/components/modal/sop/SopTemplateCreateForm";
import { useModal } from "@/contexts/ModalContext";
import { fetchSopTemplates, SOP_TEMPLATES_QUERY_KEY } from "@/services/sopService";

const SopTemplateManagePage = () => {
  const { openModal, closeModal } = useModal();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: SOP_TEMPLATES_QUERY_KEY,
    queryFn: () => fetchSopTemplates(false),
  });

  const openCreateModal = () => {
    openModal({
      title: "새 SOP 템플릿",
      hideFooter: true,
      wide: true,
      content: (
        <SopTemplateCreateForm
          onClose={closeModal}
          onCreated={(created) => {
            if (created?.templateId) {
              window.location.href = `/admin/sop/templates/edit/${created.templateId}`;
            }
          }}
        />
      ),
    });
  };

  return (
    <AdminPageTemplate
      title="SOP 템플릿 관리"
      description="디지털 SOP 템플릿을 등록·수정합니다. 저장 즉시 반영되며, 진행 중인 SOP는 발생 시점 스냅샷을 유지합니다."
    >
      <Toolbar>
        <PrimaryBtn type="button" onClick={openCreateModal}>
          + 템플릿 생성
        </PrimaryBtn>
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
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6}>불러오는 중…</td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={6}>등록된 템플릿이 없습니다. (서버 기동 시 FIRE_DETECT 샘플 자동 등록)</td>
              </tr>
            ) : (
              templates.map((t) => (
                <tr key={t.templateId}>
                  <td>{t.templateId}</td>
                  <td>
                    <code>{t.templateCode}</code>
                  </td>
                  <td>{t.templateName}</td>
                  <td>{t.title ?? "—"}</td>
                  <td>{t.revision ?? "—"}</td>
                  <td>
                    <Link to={`/sop/templates/edit/${t.templateId}`}>편집</Link>
                    {" · "}
                    <Link to={`/sop/templates/preview/${t.templateId}`}>미리보기</Link>
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
const PrimaryBtn = styled.button`
  padding: 8px 16px;
  background: #4a6380;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
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
  }
`;
