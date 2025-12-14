import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const FormBuilder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { forms, addForm, updateForm } = useStore();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [formUrl, setFormUrl] = useState('');
    const [isCommunityForm, setIsCommunityForm] = useState(false);
    const [requiresExternal, setRequiresExternal] = useState(false);

    useEffect(() => {
        if (id) {
            const form = forms.find(f => f.id === parseInt(id));
            if (form) {
                setTitle(form.title);
                setDescription(form.description);
                setFormUrl(form.formUrl || '');
                setIsCommunityForm(form.isCommunityForm || false);
                setRequiresExternal(form.requiresExternal || false);
            }
        }
    }, [id, forms]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = {
            id: id ? parseInt(id) : Date.now(),
            title,
            description,
            formUrl,
            isCommunityForm,
            requiresExternal
        };

        if (id) {
            updateForm(parseInt(id), formData);
        } else {
            addForm(formData);
        }
        navigate('/admin/forms');
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <Link to="/admin/forms" className="text-gray-400 hover:text-white flex items-center transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Manager
                    </Link>
                    <h1 className="text-3xl font-bold text-white">{id ? 'Edit Google Form Integration' : 'Add New Google Form'}</h1>
                </div>

                <Card className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Form Title</label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="e.g. Volunteer Sign Up"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                            <textarea
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue transition-all h-24"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the purpose of this form..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Google Form Embed URL</label>
                            <Input
                                value={formUrl}
                                onChange={(e) => setFormUrl(e.target.value)}
                                required
                                placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Go to your Google Form -&gt; Send -&gt; Embed HTML (&lt;&gt;) -&gt; Copy only the <code>src</code> URL.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isCommunity"
                                checked={isCommunityForm}
                                onChange={(e) => setIsCommunityForm(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-neon-blue focus:ring-neon-blue bg-black/50"
                            />
                            <label htmlFor="isCommunity" className="text-gray-300 text-sm">Use as Community Welcome Form</label>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="requiresExternal"
                                checked={requiresExternal}
                                onChange={(e) => setRequiresExternal(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-neon-blue focus:ring-neon-blue bg-black/50"
                            />
                            <label htmlFor="requiresExternal" className="text-gray-300 text-sm">Form requires File Upload / Google Sign-in (Opens in new tab)</label>
                        </div>

                        <div className="flex justify-end pt-8">
                            <Button type="submit" variant="primary">
                                <Save className="mr-2 h-4 w-4" />
                                Save Integration
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default FormBuilder;
