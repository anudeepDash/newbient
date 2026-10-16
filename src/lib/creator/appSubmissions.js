/*
 * Task submissions made in the app live in campaigns/{id}/submissions/{uid}
 * (written by the server). The admin screens still read task.submissions on
 * the campaign doc, so the store merges the new records in, marked with
 * `store: 'app'`. Older submissions on the campaign doc stay as they are and
 * the app record wins when a creator has both.
 *
 *   index: { [campaignId]: { [uid]: { uid, tasks: { [taskId]: submission } } } }
 */

export const indexAppSubmissions = (docs = []) => {
    const index = {};
    docs.forEach(({ campaignId, uid, data }) => {
        if (!campaignId || !uid) return;
        (index[campaignId] ||= {})[uid] = { ...data, uid };
    });
    return index;
};

export const mergeAppSubmissions = (campaigns = [], index = {}) => {
    if (!index || !Object.keys(index).length) return campaigns;
    return (campaigns || []).map((campaign) => {
        const records = index[campaign.id];
        if (!records) return campaign;
        const tasks = (campaign.tasks || []).map((task) => {
            const taskId = String(task.id);
            let submissions = null;
            Object.entries(records).forEach(([uid, record]) => {
                const sub = record?.tasks?.[taskId];
                if (!sub?.status) return;
                submissions ||= { ...(task.submissions || {}) };
                submissions[uid] = { ...sub, store: 'app' };
            });
            return submissions ? { ...task, submissions } : task;
        });
        return { ...campaign, tasks };
    });
};

/* Is this creator's submission for this task stored in the app location? */
export const isAppSubmission = (index, campaignId, key, taskId) =>
    Boolean(index?.[campaignId]?.[key]?.tasks?.[String(taskId)]?.status);
