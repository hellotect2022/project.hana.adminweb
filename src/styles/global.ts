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
`;
