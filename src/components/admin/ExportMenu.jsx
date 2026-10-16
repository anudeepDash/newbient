import React from 'react';
import Download from 'lucide-react/dist/esm/icons/download';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import { Button, Menu, MenuItem } from './ui';
import { downloadXlsx, downloadCsv } from '../../lib/xlsx';
import { useStore } from '../../lib/store';

/**
 * One export button for every admin list: a styled Excel file first, plain CSV
 * second. `getSpec` builds the export lazily (only when clicked):
 *   { filename, sheetName, title, subtitle, columns, rows, totals }
 */
const ExportMenu = ({ getSpec, label = 'Export', className, size, hint }) => {
    const run = (kind) => {
        const spec = getSpec();
        const ok = spec && (kind === 'xlsx' ? downloadXlsx(spec) : downloadCsv(spec));
        const addToast = useStore.getState().addToast;
        if (!ok) addToast?.("There's nothing to export.", 'info');
        else addToast?.('Download started.', 'success');
    };

    return (
        <Menu className={className} trigger={({ toggle }) => (
            <Button variant="secondary" size={size} onClick={toggle} className="h-11"><Download size={14} /> {label}</Button>
        )}>
            <MenuItem icon={FileSpreadsheet} onClick={() => run('xlsx')} hint={hint || 'Formatted sheet with totals and filters'}>Excel (.xlsx)</MenuItem>
            <MenuItem icon={FileText} onClick={() => run('csv')} hint="Plain data for other tools">CSV</MenuItem>
        </Menu>
    );
};

export default ExportMenu;
