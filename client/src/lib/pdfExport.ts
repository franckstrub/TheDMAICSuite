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
  onError: (error: Error) => void,
  projectImage?: string // Optional project image URL
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
      
      // Special handling for project images
      const projectImages = clone.querySelectorAll('img');
      projectImages.forEach(img => {
        // Ensure images are visible and have proper dimensions
        const originalImg = originalElement.querySelector(`img[src="${img.getAttribute('src')}"]`) as HTMLImageElement;
        if (originalImg) {
          img.style.maxHeight = 'none';
          img.style.maxWidth = '100%';
          img.style.width = 'auto';
          img.style.height = 'auto';
          img.style.display = 'block';
          img.style.visibility = 'visible';
          img.style.opacity = '1';
          img.crossOrigin = 'anonymous'; // Help with CORS issues
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
      
      // Get PDF page dimensions early
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // Margin on each side
      const headerOffset = 40; // Space for the header
      const footerHeight = 15; // Space for the footer
      
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
      
      // If a project image was provided, add it directly to the PDF
      if (projectImage) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = projectImage;
          
          // Create temporary canvas to convert image to data URL
          const tempCanvas = document.createElement('canvas');
          const ctx = tempCanvas.getContext('2d');
          
          // Wait for the image to load
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              // Set canvas dimensions to match image
              tempCanvas.width = img.width;
              tempCanvas.height = img.height;
              
              // Draw image to canvas
              ctx?.drawImage(img, 0, 0);
              resolve();
            };
            img.onerror = () => reject(new Error('Failed to load project image'));
            
            // Set a timeout to prevent hanging if the image never loads
            setTimeout(() => resolve(), 3000);
          });
          
          // Calculate dimensions for the image in the PDF
          const maxWidth = 80; // mm
          const imgRatio = img.height / img.width;
          const imgWidth = Math.min(maxWidth, pdfWidth - (2 * margin));
          const imgHeight = imgWidth * imgRatio;
          
          // Add image to PDF
          pdf.addImage(
            tempCanvas.toDataURL('image/jpeg', 0.95),
            'JPEG',
            pdfWidth - imgWidth - margin, // Right-aligned
            headerOffset, // Below header
            imgWidth,
            imgHeight
          );
          
          console.log('Project image added to PDF successfully');
        } catch (error) {
          console.error('Failed to add project image to PDF:', error);
          // Continue with PDF generation even if image fails
        }
      }
      
      // Give the browser a moment to properly render images
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Capture the clone with html2canvas
      const canvas = await html2canvas(clone, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0, // No timeout for images
        backgroundColor: "#ffffff", 
        logging: false,
        onclone: (clonedDoc) => {
          // Additional processing on the cloned document if needed
          // Get the cloned images and ensure they're set to complete
          const images = clonedDoc.querySelectorAll('img');
          images.forEach(img => {
            img.setAttribute('crossOrigin', 'anonymous');
            img.style.maxHeight = 'none';
            img.style.display = 'block';
          });
        }
      });
      
      // Calculate dimensions (already defined earlier)
      
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