import { showAlert } from "@/utils/dialogBridge";
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import {
  DEVICE_CCTV_CANDIDATES_QUERY_KEY,
  deviceCctvMappingQueryKey,
  getCctvCandidates,
  getCctvMapping,
  postCctvMapping,
  type CctvInfo,
} from "@/services/deviceService";

interface Props {
  /** 매핑 대상(주변 CCTV를 지정할) 장비 */
  device: { deviceId: number; deviceName?: string };
  onClose: () => void;
}

/**
 * 장비 주변 CCTV 매핑 모달 (WA-DEVICE-CCTV)
 * 후보 CCTV를 체크로 선택하고, 선택 목록의 순서를 위/아래로 조정한다.
 * 순서 = 이벤트 발생 시 CCTV 8분할 배치 순서(sort_order)로 저장된다(replace).
 */
const DeviceCctvMappingModal = ({ device, onClose }: Props) => {
  const queryClient = useQueryClient();
  const deviceId = device.deviceId;

  const { data: current, isLoading: loadingCurrent } = useQuery({
    queryKey: deviceCctvMappingQueryKey(deviceId),
    queryFn: () => getCctvMapping(deviceId),
  });
  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: DEVICE_CCTV_CANDIDATES_QUERY_KEY,
    queryFn: getCctvCandidates,
  });

  // 선택된 CCTV id 목록(순서 = 배치 순서)
  const [selected, setSelected] = useState<number[]>([]);
  const [seeded, setSeeded] = useState(false);

  // 현재 매핑으로 초기 선택/순서 시드 (최초 1회)
  useEffect(() => {
    if (seeded || loadingCurrent) return;
    setSelected((current ?? []).map((c) => c.deviceId));
    setSeeded(true);
  }, [current, loadingCurrent, seeded]);

  // 이름/층 조회용 (후보 + 현재 매핑 합집합)
  const cctvById = useMemo(() => {
    const m = new Map<number, CctvInfo>();
    (candidates ?? []).forEach((c) => m.set(c.deviceId, c));
    (current ?? []).forEach((c) => {
      if (!m.has(c.deviceId)) m.set(c.deviceId, c);
    });
    return m;
  }, [candidates, current]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const move = (idx: number, dir: -1 | 1) =>
    setSelected((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const remove = (id: number) =>
    setSelected((prev) => prev.filter((x) => x !== id));

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => postCctvMapping(deviceId, selected),
    onSuccess: (res: any) => {
      if (res?.success === false) {
        showAlert(res?.message || "CCTV 매핑 저장에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({
        queryKey: deviceCctvMappingQueryKey(deviceId),
      });
      onClose();
    },
    onError: (err) =>
      showAlert(getApiErrorMessage(err, "CCTV 매핑 저장 중 오류가 발생했습니다.")),
  });

  const floorText = (c?: CctvInfo | null) => c?.floorName ?? "미배치";
  const loading = loadingCurrent || loadingCandidates;

  return (
    <Wrap>
      <Desc>
        <strong>{device.deviceName ?? `Device#${deviceId}`}</strong> 발생 시 함께
        노출할 주변 CCTV를 선택하고 순서를 지정하세요. 순서가 이벤트 화면의 CCTV
        분할 배치 순서가 됩니다.
      </Desc>

      <Cols>
        {/* 후보 목록 (체크 선택) */}
        <Panel>
          <PanelHead>
            CCTV 후보
            <Count>{candidates.length}대</Count>
          </PanelHead>
          <List>
            {loadingCandidates ? (
              <Empty>불러오는 중…</Empty>
            ) : candidates.length === 0 ? (
              <Empty>등록된 CCTV 장비가 없습니다.</Empty>
            ) : (
              candidates.map((c) => (
                <CandRow key={c.deviceId} $on={selectedSet.has(c.deviceId)}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedSet.has(c.deviceId)}
                      onChange={() => toggle(c.deviceId)}
                    />
                    <CandName>{c.deviceName}</CandName>
                    <CandFloor>{floorText(c)}</CandFloor>
                  </label>
                </CandRow>
              ))
            )}
          </List>
        </Panel>

        {/* 선택 목록 (순서 지정) */}
        <Panel>
          <PanelHead>
            선택된 CCTV (배치 순서)
            <Count>{selected.length}대</Count>
          </PanelHead>
          <List>
            {loading ? (
              <Empty>불러오는 중…</Empty>
            ) : selected.length === 0 ? (
              <Empty>왼쪽에서 CCTV를 선택하세요.</Empty>
            ) : (
              selected.map((id, idx) => {
                const c = cctvById.get(id);
                return (
                  <SelRow key={id}>
                    <OrderNo>{idx + 1}</OrderNo>
                    <SelBody>
                      <CandName>{c?.deviceName ?? `Device#${id}`}</CandName>
                      <CandFloor>{floorText(c)}</CandFloor>
                    </SelBody>
                    <OrderBtns>
                      <IconBtn
                        type="button"
                        disabled={idx === 0}
                        onClick={() => move(idx, -1)}
                        title="위로"
                      >
                        ▲
                      </IconBtn>
                      <IconBtn
                        type="button"
                        disabled={idx === selected.length - 1}
                        onClick={() => move(idx, 1)}
                        title="아래로"
                      >
                        ▼
                      </IconBtn>
                      <IconBtn
                        type="button"
                        $danger
                        onClick={() => remove(id)}
                        title="제거"
                      >
                        ×
                      </IconBtn>
                    </OrderBtns>
                  </SelRow>
                );
              })
            )}
          </List>
        </Panel>
      </Cols>

      <Footer>
        <Button variant="outline" type="button" onClick={onClose}>
          취소
        </Button>
        <Button
          variant="primary"
          type="button"
          onClick={() => save()}
          disabled={isPending || loading}
        >
          {isPending ? "저장 중…" : "저장"}
        </Button>
      </Footer>
    </Wrap>
  );
};

export default DeviceCctvMappingModal;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
`;

const Desc = styled.p`
  margin: 0 0 14px 0;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.5;
`;

const Cols = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

const Count = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
`;

const List = styled.div`
  max-height: 360px;
  overflow-y: auto;
  padding: 6px;
`;

const Empty = styled.div`
  padding: 28px 0;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
`;

const CandRow = styled.div<{ $on?: boolean }>`
  border-radius: 6px;
  background: ${(p) => (p.$on ? "#eff6ff" : "transparent")};
  label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    cursor: pointer;
  }
  input {
    flex-shrink: 0;
  }
  &:hover {
    background: ${(p) => (p.$on ? "#e0edff" : "#f9fafb")};
  }
`;

const CandName = styled.span`
  font-size: 13px;
  color: #111827;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CandFloor = styled.span`
  font-size: 11px;
  color: #6b7280;
  flex-shrink: 0;
`;

const SelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 6px;
  &:hover {
    background: #f9fafb;
  }
`;

const OrderNo = styled.span`
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: #1d4ed8;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
`;

const SelBody = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const OrderBtns = styled.div`
  display: inline-flex;
  gap: 4px;
  flex-shrink: 0;
`;

const IconBtn = styled.button<{ $danger?: boolean }>`
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  color: ${(p) => (p.$danger ? "#dc2626" : "#374151")};
  &:hover:not(:disabled) {
    background: ${(p) => (p.$danger ? "#fef2f2" : "#f3f4f6")};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  margin-top: 4px;
  border-top: 1px solid #e5e7eb;
`;
