import { useState } from 'react';
import { X, CheckCircle, Clock, AlertCircle, PlayCircle, PauseCircle, ChevronLeft, Calendar, FileText, Trash2, StopCircle, Play } from 'lucide-react';

interface OperationStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp: string;
}

interface Operation {
  id: string;
  title: string;
  description: string;
  type: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  steps: OperationStep[];
  created_at: string;
  updated_at: string;
}

interface ProtocolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  operations: Operation[];
  onUpdateStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

export function ProtocolsModal({ isOpen, onClose, operations, onUpdateStatus, onDelete }: ProtocolsModalProps) {
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);

  if (!isOpen) return null;

  const handleStatusToggle = (op: Operation, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = op.status === 'running' ? 'paused' : 'running';
    onUpdateStatus(op.id, newStatus);
    if (selectedOp && selectedOp.id === op.id) {
        setSelectedOp({ ...selectedOp, status: newStatus as any });
    }
  };

  const handleDelete = (op: Operation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete operation "${op.title}"?`)) {
        onDelete(op.id);
        if (selectedOp && selectedOp.id === op.id) {
            setSelectedOp(null);
        }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <PlayCircle className="h-5 w-5 text-blue-400" />;
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'failed': return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'paused': return <PauseCircle className="h-5 w-5 text-yellow-400" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'paused': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const handleClose = () => {
    setSelectedOp(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl h-[80vh] rounded-2xl border border-gray-800 bg-gray-950 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/30">
          <div className="flex items-center gap-4">
            {selectedOp && (
              <button 
                onClick={() => setSelectedOp(null)}
                className="p-2 -ml-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h3 className="text-xl font-bold text-white">
                {selectedOp ? selectedOp.title : 'Active Protocols'}
              </h3>
              <p className="text-sm text-gray-400">
                {selectedOp ? 'Operation Details' : 'System Operations & Tasks'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-950">
          {selectedOp ? (
            // Detail View
            <div className="p-6 space-y-8">
              {/* Meta Card */}
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-2 ${getStatusColor(selectedOp.status)}`}>
                    {getStatusIcon(selectedOp.status)}
                    <span className="uppercase">{selectedOp.status}</span>
                  </span>
                  <span className="text-xs text-gray-500 font-mono uppercase tracking-wider border border-gray-800 px-2 py-1 rounded">
                    TYPE: {selectedOp.type}
                  </span>
                  
                  <div className="flex items-center gap-2 ml-auto">
                    {(selectedOp.status === 'running' || selectedOp.status === 'paused') && (
                        <button
                            onClick={(e) => handleStatusToggle(selectedOp, e)}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                            title={selectedOp.status === 'running' ? 'Pause' : 'Resume'}
                        >
                            {selectedOp.status === 'running' ? <PauseCircle className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </button>
                    )}
                    <button
                        onClick={(e) => handleDelete(selectedOp, e)}
                        className="p-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-300 text-lg leading-relaxed mb-6">{selectedOp.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 border-t border-gray-800 pt-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Created: {new Date(selectedOp.created_at).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Last Update: {new Date(selectedOp.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Steps Log */}
              <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Execution Log
                </h4>
                <div className="relative border-l border-gray-800 ml-3 space-y-8 pb-8">
                  {selectedOp.steps.length === 0 ? (
                    <div className="pl-8 text-gray-500 italic">No steps recorded yet.</div>
                  ) : (
                    selectedOp.steps.map((step, idx) => (
                      <div key={step.id || idx} className="relative pl-8">
                        <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-gray-950" />
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-500 font-mono">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                          <p className="text-gray-200 bg-gray-900/50 p-3 rounded-lg border border-gray-800/50">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            // List View
            <div className="p-6 space-y-4">
              {operations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No operations found. Start a new protocol to begin tracking.
                </div>
              ) : (
                operations.map((op) => (
                  <div 
                    key={op.id} 
                    onClick={() => setSelectedOp(op)}
                    className="group rounded-xl border border-gray-800 bg-gray-900/30 hover:bg-gray-900/80 hover:border-blue-500/30 transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {op.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            op.status === 'running' ? 'text-blue-400 bg-blue-400/10' : 
                            op.status === 'completed' ? 'text-green-400 bg-green-400/10' : 
                            'text-gray-500 bg-gray-800'
                          }`}>
                            {op.status}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-2">{op.description}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <span className="text-xs text-gray-600 font-mono">
                          {new Date(op.created_at).toLocaleDateString()}
                        </span>
                        {op.steps.length > 0 && (
                          <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                            {op.steps.length} steps
                          </span>
                        )}
                        
                        <div className="flex items-center gap-1 mt-1">
                            {(op.status === 'running' || op.status === 'paused') && (
                                <button
                                    onClick={(e) => handleStatusToggle(op, e)}
                                    className="p-1.5 rounded-md hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
                                >
                                    {op.status === 'running' ? <PauseCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </button>
                            )}
                            <button
                                onClick={(e) => handleDelete(op, e)}
                                className="p-1.5 rounded-md hover:bg-red-900/30 text-gray-500 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
