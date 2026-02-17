import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Users } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const SiteContentManager = () => {
    const { siteDetails, updateSiteDetails, siteSettings, updateGeneralSettings } = useStore();
    const navigate = useNavigate();

    // Local state for form
    const [formData, setFormData] = useState({ ...siteDetails });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        updateSiteDetails(formData);
        alert('Site details updated successfully!');
        navigate('/admin');
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Link to="/admin" className="text-gray-400 hover:text-white flex items-center transition-colors text-sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Site Content</h1>
                </div>

                <Card className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Feature Toggles */}
                        <div className="p-6 border border-neon-blue/20 rounded-xl bg-neon-blue/5 mb-8">
                            <h3 className="text-lg font-bold text-neon-blue mb-4 flex items-center gap-2">
                                <span className="p-1 bg-neon-blue/20 rounded-lg"><Users size={16} /></span>
                                Community Settings
                            </h3>

                            <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-white/5">
                                <div>
                                    <h4 className="text-white font-bold text-sm">Enable Tribe Form (Step 1)</h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                        If disabled, users will skip the Google Form and go directly to Step 2 (WhatsApp).
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={siteSettings.enableTribeForm !== false} // Default to true
                                        onChange={(e) => {
                                            const newValue = e.target.checked;
                                            // Optimistic update locally not needed as we pull from store, but for fast feedback:
                                            updateGeneralSettings({ enableTribeForm: newValue });
                                        }}
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neon-blue/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-blue"></div>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 p-4 border border-white/10 rounded-lg bg-white/5">
                                <label className="block text-sm font-bold text-neon-green mb-2">Community Page: WhatsApp Group Link</label>
                                <Input
                                    name="whatsappCommunity"
                                    value={formData.whatsappCommunity || ''}
                                    onChange={handleChange}
                                    placeholder="https://chat.whatsapp.com/..."
                                />
                                <p className="text-xs text-gray-500 mt-1">This link is used in Step 2 of the 'Community Join' page.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Contact Phone (WhatsApp)</label>
                                <Input
                                    name="phone"
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+91..."
                                />
                                <p className="text-xs text-gray-500 mt-1">General contact number.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                                <Input
                                    name="email"
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Instagram URL</label>
                                <Input
                                    name="instagram"
                                    value={formData.instagram || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">LinkedIn URL</label>
                                <Input
                                    name="linkedin"
                                    value={formData.linkedin || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Physical Address</label>
                                <Input
                                    name="address"
                                    value={formData.address || ''}
                                    onChange={handleChange}
                                    placeholder="e.g. 123 Music Lane, Creative City"
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <Button type="submit" variant="primary" className="w-full md:w-auto">
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default SiteContentManager;
