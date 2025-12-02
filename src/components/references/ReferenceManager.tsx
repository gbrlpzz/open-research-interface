import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useReferences } from '@/hooks/useReferences';
import { Plus, Search, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function ReferenceManager() {
    const { setCitationToInsert } = useStore();
    const { references, loading, error, addReference } = useReferences();

    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [adding, setAdding] = useState(false);
    const [activeTab, setActiveTab] = useState<'local' | 'global'>('local');

    // Form State
    const [formType, setFormType] = useState('article');
    const [formTitle, setFormTitle] = useState('');
    const [formAuthor, setFormAuthor] = useState('');
    const [formYear, setFormYear] = useState('');
    const [formUrl, setFormUrl] = useState('');
    const [formDoi, setFormDoi] = useState('');
    const [formId, setFormId] = useState('');

    const handleAddReference = async () => {
        // Generate ID if missing
        let id = formId;
        if (!id && formAuthor && formYear) {
            const lastName = formAuthor.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
            id = `${lastName}${formYear}`;
        }

        if (!id || !formTitle) {
            alert('Please provide at least an ID and Title');
            return;
        }

        const newEntry = `@${formType}{${id},
  title = {${formTitle}},
  author = {${formAuthor}},
  year = {${formYear}}${formUrl ? `,\n  url = {${formUrl}}` : ''}${formDoi ? `,\n  doi = {${formDoi}}` : ''}
}`;

        setAdding(true);
        try {
            await addReference(newEntry);

            // Reset Form
            setFormTitle('');
            setFormAuthor('');
            setFormYear('');
            setFormUrl('');
            setFormDoi('');
            setFormId('');
            setShowAdd(false);
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

                {error && (
                    <div className="p-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        {error}
                    </div>
                )}

                {showAdd ? (
                    <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200 bg-white dark:bg-neutral-800 p-3 rounded-md border border-neutral-200 dark:border-neutral-700">
                        <div className="space-y-2">
                            <select
                                value={formType}
                                onChange={(e) => setFormType(e.target.value)}
                                className="w-full p-1.5 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            >
                                <option value="article">Article</option>
                                <option value="book">Book</option>
                                <option value="inproceedings">Conference</option>
                                <option value="misc">Misc</option>
                            </select>
                            <input
                                type="text"
                                placeholder="ID (optional)"
                                value={formId}
                                onChange={(e) => setFormId(e.target.value)}
                                className="w-full p-1.5 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            />
                            <input
                                type="text"
                                placeholder="Title"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="w-full p-1.5 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            />
                            <input
                                type="text"
                                placeholder="Author"
                                value={formAuthor}
                                onChange={(e) => setFormAuthor(e.target.value)}
                                className="w-full p-1.5 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            />
                            <input
                                type="text"
                                placeholder="Year"
                                value={formYear}
                                onChange={(e) => setFormYear(e.target.value)}
                                className="w-full p-1.5 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            />
                            <input
                                type="text"
                                placeholder="URL (optional)"
                                value={formUrl}
                                onChange={(e) => setFormUrl(e.target.value)}
                                className="w-full p-1.5 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            />
                            <input
                                type="text"
                                placeholder="DOI (optional)"
                                value={formDoi}
                                onChange={(e) => setFormDoi(e.target.value)}
                                className="w-full p-1.5 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            />
                        </div>

                        <div className="flex justify-end gap-2 mt-3">
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
                            onClick={() => {
                                if (ref.url) {
                                    window.open(ref.url, '_blank');
                                } else if (ref.doi) {
                                    window.open(`https://doi.org/${ref.doi}`, '_blank');
                                }
                            }}
                            className={clsx(
                                "p-3 bg-white dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700 transition-colors group relative",
                                (ref.url || ref.doi) ? "cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/10" : ""
                            )}
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
                                        (ref.source === 'local' || ref.source === 'both')
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                            : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                    )}>
                                        {ref.source === 'both' ? 'LOCAL+GLOBAL' : ref.source}
                                    </span>
                                )}
                            </div>

                            {/* Cite Button - Visible on Hover */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCitationToInsert(`\\cite{${ref.id}}`);
                                    }}
                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded shadow-sm hover:bg-blue-700"
                                >
                                    Cite
                                </button>
                            </div>
                        </div>
                    ))
                )}
                {filteredRefs.length === 0 && !loading && (
                    <div className="p-4 text-center text-xs text-neutral-400">
                        {error ? 'Error loading references' : 'No references found'}
                    </div>
                )}
            </div>
        </div>
    );
}
