import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import styled from "styled-components";
import GlobalLoadingOverlay from "@/components/common/GlobalLoadingOverlay";
import { useLoading } from "@/contexts/LoadingContext";

const MainLayout = () => {
    const { isGlobalLoading } = useLoading();

    return (
        <LayoutWrapper>
            <Sidebar/>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Header/>
                <ContentArea>
                    <GlobalLoadingOverlay visible={isGlobalLoading} />
                    <OutletWrap>
                        <Outlet/>
                    </OutletWrap>
                </ContentArea>
            </div>
        </LayoutWrapper>
    )
}



const LayoutWrapper = styled.div`
  //border: 3px solid purple;
  display: flex;
  max-height: 100vh;
`;

const ContentArea = styled.main`
  position: relative;
  height: 0px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 20px;
  background-color: var(--bg-color);
`;

const OutletWrap = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export default MainLayout;