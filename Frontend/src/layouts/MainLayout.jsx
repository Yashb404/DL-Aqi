import Head from 'next/head';

export default function MainLayout({ children, title = 'Delhi AQI Visualization' }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Head>
        <title>{title}</title>
        <meta name="description" content="High-resolution air quality mapping for Delhi" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
} 