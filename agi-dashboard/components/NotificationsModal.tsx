import { X, Bell, Check, MessageSquare } from 'lucide-react';

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
      onMarkRead(note.id); // Auto-read on action
      onClose(); // Close modal to show chat
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[80vh] rounded-2xl border border-gray-800 bg-gray-950 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-400" />
              Notifications
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              All caught up! No new notifications.
            </div>
          ) : (
            notifications.map((note) => (
              <div 
                key={note.id} 
                className={`p-4 rounded-xl border transition-all ${
                  note.read 
                    ? 'bg-gray-900/20 border-gray-800 opacity-60' 
                    : 'bg-gray-900/80 border-gray-700 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {!note.read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                      <h4 className={`text-sm font-semibold ${note.read ? 'text-gray-400' : 'text-white'}`}>
                        {note.title}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mb-3">{note.message}</p>
                    
                    <div className="flex items-center gap-2">
                        {note.type === 'action_required' && note.actionPayload && (
                            <button
                                onClick={() => handleAction(note)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                                <MessageSquare className="h-3 w-3" />
                                Reply / Act
                            </button>
                        )}
                        {!note.read && (
                            <button
                                onClick={() => onMarkRead(note.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors"
                            >
                                <Check className="h-3 w-3" />
                                Mark Read
                            </button>
                        )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600 whitespace-nowrap">
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
