import React from 'react';

const DrawIoEmbed = () => {
  return (
    <div style={{ width: '1060px', height: '600px' }}>
      <iframe
        src="https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&modified=unsavedChanges&proto=json%27&saveAndExit=1&noExitBtn=0&libraries=1"
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Embedded Draw.io Editor"
      />
    </div>
  );
};

export default DrawIoEmbed;