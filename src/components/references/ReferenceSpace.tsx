import { useState } from 'react';
import { useReferences } from '@/hooks/useReferences';
import { Search, BookOpen, ExternalLink, Plus, Loader2, Edit2, Copy, Check } from 'lucide-react';
import clsx from 'clsx';

export function ReferenceSpace() {
    const { references, loading, error, addReference, updateReference } = useReferences();
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [adding, setAdding] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

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

    const filteredRefs = references.filter(ref =>
        (ref.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (ref.author?.toLowerCase() || '').includes(search.toLowerCase()) ||
        ref.id.toLowerCase().includes(search.toLowerCase())
    );

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

    const startEditing = (ref: any) => {
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

    const copyCitation = (id: string) => {
        const citation = `\\cite{${id}}`;
        navigator.clipboard.writeText(citation);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-paper overflow-hidden font-sans">
            {/* Header */}
            <div className="px-8 py-12 flex flex-col gap-6 border-b border-olive-medium/20">
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-olive-dark swiss-type">
                            References
                        </h1>
                        <p className="mt-2 text-olive-medium text-sm uppercase tracking-widest">
                            Global Bibliography
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowAdd(true);
                        }}
                        className="px-6 py-3 bg-olive-dark text-olive-light text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Add Reference
                    </button>
                </div>

                <div className="relative max-w-xl">
                    <Search className="absolute left-0 top-3 w-5 h-5 text-olive-medium" />
                    <input
                        type="text"
                        placeholder="Search by title, author, or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 py-2 bg-transparent border-b border-olive-medium/20 text-lg text-olive-dark focus:outline-none focus:border-olive-dark transition-colors placeholder:text-olive-medium/50"
                    />
                </div>
            </div>

            {/* Add Modal/Form Overlay */}
            {showAdd && (
                <div className="absolute inset-0 bg-paper/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-paper w-full max-w-2xl p-12 border border-olive-medium/20 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight text-olive-dark">
                                {isEditing ? 'Edit Reference' : 'New Reference'}
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-xs uppercase tracking-widest text-olive-medium mb-2">Type</label>
                                <select
                                    value={formType}
                                    onChange={(e) => setFormType(e.target.value)}
                                    className="w-full p-3 bg-olive-medium/5 border-none focus:ring-1 focus:ring-olive-dark text-olive-dark"
                                >
                                    <option value="article">Article</option>
                                    <option value="book">Book</option>
                                    <option value="inproceedings">Conference</option>
                                    <option value="misc">Misc</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs uppercase tracking-widest text-olive-medium mb-2">Title</label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    className="w-full p-3 bg-olive-medium/5 border-none focus:ring-1 focus:ring-olive-dark text-olive-dark"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs uppercase tracking-widest text-olive-medium mb-2">Author</label>
                                <input
                                    type="text"
                                    value={formAuthor}
                                    onChange={(e) => setFormAuthor(e.target.value)}
                                    className="w-full p-3 bg-olive-medium/5 border-none focus:ring-1 focus:ring-olive-dark text-olive-dark"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs uppercase tracking-widest text-olive-medium mb-2">Year</label>
                                <input
                                    type="text"
                                    value={formYear}
                                    onChange={(e) => setFormYear(e.target.value)}
                                    className="w-full p-3 bg-olive-medium/5 border-none focus:ring-1 focus:ring-olive-dark text-olive-dark"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs uppercase tracking-widest text-olive-medium mb-2">ID (Optional)</label>
                                <input
                                    type="text"
                                    value={formId}
                                    onChange={(e) => setFormId(e.target.value)}
                                    className="w-full p-3 bg-olive-medium/5 border-none focus:ring-1 focus:ring-olive-dark text-olive-dark"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs uppercase tracking-widest text-olive-medium mb-2">URL / DOI</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="URL"
                                        value={formUrl}
                                        onChange={(e) => setFormUrl(e.target.value)}
                                        className="w-1/2 p-3 bg-olive-medium/5 border-none focus:ring-1 focus:ring-olive-dark text-olive-dark"
                                    />
                                    <input
                                        type="text"
                                        placeholder="DOI"
                                        value={formDoi}
                                        onChange={(e) => setFormDoi(e.target.value)}
                                        className="w-1/2 p-3 bg-olive-medium/5 border-none focus:ring-1 focus:ring-olive-dark text-olive-dark"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 pt-4">
                            <button
                                onClick={() => {
                                    setShowAdd(false);
                                    resetForm();
                                }}
                                className="px-6 py-3 text-olive-medium hover:text-olive-dark uppercase tracking-widest text-xs font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveReference}
                                disabled={adding}
                                className="px-6 py-3 bg-olive-dark text-olive-light text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                            >
                                {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isEditing ? 'Update Reference' : 'Save Reference'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-olive-medium gap-2 uppercase tracking-widest text-xs">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-600 border-l-2 border-red-500">
                        {error}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredRefs.map((ref) => (
                            <div
                                key={ref.id}
                                className="group flex flex-col h-full hover:bg-olive-medium/5 transition-colors p-4 -m-4 rounded-lg relative"
                            >
                                <div className="flex items-baseline justify-between mb-3 border-b border-olive-medium/20 pb-2">
                                    <span className="text-xs font-bold uppercase tracking-widest text-olive-medium group-hover:text-olive-dark transition-colors">
                                        {ref.type}
                                    </span>
                                    <div className="flex gap-2">
                                        {(ref.url || ref.doi) && (
                                            <a
                                                href={ref.url || `https://doi.org/${ref.doi}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-olive-medium hover:text-olive-dark transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                        <span className="text-xs font-mono text-olive-medium/70 group-hover:text-olive-medium">
                                            {ref.id}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-lg font-medium leading-tight text-olive-dark mb-2">
                                    {ref.title || 'Untitled'}
                                </h3>

                                <div className="mt-auto pt-4">
                                    <p className="text-sm text-olive-medium mb-1">
                                        {ref.author}
                                    </p>
                                    <p className="text-sm text-olive-medium/70">
                                        {ref.year}
                                    </p>

                                    {ref.usedIn.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {ref.usedIn.map(repo => (
                                                <span key={repo} className="text-[10px] uppercase tracking-wider text-olive-medium border border-olive-medium/20 px-1.5 py-0.5 rounded-full">
                                                    {repo}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions - Visible on Hover */}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                    <button
                                        onClick={() => startEditing(ref)}
                                        className="p-2 bg-paper text-olive-medium hover:text-olive-dark rounded-full shadow-sm border border-olive-medium/20"
                                        title="Edit"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => copyCitation(ref.id)}
                                        className="p-2 bg-paper text-olive-medium hover:text-olive-dark rounded-full shadow-sm border border-olive-medium/20"
                                        title="Copy Citation"
                                    >
                                        {copiedId === ref.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
