import React from 'react';
import { Link } from 'react-router-dom';
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
    useStoreSubscription(['upcomingEvents', 'portfolio', 'portfolioCategories', 'posts', 'giveaways']);
    const { siteSettings } = useStore();

    return (
        <main className="bg-dark min-h-screen">
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
