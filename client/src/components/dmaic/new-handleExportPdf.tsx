  // Function to handle PDF export with protection against duplicate generation
  const handleExportPdf = async () => {
    try {
      // Prevent running the function if already generating
      if (exportPdfLock.isGenerating()) {
        console.log("PDF generation already in progress");
        return;
      }
      
      // Start the lock to prevent duplicate generations
      exportPdfLock.startGeneration();
      
      // Show initial toast notification
      toast({
        title: "Generating Project Charter",
        description: "Please wait while we prepare your PDF...",
      });
      
      // Get the element to export
      const charterElement = document.getElementById("project-charter");
      if (!charterElement) {
        toast({
          title: "Export failed",
          description: "Could not find the project charter element",
          variant: "destructive",
        });
        exportPdfLock.reset();
        return;
      }
      
      // Perform PDF export here
      // ...
      
      // Mark generation complete and show success toast
      exportPdfLock.reset();
      
      toast({
        title: "PDF Generated Successfully",
        description: "Your Project Charter has been exported to PDF.",
      });
      
    } catch (error) {
      console.error("PDF generation failed:", error);
      
      toast({
        title: "PDF Generation Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      
      exportPdfLock.reset();
    }
  };