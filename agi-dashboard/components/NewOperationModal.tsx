import { useState } from 'react';
import { X } from 'lucide-react';

interface NewOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, type: string) => void;
}

export function NewOperationModal({ isOpen, onClose, onSubmit }: NewOperationModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('general');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(title, description, type);
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">New Operation</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Operation Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="e.g. Instagram Outreach"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Goal / Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="Describe the objective..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="general">General Task</option>
              <option value="research">Research / Scouting</option>
              <option value="outreach">Outreach / Contact</option>
              <option value="content">Content Creation</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Initialize Protocol
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
