import { ArtifactType } from './types';

export const getReadmeContent = (type: ArtifactType, slug: string, year: string) => {
    return `# ${type}-${year}-${slug}

Type: ${type}
Year: ${year}
`;
};

export const getGitignoreContent = () => {
    return `.DS_Store
node_modules/
__pycache__/
*.log
.env
`;
};

export const getArtifactFiles = (type: ArtifactType, slug: string, year: string) => {
    const files: { path: string; content: string }[] = [
        { path: 'README.md', content: getReadmeContent(type, slug, year) },
        { path: '.gitignore', content: getGitignoreContent() },
        { path: 'data/.gitkeep', content: '' },
        { path: 'code/.gitkeep', content: '' },
    ];

    if (type === 'paper') {
        files.push(
            { path: 'main.tex', content: '' },
            { path: 'REPRODUCIBILITY.md', content: '# Reproducibility Checklist\n\nSee research-index/SYSTEM_GUIDE.md for details.' },
            { path: 'figures/.gitkeep', content: '' },
            { path: 'refs/.gitkeep', content: '' },
            { path: 'data/raw/README.md', content: '# Raw Data\n\nPlace raw, immutable data here.' },
            { path: 'data/processed/README.md', content: '# Processed Data\n\nPlace cleaned, transformed, or intermediate data here.' },
            { path: '.github/workflows/latex.yml', content: 'name: LaTeX Build\n' }
        );
    } else if (type === 'app') {
        files.push(
            { path: 'src/.gitkeep', content: '' },
            { path: 'public/.gitkeep', content: '' },
            { path: 'manifest.json', content: '{}' }
        );
    } else if (type === 'dataset') {
        files.push(
            { path: 'raw/.gitkeep', content: '' },
            { path: 'processed/.gitkeep', content: '' },
            { path: 'METADATA.md', content: '# Dataset Metadata\n' }
        );
    } else if (type === 'notebook') {
        files.push(
            { path: 'notebooks/.gitkeep', content: '' }
        );
    } else if (type === 'model') {
        files.push(
            { path: 'weights/.gitkeep', content: '' },
            { path: 'training_logs/.gitkeep', content: '' }
        );
    }

    return files;
};
