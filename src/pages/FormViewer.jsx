import React from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Card } from '../components/ui/Card';

const FormViewer = ({ formIdOverride }) => {
    const { id } = useParams();
    const { forms } = useStore();
    const formId = formIdOverride || (id ? parseInt(id) : null);

    const form = forms.find(f => f.id === formId);

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

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <Card className="p-4 md:p-8">
                    <h1 className="text-3xl font-bold text-white mb-2">{form.title}</h1>
                    <p className="text-gray-400 mb-8">{form.description}</p>

                    <div className="w-full relative bg-white/5 rounded-lg overflow-hidden">
                        {form.formUrl ? (
                            <iframe
                                src={form.formUrl}
                                width="100%"
                                height="800"
                                frameBorder="0"
                                marginHeight="0"
                                marginWidth="0"
                                title={form.title}
                                className="w-full"
                            >
                                Loading…
                            </iframe>
                        ) : (
                            <div className="p-8 text-center text-red-400">
                                Invalid or missing Google Form URL.
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default FormViewer;
