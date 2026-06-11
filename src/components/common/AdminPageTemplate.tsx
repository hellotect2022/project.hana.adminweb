import styled from "styled-components";

/**
 * 관리 기능 공통 페이지 템플릿
 * @param {string} title - 페이지 제목
 * @param {string} [description] - 부가 설명 (선택)
 * @param {React.ReactNode} [children] - 본문 내용
 */
const AdminPageTemplate = ({ title, description, children }) => {
  return (
    <Wrapper>
      <PageHeader>
        <PageTitle>{title}</PageTitle>
        {description && <PageDescription>{description}</PageDescription>}
      </PageHeader>
      <ContentCard>
        {children || <Placeholder>콘텐츠 영역</Placeholder>}
      </ContentCard>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  /* border:1px solid red; */
  max-width: 100%;
  flex:1;
  display: flex;
  flex-direction: column;
  overflow-y: scroll ;
  &::-webkit-scrollbar { 
    display: none;
  }
`;

const PageHeader = styled.header`
  margin-bottom: 20px;
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #111d2c;
  margin: 0 0 8px 0;
`;

const PageDescription = styled.p`
  font-size: 14px;
  color: #566a7f;
  margin: 0;
`;

const ContentCard = styled.div`
  //border:2px solid black;
  //background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  //padding: 24px;
  //min-height: 320px;
  flex:1;
  
`;

const Placeholder = styled.div`
  color: #a6adb4;
  font-size: 14px;
  padding: 20px 0;
`;

export default AdminPageTemplate;
