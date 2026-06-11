import { useEffect } from "react";
import AppRouter from "./routes/AppRouter";
import { AuthProvider } from "./contexts/AuthContext";
import { ModalProvider } from "./contexts/ModalContext";
import { RecentHistoryProvider } from "./contexts/SidebarHistoryContext";
import { QueryClient,QueryClientProvider } from "@tanstack/react-query";
import { LoadingProvider } from "./contexts/LoadingContext";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
function App() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'classic');
    // 만약 테마에 따라 폰트를 바꾸고 싶다면 CSS에서 처리하는 게 정석입니다.
  }, []);

  return (
    // <ThemeProvider>
    //   <AuthProvider>
    //     <ModalProvider>
    //       <GlobalStyle/>
    <QueryClientProvider client={queryClient}>
      <ModalProvider>
        <AuthProvider>
          <RecentHistoryProvider>
            <LoadingProvider>
              <AppRouter/>
            </LoadingProvider>
          </RecentHistoryProvider>
        </AuthProvider>
      </ModalProvider>
    </QueryClientProvider>
    //     {/* </ModalProvider>  
    //   </AuthProvider>  
    // </ThemeProvider> */}
    )
}

export default App
