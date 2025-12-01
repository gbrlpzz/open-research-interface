import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexRendererProps {
    content: string;
}

export function LatexRenderer({ content }: LatexRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Simple LaTeX to HTML converter
        let html = content;

        // Escape HTML special characters to prevent XSS (basic)
        html = html
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // 1. Math (using KaTeX)
        // Inline math $...$
        html = html.replace(/\$([^$]+)\$/g, (match, math) => {
            try {
                return katex.renderToString(math, { throwOnError: false });
            } catch (e) {
                return match;
            }
        });

        // Display math \[...\]
        html = html.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => {
            try {
                return katex.renderToString(math, { displayMode: true, throwOnError: false });
            } catch (e) {
                return match;
            }
        });

        // 2. Structure
        html = html
            .replace(/\\section\*?{([^}]+)}/g, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
            .replace(/\\subsection\*?{([^}]+)}/g, '<h2 class="text-xl font-bold mt-5 mb-3">$1</h2>')
            .replace(/\\subsubsection\*?{([^}]+)}/g, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
            .replace(/\\paragraph\*?{([^}]+)}/g, '<h4 class="font-bold mt-3 mb-1">$1</h4>');

        // 3. Text Formatting
        html = html
            .replace(/\\textbf{([^}]+)}/g, '<strong>$1</strong>')
            .replace(/\\textit{([^}]+)}/g, '<em>$1</em>')
            .replace(/\\emph{([^}]+)}/g, '<em>$1</em>')
            .replace(/\\underline{([^}]+)}/g, '<u>$1</u>')
            .replace(/\\texttt{([^}]+)}/g, '<code class="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">$1</code>');

        // 4. Lists (Basic support)
        // This is tricky with regex, let's just handle simple itemize/enumerate blocks by replacing the environment tags
        // and items. This is very fragile but works for simple cases.
        html = html.replace(/\\begin{itemize}/g, '<ul class="list-disc pl-6 my-4 space-y-1">');
        html = html.replace(/\\end{itemize}/g, '</ul>');
        html = html.replace(/\\begin{enumerate}/g, '<ol class="list-decimal pl-6 my-4 space-y-1">');
        html = html.replace(/\\end{enumerate}/g, '</ol>');
        html = html.replace(/\\item\s+([^\n]+)/g, '<li>$1</li>');

        // 5. Citations
        html = html.replace(/\\cite{([^}]+)}/g, (match, keys) => {
            const keyList = keys.split(',').map((k: string) => k.trim());
            return `<span class="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">[${keyList.join(', ')}]</span>`;
        });

        // 6. Newlines to <br> or paragraphs
        // Split by double newlines for paragraphs
        const paragraphs = html.split(/\n\s*\n/);
        html = paragraphs.map(p => `<p class="mb-4 leading-relaxed">${p}</p>`).join('');

        containerRef.current.innerHTML = html;

    }, [content]);

    return (
        <div
            ref={containerRef}
            className="prose dark:prose-invert max-w-none p-8 bg-white dark:bg-neutral-900 min-h-full"
        />
    );
}
