import styled, { keyframes } from "styled-components";

/**
 * @param {{ visible: boolean; message?: string }} props
 */
const GlobalLoadingOverlay = ({ visible, message = "처리 중…" }) => {
  if (!visible) return null;

  return (
    <Backdrop role="status" aria-live="polite" aria-busy="true">
      <Panel>
        <Spinner aria-hidden />
        <Message>{message}</Message>
      </Panel>
    </Backdrop>
  );
};

export default GlobalLoadingOverlay;

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.72);
  pointer-events: all;
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 24px 32px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #4a6380;
  border-radius: 50%;
  animation: ${spin} 0.75s linear infinite;
`;

const Message = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
`;
