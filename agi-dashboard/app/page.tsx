'use client';

import { Activity, CreditCard, DollarSign, Users, Mail, Server, Database, Zap, Clock, Shield, Globe, LayoutDashboard, Bell, Cpu, Radio, BarChart3, Terminal } from "lucide-react";
import { ChatInterface } from "@/components/ChatInterface";
import { NewOperationModal } from "@/components/NewOperationModal";
import { ProtocolsModal } from "@/components/ProtocolsModal";
import { NotificationsModal, Notification } from "@/components/NotificationsModal";
import { useEffect, useState, useRef } from "react";
import { MailchimpList } from "@/lib/mailchimp";

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

interface ActivityLog {
  id: string;
  type: 'system' | 'trello' | 'mailchimp' | 'openai' | 'wordpress' | 'user' | 'memory' | 'security';
  title: string;
  description: string;
  timestamp: string;
}

export default function Home() {
  const [mailchimpStats, setMailchimpStats] = useState({ members: 0, openRate: 0, loading: true });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [wpStatus, setWpStatus] = useState<'Checking...' | 'Connected' | 'Needs setup' | 'Offline'>('Checking...');
  const [isOpModalOpen, setIsOpModalOpen] = useState(false);
  const [isProtocolsModalOpen, setIsProtocolsModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chatTrigger, setChatTrigger] = useState<string | null>(null);
  const prevOperationsRef = useRef<Operation[]>([]);

  useEffect(() => {
    async function fetchData() {
      // Fetch Operations
      try {
        const res = await fetch('/api/operations');
        if (res.ok) {
          const data: Operation[] = await res.json();
          
          const prevIds = new Set(prevOperationsRef.current.map(o => o.id));
          const newOps = data.filter(o => !prevIds.has(o.id));
          
          newOps.forEach(op => {
             if ((op.status === 'running' || op.status === 'queued') && op.steps.length === 0) {
                 setChatTrigger(`SYSTEM COMMAND: New AI-Created Operation "${op.title}" detected.
                 1. CHECK: Do you have enough details?
                 2. IF NO: Use 'send_notification' (type: action_required) to ask the user.
                 3. IF YES: Immediately call 'web_search' or other tools to begin.
                 4. EXECUTE: Do not stop after one search. Iterate.`);
                 setTimeout(() => setChatTrigger(null), 100);
             }
          });

          setOperations(data);
          prevOperationsRef.current = data;
        }
      } catch (e) {
        console.error("Failed to fetch operations", e);
      }

      // Fetch Notifications
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (e) {
        console.error("Failed to fetch notifications", e);
      }

      // Fetch Mailchimp Stats
      const apiKey = localStorage.getItem('mailchimp_api_key');
      if (apiKey) {
        try {
          const response = await fetch('/api/mailchimp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey }),
          });
          if (response.ok) {
            const data = await response.json();
            const lists: MailchimpList[] = data.lists;
            let totalMembers = 0;
            let totalOpenRate = 0;
            let listCount = 0;
            lists.forEach(list => {
              totalMembers += list.stats.member_count;
              totalOpenRate += list.stats.open_rate;
              listCount++;
            });
            const avgOpenRate = listCount > 0 ? (totalOpenRate / listCount) : 0;
            setMailchimpStats({ members: totalMembers, openRate: avgOpenRate, loading: false });
          }
        } catch (e) {
          console.error("Failed to fetch Mailchimp stats", e);
          setMailchimpStats(prev => ({ ...prev, loading: false }));
        }
      } else {
        setMailchimpStats(prev => ({ ...prev, loading: false }));
      }

      // Fetch Activity Logs
      try {
        const res = await fetch('/api/activity');
        if (res.ok) {
          const data = await res.json();
          setActivities(data.logs);
        }
      } catch (e) {
        console.error("Failed to fetch activity logs", e);
      }
    }

    async function checkWordpress() {
      try {
        const res = await fetch('/api/wordpress/stats?range=today', { cache: 'no-store' });
        if (res.ok) {
          setWpStatus('Connected');
          return;
        }
        if (res.status === 400 || res.status === 401) {
          setWpStatus('Needs setup');
          return;
        }
        setWpStatus('Offline');
      } catch {
        setWpStatus('Offline');
      }
    }

    fetchData();
    checkWordpress();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateOperation = async (title: string, description: string, type: string) => {
    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, type }),
      });
      if (res.ok) {
        const newOp = await res.json();
        setOperations(prev => [newOp, ...prev]);
        setChatTrigger(`SYSTEM COMMAND: New Operation "${newOp.title}" created.
        1. CHECK: Do you have enough details (quantity, region, style, contact info needed)?
        2. IF NO: Use 'send_notification' (type: action_required) to ask the user.
        3. IF YES: Immediately call 'web_search' or other tools to begin.
        4. EXECUTE: Do not stop after one search. Iterate.`);
        setTimeout(() => setChatTrigger(null), 100);
      }
    } catch (e) {
      console.error("Failed to create operation", e);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error("Failed to mark notification read", e);
    }
  };

  const handleNotificationAction = (actionText: string) => {
    setChatTrigger(actionText);
    setTimeout(() => setChatTrigger(null), 100);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleUpdateOpStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/operations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setOperations(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
      }
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const handleDeleteOp = async (id: string) => {
    try {
      const res = await fetch(`/api/operations?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setOperations(prev => prev.filter(o => o.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete operation", e);
    }
  };

  const activeOps = operations.filter(o => o.status === 'running').length;
  const pendingOps = operations.filter(o => o.status === 'queued').length;
  const endedOps = operations.filter(o => o.status === 'completed' || o.status === 'failed').length;

  return (
    <div className="min-h-screen text-white p-4 md:p-8">
      <NewOperationModal 
        isOpen={isOpModalOpen} 
        onClose={() => setIsOpModalOpen(false)} 
        onSubmit={handleCreateOperation} 
      />
      
      <ProtocolsModal 
        isOpen={isProtocolsModalOpen} 
        onClose={() => setIsProtocolsModalOpen(false)} 
        operations={operations} 
        onUpdateStatus={handleUpdateOpStatus}
        onDelete={handleDeleteOp}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onAction={handleNotificationAction}
      />

      {/* Futuristic Header */}
      <header className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50 rounded-full animate-pulse"></div>
            <div className="relative p-3 bg-black/40 border border-blue-500/30 rounded-full backdrop-blur-sm">
              <Cpu className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Sentinel
            </h1>
            <p className="text-xs font-mono text-blue-300/60 tracking-[0.3em] uppercase">Autonomous Operations Unit</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <StatusBadge label="SYSTEM" status="ONLINE" color="green" />
          <StatusBadge label="NETWORK" status="SECURE" color="blue" />
          
          <div className="h-8 w-px bg-white/10 mx-2"></div>

          <button 
             onClick={() => setIsNotificationsOpen(true)}
             className="relative p-3 rounded-full hover:bg-white/5 transition-all group"
           >
             <Bell className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
             {unreadCount > 0 && (
               <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
             )}
           </button>
           
           <button 
             onClick={() => setIsOpModalOpen(true)}
             className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] flex items-center gap-2"
           >
             <Zap className="h-4 w-4 fill-current" />
             INITIATE
           </button>
        </div>
      </header>
      
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Left Column: Stats & Nodes */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          
          {/* Active Protocols Card - Holographic feel */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="h-24 w-24 text-white" />
            </div>
            
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Active Protocols</h3>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-bold text-white tracking-tight">{operations.length}</span>
              <span className="text-sm text-green-400 font-mono">running</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
               <StatBox value={activeOps} label="Active" color="text-blue-400" border="border-blue-500/20" />
               <StatBox value={endedOps} label="Ended" color="text-purple-400" border="border-purple-500/20" />
               <StatBox value={pendingOps} label="Queued" color="text-yellow-400" border="border-yellow-500/20" />
            </div>

            <button 
              onClick={() => setIsProtocolsModalOpen(true)}
              className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              View All Protocols
            </button>
          </div>

          {/* Neural Links (Integrations) */}
          <div className="glass-card rounded-2xl p-6 flex-1">
             <div className="flex items-center justify-between mb-6">
               <div>
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   <Radio className="h-4 w-4 text-purple-400" />
                   Neural Nodes
                 </h3>
               </div>
               <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">V 2.0.4</span>
             </div>

             <div className="space-y-3">
               <IntegrationRow icon={Server} name="Trello Board" status="Connected" color="text-blue-400" />
               <IntegrationRow icon={Mail} name="Mailchimp" status={mailchimpStats.loading ? "Syncing..." : "Active"} color="text-yellow-400" />
               <IntegrationRow icon={Zap} name="AI Engine" status="Online" color="text-green-400" />
               <IntegrationRow icon={Globe} name="WordPress" status={wpStatus} color="text-pink-400" />
             </div>
          </div>
        </div>

        {/* Middle Column: Chat & Visuals */}
        <div className="lg:col-span-6 space-y-6">
          {/* Chat Interface - styled as a terminal/feed */}
          <div className="glass-card rounded-2xl h-[550px] relative overflow-hidden flex flex-col">
             <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
             <ChatInterface systemTrigger={chatTrigger} />
          </div>

          {/* Data Viz Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* System Load Chart */}
            <div className="glass-card rounded-2xl p-6 relative group">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-white flex items-center gap-2">
                   <BarChart3 className="h-4 w-4 text-cyan-400" />
                   System Load
                 </h3>
                 <span className="text-[10px] text-cyan-400/70 border border-cyan-500/30 px-1.5 py-0.5 rounded">LIVE</span>
               </div>
               
               <div className="h-32 flex items-end gap-3 justify-between px-2 pt-4">
                 {[35, 60, 45, 85, 55, 75, 40].map((h, i) => (
                   <div key={i} className="w-full bg-white/5 rounded-t-sm relative overflow-hidden">
                     <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-cyan-600 to-blue-400 transition-all duration-1000 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                        style={{ height: `${h}%` }}
                     />
                   </div>
                 ))}
               </div>
            </div>

            {/* Audience Reach Ring */}
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center">
               <h3 className="font-bold text-white mb-2 self-start w-full flex justify-between">
                 <span>Reach</span>
                 <Users className="h-4 w-4 text-purple-400" />
               </h3>
               
               <div className="relative h-32 w-32 my-2">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                    <circle 
                      cx="64" cy="64" r="56" 
                      stroke="url(#gradient)" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray={351.86} 
                      strokeDashoffset={351.86 * (1 - (mailchimpStats.openRate / 100))} 
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(192,132,252,0.5)]" 
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#c084fc" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-3xl font-bold text-white tracking-tighter">{mailchimpStats.openRate.toFixed(1)}%</span>
                     <span className="text-[10px] text-purple-300 font-mono">ENGAGEMENT</span>
                  </div>
               </div>
            </div>

          </div>
        </div>

        {/* Right Column: Activity Stream */}
        <div className="lg:col-span-3">
          <div className="glass-card rounded-2xl h-[800px] lg:h-[calc(100vh-8rem)] p-0 flex flex-col overflow-hidden sticky top-6">
            <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
               <h3 className="font-bold text-white flex items-center gap-2">
                 <Terminal className="h-4 w-4 text-pink-500" />
                 Log Stream
               </h3>
               <div className="flex gap-1">
                 <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                 <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                 <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
               {activities.length > 0 ? (
                 activities.map((activity) => (
                    <ActivityLogItem key={activity.id} activity={activity} />
                 ))
               ) : (
                 <div className="text-center text-sm text-gray-500 py-10 font-mono">
                   -- NO DATA STREAM --
                 </div>
               )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatusBadge({ label, status, color }: { label: string, status: string, color: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  
  return (
    <div className={`hidden md:flex flex-col items-end border-r border-white/10 pr-4 mr-2`}>
      <span className="text-[10px] text-gray-500 font-mono tracking-wider">{label}</span>
      <span className={`text-xs font-bold ${color === 'green' ? 'text-green-400' : 'text-blue-400'}`}>{status}</span>
    </div>
  );
}

function StatBox({ value, label, color, border }: { value: number, label: string, color: string, border: string }) {
  return (
    <div className={`bg-black/20 rounded-lg p-3 text-center border ${border} backdrop-blur-sm`}>
      <span className={`block text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}

function IntegrationRow({ icon: Icon, name, status, color }: { icon: any, name: string, status: string, color: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-black/40 ${color} group-hover:shadow-[0_0_10px_currentColor] transition-shadow`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{name}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'Connected' || status === 'Active' || status === 'Online' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-gray-500'}`} />
        <span className="text-[10px] font-mono text-gray-400">{status}</span>
      </div>
    </div>
  );
}

function ActivityLogItem({ activity }: { activity: ActivityLog }) {
  const { icon: Icon, color, bg } = getActivityConfig(activity.type);
  const timeAgo = formatTimeAgo(activity.timestamp);

  return (
    <div className="relative pl-6 border-l border-white/10 pb-1 group">
      <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border border-black ${bg} ${color} shadow-[0_0_8px_currentColor] group-hover:scale-125 transition-transform`}></div>
      <div className="group-hover:translate-x-1 transition-transform duration-300">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-bold ${color} uppercase tracking-wider`}>{activity.type}</span>
          <span className="text-[10px] text-gray-600 font-mono">{timeAgo}</span>
        </div>
        <h4 className="text-sm font-medium text-gray-200 leading-tight mb-1">{activity.title}</h4>
        <p className="text-xs text-gray-500 line-clamp-2">{activity.description}</p>
      </div>
    </div>
  );
}

function getActivityConfig(type: ActivityLog['type']) {
  switch (type) {
    case 'trello':
      return { icon: Server, color: 'bg-blue-400', bg: 'bg-blue-400' };
    case 'mailchimp':
      return { icon: Mail, color: 'bg-yellow-400', bg: 'bg-yellow-400' };
    case 'openai':
      return { icon: Zap, color: 'bg-green-400', bg: 'bg-green-400' };
    case 'wordpress':
      return { icon: Globe, color: 'bg-purple-400', bg: 'bg-purple-400' };
    case 'memory':
      return { icon: Database, color: 'bg-pink-400', bg: 'bg-pink-400' };
    case 'security':
      return { icon: Shield, color: 'bg-red-500', bg: 'bg-red-500' };
    case 'user':
      return { icon: Users, color: 'bg-gray-400', bg: 'bg-gray-400' };
    default:
      return { icon: LayoutDashboard, color: 'bg-gray-400', bg: 'bg-gray-400' };
  }
}

function formatTimeAgo(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'NOW';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
