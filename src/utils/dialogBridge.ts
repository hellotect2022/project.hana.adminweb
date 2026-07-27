/**
 * 전역 알림/확인 다이얼로그 브리지.
 * ModalProvider 마운트 시 실제 핸들러를 등록하고, 어디서든 훅 없이
 * showAlert / showConfirm 을 호출해 기존 Modal 컴포넌트를 띄운다.
 * (apiErrorModalBridge 와 동일한 패턴)
 */

export type DialogOptions = { title?: string };

type AlertFn = (message: string, options?: DialogOptions) => Promise<void>;
type ConfirmFn = (message: string, options?: DialogOptions) => Promise<boolean>;

let alertHandler: AlertFn | null = null;
let confirmHandler: ConfirmFn | null = null;

/**
 * ModalProvider 마운트 시 등록 / 언마운트 시 null 로 해제.
 */
export function setDialogHandlers(
  handlers: { alert: AlertFn; confirm: ConfirmFn } | null
) {
  alertHandler = handlers ? handlers.alert : null;
  confirmHandler = handlers ? handlers.confirm : null;
}

/**
 * 알림 모달(확인 1버튼). 기존 alert() 대체.
 */
export function showAlert(message: string, options?: DialogOptions): Promise<void> {
  if (!alertHandler) {
    console.warn("[dialogBridge] alert handler not registered:", message);
    return Promise.resolve();
  }
  return alertHandler(message, options);
}

/**
 * 확인 모달(취소/확인). 기존 confirm() 대체. Promise<boolean> 반환.
 */
export function showConfirm(
  message: string,
  options?: DialogOptions
): Promise<boolean> {
  if (!confirmHandler) {
    console.warn("[dialogBridge] confirm handler not registered:", message);
    return Promise.resolve(false);
  }
  return confirmHandler(message, options);
}
