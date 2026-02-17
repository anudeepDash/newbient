import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Trash2, CheckCircle, ArrowLeft, Clock, User, AlertCircle } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

const MessageManager = () => {
    const { messages, markMessageRead, deleteMessage } = useStore();
    const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

    const filteredMessages = messages.filter(msg => {
        if (filter === 'unread') return msg.status === 'new';
        if (filter === 'read') return msg.status === 'read';
        return true;
    });

    const unreadCount = messages.filter(m => m.status === 'new').length;

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this message?")) {
            await deleteMessage(id);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown Date';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div className="flex items-center gap-4">
                        <Link to="/admin" className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full shrink-0">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                Messages
                                {unreadCount > 0 && (
                                    <span className="bg-neon-pink text-black text-xs font-bold px-2 py-0.5 rounded-full">
                                        {unreadCount} NEW
                                    </span>
                                )}
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">Manage inquiries from the contact form.</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['all', 'unread', 'read'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${filter === f
                                ? 'bg-neon-blue text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {f === 'all' ? 'All Messages' : f}
                        </button>
                    ))}
                </div>

                {/* Messages List */}
                <div className="space-y-4">
                    <AnimatePresence mode='popLayout'>
                        {filteredMessages.length > 0 ? (
                            filteredMessages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    layout
                                >
                                    <Card className={`p-6 transition-all duration-300 ${msg.status === 'new'
                                        ? 'border-neon-blue/30 bg-gradient-to-r from-neon-blue/5 to-transparent'
                                        : 'border-white/10 hover:border-white/20'
                                        }`}>
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* Left: Sender Info */}
                                            <div className="md:w-1/4 shrink-0 space-y-2">
                                                <div className="flex items-center gap-2 text-white font-bold text-lg">
                                                    <User size={18} className="text-neon-blue" />
                                                    {msg.name || 'Anonymous'}
                                                </div>
                                                <div className="text-sm text-gray-400 break-all">
                                                    {msg.email}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                                                    <Clock size={12} />
                                                    {formatDate(msg.createdAt)}
                                                </div>
                                            </div>

                                            {/* Middle: Content */}
                                            <div className="flex-grow">
                                                <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Message</h3>
                                                <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                                                    {msg.message}
                                                </p>
                                            </div>

                                            {/* Right: Actions */}
                                            <div className="flex flex-row md:flex-col gap-3 justify-start md:justify-center border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 shrink-0 min-w-[140px]">
                                                <Button
                                                    onClick={() => markMessageRead(msg.id, msg.status === 'new' ? 'read' : 'new')}
                                                    variant="outline"
                                                    className={`w-full justify-start gap-2 ${msg.status === 'new'
                                                        ? 'text-neon-blue border-neon-blue/30 hover:bg-neon-blue/10'
                                                        : 'text-gray-500 border-gray-700 hover:text-white'
                                                        }`}
                                                >
                                                    {msg.status === 'new' ? (
                                                        <>
                                                            <CheckCircle size={16} /> Mark Read
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AlertCircle size={16} /> Mark Unread
                                                        </>
                                                    )}
                                                </Button>

                                                <Button
                                                    onClick={() => handleDelete(msg.id)}
                                                    variant="outline"
                                                    className="w-full justify-start gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500"
                                                >
                                                    <Trash2 size={16} /> Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10"
                            >
                                <Mail size={48} className="mx-auto text-gray-600 mb-4" />
                                <h3 className="text-xl font-bold text-gray-400">No messages found</h3>
                                <p className="text-gray-500">
                                    {filter !== 'all' ? `No ${filter} messages.` : 'Your inbox is empty.'}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default MessageManager;
