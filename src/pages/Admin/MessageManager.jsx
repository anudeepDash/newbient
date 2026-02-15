import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, RefreshCw, ExternalLink, Inbox } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const MessageManager = () => {
    const [messages, setMessages] = useState([]);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch Webmail Only
    const fetchMessages = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/email/fetch');
            if (!res.ok) throw new Error('Failed to fetch emails');

            const data = await res.json();
            if (data.emails) {
                setMessages(data.emails);
                // Select first message if none selected
                if (!selectedMessage && data.emails.length > 0) {
                    setSelectedMessage(data.emails[0]);
                }
            }
        } catch (error) {
            console.error("Error fetching webmail:", error);
            setError("Failed to load emails. Please check your connection and credentials.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    return (
        <div className="h-screen flex flex-col pt-20 bg-black text-white overflow-hidden">
            {/* Header */}
            <div className="flex-none px-6 pb-6 border-b border-white/10 flex justify-between items-center bg-black/95 backdrop-blur z-10">
                <div className="flex items-center gap-4">
                    <Link to="/admin" className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                        <Mail className="text-neon-blue" />
                        Domain Inbox
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-500 hidden md:inline-block">
                        Syncs with Godaddy / IMAP
                    </span>
                    <button
                        onClick={fetchMessages}
                        className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                        title="Refresh Emails"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <a
                        href="https://email.godaddy.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Button className="bg-neon-blue/10 text-neon-blue hover:bg-neon-blue hover:text-black border-neon-blue/50 text-xs px-3 py-1">
                            <ExternalLink size={14} className="mr-2" />
                            Open Webmail
                        </Button>
                    </a>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar List */}
                <div className="w-full md:w-1/3 border-r border-white/10 flex flex-col bg-black/50">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading && messages.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                                <RefreshCw className="animate-spin mb-2" />
                                Loading emails...
                            </div>
                        ) : error ? (
                            <div className="p-8 text-center text-red-400 text-sm">
                                {error}
                                <br />
                                <button onClick={fetchMessages} className="mt-4 underline hover:text-white">Try Again</button>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No messages found in Inbox.</div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id || msg.uid || Math.random()}
                                    onClick={() => setSelectedMessage(msg)}
                                    className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${selectedMessage === msg ? 'bg-white/10 border-l-4 border-l-neon-blue' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-sm truncate pr-2 text-white">
                                            {msg.from || 'Unknown'}
                                        </h4>
                                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                            {new Date(msg.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-xs truncate mb-1">{msg.subject || '(No Subject)'}</p>
                                    <p className="text-gray-500 text-xs line-clamp-2">
                                        {msg.text || ''}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="hidden md:flex flex-1 flex-col bg-zinc-900/50">
                    {selectedMessage ? (
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="flex justify-between items-start mb-8 pb-6 border-b border-white/10">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">{selectedMessage.subject || '(No Subject)'}</h2>
                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue/20 to-blue-900/20 flex items-center justify-center text-neon-blue font-bold border border-neon-blue/30">
                                            {(selectedMessage.from || '?').charAt(0).toUpperCase().replace(/[^A-Z]/, '?')}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{selectedMessage.from}</p>
                                            <p className="text-xs text-gray-500">{new Date(selectedMessage.date).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none mb-12 text-gray-300 whitespace-pre-wrap font-sans">
                                {selectedMessage.text || selectedMessage.html || '(No content preview available)'}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 border-t border-white/10 pt-6">
                                <a
                                    href="https://email.godaddy.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Button className="bg-neon-blue/10 text-neon-blue hover:bg-neon-blue hover:text-black border-neon-blue/50">
                                        <ExternalLink size={16} className="mr-2" />
                                        Reply via Godaddy
                                    </Button>
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <Inbox size={32} />
                            </div>
                            <p>Select a verified email to read</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageManager;
