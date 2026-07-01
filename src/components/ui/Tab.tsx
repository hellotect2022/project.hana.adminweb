import styled from "styled-components";
import { colors, fontSize } from "@/styles/tokens";

/**
 * 밑줄형 탭. 목록/상세의 탭 전환에 사용.
 *   <TabBar>
 *     <Tab active={tab==="a"} onClick={()=>setTab("a")}>장비 에셋</Tab>
 *     <Tab active={tab==="b"} onClick={()=>setTab("b")}>콜라이더</Tab>
 *   </TabBar>
 */
export interface TabProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

const Tab = ({ active = false, type = "button", ...rest }: TabProps) => (
  <StyledTab $active={active} type={type} {...rest} />
);

export default Tab;

export const TabBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid ${colors.borderLight};
`;

const StyledTab = styled.button<{ $active?: boolean }>`
  padding: 10px 20px;
  font-size: ${fontSize.md};
  font-weight: 600;
  color: ${(p) => (p.$active ? colors.primary : colors.textMuted)};
  background: none;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? colors.primary : "transparent")};
  margin-bottom: -1px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: ${colors.primary};
  }
`;
