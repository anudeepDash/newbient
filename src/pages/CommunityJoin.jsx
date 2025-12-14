import React from 'react';
import { useStore } from '../lib/store';
import FormViewer from './FormViewer';
import { Link } from 'react-router-dom';

const CommunityJoin = () => {
    const { forms } = useStore();
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
        <div className="pt-20"> {/* Add padding for navbar */}
            <div className="text-center py-8 px-4">
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue mb-4">
                    Welcome to the Tribe
                </h1>
                <p className="text-gray-400">Fill out the form below to get started and join our exclusive community.</p>
            </div>
            <FormViewer formIdOverride={communityForm.id} />
        </div>
    );
};

export default CommunityJoin;
