import { Link } from 'react-router-dom';
import logoUrl from '../../assets/logo/newbi-logo.svg';

// The unified newbi.live logo (src/assets/logo). Its white letters carry a dark
// outline, so the one file reads on both the light and the dark theme.
// ConcertZone keeps its own brand and never uses this.
const RATIO = 1433 / 697;

export function LogoImage({ height = 32, className = '', priority = false }) {
    return (
        <img
            src={logoUrl}
            alt="newbi.live"
            width={Math.round(height * RATIO)}
            height={height}
            className={className}
            style={{ height, width: 'auto' }}
            decoding="async"
            fetchPriority={priority ? 'high' : undefined}
        />
    );
}

export default function Logo({ height = 32, className = '' }) {
    return (
        <Link to="/" aria-label="newbi.live home" className={`inline-flex items-center min-h-[44px] ${className}`}>
            <LogoImage height={height} priority />
        </Link>
    );
}
