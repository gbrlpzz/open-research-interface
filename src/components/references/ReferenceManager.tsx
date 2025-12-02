import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getFileContent, updateFile } from '@/lib/github';
import { Reference } from '@/lib/types';
import { BookOpen, Plus, Search, Loader2 } from 'lucide-react';
import clsx from 'clsx';

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
    const { token, repos, currentRepo, user } = useStore();
    const [references, setReferences] = useState<(Reference & { source?: string })[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newEntry, setNewEntry] = useState('');
    const [adding, setAdding] = useState(false);
    const [activeTab, setActiveTab] = useState<'local' | 'global'>('local');

    const fetchReferences = async () => {
        if (!token) return;

        setLoading(true);
        const globalRefsList: Reference[] = [];
        const localRefsList: Reference[] = [];

        try {
            // 1. Fetch from Global Research Index
            let indexOwner = '';
            let indexRepoName = 'research-index';

            // Try to find it in the loaded repos first
            const indexRepo = repos.find(r => r.name === 'research-index');
            if (indexRepo) {
                indexOwner = indexRepo.owner;
                indexRepoName = indexRepo.name;
            } else if (user?.login) {
                // Fallback: Assume it exists under the user's login
                indexOwner = user.login;
            }

            if (indexOwner) {
                let path = '01. refs/references.bib';
                try {
                    // Check if file exists (naive check by trying to get content)
                    await getFileContent(token, indexOwner, indexRepoName, path);
                } catch {
                    path = 'refs/references.bib';
                }

                try {
                    const { content } = await getFileContent(token, indexOwner, indexRepoName, path);
                    const refs = parseBibTeX(content);
                    globalRefsList.push(...refs);
                } catch (e) {
                    console.warn('Failed to fetch global refs', e);
                }
            }

            // 2. Fetch from ALL Paper Repositories (for Global Aggregation)
            const paperRepos = repos.filter(r => r.name.startsWith('paper-'));

            // Use Promise.allSettled to fetch in parallel without failing everything
            const paperPromises = paperRepos.map(async (repo) => {
                try {
                    const { content } = await getFileContent(token, repo.owner, repo.name, 'references.bib');
                    return parseBibTeX(content);
                } catch {
                    return [];
                }
            });

            const paperResults = await Promise.allSettled(paperPromises);
            paperResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    globalRefsList.push(...result.value);
                }
            });

            // 3. Fetch from Current Repository (Local)
            if (currentRepo && currentRepo.name !== 'research-index') {
                try {
                    const { content } = await getFileContent(token, currentRepo.owner, currentRepo.name, 'references.bib');
                    const refs = parseBibTeX(content);
                    localRefsList.push(...refs);
                } catch (e) {
                    // It's okay if local repo doesn't have references.bib
                }
            }

            // Deduplicate Global List
            const globalMap = new Map<string, Reference & { source: string }>();
            globalRefsList.forEach(r => globalMap.set(r.id, { ...r, source: 'global' }));

            // Deduplicate Local List
            const localMap = new Map<string, Reference & { source: string }>();
            localRefsList.forEach(r => localMap.set(r.id, { ...r, source: 'local' }));

            // Combine for state, but keep source distinction
            // We want to show:
            // - If activeTab === 'global': Show everything in globalMap
            // - If activeTab === 'local': Show everything in localMap

            // We can just store them all in one list with 'source' property, 
            // but since an item can be in BOTH, we need to handle that.
            // The current UI filters by `ref.source === activeTab`.
            // So if an item is in both, it needs to appear in both lists.

            // Let's create a combined list where items might appear twice if they are in both?
            // Or better: The `source` property should probably be 'global' | 'local' | 'both'?
            // Or just simpler: The `references` state should contain ALL unique references, 
            // and we filter based on whether they exist in the global set or local set.

            // Let's stick to the current structure: List of references with a `source` tag.
            // If it's in both, we can mark it as 'local' (priority) but maybe show it in global too?
            // Actually, the user wants "Global" tab and "Local" tab.
            // If I have a ref "X" in both:
            // - Global tab: Show X
            // - Local tab: Show X

            // So I should probably just store two separate lists in state?
            // Or just one list and `source` can be 'global' or 'local' or 'both'.

            const combinedRefs: (Reference & { source: string })[] = [];

            // Add all global refs
            for (const ref of globalMap.values()) {
                combinedRefs.push(ref);
            }

            // Add local refs. If ID exists in global, update it to 'both' or just add it?
            // If we update to 'both', then the filter logic needs to change.
            // Let's change the filter logic to:
            // if activeTab === 'local', show if source === 'local' || source === 'both'
            // if activeTab === 'global', show if source === 'global' || source === 'both'

            for (const ref of localMap.values()) {
                const existing = globalMap.get(ref.id);
                if (existing) {
                    // It's in both. Let's find it in combinedRefs and update source
                    const index = combinedRefs.findIndex(r => r.id === ref.id);
                    if (index !== -1) {
                        combinedRefs[index].source = 'both';
                    }
                } else {
                    combinedRefs.push(ref);
                }
            }

            setReferences(combinedRefs);

        } catch (error) {
            console.error('Failed to fetch references', error);
        }
    };

    useEffect(() => {
        fetchReferences();
    }, [token, repos, currentRepo, user]);

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

    const filteredRefs = references.filter(ref => {
        const matchesSearch = (ref.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (ref.author?.toLowerCase() || '').includes(search.toLowerCase()) ||
            ref.id.toLowerCase().includes(search.toLowerCase());

        const matchesTab = activeTab === 'local'
            ? (ref.source === 'local' || ref.source === 'both')
            : (ref.source === 'global' || ref.source === 'both');

        return matchesSearch && matchesTab;
    });

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

                {/* Tab Toggle */}
                <div className="flex p-1 bg-neutral-200 dark:bg-neutral-800 rounded-md">
                    <button
                        onClick={() => setActiveTab('local')}
                        className={clsx(
                            "flex-1 py-1 text-xs font-medium rounded-sm transition-colors",
                            activeTab === 'local'
                                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                        )}
                    >
                        Local
                    </button>
                    <button
                        onClick={() => setActiveTab('global')}
                        className={clsx(
                            "flex-1 py-1 text-xs font-medium rounded-sm transition-colors",
                            activeTab === 'global'
                                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                        )}
                    >
                        Global
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
                                {ref.source && (
                                    <span className={clsx(
                                        "px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider",
                                        ref.source === 'local'
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                            : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                    )}>
                                        {ref.source}
                                    </span>
                                )}
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
