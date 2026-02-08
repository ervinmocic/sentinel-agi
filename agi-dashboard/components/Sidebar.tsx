'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, Activity, Briefcase, Menu, X, Cpu } from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard },
  { name: 'Operations', href: '/operations', icon: Activity },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'System Code', href: '/code', icon: Cpu },
  { name: 'Config', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const SidebarContent = () => (
    <div className="flex h-full w-full flex-col bg-black/20 backdrop-blur-xl text-white">
      <div className="flex h-20 items-center justify-between px-6 border-b border-white/5 bg-gradient-to-r from-blue-900/10 to-transparent">
        <h1 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 italic">
          SENTINEL
        </h1>
        <button onClick={toggleSidebar} className="md:hidden text-gray-400 hover:text-white">
          <X size={24} />
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all group overflow-hidden ${
                    isActive
                      ? 'text-white bg-blue-600/10 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
                  )}
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="border-t border-white/5 p-6 bg-black/20">
        <div className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm">
          <div className="relative">
             <div className="h-10 w-10 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">
                <Cpu size={20} />
             </div>
             <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
             </span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">System Status</p>
            <p className="text-[10px] text-green-400 font-mono tracking-widest mt-0.5">ONLINE • SECURE</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed top-4 left-4 z-40 md:hidden">
        <button 
          onClick={toggleSidebar}
          className="p-2 bg-black/60 text-white rounded-lg border border-white/10 backdrop-blur-md shadow-lg"
        >
          <Menu size={24} />
        </button>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 md:hidden backdrop-blur-md transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-black/40 border-r border-white/5 transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 shadow-2xl backdrop-blur-xl
        `}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
