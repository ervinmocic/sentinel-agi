'use client';

import { Activity, CreditCard, DollarSign, Users, Mail, Server, Database, Zap, Clock, Shield, Globe, LayoutDashboard } from "lucide-react";
import { ChatInterface } from "@/components/ChatInterface";
import { useEffect, useState } from "react";
import { MailchimpList } from "@/lib/mailchimp";

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

  useEffect(() => {
    async function fetchData() {
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

    fetchData();
    // Poll for activities every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-white">Command Center</h2>
        <div className="flex gap-2">
           <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors">
             System Logs
           </button>
           <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
             New Operation
           </button>
        </div>
      </div>
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Stats & Integrations) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Hero Status Card */}
          <div className="rounded-2xl bg-yellow-500 p-6 text-black shadow-xl shadow-yellow-900/10">
            <div className="flex justify-between items-start mb-4">
               <div>
                 <p className="font-semibold opacity-80">Active Protocols</p>
                 <h3 className="text-5xl font-bold mt-2">4</h3>
               </div>
               <div className="p-2 bg-black/10 rounded-lg">
                 <Activity className="h-6 w-6" />
               </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-8">
               <div className="bg-black/10 rounded-lg p-3 text-center">
                 <span className="block text-xl font-bold">2</span>
                 <span className="text-xs opacity-70 font-medium uppercase">Active</span>
               </div>
               <div className="bg-black/10 rounded-lg p-3 text-center">
                 <span className="block text-xl font-bold">1</span>
                 <span className="text-xs opacity-70 font-medium uppercase">Ended</span>
               </div>
               <div className="bg-black/10 rounded-lg p-3 text-center">
                 <span className="block text-xl font-bold">1</span>
                 <span className="text-xs opacity-70 font-medium uppercase">Pending</span>
               </div>
            </div>
            <button className="w-full mt-6 bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors">
              View Protocols
            </button>
          </div>

          {/* Integrations List */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
             <div className="flex items-center justify-between mb-6">
               <div>
                 <h3 className="text-lg font-semibold text-white">Neural Links</h3>
                 <p className="text-sm text-gray-400">System Integrations</p>
               </div>
               <span className="text-2xl font-bold text-white">3</span>
             </div>

             <div className="space-y-4">
               <IntegrationRow 
                 icon={Server} 
                 name="Trello" 
                 status="Connected" 
                 color="text-blue-400" 
                 bg="bg-blue-400/10"
               />
               <IntegrationRow 
                 icon={Mail} 
                 name="Mailchimp" 
                 status={mailchimpStats.loading ? "Connecting..." : "Connected"} 
                 color="text-yellow-400" 
                 bg="bg-yellow-400/10"
               />
               <IntegrationRow 
                 icon={Zap} 
                 name="OpenAI" 
                 status="Active" 
                 color="text-green-400" 
                 bg="bg-green-400/10"
               />
               <IntegrationRow 
                 icon={Globe} 
                 name="WordPress" 
                 status="Listening" 
                 color="text-purple-400" 
                 bg="bg-purple-400/10"
               />
             </div>
             
             <button className="w-full mt-6 text-sm text-gray-400 hover:text-white transition-colors">
               View All Integrations
             </button>
          </div>
        </div>

        {/* Middle Column (Chat & Analytics) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Chat Interface - Taking the 'Timeline' spot */}
          <div className="h-[500px]">
             <ChatInterface />
          </div>

          {/* Analytics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Views Chart */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
               <h3 className="font-semibold text-white mb-1">System Load</h3>
               <p className="text-xs text-gray-400 mb-6">Tokens processed per hour</p>
               
               <div className="h-40 flex items-end gap-2 justify-between px-2">
                 {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                   <div key={i} className="w-full bg-gray-800 rounded-t-sm relative group">
                     <div 
                        className="absolute bottom-0 w-full bg-blue-500 rounded-t-sm transition-all duration-500 hover:bg-blue-400"
                        style={{ height: `${h}%` }}
                     />
                   </div>
                 ))}
               </div>
               <div className="flex justify-between mt-4 text-xs text-gray-500 font-mono">
                 <span>00:00</span>
                 <span>12:00</span>
                 <span>23:59</span>
               </div>
            </div>

            {/* Revenue/Stats Donut */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 relative overflow-hidden">
               <h3 className="font-semibold text-white mb-1">Audience Reach</h3>
               <p className="text-xs text-gray-400 mb-6">Mailchimp engagement</p>
               
               <div className="flex items-center justify-center py-4 relative">
                 <div className="relative h-32 w-32">
                    <svg className="h-full w-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-800" />
                      <circle 
                        cx="64" cy="64" r="56" 
                        stroke="currentColor" 
                        strokeWidth="12" 
                        fill="transparent" 
                        strokeDasharray={351.86} 
                        strokeDashoffset={351.86 * (1 - (mailchimpStats.openRate / 100))} 
                        className="text-yellow-500 transition-all duration-1000 ease-out" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-2xl font-bold text-white">{mailchimpStats.openRate.toFixed(1)}%</span>
                       <span className="text-[10px] text-gray-400 uppercase">Open Rate</span>
                    </div>
                 </div>
               </div>
               
               <div className="flex justify-center gap-4 text-xs mt-2">
                 <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-gray-300">Opens</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-700" />
                    <span className="text-gray-500">Unread</span>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column (Activity Feed) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
               <h3 className="font-semibold text-lg text-white">Activity Log</h3>
               <Clock className="h-4 w-4 text-gray-500" />
            </div>

            <div className="space-y-6 relative flex-1 overflow-y-auto pr-2 before:absolute before:left-3.5 before:top-3 before:h-[90%] before:w-[1px] before:bg-gray-800">
               {activities.length > 0 ? (
                 activities.map((activity) => (
                    <ActivityLogItem key={activity.id} activity={activity} />
                 ))
               ) : (
                 <div className="pl-8 text-sm text-gray-500 py-4 italic">No recent activity detected.</div>
               )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function IntegrationRow({ icon: Icon, name, status, color, bg }: { icon: any, name: string, status: string, color: string, bg: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-800/50 transition-colors cursor-pointer group">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg} ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-white group-hover:text-blue-400 transition-colors">{name}</p>
        </div>
      </div>
      <div className={`text-xs font-medium px-2 py-1 rounded-full ${bg} ${color} bg-opacity-10`}>
        {status}
      </div>
    </div>
  );
}

function ActivityLogItem({ activity }: { activity: ActivityLog }) {
  const { icon: Icon, color, bg } = getActivityConfig(activity.type);
  const timeAgo = formatTimeAgo(activity.timestamp);

  return (
    <div className="relative pl-10 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className={`absolute left-0 top-1 p-1.5 rounded-full border ${bg} z-10 bg-gray-950`}>
         <Icon className={`h-3 w-3 ${color}`} />
      </div>
      <div>
        <h4 className="text-sm font-medium text-white">{activity.title}</h4>
        <p className="text-xs text-gray-400 mt-0.5 break-words">{activity.description}</p>
        <span className="text-[10px] text-gray-600 mt-1 block">{timeAgo}</span>
      </div>
    </div>
  );
}

function getActivityConfig(type: ActivityLog['type']) {
  switch (type) {
    case 'trello':
      return { icon: Server, color: 'text-blue-400', bg: 'border-blue-500/30' };
    case 'mailchimp':
      return { icon: Mail, color: 'text-yellow-400', bg: 'border-yellow-500/30' };
    case 'openai':
      return { icon: Zap, color: 'text-green-400', bg: 'border-green-500/30' };
    case 'wordpress':
      return { icon: Globe, color: 'text-purple-400', bg: 'border-purple-500/30' };
    case 'memory':
      return { icon: Database, color: 'text-pink-400', bg: 'border-pink-500/30' };
    case 'security':
      return { icon: Shield, color: 'text-red-400', bg: 'border-red-500/30' };
    case 'user':
      return { icon: Users, color: 'text-gray-400', bg: 'border-gray-500/30' };
    default:
      return { icon: LayoutDashboard, color: 'text-gray-400', bg: 'border-gray-500/30' };
  }
}

function formatTimeAgo(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
