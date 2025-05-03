import React from 'react';
import { Stakeholder } from '@shared/schema';

interface PdfStakeholderListProps {
  stakeholders: Stakeholder[];
  title: string;
  columnLabel?: string;
}

/**
 * A simplified stakeholder list component just for PDF export
 * This avoids all the issues with table spacing in PDF exports
 */
const PdfStakeholderList: React.FC<PdfStakeholderListProps> = ({ 
  stakeholders, 
  title,
  columnLabel = "Function" 
}) => {
  return (
    <div className="pdf-stakeholder-list mb-4 border rounded-md p-3 bg-white">
      <h3 className="text-base font-medium mb-2">{title}</h3>
      {stakeholders.length > 0 ? (
        <div className="text-sm">
          <table className="fixed-pdf-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>{columnLabel}</th>
              </tr>
            </thead>
            <tbody>
              {stakeholders.map((stakeholder, index) => (
                <tr key={index}>
                  <td>{stakeholder.name || 'N/A'}</td>
                  <td>{stakeholder.function || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No {title.toLowerCase()} added.</p>
      )}
    </div>
  );
};

export default PdfStakeholderList;