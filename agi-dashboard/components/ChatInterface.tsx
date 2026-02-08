'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Terminal, Mic, MicOff, Volume2, VolumeX, Paperclip, X, Image as ImageIcon, Phone, PhoneOff, Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string; // Base64 image
}

export function ChatInterface({ apiEndpoint = '/api/chat', systemTrigger }: { apiEndpoint?: string; systemTrigger?: string | null }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Sentinel AI v5.2 online. How can I assist with your company building today?' }
  ]);
  const messagesRef = useRef<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const processingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (systemTrigger && !isLoading && !processingRef.current) {
        submitLiveMessage(systemTrigger);
    }
  }, [systemTrigger]);

  useEffect(() => {
    if (isLiveMode && !isListening && !isPlaying && !isLoading && !processingRef.current) {
      startListening();
    }
  }, [isLiveMode, isListening, isPlaying, isLoading]);

  const toggleLiveMode = () => {
    if (isLiveMode) {
      setIsLiveMode(false);
      stopListening();
      setIsSpeaking(false);
    } else {
      setIsLiveMode(true);
      setIsSpeaking(true);
      startListening();
    }
  };

  const startListening = async () => {
    try {
      if (isListening) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Microphone access is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 3000) {
            await transcribeAudio(blob);
        } else if (isLiveMode) {
            setTimeout(() => setIsListening(false), 500); 
        } else {
            setIsListening(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
      
      if (isLiveMode) {
         const audioContext = new AudioContext();
         const source = audioContext.createMediaStreamSource(stream);
         const analyzer = audioContext.createAnalyser();
         analyzer.fftSize = 512;
         source.connect(analyzer);
         const dataArray = new Uint8Array(analyzer.frequencyBinCount);
         
         let silenceStart = Date.now();
         let speechDetected = false;
         
         const checkSilence = () => {
            if (!isLiveMode || !mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
                audioContext.close();
                return;
            }
            analyzer.getByteFrequencyData(dataArray);
            let sum = 0;
            for(let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const volume = sum / dataArray.length;
            
            if (volume > 20) {
                silenceStart = Date.now();
                speechDetected = true;
            } 
            if (speechDetected && (Date.now() - silenceStart > 1200)) {
                mediaRecorderRef.current?.stop();
                audioContext.close();
                return;
            }
            requestAnimationFrame(checkSilence);
         };
         checkSilence();
      }
    } catch (e) {
      console.error("Failed to start speech recognition", e);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    if (isLiveMode) setCurrentStatus('Listening...');
    else setCurrentStatus('Transcribing audio...');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      const res = await fetch('/api/stt', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.text && data.text.trim().length > 0) {
          const newText = String(data.text).trim();
          if (isLiveMode) await submitLiveMessage(newText);
          else setInput(prev => (prev ? prev + ' ' + newText : newText));
      } else {
          processingRef.current = false;
          setIsProcessing(false);
          if (isLiveMode) setIsListening(false);
      }
    } catch(e) {
        console.error("Transcription failed", e);
        processingRef.current = false;
        setIsProcessing(false);
        setIsListening(false);
    } finally {
        if (!isLiveMode) {
            setCurrentStatus('');
            processingRef.current = false;
            setIsProcessing(false);
        }
    }
  }

  const submitLiveMessage = async (text: string) => {
      setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
      setIsLoading(true);
      setCurrentStatus('Thinking...');

      try {
          const apiKey = localStorage.getItem('trello_api_key');
          const apiToken = localStorage.getItem('trello_api_token');
          const openAiKey = localStorage.getItem('openai_api_key');
          const mailchimpKey = localStorage.getItem('mailchimp_api_key');

          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: text,
              history: messagesRef.current.filter(m => m.content || m.image),
              trello: { key: apiKey, token: apiToken },
              openaiKey: openAiKey,
              mailchimpKey: mailchimpKey
            }),
          });

          if (!response.ok) throw new Error('Failed to send message');
          
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let fullAssistantResponse = '';

          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const data = JSON.parse(line);
                    if (data.type === 'text') {
                        fullAssistantResponse += data.content;
                        setMessages(prev => {
                            const newMessages = [...prev];
                            const lastMsg = { ...newMessages[newMessages.length - 1] };
                            lastMsg.content += data.content;
                            newMessages[newMessages.length - 1] = lastMsg;
                            return newMessages;
                        });
                    } else if (data.type === 'status') {
                        setCurrentStatus(data.content);
                    }
                } catch (e) {}
            }
          }
          if (fullAssistantResponse) await playTextToSpeech(fullAssistantResponse);

      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
          setCurrentStatus(isLiveMode ? 'Listening...' : '');
          processingRef.current = false;
          setIsProcessing(false);
          setIsListening(false);
      }
  };

  const playTextToSpeech = async (text: string) => {
    if (!isSpeaking || !text.trim()) return;
    try {
      setIsPlaying(true);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('TTS Failed');
      const audioBlob = await res.blob();
      const objectUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(objectUrl);
      audio.onended = () => { URL.revokeObjectURL(objectUrl); setIsPlaying(false); };
      audio.onerror = () => { URL.revokeObjectURL(objectUrl); setIsPlaying(false); };
      await audio.play();
    } catch (e) {
      setIsPlaying(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, currentStatus]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) processFile(file);
        }
      }
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  };

  useEffect(() => {
    document.addEventListener('paste', handlePaste as any);
    return () => document.removeEventListener('paste', handlePaste as any);
  }, [handlePaste]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage = input;
    const currentImage = selectedImage;
    setInput('');
    setSelectedImage(null);
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage, image: currentImage || undefined }, { role: 'assistant', content: '' }]);
    setIsLoading(true);
    setCurrentStatus('Initializing agent...');

    try {
      const apiKey = localStorage.getItem('trello_api_key');
      const apiToken = localStorage.getItem('trello_api_token');
      const openAiKey = localStorage.getItem('openai_api_key');
      const mailchimpKey = localStorage.getItem('mailchimp_api_key');

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          image: currentImage,
          history: messagesRef.current.filter(m => m.content || m.image),
          trello: { key: apiKey, token: apiToken },
          openaiKey: openAiKey,
          mailchimpKey: mailchimpKey
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullAssistantResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'text') {
              fullAssistantResponse += data.content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = { ...newMessages[newMessages.length - 1] };
                lastMsg.content += data.content;
                newMessages[newMessages.length - 1] = lastMsg;
                return newMessages;
              });
            } else if (data.type === 'status') {
              setCurrentStatus(data.content);
            }
          } catch (e) {}
        }
      }
      if (isSpeaking && fullAssistantResponse) await playTextToSpeech(fullAssistantResponse);
      
    } catch (error) {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = { ...newMessages[newMessages.length - 1] };
        lastMsg.content += "\n[Connection Error]";
        newMessages[newMessages.length - 1] = lastMsg;
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      setCurrentStatus('');
    }
  };

  const preprocessMath = (content: string) => content.replace(/\\\[/g, '$$').replace(/\\\]/g, '$$').replace(/\\\(/g, '$').replace(/\\\)/g, '$');

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      <div className="bg-white/5 border-b border-white/5 p-4 flex items-center gap-3 backdrop-blur-sm sticky top-0 z-10">
        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
          <Cpu size={18} />
        </div>
        <div>
          <h3 className="font-bold text-white tracking-widest text-xs">SENTINEL CORE v5.2</h3>
          <p className="text-[10px] text-green-400 flex items-center gap-1 font-mono mt-0.5">
            <span className="block w-1 h-1 rounded-full bg-green-400 animate-pulse shadow-[0_0_5px_#4ade80]" />
            NEURAL_LINK_ESTABLISHED
          </p>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-4 space-y-6 font-sans scrollbar-thin scrollbar-thumb-white/10"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {messages.map((msg, idx) => (
          msg.content && (
            <div
              key={idx}
              className={`flex items-start gap-3 ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 mt-1 flex-shrink-0 border border-blue-500/30">
                  <Bot size={14} />
                </div>
              )}
              <div
                className={`rounded-xl px-4 py-3 max-w-[90%] text-sm leading-relaxed shadow-lg ${
                  msg.role === 'assistant'
                    ? 'bg-black/40 text-gray-200 border border-white/10 rounded-tl-none backdrop-blur-md'
                    : 'bg-blue-600/80 text-white rounded-tr-none backdrop-blur-md border border-blue-400/30'
                }`}
              >
                {msg.image && (
                  <img src={msg.image} alt="User upload" className="max-w-full h-auto rounded-lg mb-2 border border-white/10" style={{ maxHeight: '200px' }} />
                )}
                <div className="prose prose-invert prose-xs max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code: ({node, ...props}) => <code className="bg-black/50 rounded px-1 py-0.5 font-mono text-[10px] text-blue-300" {...props} />,
                      pre: ({node, ...props}) => <pre className="bg-black/80 rounded p-2 overflow-x-auto mb-2 border border-white/10" {...props} />,
                    }}
                  >
                    {preprocessMath(msg.content)}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-3 animate-in fade-in duration-300">
             <div className="w-6 h-6 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 mt-1 flex-shrink-0 border border-blue-500/30">
                  <Bot size={14} />
             </div>
             <div className="space-y-2">
                {currentStatus && (
                  <div className="flex items-center gap-2 text-[10px] text-blue-300 font-mono bg-blue-900/10 px-2 py-1 rounded border border-blue-500/20">
                     <Terminal size={10} className="animate-pulse" />
                     {currentStatus}
                  </div>
                )}
                {!messages[messages.length - 1].content && (
                   <div className="bg-white/5 rounded-xl rounded-tl-none px-4 py-3 w-16">
                     <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                     </div>
                   </div>
                )}
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-black/20 backdrop-blur-md border-t border-white/5">
        <div className="relative group">
          {selectedImage && (
            <div className="absolute left-4 bottom-full mb-2 bg-black/80 border border-white/10 rounded-lg p-2 flex items-start gap-2 shadow-xl backdrop-blur-xl">
              <img src={selectedImage} alt="Preview" className="h-12 w-12 object-cover rounded" />
              <button type="button" onClick={() => setSelectedImage(null)} className="text-gray-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
          )}
          
          <div className="absolute inset-0 bg-blue-500/5 rounded-xl blur-sm group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Input command sequence..."
            className="w-full bg-black/40 border border-white/10 text-white rounded-xl pl-4 pr-32 py-3 focus:outline-none focus:border-blue-500/50 focus:bg-black/60 placeholder-gray-500 transition-all resize-none min-h-[48px] max-h-[120px] text-sm font-mono"
            rows={1}
            style={{ height: 'auto', minHeight: '48px' }} 
          />
          <div className="absolute right-2 top-1.5 flex items-center gap-1">
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
             
             <button
               type="button"
               onClick={() => fileInputRef.current?.click()}
               className={`p-1.5 rounded-lg transition-colors text-gray-500 hover:text-gray-300 hover:bg-white/5 ${selectedImage ? 'text-blue-400' : ''}`}
               title="Attach Data"
             >
               <Paperclip size={16} />
             </button>
             
             <button
               type="button"
               onClick={() => setIsSpeaking(!isSpeaking)}
               className={`p-1.5 rounded-lg transition-colors ${
                 isSpeaking ? 'text-blue-400 bg-blue-500/10 shadow-[0_0_5px_rgba(59,130,246,0.3)]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
               } ${isPlaying ? 'animate-pulse' : ''}`}
             >
               {isSpeaking ? <Volume2 size={16} /> : <VolumeX size={16} />}
             </button>
             
             <button
               type="button"
               onClick={toggleLiveMode}
               className={`p-1.5 rounded-lg transition-colors ${
                 isLiveMode ? 'text-green-400 bg-green-500/10 shadow-[0_0_5px_rgba(74,222,128,0.3)] animate-pulse' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
               }`}
             >
               {isLiveMode ? <PhoneOff size={16} /> : <Phone size={16} />}
             </button>
             
             <button
               type="button"
               onMouseDown={startListening}
               onMouseUp={stopListening}
               onMouseLeave={stopListening}
               onTouchStart={startListening}
               onTouchEnd={stopListening}
               className={`p-1.5 rounded-lg transition-colors ${isListening ? 'text-red-500 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.3)] scale-110' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
             >
               {isListening ? <Mic size={16} className="animate-pulse" /> : <MicOff size={16} />}
             </button>
             
             <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
             >
                <Send size={16} />
             </button>
          </div>
        </div>
      </form>
    </div>
  );
}
