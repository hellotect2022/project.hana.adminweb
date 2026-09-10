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

const initialConfig: ModalConfig = {
    isOpen: false,
    title: "",
    content: "",
    onConfirm: null,
    onCancel: null,
    hideFooter: false,
    hideCancel: false,
    wide: false,
    full: false,
};

export const ModalProvider = ({children}) => {
    // openModal 전용 상태
    const [modalConfig, setModalConfig] = useState<ModalConfig>(initialConfig)

    // showAlert / showConfirm / apiError 핸들러 전용 상태 (별도 레이어)
    const [dialogConfig, setDialogConfig] = useState<ModalConfig>(initialConfig)

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

    // dialogConfig(알림/확인/에러) 전용 닫기 — closeModal 과 동일 리셋 로직
    const closeDialog = useCallback(() => {
        setDialogConfig((prev) => ({
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
            setDialogConfig({
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
            setDialogConfig({
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
            setDialogConfig({
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
            {/* openModal 전용 일반 모달 */}
            {modalConfig.isOpen && (
                <Modal
                config={modalConfig}
                onClose={closeModal}
                />
            )}
            {/* 알림/확인/에러 전용 다이얼로그 — 일반 모달 위에 별도 레이어로 표시.
                Modal 오버레이 z-index(9999)가 고정값이라, 더 높은 stacking context 래퍼로 위에 띄운다. */}
            {dialogConfig.isOpen && (
                <div style={{ position: "relative", zIndex: 10000 }}>
                    <Modal
                    config={dialogConfig}
                    onClose={closeDialog}
                    />
                </div>
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
