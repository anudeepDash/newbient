import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Share2, Bell, ArrowLeft, Eye } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import VolunteerGigManager from './VolunteerGigManager';

const FormManager = () => {
    const { forms, deleteForm, addAnnouncement } = useStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('forms'); // 'forms' | 'gigs'

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this form?')) {
            deleteForm(id);
        }
    };

    const handlePushNotification = (form) => {
        const announcement = {
            id: Date.now(),
            title: `New Form: ${form.title}`,
            date: new Date().toISOString().split('T')[0],
            content: form.description || "Check out this new form!",
            isPinned: false,
            image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop"
        };
        addAnnouncement(announcement);
        alert('Form pushed to announcements!');
    };

    const handleShareWhatsApp = (form) => {
        const link = `${window.location.origin}/forms/${form.id}`;
        const text = `Check out this form: ${form.title} - ${link}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/admin" className="text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <h1 className="text-3xl font-bold text-white">Community & Forms</h1>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
                    <button
                        onClick={() => setActiveTab('forms')}
                        className={`text-lg font-bold pb-2 border-b-2 transition-colors ${activeTab === 'forms' ? 'text-neon-green border-neon-green' : 'text-gray-400 border-transparent hover:text-white'}`}
                    >
                        Forms & Surveys
                    </button>
                    <button
                        onClick={() => setActiveTab('gigs')}
                        className={`text-lg font-bold pb-2 border-b-2 transition-colors ${activeTab === 'gigs' ? 'text-neon-blue border-neon-blue' : 'text-gray-400 border-transparent hover:text-white'}`}
                    >
                        Volunteer Gigs
                    </button>
                </div>

                {activeTab === 'forms' ? (
                    <>
                        <div className="flex justify-end mb-6">
                            <Link to="/admin/forms/create">
                                <Button variant="primary">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Google Form
                                </Button>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {forms.map((form) => (
                                <Card key={form.id} className="p-6 hover:bg-white/5 transition-colors">
                                    <h3 className="text-xl font-bold text-white mb-2">{form.title}</h3>
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{form.description}</p>

                                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                                        <Link to={`/admin/forms/edit/${form.id}`}>
                                            <Button size="sm" variant="outline">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Button size="sm" variant="outline" onClick={() => handlePushNotification(form)} title="Push to Notifications">
                                            <Bell className="h-4 w-4 text-yellow-400" />
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleShareWhatsApp(form)} title="Share on WhatsApp">
                                            <Share2 className="h-4 w-4 text-green-400" />
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(form.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <Link to={`/forms/${form.id}`} target="_blank">
                                            <Button size="sm" variant="secondary" title="View Public Form">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>
                            ))}

                            {forms.length === 0 && (
                                <div className="col-span-full text-center py-12 text-gray-500">
                                    No forms created yet. Click "Add Google Form" to get started.
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <VolunteerGigManager />
                )}
            </div>
        </div>
    );
};

export default FormManager;
