import { Terminal } from 'lucide-react';

export default function OperationsPage() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">Operations</h2>
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 flex flex-col items-center justify-center min-h-[400px] text-gray-500">
         <Terminal className="h-12 w-12 mb-4 opacity-50" />
         <p>No active operations. Start an agent to begin.</p>
      </div>
    </div>
  );
}
