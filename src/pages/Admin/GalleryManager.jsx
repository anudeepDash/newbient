import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const GalleryManager = () => {
    const { galleryImages, addGalleryImage, removeGalleryImage } = useStore();
    const navigate = useNavigate();

    const [newImage, setNewImage] = useState({
        type: 'image',
        src: '',
        title: '',
        category: 'Event'
    });

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newImage.src) return;
        addGalleryImage(newImage);
        setNewImage({ type: 'image', src: '', title: '', category: 'Event' });
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <Link to="/admin" className="text-gray-400 hover:text-white flex items-center transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-white">Gallery Manager</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add New Image Form */}
                    <div className="lg:col-span-1">
                        <Card className="p-6 sticky top-24">
                            <h2 className="text-xl font-bold text-white mb-4">Add New Media</h2>
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Image URL</label>
                                    <Input
                                        value={newImage.src}
                                        onChange={(e) => setNewImage({ ...newImage, src: e.target.value })}
                                        placeholder="https://..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                                    <Input
                                        value={newImage.title}
                                        onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
                                        placeholder="Event Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                                    <Input
                                        value={newImage.category}
                                        onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
                                        placeholder="e.g. Concert, BTS"
                                    />
                                </div>
                                <Button type="submit" variant="primary" className="w-full">
                                    <Plus className="mr-2 h-4 w-4" /> Add to Gallery
                                </Button>
                            </form>
                        </Card>
                    </div>

                    {/* Gallery Grid */}
                    <div className="lg:col-span-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {galleryImages.map((item, index) => (
                                <div key={index} className="group relative aspect-video bg-black/50 rounded-lg overflow-hidden border border-white/10">
                                    <img src={item.src} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end">
                                        <h3 className="text-white font-medium truncate">{item.title || 'Untitled'}</h3>
                                        <p className="text-xs text-gray-400">{item.category}</p>
                                    </div>
                                    <button
                                        onClick={() => removeGalleryImage(index)}
                                        className="absolute top-2 right-2 p-2 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GalleryManager;
