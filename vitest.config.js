import { defineConfig } from 'vitest/config';

// Unit tests only: pure helpers and server handlers against an in-memory Firestore.
// Kept apart from vite.config.js so the dev-server middlewares never load here.
export default defineConfig({
    test: {
        include: ['tests/**/*.test.js'],
        environment: 'node',
        // Any code path that reaches for the real Firestore by mistake fails fast on a dead
        // local address instead of touching the live project.
        env: { FIRESTORE_EMULATOR_HOST: '127.0.0.1:9', GCLOUD_PROJECT: 'demo-tests' },
    },
});
