import React from 'react';
import { useStore } from '../lib/store';
import FormViewer from './FormViewer';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

const CommunityJoin = () => {
    const { forms, siteDetails } = useStore();
    // Find the first form marked as community form
    const communityForm = forms.find(f => f.isCommunityForm);

    if (!communityForm) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-white p-4 text-center">
                <h1 className="text-4xl font-bold mb-4 text-neon-green">Join The Community</h1>
                <p className="text-gray-400 max-w-md mb-8">
                    We are currently updating our onboarding process. Please check back later or contact us directly.
                </p>
                <Link to="/contact" className="text-neon-blue hover:underline">Contact Us</Link>
            </div>
        );
    }

    return (
        <div className="pt-20 pb-20">
            <div className="text-center py-8 px-4">
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue mb-4">
                    Welcome to the Tribe
                </h1>
                <p className="text-gray-400">Fill out the form below to get started.</p>
            </div>

            <FormViewer formIdOverride={communityForm.id} />

            <div className="max-w-4xl mx-auto px-4 mt-12 text-center">
                <h3 className="text-2xl font-bold text-white mb-4">All Set?</h3>
                <p className="text-gray-400 mb-6">After submitting the form above, join our exclusive WhatsApp Community to stay updated!</p>

                {siteDetails.whatsapp && (
                    <a href={siteDetails.whatsapp} target="_blank" rel="noopener noreferrer">
                        <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white border-none text-lg px-8 py-4 h-auto shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:shadow-[0_0_30px_rgba(37,211,102,0.6)]">
                            Join WhatsApp Community
                        </Button>
                    </a>
                )}
            </div>
        </div>
    );
};

export default CommunityJoin;
