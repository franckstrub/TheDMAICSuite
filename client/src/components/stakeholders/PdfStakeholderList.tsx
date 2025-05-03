import React from 'react';
import { Stakeholder } from '@shared/schema';

interface PdfStakeholderListProps {
  stakeholders: Stakeholder[];
  title: string;
}

/**
 * A simplified stakeholder list component just for PDF export
 * This avoids all the issues with table spacing in PDF exports
 */
const PdfStakeholderList: React.FC<PdfStakeholderListProps> = ({ stakeholders, title }) => {
  return (
    <div className="pdf-stakeholder-list mb-4 border rounded-md p-3 bg-white">
      <h3 className="text-base font-medium mb-2">{title}</h3>
      {stakeholders.length > 0 ? (
        <div className="text-sm space-y-1">
          {stakeholders.map((stakeholder, index) => (
            <div key={index} className="flex pdf-stakeholder-item">
              <span className="font-medium mr-2">{stakeholder.name}</span>
              {stakeholder.function && (
                <span className="text-muted-foreground">({stakeholder.function})</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No {title.toLowerCase()} added.</p>
      )}
    </div>
  );
};

export default PdfStakeholderList;