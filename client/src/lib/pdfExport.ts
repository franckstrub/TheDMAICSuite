import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

/**
 * Exports a DOM element to a PDF file
 * @param elementId - The ID of the DOM element to export
 * @param filename - The filename for the exported PDF
 */
export const exportToPdf = async (elementId: string, filename: string) => {
  try {
    // Get the element to export
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with ID "${elementId}" not found`);
      return;
    }

    // Create a clone of the element to avoid modifying the original DOM
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Apply some styling for better PDF rendering
    clonedElement.style.width = element.offsetWidth + 'px';
    clonedElement.style.padding = '20px'; // Add some padding
    clonedElement.style.backgroundColor = 'white'; // Ensure white background
    
    // Temporarily append to body but make invisible
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    document.body.appendChild(clonedElement);

    // Show all collapsed sections for PDF export
    const collapsibleSections = clonedElement.querySelectorAll('.collapsible-section');
    collapsibleSections.forEach((section: Element) => {
      const content = section.querySelector('.collapsible-content') as HTMLElement;
      if (content) {
        content.style.display = 'block';
        content.style.height = 'auto';
        content.style.overflow = 'visible';
        content.style.opacity = '1';
      }
    });

    // Create canvas
    const canvas = await html2canvas(clonedElement, {
      scale: 2, // Higher scale for better quality
      useCORS: true, // Enable CORS for images
      logging: false, // Disable logging
      backgroundColor: '#ffffff' // White background
    });

    // Remove the clone from DOM
    document.body.removeChild(clonedElement);
    
    // Convert canvas to PDF
    const imgData = canvas.toDataURL('image/png');
    
    // Calculate PDF dimensions to match the aspect ratio of the element
    const imgWidth = 210; // A4 width in mm (portrait)
    const pageHeight = 297; // A4 height in mm (portrait)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;
    
    // Add pages if content is taller than one page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    let heightLeft = imgHeight;
    
    while (heightLeft > pageHeight) {
      position = heightLeft - pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Save the PDF
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
    
    // Show all collapsed sections for PDF export
    const collapsibleSections = clonedElement.querySelectorAll('.collapsible-section');
    collapsibleSections.forEach((section: Element) => {
      const content = section.querySelector('.collapsible-content') as HTMLElement;
      if (content) {
        content.style.display = 'block';
        content.style.height = 'auto';
        content.style.overflow = 'visible';
        content.style.opacity = '1';
      }
    });
    
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