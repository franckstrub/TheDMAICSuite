import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from "lucide-react";

interface DrawIoFishboneProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  onSave?: (data: string) => void;
}

export default function DrawIoFishbone({ projectId, ctqId, ctqName, onSave }: DrawIoFishboneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [diagramData, setDiagramData] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Load any existing diagram data for this CTQ
    loadDiagramData();
  }, [projectId, ctqId]);

  const loadDiagramData = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/fishbone-diagrams/${ctqId}`);
      if (response.ok) {
        const data = await response.json();
        setDiagramData(data.diagramData || '');
        console.log('Loaded existing fishbone diagram data');
      }
    } catch (error) {
      console.log('No existing fishbone diagram data found, starting with empty diagram');
    }
  };

  const saveDiagramData = async (data: string) => {
    try {
      console.log('Saving fishbone diagram data to server:', data.substring(0, 100) + '...');
      const response = await fetch(`/api/projects/${projectId}/fishbone-diagrams/${ctqId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          diagramData: data,
          ctqName: ctqName 
        }),
      });
      
      if (response.ok) {
        console.log('Fishbone diagram saved successfully');
        toast({
          title: "Success",
          description: `Fishbone diagram saved for ${ctqName}`,
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
          console.log('Draw.io fishbone initialized');
          setIsLoaded(true);
          // Send existing diagram data if available
          if (diagramData && iframeRef.current) {
            console.log('Loading existing fishbone diagram data into editor');
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
          console.log('Fishbone export event received:', data);
          if (data.xml || data.data) {
            const xmlData = data.xml || data.data;
            console.log('Saving exported fishbone diagram data');
            setDiagramData(xmlData);
            saveDiagramData(xmlData);
          } else {
            console.log('No XML data in fishbone export event:', data);
          }
          break;
          
        case 'exit':
          // Handle exit events if needed
          break;
      }
    } catch (error) {
      console.error('Error parsing message from draw.io fishbone:', error);
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [diagramData]);

  const handleSave = () => {
    console.log('Fishbone save button clicked, isLoaded:', isLoaded);
    if (iframeRef.current) {
      console.log('Requesting fishbone diagram export from draw.io');
      // Request current diagram data from draw.io using the correct message format
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ action: 'export', format: 'xmlsvg', xml: '', embedImages: false }),
        'https://embed.diagrams.net'
      );
    } else {
      console.log('No iframe reference available for fishbone');
    }
  };

  const handleNew = () => {
    if (iframeRef.current) {
      // Create new fishbone diagram
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
          <span className="font-medium">Fishbone Diagram for: {ctqName}</span>
          <br />
          {isLoaded ? 'Fishbone Editor Ready' : 'Loading Fishbone Editor...'}
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
            size="sm"
            onClick={handleSave}
            disabled={!isLoaded}
          >
            Save Fishbone
          </Button>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-lg iframe-container">
        <iframe
          scrolling="no"
          ref={iframeRef}
          src={drawIoUrl}
          className="w-full h-[600px] my-iframe"
          title="Fishbone Diagram Editor"
          frameBorder="0"
          onLoad={() => {
            console.log('Draw.io fishbone iframe loaded successfully');
            setIsLoaded(true);
          }}
        />
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <p>
          • Analyze root causes by adding potential causes to each category branch
          • Major categories: Man, Machine, Method, Material, Measurement, Environment
          • Your fishbone diagram will be automatically saved when you use Ctrl+S or the save button
          • Use the "New Diagram" button to start with a fresh fishbone diagram structure
        </p>
      </div>
    </div>
  );
}