import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Pin, ArrowLeft, Save } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import LivePreview from '../../components/admin/LivePreview';

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
            <div className={`mx-auto ${isAdding ? 'max-w-6xl' : 'max-w-4xl'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link to="/admin" className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full shrink-0">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">Announcements</h1>
                    </div>
                    {!isAdding && (
                        <Button variant="primary" onClick={() => setIsAdding(true)} className="w-full md:w-auto px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-neon-pink/20">
                            <Plus className="mr-2 h-4 w-4" />
                            Add New
                        </Button>
                    )}
                </div>

                {isAdding ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start h-[calc(100vh-200px)] min-h-[600px]">
                        {/* Editor Column */}
                        <Card className="p-6 h-full flex flex-col border-neon-pink/30">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white">New Announcement</h2>
                                <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-white text-sm">Cancel</button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4 flex-grow flex flex-col">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                                    <Input
                                        placeholder="Announcement Headline"
                                        value={newAnnouncement.title}
                                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                                        <Input
                                            type="date"
                                            value={newAnnouncement.date}
                                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Image URL (Optional)</label>
                                        <Input
                                            placeholder="https://..."
                                            value={newAnnouncement.image}
                                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, image: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex-grow flex flex-col">
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Content</label>
                                    <textarea
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all resize-none flex-grow"
                                        placeholder="Write your announcement details here..."
                                        value={newAnnouncement.content}
                                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                        required
                                        style={{ minHeight: '150px' }}
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="pinned"
                                        checked={newAnnouncement.isPinned}
                                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, isPinned: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-300 text-neon-pink focus:ring-neon-pink"
                                    />
                                    <label htmlFor="pinned" className="text-gray-300 text-sm">Pin to top of dashboard</label>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-auto">
                                    <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                                    <Button type="submit" variant="primary">
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Announcement
                                    </Button>
                                </div>
                            </form>
                        </Card>

                        {/* Preview Column */}
                        <LivePreview type="announcement" data={newAnnouncement} />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {announcements.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 bg-white/5 rounded-xl">
                                <p>No announcements yet.</p>
                                <Button variant="link" onClick={() => setIsAdding(true)} className="text-neon-pink">Create your first one</Button>
                            </div>
                        ) : (
                            announcements.map((item) => (
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
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnnouncementsManager;
