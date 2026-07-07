import styled from "styled-components";
import { SvgIcons } from "../common/Icon";
import { Button } from "@/components/ui";

const Modal = ({ config, onClose }) => {
  const { isOpen, title, content, onConfirm, hideFooter, wide, full } = config;
  if (!isOpen) return null;

  const showFooter = !hideFooter;

  return (
    <Backdrop 
    // onClick={onClose}
    >
      <ModalContainer $wide={wide} $full={full} onClick={(e) => e.stopPropagation()}>
        <CloseRow>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <SvgIcons.Cross />
          </button>
        </CloseRow>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody $alignLeft={hideFooter || wide || full}>{content}</ModalBody>
        {showFooter && (
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              style={{ width: 137, height: 36 }}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              style={{ width: 137, height: 36 }}
            >
              확인
            </Button>
          </ModalFooter>
        )}
      </ModalContainer>
    </Backdrop>
  );
};

export default Modal;

// --- Styled Components (기존과 동일) ---
const Backdrop = styled.div`
  position: fixed;
  inset: 0; 
  background: rgba(0, 0, 0, 0.5);
  display: flex; 
  justify-content: center; 
  align-items: center; 
  z-index: 9999;
`;
const CloseRow = styled.div`
  display: flex;
  justify-content: flex-end;
  button {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    &:hover {
      color: #111;
    }
  }
`;

const ModalContainer = styled.div<{ $wide?: boolean; $full?: boolean }>`
  background: white;
  padding: 10px 20px 20px;
  border-radius: 8px;
  width: ${(p) =>
    p.$full ? "min(96vw, 1240px)" : p.$wide ? "min(92vw, 720px)" : "auto"};
  min-width: ${(p) =>
    p.$full ? "min(96vw, 1240px)" : p.$wide ? "min(92vw, 720px)" : "320px"};
  max-width: ${(p) => (p.$full ? "min(96vw, 1240px)" : p.$wide ? "720px" : "90vw")};
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;
const ModalHeader = styled.h2` 
    display: flex;
    justify-content: center;
    margin: 0 0 16px 0; 
    font-size: 1.25rem; 
`;
const ModalBody = styled.div<{ $alignLeft?: boolean }>`
  //border:2px solid blue;
  display: ${(p) => (p.$alignLeft ? "block" : "flex")};
  justify-content: ${(p) => (p.$alignLeft ? "stretch" : "center")};
  margin-bottom: ${(p) => (p.$alignLeft ? "0" : "24px")};
  color: #4b5563;
  line-height: 1.5;
  text-align: ${(p) => (p.$alignLeft ? "left" : "center")};
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  //overflow-y: auto;
  /* 스크롤은 유지하되 스크롤바 표시는 숨김 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  &::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }
`;
const ModalFooter = styled.div`
 display: flex;
 justify-content: center;
 gap: 8px;
`;