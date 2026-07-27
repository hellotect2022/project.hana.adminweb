import { showAlert } from "@/utils/dialogBridge";
import { useState } from "react";
import styled from "styled-components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSopTemplate,
  SOP_TEMPLATES_QUERY_KEY,
  type SopTemplateSummary,
} from "@/services/sopService";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

interface Props {
  onClose?: () => void;
  onCreated?: (created: SopTemplateSummary) => void;
}

const SopTemplateCreateForm = ({ onClose, onCreated }: Props) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    templateCode: "",
    templateName: "",
    description: "",
    title: "",
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createSopTemplate({
        templateCode: form.templateCode.trim(),
        templateName: form.templateName.trim(),
        description: form.description.trim() || undefined,
        title: form.title.trim() || undefined,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: SOP_TEMPLATES_QUERY_KEY });
      onClose?.();
      onCreated?.(created);
    },
    onError: (err) => {
      showAlert(getApiErrorMessage(err, "생성 실패"));
    },
  });

  const canSubmit =
    form.templateCode.trim() !== "" && form.templateName.trim() !== "";

  return (
    <>
      <Field>
        <label>
          templateCode <Req>*</Req>
        </label>
        <input
          value={form.templateCode}
          onChange={(e) =>
            setForm((f) => ({ ...f, templateCode: e.target.value }))
          }
          placeholder="FIRE_DETECT"
        />
      </Field>
      <Field>
        <label>
          templateName <Req>*</Req>
        </label>
        <input
          value={form.templateName}
          onChange={(e) =>
            setForm((f) => ({ ...f, templateName: e.target.value }))
          }
          placeholder="화재 감지 SOP"
        />
      </Field>
      <Field>
        <label>title (SOP 이벤트명)</label>
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="화재감지"
        />
      </Field>
      <Field>
        <label>description</label>
        <input
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />
      </Field>
      <Actions>
        <button
          type="button"
          onClick={onClose}
          disabled={createMutation.isPending}
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !canSubmit}
        >
          {createMutation.isPending ? "생성 중…" : "생성"}
        </button>
      </Actions>
    </>
  );
};

export default SopTemplateCreateForm;

const Field = styled.div`
  margin-bottom: 12px;
  label {
    display: block;
    font-size: 12px;
    color: #64748b;
    margin-bottom: 4px;
  }
  input {
    width: 100%;
    padding: 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    box-sizing: border-box;
  }
`;

const Req = styled.span`
  color: #d83b3b;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  button {
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid #d1d5db;
    background: #fff;
    cursor: pointer;
    &:last-child {
      background: #4a6380;
      color: #fff;
      border-color: #4a6380;
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
`;
