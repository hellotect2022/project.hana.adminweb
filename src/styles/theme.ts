import type { DefaultTheme } from 'styled-components';

// admin 디자인 톤을 수용한 기본 테마(이후 admin CSS 정밀 이식 시 이 값들을 교체).
export const theme: DefaultTheme = {
  colors: {
    bg: '#f4f6f9',
    panel: '#ffffff',
    border: '#e2e6ec',
    text: '#1f2530',
    subtext: '#6b7280',
    headerBg: '#1f2937',
    headerText: '#e8ecf2',
    primary: '#3a6ff7',
    accent: '#2fae6a',
  },
};
