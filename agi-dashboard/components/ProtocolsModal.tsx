import { useState } from 'react';
import { X, CheckCircle, Clock, AlertCircle, PlayCircle, PauseCircle, ChevronLeft, Calendar, FileText, Trash2, StopCircle, Play, MonitorPlay } from 'lucide-react';

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
      case 'running': return <PlayCircle className="h-5 w-5" />;
      case 'completed': return <CheckCircle className="h-5 w-5" />;
      case 'failed': return <AlertCircle className="h-5 w-5" />;
      case 'paused': return <PauseCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-400 bg-blue-400/10 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
      case 'completed': return 'text-green-400 bg-green-400/10 border-green-500/20';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-500/20';
      case 'paused': return 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const handleClose = () => {
    setSelectedOp(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[85vh] rounded-2xl border border-white/10 bg-[#050510]/95 flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-900/10 to-transparent pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/40 backdrop-blur-xl relative z-10">
          <div className="flex items-center gap-4">
            {selectedOp && (
              <button 
                onClick={() => setSelectedOp(null)}
                className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors group"
              >
                <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              </button>
            )}
            <div>
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 flex items-center gap-3">
                <MonitorPlay className="h-6 w-6 text-blue-500" />
                {selectedOp ? selectedOp.title : 'Active Protocols'}
              </h3>
              <div className="flex items-center gap-2 text-xs font-mono text-blue-300/60 mt-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                SYSTEM_READY
                <span className="text-gray-600">|</span>
                ENCRYPTED
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors hover:rotate-90 duration-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          {selectedOp ? (
            // Detail View
            <div className="p-8 space-y-8 max-w-4xl mx-auto">
              {/* Meta Card */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
                
                <div className="flex flex-wrap gap-4 items-center justify-between mb-8">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold border flex items-center gap-2 uppercase tracking-wide ${getStatusColor(selectedOp.status)}`}>
                    {getStatusIcon(selectedOp.status)}
                    {selectedOp.status}
                  </span>
                  
                  <div className="flex items-center gap-2 ml-auto">
                    {(selectedOp.status === 'running' || selectedOp.status === 'paused') && (
                        <button
                            onClick={(e) => handleStatusToggle(selectedOp, e)}
                            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-105"
                            title={selectedOp.status === 'running' ? 'Pause Protocol' : 'Resume Protocol'}
                        >
                            {selectedOp.status === 'running' ? <PauseCircle className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </button>
                    )}
                    <button
                        onClick={(e) => handleDelete(selectedOp, e)}
                        className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all hover:scale-105"
                        title="Terminate Protocol"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="mb-8">
                   <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Directive</h4>
                   <p className="text-gray-200 text-lg leading-relaxed font-light">{selectedOp.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6 text-sm border-t border-white/5 pt-6">
                  <div>
                    <span className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Initialized</span>
                    <div className="flex items-center gap-2 text-gray-300 font-mono">
                       <Calendar className="h-4 w-4 text-blue-500" />
                       {new Date(selectedOp.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Last Contact</span>
                    <div className="flex items-center gap-2 text-gray-300 font-mono">
                       <Clock className="h-4 w-4 text-purple-500" />
                       {new Date(selectedOp.updated_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Steps Log */}
              <div>
                <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-blue-500/20 pb-2">
                  <FileText className="h-4 w-4" />
                  Execution Matrix
                </h4>
                <div className="relative border-l border-white/10 ml-3 space-y-8 pb-8">
                  {selectedOp.steps.length === 0 ? (
                    <div className="pl-8 text-gray-500 italic font-mono">
                      // Awaiting execution data...
                    </div>
                  ) : (
                    selectedOp.steps.map((step, idx) => (
                      <div key={step.id || idx} className="relative pl-8 group">
                        <div className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-[#050510] group-hover:bg-blue-400 transition-colors shadow-[0_0_10px_#3b82f6]" />
                        <div className="flex flex-col gap-2">
                          <span className="text-xs text-gray-500 font-mono flex items-center gap-2">
                            {new Date(step.timestamp).toLocaleTimeString()}
                            <span className="h-px w-8 bg-white/10"></span>
                          </span>
                          <div className="bg-white/5 p-4 rounded-xl border border-white/5 group-hover:border-blue-500/30 transition-colors">
                            <p className="text-gray-200 text-sm leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            // List View
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {operations.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
                  <MonitorPlay className="h-16 w-16 opacity-20 mb-4" />
                  <p className="font-mono text-sm">NO ACTIVE PROTOCOLS</p>
                </div>
              ) : (
                operations.map((op) => (
                  <div 
                    key={op.id} 
                    onClick={() => setSelectedOp(op)}
                    className="group relative rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer overflow-hidden hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:-translate-y-1"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="p-5 flex flex-col gap-4 h-full">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                            {op.title}
                          </h4>
                          <span className="text-xs text-gray-500 uppercase tracking-wider font-mono">
                            {op.type}
                          </span>
                        </div>
                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(op.status).replace('shadow-[0_0_10px_rgba(59,130,246,0.2)]', '')}`}>
                            {op.status}
                        </div>
                      </div>
                      
                      <p className="text-gray-400 text-sm line-clamp-2 flex-1">{op.description}</p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                        <div className="flex items-center gap-2">
                           {op.steps.length > 0 && (
                             <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-1 rounded-md font-mono">
                               {op.steps.length} NODES
                             </span>
                           )}
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button
                                 onClick={(e) => handleDelete(op, e)}
                                 className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
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
