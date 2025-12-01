export interface Repo {
    id: number;
    name: string;
    full_name: string;
    owner: string;
    description: string | null;
    html_url: string;
    updated_at: string;
}

export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'dir';
    sha: string;
    url: string;
    children?: FileNode[];
}

export interface User {
    login: string;
    avatar_url: string;
    name: string | null;
}

export type ArtifactType = 'paper' | 'app' | 'dataset' | 'notebook' | 'model';

export interface Reference {
    id: string;
    type: string;
    title?: string;
    author?: string;
    year?: string;
    journal?: string;
    booktitle?: string;
    publisher?: string;
    doi?: string;
    url?: string;
    raw: string; // The full BibTeX entry
}
