import { useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import UnityAssetManageForm from "@/components/modal/unityAsset/UnityAssetManageForm";
import { useModal } from "@/contexts/ModalContext";
import {
  createUnityAssetAPI,
  deleteUnityAssetAPI,
  fetchUnityAssetsList,
  UNITY_ASSET_LIST_QUERY_KEY,
  updateUnityAssetAPI,
} from "@/services/unityAssetService";

const UnityAssetManagePage = () => {
  const { openModal, closeModal } = useModal();
  const queryClient = useQueryClient();

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
        window.alert(res?.message || "등록에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: UNITY_ASSET_LIST_QUERY_KEY });
      closeModal();
    },
    onError: (err) => {
      window.alert(err?.response?.data?.message || err?.message || "등록 중 오류가 발생했습니다.");
    },
  });

  const { mutate: updateAsset } = useMutation({
    mutationFn: updateUnityAssetAPI,
    onSuccess: (res) => {
      if (res?.success === false) {
        window.alert(res?.message || "수정에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: UNITY_ASSET_LIST_QUERY_KEY });
      closeModal();
    },
    onError: (err) => {
      window.alert(err?.response?.data?.message || err?.message || "수정 중 오류가 발생했습니다.");
    },
  });

  const { mutate: deleteAsset } = useMutation({
    mutationFn: deleteUnityAssetAPI,
    onSuccess: (res) => {
      if (res?.success === false) {
        window.alert(res?.message || "삭제에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: UNITY_ASSET_LIST_QUERY_KEY });
      closeModal();
    },
    onError: (err) => {
      window.alert(err?.response?.data?.message || err?.message || "삭제 중 오류가 발생했습니다.");
    },
  });

  const handleSearchClick = () => {
    setSearchKeyword(keywordInput.trim());
  };

  const filtered = useMemo(() => {
    if (!searchKeyword) return assets;
    const k = searchKeyword.toLowerCase();
    return assets.filter((row) => {
      if (searchField === "assetName") {
        return row.assetName?.toLowerCase().includes(k);
      }
      return (row.description || "").toLowerCase().includes(k);
    });
  }, [assets, searchField, searchKeyword]);

  const isDuplicateName = (name, excludeId) =>
    assets.some(
      (a) =>
        a.assetName?.toLowerCase() === name.toLowerCase() &&
        (excludeId == null || a.assetId !== excludeId)
    );

  const openRegisterModal = () => {
    openModal({
      title: "3D Asset 등록",
      hideFooter: true,
      wide: true,
      content: (
        <UnityAssetManageForm
          mode="create"
          onCancel={closeModal}
          onSubmit={(payload) => {
            if (isDuplicateName(payload.assetName)) {
              window.alert("이미 같은 asset_name이 있습니다.");
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
      title: "3D Asset 수정",
      hideFooter: true,
      wide: true,
      content: (
        <UnityAssetManageForm
          mode="edit"
          initial={row}
          onCancel={closeModal}
          onSubmit={(payload) => {
            if (isDuplicateName(payload.assetName, payload.assetId)) {
              window.alert("이미 같은 asset_name이 있습니다.");
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
      title: "3D Asset 삭제 확인",
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
    <AdminPageTemplate
      title="3D Asset 관리"
      description="Unity 3D 에셋(asset_name) 정보를 조회·등록·수정·삭제합니다."
    >
      <Toolbar>
        <FilterGroup>
          <Select value={searchField} onChange={(e) => setSearchField(e.target.value)}>
            <option value="assetName">에셋 이름</option>
            <option value="description">설명</option>
          </Select>
          <SearchInput
            placeholder="검색어 입력"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
          />
          <SearchButton type="button" onClick={handleSearchClick}>
            검색
          </SearchButton>
        </FilterGroup>
        <RegisterButton type="button" onClick={openRegisterModal}>
          + 3D Asset 등록
        </RegisterButton>
      </Toolbar>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th style={{ width: 70 }}>번호</Th>
              <Th>asset_name</Th>
              <Th>설명</Th>
              <Th $center style={{ width: 80 }}>활성</Th>
              <Th style={{ width: 150 }}>수정일</Th>
              <Th $center style={{ width: 140 }}>관리</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <Td colSpan={6} $center>
                  불러오는 중…
                </Td>
              </tr>
            ) : isError ? (
              <tr>
                <Td colSpan={6} $center>
                  {error?.message ?? "목록을 불러오지 못했습니다."}
                </Td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <Td colSpan={6} $center>
                  {searchKeyword ? "검색 결과가 없습니다." : "등록된 3D Asset이 없습니다."}
                </Td>
              </tr>
            ) : (
              filtered.map((row, idx) => (
                <tr key={row.assetId}>
                  <Td>{idx + 1}</Td>
                  <Td>
                    <AssetNameCell>{row.assetName}</AssetNameCell>
                  </Td>
                  <Td>{row.description || "—"}</Td>
                  <Td $center>
                    <Badge $active={row.active !== false}>
                      {row.active !== false ? "활성" : "비활성"}
                    </Badge>
                  </Td>
                  <Td>{formatDate(row.updatedAt || row.createdAt)}</Td>
                  <Td $center>
                    <BtnGroup>
                      <EditBtn type="button" onClick={() => openEditModal(row)}>
                        수정
                      </EditBtn>
                      <DeleteBtn type="button" onClick={() => openDeleteModal(row)}>
                        삭제
                      </DeleteBtn>
                    </BtnGroup>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>
    </AdminPageTemplate>
  );
};

export default UnityAssetManagePage;

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

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
  background: #ffffff;
  border: 1px solid #e1e2e5;
  border-radius: 5px;
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const Select = styled.select`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  min-width: 120px;
`;

const SearchInput = styled.input`
  padding: 8px 12px;
  width: min(100%, 260px);
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  &::placeholder {
    color: #9ca3af;
  }
`;

const SearchButton = styled.button`
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #4a6380;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    background: #3d5370;
  }
`;

const RegisterButton = styled.button`
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    background: #1d4ed8;
  }
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

const Th = styled.th`
  padding: 12px 16px;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  font-weight: 700;
  color: #111827;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

const Td = styled.td`
  padding: 11px 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #111827;
  text-align: ${(p) => (p.$center ? "center" : "left")};
`;

const AssetNameCell = styled.span`
  font-weight: 600;
  color: #1e3a5f;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  background: ${(p) => (p.$active ? "#dcfce7" : "#fee2e2")};
  color: ${(p) => (p.$active ? "#15803d" : "#dc2626")};
`;

const BtnGroup = styled.div`
  display: flex;
  gap: 6px;
  justify-content: center;
`;

const EditBtn = styled.button`
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: #4a6380;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #3d5370;
  }
`;

const DeleteBtn = styled.button`
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: #dc2626;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #b91c1c;
  }
`;
