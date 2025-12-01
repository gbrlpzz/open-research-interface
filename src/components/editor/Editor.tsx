import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { updateFile } from '@/lib/github';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView, keymap, Decoration, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { Save, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';

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
    const [editorMode, setEditorMode] = useState<'editor' | 'code'>('editor');

    const currentFile = openFiles.find(f => f.path === activeFile);

    const isPaperMainDoc =
        viewMode === 'paper' &&
        !!currentRepo &&
        !!currentFile &&
        currentFile.repo === currentRepo.name &&
        currentFile.path.endsWith('.tex') &&
        currentRepo.name.startsWith('paper-');

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
                    <p>
                        {viewMode === 'paper'
                            ? 'Opening main document...'
                            : 'Select a file to edit'}
                    </p>
                </div>
            </div>
        );
    }

    // Determine language extension
    const ext = currentFile.path.split('.').pop()?.toLowerCase();

    const latexKeymap = keymap.of([
        {
            key: 'Mod-b',
            preventDefault: true,
            run: (view) => {
                const { from, to } = view.state.selection.main;
                const selected = view.state.sliceDoc(from, to);
                const wrapped = `\\textbf{${selected || 'text'}}`;
                view.dispatch({
                    changes: { from, to, insert: wrapped },
                    selection: { anchor: from + (selected ? wrapped.length : 8), head: from + (selected ? wrapped.length : 8) },
                });
                return true;
            },
        },
        {
            key: 'Mod-i',
            preventDefault: true,
            run: (view) => {
                const { from, to } = view.state.selection.main;
                const selected = view.state.sliceDoc(from, to);
                const wrapped = `\\textit{${selected || 'text'}}`;
                view.dispatch({
                    changes: { from, to, insert: wrapped },
                    selection: { anchor: from + (selected ? wrapped.length : 8), head: from + (selected ? wrapped.length : 8) },
                });
                return true;
            },
        },
    ]);

    // Visually hide simple LaTeX markup like \textbf{...} / \textit{...}
    const latexPrettyPrint = ViewPlugin.fromClass(
        class {
            decorations;
            constructor(view: EditorView) {
                this.decorations = this.buildDecorations(view);
            }
            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }
            buildDecorations(view: EditorView) {
                const ranges: any[] = [];
                const doc = view.state.doc;

                for (const { from, to } of view.visibleRanges) {
                    const text = doc.sliceString(from, to);
                    const re = /\\text(bf|it)\{([^}]*)\}/g;
                    let match: RegExpExecArray | null;
                    while ((match = re.exec(text)) !== null) {
                        const full = match[0];
                        const kind = match[1]; // 'bf' or 'it'

                        const fullStart = from + match.index;
                        const fullEnd = fullStart + full.length;

                        const openingLen = (`\\text${kind}{`).length;
                        const openingStart = fullStart;
                        const openingEnd = fullStart + openingLen;
                        const innerStart = openingEnd;
                        const innerEnd = fullEnd - 1; // before closing brace
                        const closingStart = fullEnd - 1;
                        const closingEnd = fullEnd;

                        if (openingStart < openingEnd) {
                            ranges.push(
                                Decoration.mark({ class: 'cm-hidden-latex-cmd' }).range(
                                    openingStart,
                                    openingEnd
                                )
                            );
                        }
                        if (closingStart < closingEnd) {
                            ranges.push(
                                Decoration.mark({ class: 'cm-hidden-latex-cmd' }).range(
                                    closingStart,
                                    closingEnd
                                )
                            );
                        }

                        const styleClass = kind === 'bf' ? 'cm-latex-bold' : 'cm-latex-italic';
                        if (innerStart < innerEnd) {
                            ranges.push(
                                Decoration.mark({ class: styleClass }).range(innerStart, innerEnd)
                            );
                        }
                    }
                }

                return Decoration.set(ranges, true);
            }
        },
        {
            decorations: (v) => v.decorations,
        }
    );

    const latexPrettyPrintTheme = EditorView.baseTheme({
        '.cm-hidden-latex-cmd': {
            display: 'none',
        },
        '.cm-latex-bold': {
            fontWeight: 600,
        },
        '.cm-latex-italic': {
            fontStyle: 'italic',
        },
    });

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-neutral-900">
            {/* Tabs */}
            {!isPaperMainDoc && (
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
            )}

            {/* Toolbar */}
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-white dark:bg-neutral-900">
                <div className="flex items-center gap-3 min-w-0">
                    {isPaperMainDoc ? (
                        <>
                            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                                Paper
                            </div>
                            <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                                {currentRepo?.name.replace(/^paper-/, '') || currentFile.repo}
                            </div>
                            <div className="text-xs text-neutral-400 truncate">
                                {currentFile.path}
                            </div>
                        </>
                    ) : (
                        <div className="text-sm text-neutral-500 truncate px-2">
                            {currentFile.repo} / {currentFile.path}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {isPaperMainDoc && (
                        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-full p-0.5 text-xs">
                            <button
                                className={clsx(
                                    "px-3 py-1 rounded-full transition-colors",
                                    editorMode === 'editor'
                                        ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm"
                                        : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                                )}
                                onClick={() => setEditorMode('editor')}
                            >
                                Editor view
                            </button>
                            <button
                                className={clsx(
                                    "px-3 py-1 rounded-full transition-colors",
                                    editorMode === 'code'
                                        ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm"
                                        : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                                )}
                                onClick={() => setEditorMode('code')}
                            >
                                Code view
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        {showCommitInput ? (
                            <div className="flex items-center gap-2 animate-in slide-in-from-right-5 fade-in duration-200">
                                <input
                                    type="text"
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                    placeholder="Commit message..."
                                    className="px-2 py-1 text-xs sm:text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-neutral-50 dark:bg-neutral-800 max-w-[220px] sm:max-w-xs"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                />
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-3 py-1 bg-green-600 text-white text-xs sm:text-sm rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
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
                                className={clsx(
                                    "flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm rounded hover:opacity-90 transition-opacity",
                                    isPaperMainDoc
                                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                                        : "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                                )}
                            >
                                <Save className="w-3 h-3" />
                                <span>Save to GitHub</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden relative">
                <CodeMirror
                    value={currentFile.content}
                    height="100%"
                    extensions={[
                        markdown({ base: markdownLanguage }),
                        EditorView.lineWrapping,
                        EditorView.theme(
                            isPaperMainDoc && editorMode === 'editor'
                                ? {
                                    "&": { fontSize: "16px", fontFamily: "var(--font-inter), sans-serif" },
                                    ".cm-content": { maxWidth: "800px", margin: "0 auto", padding: "40px 20px" },
                                    ".cm-line": { lineHeight: "1.6" },
                                }
                                : {
                                    "&": { fontSize: "13px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" },
                                    ".cm-content": { maxWidth: "100%", margin: "0", padding: "16px 12px" },
                                }
                        ),
                        isPaperMainDoc && editorMode === 'editor' ? latexPrettyPrint : [],
                        isPaperMainDoc && editorMode === 'editor' ? latexPrettyPrintTheme : [],
                        isPaperMainDoc ? latexKeymap : [],
                    ]}
                    onChange={handleChange}
                    theme={isPaperMainDoc && editorMode === 'editor' ? 'light' : 'light'}
                    className="h-full text-base"
                    basicSetup={{
                        lineNumbers: !(isPaperMainDoc && editorMode === 'editor'),
                        foldGutter: !isPaperMainDoc,
                        highlightActiveLine: !isPaperMainDoc,
                    }}
                />
            </div>
        </div>
    );
}
