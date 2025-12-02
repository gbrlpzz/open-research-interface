'use client';

import { useStore } from '@/lib/store';
import { Login } from '@/components/auth/Login';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ActivityBar } from '@/components/layout/ActivityBar';
import { Editor } from '@/components/editor/Editor';
import { ReferenceManager } from '@/components/references/ReferenceManager';
import { ReferenceSpace } from '@/components/references/ReferenceSpace';
import { useEffect, useState } from 'react';

export default function Home() {
  const { token, viewMode } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!token) {
    return <Login />;
  }

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      <ActivityBar />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-950">
        {viewMode === 'references' ? (
          <ReferenceSpace />
        ) : (
          <div className="flex-1 flex min-w-0">
            <Editor />
            <ReferenceManager />
          </div>
        )}
      </div>
    </main>
  );
}
