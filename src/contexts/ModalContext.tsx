import Modal from "@/components/modal/Modal";
import { setApiErrorModalHandler } from "@/utils/apiErrorModalBridge";
import { setDialogHandlers } from "@/utils/dialogBridge";
import type { DialogOptions } from "@/utils/dialogBridge";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

const ModalContext = createContext(null);

type ModalConfig = {
    isOpen: boolean;
    title: ReactNode;
    content: ReactNode;
    onConfirm: (() => void) | null;
    onCancel: (() => void) | null;
    hideFooter: boolean;
    hideCancel: boolean;
    wide: boolean;
    full: boolean;
};

export const ModalProvider = ({children}) => {
    const [modalConfig, setModalConfig] = useState<ModalConfig>({
        isOpen: false,
        title: "",
        content: "",
        onConfirm: null,
        onCancel: null,
        hideFooter: false,
        hideCancel: false,
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
                onCancel: null,
                hideFooter,
                hideCancel: false,
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
            hideCancel: false,
            wide: false,
            full: false,
        }))
    }, [])

    // 전역 알림 모달(확인 1버튼) — 기존 alert() 대체
    const showAlert = useCallback((message: string, options?: DialogOptions) => {
        return new Promise<void>((resolve) => {
            setModalConfig({
                isOpen: true,
                title: options?.title ?? "알림",
                content: <DialogMessageBody message={message} />,
                onConfirm: () => resolve(),
                onCancel: () => resolve(),
                hideFooter: false,
                hideCancel: true,
                wide: false,
                full: false,
            });
        });
    }, []);

    // 전역 확인 모달(취소/확인) — 기존 confirm() 대체, Promise<boolean>
    const showConfirm = useCallback((message: string, options?: DialogOptions) => {
        return new Promise<boolean>((resolve) => {
            setModalConfig({
                isOpen: true,
                title: options?.title ?? "확인",
                content: <DialogMessageBody message={message} />,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
                hideFooter: false,
                hideCancel: false,
                wide: false,
                full: false,
            });
        });
    }, []);

    useEffect(() => {
        setDialogHandlers({ alert: showAlert, confirm: showConfirm });
        return () => setDialogHandlers(null);
    }, [showAlert, showConfirm]);

    useEffect(() => {
        setApiErrorModalHandler(({ message, errorCode }) => {
            setModalConfig({
                isOpen: true,
                title: "오류",
                content: (
                    <ApiErrorModalBody message={message} errorCode={errorCode} />
                ),
                onConfirm: null,
                onCancel: null,
                hideFooter: false,
                hideCancel: false,
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

function DialogMessageBody({ message }: { message: string }) {
    return (
        <p style={{ margin: 0, color: "#374151", whiteSpace: "pre-wrap", textAlign: "center" }}>
            {message}
        </p>
    );
}

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
