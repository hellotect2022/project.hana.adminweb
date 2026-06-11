import { useState } from "react";
import styled from "styled-components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSopTemplate, SOP_TEMPLATES_QUERY_KEY } from "@/services/sopService";

const SopTemplateCreateForm = ({ onClose, onCreated }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    templateCode: "",
    templateName: "",
    description: "",
    timeoutMinutes: "10",
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createSopTemplate({
        templateCode: form.templateCode.trim(),
        templateName: form.templateName.trim(),
        description: form.description.trim() || undefined,
        timeoutMinutes: parseInt(form.timeoutMinutes, 10) || 10,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: SOP_TEMPLATES_QUERY_KEY });
      onClose?.();
      onCreated?.(created);
    },
    onError: (err) => {
      window.alert(err?.response?.data?.message ?? err?.message ?? "생성 실패");
    },
  });

  return (
    <>
      <Field>
        <label>templateCode</label>
        <input
          value={form.templateCode}
          onChange={(e) => setForm((f) => ({ ...f, templateCode: e.target.value }))}
          placeholder="FIRE_DETECT"
        />
      </Field>
      <Field>
        <label>templateName</label>
        <input
          value={form.templateName}
          onChange={(e) => setForm((f) => ({ ...f, templateName: e.target.value }))}
        />
      </Field>
      <Field>
        <label>description</label>
        <input
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </Field>
      <Field>
        <label>timeoutMinutes</label>
        <input
          type="number"
          value={form.timeoutMinutes}
          onChange={(e) => setForm((f) => ({ ...f, timeoutMinutes: e.target.value }))}
        />
      </Field>
      <Actions>
        <button type="button" onClick={onClose} disabled={createMutation.isPending}>
          취소
        </button>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
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
