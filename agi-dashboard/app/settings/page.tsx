'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [apiKey, setApiKey] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [mailchimpKey, setMailchimpKey] = useState('');
  const [elevenKey, setElevenKey] = useState('');
  const [elevenVoiceId, setElevenVoiceId] = useState('');
  const [tavilyKey, setTavilyKey] = useState('');
  const [wolframKey, setWolframKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [wpUrl, setWpUrl] = useState('');
  const [wpSecret, setWpSecret] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'ROfdM12MidA') {
      setIsAuthenticated(true);
      setPasswordError('');
      fetchSettings();
    } else {
      setPasswordError('Access Denied: Invalid Security Credential');
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.trello_api_key || '');
        setApiToken(data.trello_api_token || '');
        setOpenaiKey(data.openai_api_key || '');
        setMailchimpKey(data.mailchimp_api_key || '');
        setElevenKey(data.elevenlabs_api_key || '');
        setElevenVoiceId(data.elevenlabs_voice_id || '');
        setTavilyKey(data.tavily_api_key || '');
        setWolframKey(data.wolfram_app_id || '');
        setGoogleKey(data.google_api_key || '');
        setWpUrl(data.wordpress_site_url || '');
        setWpSecret(data.wordpress_secret_key || '');
      }
    } catch (_e) {
      console.error("Failed to load settings", _e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setStatus('Saving...');
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trello_api_key: apiKey,
          trello_api_token: apiToken,
          openai_api_key: openaiKey,
          mailchimp_api_key: mailchimpKey,
          elevenlabs_api_key: elevenKey,
          elevenlabs_voice_id: elevenVoiceId,
          tavily_api_key: tavilyKey,
          wolfram_app_id: wolframKey,
          google_api_key: googleKey,
          wordpress_site_url: wpUrl,
          wordpress_secret_key: wpSecret
        })
      });
      
      if (res.ok) {
        setStatus('Configuration Synced to Secure Server');
        setTimeout(() => setStatus(''), 2000);
      } else {
        setStatus('Save Failed');
      }
    } catch (_e) {
      setStatus('Error saving settings');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-red-500">Restricted Area</h2>
          <p className="text-gray-400">Security Clearance Required</p>
        </div>
        
        <form onSubmit={handleLogin} className="w-full max-w-md space-y-4 rounded-xl border border-gray-800 bg-gray-900/50 p-8">
          <div>
             <label className="block text-sm font-medium text-gray-400 mb-1">Access Code</label>
             <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter Password"
                autoFocus
              />
          </div>
          {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
          <button 
            type="submit"
            className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
         <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
         {loading && <span className="text-sm text-gray-500 animate-pulse">Syncing with server...</span>}
      </div>

      <div className="grid gap-8 max-w-2xl">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h3 className="font-semibold text-lg mb-4 text-blue-400">Trello Integration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">API Key</label>
              <input 
                type="text" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Trello API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">API Token</label>
              <input 
                type="password" 
                value={apiToken} 
                onChange={(e) => setApiToken(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Trello API Token"
              />
            </div>
             <p className="text-xs text-gray-500">
              Get credentials from <a href="https://trello.com/app-key" target="_blank" className="text-blue-400 hover:underline">Trello Developer Portal</a>.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h3 className="font-semibold text-lg mb-4 text-green-400">AI Neural Link</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">OpenAI API Key</label>
              <input 
                type="password" 
                value={openaiKey} 
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="sk-..."
              />
            </div>
             <p className="text-xs text-gray-500">
              Required for the chat interface to function. Your key is stored securely on the server.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h3 className="font-semibold text-lg mb-4 text-yellow-400">Mailchimp Integration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">API Key</label>
              <input 
                type="password" 
                value={mailchimpKey} 
                onChange={(e) => setMailchimpKey(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="key-us14"
              />
            </div>
             <p className="text-xs text-gray-500">
              Generate an API key in Mailchimp Account &rarr; Extras &rarr; API keys.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h3 className="font-semibold text-lg mb-4 text-purple-400">Voice (ElevenLabs)</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">ElevenLabs API Key</label>
              <input 
                type="password" 
                value={elevenKey} 
                onChange={(e) => setElevenKey(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="xi-..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Voice ID</label>
              <input 
                type="text" 
                value={elevenVoiceId} 
                onChange={(e) => setElevenVoiceId(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="JBFqnCBsd6RMkjVDRZzb"
              />
            </div>
             <p className="text-xs text-gray-500">
              Required for voice features. Get both from the ElevenLabs dashboard.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h3 className="font-semibold text-lg mb-4 text-orange-400">Web Search (Tavily)</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Tavily API Key</label>
              <input 
                type="password" 
                value={tavilyKey} 
                onChange={(e) => setTavilyKey(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="tvly-..."
              />
            </div>
             <p className="text-xs text-gray-500">
              Required for reliable web search. Get a free key from <a href="https://tavily.com" target="_blank" className="text-orange-400 hover:underline">Tavily</a>.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h3 className="font-semibold text-lg mb-4 text-pink-400">Knowledge Engine (Wolfram Alpha)</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">App ID</label>
              <input 
                type="password" 
                value={wolframKey} 
                onChange={(e) => setWolframKey(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="APP-ID..."
              />
            </div>
             <p className="text-xs text-gray-500">
              Required for calculations and facts. Get an App ID from <a href="https://developer.wolframalpha.com" target="_blank" className="text-pink-400 hover:underline">Wolfram Developer Portal</a>.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h3 className="font-semibold text-lg mb-4 text-cyan-400">WordPress / Jetpack</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Site URL</label>
              <input
                type="text"
                value={wpUrl}
                onChange={(e) => setWpUrl(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="https://your-site.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Sentinel Secret Key</label>
              <input
                type="password"
                value={wpSecret}
                onChange={(e) => setWpSecret(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Same as WordPress plugin secret"
              />
            </div>
            <p className="text-xs text-gray-500">
              Required for fetching Jetpack Stats via the WordPress plugin endpoint.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleSave}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Save System Configuration
          </button>
          {status && <span className="text-green-500 text-sm font-medium animate-pulse">{status}</span>}
        </div>
      </div>
    </div>
  );
}
