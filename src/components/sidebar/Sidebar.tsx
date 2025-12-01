import { useStore } from '@/lib/store';
import { RepoList } from './RepoList';
import { FileExplorer } from './FileExplorer';

export function Sidebar() {
    const currentRepo = useStore((state) => state.currentRepo);
    const viewMode = useStore((state) => state.viewMode);

    const showFileExplorer = currentRepo && viewMode === 'repo';

    return (
        <div className="w-64 h-full border-r border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 flex flex-col">
            {showFileExplorer ? <FileExplorer /> : <RepoList />}
        </div>
    );
}
