'use client';

import { useStore } from '@/lib/store';
import { Login } from '@/components/auth/Login';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Editor } from '@/components/editor/Editor';
import { ReferenceManager } from '@/components/references/ReferenceManager';
import { PaperWorkspace } from '@/components/editor/PaperWorkspace';
import { useEffect, useState } from 'react';

export default function Home() {
  const token = useStore((state) => state.token);
  const viewMode = useStore((state) => state.viewMode);
  const currentRepo = useStore((state) => state.currentRepo);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!token) {
    return <Login />;
  }

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      <Sidebar />
      {viewMode === 'paper' && currentRepo ? (
        <PaperWorkspace />
      ) : (
        <>
          <Editor />
          <ReferenceManager />
        </>
      )}
  </main>
  );
}
