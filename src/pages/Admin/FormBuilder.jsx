import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
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
    const [isCommunityForm, setIsCommunityForm] = useState(false);
    const [fields, setFields] = useState([
        { id: Date.now(), type: 'text', label: 'Name', required: true }
    ]);

    useEffect(() => {
        if (id) {
            const form = forms.find(f => f.id === parseInt(id));
            if (form) {
                setTitle(form.title);
                setDescription(form.description);
                setFields(form.fields);
                setIsCommunityForm(form.isCommunityForm || false);
            }
        }
    }, [id, forms]);

    const handleAddField = () => {
        setFields([...fields, { id: Date.now(), type: 'text', label: 'New Field', required: false }]);
    };

    const handleRemoveField = (fieldId) => {
        setFields(fields.filter(f => f.id !== fieldId));
    };

    const handleFieldChange = (fieldId, key, value) => {
        setFields(fields.map(f => f.id === fieldId ? { ...f, [key]: value } : f));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = {
            id: id ? parseInt(id) : Date.now(),
            title,
            description,
            fields,
            isCommunityForm,
            submissions: id ? (forms.find(f => f.id === parseInt(id))?.submissions || []) : []
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
                    <h1 className="text-3xl font-bold text-white">{id ? 'Edit Form' : 'Create New Form'}</h1>
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

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isCommunity"
                                checked={isCommunityForm}
                                onChange={(e) => setIsCommunityForm(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-neon-blue focus:ring-neon-blue bg-black/50"
                            />
                            <label htmlFor="isCommunity" className="text-gray-300 text-sm">Use as Community Welcome Form (Redirects to WhatsApp after submit)</label>
                        </div>

                        <div className="border-t border-white/10 pt-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Form Fields</h3>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddField}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Field
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="bg-white/5 p-4 rounded-lg flex gap-4 items-start">
                                        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                                value={field.label}
                                                onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                                                placeholder="Field Label"
                                                required
                                            />
                                            <select
                                                className="bg-black/50 border border-white/10 rounded-lg p-2 text-white h-10"
                                                value={field.type}
                                                onChange={(e) => handleFieldChange(field.id, 'type', e.target.value)}
                                            >
                                                <option value="text">Text</option>
                                                <option value="email">Email</option>
                                                <option value="number">Number</option>
                                                <option value="textarea">Long Text</option>
                                                <option value="date">Date</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2 h-10">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) => handleFieldChange(field.id, 'required', e.target.checked)}
                                                className="w-4 h-4"
                                                title="Required"
                                            />
                                            <span className="text-xs text-gray-400">Req</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveField(field.id)}
                                            className="p-2 text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-8">
                            <Button type="submit" variant="primary">
                                <Save className="mr-2 h-4 w-4" />
                                Save Form
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default FormBuilder;
