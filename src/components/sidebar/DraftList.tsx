import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { createBranch, deleteBranch, getBranches, mergeBranch, getFileContent, renameBranch } from '@/lib/github';
import { Plus, Trash2, GitMerge, GitBranch, Loader2, RefreshCw, ChevronLeft, Edit2, Check, X } from 'lucide-react';
import { DiffModal } from './DiffModal';
import clsx from 'clsx';

export function DraftList() {
    const { token, currentRepo, currentBranch, setCurrentBranch, branches, setBranches, openFile, setCurrentRepo } = useStore();
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [merging, setMerging] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [renaming, setRenaming] = useState<string | null>(null); // Branch being renamed
    const [renameValue, setRenameValue] = useState('');

    const [newBranchName, setNewBranchName] = useState('');
    const [showNewBranchInput, setShowNewBranchInput] = useState(false);
    const [diffData, setDiffData] = useState<{
        draftId: string;
        draftName: string;
        originalContent: string;
        modifiedContent: string;
    } | null>(null);

    const fetchBranches = async () => {
        if (!token || !currentRepo) return;
        setLoading(true);
        try {
            const data = await getBranches(token, currentRepo.owner, currentRepo.name);
            setBranches(data);
        } catch (error) {
            console.error('Failed to fetch branches', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, [token, currentRepo]);

    const handleCreateBranch = async () => {
        if (!token || !currentRepo || !newBranchName) return;

        setCreating(true);
        try {
            await createBranch(token, currentRepo.owner, currentRepo.name, newBranchName, 'main');
            setBranches([...branches, newBranchName]);
            setCurrentBranch(newBranchName);
            setShowNewBranchInput(false);
            setNewBranchName('');
            handleSelectBranch(newBranchName);
        } catch (error) {
            console.error('Failed to create branch', error);
            alert('Failed to create branch');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteBranch = async (branch: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!token || !currentRepo || !confirm(`Are you sure you want to delete branch '${branch}'?`)) return;

        setDeleting(branch);
        try {
            await deleteBranch(token, currentRepo.owner, currentRepo.name, branch);
            setBranches(branches.filter(b => b !== branch));
            if (currentBranch === branch) {
                setCurrentBranch('main');
                handleSelectBranch('main');
            }
        } catch (error) {
            console.error('Failed to delete branch', error);
        } finally {
            setDeleting(null);
        }
    };

    const handleRenameBranch = async (branch: string) => {
        if (!token || !currentRepo || !renameValue || renameValue === branch) {
            setRenaming(null);
            return;
        }

        try {
            await renameBranch(token, currentRepo.owner, currentRepo.name, branch, renameValue);
            // Update local state
            setBranches(branches.map(b => b === branch ? renameValue : b));
            if (currentBranch === branch) {
                setCurrentBranch(renameValue);
            }
        } catch (error) {
            console.error('Failed to rename branch', error);
            alert('Failed to rename branch');
        } finally {
            setRenaming(null);
            setRenameValue('');
        }
    };

    const startRenaming = (branch: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setRenaming(branch);
        setRenameValue(branch);
    };

    const handleMergeBranch = async (branch: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!token || !currentRepo) return;

        setMerging(branch);
        try {
            const { content: draftContent } = await getFileContent(token, currentRepo.owner, currentRepo.name, 'main.tex', branch);
            const { content: mainContent } = await getFileContent(token, currentRepo.owner, currentRepo.name, 'main.tex', 'main');

            setDiffData({
                draftId: branch,
                draftName: branch,
                originalContent: mainContent,
                modifiedContent: draftContent
            });
        } catch (error) {
            console.error('Failed to prepare merge', error);
            alert('Failed to prepare merge (ensure main.tex exists)');
            setMerging(null);
        }
    };

    const confirmMerge = async () => {
        if (!token || !currentRepo || !diffData) return;

        try {
            await mergeBranch(token, currentRepo.owner, currentRepo.name, diffData.draftId, 'main');
            alert('Merged successfully!');
            setCurrentBranch('main');
            handleSelectBranch('main');
        } catch (error) {
            console.error('Failed to merge branch', error);
            alert('Failed to merge branch');
        } finally {
            setMerging(null);
            setDiffData(null);
        }
    };

    const handleSelectBranch = async (branch: string) => {
        if (!token || !currentRepo) return;

        setCurrentBranch(branch);
        setLoading(true);

        try {
            const { content, sha } = await getFileContent(token, currentRepo.owner, currentRepo.name, 'main.tex', branch);

            openFile({
                path: 'main.tex',
                content,
                sha,
                repo: currentRepo.name,
                owner: currentRepo.owner
            });
        } catch (error) {
            console.error('Failed to open file on branch', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setCurrentRepo(null);
    };

    const mainBranch = branches.find(b => b === 'main') || 'main';
    const otherBranches = branches.filter(b => b !== 'main');

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 font-sans">
            {diffData && (
                <DiffModal
                    originalContent={diffData.originalContent}
                    modifiedContent={diffData.modifiedContent}
                    draftName={diffData.draftName}
                    onClose={() => {
                        setDiffData(null);
                        setMerging(null);
                    }}
                    onConfirm={() => confirmMerge()}
                />
            )}
            <div className="px-4 py-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleBack}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                        title="Back to Repos"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest swiss-type">
                        Branches
                    </h2>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={fetchBranches}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                        title="Refresh Branches"
                    >
                        <RefreshCw className={clsx("w-3 h-3", loading && "animate-spin")} />
                    </button>
                    <button
                        onClick={() => setShowNewBranchInput(true)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                        title="New Branch"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {showNewBranchInput && (
                <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 animate-in slide-in-from-top-2">
                    <input
                        type="text"
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        placeholder="Branch name..."
                        className="w-full px-2 py-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded mb-2 focus:outline-none focus:border-black dark:focus:border-white bg-white dark:bg-neutral-800"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setShowNewBranchInput(false)}
                            className="text-xs uppercase tracking-wider text-neutral-500 hover:text-black dark:hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateBranch}
                            disabled={creating || !newBranchName}
                            className="text-xs uppercase tracking-wider font-bold text-black dark:text-white hover:opacity-70 disabled:opacity-50"
                        >
                            {creating ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
                {/* Main Branch Section */}
                <div>
                    <div className="px-2 mb-1 text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Published</div>
                    <div
                        onClick={() => handleSelectBranch('main')}
                        className={clsx(
                            "group relative w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm transition-all duration-200 cursor-pointer",
                            currentBranch === 'main'
                                ? "bg-black text-white dark:bg-white dark:text-black font-medium"
                                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-black dark:hover:text-white"
                        )}
                    >
                        <GitBranch className="w-4 h-4 shrink-0" />
                        <span className="truncate flex-1">main</span>
                        {currentBranch === 'main' && <span className="text-[10px] uppercase tracking-wider opacity-60">Current</span>}
                    </div>
                </div>

                {/* Other Branches (Drafts) */}
                <div>
                    <div className="px-2 mb-1 text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Drafts</div>
                    <div className="space-y-0.5">
                        {otherBranches.map((branch) => (
                            <div
                                key={branch}
                                onClick={() => renaming !== branch && handleSelectBranch(branch)}
                                className={clsx(
                                    "group relative w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm transition-all duration-200 cursor-pointer",
                                    currentBranch === branch
                                        ? "bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-medium"
                                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-black dark:hover:text-white"
                                )}
                            >
                                <GitBranch className={clsx("w-4 h-4 shrink-0", currentBranch === branch ? "text-black dark:text-white" : "text-neutral-300 group-hover:text-neutral-500")} />

                                {renaming === branch ? (
                                    <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                                        <input
                                            value={renameValue}
                                            onChange={e => setRenameValue(e.target.value)}
                                            className="flex-1 min-w-0 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 px-1 py-0.5 text-xs rounded"
                                            autoFocus
                                            onKeyDown={e => e.key === 'Enter' && handleRenameBranch(branch)}
                                        />
                                        <button onClick={() => handleRenameBranch(branch)} className="p-0.5 hover:bg-green-100 text-green-600 rounded"><Check className="w-3 h-3" /></button>
                                        <button onClick={() => setRenaming(null)} className="p-0.5 hover:bg-red-100 text-red-600 rounded"><X className="w-3 h-3" /></button>
                                    </div>
                                ) : (
                                    <span className="truncate flex-1">{branch}</span>
                                )}

                                {/* Actions */}
                                {renaming !== branch && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => startRenaming(branch, e)}
                                            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-black dark:hover:text-white rounded"
                                            title="Rename Branch"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => handleMergeBranch(branch, e)}
                                            disabled={merging === branch}
                                            className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 text-neutral-400 hover:text-green-600 rounded"
                                            title="Merge into Main"
                                        >
                                            {merging === branch ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitMerge className="w-3 h-3" />}
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteBranch(branch, e)}
                                            disabled={deleting === branch}
                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-neutral-400 hover:text-red-600 rounded"
                                            title="Delete Branch"
                                        >
                                            {deleting === branch ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {otherBranches.length === 0 && (
                            <div className="px-3 py-2 text-xs text-neutral-400 italic">No drafts</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
