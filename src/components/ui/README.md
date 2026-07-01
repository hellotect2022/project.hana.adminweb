# UI 디자인 시스템 (hanadream-web)

화면 전반의 **버튼·페이지네이션·색상**을 일관되게 관리하기 위한 공용 컴포넌트/토큰 모음.
새 화면을 만들거나 기존 화면을 정리할 때는 **반드시 이 시스템을 사용**한다.

## 관리 위치 (단일 진실원천)

| 항목 | 위치 | 설명 |
|---|---|---|
| 색상·반경·간격·타이포 토큰 | `src/styles/tokens.ts` | hex 값을 코드에 직접 쓰지 말고 토큰을 import |
| 버튼 | `src/components/ui/Button.tsx` | 모든 버튼의 표준 |
| 입력 | `src/components/ui/Input.tsx` | 텍스트 입력 |
| 드롭다운 | `src/components/ui/Select.tsx` | select |
| 상태 뱃지 | `src/components/ui/Badge.tsx` | 활성/타입 등 pill |
| 툴바 | `src/components/ui/Toolbar.tsx` | 목록 상단 필터/액션 바 (Toolbar/FilterGroup/FilterLabel) |
| 탭 | `src/components/ui/Tab.tsx` | 밑줄형 탭 (Tab/TabBar) |
| 아이콘 버튼 | `src/components/ui/IconButton.tsx` | 아이콘 전용(닫기·순서·확인 등) |
| 토글 | `src/components/ui/Toggle.tsx` | on/off·2상태 pill 토글 |
| 페이지네이션 | `src/components/common/Pagination.tsx` | 토큰 기반, 목록 하단 표준 |
| 배럴 export | `src/components/ui/index.ts` | `import { Button, Input, Select, Badge, Toolbar, Tab, TabBar, IconButton, Toggle } from "@/components/ui"` |

> 색상을 바꾸려면 `tokens.ts` **한 곳만** 수정하면 전체에 반영된다.

## 색상 팔레트 (tokens.ts)

| 토큰 | 값 | 용도 |
|---|---|---|
| `primary` / `primaryHover` | `#2563eb` / `#1d4ed8` | 주요 액션(등록/저장) |
| `secondary` / `secondaryHover` | `#4a6380` / `#3d5370` | 보조 액션(검색/수정), 페이지 활성 |
| `danger` / `dangerHover` | `#dc2626` / `#b91c1c` | 삭제 |
| `accent` | `#4a90d9` | input focus |
| `text` / `textStrong` / `textMuted` / `textSubtle` | `#374151` / `#111827` / `#6b7280` / `#9ca3af` | 텍스트 위계 |
| `border` / `borderLight` / `borderHover` | `#d1d5db` / `#e5e7eb` / `#9ca3af` | 경계선 |
| `surface` / `surfaceMuted` / `surfaceHover` / `surfaceSubtle` | `#fff` / `#f9fafb` / `#f3f4f6` / `#f8fafc` | 배경 |

## Button

```tsx
import { Button } from "@/components/ui";

<Button variant="primary">등록</Button>      // 주 액션 (파랑)
<Button variant="secondary">검색</Button>     // 보조 (슬레이트)
<Button variant="danger" size="sm">삭제</Button>   // 삭제 (빨강)
<Button variant="outline" onClick={onCancel}>취소</Button>  // 중립 (흰 배경+테두리)
<Button variant="ghost">더보기</Button>       // 텍스트/아이콘
<Button variant="primary" disabled>저장</Button>
<Button variant="primary" fullWidth>저장</Button>
```

- **variant**: `primary | secondary | danger | outline | ghost`
- **size**: `md`(기본, 툴바) | `sm`(테이블 행 내부)
- `type`은 기본 `button`(폼 의도치 않은 submit 방지). 폼 제출은 `type="submit"` 명시.
- 나머지 props(onClick, disabled, aria-* 등)는 그대로 전달된다.

### variant 선택 가이드
| 상황 | variant |
|---|---|
| 등록/저장/확인(주 행동) | `primary` |
| 검색/조회/수정(보조) | `secondary` |
| 삭제/되돌릴 수 없는 행동 | `danger` |
| 취소/닫기/중립 | `outline` |
| 아이콘 버튼/저강조 | `ghost` |

## Input / Select

```tsx
import { Input, Select } from "@/components/ui";

<Input placeholder="검색어 입력" value={v} onChange={(e) => setV(e.target.value)} />
<Select value={v} onChange={(e) => setV(e.target.value)}>
  <option value="ALL">전체</option>
</Select>
```
styled-components 이므로 모든 input/select 속성·이벤트가 그대로 전달된다. 너비 등 일회성
조정은 `style` prop으로.

## Badge

```tsx
import { Badge } from "@/components/ui";

<Badge tone="success">활성</Badge>
<Badge tone="danger">비활성</Badge>
<Badge tone="info">장비</Badge>
<Badge tone="neutral">기본</Badge>
<Badge tone="warning">대기</Badge>
```
tone: `success | danger | info | neutral | warning` (색은 tokens.ts `statusColors`).

## Toolbar

```tsx
import { Toolbar, FilterGroup, FilterLabel, Select, Input, Button } from "@/components/ui";

<Toolbar>
  <FilterGroup>
    <FilterLabel>에셋 타입</FilterLabel>
    <Select .../>
    <Input .../>
    <Button variant="secondary">검색</Button>
  </FilterGroup>
  <Button variant="primary">+ 등록</Button>
</Toolbar>
```
한 줄(`nowrap`) 정렬, 좌측 필터 그룹 + 우측 액션. 좁은 화면은 가로 스크롤.

## Tab / TabBar (특수)

```tsx
import { Tab, TabBar } from "@/components/ui";

<TabBar>
  <Tab active={tab === "a"} onClick={() => setTab("a")}>장비 에셋</Tab>
  <Tab active={tab === "b"} onClick={() => setTab("b")}>콜라이더</Tab>
</TabBar>
```
밑줄형 탭. `active`로 선택 상태 표시. **레퍼런스**: `pages/unityAsset/UnityAssetManagePage.tsx`.

## IconButton (특수)

```tsx
import { IconButton } from "@/components/ui";

<IconButton aria-label="닫기" onClick={onClose}>×</IconButton>
<IconButton aria-label="위로" size="sm">↑</IconButton>
```
아이콘 전용 정사각 버튼. 닫기 ×, 순서 ↑↓, 확인 ✓ 등. **접근성을 위해 `aria-label` 필수.**
size: `md`(기본) | `sm`.

## Toggle (특수)

```tsx
import { Toggle } from "@/components/ui";

<Toggle on={active} onClick={() => setActive(!active)}>활성</Toggle>
<Toggle on={logic === "AND"} onClick={() => setLogic("AND")}>AND</Toggle>
```
2상태 pill 토글(필터 칩, AND·OR, ON·OFF 등). `on`으로 활성 상태 표시.

> 위 3종은 표준 액션 버튼(`Button`)과 달리 **탭/아이콘/토글 전용**이다. 기존 화면의 커스텀
> 탭·아이콘·토글 버튼을 점진적으로 이 프리미티브로 교체할 수 있다.

## Pagination

```tsx
import Pagination from "@/components/common/Pagination";

<Pagination data={pageData} onPageChange={(p) => setPage(p)} />
```
`data`는 Spring Page 응답 형태(`{ totalPages, number, totalElements, first, last }`)를 따른다.

## 기존 화면 마이그레이션 가이드

화면마다 중복 정의된 `styled.button`을 `Button`으로 교체한다.

| 기존(인라인) | 교체 |
|---|---|
| 파란 등록 버튼 (`#2563eb`) | `<Button variant="primary">` |
| 슬레이트 검색/수정 (`#4a6380`) | `<Button variant="secondary">` (행 내부는 `size="sm"`) |
| 빨강 삭제 (`#dc2626`) | `<Button variant="danger" size="sm">` |
| 흰 배경 취소 (`#fff`+`#d1d5db`) | `<Button variant="outline">` |

교체 후 해당 `styled.button` 정의를 삭제한다.
**레퍼런스 적용 예시**: `src/pages/unityAsset/AssetManageTab.tsx` (검색/등록/수정/삭제 버튼 전부
`Button`으로 교체 완료).

## 규칙
- 새 버튼/페이지네이션을 인라인 `styled.button`으로 만들지 말 것.
- 색상은 토큰만 사용(직접 hex 금지).
- 새 프리미티브(Input, Badge, Modal 등)가 필요하면 `src/components/ui/`에 추가하고 이 문서를
  갱신한다.
