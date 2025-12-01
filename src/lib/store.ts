import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Repo, FileNode } from './types';

interface AppState {
    token: string | null;
    user: User | null;
    repos: Repo[];
    currentRepo: Repo | null;
    currentPath: string;
    files: FileNode[]; // Files in current path
    openFiles: { path: string; content: string; sha: string; repo: string; owner: string }[];
    activeFile: string | null; // Path of the active file
    viewMode: 'paper' | 'repo'; // High-level UI mode

    setToken: (token: string | null) => void;
    setUser: (user: User | null) => void;
    setRepos: (repos: Repo[]) => void;
    setCurrentRepo: (repo: Repo | null) => void;
    setCurrentPath: (path: string) => void;
    setFiles: (files: FileNode[]) => void;

    openFile: (file: { path: string; content: string; sha: string; repo: string; owner: string }) => void;
    closeFile: (path: string) => void;
    setActiveFile: (path: string) => void;
    updateFileContent: (path: string, content: string) => void;
    setViewMode: (mode: 'paper' | 'repo') => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            repos: [],
            currentRepo: null,
            currentPath: '',
            files: [],
            openFiles: [],
            activeFile: null,
            viewMode: 'repo',

            setToken: (token) => set({ token }),
            setUser: (user) => set({ user }),
            setRepos: (repos) => set({ repos }),
            setCurrentRepo: (repo) => set({ currentRepo: repo, currentPath: '' }), // Reset path on repo change
            setCurrentPath: (path) => set({ currentPath: path }),
            setFiles: (files) => set({ files }),

            openFile: (file) => set((state) => {
                const exists = state.openFiles.find((f) => f.path === file.path && f.repo === file.repo);
                if (exists) {
                    return { activeFile: file.path };
                }
                return {
                    openFiles: [...state.openFiles, file],
                    activeFile: file.path,
                };
            }),

            closeFile: (path) => set((state) => {
                const newOpenFiles = state.openFiles.filter((f) => f.path !== path);
                let newActiveFile = state.activeFile;
                if (state.activeFile === path) {
                    newActiveFile = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1].path : null;
                }
                return {
                    openFiles: newOpenFiles,
                    activeFile: newActiveFile,
                };
            }),

            setActiveFile: (path) => set({ activeFile: path }),

            updateFileContent: (path, content) => set((state) => ({
                openFiles: state.openFiles.map((f) =>
                    f.path === path ? { ...f, content } : f
                ),
            })),

            setViewMode: (mode) => set({ viewMode: mode }),
        }),
        {
            name: 'open-research-storage',
            partialize: (state) => ({ token: state.token, user: state.user }), // Only persist auth
        }
    )
);
