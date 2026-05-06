import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { cn } from '../../lib/utils';

const AdminDashboardLink = ({ className }) => {
    return (
        <Link 
            to="/admin" 
            className={cn(
                "inline-flex items-center gap-5 px-10 py-5 bg-black/40 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-white hover:border-white/20 transition-all group relative z-[60] shadow-2xl",
                className
            )}

        >
            <LayoutDashboard size={16} className="text-neon-pink group-hover:scale-110 transition-transform" />
            BACK TO DASHBOARD
        </Link>
    );
};

export default AdminDashboardLink;

