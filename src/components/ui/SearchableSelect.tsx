import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import styled, { css } from "styled-components";
import { colors, radius, fontSize, shadow } from "@/styles/tokens";

/**
 * 검색형 콤보박스 (제네릭, controlled).
 *
 * native <select> 가 불편한 대형 옵션 목록(수백~수천 항목)을 위한 재사용 컴포넌트.
 * 입력창 + absolute 드롭다운, `label` 부분일치(대소문자 무시) 실시간 필터,
 * 마우스/키보드(Esc·↑↓ 순환·Enter) 선택, 바깥 클릭 닫힘을 제공한다.
 *
 * 원래 DeviceHierarchyFilter 인라인 콤보박스 구현을 일반화한 것으로,
 * 장비 선택·카테고리 기본 3D 에셋 선택 등에서 공용으로 사용한다.
 */
export interface SearchableSelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  /** controlled 값. 빈 문자열/null = 미선택 */
  value: string | number | "" | null;
  /** 선택 변경 콜백. 빈 문자열("") = 선택 해제 */
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  /** 옵션이 0개일 때 문구 */
  emptyText?: string;
  /** 검색 결과가 0개일 때 문구 */
  noMatchText?: string;
  /** X(해제) 버튼 노출 여부 (기본 true) */
  allowClear?: boolean;
  className?: string;
}

const LOADING_TEXT = "불러오는 중…";

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = "검색/선택",
  disabled = false,
  loading = false,
  emptyText = "항목이 없습니다",
  noMatchText = "검색 결과 없음",
  allowClear = true,
  className,
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeOptionRef = useRef<HTMLButtonElement>(null);

  const effectiveDisabled = disabled || loading;

  const hasValue = value !== "" && value !== null && value !== undefined;

  const selectedOption = useMemo(() => {
    if (!hasValue) return null;
    return options.find((o) => String(o.value) === String(value)) ?? null;
  }, [options, value, hasValue]);

  // 검색어(부분일치, 대소문자 무시)로 필터
  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  // 바깥 클릭 시 닫힘
  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  // 키보드 하이라이트 항목을 뷰에 스크롤
  useEffect(() => {
    if (open && activeOptionRef.current) {
      activeOptionRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  const openDropdown = useCallback(() => {
    if (effectiveDisabled) return;
    setOpen(true);
    setActiveIndex(-1);
  }, [effectiveDisabled]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setSearch("");
    setActiveIndex(-1);
  }, []);

  const pickOption = useCallback(
    (option: SearchableSelectOption) => {
      onChange(String(option.value));
      setOpen(false);
      setSearch("");
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onChange]
  );

  const clearValue = useCallback(() => {
    onChange("");
    setSearch("");
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, [onChange]);

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        closeDropdown();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        openDropdown();
        return;
      }
      setActiveIndex((prev) =>
        filteredOptions.length === 0 ? -1 : (prev + 1) % filteredOptions.length
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return;
      setActiveIndex((prev) =>
        filteredOptions.length === 0
          ? -1
          : (prev - 1 + filteredOptions.length) % filteredOptions.length
      );
      return;
    }
    if (e.key === "Enter") {
      if (open && activeIndex >= 0 && activeIndex < filteredOptions.length) {
        e.preventDefault();
        pickOption(filteredOptions[activeIndex]);
      }
    }
  };

  // 입력창 표시값: 열려 있으면 검색어, 닫혀 있으면 선택 라벨
  const inputValue = open ? search : selectedOption?.label ?? "";

  const showClear = allowClear && hasValue && !effectiveDisabled;

  const renderDropdown = () => {
    if (loading) {
      return <ComboStatus>{LOADING_TEXT}</ComboStatus>;
    }
    if (options.length === 0) {
      return <ComboStatus>{emptyText}</ComboStatus>;
    }
    if (filteredOptions.length === 0) {
      return <ComboStatus>{noMatchText}</ComboStatus>;
    }
    return filteredOptions.map((o, idx) => {
      const active = idx === activeIndex;
      const selected = String(o.value) === String(value ?? "");
      return (
        <ComboOption
          key={o.value}
          ref={active ? activeOptionRef : undefined}
          type="button"
          role="option"
          aria-selected={selected}
          $active={active}
          $selected={selected}
          // onMouseDown(preventDefault): input blur 로 인한 목록 언마운트보다 먼저 선택 처리
          onMouseDown={(e) => {
            e.preventDefault();
            pickOption(o);
          }}
          onMouseEnter={() => setActiveIndex(idx)}
        >
          <ComboOptionName>{o.label}</ComboOptionName>
          {o.sublabel ? <ComboOptionMeta>{o.sublabel}</ComboOptionMeta> : null}
        </ComboOption>
      );
    });
  };

  return (
    <ComboControl ref={rootRef} className={className}>
      <ComboInput
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        value={inputValue}
        placeholder={placeholder}
        disabled={effectiveDisabled}
        $hasClear={showClear}
        onFocus={openDropdown}
        onChange={(e) => {
          setSearch(e.target.value);
          setActiveIndex(-1);
          if (!open) setOpen(true);
        }}
        onKeyDown={handleInputKeyDown}
      />
      {showClear ? (
        <ComboClearBtn
          type="button"
          aria-label="선택 해제"
          title="선택 해제"
          onMouseDown={(e) => {
            e.preventDefault();
            clearValue();
          }}
        >
          ×
        </ComboClearBtn>
      ) : null}
      {open ? (
        <ComboDropdown role="listbox">{renderDropdown()}</ComboDropdown>
      ) : null}
    </ComboControl>
  );
};

export default SearchableSelect;

/* ── 스타일 (DeviceHierarchyFilter 인라인 콤보박스에서 이관) ───────── */

const CONTROL_HEIGHT = "36px";

const ComboControl = styled.div`
  position: relative;
  width: 100%;
  min-width: 132px;
`;

const ComboInput = styled.input<{ $hasClear?: boolean }>`
  box-sizing: border-box;
  width: 100%;
  height: ${CONTROL_HEIGHT};
  padding: 0 ${({ $hasClear }) => ($hasClear ? "28px" : "10px")} 0 10px;
  border: 1px solid #d0d3d8;
  border-radius: 4px;
  font-size: 13px;
  line-height: normal;
  background: #fff;
  color: ${colors.textStrong};
  outline: none;
  transition: border-color 0.15s;

  &::placeholder {
    color: ${colors.textSubtle};
  }
  &:focus {
    border-color: ${colors.accent};
  }
  &:focus-visible {
    border-color: ${colors.accent};
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.35);
  }
  &:disabled {
    background: #f4f5f7;
    color: #9ca3af;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ComboClearBtn = styled.button`
  position: absolute;
  top: 50%;
  right: 6px;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: ${radius.pill};
  background: transparent;
  color: ${colors.textMuted};
  font-size: 15px;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: ${colors.surfaceHover};
    color: ${colors.textStrong};
  }
  &:focus-visible {
    outline: 2px solid ${colors.accent};
    outline-offset: 1px;
  }
`;

const ComboDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 50;
  width: 100%;
  min-width: 220px;
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: ${radius.md};
  box-shadow: ${shadow.md};
`;

const ComboOption = styled.button<{ $active?: boolean; $selected?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: ${radius.sm};
  background: ${({ $active }) => ($active ? colors.surfaceHover : "transparent")};
  text-align: left;
  cursor: pointer;

  ${({ $selected }) =>
    $selected &&
    css`
      font-weight: 600;
    `}

  &:focus-visible {
    outline: 2px solid ${colors.accent};
    outline-offset: -2px;
  }
`;

const ComboOptionName = styled.span`
  font-size: ${fontSize.sm};
  color: ${colors.textStrong};
  line-height: 1.3;
`;

const ComboOptionMeta = styled.span`
  font-size: ${fontSize.xs};
  color: ${colors.textSubtle};
  line-height: 1.2;
`;

const ComboStatus = styled.div`
  padding: 10px 8px;
  font-size: ${fontSize.sm};
  color: ${colors.textMuted};
  text-align: center;
`;
