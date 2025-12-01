import { useEffect, useState } from 'react';
import { X, GitMerge, Loader2 } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { languages } from '@codemirror/language-data';
import { unifiedMergeView } from '@codemirror/merge';

interface DiffModalProps {
    originalContent: string;
    modifiedContent: string;
    draftName: string;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export function DiffModal({ originalContent, modifiedContent, draftName, onClose, onConfirm }: DiffModalProps) {
    const [merging, setMerging] = useState(false);

    const handleConfirm = async () => {
        setMerging(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error('Merge failed', error);
        } finally {
            setMerging(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex flex-col border border-neutral-200 dark:border-neutral-800">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                            Merge {draftName}
                        </h2>
                        <p className="text-sm text-neutral-500">
                            Review changes before merging into Main Document
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative bg-neutral-50 dark:bg-neutral-950">
                    <CodeMirror
                        value={modifiedContent} // We use modified content as value, but mergeView handles the diff
                        height="100%"
                        extensions={[
                            markdown({ base: markdownLanguage }),
                            unifiedMergeView({
                                original: originalContent,
                                mergeControls: false, // Read-only diff
                                highlightChanges: true,
                                gutter: true
                            })
                        ]}
                        theme="light"
                        className="h-full text-sm"
                    />
                </div>

                <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={merging}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
                        Confirm Merge
                    </button>
                </div>
            </div>
        </div>
    );
}
