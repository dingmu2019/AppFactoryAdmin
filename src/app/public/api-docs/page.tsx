'use client';

import { useEffect } from 'react';

export default function PublicApiDocsPage() {
  useEffect(() => {
    document.title = 'API Docs';
  }, []);

  return (
    <div className="h-screen w-full bg-white">
      <iframe title="API Docs" src="/api/public/docs" className="w-full h-full border-0" />
    </div>
  );
}

