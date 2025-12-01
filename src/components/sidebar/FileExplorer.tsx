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
            setFiles(Array.isArray(data) ? data : [data]);
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
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
                <button
                    onClick={handleBack}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-medium text-sm truncate flex-1">
                    {currentPath ? currentPath.split('/').pop() : currentRepo.name}
                </span>
                <button
                    onClick={fetchFiles}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                    title="Refresh"
                >
                    <RefreshCw className={clsx("w-3 h-3", loading && "animate-spin")} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading && files.length === 0 ? (
                    <div className="p-4 text-center text-sm text-neutral-500">Loading...</div>
                ) : (
                    <>
                        {currentPath !== '' && (
                            <button
                                onClick={handleBack}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
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
                                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                                    "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                                    "text-neutral-700 dark:text-neutral-300"
                                )}
                            >
                                {file.type === 'dir' ? (
                                    <Folder className="w-4 h-4 text-blue-400" />
                                ) : (
                                    <File className="w-4 h-4 text-neutral-400" />
                                )}
                                <span className="truncate">{file.name}</span>
                            </button>
                        ))}
                        {files.length === 0 && !loading && (
                            <div className="p-4 text-center text-xs text-neutral-400">Empty directory</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
