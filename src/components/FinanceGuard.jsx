import React from 'react';
import { useNavigate } from 'react-router-dom';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import { useStore } from '../lib/store';
import AccessNotice from './admin/workspace/AccessNotice';
import { Button } from './admin/ui';

const FinanceGuard = ({ children }) => {
    const { user } = useStore();
    const navigate = useNavigate();

    if (user?.role === 'developer' || user?.role === 'founder') {
        return children;
    }

    return (
        <AccessNotice
            icon={IndianRupee}
            tone="teal"
            title="Finance is for founders"
            actions={(
                <Button variant="primary" onClick={() => navigate('/admin')} className="h-12 w-full">
                    <LayoutDashboard size={15} /> Back to the dashboard
                </Button>
            )}
        >
            Invoices, payments and the finance board can only be opened by founders and developers.
            Ask a founder if you need something from here.
        </AccessNotice>
    );
};

export default FinanceGuard;
