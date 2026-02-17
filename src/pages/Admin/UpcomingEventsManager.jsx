import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, Save, Eye, EyeOff, Loader } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import { motion } from 'framer-motion';

const UpcomingEventsManager = () => {
    const { upcomingEvents, addUpcomingEvent, updateUpcomingEvent, deleteUpcomingEvent, updateUpcomingEventOrder, siteSettings, toggleUpcomingSectionVisibility, portfolioCategories } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const [newEvent, setNewEvent] = useState({
        title: '',
        date: '',
        category: '',
        description: '',
        buttonText: '', // New field
        image: '',
        link: '',
        isTicketed: false,
        ticketPrice: '', // Keep as "Starting Price" display
        ticketCategories: [], // Array of { id, name, price, description }
        venueLayout: '',
        alsoPostToAnnouncements: false
    });
    const [venueLayoutFile, setVenueLayoutFile] = useState(null);

    const resetForm = () => {
        setNewEvent({
            title: '',
            date: '',
            category: '',
            description: '',
            buttonText: '', // New field
            image: '',
            link: '',
            isTicketed: false,
            ticketPrice: '',
            ticketCategories: [],
            venueLayout: '',
            alsoPostToAnnouncements: false
        });
        setIsAdding(false);
        setEditingId(null);
        setSelectedFile(null);
        setVenueLayoutFile(null);
        setUploading(false);
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setIsAdding(true);
        setNewEvent({ ...item, alsoPostToAnnouncements: false }); // Don't carry over "post to announcements" logic for edits usually, or handled differently
    };

    const moveItem = async (index, direction) => {
        const newItems = [...upcomingEvents];
        if (direction === 'up' && index > 0) {
            [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
        } else if (direction === 'down' && index < newItems.length - 1) {
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        } else {
            return;
        }
        await updateUpcomingEventOrder(newItems);
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
            // 1. Handle Main Image Upload
            let imageUrl = newEvent.image;
            if (selectedFile) {
                imageUrl = await handleFileUpload(selectedFile);
            }

            // 2. Handle Venue Layout Upload
            let venueLayoutUrl = newEvent.venueLayout;
            if (venueLayoutFile) {
                venueLayoutUrl = await handleFileUpload(venueLayoutFile);
            }

            // 3. Process Ticket Categories
            const ticketCategories = newEvent.ticketCategories.map(c => ({
                id: c.id || crypto.randomUUID(),
                name: c.name,
                price: Number(c.price) || 0,
                description: c.description || ''
            }));

            // 4. Calculate Display Price
            let ticketPrice = Number(newEvent.ticketPrice) || 0;
            if (ticketCategories.length > 0) {
                const minPrice = Math.min(...ticketCategories.map(c => c.price));
                ticketPrice = minPrice;
            }

            // 5. Construct Payload
            const eventData = {
                title: newEvent.title,
                date: newEvent.date,
                category: newEvent.category,
                description: newEvent.description,
                buttonText: newEvent.buttonText,
                image: imageUrl,
                link: newEvent.link,
                isTicketed: newEvent.isTicketed,
                venueLayout: venueLayoutUrl,
                ticketCategories: ticketCategories,
                ticketPrice: ticketPrice
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
            <div className={`mx-auto ${isAdding ? 'max-w-7xl' : 'max-w-6xl'}`}>
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

                    {!isAdding && (
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

                            <Button variant="primary" onClick={() => { setIsAdding(true); setEditingId(null); }} className="w-full sm:w-auto">
                                <Plus className="mr-2 h-4 w-4" />
                                Add New Event
                            </Button>
                        </div>
                    )}
                </div>

                {/* Add/Edit Form & Preview Split View */}
                {isAdding ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start h-[calc(100vh-150px)] min-h-[700px]">
                        {/* Editor Column */}
                        <Card className="p-6 h-full flex flex-col border-neon-blue/30 overflow-y-auto">
                            <h2 className="text-xl font-bold text-white mb-4 flex-shrink-0">{editingId ? 'Edit Event' : 'Add New Event'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4 flex-grow flex flex-col">
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
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Event Date</label>
                                        <Input
                                            type="datetime-local"
                                            value={newEvent.date}
                                            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-gray-400">Description (On Hover)</label>
                                        <span className={`text-[10px] ${newEvent.description.length > 110 ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                                            {newEvent.description.length}/120
                                        </span>
                                    </div>
                                    <textarea
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue h-24 resize-none"
                                        placeholder="Add more details about the event... (e.g. entry requirements, special artists)"
                                        value={newEvent.description}
                                        maxLength={120}
                                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">This text appears when visitors hover over the card. Manual line breaks are preserved.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">View Event Button Text (Optional)</label>
                                    <Input
                                        placeholder="e.g. View Portfolio, Book Now"
                                        value={newEvent.buttonText}
                                        onChange={(e) => setNewEvent({ ...newEvent, buttonText: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Defaults to "view event" if empty.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Category (For Auto-Archiving)</label>
                                    <select
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue"
                                        value={newEvent.category}
                                        onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
                                    >
                                        <option value="">Select a Category...</option>
                                        {portfolioCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-500 mt-1">Choosing a category ensures the event is correctly filed in Past Events after it expires.</p>
                                </div>

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

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Link (Optional)</label>
                                    <Input
                                        placeholder="https://..."
                                        value={newEvent.link}
                                        onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })}
                                    />
                                </div>

                                {/* Ticketing Options */}
                                <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-12 h-6 rounded-full relative transition-colors ${newEvent.isTicketed ? 'bg-neon-green' : 'bg-gray-700'}`}>
                                            <input
                                                type="checkbox"
                                                checked={newEvent.isTicketed}
                                                onChange={(e) => setNewEvent({ ...newEvent, isTicketed: e.target.checked })}
                                                className="hidden"
                                            />
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${newEvent.isTicketed ? 'left-7' : 'left-1'}`} />
                                        </div>
                                        <span className="text-sm font-bold text-white">Enable Ticketing</span>
                                    </label>

                                    {newEvent.isTicketed && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="space-y-4 pt-2"
                                        >
                                            {/* Venue Layout */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-1">Venue Layout (Optional)</label>
                                                <div className="space-y-2">
                                                    <Input
                                                        placeholder="Layout Image URL"
                                                        value={newEvent.venueLayout}
                                                        onChange={(e) => setNewEvent({ ...newEvent, venueLayout: e.target.value })}
                                                    />
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => setVenueLayoutFile(e.target.files[0])}
                                                        className="text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20"
                                                    />
                                                </div>
                                            </div>

                                            {/* Categories */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="block text-sm font-medium text-gray-400">Ticket Categories</label>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => setNewEvent({
                                                            ...newEvent,
                                                            ticketCategories: [...newEvent.ticketCategories, { id: crypto.randomUUID(), name: '', price: '', description: '' }]
                                                        })}
                                                        className="text-xs py-1 h-auto"
                                                    >
                                                        + Add Category
                                                    </Button>
                                                </div>

                                                <div className="space-y-3">
                                                    {(newEvent.ticketCategories || []).map((cat, idx) => (
                                                        <div key={cat.id || idx} className="grid grid-cols-12 gap-2 items-start bg-black/30 p-2 rounded border border-white/5">
                                                            <div className="col-span-5">
                                                                <Input
                                                                    placeholder="Name (e.g. VIP)"
                                                                    value={cat.name}
                                                                    onChange={(e) => {
                                                                        const newCats = [...newEvent.ticketCategories];
                                                                        newCats[idx].name = e.target.value;
                                                                        setNewEvent({ ...newEvent, ticketCategories: newCats });
                                                                    }}
                                                                    className="h-8 text-xs"
                                                                />
                                                            </div>
                                                            <div className="col-span-3">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Price"
                                                                    value={cat.price}
                                                                    onChange={(e) => {
                                                                        const newCats = [...newEvent.ticketCategories];
                                                                        newCats[idx].price = e.target.value;
                                                                        setNewEvent({ ...newEvent, ticketCategories: newCats });
                                                                    }}
                                                                    className="h-8 text-xs"
                                                                />
                                                            </div>
                                                            <div className="col-span-3">
                                                                <Input
                                                                    placeholder="Desc/Qty"
                                                                    value={cat.description}
                                                                    onChange={(e) => {
                                                                        const newCats = [...newEvent.ticketCategories];
                                                                        newCats[idx].description = e.target.value;
                                                                        setNewEvent({ ...newEvent, ticketCategories: newCats });
                                                                    }}
                                                                    className="h-8 text-xs"
                                                                />
                                                            </div>
                                                            <div className="col-span-1 flex justify-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newCats = newEvent.ticketCategories.filter((_, i) => i !== idx);
                                                                        setNewEvent({ ...newEvent, ticketCategories: newCats });
                                                                    }}
                                                                    className="text-red-500 hover:text-red-400 p-1"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {newEvent.ticketCategories.length === 0 && (
                                                        <p className="text-xs text-center text-gray-500 italic py-2">No categories. Uses base price.</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="border-t border-white/10 pt-2 mt-2">
                                                <label className="block text-sm font-medium text-gray-400 mb-1">Base Price (Display/Fallback)</label>
                                                <Input
                                                    type="number"
                                                    placeholder="499"
                                                    value={newEvent.ticketPrice}
                                                    onChange={(e) => setNewEvent({ ...newEvent, ticketPrice: e.target.value })}
                                                    className="border-neon-green/30 focus:border-neon-green"
                                                    readOnly={newEvent.ticketCategories.length > 0}
                                                />
                                                {newEvent.ticketCategories.length > 0 && <p className="text-[10px] text-gray-500">Auto-calculated from minimum category price.</p>}
                                            </div>
                                        </motion.div>
                                    )}
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

                                <div className="flex justify-end gap-4 pt-4 mt-auto border-t border-white/10">
                                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                                    <Button type="submit" variant="primary" disabled={uploading}>
                                        {uploading ? <Loader className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                        {editingId ? 'Update Event' : 'Save Event'}
                                    </Button>
                                </div>
                            </form>
                        </Card>

                        {/* Preview Column */}
                        <LivePreview
                            type="event"
                            data={{
                                ...newEvent,
                                image: selectedFile ? URL.createObjectURL(selectedFile) : newEvent.image
                            }}
                        />
                    </div>
                ) : (
                    /* List View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(upcomingEvents || []).map((item, index) => (
                            <Card key={item.id} className="p-4 flex items-center gap-4 hover:border-white/20 transition-colors">
                                {/* Reordering Controls */}
                                <div className="flex flex-col gap-1 mr-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }}
                                        disabled={index === 0}
                                        className={`p-1 hover:text-neon-blue transition-colors ${index === 0 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400'}`}
                                        title="Move Up"
                                    >
                                        ▲
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }}
                                        disabled={index === upcomingEvents.length - 1}
                                        className={`p-1 hover:text-neon-blue transition-colors ${index === upcomingEvents.length - 1 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400'}`}
                                        title="Move Down"
                                    >
                                        ▼
                                    </button>
                                </div>

                                {/* Image Thumbnail */}
                                <div className="w-16 h-16 rounded bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                    {item.image ? (
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[10px] text-gray-500 text-center px-1">No Img</span>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-grow min-w-0">
                                    <div className="flex flex-wrap items-baseline gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-white truncate">{item.title || 'Untitled Event'}</h3>
                                        {item.date && (
                                            <span className="text-neon-blue text-xs font-bold uppercase border border-neon-blue/30 px-2 py-0.5 rounded">
                                                {item.date}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-400 text-sm truncate">{item.description}</p>
                                    {item.link && (
                                        <a href={item.link} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-white truncate block mt-1">
                                            {item.link}
                                        </a>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="p-2 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-lg hover:bg-white/10"
                                        title="Edit"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => deleteUpcomingEvent(item.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-white/5 rounded-lg hover:bg-red-500/20"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </Card>
                        ))}

                        {upcomingEvents.length === 0 && !isAdding && (
                            <div className="col-span-full text-center py-16 text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-lg">No upcoming events at the moment.</p>
                                <p className="text-sm text-gray-600 mt-2">Any expired events have been moved to the portfolio.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UpcomingEventsManager;
