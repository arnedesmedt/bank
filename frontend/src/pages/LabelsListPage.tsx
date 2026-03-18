import React from 'react';
import { LabelManager } from '../components/LabelManager';

/**
 * Labels list page — the sole location for creating, editing, and deleting labels.
 * FR-001: Label actions are only on this page, not on the home/transfer page.
 */
const LabelsListPage: React.FC = () => {
    return (
        <div>
            <LabelManager />
        </div>
    );
};

export default LabelsListPage;
