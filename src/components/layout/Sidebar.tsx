import { useState } from "react";
import { NavLink } from "react-router-dom";
import styled from "styled-components";
import { SvgIcons } from "../common/Icon";
import { menuData } from "@/constants/menuData";
import { useAuth } from "@/contexts/AuthContext";
import {useSidebarHistory } from "@/contexts/SidebarHistoryContext";

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const toggleSidebar = () => setIsCollapsed(!isCollapsed); // 사이드바 확장/축소
    const { user } = useAuth();
    const { addSidebarHistory } = useSidebarHistory();

    const SidebarMenu = ({ isCollapsed }) => {
      return (
        <MenuContainer>
          {menuData.map((section, idx) => (
            <div key={idx}>
              <CategoryTitle>{isCollapsed ? section.abbr : section.label}</CategoryTitle>
              {section.items.map((item, itemIdx) =>
                item.disabled ? (
                  <MenuItemDisabled
                    key={itemIdx}
                    title={item.disabledReason ?? "준비 중인 메뉴입니다."}
                  >
                    {(item as any).icon}
                    <MenuText $isCollapsed={isCollapsed}>{item.title}</MenuText>
                  </MenuItemDisabled>
                ) : (
                  <MenuItem
                    key={itemIdx}
                    to={item.path}
                    end
                    title={isCollapsed ? item.title : ""}
                    onClick={() => addSidebarHistory(item.path, item.title)}
                  >
                    {(item as any).icon}
                    <MenuText $isCollapsed={isCollapsed}>{item.title}</MenuText>
                  </MenuItem>
                )
              )}
            </div>
          ))}
        </MenuContainer>
      );
    };

    return (
        <SidebarContainer $isCollapsed={isCollapsed}>
            {/* 상단 로고 및 토글 버튼 영역 */}
            <LogoSection onClick={toggleSidebar}>
                <SvgIcons.Hana width={24} height={24}/>
                {!isCollapsed && (
                    <LogoTextWrapper>
                        <LogoText>하나드림타운</LogoText>
                        <AdminText>관리자</AdminText>
                    </LogoTextWrapper>
                )}
            </LogoSection>

            {/* 2. 프로필 영역 */}
            <ProfileSection $isCollapsed={isCollapsed}>
                {isCollapsed ? (
                <CollapsedProfileIcon>
                    <SvgIcons.User width={24} height={24}/>
                </CollapsedProfileIcon>
                ) : (
                <>
                    <UserInfo>
                        <NameText>
                            {user.name} <span></span>
                        </NameText>
                        <TeamBadge>{user?.role?.[0]}</TeamBadge>
                    </UserInfo>
                    <SubInfo>email : {user.email}</SubInfo>
                </>
                )}
                <Divider />
            </ProfileSection>

            {/* 3. 메뉴 영역 */}
            <SidebarMenu isCollapsed={isCollapsed}/>

        </SidebarContainer>
    )

}


const SidebarContainer = styled.aside<{ $isCollapsed?: boolean }>`
  width: ${props => (props.$isCollapsed ? '80px' : '260px')};
  min-width: ${props => (props.$isCollapsed ? '80px' : '260px')};
  background-color: #111d2c; // 이미지의 짙은 네이비 톤
  color: #fff;
  height: 100vh;
  transition: width 0.3s ease; // 부드러운 확장/축소 애니메이션
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
`;

const LogoSection = styled.div`
  padding: 20px 24px;
  display: flex;
  align-items: center;
  cursor: pointer;
  min-height: 64px;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

const LogoTextWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-left: 12px;
  gap: 8px;
`;

const LogoText = styled.span`
  font-family: 'HanaFont', sans-serif; // 전용 폰트 적용 위치
  font-size: 19px;
  font-weight: 400;
  color: #ffffff;
  white-space: nowrap;
`;

const AdminText = styled.span`
  font-size: 16px;
  font-weight: 400;
  color: #ffffff;
  opacity: 0.9;
  white-space: nowrap;
`;

const ProfileSection = styled.div<{ $isCollapsed?: boolean }>`
  padding: ${props => (props.$isCollapsed ? '20px 0' : '24px')};
  display: flex;
  flex-direction: column;
  align-items: ${props => (props.$isCollapsed ? 'center' : 'flex-start')};
`;

const CollapsedProfileIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #a6adb4;
`;

const UserInfo = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const NameText = styled.div`
  font-size: 20px;
  font-weight: 700;
  span {
    font-size: 16px;
    font-weight: 400;
    margin-left: 6px;
  }
`;

const TeamBadge = styled.span`
  background-color: rgba(0, 209, 178, 0.1);
  color: #00d1b2;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
`;

const SubInfo = styled.div`
  font-size: 14px;
  color: #a6adb4;
`;

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  margin-top: 20px;
`;

//  메뉴 관련 style 들 
const MenuContainer = styled.nav`
  flex: 1;
  overflow-y: auto;
  width: 100%;
  overflow-x: hidden;
  padding: 12px 0;
  
  /* 스크롤바 커스텀 */
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
`;

const CategoryTitle = styled.div`
  padding: 16px 24px 8px;
  font-size: 12px;
  color: #566a7f; /* 흐린 회색 */
  text-transform: uppercase;
  white-space: nowrap;    /* 절대 줄바꿈 안 함 */
  text-overflow: ellipsis; /* 넘치는 부분은 ... 처리 (보험용) */
  width: 100%;
`;

const MenuItem = styled(NavLink)`
  display: flex;
  align-items: center;
  padding: 12px 24px;
  cursor: pointer;
  color: #a6adb4;
  transition: all 0.2s;
  text-decoration: none;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: #fff;
  }

  &.active {
    background-color: rgba(0, 209, 178, 0.15);
    color: #00d1b2;
  }

  svg {
    font-size: 20px;
    min-width: 24px;
  }
`;

const MenuItemDisabled = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 24px;
  cursor: not-allowed;
  color: #566a7f;
  opacity: 0.55;
  user-select: none;

  svg {
    font-size: 20px;
    min-width: 24px;
  }
`;

const MenuText = styled.span<{ $isCollapsed?: boolean }>`
  margin-left: 12px;
  font-size: 14px;
  white-space: nowrap;
  display: ${props => props.$isCollapsed ? 'none' : 'block'};
`;

export default Sidebar;