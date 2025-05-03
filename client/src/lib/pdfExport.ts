import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

/**
 * Exports a DOM element to a PDF with proper handling of expanded accordion sections
 * 
 * @param elementId ID of the element to export
 * @param title PDF title
 * @param filename Filename for the PDF (without extension)
 * @param onSuccess Success callback
 * @param onError Error callback
 */
export const exportElementToPdf = async (
  elementId: string,
  title: string,
  filename: string,
  onSuccess: (filename: string) => void,
  onError: (error: Error) => void
) => {
  try {
    // Get the original element
    const originalElement = document.getElementById(elementId);
    if (!originalElement) {
      onError(new Error(`Element with ID "${elementId}" not found`));
      return;
    }
    
    // Create a clone that we can modify without affecting the original
    const clone = originalElement.cloneNode(true) as HTMLElement;
    clone.id = `${elementId}-pdf-clone`;
    clone.style.position = "absolute";
    clone.style.left = "-9999px";
    clone.style.top = "-9999px";
    clone.style.width = `${originalElement.offsetWidth}px`;
    document.body.appendChild(clone);
    
    try {
      // Process all expanded accordions in the clone to ensure they display correctly
      const expandedAccordions = clone.querySelectorAll('[data-state="open"]');
      expandedAccordions.forEach(accordion => {
        // Find the content panel
        const content = accordion.querySelector('[data-orientation="vertical"]');
        if (content) {
          // Force the content to be visible with !important flags
          (content as HTMLElement).style.cssText = `
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            position: static !important;
            transform: none !important;
          `;
          
          // Also make child elements visible
          content.querySelectorAll('*').forEach(child => {
            if (child instanceof HTMLElement) {
              // Get computed style to preserve current display mode
              const computedStyle = window.getComputedStyle(child);
              const displayValue = computedStyle.display === 'none' ? 'block' : computedStyle.display;
              
              // Apply visibility styles
              child.style.cssText += `
                display: ${displayValue} !important;
                visibility: visible !important;
                opacity: 1 !important;
              `;
            }
          });
        }
      });
      
      // Handle special styling for PDF-specific elements
      // Make PDF-only elements visible
      clone.querySelectorAll('.html2canvas-show').forEach(el => {
        (el as HTMLElement).style.display = 'block';
      });
      
      // Hide screen-only elements
      clone.querySelectorAll('.html2canvas-hide').forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
      
      // Handle form elements to display their values correctly in PDF
      const formInputs = clone.querySelectorAll('input, textarea');
      formInputs.forEach(input => {
        const originalInput = originalElement.querySelector(`#${input.id}`) as HTMLInputElement;
        if (originalInput && originalInput.value) {
          (input as HTMLElement).setAttribute('data-pdf-value', originalInput.value);
        }
      });
      
      // Handle select elements specially
      const selectElements = clone.querySelectorAll('select');
      selectElements.forEach(select => {
        const originalSelect = originalElement.querySelector(`#${select.id}`) as HTMLSelectElement;
        if (originalSelect && originalSelect.selectedOptions[0]) {
          // Create a text representation next to the select
          const textDiv = document.createElement('div');
          textDiv.className = 'pdf-select-value';
          textDiv.textContent = originalSelect.selectedOptions[0].text;
          select.parentNode?.insertBefore(textDiv, select.nextSibling);
          
          // Hide the actual select
          (select as HTMLElement).style.display = 'none';
        }
      });
      
      // Wait for the DOM to process changes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      // Add title and header
      pdf.setFontSize(16);
      pdf.setTextColor(33, 37, 41);
      pdf.text(title, 105, 20, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setTextColor(85, 85, 85);
      pdf.text(`Generated on ${format(new Date(), "MMMM d, yyyy")}`, 14, 30);
      
      // Add separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(14, 38, 196, 38);
      
      // Capture the clone with html2canvas
      const canvas = await html2canvas(clone, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: true,
      });
      
      // Calculate dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Constants for positioning
      const headerOffset = 40; // Space for the header
      const footerHeight = 15; // Space for the footer
      const margin = 10; // Margin on each side
      
      // Calculate image dimensions
      const imgWidth = pdfWidth - (2 * margin);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Calculate available space on first page
      const firstPageContentHeight = pdfHeight - headerOffset - footerHeight;
      
      if (imgHeight <= firstPageContentHeight) {
        // Content fits on single page
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          margin, headerOffset,
          imgWidth, imgHeight
        );
        
        // Add page number
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Page 1 of 1', pdfWidth / 2, pdfHeight - (footerHeight / 2), { align: 'center' });
      } else {
        // Multi-page document
        // Calculate total pages needed
        let remainingHeight = imgHeight;
        let totalPages = 1;
        
        // First page has less space due to header
        remainingHeight -= firstPageContentHeight;
        
        if (remainingHeight > 0) {
          // Space for content on subsequent pages
          const contentHeightPerPage = pdfHeight - (2 * margin) - footerHeight;
          totalPages += Math.ceil(remainingHeight / contentHeightPerPage);
        }
        
        // First page positioning
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          margin, headerOffset, 
          imgWidth, imgHeight,
          '', // alias - not needed
          'SLOW' // compression - use SLOW for better quality
        );
        
        // Add page number to first page
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page 1 of ${totalPages}`, pdfWidth / 2, pdfHeight - (footerHeight / 2), { align: 'center' });
        
        // Add remaining pages as needed
        let currentPage = 1;
        let position = headerOffset - firstPageContentHeight;
        
        while (currentPage < totalPages) {
          pdf.addPage();
          currentPage++;
          
          // Position is negative to continue from previous page
          pdf.addImage(
            canvas.toDataURL('image/jpeg', 0.95),
            'JPEG',
            margin, position,
            imgWidth, imgHeight,
            '',
            'SLOW'
          );
          
          // Update position for next page
          position -= (pdfHeight - (2 * margin) - footerHeight);
          
          // Add page number
          pdf.setFontSize(10);
          pdf.setTextColor(150, 150, 150);
          pdf.text(`Page ${currentPage} of ${totalPages}`, pdfWidth / 2, pdfHeight - (footerHeight / 2), { align: 'center' });
        }
      }
      
      // Add footer to all pages
      for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
        pdf.setPage(i);
        
        // Add separator line above footer
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, pdfHeight - footerHeight, pdfWidth - margin, pdfHeight - footerHeight);
        
        // Add footer text
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Lean Six Sigma DMAIC Suite™', 14, pdfHeight - 5);
      }
      
      // Generate safe filename
      const safeFilename = filename.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').substring(0, 50);
      const fullFilename = `${safeFilename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      // Save the PDF
      pdf.save(fullFilename);
      
      // Call success callback
      onSuccess(fullFilename);
    } catch (error) {
      // Call error callback
      onError(error instanceof Error ? error : new Error('Unknown error during PDF generation'));
    } finally {
      // Always clean up the clone
      if (clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
    }
  } catch (error) {
    // Call error callback for any outer errors
    onError(error instanceof Error ? error : new Error('Unknown error during PDF setup'));
  }
};