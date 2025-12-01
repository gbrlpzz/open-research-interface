import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { updateFile } from '@/lib/github';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import { Save, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function Editor() {
    const {
        token,
        activeFile,
        openFiles,
        closeFile,
        updateFileContent,
        setActiveFile
    } = useStore();

    const [saving, setSaving] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');
    const [showCommitInput, setShowCommitInput] = useState(false);

    const currentFile = openFiles.find(f => f.path === activeFile);

    const handleSave = async () => {
        if (!token || !currentFile) return;
        if (!commitMessage) {
            alert('Please enter a commit message');
            return;
        }

        setSaving(true);
        try {
            await updateFile(
                token,
                currentFile.owner,
                currentFile.repo,
                currentFile.path,
                currentFile.content,
                commitMessage,
                currentFile.sha
            );
            setShowCommitInput(false);
            setCommitMessage('');
            // Ideally we should re-fetch the SHA here, but for MVP we might just assume success
            // Or trigger a refresh. For now, let's just close the input.
            alert('Saved to GitHub!');
        } catch (error) {
            console.error('Failed to save', error);
            alert('Failed to save to GitHub');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = useCallback((val: string) => {
        if (activeFile) {
            updateFileContent(activeFile, val);
        }
    }, [activeFile, updateFileContent]);

    if (!activeFile || !currentFile) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-neutral-900 text-neutral-400">
                <div className="text-center">
                    <p>Select a file to edit</p>
                </div>
            </div>
        );
    }

    // Determine language extension
    const ext = currentFile.path.split('.').pop()?.toLowerCase();
    const extensions = [markdown({ base: markdownLanguage })]; // Default to markdown for now

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-neutral-900">
            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
                {openFiles.map((file) => (
                    <div
                        key={file.path}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 text-sm border-r border-neutral-200 dark:border-neutral-700 cursor-pointer min-w-[150px] max-w-[200px]",
                            activeFile === file.path
                                ? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 font-medium border-t-2 border-t-blue-600"
                                : "bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        )}
                        onClick={() => setActiveFile(file.path)}
                    >
                        <span className="truncate flex-1">{file.path.split('/').pop()}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                closeFile(file.path);
                            }}
                            className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="p-2 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-white dark:bg-neutral-900">
                <div className="text-sm text-neutral-500 truncate px-2">
                    {currentFile.repo} / {currentFile.path}
                </div>
                <div className="flex items-center gap-2">
                    {showCommitInput ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-5 fade-in duration-200">
                            <input
                                type="text"
                                value={commitMessage}
                                onChange={(e) => setCommitMessage(e.target.value)}
                                placeholder="Commit message..."
                                className="px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-neutral-50 dark:bg-neutral-800"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            />
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                            >
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Commit'}
                            </button>
                            <button
                                onClick={() => setShowCommitInput(false)}
                                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                setCommitMessage(`Update ${currentFile.path.split('/').pop()} via OpenResearchApp`);
                                setShowCommitInput(true);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm rounded hover:opacity-90 transition-opacity"
                        >
                            <Save className="w-3 h-3" />
                            <span>Save to GitHub</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden relative">
                <CodeMirror
                    value={currentFile.content}
                    height="100%"
                    extensions={[
                        markdown({ base: markdownLanguage }),
                        EditorView.lineWrapping, // Enable line wrapping for prose
                        EditorView.theme({
                            "&": { fontSize: "16px", fontFamily: "var(--font-inter), sans-serif" },
                            ".cm-content": { maxWidth: "800px", margin: "0 auto", padding: "40px 20px" },
                            ".cm-line": { lineHeight: "1.6" },
                        })
                    ]}
                    onChange={handleChange}
                    theme="light" // Switch to light mode for paper writing feel (or keep dark based on preference)
                    className="h-full text-base"
                    basicSetup={{
                        lineNumbers: false, // Hide line numbers for writing focus
                        foldGutter: false,
                        highlightActiveLine: false,
                    }}
                />
            </div>
        </div>
    );
}
