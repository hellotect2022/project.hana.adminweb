import { showAlert } from "@/utils/dialogBridge";
import { useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import UnityAssetManageForm from "@/components/modal/unityAsset/UnityAssetManageForm";
import { useModal } from "@/contexts/ModalContext";
import {
  createUnityAssetAPI,
  deleteUnityAssetAPI,
  fetchUnityAssetsList,
  UNITY_ASSET_LIST_QUERY_KEY,
  updateUnityAssetAPI,
} from "@/services/unityAssetService";
import { ASSET_TYPES, assetTypeLabel } from "@/constants/assetType";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import {
  Button,
  Input,
  Select,
  Badge,
  Toolbar,
  FilterGroup,
  FilterLabel,
} from "@/components/ui";

/** 장비 에셋 관리 탭 */
const AssetManageTab = () => {
  const { openModal, closeModal } = useModal();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchField, setSearchField] = useState("assetName");
  const [keywordInput, setKeywordInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const {
    data: assets = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: UNITY_ASSET_LIST_QUERY_KEY,
    queryFn: () => fetchUnityAssetsList(),
  });

  const { mutate: createAsset } = useMutation({
    mutationFn: createUnityAssetAPI,
    onSuccess: (res) => {
      if (res?.success === false) {
        showAlert(res?.message || "등록에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: UNITY_ASSET_LIST_QUERY_KEY });
      closeModal();
    },
    onError: (err) => {
      showAlert(getApiErrorMessage(err, "등록 중 오류가 발생했습니다."));
    },
  });

  const { mutate: updateAsset } = useMutation({
    mutationFn: updateUnityAssetAPI,
    onSuccess: (res) => {
      if (res?.success === false) {
        showAlert(res?.message || "수정에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: UNITY_ASSET_LIST_QUERY_KEY });
      closeModal();
    },
    onError: (err) => {
      showAlert(getApiErrorMessage(err, "수정 중 오류가 발생했습니다."));
    },
  });

  const { mutate: deleteAsset } = useMutation({
    mutationFn: deleteUnityAssetAPI,
    onSuccess: (res) => {
      if (res?.success === false) {
        showAlert(res?.message || "삭제에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: UNITY_ASSET_LIST_QUERY_KEY });
      closeModal();
    },
    onError: (err) => {
      showAlert(getApiErrorMessage(err, "삭제 중 오류가 발생했습니다."));
    },
  });

  const handleSearchClick = () => {
    setSearchKeyword(keywordInput.trim());
  };

  const filtered = useMemo(() => {
    const k = searchKeyword.toLowerCase();
    return assets.filter((row) => {
      if (typeFilter !== "ALL" && row.assetType !== typeFilter) return false;
      if (!k) return true;
      if (searchField === "assetName") {
        return row.assetName?.toLowerCase().includes(k);
      }
      return (row.description || "").toLowerCase().includes(k);
    });
  }, [assets, typeFilter, searchField, searchKeyword]);

  const isDuplicateName = (name, excludeId = null) =>
    assets.some(
      (a) =>
        a.assetName?.toLowerCase() === name.toLowerCase() &&
        (excludeId == null || a.assetId !== excludeId)
    );

  const openRegisterModal = () => {
    openModal({
      title: "장비 에셋 등록",
      hideFooter: true,
      wide: true,
      content: (
        <UnityAssetManageForm
          mode="create"
          onCancel={closeModal}
          onSubmit={(payload) => {
            if (isDuplicateName(payload.assetName)) {
              showAlert("이미 같은 asset_name이 있습니다.");
              return;
            }
            createAsset(payload);
          }}
        />
      ),
    });
  };

  const openEditModal = (row) => {
    openModal({
      title: "장비 에셋 수정",
      hideFooter: true,
      wide: true,
      content: (
        <UnityAssetManageForm
          mode="edit"
          initial={row}
          onCancel={closeModal}
          onSubmit={(payload) => {
            if (isDuplicateName(payload.assetName, payload.assetId)) {
              showAlert("이미 같은 asset_name이 있습니다.");
              return;
            }
            updateAsset(payload);
          }}
        />
      ),
    });
  };

  const openDeleteModal = (row) => {
    openModal({
      title: "장비 에셋 삭제 확인",
      content: (
        <DeleteMessage>
          에셋 <strong>{row.assetName}</strong> 을(를) 삭제할까요?
          <br />
          <SmallText>연결된 장비가 있으면 서버에서 삭제가 거절됩니다.</SmallText>
        </DeleteMessage>
      ),
      onConfirm: () => deleteAsset(row.assetId),
    });
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <>
      <Toolbar>
        <FilterGroup>
          <FilterLabel>에셋 타입</FilterLabel>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="ALL">전체</option>
            {ASSET_TYPES.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select value={searchField} onChange={(e) => setSearchField(e.target.value)}>
            <option value="assetName">에셋 이름</option>
            <option value="description">설명</option>
          </Select>
          <Input
            placeholder="검색어 입력"
            style={{ width: "min(100%, 260px)" }}
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
          />
          <Button variant="secondary" onClick={handleSearchClick}>
            검색
          </Button>
        </FilterGroup>
        <Button variant="primary" onClick={openRegisterModal}>
          + 장비 에셋 등록
        </Button>
      </Toolbar>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th style={{ width: 70 }}>번호</Th>
              <Th>asset_name</Th>
              <Th $center style={{ width: 110 }}>타입</Th>
              <Th>설명</Th>
              <Th $center style={{ width: 80 }}>활성</Th>
              <Th style={{ width: 150 }}>수정일</Th>
              <Th $center style={{ width: 140 }}>관리</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <Td colSpan={7} $center>
                  불러오는 중…
                </Td>
              </tr>
            ) : isError ? (
              <tr>
                <Td colSpan={7} $center>
                  {error?.message ?? "목록을 불러오지 못했습니다."}
                </Td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <Td colSpan={7} $center>
                  {searchKeyword ? "검색 결과가 없습니다." : "등록된 장비 에셋이 없습니다."}
                </Td>
              </tr>
            ) : (
              filtered.map((row, idx) => (
                <tr key={row.assetId}>
                  <Td>{idx + 1}</Td>
                  <Td>
                    <AssetNameCell>{row.assetName}</AssetNameCell>
                  </Td>
                  <Td $center>
                    <Badge tone="info">{row.assetTypeLabel || assetTypeLabel(row.assetType)}</Badge>
                  </Td>
                  <Td>{row.description || "—"}</Td>
                  <Td $center>
                    <Badge tone={row.active !== false ? "success" : "danger"}>
                      {row.active !== false ? "활성" : "비활성"}
                    </Badge>
                  </Td>
                  <Td>{formatDate(row.updatedAt || row.createdAt)}</Td>
                  <Td $center>
                    <BtnGroup>
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(row)}>
                        수정
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => openDeleteModal(row)}>
                        삭제
                      </Button>
                    </BtnGroup>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>
    </>
  );
};

export default AssetManageTab;

const DeleteMessage = styled.div`
  text-align: left;
  line-height: 1.6;
  color: #374151;
`;

const SmallText = styled.span`
  display: block;
  margin-top: 10px;
  font-size: 12px;
  color: #6b7280;
`;

const TableWrap = styled.div`
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`;

const Th = styled.th<{ $center?: boolean }>`
  padding: 12px 16px;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  font-weight: 700;
  color: #111827;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

const Td = styled.td<{ $center?: boolean }>`
  padding: 11px 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #111827;
  text-align: ${(p) => (p.$center ? "center" : "left")};
`;

const AssetNameCell = styled.span`
  font-weight: 600;
  color: #1e3a5f;
`;

const BtnGroup = styled.div`
  display: flex;
  gap: 6px;
  justify-content: center;
`;
