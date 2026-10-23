import React, { useEffect, useState } from 'react';
import SheetIcon from 'lucide-react/dist/esm/icons/sheet';
import LoaderCircle from 'lucide-react/dist/esm/icons/loader-circle';
import { Button } from './ui';
import { googleSheetsEnabled, loadGoogleSheets, openInGoogleSheets } from '../../lib/googleSheets';

/**
 * Sits next to a "Download" / "Template" button: the same sheet, opened in
 * Google Sheets to edit there. `format: 'csv'` keeps the header in row 1, for
 * templates that come back in as CSV. Renders nothing until Google is set up.
 */
const GoogleSheetsButton = ({ getSpec, format = 'xlsx', label = 'Google Sheets', className, disabled, ...rest }) => {
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (googleSheetsEnabled) loadGoogleSheets().catch(() => {}); }, []);
    if (!googleSheetsEnabled) return null;

    const open = async () => {
        setBusy(true);
        try { await openInGoogleSheets(getSpec(), { format }); } finally { setBusy(false); }
    };

    return (
        <Button variant="ghost" onClick={open} disabled={busy || disabled} className={className} title="Saves a copy in your Google Drive to edit there" {...rest}>
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <SheetIcon size={14} />} {label}
        </Button>
    );
};

export default GoogleSheetsButton;
