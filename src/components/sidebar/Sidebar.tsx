import { useStore } from '@/lib/store';
import { RepoList } from './RepoList';
import { FileExplorer } from './FileExplorer';
import { DraftList } from './DraftList';

export function Sidebar() {
    const { currentRepo, viewMode } = useStore();

    return (
        <div className="w-64 h-full border-r border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 flex flex-col">
            {!currentRepo ? (
                <RepoList />
            ) : viewMode === 'paper' ? (
                <DraftList />
            ) : (
                <FileExplorer />
            )}
        </div>
    );
}
