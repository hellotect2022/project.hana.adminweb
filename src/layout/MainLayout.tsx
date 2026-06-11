import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { Header } from './Header';

const Content = styled.main`
  padding: 24px;
  max-width: 1280px;
  margin: 0 auto;
`;

export function MainLayout() {
  return (
    <>
      <Header />
      <Content>
        <Outlet />
      </Content>
    </>
  );
}
