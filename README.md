## Open Research Interface

Open Research Interface is a **GitHub‑native writing environment** for open research projects.  
It gives you an Overleaf‑style experience focused on the **main LaTeX document and references**, while keeping all artifacts (papers, datasets, apps, notebooks, models) in a **standard GitHub research structure**.

- **You read & write here** → clean editor, drafts, citations.
- **You code in your IDE** (e.g. Cursor).
- **You browse repos on GitHub**.

The app sits on top of:

- `research-index`: shared catalogue + shared `references.bib`.
- `paper-*`, `dataset-*`, `app-*`, `notebook-*`, `model-*` repos: one repo per artifact, each with a `main.tex` entrypoint (and optional drafts).

---

## Core concepts

- **Artifacts as repos**
  - Each paper/dataset/app/notebook/model is a GitHub repository named like:
    - `paper-<year>-<slug>`
    - `dataset-<year>-<slug>`
    - etc.
  - The app never shows you the file tree; it only cares about the **main document** (`main.tex`) and the **paper‑local bibliography** (`refs/references.bib`).

- **Drafts inside a repo**
  - Every artifact has a default `main.tex`.
  - Additional drafts live under `drafts/draft-N/main.tex` and are exposed in the UI as **Draft 1, Draft 2, …**.
  - Drafts are just files in the repo; the app treats them like lightweight branches for writing.

- **References and bibliographies**
  - **Shared library**: `research-index/01. refs/references.bib` (or `refs/references.bib` as fallback).
  - **Per‑paper library**: `<artifact-repo>/refs/references.bib`.
  - The UI shows references as structured cards and a form; raw BibTeX and paths stay hidden.
  - When you add a reference through the app, it is written to:
    - the shared `research-index` bibliography, and
    - the current paper’s `refs/references.bib` (if you are in a `paper-*` repo).

---

## Features

- **Document‑centric workspace**
  - Left: list of **Documents** (all `paper-*`, `dataset-*`, `app-*`, `notebook-*`, `model-*` repos).
  - Center: the selected document’s **main LaTeX file** (or selected draft) in a Google‑Docs‑like editor.
  - Right: the **References** panel.

- **Editor / Code views**
  - **Editor view** (default for LaTeX main documents):
    - Wide centered column (≈800px), generous margins, no line numbers.
    - LaTeX commands like `\textbf{}` / `\textit{}` are visually hidden and rendered as bold/italic text.
    - Citations `\cite{key}` are highlighted so they read as inline citation pills.
  - **Code view**:
    - Classic code editor appearance with monospace font and line numbers.

- **Keyboard shortcuts for LaTeX**
  - `Cmd/Ctrl + B` → wrap selection in `\textbf{…}`.
  - `Cmd/Ctrl + I` → wrap selection in `\textit{…}`.

- **References UI**
  - Toggle between **“This paper”** and **“Shared library”**.
  - Search by author, title, or citation key.
  - Add references with a friendly form (key, type, title, authors, year, venue, DOI, URL).
  - **Insert citation** from a reference card to add `\cite{key}` to the current document.

- **New artifacts**
  - Use **New Artifact** in the left sidebar to create:
    - `paper-<currentYear>-<slug>`
    - `dataset-<currentYear>-<slug>`
    - `app-<currentYear>-<slug>`
    - `notebook-<currentYear>-<slug>`
    - `model-<currentYear>-<slug>`
  - The app:
    - Creates the repo via GitHub’s API.
    - Seeds it with standard files from `lib/templates`.
    - Registers it in the `research-index/00. catalogue/<type>s.md` file.

---

## Getting started

### 1. Prerequisites

- Node.js 18+  
- A GitHub personal access token with **repo** scope.
- A `research-index` repository initialized using the provided scripts in the `research-index` project.

### 2. Install dependencies

```bash
cd open-research-interface
npm install
```

### 3. Run the development server

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

### 4. Log in with GitHub

1. Paste your GitHub token into the login screen.  
2. The app will:
   - Fetch your repos.
   - Filter relevant artifacts (`paper-*`, `dataset-*`, `app-*`, `notebook-*`, `model-*`).
   - Locate the `research-index` repo for the shared catalogue and references.

### 5. Create or open a document

- **Create**: use **New Artifact** in the left sidebar (e.g. type `Paper`, slug `test-execution` → `paper-<year>-test-execution`).
- **Open**: click any existing artifact repo in the **Documents** list.
- The center view will:
  - Load `main.tex` (or the currently selected draft) as the main document.
  - Show references for **This paper** and the **Shared library** on the right.

---

## Project structure (high level)

- `src/app` – Next.js App Router entry (`layout.tsx`, `page.tsx`).
- `src/components/auth` – GitHub token login UI.
- `src/components/sidebar` – Documents list + New Artifact modal.
- `src/components/editor` – Main editor and `PaperWorkspace` (drafts, editor/code toggle).
- `src/components/references` – References UI, BibTeX parsing, citation insertion.
- `src/lib/github.ts` – Octokit client and GitHub API helpers.
- `src/lib/store.ts` – Global state (current repo, drafts, open files, etc.) via Zustand.
- `src/lib/templates.ts` – Initial file templates for new artifacts.

---

## Notes and limitations

- The system assumes a **convention‑over‑configuration** layout:
  - `main.tex` at the repo root (plus optional `drafts/draft-N/main.tex`).
  - `refs/references.bib` for per‑paper references.
  - `research-index` present in your GitHub account.
- Saving writes directly to GitHub using a simple **“Save to GitHub”** commit flow; advanced workflows (PRs, branching) are intentionally kept out of the UI for now.

This README describes the intended behavior of the Open Research Interface as of the current iteration.  
As we extend it (e.g. live PDF preview, richer LaTeX rendering, more citation styles), we should keep the focus on: **“a clean, research‑grade writing interface on top of a standard GitHub research structure.”**

