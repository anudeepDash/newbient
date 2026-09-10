import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import Hero from '../components/home/Hero';
import About from '../components/home/About';
import Services from '../components/home/Services';
import CreatorsSection from '../components/home/CreatorsSection';
import Portfolio from '../components/home/Portfolio';
import PastClients from '../components/home/PastClients';
import WhyChooseUs from '../components/home/WhyChooseUs';
import CallToAction from '../components/home/CallToAction';
import UpcomingEvents from '../components/home/UpcomingEvents';
import FeaturedBlog from '../components/home/FeaturedBlog';
import MaintenanceGuard from '../components/MaintenanceGuard';

const Home = () => {
    useStoreSubscription(['upcomingEvents', 'portfolio', 'portfolioCategories', 'posts', 'giveaways', 'forms', 'volunteerGigs']);
    const { siteSettings } = useStore();
    const navigate = useNavigate();

    // Query Parameter Routing for Shared Links landing on root "/"
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const formId = params.get('form');
        const gigId = params.get('gig');
        const glId = params.get('gl');
        const campaignId = params.get('campaign');

        if (formId) {
            navigate(`/forms/${formId}`, { replace: true });
        } else if (gigId) {
            navigate(`/community?gig=${gigId}`, { replace: true });
        } else if (glId) {
            navigate(`/community?gl=${glId}`, { replace: true });
        } else if (campaignId) {
            navigate(`/community?campaign=${campaignId}`, { replace: true });
        }
    }, [navigate]);

    return (
        <main className="bg-gray-50 dark:bg-dark min-h-screen transition-colors duration-300">
            <Hero />

            <MaintenanceGuard isSection featureId="home_why">
                <WhyChooseUs />
            </MaintenanceGuard>
            <MaintenanceGuard isSection featureId="home_about">
                <About />
            </MaintenanceGuard>
            <Services />
            <MaintenanceGuard isSection featureId="home_creators">
                <CreatorsSection />
            </MaintenanceGuard>
            <MaintenanceGuard isSection featureId="home_upcoming">
                <UpcomingEvents />
            </MaintenanceGuard>
            <MaintenanceGuard isSection featureId="home_portfolio">
                <Portfolio />
            </MaintenanceGuard>
            <MaintenanceGuard isSection featureId="blog_featured">
                <FeaturedBlog />
            </MaintenanceGuard>
            {siteSettings?.showPastClients !== false && (
                <MaintenanceGuard isSection featureId="home_clients">
                    <PastClients />
                </MaintenanceGuard>
            )}
            <CallToAction />
        </main>
    );
};

export default Home;
