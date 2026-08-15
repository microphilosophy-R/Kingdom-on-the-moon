import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'styled-components'
import App from './App'
import { uiTokens } from './theme'
import GlobalStyle from './styles/GlobalStyle'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={uiTokens}>
      <GlobalStyle />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
