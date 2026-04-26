import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { cn } from '../../lib/utils';

const AdminDashboardLink = ({ className }) => {
    return (
        <Link 
            to="/admin" 
            className={cn(
                "inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors group relative z-[60]",
                className
            )}
        >
            <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" />
            BACK TO ADMIN DASHBOARD
        </Link>
    );
};

export default AdminDashboardLink;
