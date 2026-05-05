import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, Scale, Clock, AlertCircle, CreditCard, ExternalLink, Gavel, RefreshCw } from 'lucide-react';

const Terms = () => {
    const termsList = [
        {
            icon: <Shield size={24} />,
            title: "1. Account Responsibility",
            color: "neon-blue",
            content: "To access and use the Services, you agree to provide true, accurate and complete information to us during and after registration, and you shall be responsible for all acts done through the use of your registered account."
        },
        {
            icon: <AlertCircle size={24} />,
            title: "2. Information Accuracy",
            color: "neon-green",
            content: "Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials offered on this website or through the Services, for any specific purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law."
        },
        {
            icon: <Scale size={24} />,
            title: "3. User Risk",
            color: "neon-pink",
            content: "Your use of our Services and the website is solely at your own risk and discretion. You are required to independently assess and ensure that the Services meet your requirements."
        },
        {
            icon: <FileText size={24} />,
            title: "4. Proprietary Rights",
            color: "white",
            content: "The contents of the Website and the Services are proprietary to Us and you will not have any authority to claim any intellectual property rights, title, or interest in its contents."
        },
        {
            icon: <Gavel size={24} />,
            title: "5. Unauthorized Use",
            color: "neon-blue",
            content: "You acknowledge that unauthorized use of the Website or the Services may lead to action against you as per these Terms or applicable laws."
        },
        {
            icon: <CreditCard size={24} />,
            title: "6. Service Charges",
            color: "neon-green",
            content: "You agree to pay us the charges associated with availing the Services."
        },
        {
            icon: <AlertCircle size={24} />,
            title: "7. Unlawful Purpose",
            color: "neon-pink",
            content: "You agree not to use the website and/ or Services for any purpose that is unlawful, illegal or forbidden by these Terms, or Indian or local laws that might apply to you."
        },
        {
            icon: <ExternalLink size={24} />,
            title: "8. Third Party Links",
            color: "white",
            content: "You agree and acknowledge that website and the Services may contain links to other third party websites. On accessing these links, you will be governed by the terms of use, privacy policy and such other policies of such third party websites."
        },
        {
            icon: <FileText size={24} />,
            title: "9. Binding Contract",
            color: "neon-blue",
            content: "You understand that upon initiating a transaction for availing the Services you are entering into a legally binding and enforceable contract with the us for the Services."
        },
        {
            icon: <RefreshCw size={24} />,
            title: "10. Refunds",
            color: "neon-green",
            content: "You shall be entitled to claim a refund of the payment made by you in case we are not able to provide the Service. The timelines for such return and refund will be according to the specific Service you have availed or within the time period provided in our policies (as applicable). In case you do not raise a refund claim within the stipulated time, then this would make you ineligible for a refund."
        },
        {
            icon: <Clock size={24} />,
            title: "11. Force Majeure",
            color: "neon-pink",
            content: "Notwithstanding anything contained in these Terms, the parties shall not be liable for any failure to perform an obligation under these Terms if performance is prevented or delayed by a force majeure event."
        },
        {
            icon: <Gavel size={24} />,
            title: "12. Governing Law",
            color: "white",
            content: "These Terms and any dispute or claim relating to it, or its enforceability, shall be governed by and construed in accordance with the laws of India."
        }
    ];

    return (
        <div className="min-h-screen bg-black pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-16 text-center"
                >
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white mb-6 uppercase">
                        Terms & <span className="text-neon-blue">Conditions</span>
                    </h1>
                    <p className="text-gray-400 text-lg md:text-xl font-medium tracking-tight">
                        Last updated on 05-05-2026 15:17:18
                    </p>
                    <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-2xl inline-block">
                        <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                            These Terms and Conditions, along with privacy policy or other terms (“Terms”) constitute a binding agreement by and between <span className="text-white font-bold text-neon-blue">Newbi Entertainment & Marketing LLP</span> (“Website Owner” or “we” or “us” or “our”) and you (“you” or “your”) and relate to your use of our website, goods (as applicable) or services (as applicable) (collectively, “Services”).
                        </p>
                    </div>

                </motion.div>

                <div className="mb-12 p-8 bg-neon-blue/5 border border-neon-blue/20 rounded-3xl backdrop-blur-xl">
                    <p className="text-gray-300 leading-relaxed text-lg">
                        By using our website and availing the Services, you agree that you have read and accepted these Terms (including the Privacy Policy). We reserve the right to modify these Terms at any time and without assigning any reason. It is your responsibility to periodically review these Terms to stay informed of updates.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {termsList.map((term, index) => (
                        <motion.section 
                            key={index}
                            initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10 backdrop-blur-xl relative overflow-hidden group"
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-${term.color}/10 blur-[60px] -mr-16 -mt-16 group-hover:bg-${term.color}/20 transition-all duration-700`} />
                            <div className="flex items-center gap-6 mb-6">
                                <div className={`w-14 h-14 rounded-2xl bg-${term.color}/20 flex items-center justify-center text-${term.color} group-hover:scale-110 transition-transform duration-500`}>
                                    {term.icon}
                                </div>
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white">{term.title}</h2>
                            </div>
                            <p className="text-gray-400 leading-relaxed text-lg relative z-10">
                                {term.content}
                            </p>
                        </motion.section>
                    ))}
                </div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="mt-20 text-center border-t border-white/5 pt-12"
                >
                    <p className="text-gray-500 text-sm font-black uppercase tracking-[0.2em]">
                        For legal inquiries, contact us at <a href="mailto:legal@newbi.ent" className="text-white hover:text-neon-blue transition-colors">legal@newbi.ent</a>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Terms;
