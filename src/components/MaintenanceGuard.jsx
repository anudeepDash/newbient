import React from 'react';
import { useStore } from '../lib/store';
import Maintenance from '../pages/Admin/Maintenance';

const MaintenanceGuard = ({ children, category, featureId, isPage = false, isSection = false }) => {
    const { maintenanceState, user } = useStore();

    // Only Developer role bypasses maintenance guards
    if (user?.role === 'developer') {
        return children;
    }

    const isUnderMaintenance =
        maintenanceState.global ||
        (isPage && maintenanceState.pages?.[featureId]) ||
        (isSection && maintenanceState.sections?.[featureId]) ||
        (!isPage && !isSection && maintenanceState.features?.[featureId]);

    if (isUnderMaintenance) {
        // If it's a page-level guard, show the full maintenance page
        if (isPage) {
            return <Maintenance />;
        }

        // If it's a section-level guard, show a subtle variant
        if (isSection) {
            return (
                <div className="relative group cursor-not-allowed">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-xl border border-dashed border-red-500/50">
                        <div className="text-center p-4">
                            <span className="text-4xl block mb-2">🔧</span>
                            <h3 className="text-white font-black italic uppercase tracking-tighter">Under Maintenance</h3>
                            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1">Improvements in Progress</p>
                        </div>
                    </div>
                    <div className="grayscale opacity-30 pointer-events-none">
                        {children}
                    </div>
                </div>
            );
        }

        // Default behavior for admin features
        return <Maintenance />;
    }

    return children;
};

export default MaintenanceGuard;
