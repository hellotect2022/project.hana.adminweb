import Modal from "@/components/modal/Modal";
import { setApiErrorModalHandler } from "@/utils/apiErrorModalBridge";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ModalContext = createContext(null);

export const ModalProvider = ({children}) => {
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: "",
        content: "",
        onConfirm: null,
        hideFooter: false,
        wide: false,
        full: false,
    })

    // 모달 열기 함수
    // hideFooter: true → 폼 등에서 본문만 표시(취소/확인 푸터 숨김)
    // wide: true → 넓은 모달(등록/수정 폼용)
    // full: true → 대형 모달(장비 등록 등 넓은 레이아웃)
    const openModal = useCallback(
        ({ title, content, onConfirm, hideFooter = false, wide = false, full = false }) => {
            setModalConfig({
                isOpen: true,
                title,
                content,
                onConfirm: hideFooter ? null : onConfirm,
                hideFooter,
                wide: full ? false : wide,
                full,
            })
        },
        []
    )

    const closeModal = useCallback(() => {
        setModalConfig((prev) => ({
            ...prev,
            isOpen: false,
            hideFooter: false,
            wide: false,
            full: false,
        }))
    }, [])

    useEffect(() => {
        setApiErrorModalHandler(({ message, errorCode }) => {
            setModalConfig({
                isOpen: true,
                title: "오류",
                content: (
                    <ApiErrorModalBody message={message} errorCode={errorCode} />
                ),
                onConfirm: null,
                hideFooter: false,
                wide: false,
                full: false,
            });
        });
        return () => setApiErrorModalHandler(null);
    }, []);

    return (
        <ModalContext.Provider value={{ openModal, closeModal }}>
            {children}
            {modalConfig.isOpen && (
                <Modal
                config={modalConfig}
                onClose={closeModal}
                />
            )}
        </ModalContext.Provider>
    );
}

export const useModal = () => useContext(ModalContext);

function ApiErrorModalBody({ message, errorCode }) {
    return (
        <div style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 12px", color: "#374151", whiteSpace: "pre-wrap" }}>
                {message}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                오류 코드: <strong>{errorCode}</strong>
            </p>
        </div>
    );
}
