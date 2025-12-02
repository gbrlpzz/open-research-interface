import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { getFileContent, updateFile } from '@/lib/github';
import { Reference } from '@/lib/types';

// Simple regex-based BibTeX parser
export const parseBibTeX = (content: string): Reference[] => {
    const references: Reference[] = [];
    const entries = content.split('@');

    for (const entry of entries) {
        if (!entry.trim()) continue;

        const typeMatch = entry.match(/^(\w+)\s*{/);
        const idMatch = entry.match(/{\s*([^,]+),/);

        if (typeMatch && idMatch) {
            const type = typeMatch[1];
            const id = idMatch[1];
            const titleMatch = entry.match(/title\s*=\s*{([^}]+)}/i);
            const authorMatch = entry.match(/author\s*=\s*{([^}]+)}/i);
            const yearMatch = entry.match(/year\s*=\s*{([^}]+)}/i);
            const urlMatch = entry.match(/url\s*=\s*{([^}]+)}/i);
            const doiMatch = entry.match(/doi\s*=\s*{([^}]+)}/i);

            references.push({
                id,
                type,
                title: titleMatch ? titleMatch[1] : undefined,
                author: authorMatch ? authorMatch[1] : undefined,
                year: yearMatch ? yearMatch[1] : undefined,
                url: urlMatch ? urlMatch[1] : undefined,
                doi: doiMatch ? doiMatch[1] : undefined,
                raw: '@' + entry
            });
        }
    }

    return references;
};

export interface ReferenceWithSource extends Reference {
    source: 'local' | 'global' | 'both';
    usedIn: string[]; // List of repo names where this reference appears
}

export function useReferences() {
    const { token, repos, currentRepo, user } = useStore();
    const [references, setReferences] = useState<ReferenceWithSource[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReferences = useCallback(async () => {
        if (!token) return;

        setLoading(true);
        setError(null);

        // Map to track usage: refID -> Set<repoName>
        const usageMap = new Map<string, Set<string>>();
        const globalRefsMap = new Map<string, Reference>();
        const localRefsMap = new Map<string, Reference>();

        try {
            // 1. Fetch from Global Research Index
            let indexOwner = '';
            let indexRepoName = 'research-index';

            const indexRepo = repos.find(r => r.name === 'research-index');
            if (indexRepo) {
                indexOwner = indexRepo.owner;
                indexRepoName = indexRepo.name;
            } else if (user?.login) {
                indexOwner = user.login;
            }

            if (indexOwner) {
                let path = '01. refs/references.bib';
                try {
                    await getFileContent(token, indexOwner, indexRepoName, path);
                } catch {
                    path = 'refs/references.bib';
                }

                try {
                    const { content } = await getFileContent(token, indexOwner, indexRepoName, path);
                    const refs = parseBibTeX(content);
                    refs.forEach(r => {
                        globalRefsMap.set(r.id, r);
                        // Mark as used in research-index? Maybe not "used in" but "stored in".
                        // Let's count research-index as a source but not necessarily "usage" in a paper.
                    });
                } catch (e: any) {
                    console.warn('Failed to fetch global refs', e);
                    if (indexRepo) {
                        setError(`Failed to fetch global refs: ${e.message || 'Unknown error'}`);
                    }
                }
            }

            // 2. Fetch from ALL Paper Repositories
            const paperRepos = repos.filter(r => r.name.startsWith('paper-'));

            const paperPromises = paperRepos.map(async (repo) => {
                try {
                    const { content } = await getFileContent(token, repo.owner, repo.name, 'references.bib');
                    const refs = parseBibTeX(content);
                    return { repo: repo.name, refs };
                } catch {
                    return { repo: repo.name, refs: [] };
                }
            });

            const paperResults = await Promise.allSettled(paperPromises);
            paperResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    const { repo, refs } = result.value;
                    refs.forEach(r => {
                        // Add to global list if not present (aggregation)
                        if (!globalRefsMap.has(r.id)) {
                            globalRefsMap.set(r.id, r);
                        }

                        // Track usage
                        if (!usageMap.has(r.id)) {
                            usageMap.set(r.id, new Set());
                        }
                        usageMap.get(r.id)?.add(repo);
                    });
                }
            });

            // 3. Fetch from Current Repository (Local)
            if (currentRepo && currentRepo.name !== 'research-index') {
                try {
                    const { content } = await getFileContent(token, currentRepo.owner, currentRepo.name, 'references.bib');
                    const refs = parseBibTeX(content);
                    refs.forEach(r => {
                        localRefsMap.set(r.id, r);
                    });
                } catch (e) {
                    // Ignore
                }
            }

            // Combine and determine source
            const combinedRefs: ReferenceWithSource[] = [];

            // Iterate over all unique IDs found globally
            for (const [id, ref] of globalRefsMap.entries()) {
                const isLocal = localRefsMap.has(id);
                const usedIn = Array.from(usageMap.get(id) || []);

                combinedRefs.push({
                    ...ref,
                    source: isLocal ? 'both' : 'global',
                    usedIn
                });
            }

            // Check for any local refs that somehow weren't in global (shouldn't happen if we aggregate correctly, 
            // but if paper-* fetching failed but currentRepo succeeded)
            for (const [id, ref] of localRefsMap.entries()) {
                if (!globalRefsMap.has(id)) {
                    combinedRefs.push({
                        ...ref,
                        source: 'local',
                        usedIn: [currentRepo?.name || 'current']
                    });
                }
            }

            setReferences(combinedRefs);

        } catch (error: any) {
            console.error('Failed to fetch references', error);
            setError(error.message || 'Failed to fetch references');
        } finally {
            setLoading(false);
        }
    }, [token, repos, currentRepo, user]);

    useEffect(() => {
        fetchReferences();
    }, [fetchReferences]);

    const addReference = async (entry: string) => {
        if (!token) return;
        const indexRepo = repos.find(r => r.name === 'research-index');
        if (!indexRepo) throw new Error('Research Index not found');

        let path = '01. refs/references.bib';
        let currentContent = '';
        let sha = '';

        try {
            const file = await getFileContent(token, indexRepo.name.split('/')[0], indexRepo.name, path);
            currentContent = file.content;
            sha = file.sha;
        } catch {
            path = 'refs/references.bib';
            const file = await getFileContent(token, indexRepo.name.split('/')[0], indexRepo.name, path);
            currentContent = file.content;
            sha = file.sha;
        }

        const updatedContent = currentContent + '\n\n' + entry;

        await updateFile(
            token,
            indexRepo.name.split('/')[0],
            indexRepo.name,
            path,
            updatedContent,
            'Add new reference',
            sha
        );

        await fetchReferences();
    };

    return {
        references,
        loading,
        error,
        fetchReferences,
        addReference
    };
}
