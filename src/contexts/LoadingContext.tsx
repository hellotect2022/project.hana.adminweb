import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { registerGlobalLoadingBridge } from "@/utils/globalLoadingBridge";

const DEBOUNCE_MS = 200;

const LoadingContext = createContext(null);

function ReactQueryLoadingSubscriber({ onChange }) {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();

  useEffect(() => {
    onChange(isFetching > 0 || isMutating > 0);
  }, [isFetching, isMutating, onChange]);

  return null;
}

export const LoadingProvider = ({ children }) => {
  const [pendingHttpCount, setPendingHttpCount] = useState(0);
  const [debouncedHttpPending, setDebouncedHttpPending] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);

  const increment = useCallback(() => {
    setPendingHttpCount((c) => c + 1);
  }, []);

  const decrement = useCallback(() => {
    setPendingHttpCount((c) => Math.max(0, c - 1));
  }, []);

  useEffect(() => {
    registerGlobalLoadingBridge({ increment, decrement });
    return () => registerGlobalLoadingBridge(null);
  }, [increment, decrement]);

  useEffect(() => {
    if (pendingHttpCount > 0) {
      const timer = setTimeout(() => setDebouncedHttpPending(true), DEBOUNCE_MS);
      return () => clearTimeout(timer);
    }
    setDebouncedHttpPending(false);
  }, [pendingHttpCount]);

  const handleQueryLoadingChange = useCallback((active) => {
    setQueryLoading(active);
  }, []);

  const isGlobalLoading = debouncedHttpPending || queryLoading;

  return (
    <LoadingContext.Provider value={{ isGlobalLoading }}>
      <ReactQueryLoadingSubscriber onChange={handleQueryLoadingChange} />
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return ctx;
};
