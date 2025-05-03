// This flag prevents multiple PDF export operations from running simultaneously
let isPdfGenerating = false;

// Function to handle PDF export with protection against duplicate generation
const handleExportPdf = async () => {
  // Prevent multiple clicks from triggering multiple PDF generations
  if (isPdfGenerating) {
    console.log("PDF generation already in progress");
    return;
  }
  
  // Set the flag to indicate PDF generation is in progress
  isPdfGenerating = true;
  
  try {
    toast({
      title: "Generating PDF Report",
      description: "Please wait while we capture the project charter...",
    });
    
    // Get the element to export
    const charterElement = document.getElementById("project-charter");
    if (!charterElement) {
      toast({
        title: "Export failed",
        description: "Could not find the project charter element",
        variant: "destructive",
      });
      isPdfGenerating = false;
      return;
    }
    
    // Make sure we have a valid project title for the filename
    const projectTitle = charterForm.watch("projectTitle") || "Project Charter";
    const safeFilename = projectTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').substring(0, 30);
    
    // Create a new jsPDF instance
    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });
    
    // Add title and header
    pdf.setFontSize(16);
    pdf.setTextColor(33, 37, 41);
    pdf.text("Six Sigma Project Charter", 105, 20, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setTextColor(85, 85, 85);
    pdf.text(`Generated on ${format(new Date(), "MMMM d, yyyy")}`, 14, 30);
    pdf.text(`Project: ${projectTitle}`, 14, 35);
    
    // Add separator line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(14, 38, 196, 38);
    
    // Special CSS for PDF generation
    charterElement.querySelectorAll('.html2canvas-hide').forEach(el => {
      el.classList.add('inactive');
    });
    
    // Check for financial sections that cause PDF scaling errors
    // We'll need to collapse them temporarily
    const financialMetricsSection = charterElement.querySelector('#financial-metrics-content');
    if (financialMetricsSection && financialMetricsSection.getAttribute('data-state') === 'open') {
      console.log("Financial metrics section is expanded - temporarily collapsing for PDF export");
      
      // Save original state to restore later
      financialMetricsSection.setAttribute('data-pdf-was-expanded', 'true');
      financialMetricsSection.setAttribute('data-state', 'closed');
      
      // Add a note about the financial section
      const financeNote = document.createElement('div');
      financeNote.className = 'pdf-only-note my-2 p-2 bg-blue-50 border border-blue-200 rounded-md';
      financeNote.innerHTML = `
        <p class="text-xs text-blue-800">Financial metrics details are available in the application</p>
      `;
      
      // Insert the note
      const financeHeader = charterElement.querySelector('#financial-metrics-trigger');
      if (financeHeader && financeHeader.parentNode) {
        financeHeader.parentNode.insertBefore(financeNote, financeHeader.nextSibling);
      }
    }
    
    // Also check project costs accordion
    const costsAccordion = charterElement.querySelector('#project-costs-accordion');
    if (costsAccordion && costsAccordion.getAttribute('data-state') === 'open') {
      console.log("Project costs accordion is expanded - temporarily collapsing for PDF export");
      
      // Save original state
      costsAccordion.setAttribute('data-pdf-was-expanded', 'true');
      costsAccordion.setAttribute('data-state', 'closed');
      
      // Add summary note
      const costsNote = document.createElement('div');
      costsNote.className = 'pdf-only-note my-2 p-3 bg-gray-50 border rounded text-sm';
      costsNote.innerHTML = `
        <p><strong>Note:</strong> Detailed project costs are available in the application.</p>
        <p class="text-xs text-gray-500 mt-1">Total Costs: ${charterForm.watch("totalProjectCosts") || 0} | 
        ROI: ${charterForm.watch("roi") || 0}%</p>
      `;
      
      // Insert the note
      if (costsAccordion.parentNode) {
        costsAccordion.parentNode.insertBefore(costsNote, costsAccordion);
      }
    }
    
    // Handle all form values to display correctly in PDF
    const formInputs = charterElement.querySelectorAll('input, textarea');
    formInputs.forEach(input => {
      const inputElement = input as HTMLInputElement;
      if (inputElement.value) {
        inputElement.setAttribute('data-pdf-value', inputElement.value);
      }
    });
    
    // Handle select elements separately
    const selectElements = charterElement.querySelectorAll('select');
    selectElements.forEach(select => {
      const selectElement = select as HTMLSelectElement;
      if (selectElement.selectedOptions[0]) {
        selectElement.setAttribute('data-pdf-value', selectElement.selectedOptions[0].text);
      }
    });
    
    // Add the container class for special PDF rendering
    charterElement.classList.add('html2canvas-container');
    
    // Wait for DOM changes to take effect
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate the canvas with optimized settings
    const pdfCanvas = await html2canvas(charterElement, {
      scale: 1.5, // Lower scale to prevent PDF scaling errors
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      imageTimeout: 15000,
      logging: false,
      removeContainer: false,
      foreignObjectRendering: false,
      onclone: (clonedDoc) => {
        // Handle the cloned document for PDF rendering
        const clonedCharter = clonedDoc.getElementById('project-charter');
        if (clonedCharter) {
          // Make hidden elements visible in PDF
          clonedCharter.querySelectorAll('.html2canvas-show').forEach(el => {
            el.classList.add('active');
          });
          
          // Make sure form values are displayed correctly
          const formValues = {
            projectType: charterForm.watch("projectType") || "Green Belt",
            projectCategory: charterForm.watch("projectCategory") || "Process Improvement",
            beltLevel: charterForm.watch("beltLevel") || "",
            coachBeltLevel: charterForm.watch("coachBeltLevel") || "None"
          };
          
          // Update form fields in the clone
          for (const [field, value] of Object.entries(formValues)) {
            const element = clonedCharter.querySelector(`[data-field="${field}"]`);
            if (element) {
              (element as HTMLElement).textContent = value;
            }
          }
        }
      }
    });
    
    // Calculate dimensions for PDF
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Get canvas dimensions
    const canvasWidth = pdfCanvas.width;
    const canvasHeight = pdfCanvas.height;
    
    // Define footer height and content area
    const footerHeight = 15; // mm
    const headerHeight = 40; // mm for the title area
    const contentWidth = pdfWidth - 28; // 14mm margin on each side
    
    // Calculate image size and page count
    const imgWidth = contentWidth;
    const imgHeight = (canvasHeight / canvasWidth) * imgWidth;
    const contentAreaHeight = pdfHeight - headerHeight - footerHeight;
    const totalPages = Math.ceil(imgHeight / contentAreaHeight);
    
    // Process each page
    let remainingHeight = imgHeight;
    let sourceY = 0;
    
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }
      
      // Calculate dimensions for current page
      const printHeight = Math.min(remainingHeight, contentAreaHeight);
      const sourceHeight = (printHeight / imgHeight) * canvasHeight;
      
      // Create a temporary canvas for this page section
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasWidth;
      tempCanvas.height = sourceHeight;
      
      // Draw the portion of the original canvas
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(
          pdfCanvas, 
          0, sourceY, canvasWidth, sourceHeight,
          0, 0, tempCanvas.width, tempCanvas.height
        );
        
        // Add to PDF as JPEG for better compatibility
        const pageImgData = tempCanvas.toDataURL('image/jpeg', 0.92);
        
        // Position image below header on first page, or with small margin on subsequent pages
        const yPosition = page === 0 ? headerHeight : 10;
        pdf.addImage(pageImgData, 'JPEG', 14, yPosition, imgWidth, printHeight);
        
        // Update for next page
        remainingHeight -= printHeight;
        sourceY += sourceHeight;
      }
      
      // Add page number in footer
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Page ${page + 1} of ${totalPages}`, pdfWidth / 2, pdfHeight - 8, { align: 'center' });
      
      // Add footer line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(14, pdfHeight - 12, pdfWidth - 14, pdfHeight - 12);
      
      // Add company footer
      pdf.setFontSize(8);
      pdf.text('Lean Six Sigma DMAIC Suite™', 14, pdfHeight - 5);
    }
    
    // Save the PDF
    const filename = `${safeFilename}_Project_Charter_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    pdf.save(filename);
    
    toast({
      title: "Report Generated Successfully",
      description: `Your project charter has been saved as ${filename}`,
    });
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    
    toast({
      title: "Export Failed",
      description: "Unable to generate PDF. Try collapsing sections manually before exporting.",
      variant: "destructive",
    });
  } finally {
    // Always clean up DOM regardless of success or failure
    const cleanupElement = document.getElementById('project-charter');
    if (cleanupElement) {
      // Remove special class
      cleanupElement.classList.remove('html2canvas-container');
      
      // Restore expanded sections
      cleanupElement.querySelectorAll('[data-pdf-was-expanded="true"]').forEach(section => {
        section.setAttribute('data-state', 'open');
        section.removeAttribute('data-pdf-was-expanded');
      });
      
      // Remove any notes we added
      cleanupElement.querySelectorAll('.pdf-only-note').forEach(note => {
        if (note.parentNode) {
          note.parentNode.removeChild(note);
        }
      });
      
      // Clean up data attributes
      cleanupElement.querySelectorAll('[data-pdf-value]').forEach(el => {
        el.removeAttribute('data-pdf-value');
      });
    }
    
    // Reset the flag
    isPdfGenerating = false;
  }
};