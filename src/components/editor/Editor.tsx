import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { updateFile } from '@/lib/github';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import { Save, X, Loader2, Eye, Code, FileText } from 'lucide-react';
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
    } = useStore();

    const [saving, setSaving] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');
    const [showCommitInput, setShowCommitInput] = useState(false);
    const [editorMode, setEditorMode] = useState<'live' | 'preview' | 'code'>('live');

    const currentFile = openFiles.find(f => f.path === activeFile);

    const isPaperMainDoc =
        viewMode === 'paper' &&
        !!currentRepo &&
        !!currentFile &&
        currentFile.repo === currentRepo.name &&
        (currentFile.path === 'main.tex' || currentFile.path.includes('drafts/')) &&
        currentRepo.name.startsWith('paper-');

    // ... handleSave ...

    // ... handleChange ...

    // ... if (!activeFile) ...

    // ... return ...

    {
        isPaperMainDoc && (
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-md p-0.5">
                <button
                    onClick={() => setEditorMode('live')}
                    className={clsx(
                        "px-2 py-1 text-xs font-medium rounded-sm flex items-center gap-1 transition-colors",
                        editorMode === 'live'
                            ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    )}
                >
                    <Eye className="w-3 h-3" />
                    Live
                </button>
                <button
                    onClick={() => setEditorMode('preview')}
                    className={clsx(
                        "px-2 py-1 text-xs font-medium rounded-sm flex items-center gap-1 transition-colors",
                        editorMode === 'preview'
                            ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    )}
                >
                    <FileText className="w-3 h-3" />
                    Preview
                </button>
                <button
                    onClick={() => setEditorMode('code')}
                    className={clsx(
                        "px-2 py-1 text-xs font-medium rounded-sm flex items-center gap-1 transition-colors",
                        editorMode === 'code'
                            ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    )}
                >
                    <Code className="w-3 h-3" />
                    Code
                </button>
            </div>
        )
    }
                </div >
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
            </div >

        {/* Editor Area */ }
        < div className = "flex-1 overflow-hidden relative" >
            { isPaperMainDoc && editorMode === 'preview' ? (
            <div className="h-full overflow-y-auto bg-neutral-100 dark:bg-neutral-950">
                <div className="max-w-[816px] min-h-[1056px] mx-auto my-10 bg-white dark:bg-neutral-900 shadow-sm rounded-sm">
                    <LatexRenderer content={currentFile.content} />
                </div>
            </div>
        ) : (
            <CodeMirror
                value={currentFile.content}
                height="100%"
                extensions={[
                    markdown({ base: markdownLanguage }),
                    EditorView.lineWrapping, // Enable line wrapping for prose
                    EditorView.theme(
                        isPaperMainDoc && editorMode === 'live'
                            ? {
                                "&": {
                                    fontSize: "16px",
                                    fontFamily: "var(--font-inter), sans-serif",
                                    backgroundColor: "#f5f5f5", // Gray background for "desk" feel
                                    height: "100%"
                                },
                                ".cm-content": {
                                    maxWidth: "816px", // A4 width approx (8.5in * 96px)
                                    minHeight: "1056px", // A4 height approx
                                    margin: "40px auto",
                                    padding: "60px 80px", // Generous margins
                                    backgroundColor: "white",
                                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                                    borderRadius: "2px"
                                },
                                ".cm-line": { lineHeight: "1.8", color: "#333" },
                                ".cm-activeLine": { backgroundColor: "transparent" },
                                ".cm-gutters": { display: "none" }
                            }
                            : {
                                "&": { fontSize: "13px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" },
                                ".cm-content": { maxWidth: "100%", margin: "0", padding: "16px 12px" },
                            }
                    ),
                    // Simple decorations for "Live Preview" feel
                    EditorView.baseTheme({
                        ".cm-header-1": { fontSize: "2em", fontWeight: "bold", marginTop: "1em", marginBottom: "0.5em" },
                        ".cm-header-2": { fontSize: "1.5em", fontWeight: "bold", marginTop: "1em", marginBottom: "0.5em" },
                        ".cm-header-3": { fontSize: "1.25em", fontWeight: "bold", marginTop: "1em", marginBottom: "0.5em" },
                        ".cm-strong": { fontWeight: "bold" },
                        ".cm-em": { fontStyle: "italic" },
                        ".cm-citation": {
                            backgroundColor: "#e0f2fe",
                            color: "#0284c7",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "0.9em",
                            fontWeight: "500"
                        }
                    })
                ]}
                onChange={handleChange}
                theme={isPaperMainDoc && editorMode === 'live' ? 'light' : 'light'}
                className="h-full text-base"
                basicSetup={{
                    lineNumbers: !(isPaperMainDoc && editorMode === 'live'),
                    foldGutter: !(isPaperMainDoc && editorMode === 'live'),
                    highlightActiveLine: !(isPaperMainDoc && editorMode === 'live'),
                }}
            />
        )
}
            </div >
        </div >
    );
}
