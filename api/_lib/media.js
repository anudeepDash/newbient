/*
 * Server-side twin of src/lib/media.js: saves a file under media/<id>/ in the
 * Firebase Storage bucket and returns its public, token-free link (files under
 * media/ are public to read, see storage.rules). No resizing here: callers save
 * small files only.
 */
import { randomUUID } from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';

let bucketOverride = null;
export const setMediaBucketForTests = (b) => { bucketOverride = b; };

const bucketName = () => {
    const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'newbi-ent-v2').trim();
    return (process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`).trim();
};

const bucket = () => bucketOverride || getStorage().bucket(bucketName());

export const mediaUrl = (path, name = bucketOverride?.name || bucketName()) =>
    `https://firebasestorage.googleapis.com/v0/b/${name}/o/${encodeURIComponent(path)}?alt=media`;

/* Saves `buffer` as media/<new id>/<name> and resolves to its link. */
export const saveMedia = async (buffer, { name, contentType }) => {
    const safe = String(name || 'file').replace(/[^A-Za-z0-9._-]/g, '_').slice(-100) || 'file';
    const path = `media/${randomUUID().replace(/-/g, '')}/${safe}`;
    await bucket().file(path).save(buffer, {
        resumable: false,
        contentType: contentType || 'application/octet-stream',
        metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    });
    return mediaUrl(path);
};
