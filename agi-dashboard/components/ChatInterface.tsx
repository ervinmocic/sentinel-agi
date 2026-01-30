'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Terminal, Mic, MicOff, Volume2, VolumeX, Paperclip, X, Image as ImageIcon, Phone, PhoneOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string; // Base64 image
}

export function ChatInterface({ apiEndpoint = '/api/chat' }: { apiEndpoint?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Sentinel AI v5.2 online. How can I assist with your company building today?' }
  ]);
  const messagesRef = useRef<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false); // TTS enabled
  const [isListening, setIsListening] = useState(false); // STT active
  const [isPlaying, setIsPlaying] = useState(false); // Currently playing audio
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Base64 image
  const [isLiveMode, setIsLiveMode] = useState(false); // Live Conversation Mode
  const [isProcessing, setIsProcessing] = useState(false); // Guard for double submission
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const processingRef = useRef(false); // Ref for immediate access in callbacks

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Live Mode Logic
  useEffect(() => {
    if (isLiveMode && !isListening && !isPlaying && !isLoading && !processingRef.current) {
      // Start listening automatically in live mode if not busy
      startListening();
    }
  }, [isLiveMode, isListening, isPlaying, isLoading]);

  const toggleLiveMode = () => {
    if (isLiveMode) {
      setIsLiveMode(false);
      stopListening();
      setIsSpeaking(false); // Turn off TTS when exiting live mode (optional, but makes sense)
    } else {
      setIsLiveMode(true);
      setIsSpeaking(true); // Force TTS on for live conversation
      startListening();
    }
  };

  const startListening = async () => {
    try {
      if (isListening) return;
      
      // Safety check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Audio recording not supported in this browser/context");
        alert("Microphone access is not supported in this browser. Please use Chrome/Edge/Firefox.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Only transcribe if we actually recorded something meaningful (approx check)
        if (blob.size > 3000) { // Increased threshold to avoid empty noise
            await transcribeAudio(blob);
        } else if (isLiveMode) {
            // If too short/empty, just restart listening if we are still in live mode
            // But give a small delay to avoid rapid loops
            setTimeout(() => setIsListening(false), 500); 
        } else {
            setIsListening(false);
        }
        
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
      
      if (isLiveMode) {
         // Setup Audio Context for volume detection
         const audioContext = new AudioContext();
         const source = audioContext.createMediaStreamSource(stream);
         const analyzer = audioContext.createAnalyser();
         analyzer.fftSize = 512;
         analyzer.smoothingTimeConstant = 0.8;
         source.connect(analyzer);
         
         const bufferLength = analyzer.frequencyBinCount;
         const dataArray = new Uint8Array(bufferLength);
         
         let silenceStart = Date.now();
         let speechDetected = false;
         const SILENCE_THRESHOLD = 1200; // 1.2s silence to stop
         const SPEECH_THRESHOLD = 20; // Volume threshold
         
         const checkSilence = () => {
            if (!isLiveMode || !mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
                audioContext.close();
                return;
            }
            
            analyzer.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            let sum = 0;
            for(let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const volume = sum / bufferLength;
            
            if (volume > SPEECH_THRESHOLD) {
                silenceStart = Date.now();
                speechDetected = true;
            } 
            
            // Only stop if we detected speech previously AND have been silent for threshold
            if (speechDetected && (Date.now() - silenceStart > SILENCE_THRESHOLD)) {
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

    if (isLiveMode) setCurrentStatus('Listening...'); // Keep UI clean
    else setCurrentStatus('Transcribing audio...');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      const res = await fetch('/api/stt', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Transcription failed');
      
      const data = await res.json();
      if (data.text && data.text.trim().length > 0) {
          const newText = String(data.text).trim();
          // IMPORTANT: do NOT trigger side-effects inside a setState updater
          // (React StrictMode may invoke updaters twice in dev, causing double sends).
          if (isLiveMode) {
            await submitLiveMessage(newText);
          } else {
            setInput(prev => (prev ? prev + ' ' + newText : newText));
          }
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

  // Dedicated submit for Live Mode to bypass event/state lag
  const submitLiveMessage = async (text: string) => {
      // Note: processingRef is already true here
      
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
                            const lastIdx = newMessages.length - 1;
                            const lastMsg = newMessages[lastIdx];
                            
                            if (lastMsg.role === 'assistant') {
                                newMessages[lastIdx] = {
                                    ...lastMsg,
                                    content: lastMsg.content + data.content
                                };
                            }
                            return newMessages;
                        });
                    } else if (data.type === 'status') {
                        setCurrentStatus(data.content);
                    }
                } catch (e) {}
            }
          }
          
          // Play TTS
          if (fullAssistantResponse) {
              await playTextToSpeech(fullAssistantResponse);
          }

      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
          setCurrentStatus(isLiveMode ? 'Listening...' : '');
          
          // Release locks
          processingRef.current = false;
          setIsProcessing(false);
          setIsListening(false); // Trigger restart
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
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || 'TTS Failed');
      }
      
      const audioBlob = await res.blob();
      const objectUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(objectUrl);
      audio.onended = () => {
        URL.revokeObjectURL(objectUrl);
        setIsPlaying(false);
      };
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        URL.revokeObjectURL(objectUrl);
        setIsPlaying(false);
      };
      await audio.play();
    } catch (e) {
      console.error("TTS Error", e);
      setIsPlaying(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStatus]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
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
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
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
    setSelectedImage(null); // Clear image after sending
    
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage, image: currentImage || undefined },
      { role: 'assistant', content: '' }
    ]);
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
          image: currentImage, // Send image to API
          history: messagesRef.current.filter(m => m.content || m.image), // avoid stale closure
          trello: { key: apiKey, token: apiToken },
          openaiKey: openAiKey,
          mailchimpKey: mailchimpKey
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullAssistantResponse = ''; // Accumulator for TTS

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Process all complete lines
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'text') {
              fullAssistantResponse += data.content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                const lastMsg = newMessages[lastIdx];
                
                if (lastMsg.role === 'assistant') {
                  newMessages[lastIdx] = {
                    ...lastMsg,
                    content: lastMsg.content + data.content
                  };
                }
                return newMessages;
              });
              // Note: Streaming TTS is hard, so we usually play after full sentence or full message.
              // For simplicity in this MVP, we'll wait for the full response or play chunks if we implemented a buffer.
              // We'll play the FULL response at the end of the stream loop instead.
            } else if (data.type === 'status') {
              setCurrentStatus(data.content);
              if (isSpeaking) {
                 // Optionally speak status updates too? Maybe too noisy. Let's skip status updates for TTS.
              }
            }
          } catch (e) {
            console.error('Error parsing JSON chunk', e);
          }
        }
      }

      // After stream ends, play the full assistant response if TTS is on
      // We need to find the FINAL content of the last message.
      // Since 'messages' state in this closure is stale, we can't read it directly.
      // But we built 'buffer' or can track 'fullResponse' variable.
      // Let's rely on a separate effect or just assume the chunks we received constitute the text.
      // Actually, standard practice for simple TTS integration is to accumulate the text in a var here.
      
      // We haven't been accumulating pure text in a local var for TTS purposes cleanly.
      // Let's fix that next time or just use the fact that we updated state.
      // Better approach: We can't easily access the final state here due to closure.
      // We will skip auto-play on stream end for this specific iteration unless we accumulate `fullAssistantResponse` locally.
      
      if (isSpeaking && fullAssistantResponse) {
        try {
          await playTextToSpeech(fullAssistantResponse);
        } catch (e) {
          console.error("Auto-TTS failed:", e);
        }
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.role === 'assistant') {
           lastMsg.content += "\n[Connection Error. Please check your settings.]";
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      setCurrentStatus('');
    }
  };

  const preprocessMath = (content: string) => {
    return content
      .replace(/\\\[/g, '$$')
      .replace(/\\\]/g, '$$')
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$');
  };

  return (
    <div className="flex flex-col h-full border border-gray-800 rounded-2xl bg-gray-900/50 overflow-hidden shadow-sm">
      <div className="bg-gray-950 border-b border-gray-800 p-4 flex items-center gap-3">
        <div className="bg-blue-600/20 p-2 rounded-lg text-blue-500 shadow-glow">
          <Bot size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-white tracking-wide">SENTINEL v5.2</h3>
          <p className="text-xs text-green-500 flex items-center gap-1 font-mono">
            <span className="block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            ONLINE
          </p>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-4 space-y-6 font-sans"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {messages.map((msg, idx) => (
          msg.content && (
            <div
              key={idx}
              className={`flex items-start gap-4 ${
                msg.role === 'assistant' ? 'justify-start' : 'justify-end'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 mt-1 flex-shrink-0 border border-blue-500/30">
                  <Bot size={14} />
                </div>
              )}
              <div
                className={`rounded-xl px-5 py-3 max-w-[85%] text-sm leading-relaxed shadow-sm ${
                  msg.role === 'assistant'
                    ? 'bg-gray-800/80 text-gray-200 border border-gray-700/50 rounded-tl-none'
                    : 'bg-blue-600 text-white rounded-tr-none'
                }`}
              >
                {msg.image && (
                  <img src={msg.image} alt="User upload" className="max-w-full h-auto rounded-lg mb-2 border border-white/10" style={{ maxHeight: '200px' }} />
                )}
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                      li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      code: ({node, ...props}) => <code className="bg-black/30 rounded px-1 py-0.5 font-mono text-xs" {...props} />,
                      pre: ({node, ...props}) => <pre className="bg-black/50 rounded p-2 overflow-x-auto mb-2" {...props} />,
                    }}
                  >
                    {preprocessMath(msg.content)}
                  </ReactMarkdown>
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 mt-1 flex-shrink-0 border border-gray-600">
                  <User size={14} />
                </div>
              )}
            </div>
          )
        ))}
        
        {/* Active Thinking/Status Indicator */}
        {isLoading && (
          <div className="flex items-start gap-4 animate-in fade-in duration-300">
             <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 mt-1 flex-shrink-0 border border-blue-500/30">
                  <Bot size={14} />
             </div>
             <div className="space-y-2">
                {currentStatus && (
                  <div className="flex items-center gap-2 text-xs text-blue-400 font-mono bg-blue-900/20 px-3 py-1.5 rounded-md border border-blue-500/20">
                     <Terminal size={12} className="animate-pulse" />
                     {currentStatus}
                  </div>
                )}
                {!messages[messages.length - 1].content && (
                   <div className="bg-gray-800/50 rounded-xl rounded-tl-none px-4 py-3">
                     <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                   </div>
                )}
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-gray-950 border-t border-gray-800">
        <div className="relative">
          {selectedImage && (
            <div className="absolute left-4 bottom-full mb-2 bg-gray-900 border border-gray-700 rounded-lg p-2 flex items-start gap-2 shadow-xl">
              <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded" />
              <button 
                type="button" 
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Command the system... (Paste images, drag & drop, or use attachment icon)"
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-4 pr-32 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-500 placeholder-gray-600 transition-all shadow-inner resize-none min-h-[56px] max-h-[200px]"
            rows={1}
            style={{ height: 'auto', minHeight: '56px' }} 
          />
          <div className="absolute right-2 top-2 flex items-center gap-1">
             <input 
               type="file" 
               ref={fileInputRef} 
               className="hidden" 
               accept="image/*"
               onChange={handleImageSelect}
             />
             <button
               type="button"
               onClick={() => fileInputRef.current?.click()}
               className={`p-2 rounded-lg transition-colors text-gray-500 hover:text-gray-300 ${selectedImage ? 'text-blue-400' : ''}`}
               title="Attach Image"
             >
               <Paperclip size={18} />
             </button>
             <button
               type="button"
               onClick={() => setIsSpeaking(!isSpeaking)}
               className={`p-2 rounded-lg transition-colors ${
                 isSpeaking ? 'text-blue-400 bg-blue-400/10' : 'text-gray-500 hover:text-gray-300'
               } ${isPlaying ? 'animate-pulse' : ''}`}
               title="Toggle Voice Output"
             >
               {isSpeaking ? <Volume2 size={18} /> : <VolumeX size={18} />}
             </button>
             <button
               type="button"
               onClick={toggleLiveMode}
               className={`p-2 rounded-lg transition-colors ${
                 isLiveMode ? 'text-green-500 bg-green-500/10 animate-pulse' : 'text-gray-500 hover:text-gray-300'
               }`}
               title="Live Conversation Mode"
             >
               {isLiveMode ? <PhoneOff size={18} /> : <Phone size={18} />}
             </button>
             <button
               type="button"
               onMouseDown={startListening}
               onMouseUp={stopListening}
               onMouseLeave={stopListening}
               onTouchStart={startListening}
               onTouchEnd={stopListening}
               className={`p-2 rounded-lg transition-colors ${isListening ? 'text-red-500 bg-red-500/10 scale-110' : 'text-gray-500 hover:text-gray-300'}`}
               title="Hold to Talk"
             >
               {isListening ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
             </button>
             <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             >
                <Send size={18} />
             </button>
          </div>
        </div>
      </form>
    </div>
  );
}
