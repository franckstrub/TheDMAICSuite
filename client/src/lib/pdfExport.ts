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
        console.log("Document cloned for canvas rendering");
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
    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = 297; // A4 height in mm
    const margin = 10; // Margin in mm
    const contentWidth = pdfWidth - (2 * margin);
    
    // Create a temporary container to hold our cloned element
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = contentWidth + 'mm';
    document.body.appendChild(container);
    
    // Clone the element and expand all collapsed content
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Preserve the exact state as seen on screen
    // Add CSS rules for proper rendering without changing visibility
    const styleRules = document.createElement('style');
    styleRules.textContent = `
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    `;
    container.appendChild(styleRules);
    
    container.appendChild(clonedElement);
    
    // Render to canvas
    const canvas = await html2canvas(container, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    // Remove the temporary container
    document.body.removeChild(container);
    
    // Convert canvas to image data
    const imgData = canvas.toDataURL('image/png');
    
    // Calculate dimensions
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add pages as needed
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    
    while (heightLeft > (pdfHeight - 2 * margin)) {
      position = (pdfHeight - 2 * margin);
      heightLeft -= position;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, margin - heightLeft, imgWidth, imgHeight);
    }
    
    // Save the PDF
    pdf.save(`${filename}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating multi-page PDF:', error);
    return false;
  }
};