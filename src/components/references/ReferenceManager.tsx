import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getFileContent, updateFile } from '@/lib/github';
import { Reference } from '@/lib/types';
import { Plus, Search, Loader2 } from 'lucide-react';

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
    const { token, repos, currentRepo, activeFile, openFiles, updateFileContent } = useStore();

    const [scope, setScope] = useState<'paper' | 'shared'>('paper');
    const [paperRefs, setPaperRefs] = useState<Reference[]>([]);
    const [sharedRefs, setSharedRefs] = useState<Reference[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [adding, setAdding] = useState(false);

    const [newKey, setNewKey] = useState('');
    const [newType, setNewType] = useState('article');
    const [newTitle, setNewTitle] = useState('');
    const [newAuthor, setNewAuthor] = useState('');
    const [newYear, setNewYear] = useState('');
    const [newJournal, setNewJournal] = useState('');
    const [newDOI, setNewDOI] = useState('');
    const [newURL, setNewURL] = useState('');

    const buildBibEntry = () => {
        const key = newKey.trim();
        if (!key) return '';

        const lines: string[] = [];
        lines.push(`@${newType}{${key},`);
        if (newAuthor.trim()) lines.push(`  author = {${newAuthor.trim()}},`);
        if (newTitle.trim()) lines.push(`  title = {${newTitle.trim()}},`);
        if (newJournal.trim()) lines.push(`  journal = {${newJournal.trim()}},`);
        if (newYear.trim()) lines.push(`  year = {${newYear.trim()}},`);
        if (newDOI.trim()) lines.push(`  doi = {${newDOI.trim()}},`);
        if (newURL.trim()) lines.push(`  url = {${newURL.trim()}},`);
        // Remove trailing comma from last field if present
        if (lines.length > 1) {
            const last = lines[lines.length - 1];
            lines[lines.length - 1] = last.replace(/,+\s*$/, '');
        }
        lines.push('}');
        return lines.join('\n');
    };

    const fetchSharedRefs = async () => {
        if (!token || repos.length === 0) return;

        const indexRepo = repos.find(r => r.name === 'research-index');
        if (!indexRepo) return;

        try {
            // Try 01. refs/references.bib first, then refs/references.bib
            let path = '01. refs/references.bib';
            try {
                await getFileContent(token, indexRepo.owner, indexRepo.name, path);
            } catch {
                path = 'refs/references.bib';
            }

            const { content } = await getFileContent(token, indexRepo.owner, indexRepo.name, path);
            setSharedRefs(parseBibTeX(content));
        } catch (error) {
            console.error('Failed to fetch shared references', error);
        }
    };

    const fetchPaperRefs = async () => {
        if (!token || !currentRepo || !currentRepo.name.startsWith('paper-')) return;

        try {
            let path = 'refs/references.bib';
            const { content } = await getFileContent(token, currentRepo.owner, currentRepo.name, path);
            setPaperRefs(parseBibTeX(content));
        } catch (error) {
            // It's ok if the paper doesn't have a local .bib yet
            console.warn('No paper-local references found or failed to fetch', error);
        }
    };

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        Promise.all([fetchSharedRefs(), fetchPaperRefs()])
            .finally(() => setLoading(false));
    }, [token, repos, currentRepo]);

    const resetNewForm = () => {
        setNewKey('');
        setNewType('article');
        setNewTitle('');
        setNewAuthor('');
        setNewYear('');
        setNewJournal('');
        setNewDOI('');
        setNewURL('');
    };

    const handleAddReference = async () => {
        if (!token) return;
        const bibEntry = buildBibEntry();
        if (!bibEntry) {
            alert('Please enter at least a citation key.');
            return;
        }

        const indexRepo = repos.find(r => r.name === 'research-index');
        if (!indexRepo) return;

        setAdding(true);
        try {
            // 1) Update shared bibliography in research-index
            let sharedPath = '01. refs/references.bib';
            let sharedContent = '';
            let sharedSha = '';

            try {
                const file = await getFileContent(token, indexRepo.owner, indexRepo.name, sharedPath);
                sharedContent = file.content;
                sharedSha = file.sha;
            } catch {
                sharedPath = 'refs/references.bib';
                const file = await getFileContent(token, indexRepo.owner, indexRepo.name, sharedPath);
                sharedContent = file.content;
                sharedSha = file.sha;
            }

            const updatedShared = `${sharedContent.trim()}\n\n${bibEntry}\n`;

            await updateFile(
                token,
                indexRepo.owner,
                indexRepo.name,
                sharedPath,
                updatedShared,
                'Add reference via OpenResearch interface',
                sharedSha
            );

            // 2) Optionally update paper-local bibliography, if in a paper repo
            if (currentRepo && currentRepo.name.startsWith('paper-')) {
                try {
                    let paperPath = 'refs/references.bib';
                    let paperContent = '';
                    let paperSha = '';

                    try {
                        const file = await getFileContent(token, currentRepo.owner, currentRepo.name, paperPath);
                        paperContent = file.content;
                        paperSha = file.sha;
                    } catch {
                        // If it doesn't exist yet, start a new .bib file
                        paperContent = '';
                        paperSha = '';
                    }

                    const updatedPaper = `${paperContent.trim()}\n\n${bibEntry}\n`;

                    await updateFile(
                        token,
                        currentRepo.owner,
                        currentRepo.name,
                        paperPath,
                        updatedPaper,
                        'Add reference to paper bibliography via OpenResearch interface',
                        paperSha
                    );
                } catch (error) {
                    console.error('Failed to update paper bibliography', error);
                }
            }

            resetNewForm();
            setShowAdd(false);
            fetchSharedRefs();
            fetchPaperRefs();
        } catch (error) {
            console.error('Failed to add reference', error);
            alert('Failed to add reference');
        } finally {
            setAdding(false);
        }
    };

    const currentList = scope === 'paper' ? paperRefs : sharedRefs;

    const filteredRefs = currentList.filter(ref =>
        (ref.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (ref.author?.toLowerCase() || '').includes(search.toLowerCase()) ||
        ref.id.toLowerCase().includes(search.toLowerCase())
    );

    const handleInsertCitation = (key: string) => {
        if (!activeFile) return;
        const current = openFiles.find(f => f.path === activeFile);
        if (!current) return;

        // Simple append-at-end strategy for now; later we can integrate with the editor cursor.
        const insertion = `\\cite{${key}}`;
        const updated = `${current.content}${current.content.endsWith(' ') ? '' : ' '}${insertion}`;
        updateFileContent(activeFile, updated);
    };

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

                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-full p-0.5 text-xs">
                        <button
                            className={`px-3 py-1 rounded-full transition-colors ${scope === 'paper'
                                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                                }`}
                            onClick={() => setScope('paper')}
                        >
                            This paper
                        </button>
                        <button
                            className={`px-3 py-1 rounded-full transition-colors ${scope === 'shared'
                                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                                }`}
                            onClick={() => setScope('shared')}
                        >
                            Shared library
                        </button>
                    </div>
                </div>

                {showAdd ? (
                    <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2">
                                <label className="block text-[11px] text-neutral-500 mb-1">Citation key</label>
                                <input
                                    type="text"
                                    value={newKey}
                                    onChange={(e) => setNewKey(e.target.value)}
                                    placeholder="smith2020example"
                                    className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-neutral-500 mb-1">Type</label>
                                <select
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="article">Article</option>
                                    <option value="inproceedings">Conference paper</option>
                                    <option value="book">Book</option>
                                    <option value="misc">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] text-neutral-500 mb-1">Year</label>
                                <input
                                    type="text"
                                    value={newYear}
                                    onChange={(e) => setNewYear(e.target.value)}
                                    placeholder="2024"
                                    className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[11px] text-neutral-500 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="Full title of the work"
                                    className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[11px] text-neutral-500 mb-1">Authors</label>
                                <input
                                    type="text"
                                    value={newAuthor}
                                    onChange={(e) => setNewAuthor(e.target.value)}
                                    placeholder="Last, First and Last2, First2"
                                    className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[11px] text-neutral-500 mb-1">Journal / Venue</label>
                                <input
                                    type="text"
                                    value={newJournal}
                                    onChange={(e) => setNewJournal(e.target.value)}
                                    placeholder="Journal or conference"
                                    className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[11px] text-neutral-500 mb-1">DOI</label>
                                <input
                                    type="text"
                                    value={newDOI}
                                    onChange={(e) => setNewDOI(e.target.value)}
                                    placeholder="10.1234/abcd.2024.01"
                                    className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[11px] text-neutral-500 mb-1">URL</label>
                                <input
                                    type="text"
                                    value={newURL}
                                    onChange={(e) => setNewURL(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center gap-2">
                            <div className="text-[11px] text-neutral-400">
                                Will be saved to this paper and to the shared library.
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowAdd(false);
                                        resetNewForm();
                                    }}
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
                    </div>
                ) : (
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder={scope === 'paper' ? 'Search this paper\'s refs...' : 'Search shared refs...'}
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
                                <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                                    {ref.author && ref.year ? `${ref.author} (${ref.year})` : ref.author || ref.year || 'Unknown'}
                                </div>
                                <span className="text-xs font-mono text-neutral-400 shrink-0">
                                    {ref.id}
                                </span>
                            </div>
                            <div className="mt-1 text-xs text-neutral-900 dark:text-neutral-50 line-clamp-2">
                                {ref.title || 'Untitled'}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-400">
                                {ref.type && (
                                    <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded">
                                        {ref.type}
                                    </span>
                                )}
                                {ref.year && <span>{ref.year}</span>}
                                <button
                                    onClick={() => handleInsertCitation(ref.id)}
                                    className="ml-auto text-[11px] text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
                                >
                                    Insert citation
                                </button>
                            </div>
                        </div>
                    ))
                )}
                {filteredRefs.length === 0 && !loading && (
                    <div className="p-4 text-center text-xs text-neutral-400">
                        {scope === 'paper'
                            ? 'No references in this paper yet.'
                            : 'No references in the shared library yet.'}
                    </div>
                )}
            </div>
        </div>
    );
}
