import { X, Bell, Check, MessageSquare, AlertTriangle, Info, Zap } from 'lucide-react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'action_required';
  read: boolean;
  actionPayload?: string;
  timestamp: string;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onAction: (actionText: string) => void;
}

export function NotificationsModal({ isOpen, onClose, notifications, onMarkRead, onAction }: NotificationsModalProps) {
  if (!isOpen) return null;

  const handleAction = (note: Notification) => {
    if (note.actionPayload) {
      onAction(note.actionPayload);
      onMarkRead(note.id); 
      onClose(); 
    }
  };

  const getTypeIcon = (type: string) => {
      switch(type) {
          case 'alert': return <AlertTriangle className="h-4 w-4 text-red-500" />;
          case 'action_required': return <Zap className="h-4 w-4 text-yellow-500" />;
          default: return <Info className="h-4 w-4 text-blue-500" />;
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[80vh] rounded-2xl border border-white/10 bg-[#0a0a1a]/95 backdrop-blur-xl flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

        <div className="flex items-center justify-between p-6 border-b border-white/10 relative z-10 bg-white/5">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="relative">
                 <Bell className="h-5 w-5 text-blue-400" />
                 {notifications.some(n => !n.read) && (
                     <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]"></span>
                 )}
              </div>
              System Alerts
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10 scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
              <Bell className="h-10 w-10 opacity-20" />
              <span className="text-sm font-mono">ALL SYSTEMS NOMINAL</span>
            </div>
          ) : (
            notifications.map((note) => (
              <div 
                key={note.id} 
                className={`relative p-4 rounded-xl border transition-all group overflow-hidden ${
                  note.read 
                    ? 'bg-black/20 border-white/5 opacity-50' 
                    : 'bg-white/5 border-white/10 shadow-lg hover:border-blue-500/30 hover:bg-white/10'
                }`}
              >
                {!note.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
                )}

                <div className="flex justify-between items-start gap-3 pl-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeIcon(note.type)}
                      <h4 className={`text-sm font-bold tracking-wide ${note.read ? 'text-gray-400' : 'text-white'}`}>
                        {note.title}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4 pl-6 border-l border-white/5 ml-2 mt-2">
                        {note.message}
                    </p>
                    
                    <div className="flex items-center gap-2 pl-6 ml-2">
                        {note.type === 'action_required' && note.actionPayload && (
                            <button
                                onClick={() => handleAction(note)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                            >
                                <MessageSquare className="h-3 w-3" />
                                Initiate Response
                            </button>
                        )}
                        {!note.read && (
                            <button
                                onClick={() => onMarkRead(note.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-white/5"
                            >
                                <Check className="h-3 w-3" />
                                Acknowledge
                            </button>
                        )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600 font-mono whitespace-nowrap">
                    {new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
