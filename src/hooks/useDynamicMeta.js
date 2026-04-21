import { useEffect } from 'react';

const useDynamicMeta = ({ title, description, image, url }) => {
    useEffect(() => {
        const defaultTitle = "Newbi Entertainment & Marketing";
        const defaultDesc = "Newbi Entertainment connects brands, colleges, and creators through talent management, live events, influencer marketing, and experiential campaigns.";
        const defaultImage = "/favicon.svg";
        const defaultUrl = window.location.href;

        const setMeta = (name, property, content) => {
            let el;
            if (property) {
                el = document.querySelector(`meta[property="${property}"]`);
                if (!el) {
                    el = document.createElement('meta');
                    el.setAttribute('property', property);
                    document.head.appendChild(el);
                }
            } else if (name) {
                el = document.querySelector(`meta[name="${name}"]`);
                if (!el) {
                    el = document.createElement('meta');
                    el.setAttribute('name', name);
                    document.head.appendChild(el);
                }
            }
            if (el) el.setAttribute('content', content);
        };

        if (title) {
            document.title = `${title} | Newbi Ent.`;
            setMeta(null, 'og:title', title);
            setMeta(null, 'twitter:title', title);
        }

        if (description) {
            setMeta('description', null, description);
            setMeta(null, 'og:description', description);
            setMeta(null, 'twitter:description', description);
        }

        if (image) {
            setMeta(null, 'og:image', image);
            setMeta(null, 'twitter:image', image);
        }

        if (url) {
            setMeta(null, 'og:url', url);
            setMeta(null, 'twitter:url', url);
        }

        return () => {
            // Cleanup: Revert to default
            document.title = defaultTitle;
            setMeta(null, 'og:title', defaultTitle);
            setMeta(null, 'twitter:title', defaultTitle);
            setMeta('description', null, defaultDesc);
            setMeta(null, 'og:description', defaultDesc);
            setMeta(null, 'twitter:description', defaultDesc);
            setMeta(null, 'og:image', "/og-image.png");
            setMeta(null, 'twitter:image', "/og-image.png");
            setMeta(null, 'og:url', "https://www.newbi.live/");
            setMeta(null, 'twitter:url', "https://www.newbi.live/");
        };
    }, [title, description, image, url]);
};

export default useDynamicMeta;
