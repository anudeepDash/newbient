import React, { useEffect, useState } from 'react';
import { Sheet } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { missingFields } from './requirements';
import ProfileDetailsForm from './ProfileDetailsForm';

/*
 * Asks only for the profile fields a flow still needs, then hands back.
 * Most flows don't need this any more: useAuthGate().run(intent, action,
 * { require }) asks inside the one account sheet. This stays for editing
 * details from the profile (editAll) and the Home "Finish your profile" card.
 *
 *   <CompleteProfileSheet open={open} required={['name', 'city']} onComplete={...} onClose={...} />
 */

const CompleteProfileSheet = ({ open, onClose, onComplete, required = [], reason, title = 'A few details first', editAll = false }) => {
    const profile = useAppStore(s => s.profile);
    // Freeze the list when the sheet opens, so a field doesn't vanish mid-typing.
    const [fields, setFields] = useState([]);
    const [key, setKey] = useState(0);

    useEffect(() => {
        if (!open) return;
        setFields(editAll ? required : missingFields(profile, required));
        setKey(k => k + 1);
        // Only on open.
        // eslint-disable-next-line
    }, [open]);

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={title}
            subtitle={reason ? `We just need these ${reason}.` : 'We only ask for what’s missing.'}
        >
            <ProfileDetailsForm
                key={key}
                fields={fields}
                editAll={editAll}
                onSaved={() => { onComplete?.(); onClose?.(); }}
            />
        </Sheet>
    );
};

export default CompleteProfileSheet;
