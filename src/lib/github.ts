import { Octokit } from 'octokit';
import { Repo, FileNode, User } from './types';

export const createClient = (token: string) => {
    return new Octokit({ auth: token });
};

export const getUser = async (token: string): Promise<User> => {
    const octokit = createClient(token);
    const { data } = await octokit.rest.users.getAuthenticated();
    return {
        login: data.login,
        avatar_url: data.avatar_url,
        name: data.name,
    };
};

export const getRepos = async (token: string): Promise<Repo[]> => {
    const octokit = createClient(token);
    // Fetch all repos for the authenticated user
    // We might want to filter this later, but for now get all and filter client-side
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
        affiliation: 'owner,collaborator,organization_member',
    });

    return data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: repo.owner.login,
        description: repo.description,
        html_url: repo.html_url,
        updated_at: repo.updated_at ?? new Date().toISOString(),
    }));
};

export const getRepoContents = async (
    token: string,
    owner: string,
    repo: string,
    path: string = ''
): Promise<FileNode[] | FileNode> => {
    const octokit = createClient(token);
    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
        });

        if (Array.isArray(data)) {
            return data.map((item) => ({
                name: item.name,
                path: item.path,
                type: item.type as 'file' | 'dir',
                sha: item.sha,
                url: item.download_url ?? '',
            })).sort((a, b) => {
                // Sort directories first
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'dir' ? -1 : 1;
            });
        } else {
            return {
                name: data.name,
                path: data.path,
                type: data.type as 'file' | 'dir',
                sha: data.sha,
                url: data.download_url ?? '',
            };
        }
    } catch (error) {
        console.error('Error fetching repo contents:', error);
        throw error;
    }
};

export const getFileContent = async (
    token: string,
    owner: string,
    repo: string,
    path: string
): Promise<{ content: string; sha: string }> => {
    const octokit = createClient(token);
    const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
    });

    if (Array.isArray(data) || data.type !== 'file') {
        throw new Error('Path is not a file');
    }

    const content = atob(data.content.replace(/\n/g, ''));
    return { content, sha: data.sha };
};

export const updateFile = async (
    token: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string
) => {
    const octokit = createClient(token);

    // If no SHA provided, try to get it first (for updates) or assume new file
    let fileSha = sha;
    if (!fileSha) {
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path,
            });
            if (!Array.isArray(data)) {
                fileSha = data.sha;
            }
        } catch (e) {
            // File doesn't exist, so we're creating it
        }
    }

    await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: btoa(content),
        sha: fileSha,
    });
};

export const createRepo = async (
    token: string,
    name: string,
    description?: string,
    isPrivate: boolean = false
) => {
    const octokit = createClient(token);
    const { data } = await octokit.rest.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
        auto_init: true, // Initialize with README
    });
    return data;
};

export const getDrafts = async (
    token: string,
    owner: string,
    repo: string
): Promise<import('./types').Draft[]> => {
    const octokit = createClient(token);
    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: 'drafts',
        });

        if (!Array.isArray(data)) return [];

        // Filter for directories that look like 'draft-*'
        const draftDirs = data.filter(
            (item) => item.type === 'dir' && item.name.startsWith('draft-')
        );

        return draftDirs.map((dir) => ({
            id: dir.name,
            name: dir.name.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()), // 'draft-1' -> 'Draft 1'
            path: `${dir.path}/main.tex`,
            updated_at: new Date().toISOString(), // We could fetch this from meta.json if we want to be precise
        }));
    } catch (error) {
        // If drafts folder doesn't exist, return empty array
        return [];
    }
};

export const createDraft = async (
    token: string,
    owner: string,
    repo: string,
    baseContent: string,
    draftName?: string
) => {
    // 1. Find next draft number
    const drafts = await getDrafts(token, owner, repo);
    let nextNum = 1;
    if (drafts.length > 0) {
        const nums = drafts
            .map(d => parseInt(d.id.replace('draft-', '')))
            .filter(n => !isNaN(n));
        if (nums.length > 0) {
            nextNum = Math.max(...nums) + 1;
        }
    }

    const draftId = `draft-${nextNum}`;
    const draftPath = `drafts/${draftId}/main.tex`;
    const metaPath = `drafts/${draftId}/meta.json`;

    // 2. Create main.tex
    await updateFile(
        token,
        owner,
        repo,
        draftPath,
        baseContent,
        `Create ${draftId}`
    );

    // 3. Create meta.json
    const meta = {
        created_at: new Date().toISOString(),
        name: draftName || `Draft ${nextNum}`,
        base_sha: 'TODO', // We could pass this if needed
    };

    await updateFile(
        token,
        owner,
        repo,
        metaPath,
        JSON.stringify(meta, null, 2),
        `Create ${draftId} metadata`
    );

    return {
        id: draftId,
        name: meta.name,
        path: draftPath,
        updated_at: meta.created_at
    };
};

export const deleteDraft = async (
    token: string,
    owner: string,
    repo: string,
    draftId: string
) => {
    const octokit = createClient(token);
    const draftPath = `drafts/${draftId}`;

    // Delete main.tex
    try {
        const { data: mainData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: `${draftPath}/main.tex`,
        });
        if (!Array.isArray(mainData)) {
            await octokit.rest.repos.deleteFile({
                owner,
                repo,
                path: `${draftPath}/main.tex`,
                message: `Delete ${draftId} main.tex`,
                sha: mainData.sha,
            });
        }
    } catch (e) { /* Ignore if missing */ }

    // Delete meta.json
    try {
        const { data: metaData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: `${draftPath}/meta.json`,
        });
        if (!Array.isArray(metaData)) {
            await octokit.rest.repos.deleteFile({
                owner,
                repo,
                path: `${draftPath}/meta.json`,
                message: `Delete ${draftId} meta.json`,
                sha: metaData.sha,
            });
        }
    } catch (e) { /* Ignore if missing */ }
};

export const mergeDraft = async (
    token: string,
    owner: string,
    repo: string,
    draftContent: string,
    draftId: string
) => {
    // Overwrite main.tex
    await updateFile(
        token,
        owner,
        repo,
        'main.tex',
        draftContent,
        `Merge ${draftId} into main`
    );
};
