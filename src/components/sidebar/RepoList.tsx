import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getRepos } from '@/lib/github';
import { Book, Database, FileText, Box, Terminal, Search, Plus } from 'lucide-react';
import { Repo } from '@/lib/types';
import { NewArtifactModal } from './NewArtifactModal';
import clsx from 'clsx';

const getIconForRepo = (name: string) => {
    if (name === 'research-index') return <Book className="w-4 h-4 text-purple-500" />;
    if (name.startsWith('paper-')) return <FileText className="w-4 h-4 text-blue-500" />;
    if (name.startsWith('dataset-')) return <Database className="w-4 h-4 text-green-500" />;
    if (name.startsWith('app-')) return <Box className="w-4 h-4 text-orange-500" />;
    if (name.startsWith('notebook-')) return <Terminal className="w-4 h-4 text-yellow-500" />;
    return <Book className="w-4 h-4 text-neutral-500" />;
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
                    // Filter for relevant repos (Papers and Index only)
                    const filtered = data.filter(r =>
                        r.name === 'research-index' ||
                        r.name.startsWith('paper-')
                    );
                    setRepos(filtered);
                })
                .finally(() => setLoading(false));
        }
    }, [token, repos.length, setRepos]);

    const filteredRepos = repos.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase())
    );

    const sortedRepos = [...filteredRepos].sort((a, b) => {
        if (a.name === 'research-index') return -1;
        if (b.name === 'research-index') return 1;
        return b.updated_at.localeCompare(a.updated_at);
    });

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Repositories
                    </h2>
                    <button
                        onClick={() => setShowNewArtifactModal(true)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-blue-600 transition-colors"
                        title="New Artifact"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-none rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                    <div className="p-4 text-center text-sm text-neutral-500">Loading repos...</div>
                ) : (
                    sortedRepos.map((repo) => (
                        <button
                            key={repo.id}
                            onClick={() => {
                                setCurrentRepo(repo);
                                if (repo.name.startsWith('paper-')) {
                                    setViewMode('paper');
                                } else {
                                    setViewMode('repo');
                                }
                            }}
                            className={clsx(
                                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                                "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                                "text-neutral-700 dark:text-neutral-300"
                            )}
                        >
                            {getIconForRepo(repo.name)}
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
