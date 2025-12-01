import { useState } from 'react';
import { useStore } from '@/lib/store';
import { getUser } from '@/lib/github';
import { KeyRound } from 'lucide-react';

export function Login() {
    const [inputToken, setInputToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const setToken = useStore((state) => state.setToken);
    const setUser = useStore((state) => state.setUser);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const user = await getUser(inputToken);
            setToken(inputToken);
            setUser(user);
        } catch (err) {
            setError('Invalid token or network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900 p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-2">
                        <KeyRound className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                        Open Research Interface
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Enter your GitHub Personal Access Token to continue
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="token" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Personal Access Token
                        </label>
                        <input
                            id="token"
                            type="password"
                            value={inputToken}
                            onChange={(e) => setInputToken(e.target.value)}
                            placeholder="ghp_..."
                            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Authenticating...' : 'Connect to GitHub'}
                    </button>
                </form>

                <div className="text-xs text-center text-neutral-500 dark:text-neutral-400">
                    Your token is stored locally in your browser and never sent to any server other than GitHub.
                </div>
            </div>
        </div>
    );
}
