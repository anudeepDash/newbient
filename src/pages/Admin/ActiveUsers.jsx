import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ActiveUsers page has been merged into the unified Members & Access Command Center (AdminManager.jsx).
 * This component transparently redirects any direct navigations or legacy links to the Active tab of Members Command.
 */
const ActiveUsers = () => {
    return <Navigate to="/admin/manage-admins?tab=active" replace />;
};

export default ActiveUsers;
