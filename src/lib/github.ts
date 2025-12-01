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
        affiliation: 'owner',
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
