import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Calendar, CheckCircle, Trash2 } from 'lucide-react';
import { collection, query, orderBy, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const MessageManager = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMessages = async () => {
        try {
            const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const msgs = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const markAsRead = async (id) => {
        try {
            const msgRef = doc(db, "messages", id);
            await updateDoc(msgRef, { status: 'read' });
            setMessages(messages.map(m => m.id === id ? { ...m, status: 'read' } : m));
        } catch (error) {
            console.error("Error updating message:", error);
        }
    };

    const deleteMessage = async (id) => {
        if (window.confirm('Are you sure you want to delete this message?')) {
            try {
                await deleteDoc(doc(db, "messages", id));
                setMessages(messages.filter(m => m.id !== id));
            } catch (error) {
                console.error("Error deleting message:", error);
            }
        }
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Link to="/admin" className="text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <h1 className="text-3xl font-bold text-white">Inbox</h1>
                    </div>
                    <div className="text-gray-400">
                        Total: {messages.length} | New: {messages.filter(m => m.status === 'new').length}
                    </div>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="text-white text-center">Loading messages...</div>
                    ) : messages.length === 0 ? (
                        <div className="text-gray-500 text-center py-12 bg-white/5 rounded-xl">No messages found.</div>
                    ) : (
                        messages.map((msg) => (
                            <Card key={msg.id} className={`p-6 transition-all ${msg.status === 'new' ? 'border-neon-blue/50 bg-neon-blue/5' : 'border-white/5 hover:border-white/20'}`}>
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-white">{msg.name}</h3>
                                            {msg.status === 'new' && (
                                                <span className="px-2 py-0.5 rounded-full bg-neon-blue text-black text-xs font-bold uppercase">New</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                                            <a href={`mailto:${msg.email}`} className="hover:text-neon-blue flex items-center gap-1">
                                                <Mail size={14} /> {msg.email}
                                            </a>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} /> {new Date(msg.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-300 bg-black/30 p-4 rounded-lg border border-white/5 whitespace-pre-wrap">
                                            {msg.message}
                                        </p>
                                    </div>
                                    <div className="flex md:flex-col gap-2 justify-start md:justify-center min-w-[120px]">
                                        {msg.status !== 'read' && (
                                            <Button variant="outline" size="sm" onClick={() => markAsRead(msg.id)} className="w-full justify-center">
                                                <CheckCircle size={16} className="mr-2" /> Mark Read
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => deleteMessage(msg.id)} className="w-full justify-center text-red-400 hover:text-red-300 border-red-900/50 hover:bg-red-900/20">
                                            <Trash2 size={16} className="mr-2" /> Delete
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageManager;
