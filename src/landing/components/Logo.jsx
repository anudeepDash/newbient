import { Link } from 'react-router-dom';
import NewbiLogo from '../../components/brand/NewbiLogo';

// The newbi.live logo: black in light mode, outlined in dark mode (NewbiLogo).
// ConcertZone keeps its own brand and never uses this.

export function LogoImage({ height = 32, className = '', priority = false }) {
    return <NewbiLogo height={height} className={className} priority={priority} />;
}

export default function Logo({ height = 32, className = '' }) {
    return (
        <Link to="/" aria-label="newbi.live home" className={`inline-flex items-center min-h-[44px] ${className}`}>
            <LogoImage height={height} priority />
        </Link>
    );
}
