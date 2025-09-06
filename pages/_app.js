import '../styles/globals.css'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Victor Opvang Tracker</title>
        <meta name="description" content="Platform om Victor's ophaaltijden te tracken en kosten te berekenen" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#3B82F6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Victor Tracker" />
        
        {/* Open Graph Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Victor Opvang Tracker" />
        <meta property="og:description" content="Eenvoudig ophaaltijden loggen en kosten berekenen" />
        
        {/* Preload belangrijke fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
