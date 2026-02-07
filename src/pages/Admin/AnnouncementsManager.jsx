import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Pin, ArrowLeft, Save } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';

const AnnouncementsManager = () => {
    const { announcements, addAnnouncement, togglePinAnnouncement, deleteAnnouncement } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        content: '',
        image: '',
        isPinned: false
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        try {
            addAnnouncement({
                id: Date.now(),
                ...newAnnouncement
            });
            alert("Announcement added successfully!");
            setIsAdding(false);
            setNewAnnouncement({
                title: '',
                date: new Date().toISOString().split('T')[0],
                content: '',
                image: '',
                isPinned: false
            });
        } catch (error) {
            console.error("Error adding announcement:", error);
            alert("Failed to add announcement.");
        }
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link to="/admin" className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full shrink-0">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">Announcements</h1>
                    </div>
                    <Button variant="primary" onClick={() => setIsAdding(!isAdding)} className="w-full md:w-auto px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-neon-pink/20">
                        <Plus className="mr-2 h-4 w-4" />
                        {isAdding ? 'Cancel' : 'Add New'}
                    </Button>
                </div>

                {isAdding && (
                    <Card className="p-6 mb-8 border-neon-pink/30">
                        <h2 className="text-xl font-bold text-white mb-4">New Announcement</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                placeholder="Title"
                                value={newAnnouncement.title}
                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    type="date"
                                    value={newAnnouncement.date}
                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, date: e.target.value })}
                                    required
                                />
                                <Input
                                    placeholder="Image URL"
                                    value={newAnnouncement.image}
                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, image: e.target.value })}
                                    required
                                />
                            </div>
                            <textarea
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all resize-none h-32"
                                placeholder="Content..."
                                value={newAnnouncement.content}
                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                required
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="pinned"
                                    checked={newAnnouncement.isPinned}
                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, isPinned: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-neon-pink focus:ring-neon-pink"
                                />
                                <label htmlFor="pinned" className="text-gray-300">Pin to top</label>
                            </div>
                            <div className="flex justify-end gap-4">
                                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                                <Button type="submit" variant="primary">Save Announcement</Button>
                            </div>
                        </form>
                    </Card>
                )}

                <div className="space-y-4">
                    {announcements.map((item) => (
                        <Card key={item.id} className="p-6 flex items-center justify-between group hover:border-white/20 transition-colors">
                            <div className="flex-grow">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-xl font-bold text-white">{item.title}</h3>
                                    {item.isPinned && <Pin size={16} className="text-neon-pink fill-current" />}
                                </div>
                                <p className="text-gray-400 text-sm mb-2">{item.date}</p>
                                <p className="text-gray-300 line-clamp-1">{item.content}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                <button
                                    onClick={() => togglePinAnnouncement(item.id)}
                                    className={cn(
                                        "p-3 md:p-2 rounded-full transition-colors",
                                        item.isPinned ? "bg-neon-pink/20 text-neon-pink" : "text-gray-500 hover:text-white bg-white/5"
                                    )}
                                    title={item.isPinned ? "Unpin" : "Pin"}
                                >
                                    <Pin size={20} className={item.isPinned ? "fill-current" : ""} />
                                </button>
                                <button
                                    onClick={() => deleteAnnouncement(item.id)}
                                    className="p-3 md:p-2 text-gray-500 hover:text-red-500 transition-colors bg-white/5 md:bg-transparent rounded-full"
                                    title="Delete"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnnouncementsManager;
