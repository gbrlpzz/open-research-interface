import { useStore } from '@/lib/store';
import { RepoList } from './RepoList';
import { FileExplorer } from './FileExplorer';
import { DraftList } from './DraftList';
import clsx from 'clsx';
import { FolderGit2, FileText, Settings, LogOut, BookOpen } from 'lucide-react';

export function Sidebar() {
    const { currentRepo, viewMode, setViewMode } = useStore();

    return (
        <div className="w-64 h-full border-r border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 flex flex-col">
            <div className="p-2 flex flex-col items-center border-b border-neutral-200 dark:border-neutral-700">
                <button
                    onClick={() => setViewMode('repo')}
                    className={clsx(
                        "p-2 rounded-lg mb-2 transition-colors",
                        viewMode === 'repo'
                            ? "bg-blue-600 text-white"
                            : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    )}
                    title="Repositories"
                >
                    <FolderGit2 className="w-6 h-6" />
                </button>
                <button
                    onClick={() => setViewMode('references')}
                    className={clsx(
                        "p-2 rounded-lg mb-2 transition-colors",
                        viewMode === 'references'
                            ? "bg-blue-600 text-white"
                            : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    )}
                    title="Reference Space"
                >
                    <BookOpen className="w-6 h-6" />
                </button>
            </div>
            {!currentRepo ? (
                <RepoList />
            ) : viewMode === 'paper' ? (
                <DraftList />
            ) : viewMode === 'references' ? (
                <div className="p-4 text-sm text-neutral-500 text-center mt-10">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Managing References</p>
                </div>
            ) : (
                <FileExplorer />
            )}
        </div>
    );
}
