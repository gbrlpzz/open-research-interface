import { useStore } from '@/lib/store';
import { RepoList } from './RepoList';
import { FileExplorer } from './FileExplorer';
import { DraftList } from './DraftList';
import { ReferenceManager } from '@/components/references/ReferenceManager';
import clsx from 'clsx';
import { FolderGit2, FileText, Settings, LogOut, BookOpen } from 'lucide-react';

export function Sidebar() {
    const { currentRepo, viewMode, setViewMode } = useStore();

    // Derive title based on viewMode and currentRepo, similar to original logic
    const title =
        viewMode === 'references'
            ? 'Filters'
            : viewMode === 'paper'
                ? 'Drafts' // Assuming 'Drafts' for paper view
                : currentRepo
                    ? currentRepo.name
                    : 'Repositories';

    return (
        <div className="w-64 h-full border-r border-olive-medium/20 bg-paper flex flex-col">
            <div className="p-4 border-b border-olive-medium/20">
                <h2 className="text-xs font-bold uppercase tracking-widest text-olive-medium">
                    {title}
                </h2>
            </div>
            <div className="flex-1 overflow-hidden">
                {viewMode === 'repo' && !currentRepo && <RepoList />}
                {viewMode === 'repo' && currentRepo && <FileExplorer />}
                {viewMode === 'paper' && <DraftList />}
                {viewMode === 'references' && <ReferenceManager />}
            </div>
        </div>
    );
}
