import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CheckCircle } from 'lucide-react';

const FormViewer = ({ formIdOverride }) => {
    const { id } = useParams();
    const { forms, addSubmission, siteDetails } = useStore();
    const formId = formIdOverride || (id ? parseInt(id) : null);

    const form = forms.find(f => f.id === formId);

    const [formData, setFormData] = useState({});
    const [submitted, setSubmitted] = useState(false);

    if (!form) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Form Not Found</h2>
                    <p className="text-gray-400">The form you are looking for does not exist or has been removed.</p>
                </div>
            </div>
        );
    }

    const handleChange = (label, value) => {
        setFormData({ ...formData, [label]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        addSubmission(form.id, formData);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="min-h-screen py-12 px-4 flex items-center justify-center">
                <Card className="p-8 max-w-md w-full text-center border-neon-green/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-neon-green/5 animate-pulse rounded-2xl" />
                    <div className="relative z-10">
                        <div className="mx-auto w-16 h-16 bg-neon-green/20 rounded-full flex items-center justify-center mb-6 text-neon-green">
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
                        <p className="text-gray-400 mb-8">Your submission has been received.</p>

                        {form.isCommunityForm && siteDetails.whatsapp && (
                            <div className="animate-fade-in-up">
                                <p className="text-white mb-4">One last step! Join our community.</p>
                                <a href={siteDetails.whatsapp} target="_blank" rel="noopener noreferrer">
                                    <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white border-none">
                                        Join WhatsApp Community
                                    </Button>
                                </a>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <Card className="p-8">
                    <h1 className="text-3xl font-bold text-white mb-2">{form.title}</h1>
                    <p className="text-gray-400 mb-8">{form.description}</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {form.fields.map((field) => (
                            <div key={field.id}>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    {field.label} {field.required && <span className="text-neon-pink">*</span>}
                                </label>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all h-24"
                                        required={field.required}
                                        onChange={(e) => handleChange(field.label, e.target.value)}
                                    />
                                ) : (
                                    <Input
                                        type={field.type}
                                        required={field.required}
                                        onChange={(e) => handleChange(field.label, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}

                        <Button type="submit" variant="primary" className="w-full">
                            Submit
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default FormViewer;
