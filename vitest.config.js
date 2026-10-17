import { defineConfig } from 'vitest/config';

// Unit tests only: pure helpers and server handlers against an in-memory Firestore.
// Kept apart from vite.config.js so the dev-server middlewares never load here.
export default defineConfig({
    test: {
        include: ['tests/**/*.test.js'],
        environment: 'node',
    },
});
