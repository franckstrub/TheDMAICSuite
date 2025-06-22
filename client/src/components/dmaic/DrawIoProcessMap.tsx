import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from "lucide-react";

interface DrawIoProcessMapProps {
  projectId: number;
  onSave?: (data: string) => void;
}

export default function DrawIoProcessMap({ projectId, onSave }: DrawIoProcessMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [diagramData, setDiagramData] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Load any existing diagram data for this project
    loadDiagramData();
  }, [projectId]);

  const loadDiagramData = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/process-map`);
      if (response.ok) {
        const data = await response.json();
        setDiagramData(data.diagramData || '');
      }
    } catch (error) {
      console.log('No existing diagram data found');
    }
  };

  const saveDiagramData = async (data: string) => {
    try {
      console.log('Saving diagram data to server:', data.substring(0, 100) + '...');
      const response = await fetch(`/api/projects/${projectId}/process-map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ diagramData: data }),
      });
      
      if (response.ok) {
        console.log('Process map saved successfully');
        toast({
          title: "Success",
          description: "Process map saved successfully",
        });
        
        if (onSave) {
          onSave(data);
        }
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (error) {
      console.error('Error saving process map:', error);
      toast({
        title: "Error",
        description: "Failed to save process map",
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
          setIsLoaded(true);
          // Send existing diagram data if available
          if (diagramData && iframeRef.current) {
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
          if (data.xml) {
            console.log('Saving exported diagram data');
            setDiagramData(data.xml);
            saveDiagramData(data.xml);
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
      // Request current diagram data from draw.io
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ action: 'export', format: 'xml' }),
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

  // Draw.io embed URL with configuration
  const drawIoUrl = 'https://embed.diagrams.net/?embed=1&ui=atlas&spin=0&modified=unsavedChanges&proto=json&libraries=1&noSaveBtn=0&saveAndExit=0&noExitBtn=1';

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          {isLoaded ? 'Process Map Editor Ready' : 'Loading Process Map Editor...'}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNew}
            disabled={!isLoaded}
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Diagram</span>
          </Button>
          <Button
            //variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!isLoaded}
          >
            Save Process Map
          </Button>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <iframe
          ref={iframeRef}
          src={drawIoUrl}
          className="w-full h-[600px]"
          title="Process Map Editor"
          frameBorder="0"
          allow="camera; microphone; geolocation"
          onLoad={() => setIsLoaded(true)}
        />
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <p>
          • Use the toolbar above to create process flows and value stream maps
          • Your diagram will be automatically saved when you use Ctrl+S or the save button
          • This editor supports standard process mapping symbols and value stream mapping notation
          • You may use several pages to map your process. Just click on "+" to add a page to your diagram
        </p>
      </div>
    </div>
  );
}