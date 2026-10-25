import React from 'react';
import { cn } from '../../lib/utils';
import { useAccent } from './theme';
import GlassSelect from '../ui/GlassSelect';

/*
 * Admin <select>: the shared liquid glass select, with the chosen row in the
 * current section's accent. Same API as <select> (see ui/GlassSelect.jsx).
 */
const ThemedSelect = React.forwardRef((props, ref) => {
    const a = useAccent();
    return <GlassSelect ref={ref} picked={cn(a.soft, a.text)} {...props} />;
});
ThemedSelect.displayName = 'ThemedSelect';

export default ThemedSelect;
