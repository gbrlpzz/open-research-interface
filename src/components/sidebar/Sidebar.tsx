import { RepoList } from './RepoList';

export function Sidebar() {
    return (
        <div className="w-64 h-full border-r border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 flex flex-col">
            <RepoList />
        </div>
    );
}
