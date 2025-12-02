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
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-neutral-900 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Reference Space</h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Manage your global research bibliography</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search references..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add Reference
                    </button>
                </div>
            </div>

            {/* Add Modal/Form Overlay */}
            {showAdd && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-lg font-semibold">Add New Reference</h2>
                        <div className="space-y-3">
                            <select
                                value={formType}
                                onChange={(e) => setFormType(e.target.value)}
                                className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            >
                                <option value="article">Article</option>
                                <option value="book">Book</option>
                                <option value="inproceedings">Conference</option>
                                <option value="misc">Misc</option>
                            </select>
                            <input
                                type="text"
                                placeholder="ID (optional, auto-generated)"
                                value={formId}
                                onChange={(e) => setFormId(e.target.value)}
                                className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            />
                            <input
                                type="text"
                                placeholder="Title"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            />
                            <input
                                type="text"
                                placeholder="Author"
                                value={formAuthor}
                                onChange={(e) => setFormAuthor(e.target.value)}
                                className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            />
                            <input
                                type="text"
                                placeholder="Year"
                                value={formYear}
                                onChange={(e) => setFormYear(e.target.value)}
                                className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            />
                            <input
                                type="text"
                                placeholder="URL (optional)"
                                value={formUrl}
                                onChange={(e) => setFormUrl(e.target.value)}
                                className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            />
                            <input
                                type="text"
                                placeholder="DOI (optional)"
                                value={formDoi}
                                onChange={(e) => setFormDoi(e.target.value)}
                                className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-transparent"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowAdd(false)}
                                className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddReference}
                                disabled={adding}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                                Add Reference
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-neutral-500 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading references...
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                        {error}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRefs.map((ref) => (
                            <div
                                key={ref.id}
                                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:shadow-md transition-shadow group"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-xs font-medium rounded text-neutral-600 dark:text-neutral-300 uppercase">
                                            {ref.type}
                                        </span>
                                        <span className="text-xs font-mono text-neutral-400">
                                            {ref.id}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        {(ref.url || ref.doi) && (
                                            <a
                                                href={ref.url || `https://doi.org/${ref.doi}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 text-neutral-400 hover:text-blue-600 transition-colors"
                                                title="Open Link"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1 line-clamp-2">
                                    {ref.title || 'Untitled'}
                                </h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3 line-clamp-1">
                                    {ref.author} {ref.year && `(${ref.year})`}
                                </p>

                                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700/50 flex items-center justify-between">
                                    <div className="flex flex-wrap gap-1">
                                        {ref.usedIn.length > 0 ? (
                                            ref.usedIn.map(repo => (
                                                <span key={repo} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] rounded border border-blue-100 dark:border-blue-800">
                                                    {repo}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[10px] text-neutral-400 italic">Not used yet</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
