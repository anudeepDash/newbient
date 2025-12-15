import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Send, Instagram, Youtube, Mail, Phone } from 'lucide-react'; // Note: Lucide doesn't have WhatsApp, using Phone as placeholder or generic
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

import { useStore } from '../lib/store';

import Workflow from '../components/home/Workflow';

const Contact = () => {
    // ... existing hook calls ...
    const { siteDetails } = useStore();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "messages"), {
                ...formData,
                createdAt: new Date().toISOString(),
                status: 'new'
            });
            alert('Message sent! We will get back to you soon.');
            setFormData({ name: '', email: '', message: '' });
        } catch (error) {
            console.error("Error sending message: ", error);
            alert('Failed to send message. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-black pt-20">
            <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-12 items-center justify-center min-h-[80vh]">

                {/* Contact Info */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex-1"
                >
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
                        Let's <span className="text-neon-blue">Connect</span>
                    </h1>
                    <p className="text-xl text-gray-400 mb-12 leading-relaxed">
                        Have an event, collaboration, or inquiry? We’d love to hear from you.
                        Let's create something extraordinary together.
                    </p>

                    <div className="space-y-6">

                        <a href={siteDetails.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                            <div className="p-3 rounded-full bg-neon-pink/10 text-neon-pink group-hover:bg-neon-pink group-hover:text-white transition-colors">
                                <Instagram size={24} />
                            </div>
                            <span className="ml-4 text-lg text-gray-300 group-hover:text-white">@newbi_ent</span>
                        </a>

                        <a href={siteDetails.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                            <div className="p-3 rounded-full bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <span className="font-bold text-xl">in</span>
                            </div>
                            <span className="ml-4 text-lg text-gray-300 group-hover:text-white">NewBi Entertainment</span>
                        </a>

                        <a href={siteDetails.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                            <div className="p-3 rounded-full bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white transition-colors">
                                <Phone size={24} />
                            </div>
                            <span className="ml-4 text-lg text-gray-300 group-hover:text-white">+91 93043 72773</span>
                        </a>

                        <a href={`mailto:${siteDetails.email}`} className="flex items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                            <div className="p-3 rounded-full bg-neon-blue/10 text-neon-blue group-hover:bg-neon-blue group-hover:text-white transition-colors">
                                <Mail size={24} />
                            </div>
                            <span className="ml-4 text-lg text-gray-300 group-hover:text-white">{siteDetails.email}</span>
                        </a>
                    </div>
                </motion.div>

                {/* Contact Form */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex-1 w-full"
                >
                    <Card className="p-8 border-neon-blue/30 shadow-neon-blue/10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                                <Input
                                    placeholder="Your Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                                <Input
                                    type="email"
                                    placeholder="your@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Message</label>
                                <textarea
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all resize-none h-32"
                                    placeholder="Tell us about your project..."
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    required
                                />
                            </div>

                            <Button type="submit" variant="primary" className="w-full py-4 text-lg">
                                <Send className="mr-2 h-5 w-5" />
                                Send Message
                            </Button>
                        </form>
                    </Card>
                </motion.div>
            </div>

            {/* Added Workflow Section */}
            <Workflow />
        </div>
    );
};

export default Contact;
