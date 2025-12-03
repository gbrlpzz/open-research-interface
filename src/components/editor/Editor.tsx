import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { updateFile } from '@/lib/github';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import { Save, X, Loader2, Eye, Code, FileText, Check } from 'lucide-react';
import clsx from 'clsx';
import { LatexRenderer } from './LatexRenderer';

export function Editor() {
    const {
        token,
        activeFile,
        openFiles,
        closeFile,
        updateFileContent,
        setActiveFile,
        viewMode,
        currentRepo,
        currentBranch,
    } = useStore();

    const [saving, setSaving] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');
    const [showCommitInput, setShowCommitInput] = useState(false);
    const [editorMode, setEditorMode] = useState<'live' | 'preview' | 'code'>('live');
    const [editorView, setEditorView] = useState<EditorView | null>(null);
    const { citationToInsert, setCitationToInsert } = useStore();

    useEffect(() => {
        if (citationToInsert && editorView) {
            const transaction = editorView.state.update({
                changes: { from: editorView.state.selection.main.head, insert: citationToInsert },
                selection: { anchor: editorView.state.selection.main.head + citationToInsert.length }
            });
            editorView.dispatch(transaction);
            setCitationToInsert(null);
            // Focus back to editor
            editorView.focus();
        }
    }, [citationToInsert, editorView, setCitationToInsert]);

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
                currentFile.sha,
                currentBranch // Pass current branch to updateFile
            );
            setShowCommitInput(false);
            setCommitMessage('');
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
            <div className="flex-1 flex items-center justify-center bg-paper text-olive-medium">
                <div className="text-center">
                    <p>Select a file to edit</p>
                </div>
            </div>
        );
    }

    const content = currentFile.content || '';

    return (
        <div className="flex-1 flex flex-col h-full bg-paper overflow-hidden">
            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-olive-medium/20 bg-paper">
                {openFiles.map((file) => (
                    <div
                        key={file.path}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 text-sm border-r border-olive-medium/20 cursor-pointer min-w-[150px] max-w-[200px]",
                            activeFile === file.path
                                ? "bg-paper text-olive-dark font-medium border-t-2 border-t-olive-dark"
                                : "bg-olive-medium/5 text-olive-medium hover:bg-olive-medium/10"
                        )}
                        onClick={() => setActiveFile(file.path)}
                    >
                        <span className="truncate flex-1">{file.path.split('/').pop()}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                closeFile(file.path);
                            }}
                            className="p-0.5 hover:bg-olive-medium/20 rounded text-olive-medium hover:text-olive-dark"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="h-12 border-b border-olive-medium/20 flex items-center justify-between px-4 bg-paper">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-olive-dark">
                        <FileText className="w-4 h-4 text-olive-medium" />
                        <span className="font-medium">{currentFile.path.split('/').pop()}</span>
                    </div>
                    {currentBranch && (
                        <span className="px-1.5 py-0.5 bg-olive-medium/10 rounded text-xs font-mono text-olive-medium">
                            {currentBranch}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex bg-olive-medium/10 rounded-md p-0.5 mr-2">
                        <button
                            onClick={() => setEditorMode('live')}
                            className={clsx(
                                "px-2 py-1 text-xs font-medium rounded-sm transition-colors",
                                editorMode === 'live' ? "bg-paper text-olive-dark shadow-sm" : "text-olive-medium hover:text-olive-dark"
                            )}
                        >
                            Live
                        </button>
                        <button
                            onClick={() => setEditorMode('preview')}
                            className={clsx(
                                "px-2 py-1 text-xs font-medium rounded-sm transition-colors",
                                editorMode === 'preview' ? "bg-paper text-olive-dark shadow-sm" : "text-olive-medium hover:text-olive-dark"
                            )}
                        >
                            Preview
                        </button>
                        <button
                            onClick={() => setEditorMode('code')}
                            className={clsx(
                                "px-2 py-1 text-xs font-medium rounded-sm transition-colors",
                                editorMode === 'code' ? "bg-paper text-olive-dark shadow-sm" : "text-olive-medium hover:text-olive-dark"
                            )}
                        >
                            Code
                        </button>
                    </div>

                    {showCommitInput ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                            <input
                                type="text"
                                value={commitMessage}
                                onChange={(e) => setCommitMessage(e.target.value)}
                                placeholder="Commit message..."
                                className="text-sm bg-olive-medium/5 border border-olive-medium/20 rounded px-2 py-1 w-48 focus:outline-none focus:border-olive-medium"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            />
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="p-1.5 bg-olive-dark text-olive-light rounded hover:opacity-90 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => setShowCommitInput(false)}
                                className="p-1.5 text-olive-medium hover:text-olive-dark"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (currentRepo && currentFile) {
                                        const branch = currentBranch || 'main';
                                        const url = `https://github.com/${currentFile.owner}/${currentFile.repo}/blob/${branch}/${currentFile.path}`;
                                        window.open(url, '_blank');
                                    }
                                }}
                                className="p-1.5 hover:bg-olive-medium/10 rounded text-olive-medium hover:text-olive-dark transition-colors"
                                title="Open on GitHub"
                            >
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => {
                                    setCommitMessage(`Update ${currentFile.path.split('/').pop()} via OpenResearchApp`);
                                    setShowCommitInput(true);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-olive-dark text-olive-light text-sm rounded hover:opacity-90 transition-opacity"
                            >
                                <Save className="w-3 h-3" />
                                <span>Save</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden relative bg-paper">
                {editorMode === 'live' ? (
                    <div className="flex h-full">
                        <div className="w-1/2 h-full border-r border-olive-medium/20 overflow-y-auto">
                            <CodeMirror
                                value={content}
                                height="100%"
                                extensions={[markdown()]}
                                onChange={handleChange}
                                onCreateEditor={setEditorView}
                                theme="light"
                                className="h-full text-base"
                            />
                        </div>
                        <div className="w-1/2 h-full overflow-y-auto bg-paper p-8">
                            <LatexRenderer content={content} />
                        </div>
                    </div>
                ) : editorMode === 'preview' ? (
                    <div className="h-full overflow-y-auto bg-paper p-8 max-w-4xl mx-auto shadow-sm my-4 border border-olive-medium/10">
                        <LatexRenderer content={content} />
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto">
                        <CodeMirror
                            value={content}
                            height="100%"
                            extensions={[markdown()]}
                            onChange={handleChange}
                            onCreateEditor={setEditorView}
                            theme="light"
                            className="h-full text-base"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
