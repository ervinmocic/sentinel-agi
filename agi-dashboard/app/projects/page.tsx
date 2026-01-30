'use client';

import { useState, useEffect } from 'react';
import { TrelloClient, TrelloBoard } from '@/lib/trello';
import { Layout } from 'lucide-react';

export default function ProjectsPage() {
  const [boards, setBoards] = useState<TrelloBoard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBoards = async () => {
      const apiKey = localStorage.getItem('trello_api_key');
      const apiToken = localStorage.getItem('trello_api_token');

      if (!apiKey || !apiToken) {
        setError('Please configure Trello API credentials in Settings.');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const client = new TrelloClient(apiKey, apiToken);
        const boardsData = await client.getBoards();
        setBoards(boardsData);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch boards');
      } finally {
        setLoading(false);
      }
    };

    fetchBoards();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Projects (Trello)</h2>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
          Create Board
        </button>
      </div>

      {loading && <p className="text-gray-400">Loading projects...</p>}
      
      {error && (
        <div className="rounded-md bg-red-500/10 p-4 text-red-400 border border-red-500/20">
          {error}
        </div>
      )}

      {!loading && !error && boards.length === 0 && (
         <p className="text-gray-500">No boards found.</p>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <div key={board.id} className="group relative rounded-xl border border-gray-800 bg-gray-900/50 p-6 transition-colors hover:bg-gray-800/50">
             <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Layout className="h-6 w-6" />
                </div>
             </div>
             <h3 className="text-lg font-semibold text-white mb-2">{board.name}</h3>
             <a href={board.url} target="_blank" className="text-sm text-gray-500 hover:text-blue-400">View in Trello &rarr;</a>
          </div>
        ))}
      </div>
    </div>
  );
}
