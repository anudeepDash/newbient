import React from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Card } from '../components/ui/Card';

const FormViewer = ({ formIdOverride }) => {
    const { id } = useParams();
    const { forms } = useStore();
    const formId = formIdOverride || id;

    console.log('FormViewer Debug:', { id, formId, availableForms: forms });

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

                    <div className="w-full relative bg-white/5 rounded-lg overflow-hidden min-h-[400px] flex items-center justify-center">
                        {!form.formUrl ? (
                            <div className="p-8 text-center text-red-400">
                                Invalid or missing Google Form URL.
                            </div>
                        ) : form.requiresExternal ? (
                            <div className="text-center p-8">
                                <p className="text-gray-300 mb-6">This form requires Google Sign-in or File Uploads, so it must be opened in a new tab.</p>
                                <a
                                    href={form.formUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-black bg-neon-blue hover:bg-cyan-400 transition-colors"
                                >
                                    Open Form
                                </a>
                            </div>
                        ) : (
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
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default FormViewer;
