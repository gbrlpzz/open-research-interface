import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useReferences } from '@/hooks/useReferences';
import { Plus, Search, Loader2, Edit2 } from 'lucide-react';
import clsx from 'clsx';

export function ReferenceManager() {
    const { setCitationToInsert } = useStore();
    const { references, loading, error, addReference, updateReference } = useReferences();

    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [adding, setAdding] = useState(false);
    const [activeTab, setActiveTab] = useState<'local' | 'global'>('local');

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [originalId, setOriginalId] = useState('');

    const [formType, setFormType] = useState('article');
    const [formTitle, setFormTitle] = useState('');
    const [formAuthor, setFormAuthor] = useState('');
    const [formYear, setFormYear] = useState('');
    const [formUrl, setFormUrl] = useState('');
    const [formDoi, setFormDoi] = useState('');
    const [formId, setFormId] = useState('');

    const handleSaveReference = async () => {
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
            if (isEditing && originalId) {
                await updateReference(originalId, newEntry);
            } else {
                await addReference(newEntry);
            }

            // Reset Form
            resetForm();
            setShowAdd(false);
        } catch (error) {
            console.error('Failed to save reference', error);
            alert('Failed to save reference');
        } finally {
            setAdding(false);
        }
    };

    const resetForm = () => {
        setFormTitle('');
        setFormAuthor('');
        setFormYear('');
        setFormUrl('');
        setFormDoi('');
        setFormId('');
        setFormType('article');
        setIsEditing(false);
        setOriginalId('');
    };

    const startEditing = (ref: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setFormType(ref.type || 'article');
        setFormTitle(ref.title || '');
        setFormAuthor(ref.author || '');
        setFormYear(ref.year || '');
        setFormUrl(ref.url || '');
        setFormDoi(ref.doi || '');
        setFormId(ref.id || '');

        setOriginalId(ref.id);
        setIsEditing(true);
        setShowAdd(true);
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
        <div className="w-80 h-full border-l border-olive-medium/20 bg-paper flex flex-col">
            <div className="p-4 border-b border-olive-medium/20 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-olive-medium uppercase tracking-wider">
                        References
                    </h2>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowAdd(!showAdd);
                        }}
                        className="p-1 hover:bg-olive-medium/10 rounded text-olive-medium hover:text-olive-dark transition-colors"
                        title="Add Reference"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Tab Toggle */}
                <div className="flex p-1 bg-olive-medium/10 rounded-md">
                    <button
                        onClick={() => setActiveTab('local')}
                        className={clsx(
                            "flex-1 py-1 text-xs font-medium rounded-sm transition-colors",
                            activeTab === 'local'
                                ? "bg-paper text-olive-dark shadow-sm"
                                : "text-olive-medium hover:text-olive-dark"
                        )}
                    >
                        Local
                    </button>
                    <button
                        onClick={() => setActiveTab('global')}
                        className={clsx(
                            "flex-1 py-1 text-xs font-medium rounded-sm transition-colors",
                            activeTab === 'global'
                                ? "bg-paper text-olive-dark shadow-sm"
                                : "text-olive-medium hover:text-olive-dark"
                        )}
                    >
                        Global
                    </button>
                </div>

                {error && (
                    <div className="p-2 text-xs text-red-600 bg-red-50 rounded border border-red-200">
                        {error}
                    </div>
                )}

                {showAdd ? (
                    <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200 bg-paper p-3 rounded-md border border-olive-medium/20 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase text-olive-medium">
                                {isEditing ? 'Edit Reference' : 'New Reference'}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <select
                                value={formType}
                                onChange={(e) => setFormType(e.target.value)}
                                className="w-full p-1.5 text-xs border border-olive-medium/20 rounded bg-transparent text-olive-dark focus:border-olive-medium focus:outline-none"
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
                                className="w-full p-1.5 text-xs border border-olive-medium/20 rounded bg-transparent text-olive-dark focus:border-olive-medium focus:outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Title"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="w-full p-1.5 text-xs border border-olive-medium/20 rounded bg-transparent text-olive-dark focus:border-olive-medium focus:outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Author"
                                value={formAuthor}
                                onChange={(e) => setFormAuthor(e.target.value)}
                                className="w-full p-1.5 text-xs border border-olive-medium/20 rounded bg-transparent text-olive-dark focus:border-olive-medium focus:outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Year"
                                value={formYear}
                                onChange={(e) => setFormYear(e.target.value)}
                                className="w-full p-1.5 text-xs border border-olive-medium/20 rounded bg-transparent text-olive-dark focus:border-olive-medium focus:outline-none"
                            />
                            <input
                                type="text"
                                placeholder="URL (optional)"
                                value={formUrl}
                                onChange={(e) => setFormUrl(e.target.value)}
                                className="w-full p-1.5 text-xs border border-olive-medium/20 rounded bg-transparent text-olive-dark focus:border-olive-medium focus:outline-none"
                            />
                            <input
                                type="text"
                                placeholder="DOI (optional)"
                                value={formDoi}
                                onChange={(e) => setFormDoi(e.target.value)}
                                className="w-full p-1.5 text-xs border border-olive-medium/20 rounded bg-transparent text-olive-dark focus:border-olive-medium focus:outline-none"
                            />
                        </div>

                        <div className="flex justify-end gap-2 mt-3">
                            <button
                                onClick={() => {
                                    setShowAdd(false);
                                    resetForm();
                                }}
                                className="px-2 py-1 text-xs text-olive-medium hover:text-olive-dark"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveReference}
                                disabled={adding}
                                className="px-2 py-1 text-xs bg-olive-dark text-olive-light rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                            >
                                {adding && <Loader2 className="w-3 h-3 animate-spin" />}
                                {isEditing ? 'Update' : 'Add'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-olive-medium" />
                        <input
                            type="text"
                            placeholder="Search refs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-olive-medium/5 border-none rounded-md text-sm text-olive-dark placeholder:text-olive-medium/50 focus:ring-1 focus:ring-olive-medium"
                        />
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {loading ? (
                    <div className="p-4 text-center text-sm text-olive-medium">Loading references...</div>
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
                                "p-3 bg-paper rounded-md border border-olive-medium/20 transition-colors group relative",
                                (ref.url || ref.doi) ? "cursor-pointer hover:border-olive-medium hover:bg-olive-medium/5" : ""
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="font-medium text-sm text-olive-dark line-clamp-2">
                                    {ref.title || 'Untitled'}
                                </div>
                                <span className="text-xs font-mono text-olive-medium shrink-0">
                                    {ref.id}
                                </span>
                            </div>
                            <div className="mt-1 text-xs text-olive-medium line-clamp-1">
                                {ref.author}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-olive-medium/70">
                                <span className="px-1.5 py-0.5 bg-olive-medium/10 rounded">
                                    {ref.type}
                                </span>
                                {ref.year && <span>{ref.year}</span>}
                                {ref.source && (
                                    <span className={clsx(
                                        "px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider",
                                        (ref.source === 'local' || ref.source === 'both')
                                            ? "bg-olive-medium/20 text-olive-dark"
                                            : "bg-olive-medium/10 text-olive-medium"
                                    )}>
                                        {ref.source === 'both' ? 'LOCAL+GLOBAL' : ref.source}
                                    </span>
                                )}
                            </div>

                            {/* Actions - Visible on Hover */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button
                                    onClick={(e) => startEditing(ref, e)}
                                    className="p-1 bg-paper text-olive-medium hover:text-olive-dark rounded shadow-sm border border-olive-medium/20"
                                    title="Edit"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCitationToInsert(`\\cite{${ref.id}}`);
                                    }}
                                    className="px-2 py-1 bg-olive-dark text-olive-light text-xs rounded shadow-sm hover:opacity-90"
                                >
                                    Cite
                                </button>
                            </div>
                        </div>
                    ))
                )}
                {filteredRefs.length === 0 && !loading && (
                    <div className="p-4 text-center text-xs text-olive-medium">
                        {error ? 'Error loading references' : 'No references found'}
                    </div>
                )}
            </div>
        </div>
    );
}
