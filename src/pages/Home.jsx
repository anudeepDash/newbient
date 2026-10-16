// newbi.live is served as a prerendered page from the landing entry (src/landing).
// The app router keeps this route for local dev and old share links that reach
// the app shell; it renders the same landing page, with no Firestore listeners.
export { default } from '../landing/pages/HomePage';
