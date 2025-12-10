import React, { useState } from 'react';
import { CompetitorsList } from './Dashboard';
import { CompetitorDetail } from './CompetitorDetail';

export const CompetitorsModule: React.FC = () => {
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);

  const handleSelectCompetitor = (id: string) => {
    setSelectedCompetitorId(id);
  };

  const handleBack = () => {
    setSelectedCompetitorId(null);
  };

  return (
    <div className="animate-fade-in">
      {selectedCompetitorId ? (
        <CompetitorDetail 
          competitorId={selectedCompetitorId} 
          onBack={handleBack}
        />
      ) : (
        <CompetitorsList onSelect={handleSelectCompetitor} />
      )}
    </div>
  );
};