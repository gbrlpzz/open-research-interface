import { useStore } from '@/lib/store';
import { RepoList } from './RepoList';
import { FileExplorer } from './FileExplorer';
import { DraftList } from './DraftList';
import clsx from 'clsx';
import { FolderGit2, FileText, Settings, LogOut, BookOpen } from 'lucide-react';

export function Sidebar() {
    const { currentRepo, viewMode, setViewMode } = useStore();

    return (
        <div className="w-64 h-full border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col">
            {/* Sidebar Header / Context Title */}
            <div className="h-12 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-4">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                    {viewMode === 'references' ? 'Filters' : currentRepo ? currentRepo.name : 'Repositories'}
                </span>
            </div>
            {!currentRepo ? (
                <RepoList />
            ) : viewMode === 'paper' ? (
                <DraftList />
            ) : viewMode === 'references' ? (
                <div className="p-4 text-sm text-neutral-500 text-center mt-10">
                    <p className="text-xs uppercase tracking-widest">Collections</p>
                    {/* Placeholder for future reference filters */}
                </div>
            ) : (
                <FileExplorer />
            )}
        </div>
    );
}
