import React from 'react';
import Hero from '../components/home/Hero';
import About from '../components/home/About';
import Services from '../components/home/Services';
import Portfolio from '../components/home/Portfolio';
import WhyChooseUs from '../components/home/WhyChooseUs';
import CallToAction from '../components/home/CallToAction';

import UpcomingEvents from '../components/home/UpcomingEvents';

import MaintenanceGuard from '../components/MaintenanceGuard';

const Home = () => {
    return (
        <main className="bg-dark min-h-screen">
            <Hero />

            <WhyChooseUs />
            <About />
            <Services />
            <MaintenanceGuard isSection featureId="home_upcoming">
                <UpcomingEvents />
            </MaintenanceGuard>
            <MaintenanceGuard isSection featureId="home_portfolio">
                <Portfolio />
            </MaintenanceGuard>
            <CallToAction />
        </main>
    );
};

export default Home;
