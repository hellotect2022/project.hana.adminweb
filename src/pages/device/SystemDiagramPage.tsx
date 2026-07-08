import { useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Button } from "@/components/ui";
import { useModal } from "@/contexts/ModalContext";
import SystemDiagramModal from "@/components/modal/systemDiagram/SystemDiagramModal";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import {
  SYSTEM_DIAGRAM_QUERY_KEY,
  deleteSystemDiagram,
  fetchSystemDiagrams,
  type SystemDiagram,
} from "@/services/systemDiagramService";

/**
 * 계통도 관리 (WA-SYSTEM-DIAGRAM) — 장비 관리 그룹
 * 마스터 장비 중심으로 서브 장비와 배선(배관 세그먼트 포함)을 관리한다.
 * 행 클릭 시 하단에 서브 장비/배선 상세를 펼친다.
 */
const SystemDiagramPage = () => {
  const queryClient = useQueryClient();
  const { openModal, closeModal } = useModal();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const {
    data: diagrams = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: SYSTEM_DIAGRAM_QUERY_KEY,
    queryFn: fetchSystemDiagrams,
  });

  const selected = diagrams.find((d) => d.diagramId === selectedId) ?? null;

  const { mutate: removeDiagram } = useMutation({
    mutationFn: deleteSystemDiagram,
    onSuccess: (res: any) => {
      if (res?.success === false) {
        window.alert(res?.message || "삭제에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: SYSTEM_DIAGRAM_QUERY_KEY });
      closeModal();
    },
    // 참조 장비 등으로 백엔드가 409 반환 시 서버 메시지 노출
    onError: (err) =>
      window.alert(getApiErrorMessage(err, "삭제 중 오류가 발생했습니다.")),
  });

  const openEditor = (diagram: SystemDiagram | null) => {
    openModal({
      title: diagram ? "계통도 수정" : "계통도 등록",
      hideFooter: true,
      wide: true,
      content: <SystemDiagramModal diagram={diagram} onClose={closeModal} />,
    });
  };

  const openDelete = (diagram: SystemDiagram) => {
    openModal({
      title: "계통도 삭제",
      content: `계통도 "${diagram.diagramName}" 을(를) 삭제할까요?`,
      onConfirm: () => removeDiagram(diagram.diagramId),
    });
  };

  return (
    <AdminPageTemplate
      title="계통도 관리"
      description="마스터 장비를 중심으로 서브 장비와 배선(배관 세그먼트)을 등록·관리합니다. 좌표는 Unity 월드좌표이며 3D 씬 직접 편집은 후속 작업입니다."
    >
      <PanelHead>
        <PanelTitle>계통도 목록</PanelTitle>
        <Button variant="primary" onClick={() => openEditor(null)}>
          + 계통도 등록
        </Button>
      </PanelHead>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>계통도명</Th>
              <Th>코드</Th>
              <Th>마스터 장비</Th>
              <Th $center>서브 장비 수</Th>
              <Th $center>배선 수</Th>
              <Th $center>활성</Th>
              <Th $center>관리</Th>
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
                  {(error as Error)?.message ?? "목록을 불러오지 못했습니다."}
                </Td>
              </tr>
            ) : diagrams.length === 0 ? (
              <tr>
                <Td colSpan={7} $center>
                  등록된 계통도가 없습니다. "+ 계통도 등록"으로 추가하세요.
                </Td>
              </tr>
            ) : (
              diagrams.map((d) => (
                <Row
                  key={d.diagramId}
                  $selected={d.diagramId === selectedId}
                  onClick={() => setSelectedId(d.diagramId)}
                >
                  <Td>
                    <DiagramName>{d.diagramName}</DiagramName>
                  </Td>
                  <Td>
                    {d.diagramCode ? (
                      <Mono>{d.diagramCode}</Mono>
                    ) : (
                      <Muted>-</Muted>
                    )}
                  </Td>
                  <Td>
                    {d.masterDeviceName ?? (
                      <Muted>Device#{d.masterDeviceId}</Muted>
                    )}
                  </Td>
                  <Td $center>{d.devices?.length ?? 0}</Td>
                  <Td $center>{d.wirings?.length ?? 0}</Td>
                  <Td $center>
                    {d.active ? (
                      <StateBadge $on>활성</StateBadge>
                    ) : (
                      <StateBadge>비활성</StateBadge>
                    )}
                  </Td>
                  <Td $center onClick={(e) => e.stopPropagation()}>
                    <BtnGroup>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditor(d)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => openDelete(d)}
                      >
                        삭제
                      </Button>
                    </BtnGroup>
                  </Td>
                </Row>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>

      {/* 선택 계통도 상세 — 서브 장비 + 배선 */}
      {selected && (
        <DetailPanel>
          <DetailHead>
            <DetailTitle>
              선택 계통도: <strong>{selected.diagramName}</strong>
            </DetailTitle>
            <DetailMeta>
              마스터: {selected.masterDeviceName ?? `Device#${selected.masterDeviceId}`}
            </DetailMeta>
          </DetailHead>

          <SubTitle>서브 장비 ({selected.devices?.length ?? 0})</SubTitle>
          {selected.devices?.length ? (
            <ChipList>
              {[...selected.devices]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((m) => (
                  <DeviceChip key={m.mappingId}>{m.deviceName}</DeviceChip>
                ))}
            </ChipList>
          ) : (
            <EmptyDetail>서브 장비가 없습니다.</EmptyDetail>
          )}

          <SubTitle style={{ marginTop: 16 }}>
            배선 ({selected.wirings?.length ?? 0})
          </SubTitle>
          {selected.wirings?.length ? (
            <DetailTable>
              <thead>
                <tr>
                  <Th>배선명</Th>
                  <Th $center>타입</Th>
                  <Th $center>색</Th>
                  <Th>연결(from → to)</Th>
                  <Th $center>세그먼트 수</Th>
                </tr>
              </thead>
              <tbody>
                {[...selected.wirings]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((w) => (
                    <tr key={w.wiringId}>
                      <Td>{w.wiringName}</Td>
                      <Td $center>
                        {w.wiringType ? <Chip>{w.wiringType}</Chip> : <Muted>-</Muted>}
                      </Td>
                      <Td $center>
                        {w.color ? (
                          <ColorSwatch style={{ background: w.color }} title={w.color} />
                        ) : (
                          <Muted>-</Muted>
                        )}
                      </Td>
                      <Td>
                        {(w.fromDeviceName ?? `Device#${w.fromDeviceId}`)} →{" "}
                        {(w.toDeviceName ?? `Device#${w.toDeviceId}`)}
                      </Td>
                      <Td $center>{w.segments?.length ?? 0}</Td>
                    </tr>
                  ))}
              </tbody>
            </DetailTable>
          ) : (
            <EmptyDetail>배선이 없습니다.</EmptyDetail>
          )}
        </DetailPanel>
      )}
    </AdminPageTemplate>
  );
};

export default SystemDiagramPage;

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111d2c;
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
  font-size: 13px;
`;

const Th = styled.th<{ $center?: boolean }>`
  padding: 11px 14px;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
`;

const Td = styled.td<{ $center?: boolean }>`
  padding: 10px 14px;
  border-bottom: 1px solid #f3f4f6;
  color: #111827;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  vertical-align: middle;
`;

const Row = styled.tr<{ $selected?: boolean }>`
  cursor: pointer;
  background: ${(p) => (p.$selected ? "#eff6ff" : "#fff")};
  &:hover {
    background: ${(p) => (p.$selected ? "#e0edff" : "#f9fafb")};
  }
`;

const DiagramName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #111827;
`;

const StateBadge = styled.span<{ $on?: boolean }>`
  display: inline-block;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  background: ${(p) => (p.$on ? "#dcfce7" : "#f3f4f6")};
  color: ${(p) => (p.$on ? "#15803d" : "#9ca3af")};
`;

const BtnGroup = styled.div`
  display: flex;
  gap: 5px;
  justify-content: center;
`;

const Muted = styled.span`
  color: #9ca3af;
`;

const Mono = styled.span`
  font-family: monospace;
  color: #374151;
`;

const Chip = styled.span`
  display: inline-block;
  padding: 2px 9px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  background: #f3f4f6;
  color: #374151;
`;

const ColorSwatch = styled.span`
  display: inline-block;
  width: 22px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid #d1d5db;
  vertical-align: middle;
`;

const DetailPanel = styled.div`
  margin-top: 18px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px 18px;
`;

const DetailHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

const DetailTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #111d2c;
`;

const DetailMeta = styled.span`
  font-size: 12px;
  color: #6b7280;
`;

const SubTitle = styled.h5`
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
`;

const ChipList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const DeviceChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  background: #eef2f6;
  color: #475569;
`;

const DetailTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const EmptyDetail = styled.div`
  padding: 10px 0;
  font-size: 13px;
  color: #9ca3af;
`;
