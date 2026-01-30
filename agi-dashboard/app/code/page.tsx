'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { Folder, FileCode, ChevronLeft, Save, Lock, Terminal, RefreshCw, Plus, Trash2, X, Circle, MoreVertical, FilePlus, FolderPlus } from 'lucide-react';

// Code Editor Imports
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markup';
import 'prismjs/themes/prism-tomorrow.css'; // Dark theme

interface FileEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

interface OpenFile {
    path: string;
    name: string;
    content: string;
    originalContent: string;
}

export default function CodePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [currentPath, setCurrentPath] = useState('.');
  const [files, setFiles] = useState<FileEntry[]>([]);
  
  // Tab Management
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  
  const [newItemName, setNewItemName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const loadFiles = async (dir: string) => {
    try {
      const res = await fetch(`/api/code/files?dir=${encodeURIComponent(dir)}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
        setCurrentPath(data.currentPath);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadFiles('.');
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'ROfdM12MidA') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Access Denied: Invalid Security Credential');
    }
  };

  const handleFileClick = async (file: FileEntry) => {
    if (file.isDirectory) {
      loadFiles(file.path);
    } else {
        // Check if already open
        if (openFiles.find(f => f.path === file.path)) {
            setActiveFile(file.path);
            return;
        }

        try {
            const res = await fetch('/api/code/read', {
                method: 'POST',
                body: JSON.stringify({ filepath: file.path })
            });
            if (res.ok) {
                const data = await res.json();
                const newFile: OpenFile = {
                    path: file.path,
                    name: file.name,
                    content: data.content,
                    originalContent: data.content
                };
                setOpenFiles(prev => [...prev, newFile]);
                setActiveFile(file.path);
            }
        } catch (e) {
            console.error(e);
        }
    }
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newFiles = openFiles.filter(f => f.path !== path);
      setOpenFiles(newFiles);
      
      if (activeFile === path) {
          if (newFiles.length > 0) {
              setActiveFile(newFiles[newFiles.length - 1].path);
          } else {
              setActiveFile(null);
          }
      }
  };

  const updateFileContent = (newContent: string) => {
      if (!activeFile) return;
      setOpenFiles(prev => prev.map(f => {
          if (f.path === activeFile) {
              return { ...f, content: newContent };
          }
          return f;
      }));
  };

  const handleSave = async () => {
      if (!activeFile) return;
      const fileToSave = openFiles.find(f => f.path === activeFile);
      if (!fileToSave) return;

      setIsSaving(true);
      try {
          const res = await fetch('/api/code/write', {
              method: 'POST',
              body: JSON.stringify({ filepath: activeFile, content: fileToSave.content })
          });
          if (res.ok) {
              setStatusMsg('Saved');
              // Update original content to match saved
              setOpenFiles(prev => prev.map(f => {
                  if (f.path === activeFile) {
                      return { ...f, originalContent: f.content };
                  }
                  return f;
              }));
              setTimeout(() => setStatusMsg(''), 2000);
          }
      } catch (e) {
          console.error(e);
          setStatusMsg('Error');
      } finally {
          setIsSaving(false);
      }
  };
  
  const handleBack = () => {
      if (currentPath === '.') return;
      const parts = currentPath.split('/');
      parts.pop();
      const parent = parts.join('/') || '.';
      loadFiles(parent);
  };
  
  const handleDelete = async (file: FileEntry, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;
      
      try {
          await fetch('/api/code/delete', {
              method: 'POST',
              body: JSON.stringify({ filepath: file.path })
          });
          loadFiles(currentPath);
          // Close tab if open
          if (openFiles.find(f => f.path === file.path)) {
              handleCloseTab(file.path, e);
          }
      } catch(e) { console.error(e); }
  };

  const handleCreate = async () => {
      if (!newItemName.trim()) return;
      const fullPath = currentPath === '.' ? newItemName : `${currentPath}/${newItemName}`;
      
      try {
          if (isCreatingFolder) {
              await fetch('/api/code/mkdir', {
                  method: 'POST',
                  body: JSON.stringify({ dir: fullPath })
              });
          } else {
              await fetch('/api/code/write', {
                  method: 'POST',
                  body: JSON.stringify({ filepath: fullPath, content: '' })
              });
          }
          loadFiles(currentPath);
          setNewItemName('');
          setIsCreatingFile(false);
          setIsCreatingFolder(false);
      } catch(e) { console.error(e); }
  };

  const getLanguage = (filename: string) => {
    if (!filename) return languages.clike;
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return languages.typescript;
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return languages.javascript;
    if (filename.endsWith('.css')) return languages.css;
    if (filename.endsWith('.json')) return languages.json;
    if (filename.endsWith('.md')) return languages.markdown;
    if (filename.endsWith('.sh')) return languages.bash;
    if (filename.endsWith('.html') || filename.endsWith('.xml')) return languages.markup;
    return languages.clike;
  };

  const activeFileObj = openFiles.find(f => f.path === activeFile);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
             <div className="p-4 bg-red-900/20 rounded-full border border-red-500/50 text-red-500">
                <Lock size={32} />
             </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-red-500">System Core Access</h2>
          <p className="text-gray-400">Direct Neural Interface // Restricted</p>
        </div>
        
        <form onSubmit={handleLogin} className="w-full max-w-md space-y-4 rounded-xl border border-gray-800 bg-gray-900/50 p-8">
          <div>
             <label className="block text-sm font-medium text-gray-400 mb-1">Passphrase</label>
             <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter Passphrase"
                autoFocus
              />
          </div>
          {authError && <p className="text-sm text-red-500">{authError}</p>}
          <button 
            type="submit"
            className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Establish Link
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* File Browser */}
      <div className="w-1/5 min-w-[250px] bg-gray-900/50 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-800 flex items-center gap-2 bg-gray-900 justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
                {currentPath !== '.' && (
                    <button onClick={handleBack} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white">
                        <ChevronLeft size={18} />
                    </button>
                )}
                <span className="text-xs font-mono text-gray-400 truncate" title={currentPath}>
                    {currentPath === '.' ? 'root' : currentPath.split('/').pop()}
                </span>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => { setIsCreatingFile(true); setIsCreatingFolder(false); }} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white" title="New File">
                    <FilePlus size={16} />
                </button>
                <button onClick={() => { setIsCreatingFolder(true); setIsCreatingFile(false); }} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white" title="New Folder">
                    <FolderPlus size={16} />
                </button>
                <button onClick={() => loadFiles(currentPath)} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white">
                    <RefreshCw size={14} />
                </button>
            </div>
        </div>
        
        {/* Creation Input */}
        {(isCreatingFile || isCreatingFolder) && (
            <div className="p-2 bg-gray-800/50 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={isCreatingFile ? "filename.ts" : "folder_name"}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreate();
                            if (e.key === 'Escape') { setIsCreatingFile(false); setIsCreatingFolder(false); setNewItemName(''); }
                        }}
                    />
                    <button onClick={() => { setIsCreatingFile(false); setIsCreatingFolder(false); setNewItemName(''); }} className="text-gray-500 hover:text-white">
                        <X size={14} />
                    </button>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {files.map((file) => (
                <div 
                    key={file.path}
                    className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                        activeFile === file.path 
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' 
                            : 'hover:bg-gray-800 text-gray-300'
                    }`}
                    onClick={() => handleFileClick(file)}
                >
                    <div className="flex items-center gap-2 truncate">
                        {file.isDirectory ? (
                            <Folder size={16} className="text-yellow-500 flex-shrink-0" />
                        ) : (
                            <FileCode size={16} className="text-gray-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{file.name}</span>
                    </div>
                    <button 
                        onClick={(e) => handleDelete(file, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-500 transition-opacity"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-gray-950 border border-gray-800 rounded-xl flex flex-col overflow-hidden relative">
         {/* Tabs */}
         <div className="flex items-center bg-gray-900 border-b border-gray-800 overflow-x-auto hide-scrollbar">
            {openFiles.map(file => (
                <div 
                    key={file.path}
                    onClick={() => setActiveFile(file.path)}
                    className={`
                        group flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-r border-gray-800 cursor-pointer min-w-[120px] max-w-[200px]
                        ${activeFile === file.path ? 'bg-gray-950 text-white border-t-2 border-t-blue-500' : 'text-gray-400 hover:bg-gray-800'}
                    `}
                >
                    <span className="truncate flex-1">{file.name}</span>
                    {file.content !== file.originalContent && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                    <button 
                        onClick={(e) => handleCloseTab(file.path, e)}
                        className={`opacity-0 group-hover:opacity-100 hover:bg-gray-700 rounded p-0.5 ${file.content !== file.originalContent ? 'opacity-100' : ''}`}
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
         </div>

         {activeFileObj ? (
            <>
                <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900 shrink-0">
                    <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Terminal size={14} />
                        {activeFileObj.path}
                    </span>
                    <div className="flex items-center gap-3">
                        {statusMsg && <span className="text-xs text-green-500 animate-pulse">{statusMsg}</span>}
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex items-center gap-1.5 px-3 py-1 text-white rounded-md text-xs font-medium transition-colors ${
                                activeFileObj.content !== activeFileObj.originalContent 
                                    ? 'bg-blue-600 hover:bg-blue-500' 
                                    : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                        >
                            <Save size={14} />
                            Save
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto relative font-mono text-sm flex">
                    {/* Line Numbers */}
                    <div className="bg-[#0d1117] border-r border-gray-800 text-gray-600 text-right py-4 px-2 select-none min-h-full">
                        {activeFileObj.content.split('\n').map((_, i) => (
                            <div key={i} className="h-[21px] leading-[21px] text-xs font-mono">{i + 1}</div>
                        ))}
                    </div>
                    {/* Editor */}
                    <div className="flex-1 min-w-0">
                        <Editor
                            value={activeFileObj.content}
                            onValueChange={updateFileContent}
                            highlight={code => highlight(code, getLanguage(activeFileObj.path), activeFileObj.path.split('.').pop() || 'clike')}
                            padding={16}
                            style={{
                                fontFamily: '"Fira Code", "Fira Mono", monospace',
                                fontSize: 14,
                                lineHeight: '21px', // Match line number height
                                backgroundColor: '#0d1117',
                                minHeight: '100%',
                            }}
                            className="min-h-full"
                            textareaClassName="focus:outline-none"
                        />
                    </div>
                </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
                <Terminal size={48} className="opacity-20" />
                <p>Select a file to start coding</p>
                <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-gray-900 rounded border border-gray-800">Files: {files.length}</span>
                </div>
            </div>
         )}
      </div>

      {/* Chat */}
      <div className="w-1/4 min-w-[300px] h-full">
         <ChatInterface apiEndpoint="/api/code/chat" />
      </div>
    </div>
  );
}
