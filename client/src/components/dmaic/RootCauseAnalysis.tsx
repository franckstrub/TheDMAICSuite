import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from "lucide-react";

interface RootCauseAnalysisProps {
  projectId: number;
  ctqId: number;
  onSave?: (data: string) => void;
}

export default function RootCauseAnalysis({ projectId, ctqId, onSave }: RootCauseAnalysisProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [diagramData, setDiagramData] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Load any existing diagram data for this project and CTQ
    loadDiagramData();
  }, [projectId, ctqId]);

  const loadDiagramData = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/ctq/${ctqId}/fishbone`);
      if (response.ok) {
        const data = await response.json();
        setDiagramData(data.diagramData || '');
        console.log('Loaded existing fishbone diagram data');
      } else {
        // Load default fishbone diagram template if no existing diagram
        loadDefaultFishboneDiagram();
      }
    } catch (error) {
      console.log('No existing fishbone diagram data found, loading default template');
      loadDefaultFishboneDiagram();
    }
  };

  const loadDefaultFishboneDiagram = async () => {
    try {
      // Load the default fishbone diagram from attached assets
      const response = await fetch('/attached_assets/Fishbone Diagram.drawio');
      if (response.ok) {
        const defaultDiagramData = await response.text();
        setDiagramData(defaultDiagramData);
        console.log('Loaded default fishbone diagram template');
      }
    } catch (error) {
      console.log('Could not load default fishbone diagram template');
    }
  };

  const saveDiagramData = async (data: string) => {
    try {
      console.log('Saving diagram data to server:', data.substring(0, 100) + '...');
      const response = await fetch(`/api/projects/${projectId}/ctq/${ctqId}/fishbone-diagram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ diagramData: data }),
      });
      
      if (response.ok) {
        console.log('Fishbone diagram saved successfully');
        toast({
          title: "Success",
          description: "Fishbone diagram saved successfully",
        });
        
        if (onSave) {
          onSave(data);
        }
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (error) {
      console.error('Error saving fishbone diagram:', error);
      toast({
        title: "Error",
        description: "Failed to save fishbone diagram",
        variant: "destructive",
      });
    }
  };

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== 'https://embed.diagrams.net') {
      return;
    }

    try {
      const data = JSON.parse(event.data);
      
      switch (data.event) {
        case 'init':
          console.log('Draw.io initialized');
          setIsLoaded(true);
          // Send existing diagram data if available
          if (diagramData && iframeRef.current) {
            console.log('Loading existing diagram data into editor');
            iframeRef.current.contentWindow?.postMessage(
              JSON.stringify({
                action: 'load',
                xml: diagramData,
              }),
              'https://embed.diagrams.net'
            );
          }
          break;
          
        case 'save':
          // Auto-save when user saves in draw.io
          if (data.xml) {
            setDiagramData(data.xml);
            saveDiagramData(data.xml);
          }
          break;
          
        case 'export':
          // Handle export events - save the exported diagram
          console.log('Export event received:', data);
          if (data.xml || data.data) {
            const xmlData = data.xml || data.data;
            console.log('Saving exported diagram data');
            setDiagramData(xmlData);
            saveDiagramData(xmlData);
          } else {
            console.log('No XML data in export event:', data);
          }
          break;
          
        case 'exit':
          // Handle exit events if needed
          break;
      }
    } catch (error) {
      console.error('Error parsing message from draw.io:', error);
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [diagramData]);

  const handleSave = () => {
    console.log('Save button clicked, isLoaded:', isLoaded);
    if (iframeRef.current) {
      console.log('Requesting diagram export from draw.io');
      // Request current diagram data from draw.io using the correct message format
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ action: 'export', format: 'xmlsvg', xml: '', embedImages: false }),
        'https://embed.diagrams.net'
      );
    } else {
      console.log('No iframe reference available');
    }
  };

  const handleNew = () => {
    if (iframeRef.current) {
      // Create new diagram
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ action: 'template' }),
        'https://embed.diagrams.net'
      );
    }
  };

  // Draw.io embed URL with working configuration
  const drawIoUrl = 'https://embed.diagrams.net/?embed=1&ui=atlas&spin=0&modified=unsavedChanges&proto=json&libraries=1&noSaveBtn=0&saveAndExit=0&noExitBtn=1';

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          {isLoaded ? 'Fishbone diagram Editor Ready' : 'Loading Fishone diagram Editor...'}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNew}
            disabled={!isLoaded}
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Fishbone diagram</span>
          </Button>
          <Button
            //variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!isLoaded}
          >
            Save Fishbone diagram
          </Button>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-lg iframe-container">
        <iframe
          /*sandbox="allow-scripts allow-forms allow-same-origin"*/
          scrolling="no"
          ref={iframeRef}
          src={drawIoUrl}
          className="w-full h-[600px] my-iframe"
          title="Fishbone diagram Editor"
          frameBorder="0"
          /*allow="camera; microphone; geolocation"*/
          onLoad={() => {
            console.log('Draw.io iframe loaded successfully');
            setIsLoaded(true);
          }}
        />
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <p>
          • Use the toolbar above to create your fishbone diagram
          • Your diagram will be automatically saved when you use Ctrl+S or the Save button
          • This editor supports standard fishbone symbols and notation
          • You may use several pages. Just click on "+" to add a page to your diagram
        </p>
      </div>
    </div>
  );
}