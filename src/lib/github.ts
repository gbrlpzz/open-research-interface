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
    path: string = '',
    ref?: string
): Promise<FileNode[] | FileNode> => {
    const octokit = createClient(token);
    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref,
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
    path: string,
    ref?: string
): Promise<{ content: string; sha: string }> => {
    const octokit = createClient(token);
    const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
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
    sha?: string,
    branch?: string
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
                ref: branch,
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
        branch,
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

// --- Branch Management (Git-Native Drafts) ---

export const getBranches = async (
    token: string,
    owner: string,
    repo: string
): Promise<string[]> => {
    const octokit = createClient(token);
    const { data } = await octokit.rest.repos.listBranches({
        owner,
        repo,
    });
    return data.map(b => b.name);
};

export const createBranch = async (
    token: string,
    owner: string,
    repo: string,
    branchName: string,
    fromBranch: string = 'main'
) => {
    const octokit = createClient(token);

    // 1. Get SHA of fromBranch
    const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${fromBranch}`,
    });
    const sha = refData.object.sha;

    // 2. Create new ref
    await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha,
    });
};

export const deleteBranch = async (
    token: string,
    owner: string,
    repo: string,
    branchName: string
) => {
    const octokit = createClient(token);
    await octokit.rest.git.deleteRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
    });
};

export const mergeBranch = async (
    token: string,
    owner: string,
    repo: string,
    head: string, // branch to merge (e.g. 'draft-1')
    base: string // target branch (e.g. 'main')
) => {
    const octokit = createClient(token);
    await octokit.rest.repos.merge({
        owner,
        repo,
        base,
        head,
        commit_message: `Merge branch '${head}' into ${base}`,
    });
};

export const renameBranch = async (
    token: string,
    owner: string,
    repo: string,
    oldName: string,
    newName: string
) => {
    // GitHub doesn't have a rename endpoint for branches.
    // We must create a new branch from the old one, then delete the old one.

    // 1. Create new branch from old branch
    await createBranch(token, owner, repo, newName, oldName);

    // 2. Delete old branch
    await deleteBranch(token, owner, repo, oldName);
};

// --- Legacy Draft Functions (Deprecated/Removed) ---
// Kept empty or minimal if needed to prevent build errors during transition, 
// but ideally we remove usages.

