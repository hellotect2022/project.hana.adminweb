import { showAlert } from "@/utils/dialogBridge";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { Button } from "@/components/ui";
import {
  createDeviceInfraAPI,
  DEVICE_INFRA_QUERY_KEY,
  INFRA_TYPE_LABEL,
  updateDeviceInfraAPI,
  type DeviceInfraDTO,
  type InfraType,
} from "@/services/deviceInfraService";

interface DeviceInfraFormProps {
  /** 수정 대상(없으면 등록 모드) */
  initial?: DeviceInfraDTO | null;
  onCancel: () => void;
  /** 저장 성공 시(ApiResponse 전달) — 호출측에서 모달 닫기/알림 처리 */
  onSuccess: (res: any) => void;
}

/**
 * 인프라 등록/수정 폼 (openModal hideFooter 패턴).
 * ref 코드는 vwDigitalTwin_02 외부 매핑키 — 관리자 직접 입력(선택).
 * 저장 성공 시 인프라 목록/정합성 쿼리를 invalidate 한다.
 * 중복 ref 코드 등 서버 에러(400)는 전역 api 에러 모달이 처리한다.
 */
const DeviceInfraForm = ({ initial = null, onCancel, onSuccess }: DeviceInfraFormProps) => {
  const queryClient = useQueryClient();
  const isEdit = initial != null;

  const [form, setForm] = useState({
    infraName: initial?.infraName ?? "",
    infraType: (initial?.infraType ?? "REPEATER") as InfraType,
    refInfraCode: initial?.refInfraCode ?? "",
    active: initial?.active !== false,
  });

  const { mutate: saveInfra, isPending } = useMutation({
    mutationFn: () => {
      const payload = {
        infraName: form.infraName.trim(),
        infraType: form.infraType,
        // "" 전송 → 서버 trimToNull 로 null(수정 시 기존 코드 해제)
        refInfraCode: form.refInfraCode.trim(),
        active: form.active,
      };
      return initial
        ? updateDeviceInfraAPI({ infraId: initial.infraId, payload })
        : createDeviceInfraAPI(payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: DEVICE_INFRA_QUERY_KEY });
      onSuccess(res);
    },
    // onError 알림 없음 — 전역 api 에러 모달(apiErrorModalBridge)이 처리
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.infraName.trim()) {
      showAlert("인프라 이름을 입력하세요.");
      return;
    }
    saveInfra();
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FieldRow>
        <Label $required>인프라 이름</Label>
        <Input
          value={form.infraName}
          onChange={(e) => setForm((prev) => ({ ...prev, infraName: e.target.value }))}
          placeholder="예) 3층 중계기 #1"
          autoFocus
        />
      </FieldRow>

      <FieldRow>
        <Label $required>타입</Label>
        <TypeSelect
          value={form.infraType}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, infraType: e.target.value as InfraType }))
          }
        >
          {(Object.keys(INFRA_TYPE_LABEL) as InfraType[]).map((t) => (
            <option key={t} value={t}>
              {INFRA_TYPE_LABEL[t]}
            </option>
          ))}
        </TypeSelect>
      </FieldRow>

      <FieldRow>
        <Label>ref 코드</Label>
        <FieldCol>
          <Input
            value={form.refInfraCode}
            onChange={(e) => setForm((prev) => ({ ...prev, refInfraCode: e.target.value }))}
            placeholder="예) RMS / DDC-01 — 외부 뷰 식별코드"
          />
          <Hint>
            vwDigitalTwin_02 외부 매핑키(직접 입력, 선택). NVR/VMS 등 외부 뷰와 무관한
            타입은 비워도 됩니다.
          </Hint>
        </FieldCol>
      </FieldRow>

      <FieldRow>
        <Label>활성 여부</Label>
        <CheckLabel>
          <Checkbox
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
          />
          활성 (active)
        </CheckLabel>
      </FieldRow>

      <ButtonRow>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          취소
        </Button>
        <Button variant="primary" type="submit" disabled={isPending}>
          {isPending ? "저장 중…" : isEdit ? "수정" : "등록"}
        </Button>
      </ButtonRow>
    </Form>
  );
};

export default DeviceInfraForm;

const Form = styled.form`
  width: 100%;
  min-width: 440px;
  max-width: 560px;

  @media (max-width: 520px) {
    min-width: 0;
  }
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px;
  align-items: start;
  margin-bottom: 14px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Label = styled.label<{ $required?: boolean }>`
  padding-top: 9px;
  font-size: 13px;
  color: #374151;
  &::after {
    content: "${(p) => (p.$required ? " *" : "")}";
    color: #dc2626;
  }
`;

const FieldCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Input = styled.input`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  &:focus {
    border-color: #4a6380;
  }
  &::placeholder {
    color: #9ca3af;
  }
`;

const TypeSelect = styled.select`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  outline: none;
  &:focus {
    border-color: #4a6380;
  }
`;

const CheckLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #4a6380;
`;

const Hint = styled.p`
  margin: 0;
  font-size: 12px;
  color: #6b7280;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
`;
