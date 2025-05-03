import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

/**
 * Exports a DOM element to a PDF file that looks exactly like on-screen
 * @param elementId - The ID of the DOM element to export
 * @param filename - The filename for the exported PDF
 */
export const exportToPdf = async (elementId: string, filename: string) => {
  try {
    console.log(`Starting PDF export for element: ${elementId}`);
    // Get the element to export
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with ID "${elementId}" not found`);
      return false;
    }

    // Create a clone of the element to avoid modifying the original DOM
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Create a container with exact styling to maintain appearance
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = `${element.offsetWidth}px`;
    container.style.backgroundColor = 'white';
    container.style.padding = '20px';
    container.style.overflow = 'hidden';
    container.style.zIndex = '-1000';
    
    // Copy all computed styles from the original element
    const styles = window.getComputedStyle(element);
    container.style.fontFamily = styles.fontFamily;
    container.style.fontSize = styles.fontSize;
    container.style.color = styles.color;
    
    // Set up special export styling
    document.body.appendChild(container);
    container.appendChild(clonedElement);
    
    // We'll preserve the exact state of the UI without forcing expansion
    // This ensures the PDF looks exactly like what the user sees on screen
    
    // Add CSS rules to make sure elements render properly for PDF
    const styleRules = document.createElement('style');
    styleRules.textContent = `
      /* Ensure proper rendering of content without changing visibility state */
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    `;
    container.appendChild(styleRules);
    
    console.log("Preserving exact on-screen appearance for PDF export");

    // Wait a moment for styles to apply
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log("Creating canvas from prepared element");
    // Create canvas with high quality settings
    const canvas = await html2canvas(container, {
      scale: 2, // Higher scale for better quality
      useCORS: true, // Enable CORS for images
      logging: true, // Enable logging for debugging
      backgroundColor: '#ffffff', // White background
      allowTaint: true, // Allow tainted canvas for better image quality
      foreignObjectRendering: false, // Better compatibility
      onclone: (clonedDoc) => {
        // Additional processing on cloned document if needed
        const clonedBody = clonedDoc.querySelector('body');
        if (clonedBody) {
          clonedBody.style.overflow = 'visible';
        }
        
        // Fix for title overlapping with input fields in PDF
        const labels = clonedDoc.querySelectorAll('label');
        labels.forEach(label => {
          label.style.display = 'block';
          label.style.marginBottom = '8px';
          label.style.fontWeight = '500';
          label.style.clear = 'both';
        });
        
        // Add spacing between input fields and their labels
        const inputs = clonedDoc.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          input.style.marginTop = '4px';
          input.style.display = 'block';
          input.style.width = '100%';
        });
        
        // Mark the container for special CSS styling
        clonedDoc.querySelector('#' + elementId)?.classList.add('html2canvas-container');
        
        console.log("Document cloned and styled for canvas rendering with fixed label spacing");
      }
    });
    
    console.log("Canvas created, dimensions:", canvas.width, "x", canvas.height);
    
    // Remove the temporary elements from DOM
    document.body.removeChild(container);
    
    // Convert canvas to image data
    const imgData = canvas.toDataURL('image/png');
    
    // Create PDF with proper dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    // Calculate dimensions for PDF
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const ratio = canvas.height / canvas.width;
    const imgWidth = pdfWidth - 20; // 10mm margin on each side
    const imgHeight = imgWidth * ratio;
    
    console.log("PDF dimensions:", pdfWidth, "x", pdfHeight);
    console.log("Image dimensions:", imgWidth, "x", imgHeight);
    
    // Add first page
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    
    // If content is taller than the page, add additional pages
    let heightLeft = imgHeight;
    let position = 10; // Starting Y position
    
    while (heightLeft > (pdfHeight - 20)) {
      position = pdfHeight - 10; // Bottom margin
      heightLeft -= position;
      
      // Add a new page
      pdf.addPage();
      
      // Add the same image but position it to show the next part
      pdf.addImage(imgData, 'PNG', 10, -(imgHeight - heightLeft - 10), imgWidth, imgHeight);
      
      console.log("Added new page, height left:", heightLeft);
    }
    
    // Save the PDF
    console.log(`Saving PDF as ${filename}.pdf`);
    pdf.save(`${filename}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

// Alternative version using the multi-page approach for large content
export const exportToPdfMultiPage = async (elementId: string, filename: string) => {
  try {
    // Get the element to export
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with ID "${elementId}" not found`);
      return;
    }
    
    // Calculate the total height and set up PDF dimensions
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Define footer height and adjust page dimensions
    const footerHeight = 15; // mm
    const headerHeight = 30; // mm for first page
    const margin = 10; // mm
    const contentWidth = pdfWidth - (2 * margin);
    
    // Create a temporary container to hold our cloned element
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = contentWidth + 'mm';
    document.body.appendChild(container);
    
    // Clone the element and maintain current display state
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Add special CSS rules for proper rendering
    const styleRules = document.createElement('style');
    styleRules.textContent = `
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      img {
        max-width: 100% !important;
        max-height: 300px !important;
        height: auto !important;
        width: auto !important;
        object-fit: contain !important;
      }
    `;
    container.appendChild(styleRules);
    container.appendChild(clonedElement);
    
    // Render to canvas with improved settings
    const canvas = await html2canvas(container, {
      scale: 2.5, // Higher scale for better quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      imageTimeout: 15000, // Longer timeout for complex pages
      logging: true,
      removeContainer: false,
      foreignObjectRendering: false
    });
    
    // Remove the temporary container
    document.body.removeChild(container);
    
    // Convert canvas to image data - using JPEG instead of PNG to avoid corruption
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Calculate dimensions
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Calculate how many pages we need
    const firstPageContentHeight = pdfHeight - headerHeight - footerHeight;
    const subsequentPageContentHeight = pdfHeight - (2 * margin) - footerHeight;
    const totalPages = Math.ceil((imgHeight - firstPageContentHeight) / subsequentPageContentHeight) + 1;
    
    // Add image data to PDF, splitting across pages if needed
    let remainingHeight = imgHeight;
    let sourceY = 0;
    
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }
      
      // Calculate current page dimensions
      const currentPageHeight = page === 0 ? firstPageContentHeight : subsequentPageContentHeight;
      const printHeight = Math.min(remainingHeight, currentPageHeight);
      const sourceHeight = (printHeight / imgHeight) * canvas.height;
      
      // Create a temporary canvas for this page section
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = sourceHeight;
      
      // Draw the portion of the original canvas
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(
          canvas, 
          0, sourceY, canvas.width, sourceHeight,
          0, 0, tempCanvas.width, tempCanvas.height
        );
        
        // Add to PDF with JPEG format
        const pageImgData = tempCanvas.toDataURL('image/jpeg', 0.95);
        
        const yPosition = page === 0 ? headerHeight : margin;
        pdf.addImage(pageImgData, 'JPEG', margin, yPosition, imgWidth, printHeight);
        
        // Update for next page
        remainingHeight -= printHeight;
        sourceY += sourceHeight;
      }
      
      // Add page number in footer area
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Page ${page + 1} of ${totalPages}`, pdfWidth / 2, pdfHeight - (footerHeight / 2), { align: 'center' });
      
      // Add a separator line above footer
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, pdfHeight - footerHeight, pdfWidth - margin, pdfHeight - footerHeight);
    }
    
    // Add footer to all pages
    for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Lean Six Sigma DMAIC Suite™', 14, pdfHeight - 5);
    }
    
    // Save the PDF
    pdf.save(`${filename}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating multi-page PDF:', error);
    return false;
  }
};