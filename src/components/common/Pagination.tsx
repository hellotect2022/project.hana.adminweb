import styled from "styled-components";

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
  font-size: 13px;
  color: #6b7280;

  strong {
    color: #374151;
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
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const PageBtn = styled.button`
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? "700" : "500")};
  color: ${(p) => (p.$active ? "#fff" : "#374151")};
  background: ${(p) => (p.$active ? "#4a6380" : "#fff")};
  border: 1px solid ${(p) => (p.$active ? "#4a6380" : "#d1d5db")};
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  &:hover:not(:disabled) {
    background: ${(p) => (p.$active ? "#3d5370" : "#f3f4f6")};
    border-color: ${(p) => (p.$active ? "#3d5370" : "#9ca3af")};
  }
`;

const Ellipsis = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 34px;
  font-size: 14px;
  color: #9ca3af;
  user-select: none;
  letter-spacing: 1px;
`;
