import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getRepoContents, getFileContent } from '@/lib/github';
import { File, Folder, ChevronLeft, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

export function FileExplorer() {
    const {
        token,
        currentRepo,
        currentPath,
        setCurrentPath,
        files,
        setFiles,
        openFile,
        setCurrentRepo
    } = useStore();

    const [loading, setLoading] = useState(false);

    const fetchFiles = async () => {
        if (!token || !currentRepo) return;

        setLoading(true);
        try {
            const data = await getRepoContents(token, currentRepo.owner, currentRepo.name, currentPath);
            const rawFiles = Array.isArray(data) ? data : [data];

            // Strict Abstraction: Only show main.tex and .bib files
            // Flatten the view (ignore directories for now, or just look at root)
            // If the user wants "only main.tex", we should probably just show that.
            const filteredFiles = rawFiles.filter(f => {
                if (f.name === 'main.tex') return true;
                if (f.name.endsWith('.bib')) return true;
                return false;
            });

            setFiles(filteredFiles);
        } catch (error) {
            console.error('Failed to fetch files', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [currentRepo, currentPath, token]);

    const handleFileClick = async (file: any) => {
        if (file.type === 'dir') {
            setCurrentPath(file.path);
        } else {
            // Open file
            if (!token || !currentRepo) return;
            try {
                const { content, sha } = await getFileContent(token, currentRepo.owner, currentRepo.name, file.path);
                openFile({
                    path: file.path,
                    content,
                    sha,
                    repo: currentRepo.name,
                    owner: currentRepo.owner
                });
            } catch (e) {
                console.error('Failed to open file', e);
            }
        }
    };

    const handleBack = () => {
        if (currentPath === '') {
            setCurrentRepo(null); // Go back to repo list
        } else {
            const parentPath = currentPath.split('/').slice(0, -1).join('/');
            setCurrentPath(parentPath);
        }
    };

    if (!currentRepo) return null;

    return (
        <div className="flex flex-col h-full font-sans">
            <div className="px-4 py-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                <button
                    onClick={handleBack}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-xs uppercase tracking-widest truncate flex-1 text-neutral-900 dark:text-neutral-100">
                    {currentPath ? currentPath.split('/').pop() : currentRepo.name}
                </span>
                <button
                    onClick={fetchFiles}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className={clsx("w-3 h-3", loading && "animate-spin")} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                {loading && files.length === 0 ? (
                    <div className="p-4 text-center text-xs uppercase tracking-widest text-neutral-400">Loading...</div>
                ) : (
                    <>
                        {currentPath !== '' && (
                            <button
                                onClick={handleBack}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                            >
                                <Folder className="w-4 h-4" />
                                <span>..</span>
                            </button>
                        )}
                        {files.map((file) => (
                            <button
                                key={file.sha}
                                onClick={() => handleFileClick(file)}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm transition-colors group",
                                    "hover:bg-neutral-100 dark:hover:bg-neutral-900",
                                    "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                                )}
                            >
                                {file.type === 'dir' ? (
                                    <Folder className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                                ) : (
                                    <File className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                                )}
                                <span className="truncate">{file.name}</span>
                            </button>
                        ))}
                        {files.length === 0 && !loading && (
                            <div className="p-4 text-center text-xs uppercase tracking-widest text-neutral-400">Empty directory</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
