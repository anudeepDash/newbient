import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Edit } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const ConcertManager = () => {
    const { concerts } = useStore(); // Assuming addConcert exists or we'd add it
    const [isAdding, setIsAdding] = useState(false);
    // Mock add function since it wasn't in the original store snippet, but we can simulate UI

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Link to="/admin" className="text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <h1 className="text-3xl font-bold text-white">Concert Manager</h1>
                    </div>
                    <Button variant="primary" onClick={() => setIsAdding(!isAdding)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Concert
                    </Button>
                </div>

                {isAdding && (
                    <Card className="p-6 mb-8 border-neon-green/30">
                        <h2 className="text-xl font-bold text-white mb-4">New Concert</h2>
                        <form className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input placeholder="Artist Name" required />
                                <Input placeholder="City" required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input type="date" required />
                                <Input placeholder="Venue" required />
                            </div>
                            <Input placeholder="Image URL" required />
                            <Input placeholder="Ticket Link" required />

                            <div className="flex justify-end gap-4">
                                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                                <Button type="submit" variant="primary">Save Concert</Button>
                            </div>
                        </form>
                    </Card>
                )}

                <div className="grid grid-cols-1 gap-4">
                    {concerts.map((concert) => (
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
                            <div className="flex gap-2">
                                <button className="p-2 text-gray-400 hover:text-white transition-colors">
                                    <Edit size={18} />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ConcertManager;
