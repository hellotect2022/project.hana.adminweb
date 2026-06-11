/**
 * 최근 방문 페이지 이력 Context (localStorage 저장)
 * 사이드 메뉴 클릭 시 addHistory 호출, 헤더에서 history 표시.
 */
import { createContext, useContext, useState, useCallback, useEffect } from "react";

const MAX_HISTORY = 5;
const STORAGE_KEY = "hdt-admin-sidebar-history";

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

const saveToStorage = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota exceeded 등 무시
  }
}

const SidebarHistoryContext = createContext(null);

export const RecentHistoryProvider = ({ children }) => {
  const [sidebarHistory, setSidebarHistory] = useState(loadFromStorage);

  useEffect(() => {
    saveToStorage(sidebarHistory);
  }, [sidebarHistory]);

  const addSidebarHistory = useCallback((path, label) => {
    if (!path || !label) return;
    setSidebarHistory((prev) => {
      const filtered = prev.filter((item) => item.path !== path);
      const next = [...filtered, { path, label }].slice(-MAX_HISTORY);
      return next;
    });
  }, []);

  const clearSidebarHistory = useCallback(() => setSidebarHistory([]), []);

  const removeSidebarHistory = useCallback((path) => {
    setSidebarHistory((prev) => {
      const filtered = prev.filter((item)=>item.path !== path);  
      return filtered
    })
  
  }, []);

  return (
    <SidebarHistoryContext.Provider value={{ sidebarHistory, addSidebarHistory, clearSidebarHistory, removeSidebarHistory }}>
      {children}
    </SidebarHistoryContext.Provider>
  );
}

export const useSidebarHistory = () => useContext(SidebarHistoryContext)
