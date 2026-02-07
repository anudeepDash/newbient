import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, Save, Eye, EyeOff, Loader } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const UpcomingEventsManager = () => {
    const { upcomingEvents, addUpcomingEvent, updateUpcomingEvent, deleteUpcomingEvent, siteSettings, toggleUpcomingSectionVisibility } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const [newEvent, setNewEvent] = useState({
        title: '',
        date: '',
        description: '',
        image: '',
        link: '',
        alsoPostToAnnouncements: false
    });

    const resetForm = () => {
        setNewEvent({
            title: '',
            date: '',
            description: '',
            image: '',
            link: '',
            alsoPostToAnnouncements: false
        });
        setIsAdding(false);
        setEditingId(null);
        setSelectedFile(null);
        setUploading(false);
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setIsAdding(true);
        setNewEvent({ ...item, alsoPostToAnnouncements: false }); // Don't carry over "post to announcements" logic for edits usually, or handled differently
    };

    const handleFileUpload = async (file) => {
        if (!file) return null;
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "maw1e4ud");
        data.append("cloud_name", "dgtalrz4n");

        try {
            const res = await fetch("https://api.cloudinary.com/v1_1/dgtalrz4n/image/upload", {
                method: "POST",
                body: data
            });
            const uploadedImage = await res.json();
            return uploadedImage.secure_url;
        } catch (error) {
            console.error("Error uploading to Cloudinary:", error);
            throw new Error("Image upload failed");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
            let imageUrl = newEvent.image;
            if (selectedFile) {
                imageUrl = await handleFileUpload(selectedFile);
            }

            const eventData = {
                title: newEvent.title,
                date: newEvent.date,
                description: newEvent.description,
                image: imageUrl,
                link: newEvent.link
            };

            if (editingId) {
                await updateUpcomingEvent(editingId, eventData);
                alert("Event updated successfully!");
            } else {
                await addUpcomingEvent(eventData, newEvent.alsoPostToAnnouncements);
                alert(newEvent.alsoPostToAnnouncements
                    ? "Event added AND posted to Announcements!"
                    : "Event added successfully!");
            }
            resetForm();
        } catch (error) {
            console.error("Error saving event:", error);
            alert("Failed to save event.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 md:gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link to="/admin" className="text-gray-400 hover:text-white transition-colors shrink-0">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">Upcoming Events</h1>
                            <p className="text-xs md:text-sm text-gray-400">Manage home page events.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center justify-between gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                            <span className="text-sm text-gray-300">Home Section:</span>
                            <button
                                onClick={() => toggleUpcomingSectionVisibility(siteSettings?.showUpcomingEvents)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${siteSettings?.showUpcomingEvents
                                    ? 'bg-neon-green text-black'
                                    : 'bg-red-500/20 text-red-500'
                                    }`}
                            >
                                {siteSettings?.showUpcomingEvents ? (
                                    <><Eye size={12} /> VISIBLE</>
                                ) : (
                                    <><EyeOff size={12} /> HIDDEN</>
                                )}
                            </button>
                        </div>

                        <Button variant="primary" onClick={() => { setIsAdding(!isAdding); setEditingId(null); }} className="w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" />
                            {isAdding ? 'Cancel' : 'Add New Event'}
                        </Button>
                    </div>
                </div>

                {/* Add/Edit Form */}
                {isAdding && (
                    <Card className="p-6 mb-8 border-neon-blue/30">
                        <h2 className="text-xl font-bold text-white mb-4">{editingId ? 'Edit Event' : 'Add New Event'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Title (Optional)</label>
                                    <Input
                                        placeholder="e.g. Saturday Night Live"
                                        value={newEvent.title}
                                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Date (Optional)</label>
                                    <Input
                                        type="date"
                                        value={newEvent.date}
                                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Short Description (Optional)</label>
                                <Input
                                    placeholder="Brief details..."
                                    value={newEvent.description}
                                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Event Image (4:5 Ratio Recommended)</label>
                                    <div className="space-y-2">
                                        <Input
                                            placeholder="Image URL"
                                            value={newEvent.image}
                                            onChange={(e) => setNewEvent({ ...newEvent, image: e.target.value })}
                                        />
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                            className="text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20"
                                        />
                                    </div>
                                </div>

                                {newEvent.image || selectedFile ? (
                                    <div className="flex justify-center">
                                        <div className="w-32 aspect-[4/5] bg-black rounded overflow-hidden border border-white/20 relative">
                                            {selectedFile ? (
                                                <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={newEvent.image} alt="Preview" className="w-full h-full object-cover" />
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] text-center text-white py-1">
                                                4:5 Preview
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center border border-dashed border-gray-700 rounded bg-white/5 text-gray-500 text-sm">
                                        Image Preview Area
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Link (Optional)</label>
                                <Input
                                    placeholder="https://..."
                                    value={newEvent.link}
                                    onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })}
                                />
                            </div>

                            {!editingId && (
                                <div className="flex items-center gap-2 p-3 bg-neon-pink/10 rounded-lg border border-neon-pink/20">
                                    <input
                                        type="checkbox"
                                        id="announce"
                                        checked={newEvent.alsoPostToAnnouncements}
                                        onChange={(e) => setNewEvent({ ...newEvent, alsoPostToAnnouncements: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-300 text-neon-pink focus:ring-neon-pink"
                                    />
                                    <label htmlFor="announce" className="text-gray-200 text-sm cursor-pointer select-none">
                                        Also post this to <strong>Announcements</strong>? (Great for important updates)
                                    </label>
                                </div>
                            )}

                            <div className="flex justify-end gap-4 pt-4">
                                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={uploading}>
                                    {uploading ? <Loader className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                    {editingId ? 'Update Event' : 'Save Event'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                {/* List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingEvents.map((item) => (
                        <Card key={item.id} className="group relative overflow-hidden border-white/10 hover:border-neon-blue/50 transition-colors">
                            <div className="aspect-[4/5] relative bg-gray-900">
                                {item.image ? (
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600">No Image</div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

                                <div className="absolute top-2 right-2 flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(item)} className="p-2.5 md:p-2 bg-black/60 md:bg-black/50 text-white rounded-full hover:bg-neon-blue hover:text-black transition-colors backdrop-blur-sm">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => deleteUpcomingEvent(item.id)} className="p-2.5 md:p-2 bg-black/60 md:bg-black/50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors backdrop-blur-sm">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    {item.date && <p className="text-neon-blue text-xs font-bold uppercase mb-1">{item.date}</p>}
                                    <h3 className="text-lg font-bold text-white leading-tight mb-1">{item.title || 'Untitled Event'}</h3>
                                    {item.description && <p className="text-gray-400 text-xs line-clamp-2">{item.description}</p>}
                                    {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:text-white mt-2 block truncate">{item.link}</a>}
                                </div>
                            </div>
                        </Card>
                    ))}

                    {upcomingEvents.length === 0 && !isAdding && (
                        <div className="col-span-full text-center py-16 text-gray-500">
                            <p className="text-lg">No upcoming events found.</p>
                            <Button variant="link" onClick={() => setIsAdding(true)} className="text-neon-blue">
                                Add your first event
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpcomingEventsManager;
