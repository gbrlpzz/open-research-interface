import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getFileContent, updateFile } from '@/lib/github';
import { Reference } from '@/lib/types';
import { BookOpen, Plus, Search, Loader2 } from 'lucide-react';

// Simple regex-based BibTeX parser for MVP
const parseBibTeX = (content: string): Reference[] => {
    const references: Reference[] = [];
    const entries = content.split('@');

    for (const entry of entries) {
        if (!entry.trim()) continue;

        const typeMatch = entry.match(/^(\w+)\s*{/);
        const idMatch = entry.match(/{\s*([^,]+),/);

        if (typeMatch && idMatch) {
            const type = typeMatch[1];
            const id = idMatch[1];
            const titleMatch = entry.match(/title\s*=\s*{([^}]+)}/i);
            const authorMatch = entry.match(/author\s*=\s*{([^}]+)}/i);
            const yearMatch = entry.match(/year\s*=\s*{([^}]+)}/i);

            references.push({
                id,
                type,
                title: titleMatch ? titleMatch[1] : undefined,
                author: authorMatch ? authorMatch[1] : undefined,
                year: yearMatch ? yearMatch[1] : undefined,
                raw: '@' + entry
            });
        }
    }

    return references;
};

export function ReferenceManager() {
    const { token, repos } = useStore();
    const [references, setReferences] = useState<Reference[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newEntry, setNewEntry] = useState('');
    const [adding, setAdding] = useState(false);

    const fetchReferences = async () => {
        if (!token || repos.length === 0) return;

        // Find research-index
        const indexRepo = repos.find(r => r.name === 'research-index');
        if (!indexRepo) return;

        setLoading(true);
        try {
            // Try 01. refs/references.bib first, then refs/references.bib
            let path = '01. refs/references.bib';
            try {
                await getFileContent(token, indexRepo.name.split('/')[0], indexRepo.name, path);
            } catch {
                path = 'refs/references.bib';
            }

            const { content } = await getFileContent(token, indexRepo.name.split('/')[0], indexRepo.name, path);
            setReferences(parseBibTeX(content));
        } catch (error) {
            console.error('Failed to fetch references', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReferences();
    }, [token, repos]);

    const handleAddReference = async () => {
        if (!token || !newEntry.trim()) return;

        const indexRepo = repos.find(r => r.name === 'research-index');
        if (!indexRepo) return;

        setAdding(true);
        try {
            let path = '01. refs/references.bib';
            let currentContent = '';
            let sha = '';

            try {
                const file = await getFileContent(token, indexRepo.name.split('/')[0], indexRepo.name, path);
                currentContent = file.content;
                sha = file.sha;
            } catch {
                path = 'refs/references.bib';
                const file = await getFileContent(token, indexRepo.name.split('/')[0], indexRepo.name, path);
                currentContent = file.content;
                sha = file.sha;
            }

            // Append new entry
            const updatedContent = currentContent + '\n\n' + newEntry;

            await updateFile(
                token,
                indexRepo.name.split('/')[0],
                indexRepo.name,
                path,
                updatedContent,
                'Add new reference',
                sha
            );

            setNewEntry('');
            setShowAdd(false);
            fetchReferences(); // Refresh list
        } catch (error) {
            console.error('Failed to add reference', error);
            alert('Failed to add reference');
        } finally {
            setAdding(false);
        }
    };

    const filteredRefs = references.filter(ref =>
        (ref.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (ref.author?.toLowerCase() || '').includes(search.toLowerCase()) ||
        ref.id.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="w-80 h-full border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 flex flex-col">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        References
                    </h2>
                    <button
                        onClick={() => setShowAdd(!showAdd)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-blue-600 transition-colors"
                        title="Add Reference"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {showAdd ? (
                    <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                        <textarea
                            value={newEntry}
                            onChange={(e) => setNewEntry(e.target.value)}
                            placeholder="@article{key, ...}"
                            className="w-full h-32 p-2 text-xs font-mono border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-neutral-800"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowAdd(false)}
                                className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddReference}
                                disabled={adding}
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                            >
                                {adding && <Loader2 className="w-3 h-3 animate-spin" />}
                                Add
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search refs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-none rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {loading ? (
                    <div className="p-4 text-center text-sm text-neutral-500">Loading references...</div>
                ) : (
                    filteredRefs.map((ref) => (
                        <div
                            key={ref.id}
                            className="p-3 bg-white dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100 line-clamp-2">
                                    {ref.title || 'Untitled'}
                                </div>
                                <span className="text-xs font-mono text-neutral-400 shrink-0">
                                    {ref.id}
                                </span>
                            </div>
                            <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                                {ref.author}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                                <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded">
                                    {ref.type}
                                </span>
                                {ref.year && <span>{ref.year}</span>}
                            </div>
                        </div>
                    ))
                )}
                {filteredRefs.length === 0 && !loading && (
                    <div className="p-4 text-center text-xs text-neutral-400">No references found</div>
                )}
            </div>
        </div>
    );
}
