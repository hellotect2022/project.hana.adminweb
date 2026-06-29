import { useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ColliderManageForm from "@/components/modal/unityAsset/ColliderManageForm";
import { useModal } from "@/contexts/ModalContext";
import {
  createZoneAPI,
  fetchFloorOptions,
  fetchZonesList,
  updateZoneAPI,
  UNITY_FLOOR_OPTION_QUERY_KEY,
  UNITY_ZONE_LIST_QUERY_KEY,
} from "@/services/unityZoneService";

/** 콜라이더(존) 관리 탭 — 층별 필터 / 등록·조회·수정 */
const ColliderManageTab = () => {
  const { openModal, closeModal } = useModal();
  const queryClient = useQueryClient();

  // 층 필터 ("" = 전체)
  const [floorFilter, setFloorFilter] = useState("");
  const [meshKeyword, setMeshKeyword] = useState("");

  const { data: floorOptions = [] } = useQuery({
    queryKey: UNITY_FLOOR_OPTION_QUERY_KEY,
    queryFn: fetchFloorOptions,
  });

  const floorIdParam = floorFilter ? Number(floorFilter) : null;

  const {
    data: zones = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...UNITY_ZONE_LIST_QUERY_KEY, floorIdParam],
    queryFn: () => fetchZonesList({ floorId: floorIdParam }),
  });

  const invalidateZones = () =>
    queryClient.invalidateQueries({ queryKey: UNITY_ZONE_LIST_QUERY_KEY });

  const { mutate: createZone } = useMutation({
    mutationFn: createZoneAPI,
    onSuccess: (res) => {
      if (res?.success === false) {
        window.alert(res?.message || "등록에 실패했습니다.");
        return;
      }
      invalidateZones();
      closeModal();
    },
    onError: (err) => {
      window.alert(err?.response?.data?.message || err?.message || "등록 중 오류가 발생했습니다.");
    },
  });

  const { mutate: updateZone } = useMutation({
    mutationFn: updateZoneAPI,
    onSuccess: (res) => {
      if (res?.success === false) {
        window.alert(res?.message || "수정에 실패했습니다.");
        return;
      }
      invalidateZones();
      closeModal();
    },
    onError: (err) => {
      window.alert(err?.response?.data?.message || err?.message || "수정 중 오류가 발생했습니다.");
    },
  });

  const filtered = useMemo(() => {
    const k = meshKeyword.trim().toLowerCase();
    if (!k) return zones;
    return zones.filter(
      (z) =>
        z.zoneMeshName?.toLowerCase().includes(k) ||
        z.zoneName?.toLowerCase().includes(k)
    );
  }, [zones, meshKeyword]);

  // 현재 로드된 목록 기준 클라이언트 1차 중복검사(서버에서도 재검사)
  const isDuplicateMesh = (mesh, excludeId) =>
    zones.some(
      (z) =>
        z.zoneMeshName?.toLowerCase() === mesh.toLowerCase() &&
        (excludeId == null || z.zoneId !== excludeId)
    );

  const openRegisterModal = () => {
    openModal({
      title: "콜라이더 등록",
      hideFooter: true,
      wide: true,
      content: (
        <ColliderManageForm
          mode="create"
          floorOptions={floorOptions}
          defaultFloorId={floorIdParam}
          onCancel={closeModal}
          onSubmit={(payload) => {
            // 전체 목록이 아닌 경우 다른 층의 중복은 못 잡으므로 서버 검사에 위임,
            // 여기서는 현재 목록 기준으로만 1차 안내
            if (!floorIdParam && isDuplicateMesh(payload.zoneMeshName)) {
              window.alert("이미 같은 mesh_name이 있습니다.");
              return;
            }
            createZone(payload);
          }}
        />
      ),
    });
  };

  const openEditModal = (row) => {
    openModal({
      title: "콜라이더 수정",
      hideFooter: true,
      wide: true,
      content: (
        <ColliderManageForm
          mode="edit"
          initial={row}
          floorOptions={floorOptions}
          onCancel={closeModal}
          onSubmit={(payload) => {
            if (!floorIdParam && isDuplicateMesh(payload.zoneMeshName, payload.zoneId)) {
              window.alert("이미 같은 mesh_name이 있습니다.");
              return;
            }
            updateZone(payload);
          }}
        />
      ),
    });
  };

  return (
    <>
      <Toolbar>
        <FilterGroup>
          <Select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)}>
            <option value="">전체 층</option>
            {floorOptions.map((f) => (
              <option key={f.floorId} value={f.floorId}>
                {f.floorName}
                {f.floorNum != null ? ` (${f.floorNum})` : ""}
              </option>
            ))}
          </Select>
          <SearchInput
            placeholder="mesh_name / 이름 검색"
            value={meshKeyword}
            onChange={(e) => setMeshKeyword(e.target.value)}
          />
        </FilterGroup>
        <RegisterButton type="button" onClick={openRegisterModal}>
          + 콜라이더 등록
        </RegisterButton>
      </Toolbar>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th style={{ width: 70 }}>번호</Th>
              <Th style={{ width: 90 }}>zone_id</Th>
              <Th style={{ width: 160 }}>층</Th>
              <Th>이름</Th>
              <Th>mesh_name</Th>
              <Th $center style={{ width: 100 }}>관리</Th>
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
                  {meshKeyword ? "검색 결과가 없습니다." : "등록된 콜라이더가 없습니다."}
                </Td>
              </tr>
            ) : (
              filtered.map((row, idx) => (
                <tr key={row.zoneId}>
                  <Td>{idx + 1}</Td>
                  <Td>{row.zoneId}</Td>
                  <Td>
                    {row.floorName || "—"}
                    {row.floorNum != null ? ` (${row.floorNum})` : ""}
                  </Td>
                  <Td>{row.zoneName || "—"}</Td>
                  <Td>
                    <MeshCell>{row.zoneMeshName}</MeshCell>
                  </Td>
                  <Td $center>
                    <EditBtn type="button" onClick={() => openEditModal(row)}>
                      수정
                    </EditBtn>
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

export default ColliderManageTab;

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
  min-width: 140px;
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

const MeshCell = styled.span`
  font-weight: 600;
  color: #1e3a5f;
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
