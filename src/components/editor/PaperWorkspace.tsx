import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { getFileContent } from '@/lib/github';
import { Editor } from './Editor';
import { ReferenceManager } from '@/components/references/ReferenceManager';

export function PaperWorkspace() {
    const {
        token,
        currentRepo,
        openFile,
        activeFile,
    } = useStore();

    useEffect(() => {
        const loadMain = async () => {
            if (!token || !currentRepo) return;
            // If we already have an active file, don't override
            if (activeFile) return;

            try {
                const { content, sha } = await getFileContent(
                    token,
                    currentRepo.owner,
                    currentRepo.name,
                    'main.tex'
                );

                openFile({
                    path: 'main.tex',
                    content,
                    sha,
                    repo: currentRepo.name,
                    owner: currentRepo.owner,
                });
            } catch (e) {
                // For now, fail silently and let the Editor show its empty state.
                // Later we can surface a nicer message if main.tex is missing.
                console.error('Failed to load main.tex for paper repo', e);
            }
        };

        loadMain();
    }, [token, currentRepo, openFile, activeFile]);

    return (
        <div className="flex flex-1 h-full">
            <Editor />
            <ReferenceManager />
        </div>
    );
}


