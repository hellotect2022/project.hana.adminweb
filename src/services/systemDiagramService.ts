import privateApi from "./api";

/**
 * 계통도(System Diagram) API 클라이언트 — 장비 관리 그룹 (WA-SYSTEM-DIAGRAM)
 * Base: privateApi, `/api/system-diagram`, 응답은 ApiResponse<T> 엔벨로프(success/message/data).
 * 백엔드 계약: hana-digitaltwin systemDiagram 도메인
 *   (SystemDiagramController / SystemDiagramRequest / SystemDiagramResponse).
 *
 * 좌표(start/end x·y·z)는 Unity 월드좌표(Float). 3D 씬에서 직접 찍는 UI는 다음 Loop이며,
 * 현재는 숫자 입력 폼으로 수기 입력한다.
 */

/** 3D 좌표 한 점 (Unity 월드좌표) */
export interface DiagramPoint {
  x: number;
  y: number;
  z: number;
}

/** 배선 세그먼트 — 파이프(PIPE) 에셋 1개 + 시작/끝 좌표 */
export interface DiagramSegment {
  assetId: number;
  start: DiagramPoint;
  end: DiagramPoint;
}

/** 서브 장비 매핑 (응답) */
export interface DiagramDeviceItem {
  mappingId: number;
  deviceId: number;
  deviceName: string;
  sortOrder: number;
}

/** 배선(wiring) (응답) */
export interface DiagramWiringItem {
  wiringId: number;
  wiringName: string;
  wiringType: string | null;
  color: string | null;
  sortOrder: number;
  fromDeviceId: number;
  fromDeviceName: string | null;
  toDeviceId: number;
  toDeviceName: string | null;
  segments: DiagramSegment[];
}

/** 계통도 상세 (응답: SystemDiagramResponse) */
export interface SystemDiagram {
  diagramId: number;
  diagramName: string;
  diagramCode: string | null;
  masterDeviceId: number;
  /** 서버가 resolve 한 마스터 장비명 (응답 전용) */
  masterDeviceName: string | null;
  description: string | null;
  sortOrder: number;
  active: boolean;
  devices: DiagramDeviceItem[];
  wirings: DiagramWiringItem[];
  createdAt?: string;
  updatedAt?: string;
}

/** 서브 장비 매핑 (전송) */
export interface DiagramDevicePayloadItem {
  deviceId: number;
  sortOrder: number;
}

/** 배선(wiring) (전송) */
export interface DiagramWiringPayloadItem {
  wiringName: string;
  wiringType: string | null;
  color: string | null;
  sortOrder: number;
  fromDeviceId: number;
  toDeviceId: number;
  segments: DiagramSegment[];
}

/** 등록/수정 요청 페이로드 (SystemDiagramRequest) */
export interface SystemDiagramPayload {
  diagramName: string;
  diagramCode: string | null;
  masterDeviceId: number;
  description: string | null;
  sortOrder: number;
  active: boolean;
  devices: DiagramDevicePayloadItem[];
  wirings: DiagramWiringPayloadItem[];
}

/** 페이지 메타 (ApiResponse.PageResponse.PageInfo) */
export interface PageInfo {
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

/** 페이지 응답 (ApiResponse.PageResponse<T>) — data.content + data.page */
export interface PageResponse<T> {
  content: T[];
  page: PageInfo;
}

/** 목록 조회 파라미터 */
export interface SystemDiagramListParams {
  page?: number;
  size?: number;
  /** 계통도명/코드 부분일치(선택) */
  keyword?: string;
  /** Spring Pageable sort(기본 sortOrder,asc) */
  sort?: string;
}

export const SYSTEM_DIAGRAM_QUERY_KEY = ["system-diagram", "list"];
export const systemDiagramKey = (diagramId: number) => ["system-diagram", diagramId];

const EMPTY_PAGE_INFO: PageInfo = {
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 20,
  first: true,
  last: true,
};

/**
 * GET /api/system-diagram?keyword=&page=&size=&sort=
 * → ApiResponse.PageResponse<SystemDiagramResponse> ({ content, page })
 */
export async function fetchSystemDiagrams({
  page = 0,
  size = 20,
  keyword,
  sort,
}: SystemDiagramListParams = {}): Promise<PageResponse<SystemDiagram>> {
  const { data } = await privateApi.get("/system-diagram", {
    params: {
      page,
      size,
      ...(keyword ? { keyword } : {}),
      ...(sort ? { sort } : {}),
    },
  });
  if (!data?.success) throw new Error(data?.message || "계통도 목록 조회 실패");
  return {
    content: data.data?.content ?? [],
    page: data.data?.page ?? { ...EMPTY_PAGE_INFO, size },
  };
}

/** GET /api/system-diagram/{id} → SystemDiagramResponse */
export async function fetchSystemDiagram(diagramId: number): Promise<SystemDiagram> {
  const { data } = await privateApi.get(`/system-diagram/${diagramId}`);
  if (!data?.success) throw new Error(data?.message || "계통도 상세 조회 실패");
  return data.data;
}

/** POST /api/system-diagram (body SystemDiagramRequest) → SystemDiagramResponse */
export async function createSystemDiagram(payload: SystemDiagramPayload) {
  const { data } = await privateApi.post("/system-diagram", payload);
  return data;
}

/** PUT /api/system-diagram/{id} (body SystemDiagramRequest) → SystemDiagramResponse */
export async function updateSystemDiagram({
  diagramId,
  payload,
}: {
  diagramId: number;
  payload: SystemDiagramPayload;
}) {
  const { data } = await privateApi.put(`/system-diagram/${diagramId}`, payload);
  return data;
}

/** DELETE /api/system-diagram/{id} (참조 장비면 백엔드가 409 반환) */
export async function deleteSystemDiagram(diagramId: number) {
  const { data } = await privateApi.delete(`/system-diagram/${diagramId}`);
  return data;
}
