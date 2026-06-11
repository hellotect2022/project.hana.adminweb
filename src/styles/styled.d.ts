import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      bg: string;
      panel: string;
      border: string;
      text: string;
      subtext: string;
      headerBg: string;
      headerText: string;
      primary: string;
      accent: string;
    };
  }
}
