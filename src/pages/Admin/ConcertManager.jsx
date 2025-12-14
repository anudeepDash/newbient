import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Edit } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const ConcertManager = () => {
    const { concerts, addConcert, updateConcert, deleteConcert, portfolio, addPortfolioItem, updatePortfolioItem, deletePortfolioItem } = useStore();
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // State for Concert (Upcoming)
    const [newConcert, setNewConcert] = useState({
        artist: '', city: '', date: '', venue: '', image: '', ticketLink: ''
    });

    // State for Portfolio (Past)
    const [newPortfolio, setNewPortfolio] = useState({
        title: '', category: 'music', image: ''
    });

    const resetForms = () => {
        setNewConcert({ artist: '', city: '', date: '', venue: '', image: '', ticketLink: '' });
        setNewPortfolio({ title: '', category: 'music', image: '' });
        setIsAdding(false);
        setEditingId(null);
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setIsAdding(true);
        if (activeTab === 'upcoming') {
            setNewConcert({ ...item });
        } else {
            setNewPortfolio({ ...item });
        }
    };

    const handleSaveConcert = (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                updateConcert(editingId, newConcert);
                alert("Concert updated!");
            } else {
                addConcert({ id: Date.now(), ...newConcert });
                alert("Concert added!");
            }
            resetForms();
        } catch (err) {
            alert("Error saving concert");
        }
    };

    const handleSavePortfolio = (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                updatePortfolioItem(editingId, newPortfolio);
                alert("Event updated!");
            } else {
                addPortfolioItem({ id: `p-${Date.now()}`, ...newPortfolio });
                alert("Event added!");
            }
            resetForms();
        } catch (err) {
            alert("Error saving event");
        }
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/admin" className="text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <h1 className="text-3xl font-bold text-white">Events Manager</h1>
                    </div>

                    <div className="flex bg-white/5 rounded-lg p-1">
                        <button
                            onClick={() => { setActiveTab('upcoming'); resetForms(); }}
                            className={`px-4 py-2 rounded-md transition-all ${activeTab === 'upcoming' ? 'bg-neon-green text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                            Upcoming Concerts
                        </button>
                        <button
                            onClick={() => { setActiveTab('past'); resetForms(); }}
                            className={`px-4 py-2 rounded-md transition-all ${activeTab === 'past' ? 'bg-neon-green text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                            Past Events / Portfolio
                        </button>
                    </div>

                    <Button variant="primary" onClick={() => { setIsAdding(!isAdding); setEditingId(null); setNewConcert({ artist: '', city: '', date: '', venue: '', image: '', ticketLink: '' }); setNewPortfolio({ title: '', category: 'music', image: '' }); }}>
                        <Plus className="mr-2 h-4 w-4" />
                        {isAdding && !editingId ? 'Cancel' : `Add ${activeTab === 'upcoming' ? 'Concert' : 'Past Event'}`}
                    </Button>
                </div>

                {isAdding && (
                    <Card className="p-6 mb-8 border-neon-green/30">
                        <h2 className="text-xl font-bold text-white mb-4">{editingId ? 'Edit' : 'Add'} {activeTab === 'upcoming' ? 'Concert' : 'Past Event'}</h2>

                        {activeTab === 'upcoming' ? (
                            <form onSubmit={handleSaveConcert} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input placeholder="Artist Name" value={newConcert.artist} onChange={e => setNewConcert({ ...newConcert, artist: e.target.value })} required />
                                    <Input placeholder="City" value={newConcert.city} onChange={e => setNewConcert({ ...newConcert, city: e.target.value })} required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input type="date" value={newConcert.date} onChange={e => setNewConcert({ ...newConcert, date: e.target.value })} required />
                                    <Input placeholder="Venue" value={newConcert.venue} onChange={e => setNewConcert({ ...newConcert, venue: e.target.value })} required />
                                </div>
                                <Input placeholder="Image URL" value={newConcert.image} onChange={e => setNewConcert({ ...newConcert, image: e.target.value })} required />
                                <Input placeholder="Ticket Link" value={newConcert.ticketLink} onChange={e => setNewConcert({ ...newConcert, ticketLink: e.target.value })} required />
                                <div className="flex justify-end gap-4 pt-4">
                                    <Button type="button" variant="outline" onClick={resetForms}>Cancel</Button>
                                    <Button type="submit" variant="primary">{editingId ? 'Update' : 'Save'} Concert</Button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleSavePortfolio} className="space-y-4">
                                <Input placeholder="Event Title / Artist Name" value={newPortfolio.title} onChange={e => setNewPortfolio({ ...newPortfolio, title: e.target.value })} required />

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                                    <select
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green"
                                        value={newPortfolio.category}
                                        onChange={e => setNewPortfolio({ ...newPortfolio, category: e.target.value })}
                                    >
                                        <option value="music">Music Concerts</option>
                                        <option value="fests">Fests & IPs</option>
                                        <option value="comedy">Stand-Up Shows</option>
                                    </select>
                                </div>

                                <Input placeholder="Hover Image URL (Optional)" value={newPortfolio.image} onChange={e => setNewPortfolio({ ...newPortfolio, image: e.target.value })} />
                                <p className="text-xs text-gray-500">Image appears when user hovers over the card.</p>

                                <div className="flex justify-end gap-4 pt-4">
                                    <Button type="button" variant="outline" onClick={resetForms}>Cancel</Button>
                                    <Button type="submit" variant="primary">{editingId ? 'Update' : 'Save'} Past Event</Button>
                                </div>
                            </form>
                        )}
                    </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeTab === 'upcoming' ? (
                        concerts.map((concert) => (
                            <Card key={concert.id} className="p-4 flex items-center gap-4 hover:border-white/20 transition-colors">
                                <img
                                    src={concert.image}
                                    alt={concert.artist}
                                    className="w-16 h-16 rounded object-cover"
                                />
                                <div className="flex-grow">
                                    <h3 className="text-lg font-bold text-white">{concert.artist}</h3>
                                    <p className="text-gray-400 text-sm">{concert.date} • {concert.city}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => handleEdit(concert)} className="p-2 text-gray-400 hover:text-white transition-colors">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => deleteConcert(concert.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </Card>
                        ))
                    ) : (
                        portfolio.map((item) => (
                            <Card key={item.id} className="p-4 flex items-center gap-4 hover:border-white/20 transition-colors">
                                <div className="w-16 h-16 rounded bg-white/5 flex items-center justify-center overflow-hidden">
                                    {item.image ? (
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs text-gray-500">No Img</span>
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <h3 className="text-lg font-bold text-white">{item.title}</h3>
                                    <p className="text-gray-400 text-sm capitalize">{item.category}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-white transition-colors">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => deletePortfolioItem(item.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </Card>
                        ))
                    )}

                    {((activeTab === 'upcoming' && concerts.length === 0) || (activeTab === 'past' && portfolio.length === 0)) && (
                        <div className="col-span-full text-center text-gray-500 py-12">
                            No items found. Click "Add" to create one.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConcertManager;
