// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useState } from 'react';
import Layout from '../components/Layout';

export default function MyApp({ Component, pageProps }: AppProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // Opcional: Guardar en localStorage
    localStorage.setItem('darkMode', JSON.stringify(!isDarkMode));
  };

  return (
    <Layout
      isDarkMode={isDarkMode}
      onToggleDarkMode={toggleDarkMode}
    >
      <Component {...pageProps} />
    </Layout>
  );
}