import { useStore } from '@/lib/store';
import { FolderGit2, BookOpen, Settings } from 'lucide-react';
import clsx from 'clsx';

export function ActivityBar() {
    const { viewMode, setViewMode, currentRepo } = useStore();

    return (
        <div className="w-12 h-full border-r border-olive-medium/20 bg-paper flex flex-col items-center py-4 gap-4 z-50 shadow-sm">
            <button
                onClick={() => {
                    if (currentRepo) {
                        setViewMode('paper');
                    } else {
                        setViewMode('repo');
                    }
                }}
                className={clsx(
                    "p-2 rounded-md transition-all duration-200",
                    viewMode === 'repo' || viewMode === 'paper'
                        ? "bg-olive-dark text-olive-light shadow-sm"
                        : "text-olive-medium hover:text-olive-dark hover:bg-olive-medium/10"
                )}
                title="Documents"
            >
                <FolderGit2 className="w-5 h-5" strokeWidth={2} />
            </button>
            <button
                onClick={() => setViewMode('references')}
                className={clsx(
                    "p-2 rounded-md transition-all duration-200",
                    viewMode === 'references'
                        ? "bg-olive-dark text-olive-light shadow-sm"
                        : "text-olive-medium hover:text-olive-dark hover:bg-olive-medium/10"
                )}
                title="References"
            >
                <BookOpen className="w-5 h-5" strokeWidth={2} />
            </button>

            <div className="flex-1" />

            <button
                className="p-2 text-olive-medium hover:text-olive-dark transition-colors"
                title="Settings"
            >
                <Settings className="w-5 h-5" strokeWidth={2} />
            </button>
        </div>
    );
}
