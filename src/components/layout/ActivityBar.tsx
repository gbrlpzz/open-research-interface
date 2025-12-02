import { useStore } from '@/lib/store';
import { FolderGit2, BookOpen, Settings } from 'lucide-react';
import clsx from 'clsx';

export function ActivityBar() {
    const { viewMode, setViewMode } = useStore();

    return (
        <div className="w-12 h-full border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center py-4 gap-4 z-50">
            <button
                onClick={() => setViewMode('repo')}
                className={clsx(
                    "p-2 rounded-md transition-all duration-200",
                    viewMode === 'repo' || viewMode === 'paper'
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-sm"
                        : "text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                )}
                title="Repositories"
            >
                <FolderGit2 className="w-5 h-5" strokeWidth={2} />
            </button>
            <button
                onClick={() => setViewMode('references')}
                className={clsx(
                    "p-2 rounded-md transition-all duration-200",
                    viewMode === 'references'
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-sm"
                        : "text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                )}
                title="References"
            >
                <BookOpen className="w-5 h-5" strokeWidth={2} />
            </button>

            <div className="flex-1" />

            <button
                className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                title="Settings"
            >
                <Settings className="w-5 h-5" strokeWidth={2} />
            </button>
        </div>
    );
}
