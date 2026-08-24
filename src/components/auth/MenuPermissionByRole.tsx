import { showAlert } from "@/utils/dialogBridge";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import {
  DEVICE_SYSTEM_ALL_QUERY_KEY,
  fetchAllDeviceSystems,
} from "@/services/deviceSystemService";
import {
  fetchRoleDeviceSystemPermissionsAPI,
  saveRoleDeviceSystemPermissionsAPI,
} from "@/services/authService";
import {
  fetchRolesList,
  ROLES_LIST_QUERY_KEY,
} from "@/services/roleService";
import { Button } from "@/components/ui";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

/**
 * 그룹(역할)별 BMS 시스템 접근 — GET /api/device-system/all
 */

const PERM_QUERY_KEY = (roleId) => ["device-system", "roles", roleId, "permissions"];

/**
 * GET 응답을 Record<systemId, boolean> 으로 정규화
 * @param {unknown} data
 * @param {number[]} allSystemIds
 */
function normalizeRoleDeviceSystemPermissions(data, allSystemIds) {
  const next = Object.fromEntries(allSystemIds.map((id) => [id, false]));
  if (data == null) return next;

  const unwrap =
    data && typeof data === "object" && "data" in data && data.data != null
      ? data.data
      : data;

  if (Array.isArray(unwrap)) {
    unwrap.forEach((id) => {
      const n = Number(id);
      if (allSystemIds.includes(n)) next[n] = true;
    });
    return next;
  }

  if (
    unwrap &&
    typeof unwrap === "object" &&
    Array.isArray(unwrap.systemIds)
  ) {
    unwrap.systemIds.forEach((id) => {
      const n = Number(id);
      if (allSystemIds.includes(n)) next[n] = true;
    });
    return next;
  }

  if (unwrap && typeof unwrap === "object") {
    Object.entries(unwrap).forEach(([k, v]) => {
      if (k === "systemIds" || k === "menuIds") return;
      const n = Number(k);
      if (!Number.isNaN(n) && allSystemIds.includes(n)) {
        next[n] = !!v;
      }
    });
  }

  return next;
}

const MenuPermissionByRole = () => {
  const queryClient = useQueryClient();
  const [roleId, setRoleId] = useState(null);
  const [allowed, setAllowed] = useState({});

  const {
    data: roles = [],
    isLoading: rolesLoading,
    isError: rolesError,
    error: rolesErr,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ROLES_LIST_QUERY_KEY,
    queryFn: fetchRolesList,
  });

  useEffect(() => {
    if (!roles.length) return;
    setRoleId((prev) => {
      if (prev != null && roles.some((r) => r.roleId === prev)) return prev;
      return roles[0].roleId;
    });
  }, [roles]);

  const {
    data: systems = [],
    isLoading: systemsLoading,
    isError: systemsError,
    error: systemsErr,
    refetch: refetchSystems,
  } = useQuery({
    queryKey: DEVICE_SYSTEM_ALL_QUERY_KEY,
    queryFn: fetchAllDeviceSystems,
  });

  const sortedSystems = useMemo(() => {
    return [...systems].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
  }, [systems]);

  const {
    data: permData,
    isLoading: permLoading,
    isError: permError,
    error: permErr,
    refetch: refetchPerm,
  } = useQuery({
    queryKey: PERM_QUERY_KEY(roleId ?? 0),
    queryFn: async () => {
      const res = await fetchRoleDeviceSystemPermissionsAPI(roleId);
      return res.data;
    },
    enabled: sortedSystems.length > 0 && roleId != null,
  });

  useEffect(() => {
    if (!sortedSystems.length) {
      setAllowed({});
      return;
    }
    const ids = sortedSystems.map((m) => m.systemId);
    setAllowed(normalizeRoleDeviceSystemPermissions(permData, ids));
  }, [roleId, sortedSystems, permData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (roleId == null) throw new Error("역할이 선택되지 않았습니다.");
      const systemIds = sortedSystems
        .filter((m) => allowed[m.systemId])
        .map((m) => m.systemId);
      const { data } = await saveRoleDeviceSystemPermissionsAPI(roleId, {
        systemIds,
      });
      return data;
    },
    onSuccess: () => {
      if (roleId != null) {
        queryClient.invalidateQueries({ queryKey: PERM_QUERY_KEY(roleId) });
      }
      showAlert("저장되었습니다.");
    },
    onError: (err) => {
      showAlert(getApiErrorMessage(err, "저장에 실패했습니다."));
    },
  });

  const toggleSystem = (sid) => {
    setAllowed((prev) => ({
      ...prev,
      [sid]: !prev[sid],
    }));
  };

  const setAll = (value) => {
    setAllowed((prev) => {
      const next = { ...prev };
      sortedSystems.forEach((m) => {
        next[m.systemId] = value;
      });
      return next;
    });
  };

  const handleSave = () => {
    if (roleId == null) {
      showAlert("권한(역할)을 선택하세요.");
      return;
    }
    if (!sortedSystems.length) {
      showAlert("BMS 시스템 목록이 없습니다.");
      return;
    }
    saveMutation.mutate();
  };

  const selectedRoleName =
    roles.find((r) => r.roleId === roleId)?.roleName ?? "";

  const systemIds = sortedSystems.map((m) => m.systemId);
  const allOn = systemIds.length > 0 && systemIds.every((id) => allowed[id]);
  const someOn = systemIds.some((id) => allowed[id]);

  return (
    <Wrap>
      <Toolbar>
        <ToolbarLeft>
          <FieldLabel htmlFor="role-select">그룹(역할)</FieldLabel>
          <RoleSelect
            id="role-select"
            value={roleId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setRoleId(v === "" ? null : Number(v));
            }}
            disabled={rolesLoading || roles.length === 0}
          >
            {rolesLoading ? (
              <option value="">불러오는 중…</option>
            ) : roles.length === 0 ? (
              <option value="">등록된 권한 없음</option>
            ) : (
              roles.map((r) => (
                <option key={r.roleId} value={r.roleId}>
                  {r.roleName}
                </option>
              ))
            )}
          </RoleSelect>
          <RoleHint>
            권한 목록: <code>GET /api/roles</code> · BMS 시스템:{" "}
            <code>GET /api/device-system/all</code>
          </RoleHint>
        </ToolbarLeft>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={
            saveMutation.isPending ||
            systemsLoading ||
            rolesLoading ||
            roleId == null ||
            sortedSystems.length === 0
          }
        >
          {saveMutation.isPending ? "저장 중…" : "저장"}
        </Button>
      </Toolbar>

      {rolesError ? (
        <ErrorBanner>
          권한 목록을 불러오지 못했습니다:{" "}
          {rolesErr?.message ?? "오류"}
          <RetryLink type="button" onClick={() => refetchRoles()}>
            다시 시도
          </RetryLink>
        </ErrorBanner>
      ) : null}

      {systemsError ? (
        <ErrorBanner>
          BMS 시스템 목록을 불러오지 못했습니다:{" "}
          {systemsErr?.message ?? "오류"}
          <RetryLink type="button" onClick={() => refetchSystems()}>
            다시 시도
          </RetryLink>
        </ErrorBanner>
      ) : null}

      {permError ? (
        <WarnBanner>
          역할별 권한 조회 실패(기본 미허용):{" "}
          {permErr?.message ?? "오류"}{" "}
          <RetryLink type="button" onClick={() => refetchPerm()}>
            다시 시도
          </RetryLink>
        </WarnBanner>
      ) : null}

      <Panel>
        <PanelTitleRow>
          <PanelTitle>
            디지털트윈 시스템 접근 권한 —{" "}
            {selectedRoleName || (roleId == null ? "역할을 선택하세요" : "")}
          </PanelTitle>
          <SectionActions>
            <MiniLink type="button" onClick={() => setAll(true)}>
              전체 허용
            </MiniLink>
            <MiniLink type="button" onClick={() => setAll(false)}>
              전체 해제
            </MiniLink>
            <Badge $active={allOn}>
              {allOn ? "전체 허용" : someOn ? "일부" : "없음"}
            </Badge>
          </SectionActions>
        </PanelTitleRow>

        <ScrollArea>
          {systemsLoading ? (
            <StatusText>BMS 시스템 목록을 불러오는 중…</StatusText>
          ) : sortedSystems.length === 0 ? (
            <StatusText>
              등록된 BMS 시스템이 없습니다. BMS 시스템 &gt; 표시 설정에서
              먼저 추가하세요.
            </StatusText>
          ) : (
            <>
              {permLoading ? (
                <StatusText $inline>권한 정보 불러오는 중…</StatusText>
              ) : null}
              <MenuTable>
                <thead>
                  <tr>
                    <Th $narrow>허용</Th>
                    <Th $narrow>systemId</Th>
                    <Th>systemName</Th>
                    <Th>systemCode</Th>
                    <Th>서브시스템</Th>
                    <Th $narrow>sortOrder</Th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSystems.map((m) => (
                    <tr key={m.systemId}>
                      <Td $narrow>
                        <CheckLabel>
                          <input
                            type="checkbox"
                            checked={!!allowed[m.systemId]}
                            onChange={() => toggleSystem(m.systemId)}
                          />
                        </CheckLabel>
                      </Td>
                      <Td $narrow>{m.systemId}</Td>
                      <Td>{m.systemName}</Td>
                      <Td $mono>
                        <code>{m.systemCode}</code>
                      </Td>
                      <Td>
                        {(m.subSystems ?? [])
                          .map((s) => s.subSystemName)
                          .join(", ") || "—"}
                      </Td>
                      <Td $narrow>{m.sortOrder}</Td>
                    </tr>
                  ))}
                </tbody>
              </MenuTable>
            </>
          )}
        </ScrollArea>
      </Panel>

      <FootNote>
        권한 목록: <code>GET /api/roles</code> · BMS 시스템:{" "}
        <code>GET /api/device-system/all</code> · 역할별 권한:{" "}
        <code>GET/PUT /device-system/roles/{"{roleId}"}/permissions</code> ·
        body 예: <code>{"{ systemIds: number[] }"}</code>
      </FootNote>
    </Wrap>
  );
};

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border: 1px solid #e1e2e5;
  border-radius: 8px;
`;

const ToolbarLeft = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`;

const FieldLabel = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
`;

const RoleSelect = styled.select`
  min-width: 200px;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
`;

const RoleHint = styled.span`
  font-size: 13px;
  color: #6b7280;
  max-width: 420px;
  line-height: 1.45;
  code {
    font-size: 11px;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 3px;
  }
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const ErrorBanner = styled.div`
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-size: 14px;
`;

const WarnBanner = styled.div`
  padding: 12px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  color: #92400e;
  font-size: 13px;
`;

const RetryLink = styled.button`
  margin-left: 8px;
  padding: 0;
  border: none;
  background: none;
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
`;

const Panel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
`;

const PanelTitleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111d2c;
`;

const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px 20px;
  max-height: calc(100vh - 280px);
`;

const StatusText = styled.p<{ $inline?: boolean }>`
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #6b7280;
  ${(p) =>
    p.$inline &&
    `
    margin-bottom: 8px;
    font-size: 13px;
    color: #4a6380;
  `}
`;

const SectionActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const MiniLink = styled.button`
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  color: #4a6380;
  cursor: pointer;
  text-decoration: underline;
  &:hover {
    color: #2c3e50;
  }
`;

const Badge = styled.span<{ $active?: boolean }>`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${(p) => (p.$active ? "#dcfce7" : "#f3f4f6")};
  color: ${(p) => (p.$active ? "#166534" : "#6b7280")};
`;

const MenuTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
`;

const Th = styled.th<{ $narrow?: boolean }>`
  text-align: left;
  padding: 8px 12px;
  background: #f3f4f6;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  ${(p) => p.$narrow && "width: 72px; text-align: center;"}
`;

const Td = styled.td<{ $narrow?: boolean; $mono?: boolean }>`
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
  color: #111827;
  ${(p) => p.$narrow && "text-align: center; vertical-align: middle;"}
  ${(p) =>
    p.$mono &&
    `
    font-size: 12px;
    font-family: ui-monospace, monospace;
  `}
`;

const CheckLabel = styled.label`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  input {
    width: 18px;
    height: 18px;
    accent-color: #4a6380;
  }
`;

const FootNote = styled.p`
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
  code {
    font-size: 11px;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 3px;
  }
`;

export default MenuPermissionByRole;
