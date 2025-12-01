import { useState } from 'react';
import { useStore } from '@/lib/store';
import { createRepo, updateFile, getFileContent } from '@/lib/github';
import { getArtifactFiles } from '@/lib/templates';
import { ArtifactType } from '@/lib/types';
import { X, Loader2 } from 'lucide-react';

interface NewArtifactModalProps {
    onClose: () => void;
}

export function NewArtifactModal({ onClose }: NewArtifactModalProps) {
    const { token, repos, setRepos } = useStore();
    const [type, setType] = useState<ArtifactType>('paper');
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !slug) return;

        setLoading(true);
        setError('');

        const year = new Date().getFullYear().toString();
        const repoName = `${type}-${year}-${slug}`;

        try {
            // 1. Create Repo
            const newRepo = await createRepo(token, repoName, `Research artifact: ${type}`);

            // 2. Create Initial Files
            const files = getArtifactFiles(type, slug, year);

            // We do this sequentially to avoid rate limits or conflicts, though parallel is faster
            for (const file of files) {
                await updateFile(token, newRepo.owner.login, repoName, file.path, file.content, 'Initial commit');
            }

            // 3. Update Catalogue in research-index
            // First, find research-index
            const indexRepo = repos.find(r => r.name === 'research-index');
            if (indexRepo) {
                const cataloguePath = `00. catalogue/${type}s.md`;
                // Try to get existing content
                let content = '';
                let sha: string | undefined;
                try {
                    const file = await getFileContent(token, indexRepo.name.split('/')[0], indexRepo.name, cataloguePath);
                    content = file.content;
                    sha = file.sha;
                } catch (e) {
                    // File might not exist, create it
                    content = `# ${type.charAt(0).toUpperCase() + type.slice(1)}s\n`;
                }

                const newEntry = `\n- [${repoName}](../../${repoName}) (${year})`;
                await updateFile(
                    token,
                    indexRepo.name.split('/')[0],
                    indexRepo.name,
                    cataloguePath,
                    content + newEntry,
                    `Add ${repoName} to catalogue`,
                    sha
                );
            }

            // 4. Update local state
            // Ideally we fetch the new repo details properly, but for now we can just add a minimal Repo entry.
            setRepos([{
                id: newRepo.id,
                name: newRepo.name,
                full_name: newRepo.full_name,
                owner: newRepo.owner.login,
                description: newRepo.description,
                html_url: newRepo.html_url,
                updated_at: newRepo.updated_at,
            }, ...repos]);

            onClose();
        } catch (err: any) {
            console.error('Failed to create artifact', err);
            // Friendlier error messages, especially for common GitHub errors
            const rawMessage = err?.message || '';
            const nameExists =
                rawMessage.includes('name already exists') ||
                (err?.response?.data?.errors || []).some((e: any) =>
                    String(e?.message || '').includes('name already exists')
                );

            if (nameExists) {
                setError(
                    `A repository named "${repoName}" already exists on your account. ` +
                    'Please choose a different slug.'
                );
            } else {
                setError(rawMessage || 'Failed to create artifact');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">New Artifact</h2>
                    <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as ArtifactType)}
                            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900"
                        >
                            <option value="paper">Paper</option>
                            <option value="dataset">Dataset</option>
                            <option value="app">App</option>
                            <option value="notebook">Notebook</option>
                            <option value="model">Model</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Slug</label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            placeholder="e.g. my-new-project"
                            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900"
                            required
                        />
                        <p className="text-xs text-neutral-500">
                            Repo will be: {type}-{new Date().getFullYear()}-{slug || '...'}
                        </p>
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Artifact
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
