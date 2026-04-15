/**
 * Utility to load and initialize the Meta (Facebook) SDK
 */

const META_APP_ID = import.meta.env.VITE_META_APP_ID;

export const loadMetaSDK = () => {
    return new Promise((resolve, reject) => {
        if (window.FB) {
            resolve(window.FB);
            return;
        }

        window.fbAsyncInit = function() {
            window.FB.init({
                appId: META_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v19.0'
            });
            resolve(window.FB);
        };

        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = "https://connect.facebook.net/en_US/sdk.js";
        script.async = true;
        script.defer = true;
        script.onerror = () => reject(new Error("Failed to load Meta SDK"));
        document.head.appendChild(script);
    });
};

export const loginWithMeta = async (scope = 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement') => {
    const FB = await loadMetaSDK();
    
    return new Promise((resolve, reject) => {
        FB.login((response) => {
            if (response.authResponse) {
                resolve(response.authResponse.accessToken);
            } else {
                reject(new Error("Social verification cancelled or failed."));
            }
        }, { scope });
    });
};
