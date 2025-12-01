import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getFileContent, updateFile } from '@/lib/github';
import { Editor } from './Editor';
import { ReferenceManager } from '@/components/references/ReferenceManager';

interface DraftInfo {
    id: string; // 'main' or 'draft-1'
    label: string;
    path: string; // 'main.tex' or 'drafts/draft-1/main.tex'
}

export function PaperWorkspace() {
    const {
        token,
        currentRepo,
        openFile,
        activeFile,
        currentDraft,
        setCurrentDraft,
    } = useStore();

    const [drafts, setDrafts] = useState<DraftInfo[]>([
        { id: 'main', label: 'Main draft', path: 'main.tex' },
    ]);
    const [creatingDraft, setCreatingDraft] = useState(false);

    useEffect(() => {
        const loadMain = async () => {
            if (!token || !currentRepo) return;

            const draftId = currentDraft || 'main';
            const draft = drafts.find(d => d.id === draftId) ?? drafts[0];
            if (!draft) return;

            // If we already have the right file open, don't reload
            if (activeFile === draft.path) return;

            try {
                const { content, sha } = await getFileContent(
                    token,
                    currentRepo.owner,
                    currentRepo.name,
                    draft.path
                );

                openFile({
                    path: draft.path,
                    content,
                    sha,
                    repo: currentRepo.name,
                    owner: currentRepo.owner,
                });
            } catch (e) {
                // For now, fail silently and let the Editor show its empty state.
                console.error('Failed to load draft for paper repo', e);
            }
        };

        loadMain();
    }, [token, currentRepo, openFile, activeFile, currentDraft, drafts]);

    const handleNewDraft = async () => {
        if (!token || !currentRepo) return;
        setCreatingDraft(true);
        try {
            // Get current main draft content as base
            const basePath = 'main.tex';
            const { content } = await getFileContent(
                token,
                currentRepo.owner,
                currentRepo.name,
                basePath
            );

            const nextIndex =
                drafts
                    .filter(d => d.id.startsWith('draft-'))
                    .map(d => parseInt(d.id.replace('draft-', ''), 10))
                    .filter(n => !Number.isNaN(n))
                    .reduce((max, n) => Math.max(max, n), 0) + 1;

            const newId = `draft-${nextIndex}`;
            const newPath = `drafts/${newId}/main.tex`;

            await updateFile(
                token,
                currentRepo.owner,
                currentRepo.name,
                newPath,
                content,
                `Create new draft ${newId} from main`,
            );

            const newDraft: DraftInfo = {
                id: newId,
                label: `Draft ${nextIndex}`,
                path: newPath,
            };

            setDrafts((prev) => [...prev, newDraft]);
            setCurrentDraft(newId);
        } catch (e) {
            console.error('Failed to create new draft', e);
            alert('Failed to create new draft');
        } finally {
            setCreatingDraft(false);
        }
    };

    return (
        <div className="flex flex-1 h-full">
            <div className="flex flex-col flex-1 h-full">
                <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-white dark:bg-neutral-900">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span className="uppercase tracking-wide font-semibold">Draft</span>
                        <select
                            value={currentDraft || 'main'}
                            onChange={(e) => setCurrentDraft(e.target.value)}
                            className="px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-900"
                        >
                            {drafts.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleNewDraft}
                        disabled={creatingDraft}
                        className="px-2 py-1 text-xs rounded bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
                    >
                        {creatingDraft ? 'Creating…' : 'New draft from main'}
                    </button>
                </div>
                <Editor />
            </div>
            <ReferenceManager />
        </div>
    );
}


