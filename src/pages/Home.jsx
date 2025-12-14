import React from 'react';
import Hero from '../components/home/Hero';
import About from '../components/home/About';
import Services from '../components/home/Services';
import Portfolio from '../components/home/Portfolio';
import WhyChooseUs from '../components/home/WhyChooseUs';
import CallToAction from '../components/home/CallToAction';

const Home = () => {
    return (
        <main className="bg-dark min-h-screen">
            <Hero />
            <WhyChooseUs />
            <About />
            <Services />
            <Portfolio />
            <CallToAction />
        </main>
    );
};

export default Home;
