/** @type {{ increment: () => void; decrement: () => void } | null} */
let bridge = null;

/**
 * LoadingProvider 마운트 시 등록
 * @param {{ increment: () => void; decrement: () => void } | null} handlers
 */
export function registerGlobalLoadingBridge(handlers) {
  bridge = handlers;
}

export function notifyLoadingStart() {
  bridge?.increment();
}

export function notifyLoadingEnd() {
  bridge?.decrement();
}
