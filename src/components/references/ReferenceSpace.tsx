import { useState } from 'react';
import { useReferences } from '@/hooks/useReferences';
import { Search, BookOpen, ExternalLink, Plus, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function ReferenceSpace() {
    const { references, loading, error, addReference } = useReferences();
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [adding, setAdding] = useState(false);

    // Form State
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

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-neutral-950 overflow-hidden font-sans">
            {/* Header */}
            <div className="px-8 py-12 flex flex-col gap-6 border-b border-neutral-100 dark:border-neutral-900">
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 swiss-type">
                            References
                        </h1>
                        <p className="mt-2 text-neutral-500 dark:text-neutral-400 text-sm uppercase tracking-widest">
                            Global Bibliography
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="px-6 py-3 bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-80 transition-opacity"
                    >
                        Add Reference
                    </button>
                </div>

                <div className="relative max-w-xl">
                    <Search className="absolute left-0 top-3 w-5 h-5 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search by title, author, or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 py-2 bg-transparent border-b border-neutral-200 dark:border-neutral-800 text-lg focus:outline-none focus:border-black dark:focus:border-white transition-colors placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
                    />
                </div>
            </div>

            {/* Add Modal/Form Overlay */}
            {showAdd && (
                <div className="absolute inset-0 bg-white/90 dark:bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl p-12 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold tracking-tight">New Reference</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">Type</label>
                                <select
                                    value={formType}
                                    onChange={(e) => setFormType(e.target.value)}
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 border-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                                >
                                    <option value="article">Article</option>
                                    <option value="book">Book</option>
                                    <option value="inproceedings">Conference</option>
                                    <option value="misc">Misc</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 border-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">Author</label>
                                <input
                                    type="text"
                                    value={formAuthor}
                                    onChange={(e) => setFormAuthor(e.target.value)}
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 border-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">Year</label>
                                <input
                                    type="text"
                                    value={formYear}
                                    onChange={(e) => setFormYear(e.target.value)}
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 border-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">ID (Optional)</label>
                                <input
                                    type="text"
                                    value={formId}
                                    onChange={(e) => setFormId(e.target.value)}
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 border-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">URL / DOI</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="URL"
                                        value={formUrl}
                                        onChange={(e) => setFormUrl(e.target.value)}
                                        className="w-1/2 p-3 bg-neutral-50 dark:bg-neutral-800 border-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                                    />
                                    <input
                                        type="text"
                                        placeholder="DOI"
                                        value={formDoi}
                                        onChange={(e) => setFormDoi(e.target.value)}
                                        className="w-1/2 p-3 bg-neutral-50 dark:bg-neutral-800 border-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 pt-4">
                            <button
                                onClick={() => setShowAdd(false)}
                                className="px-6 py-3 text-neutral-500 hover:text-black dark:hover:text-white uppercase tracking-widest text-xs font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddReference}
                                disabled={adding}
                                className="px-6 py-3 bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-80 disabled:opacity-50 flex items-center gap-2"
                            >
                                {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Reference
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-neutral-400 gap-2 uppercase tracking-widest text-xs">
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
                                className="group flex flex-col h-full hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors p-4 -m-4 rounded-lg"
                            >
                                <div className="flex items-baseline justify-between mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                    <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        {ref.type}
                                    </span>
                                    <div className="flex gap-2">
                                        {(ref.url || ref.doi) && (
                                            <a
                                                href={ref.url || `https://doi.org/${ref.doi}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-neutral-400 hover:text-blue-600 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                        <span className="text-xs font-mono text-neutral-300 group-hover:text-neutral-500">
                                            {ref.id}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-lg font-medium leading-tight text-neutral-900 dark:text-neutral-100 mb-2 group-hover:text-black dark:group-hover:text-white">
                                    {ref.title || 'Untitled'}
                                </h3>

                                <div className="mt-auto pt-4">
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                                        {ref.author}
                                    </p>
                                    <p className="text-sm text-neutral-400 dark:text-neutral-500">
                                        {ref.year}
                                    </p>

                                    {ref.usedIn.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {ref.usedIn.map(repo => (
                                                <span key={repo} className="text-[10px] uppercase tracking-wider text-neutral-400 border border-neutral-200 dark:border-neutral-800 px-1.5 py-0.5 rounded-full">
                                                    {repo}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
