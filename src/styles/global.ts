import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; margin: 0; }
  body {
    font-family: system-ui, -apple-system, 'Segoe UI', 'Noto Sans KR', sans-serif;
    background: ${(p) => p.theme.colors.bg};
    color: ${(p) => p.theme.colors.text};
  }
  a { color: inherit; text-decoration: none; }
  button { font-family: inherit; }
  div {
    overflow-y: auto;
    &::-webkit-scrollbar {
          display: none; 
      }

      /* 3. 파이어폭스 (Gecko 엔진) */
      scrollbar-width: none; 

      /* 4. 인터넷 익스플로러 및 구형 엣지 */
      -ms-overflow-style: none;
  }
`;
