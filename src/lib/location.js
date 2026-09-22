/**
 * Location Detection & Reverse Geocoding Utility
 * Determines the closest official creator hub or city using browser Geolocation and Haversine distance.
 */

// Coordinates for major Indian creator hubs & predefined cities
export const CITY_COORDINATES = [
    { city: 'Bengaluru', aliases: ['Bangalore', 'Bengaluru Urban'], lat: 12.9716, lng: 77.5946, isPrimaryHub: true },
    { city: 'Hyderabad', aliases: ['Secunderabad', 'Cyberabad'], lat: 17.3850, lng: 78.4867, isPrimaryHub: true },
    { city: 'Mumbai', aliases: ['Bombay', 'Navi Mumbai', 'Thane'], lat: 19.0760, lng: 72.8777, isPrimaryHub: true },
    { city: 'Delhi', aliases: ['Delhi NCR', 'New Delhi', 'Noida', 'Gurugram', 'Gurgaon', 'Faridabad', 'Ghaziabad'], lat: 28.6139, lng: 77.2090, isPrimaryHub: true },
    { city: 'Pune', aliases: ['Pimpri-Chinchwad'], lat: 18.5204, lng: 73.8567, isPrimaryHub: true },
    { city: 'Chandigarh', aliases: ['Mohali', 'Panchkula', 'Zirakpur'], lat: 30.7333, lng: 76.7794, isPrimaryHub: true },
    { city: 'Kolkata', aliases: ['Calcutta', 'Howrah'], lat: 22.5726, lng: 88.3639, isPrimaryHub: true },
    { city: 'Kochi', aliases: ['Cochin', 'Ernakulam'], lat: 9.9312, lng: 76.2673, isPrimaryHub: true },
    { city: 'Chennai', aliases: ['Madras'], lat: 13.0827, lng: 80.2707, isPrimaryHub: false },
    { city: 'Goa', aliases: ['Panaji', 'Margao', 'North Goa', 'South Goa'], lat: 15.2993, lng: 74.1240, isPrimaryHub: false },
    { city: 'Ahmedabad', aliases: ['Ahmadabad', 'Gandhinagar'], lat: 23.0225, lng: 72.5714, isPrimaryHub: false },
    { city: 'Jaipur', aliases: ['Pink City'], lat: 26.9124, lng: 75.7873, isPrimaryHub: false },
    { city: 'Indore', lat: 22.7196, lng: 75.8577, isPrimaryHub: false },
    { city: 'Lucknow', lat: 26.8467, lng: 80.9462, isPrimaryHub: false },
    { city: 'Vizag', aliases: ['Visakhapatnam', 'Waltair'], lat: 17.6868, lng: 83.2185, isPrimaryHub: true },
    { city: 'Bhubaneswar', aliases: ['Bhubaneshwar', 'Cuttack', 'Bhubaneswar & Cuttack'], lat: 20.2961, lng: 85.8245, isPrimaryHub: true },
    { city: 'Bhopal', lat: 23.2599, lng: 77.4126, isPrimaryHub: false },
    { city: 'Surat', lat: 21.1702, lng: 72.8311, isPrimaryHub: false },
    { city: 'Guwahati', lat: 26.1445, lng: 91.7362, isPrimaryHub: false },
];

/**
 * Calculates the great-circle distance between two points in km using Haversine formula
 */
export const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Find closest city geometrically from coordinates
 */
export const getNearestCity = (lat, lng, onlyPrimaryHubs = false) => {
    const pool = onlyPrimaryHubs 
        ? CITY_COORDINATES.filter(c => c.isPrimaryHub)
        : CITY_COORDINATES;

    let closest = pool[0];
    let minDistance = Infinity;

    for (const item of pool) {
        const dist = getDistanceKm(lat, lng, item.lat, item.lng);
        if (dist < minDistance) {
            minDistance = dist;
            closest = item;
        }
    }

    return {
        ...closest,
        distanceKm: Math.round(minDistance)
    };
};

/**
 * Attempts reverse geocoding with fast fallback to nearest hub coordinates
 */
export const detectCityFromCoordinates = async (lat, lng, onlyPrimaryHubs = false) => {
    const nearest = getNearestCity(lat, lng, onlyPrimaryHubs);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
            { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            const candidates = [
                data.city,
                data.locality,
                data.principalSubdivision,
                data.localityInfo?.administrative?.[2]?.name,
                data.localityInfo?.administrative?.[3]?.name
            ].filter(Boolean).map(s => String(s).toLowerCase().trim());

            const pool = onlyPrimaryHubs ? CITY_COORDINATES.filter(c => c.isPrimaryHub) : CITY_COORDINATES;

            for (const item of pool) {
                const nameLower = item.city.toLowerCase();
                const aliases = (item.aliases || []).map(a => a.toLowerCase());
                
                const matches = candidates.some(c => 
                    c.includes(nameLower) || nameLower.includes(c) ||
                    aliases.some(a => c.includes(a) || a.includes(c))
                );

                if (matches) {
                    return item.city;
                }
            }
        }
    } catch {
        // Network timeout / blocked: gracefully fallback to haversine nearest
    }

    return nearest.city;
};

/**
 * Checks whether Geolocation is permitted under the current document's Permissions Policy
 */
const isGeolocationPolicyBlocked = () => {
    try {
        if (typeof document !== 'undefined') {
            if (document.permissionsPolicy?.allowsFeature && !document.permissionsPolicy.allowsFeature('geolocation')) {
                return true;
            }
            if (document.featurePolicy?.allowsFeature && !document.featurePolicy.allowsFeature('geolocation')) {
                return true;
            }
        }
    } catch {
        return false;
    }
    return false;
};

/**
 * Triggers browser geolocation prompt and resolves with closest detected city
 */
export const requestAutoLocation = async ({ onlyPrimaryHubs = false } = {}) => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
    }

    if (isGeolocationPolicyBlocked()) {
        throw new Error('Geolocation access has been restricted by permissions policy');
    }

    if (navigator.permissions?.query) {
        try {
            const status = await navigator.permissions.query({ name: 'geolocation' });
            if (status.state === 'denied') {
                throw new Error('Geolocation permission denied');
            }
        } catch (e) {
            if (e.message === 'Geolocation permission denied') throw e;
        }
    }

    return new Promise((resolve, reject) => {
        try {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    try {
                        const detectedCity = await detectCityFromCoordinates(latitude, longitude, onlyPrimaryHubs);
                        resolve({
                            city: detectedCity,
                            coords: { latitude, longitude }
                        });
                    } catch {
                        const nearest = getNearestCity(latitude, longitude, onlyPrimaryHubs);
                        resolve({
                            city: nearest.city,
                            coords: { latitude, longitude }
                        });
                    }
                },
                (err) => {
                    reject(err);
                },
                {
                    enableHighAccuracy: false,
                    timeout: 8000,
                    maximumAge: 1000 * 60 * 30 // 30 minutes cache
                }
            );
        } catch (err) {
            reject(err);
        }
    });
};
