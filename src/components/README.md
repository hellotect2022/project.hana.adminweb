# 컴포넌트 카탈로그 (`src/components`)

Hana DigitalTwin 프론트엔드의 컴포넌트 구조 정리. 계층별로 역할과 재사용 관계를 기록한다.

- 스택: React 19 + Vite + TypeScript + styled-components + @tanstack/react-query
- 공통 규약: 스타일은 `styles/tokens` 기반 styled-components, 서버 통신은 `services/*` + `privateApi`(ApiResponse 엔벨로프), 목록은 `Pagination`, 페이지 골격은 `AdminPageTemplate`.
- 프리미티브 상세는 [`ui/README.md`](./ui/README.md) 참조.

---

## 1. 디자인시스템 프리미티브 — `components/ui/`

배럴 `ui/index.ts` 로 export. 모든 입력계열은 `box-sizing: border-box`.

| 컴포넌트 | 역할 |
|---|---|
| `Button` | 표준 버튼. `variant`(primary/secondary/outline/…) · `size` |
| `Input` | 텍스트 입력 |
| `Select` | 표준 native 드롭다운(항목 적을 때) |
| `SearchableSelect` | 검색형 콤보박스(단일 선택). 타이핑 필터 + 키보드 + 바깥클릭 닫기. 장비/에셋 등 대량 목록용 |
| `Badge` | 상태·라벨 뱃지(`tone`) |
| `Toggle` | on/off 토글 |
| `Tab` / `TabBar` | 탭 네비게이션 |
| `IconButton` | 아이콘 전용 버튼 |
| `Toolbar` (+ `FilterGroup`, `FilterLabel`) | 상단 툴바/필터 레이아웃 |

### `SearchableSelect` 동작 원리
native `<select>` 대신 **input + 커스텀 드롭다운**을 그린다(검색 지원).

| 요소 | 구현 |
|---|---|
| 상태 | `open`(열림) · `search`(입력텍스트) · `activeIndex`(키보드 하이라이트) · `value`(controlled) |
| 입력창 표시 | `open`이면 `search`, 닫히면 선택 항목 `label` |
| 필터 | `options.filter(o => o.label.toLowerCase().includes(q))` 실시간 |
| 선택 | 옵션 `onMouseDown + preventDefault`(blur보다 먼저) → `onChange(value)` + 닫기 |
| 바깥클릭 닫기 | `document` `mousedown` 리스너 + wrapper `ref` |
| 키보드 | Esc 닫기 · ↑/↓ 순환 이동 · Enter 선택 · `scrollIntoView({block:'nearest'})` |
| 해제 | `allowClear` 시 X 버튼 → `onChange("")` |
| 상태문구 | `loading` / `emptyText`(옵션 0) / `noMatchText`(검색 0) |

Props(요약): `options({value,label,sublabel?})` · `value` · `onChange` · `placeholder` · `disabled` · `loading` · `emptyText` · `noMatchText` · `allowClear`.

---

## 2. 공통 — `components/common/`

| 컴포넌트 | 역할 |
|---|---|
| `AdminPageTemplate` | 관리자 페이지 골격(제목·설명·본문). 목록 페이지 공통 래퍼 |
| `Pagination` | 표준 페이지네이션. 0-base `number`, `first/last`, `hideOnSinglePage`(기본 true → 1페이지면 숨김) |
| `Icon`(`SvgIcons`) | SVG 아이콘 세트 |
| `GlobalLoadingOverlay` | 전역 로딩 오버레이 |
| `DisabledMenuPlaceholder` | 비활성 메뉴 안내 화면 |

---

## 3. 레이아웃 — `components/layout/`

| 컴포넌트 | 역할 |
|---|---|
| `MainLayout` | 전체 앱 셸(사이드바 + 헤더 + 콘텐츠) |
| `Header` | 상단바 |
| `Sidebar` | 좌측 메뉴(`menuData` 기반). ⚠️ `disabled`/`disabledReason` 타입오류 2건(기존 이슈) |

---

## 4. 장비 도메인 — `components/device/`

| 컴포넌트 | 역할 |
|---|---|
| `DeviceHierarchyFilter` | **대 > 중 > 소 > 장비 4단 cascade** 필터(controlled). 대/중/소는 카테고리 트리, **소분류 장비는 서버 per-category 조회**(`fetchDevicesAPI({categoryId,size})`), 장비 선택은 `SearchableSelect`. props: `value`·`onChange`·`onDevicePicked`·`excludeDeviceIds`. 사용처: 장비관리·포인트매핑·계통도 모달 |
| `DeviceCategoryPicker` | 카테고리 선택 UI |
| `DeviceSmallCategorySelect` | 소분류 선택 셀렉트 |

> `DeviceHierarchyFilter` 는 공유 컴포넌트라 한 곳 수정이 3개 사용처에 반영된다.
> `excludeDeviceIds` = 후보에서 제외할 deviceId(예: 계통도 서브에서 마스터/이미 추가분 제외).
> `onDevicePicked(device|null)` = 선택 즉시 장비 객체 전달(라벨 캐싱 등).

---

## 5. 모달 — `components/modal/`

- `Modal.tsx` — **공용 모달 골격**: `Backdrop` / `ModalContainer`(max-height 92vh) / `ModalHeader` / **`ModalBody`(overflow-y:auto = 세로 스크롤)** / `ModalFooter`. `ModalContext`(`useModal`)로 열고 닫음.

### 도메인별 모달/폼
| 경로 | 컴포넌트 | 역할 |
|---|---|---|
| `alarm/` | `AlarmPolicyModal` | 알람 정책 등록/수정(범위·조건·레벨·경보표시·이펙트) |
| `device/` | `CategoryManageForm` | 카테고리 관리 + **기본 3D 에셋 지정**(`SearchableSelect`) |
| | `DeviceDetailModal` | 장비 상세(3D 에셋은 카테고리 기준 읽기전용 표시) |
| | `DevicePointMappingModal` | 장비 포인트 매핑 |
| | `DeviceRegistForm` / `DeviceRegisterForm` | 장비 등록 — ⚠️ **이름 유사 2개(중복/레거시 의심, 확인 필요)** |
| `systemDiagram/` | `SystemDiagramModal` | 계통도 등록/수정(마스터·서브 cascade, 배선 세그먼트, 이름 라벨) |
| `unityAsset/` | `UnityAssetManageForm`, `ColliderManageForm` | 3D 에셋/콜라이더 관리 |
| `user/` | `RoleManageForm`, `RoleManageModal`, `RoleMembersModalContent`, `UserEditModalForm`, `UserRegisterForm` | 권한그룹/사용자 관리 |
| `zone/` | `ZoneCreateModal`, `ZonePolicyCreateModal` | 구역/표현정책 |
| `menu/` | `DeviceSystemForm` | BMS 시스템(메뉴/권한 그룹) |
| `sop/` | `SopTemplateCreateForm` | SOP 템플릿 |

---

## 컨벤션 메모
- **에셋 매핑**: 디바이스가 아니라 **카테고리(`defaultAsset`)** 에 3D 에셋을 매핑. 디바이스는 자기 카테고리 에셋으로 렌더(디바이스 응답 `assetId`/`assetName` = 카테고리 기준 소싱).
- **대량 목록 선택**은 `SearchableSelect` 사용(native select는 소량 전용).
- **목록 화면**은 `AdminPageTemplate` + 서버 페이지네이션(`ApiResponse.PageResponse`: `data.content` + `data.page.*`) + `Pagination`.

## 알려진 이슈 / 후속
- `layout/Sidebar.tsx` `disabled`/`disabledReason` 타입오류 2건(기존, 별도 정리).
- `device/DeviceRegistForm.tsx` ↔ `DeviceRegisterForm.tsx` 중복 의심 — 사용처 확인 후 정리 권장.
