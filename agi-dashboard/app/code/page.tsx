'use client';

import { useState, useEffect } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { Folder, FileCode, ChevronLeft, Save, Lock, Terminal, RefreshCw } from 'lucide-react';

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

interface FileEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

export default function CodePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [currentPath, setCurrentPath] = useState('.');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

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
      try {
        const res = await fetch('/api/code/read', {
          method: 'POST',
          body: JSON.stringify({ filepath: file.path })
        });
        if (res.ok) {
            const data = await res.json();
            setFileContent(data.content);
            setSelectedFile(file.path);
        }
      } catch (e) {
          console.error(e);
      }
    }
  };

  const handleSave = async () => {
      if (!selectedFile) return;
      setIsSaving(true);
      try {
          const res = await fetch('/api/code/write', {
              method: 'POST',
              body: JSON.stringify({ filepath: selectedFile, content: fileContent })
          });
          if (res.ok) {
              setStatusMsg('Saved');
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
      <div className="w-1/4 min-w-[250px] bg-gray-900/50 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-800 flex items-center gap-2 bg-gray-900">
            {currentPath !== '.' && (
                <button onClick={handleBack} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white">
                    <ChevronLeft size={18} />
                </button>
            )}
            <span className="text-xs font-mono text-gray-400 truncate flex-1" title={currentPath}>
                {currentPath === '.' ? 'root' : currentPath}
            </span>
            <button onClick={() => loadFiles(currentPath)} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white">
                <RefreshCw size={14} />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {files.map((file) => (
                <div 
                    key={file.path}
                    onClick={() => handleFileClick(file)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                        selectedFile === file.path && !file.isDirectory 
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' 
                            : 'hover:bg-gray-800 text-gray-300'
                    }`}
                >
                    {file.isDirectory ? (
                        <Folder size={16} className="text-yellow-500 flex-shrink-0" />
                    ) : (
                        <FileCode size={16} className="text-gray-500 flex-shrink-0" />
                    )}
                    <span className="truncate">{file.name}</span>
                </div>
            ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-gray-950 border border-gray-800 rounded-xl flex flex-col overflow-hidden relative">
         {selectedFile ? (
            <>
                <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900 shrink-0">
                    <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Terminal size={14} />
                        {selectedFile}
                    </span>
                    <div className="flex items-center gap-3">
                        {statusMsg && <span className="text-xs text-green-500 animate-pulse">{statusMsg}</span>}
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors"
                        >
                            <Save size={14} />
                            Save
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto relative font-mono text-sm">
                    <Editor
                        value={fileContent}
                        onValueChange={code => setFileContent(code)}
                        highlight={code => highlight(code, getLanguage(selectedFile || ''), selectedFile?.split('.').pop() || 'clike')}
                        padding={16}
                        style={{
                            fontFamily: '"Fira Code", "Fira Mono", monospace',
                            fontSize: 14,
                            backgroundColor: '#0d1117', // Match GitHub dark or similar
                            minHeight: '100%',
                        }}
                        className="min-h-full"
                        textareaClassName="focus:outline-none"
                    />
                </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
                <Terminal size={48} className="opacity-20" />
                <p>Select a file to review or edit</p>
            </div>
         )}
      </div>

      {/* Chat */}
      <div className="w-1/3 min-w-[300px] h-full">
         <ChatInterface apiEndpoint="/api/code/chat" />
      </div>
    </div>
  );
}
