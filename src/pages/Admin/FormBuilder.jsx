import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, HelpCircle, ExternalLink, Smartphone, Monitor } from 'lucide-react'; // Added icons
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
    // Removed isCommunityForm
    const [requiresExternal, setRequiresExternal] = useState(false);
    const [showHelp, setShowHelp] = useState(false); // Toggle for help guide

    useEffect(() => {
        if (id) {
            // Fix: Do NOT parseToInt. IDs are strings in Firestore.
            const form = forms.find(f => f.id === id);
            if (form) {
                setTitle(form.title);
                setDescription(form.description);
                setFormUrl(form.formUrl || '');
                setRequiresExternal(form.requiresExternal || false);
            }
        }
    }, [id, forms]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Extract src if user pasted full iframe code
        let cleanUrl = formUrl;
        if (formUrl.includes('<iframe')) {
            const srcMatch = formUrl.match(/src="([^"]+)"/);
            if (srcMatch && srcMatch[1]) {
                cleanUrl = srcMatch[1];
            }
        }

        const formData = {
            title,
            description,
            formUrl: cleanUrl,
            requiresExternal,
            updatedAt: new Date().toISOString()
        };

        try {
            if (id) {
                await updateForm(id, formData);
            } else {
                await addForm({
                    ...formData,
                    createdAt: new Date().toISOString()
                });
            }
            navigate('/admin/forms');
        } catch (error) {
            console.error("Error saving form:", error);
            alert("Failed to save form. Please try again.");
        }
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto"> {/* Increased width for side-by-side preview */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <Link to="/admin/forms" className="text-gray-400 hover:text-white flex items-center transition-colors p-2 hover:bg-white/10 rounded-full w-fit">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <span className="font-bold uppercase text-[10px] tracking-widest">Back to Manager</span>
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">{id ? 'Edit Form Integration' : 'Add Google Form'}</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Left Column: Builder */}
                    <div className="h-full">
                        <Card className="p-6 md:p-8 h-full flex flex-col">
                            <form onSubmit={handleSubmit} className="space-y-6 flex-grow flex flex-col">
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

                                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-neon-blue">Google Form Embed URL</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowHelp(!showHelp)}
                                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 underline"
                                        >
                                            <HelpCircle className="h-3 w-3" />
                                            How to find this?
                                        </button>
                                    </div>

                                    {showHelp && (
                                        <div className="mb-4 text-xs text-gray-300 bg-black/60 p-3 rounded border border-white/10">
                                            <ol className="list-decimal pl-4 space-y-1">
                                                <li>Open your Google Form in edit mode.</li>
                                                <li>Click the <strong>Send</strong> button (top right).</li>
                                                <li>Click the <strong>&lt; &gt;</strong> (Embed HTML) tab.</li>
                                                <li>Copy the URL inside <code>src="..."</code> OR paste the whole iframe code below (we'll extract it).</li>
                                            </ol>
                                        </div>
                                    )}

                                    <Input
                                        value={formUrl}
                                        onChange={(e) => setFormUrl(e.target.value)}
                                        required
                                        placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true"
                                        className="font-mono text-xs"
                                    />
                                </div>

                                <div className="space-y-3 pt-2 flex-grow">
                                    <div className="flex items-start gap-3 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors bg-white/5">
                                        <input
                                            type="checkbox"
                                            id="requiresExternal"
                                            checked={requiresExternal}
                                            onChange={(e) => setRequiresExternal(e.target.checked)}
                                            className="mt-1 w-4 h-4 rounded border-gray-300 text-neon-blue focus:ring-neon-blue bg-black/50"
                                        />
                                        <div>
                                            <label htmlFor="requiresExternal" className="text-white text-sm font-medium cursor-pointer flex items-center gap-2">
                                                Open in New Tab
                                                <ExternalLink className="h-3 w-3 text-gray-500" />
                                            </label>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Required for forms with <strong>File Uploads</strong> or forced <strong>Google Sign-in</strong>.
                                                Trying to embed these will cause a "refused to connect" error.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 mt-auto">
                                    <Button type="submit" variant="primary" className="w-full sm:w-auto">
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Integration
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>

                    {/* Right Column: Preview */}
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between text-gray-400 text-sm uppercase tracking-wider font-bold mb-6">
                            <span className="flex items-center gap-2"><Monitor className="h-4 w-4" /> Live Preview</span>
                        </div>

                        <div className="w-full bg-white rounded-lg overflow-hidden shadow-2xl flex-grow flex flex-col min-h-[600px] border-4 border-gray-800 relative">
                            {/* Browser Mockup Header */}
                            <div className="bg-gray-100 border-b border-gray-300 p-2 flex items-center gap-2 shrink-0">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                                </div>
                                <div className="flex-1 bg-white rounded px-2 py-0.5 text-[10px] text-gray-400 text-center truncate">
                                    {formUrl || 'No URL provided'}
                                </div>
                            </div>

                            {/* Preview Content */}
                            <div className="w-full flex-grow bg-white relative">
                                {!formUrl ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                        <Smartphone className="h-12 w-12 mb-4 opacity-20" />
                                        <p>Enter a Google Form URL to see a preview here.</p>
                                    </div>
                                ) : requiresExternal ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-50">
                                        <ExternalLink className="h-12 w-12 mb-4 text-neon-blue" />
                                        <h3 className="text-black font-bold mb-2">External Link Mode</h3>
                                        <p className="text-gray-600 text-sm mb-4">
                                            This form utilizes file uploads or requires sign-in, so it will open in a new tab for users.
                                        </p>
                                        <a href="#" className="text-neon-blue underline text-sm">Test Link (Simulation)</a>
                                    </div>
                                ) : (
                                    <iframe
                                        src={formUrl}
                                        className="w-full h-full border-none"
                                        title="Form Preview"
                                    >Your browser doesn't support iframes</iframe>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormBuilder;
