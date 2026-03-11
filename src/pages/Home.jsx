import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import Hero from '../components/home/Hero';
import About from '../components/home/About';
import Services from '../components/home/Services';
import Portfolio from '../components/home/Portfolio';
import PastClients from '../components/home/PastClients';
import WhyChooseUs from '../components/home/WhyChooseUs';
import CallToAction from '../components/home/CallToAction';

import UpcomingEvents from '../components/home/UpcomingEvents';

import MaintenanceGuard from '../components/MaintenanceGuard';

const Home = () => {
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
            <MaintenanceGuard isSection featureId="home_upcoming">
                <UpcomingEvents />
            </MaintenanceGuard>
            <MaintenanceGuard isSection featureId="home_portfolio">
                <Portfolio />
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
