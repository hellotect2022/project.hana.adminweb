// hana-digitaltwin 백엔드 계약 기준 타입 (DeviceController / DTO).
// 백엔드가 진실원천 — 변경 시 여기부터 맞추면 사용처가 컴파일 단계에서 드러남.

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode: string | null;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

export interface DeviceTransform {
  placementId?: number;
  posX: number; posY: number; posZ: number;
  rotX: number; rotY: number; rotZ: number;
  scaleX: number; scaleY: number; scaleZ: number;
}

export interface DeviceLocation {
  buildingId: number | null;
  buildingName: string | null;
  floorId: number | null;
  floorName: string | null;
  zoneId: number | null;
  zoneName: string | null;
  zoneMeshName: string | null;
}

export interface DeviceDTO {
  deviceId: number;
  deviceName: string;
  deviceDisplayName: string | null;
  description: string | null;
  active: boolean;
  categoryId: number | null;
  categoryName: string | null;
  categoryPath: string | null;
  assetId: number | null;
  assetName: string | null;
  transform: DeviceTransform | null; // null = 미배치
  location: DeviceLocation | null;
  placed: boolean;
  createdAt: string;
  updatedAt: string;
}

// PUT /api/device/placement 요청 (deviceId는 body, URL엔 path param 없음)
export interface DevicePlacementRequest {
  deviceId: number;
  deviceName: string;
  description?: string;
  unityZoneId?: number | null;
  posX: number; posY: number; posZ: number;
  rotX: number; rotY: number; rotZ: number;
  scaleX: number; scaleY: number; scaleZ: number;
}

export interface DevicePlacementResponse {
  deviceId: number;
  deviceName: string;
  description: string | null;
  transform: DeviceTransform | null;
  location: DeviceLocation | null;
  active: boolean | null;
  isSet: boolean;
}

// GET /api/device/location-info (building → floor → zone)
export interface UnityZone {
  zoneId: number;
  zoneName: string;
  zoneMeshName: string | null;
}
export interface UnityFloor {
  floorId: number;
  floorNum: number;
  floorName: string;
  zoneList: UnityZone[];
}
export interface UnityBuilding {
  buildingId: number;
  buildingName: string;
  floorList: UnityFloor[];
}
