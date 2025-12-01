import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { createDraft, deleteDraft, getDrafts, mergeDraft, getFileContent, renameDraft } from '@/lib/github';
import { Plus, Trash2, GitMerge, FileText, Loader2, Edit2, ChevronLeft } from 'lucide-react';
import { DiffModal } from './DiffModal';
import clsx from 'clsx';

export function DraftList() {
    const { token, currentRepo, currentDraft, setCurrentDraft, drafts, setDrafts, openFile, setCurrentRepo } = useStore();
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [merging, setMerging] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [renaming, setRenaming] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [diffData, setDiffData] = useState<{
        draftId: string;
        draftName: string;
        originalContent: string;
        modifiedContent: string;
    } | null>(null);

    const fetchDrafts = async () => {
        if (!token || !currentRepo) return;
        setLoading(true);
        try {
            const data = await getDrafts(token, currentRepo.owner, currentRepo.name);
            setDrafts(data);
        } catch (error) {
            console.error('Failed to fetch drafts', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrafts();
    }, [token, currentRepo]);

    const handleCreateDraft = async () => {
        if (!token || !currentRepo) return;

        // Inline creation could be better, but for now let's use a simple default name
        // or we could use the inline rename logic immediately after creation.
        // Let's stick to a simple default for now to avoid blocking.
        const name = `Draft ${drafts.length + 1}`;

        setCreating(true);
        try {
            // Get current main content to base draft on
            const { content } = await getFileContent(token, currentRepo.owner, currentRepo.name, 'main.tex');

            const newDraft = await createDraft(token, currentRepo.owner, currentRepo.name, content, name);
            setDrafts([...drafts, newDraft]);
            setCurrentDraft(newDraft.id);

            // Auto-start renaming
            setRenaming(newDraft.id);
            setRenameValue(newDraft.name);
        } catch (error) {
            console.error('Failed to create draft', error);
            alert('Failed to create draft');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteDraft = async (draftId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!token || !currentRepo || !confirm('Are you sure you want to delete this draft?')) return;

        setDeleting(draftId);
        try {
            await deleteDraft(token, currentRepo.owner, currentRepo.name, draftId);
            setDrafts(drafts.filter(d => d.id !== draftId));
            if (currentDraft === draftId) {
                setCurrentDraft('main');
            }
        } catch (error) {
            console.error('Failed to delete draft', error);
        } finally {
            setDeleting(null);
        }
    };

    const startRenaming = (draftId: string, currentName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setRenaming(draftId);
        setRenameValue(currentName);
    };

    const submitRename = async (draftId: string) => {
        if (!token || !currentRepo || !renameValue || renameValue === drafts.find(d => d.id === draftId)?.name) {
            setRenaming(null);
            return;
        }

        try {
            await renameDraft(token, currentRepo.owner, currentRepo.name, draftId, renameValue);
            setDrafts(drafts.map(d => d.id === draftId ? { ...d, name: renameValue } : d));
        } catch (error) {
            console.error('Failed to rename draft', error);
            alert('Failed to rename draft');
        } finally {
            setRenaming(null);
        }
    };

    const handleMergeDraft = async (draftId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!token || !currentRepo) return;

        setMerging(draftId);
        try {
            // Get draft content
            const { content: draftContent } = await getFileContent(token, currentRepo.owner, currentRepo.name, `drafts/${draftId}/main.tex`);
            // Get main content for diff
            const { content: mainContent } = await getFileContent(token, currentRepo.owner, currentRepo.name, 'main.tex');

            setDiffData({
                draftId,
                draftName: drafts.find(d => d.id === draftId)?.name || draftId,
                originalContent: mainContent,
                modifiedContent: draftContent
            });
        } catch (error) {
            console.error('Failed to prepare merge', error);
            alert('Failed to prepare merge');
            setMerging(null);
        }
    };

    const confirmMerge = async (shouldBackup: boolean) => {
        if (!token || !currentRepo || !diffData) return;

        try {
            await mergeDraft(token, currentRepo.owner, currentRepo.name, diffData.modifiedContent, diffData.draftId, shouldBackup);
            alert('Merged successfully!');
            setCurrentDraft('main'); // Switch back to main to see changes
        } catch (error) {
            console.error('Failed to merge draft', error);
            alert('Failed to merge draft');
        } finally {
            setMerging(null);
            setDiffData(null);
        }
    };

    const handleBack = () => {
        setCurrentRepo(null);
    };

    const handleSelectDraft = async (draftId: string) => {
        if (!token || !currentRepo) return;

        setCurrentDraft(draftId);
        setLoading(true); // Re-use loading or add a specific one? Let's just use global loading for now or silent.
        // Actually, let's not block UI with full loading, maybe just openFile logic.

        try {
            const path = draftId === 'main' ? 'main.tex' : `drafts/${draftId}/main.tex`;
            const { content, sha } = await getFileContent(token, currentRepo.owner, currentRepo.name, path);

            openFile({
                path,
                content,
                sha,
                repo: currentRepo.name,
                owner: currentRepo.owner
            });
            // openFile usually sets activeFile, but let's be sure
            // store.ts says: openFile: (...) => { ... set((state) => ({ ... openFiles: [...], activeFile: file.path })) }
            // So it should be auto-set.
        } catch (error) {
            console.error('Failed to open draft file', error);
            alert('Failed to open document');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-700">
            {diffData && (
                <DiffModal
                    originalContent={diffData.originalContent}
                    modifiedContent={diffData.modifiedContent}
                    draftName={diffData.draftName}
                    onClose={() => {
                        setDiffData(null);
                        setMerging(null);
                    }}
                    onConfirm={confirmMerge}
                />
            )}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleBack}
                        className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500"
                        title="Back to Repos"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Drafts
                    </h2>
                </div>
                <button
                    onClick={handleCreateDraft}
                    disabled={creating}
                    className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-blue-600 transition-colors"
                    title="New Draft"
                >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {/* Main Document Item */}
                <button
                    onClick={() => handleSelectDraft('main')}
                    className={clsx(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors group",
                        currentDraft === 'main'
                            ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm border border-neutral-200 dark:border-neutral-700"
                            : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}
                >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate font-medium">Main Document</span>
                </button>

                {/* Draft Items */}
                {loading ? (
                    <div className="p-4 text-center text-xs text-neutral-400">Loading drafts...</div>
                ) : (
                    drafts.map((draft) => (
                        <div
                            key={draft.id}
                            onClick={() => handleSelectDraft(draft.id)}
                            className={clsx(
                                "relative w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer group",
                                currentDraft === draft.id
                                    ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm border border-neutral-200 dark:border-neutral-700"
                                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            )}
                        >
                            <FileText className="w-4 h-4 shrink-0 opacity-50" />
                            <div className="flex-1 min-w-0 text-left">
                                {renaming === draft.id ? (
                                    <input
                                        type="text"
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onBlur={() => submitRename(draft.id)}
                                        onKeyDown={(e) => e.key === 'Enter' && submitRename(draft.id)}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full px-1 py-0.5 text-sm border border-blue-500 rounded bg-white dark:bg-neutral-900 focus:outline-none"
                                    />
                                ) : (
                                    <>
                                        <div className="truncate font-medium">{draft.name}</div>
                                        <div className="text-[10px] text-neutral-400 truncate">
                                            {new Date(draft.updated_at).toLocaleDateString()}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Always visible actions, but dimmed until hover */}
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => startRenaming(draft.id, draft.name, e)}
                                    disabled={renaming === draft.id}
                                    className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-900 rounded"
                                    title="Rename Draft"
                                >
                                    {renaming === draft.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Edit2 className="w-3 h-3" />}
                                </button>
                                <button
                                    onClick={(e) => handleMergeDraft(draft.id, e)}
                                    disabled={merging === draft.id}
                                    className="p-1 hover:bg-green-100 dark:hover:bg-green-900 text-neutral-400 hover:text-green-600 rounded"
                                    title="Merge into Main"
                                >
                                    {merging === draft.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitMerge className="w-3 h-3" />}
                                </button>
                                <button
                                    onClick={(e) => handleDeleteDraft(draft.id, e)}
                                    disabled={deleting === draft.id}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900 text-neutral-400 hover:text-red-600 rounded"
                                    title="Delete Draft"
                                >
                                    {deleting === draft.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
