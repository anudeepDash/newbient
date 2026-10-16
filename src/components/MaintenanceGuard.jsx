import React from 'react';
import { useStore } from '../lib/store';
import Maintenance from '../pages/Admin/Maintenance';
import { canBypassMaintenance } from '../constants/roles';

const MaintenanceGuard = ({ children, category, featureId, isPage = false, isSection = false }) => {
    const { maintenanceState, user } = useStore();

    // Founders, super admins and developers can always get in to fix things.
    if (canBypassMaintenance(user?.role)) {
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
                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl border border-dashed border-amber-500/50 bg-white/80 backdrop-blur-[2px] dark:bg-black/60">
                        <div className="p-4 text-center">
                            <span className="mb-2 block text-3xl">🔧</span>
                            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">Being improved</h3>
                            <p className="mt-1 text-[13px] text-gray-600 dark:text-gray-400">This section is back soon.</p>
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
