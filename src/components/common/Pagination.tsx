import styled from "styled-components";
import { colors, radius, fontSize } from "@/styles/tokens";

/**
 * 현재 페이지 주변만 표시하고, 건너뛴 구간은 … 처리
 * @param {number} current 0-based
 * @param {number} totalPages
 * @param {number} [siblingCount=2]
 * @returns {(number | 'ellipsis')[]}
 */
export function buildPaginationRange(current, totalPages, siblingCount = 2) {
  if (totalPages <= 0) return [];
  if (totalPages <= 1) return [0];

  const range = [];
  for (let i = 0; i < totalPages; i++) {
    if (
      i === 0 ||
      i === totalPages - 1 ||
      (i >= current - siblingCount && i <= current + siblingCount)
    ) {
      range.push(i);
    }
  }

  const withEllipsis = [];
  let prev = null;
  for (const page of range) {
    if (prev !== null) {
      if (page - prev === 2) {
        withEllipsis.push(prev + 1);
      } else if (page - prev > 1) {
        withEllipsis.push("ellipsis");
      }
    }
    withEllipsis.push(page);
    prev = page;
  }
  return withEllipsis;
}

/**
 * @param {{
 *   data: {
 *     totalPages: number;
 *     number: number;
 *     totalElements?: number;
 *     first?: boolean;
 *     last?: boolean;
 *   };
 *   onPageChange: (page: number) => void;
 *   showSummary?: boolean;
 *   siblingCount?: number;
 *   hideOnSinglePage?: boolean;
 * }} props
 */
const Pagination = ({
  data,
  onPageChange,
  showSummary = true,
  siblingCount = 2,
  hideOnSinglePage = true,
}) => {
  if (!data) return null;

  const {
    totalPages = 0,
    number: currentPage = 0,
    totalElements,
    first = currentPage <= 0,
    last = currentPage >= totalPages - 1,
  } = data;

  if (hideOnSinglePage && totalPages <= 1) return null;

  const items = buildPaginationRange(currentPage, totalPages, siblingCount);

  return (
    <Wrap>
      {showSummary && totalElements != null && (
        <Summary>
          총 <strong>{totalElements.toLocaleString()}</strong>건 ·{" "}
          <strong>{currentPage + 1}</strong> / {totalPages} 페이지
        </Summary>
      )}
      <Nav aria-label="페이지 이동">
        <NavBtn type="button" disabled={first} onClick={() => onPageChange(currentPage - 1)}>
          이전
        </NavBtn>

        {items.map((item, idx) =>
          item === "ellipsis" ? (
            <Ellipsis key={`ellipsis-${idx}`}>…</Ellipsis>
          ) : (
            <PageBtn
              key={item}
              type="button"
              $active={item === currentPage}
              onClick={() => onPageChange(item)}
              aria-current={item === currentPage ? "page" : undefined}
            >
              {item + 1}
            </PageBtn>
          )
        )}

        <NavBtn type="button" disabled={last} onClick={() => onPageChange(currentPage + 1)}>
          다음
        </NavBtn>
      </Nav>
    </Wrap>
  );
};

export default Pagination;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding-top: 4px;
`;

const Summary = styled.p`
  margin: 0;
  font-size: ${fontSize.sm};
  color: ${colors.textMuted};

  strong {
    color: ${colors.text};
    font-weight: 600;
  }
`;

const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px;
  max-width: 100%;
`;

const NavBtn = styled.button`
  min-width: 52px;
  height: 34px;
  padding: 0 12px;
  font-size: ${fontSize.sm};
  font-weight: 500;
  color: ${colors.text};
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: ${radius.md};
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover:not(:disabled) {
    background: ${colors.surfaceHover};
    border-color: ${colors.borderHover};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const PageBtn = styled.button<{ $active?: boolean }>`
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  font-size: ${fontSize.sm};
  font-weight: ${(p) => (p.$active ? "700" : "500")};
  color: ${(p) => (p.$active ? colors.white : colors.text)};
  background: ${(p) => (p.$active ? colors.secondary : colors.surface)};
  border: 1px solid ${(p) => (p.$active ? colors.secondary : colors.border)};
  border-radius: ${radius.md};
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  &:hover:not(:disabled) {
    background: ${(p) => (p.$active ? colors.secondaryHover : colors.surfaceHover)};
    border-color: ${(p) => (p.$active ? colors.secondaryHover : colors.borderHover)};
  }
`;

const Ellipsis = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 34px;
  font-size: ${fontSize.md};
  color: ${colors.textSubtle};
  user-select: none;
  letter-spacing: 1px;
`;
