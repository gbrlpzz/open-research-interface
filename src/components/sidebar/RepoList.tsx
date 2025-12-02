import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getRepos } from '@/lib/github';
import { FileText, Search, Plus } from 'lucide-react';
import { NewArtifactModal } from './NewArtifactModal';
import clsx from 'clsx';

const getIconForRepo = () => {
    return <FileText className="w-4 h-4 text-blue-500" />;
};

export function RepoList() {
    const { token, repos, setRepos, setCurrentRepo, setViewMode } = useStore();
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [showNewArtifactModal, setShowNewArtifactModal] = useState(false);

    useEffect(() => {
        if (token && repos.length === 0) {
            setLoading(true);
            getRepos(token)
                .then((data) => {
                    // Filter for relevant repos (Papers and Index only) for state,
                    // but UI will only show paper repos so this feels like "list of papers".
                    const filtered = data.filter(r =>
                        r.name === 'research-index' ||
                        r.name.startsWith('paper-')
                    );
                    setRepos(filtered);
                })
                .finally(() => setLoading(false));
        }
    }, [token, repos.length, setRepos]);

    // Show all artifact repos (paper-, dataset-, app-, notebook-, model-); research-index stays hidden.
    const artifactRepos = repos.filter(r =>
        r.name.startsWith('paper-') ||
        r.name.startsWith('dataset-') ||
        r.name.startsWith('app-') ||
        r.name.startsWith('notebook-') ||
        r.name.startsWith('model-')
    );

    const filteredArtifacts = artifactRepos.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase())
    );

    const sortedArtifacts = [...filteredArtifacts].sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at)
    );

    return (
        <div className="flex flex-col h-full font-sans">
            <div className="px-4 py-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest swiss-type">
                        Documents
                    </h2>
                    <button
                        onClick={() => setShowNewArtifactModal(true)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                        title="New Artifact"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <div className="relative group">
                    <Search className="absolute left-0 top-2.5 w-4 h-4 text-neutral-300 group-focus-within:text-neutral-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-6 py-2 bg-transparent border-b border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors placeholder:text-neutral-300"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
                {loading ? (
                    <div className="p-4 text-center text-xs uppercase tracking-widest text-neutral-400">Loading...</div>
                ) : (
                    sortedArtifacts.map((repo) => (
                        <button
                            key={repo.id}
                            onClick={() => {
                                setCurrentRepo(repo);
                                setViewMode('paper');
                            }}
                            className={clsx(
                                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm transition-all duration-200 group",
                                "hover:bg-neutral-100 dark:hover:bg-neutral-900",
                                "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                            )}
                        >
                            <FileText className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                            <span className="truncate">{repo.name}</span>
                        </button>
                    ))
                )}
            </div>

            {showNewArtifactModal && (
                <NewArtifactModal onClose={() => setShowNewArtifactModal(false)} />
            )}
        </div>
    );
}
