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
        
        // Mark the container for special CSS styling
        const chartElement = clonedDoc.querySelector('#' + elementId);
        if (chartElement) {
          chartElement.classList.add('html2canvas-container');
        }
        
        // Handle select elements
        const selectContainers = clonedDoc.querySelectorAll('.html2canvas-hide');
        selectContainers.forEach(container => {
          container.classList.add('pdf-hidden');
          (container as HTMLElement).style.display = 'none';
        });
        
        // Enhanced approach to hide the standalone FTE Benefits summary (0.13 FTE (€12,500))
        // First, find the hidden input with the FTE summary value
        const fteBenefitsInput = clonedDoc.getElementById('fteBenefits');
        if (fteBenefitsInput) {
          (fteBenefitsInput as HTMLElement).style.display = 'none';
          console.log("Hiding fteBenefits input field");
        }
        
        // Find elements that have the hide-in-pdf-fte-summary class or data-no-pdf attribute
        const elementsToHide = clonedDoc.querySelectorAll('.hide-in-pdf-fte-summary, [data-no-pdf="true"]');
        elementsToHide.forEach(el => {
          (el as HTMLElement).style.display = 'none';
          console.log("Hiding PDF-excluded element");
        });
        
        // Next, find any elements that directly display the FTE summary text
        const fteBenefitSummaryRegex = /^\s*\d+\.\d+\s+FTE\s+\(\s*[€$£¥][\d,\.]+\s*\)\s*$/;
        const fteBenefitSummaryElements = Array.from(clonedDoc.querySelectorAll('div, p, span'));
        
        fteBenefitSummaryElements.forEach(element => {
          // If the element contains just the FTE pattern and nothing else substantial
          if (element.textContent && 
              fteBenefitSummaryRegex.test(element.textContent.trim()) && 
              element.textContent.trim().length < 30) {
              
            (element as HTMLElement).style.display = 'none';
            console.log("Hiding FTE summary element in PDF:", element.textContent);
            
            // Also hide parent if it's a simple container
            if (element.parentNode && 
                (element.parentNode as HTMLElement).children.length <= 2) {
              (element.parentNode as HTMLElement).style.display = 'none';
            }
          }
        });
        
        // Make sure html2canvas-show elements are visible
        const showElements = clonedDoc.querySelectorAll('.html2canvas-show');
        showElements.forEach(el => {
          el.classList.add('pdf-visible');
          (el as HTMLElement).style.display = 'block';
          (el as HTMLElement).style.visibility = 'visible';
          (el as HTMLElement).style.opacity = '1';
        });
        
        // Fix for title overlapping with input fields in PDF
        const labels = clonedDoc.querySelectorAll('label');
        labels.forEach(label => {
          label.style.display = 'block';
          label.style.marginBottom = '8px';
          label.style.fontWeight = '500';
          label.style.clear = 'both';
        });
        
        // Add spacing between input fields and their labels
        const inputs = clonedDoc.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          input.style.marginTop = '4px';
          input.style.display = 'block';
          input.style.width = '100%';
        });
        
        // Ensure plain text representations in PDF are styled properly
        const plainTextElements = clonedDoc.querySelectorAll('.html2canvas-show');
        plainTextElements.forEach(el => {
          // Apply more compact padding and styling for text boxes
          (el as HTMLElement).style.padding = '0.25rem 0.5rem';
          (el as HTMLElement).style.border = '1px solid #e2e8f0';
          (el as HTMLElement).style.borderRadius = '0.25rem';
          (el as HTMLElement).style.backgroundColor = 'white';
          (el as HTMLElement).style.marginTop = '2px';
          (el as HTMLElement).style.marginBottom = '2px';
          (el as HTMLElement).style.color = '#1e293b'; 
          (el as HTMLElement).style.fontSize = '0.875rem';
          (el as HTMLElement).style.lineHeight = '1rem'; // Reduced line height
          (el as HTMLElement).style.minHeight = '1.4rem'; // Ensure minimum height
          (el as HTMLElement).style.height = 'auto'; // Let height adjust to content
          (el as HTMLElement).style.overflow = 'visible'; // Ensure text isn't cut off
        });
        
        console.log("Document cloned and styled for canvas rendering with improved select element handling");
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
    let imgHeight = imgWidth * ratio;
    
    console.log("PDF dimensions:", pdfWidth, "x", pdfHeight);
    console.log("Canvas dimensions:", canvas.width, "x", canvas.height);
    console.log("Image dimensions:", imgWidth, "x", imgHeight);
    
    // Validate image dimensions to prevent scaling errors
    if (!isFinite(imgHeight) || isNaN(imgHeight) || imgHeight <= 0) {
      console.warn("Invalid image height detected:", imgHeight);
      console.warn("Adjusting to safe default value");
      imgHeight = pdfHeight - 20; // Use safe default
    }
    
    // Check if content fits on a single page or needs multiple pages
    try {
      if (imgHeight <= pdfHeight - 20) {
        // Content fits on a single page
        console.log("Single page content - standard approach");
        pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
      } else {
        // Content is too tall for a single page, handle with care
        console.log("Multi-page content - using segmented approach");
        
        // Safe approach: Create separate image for each page
        // First page
        const firstPageHeight = pdfHeight - 20; // Leave margin
        
        // Calculate what portion of the canvas to render on first page
        const firstPagePortionHeight = Math.min(canvas.height, (firstPageHeight / imgHeight) * canvas.height);
        
        // Create a temporary canvas for the first page
        const firstPageCanvas = document.createElement('canvas');
        firstPageCanvas.width = canvas.width;
        firstPageCanvas.height = firstPagePortionHeight;
        
        // Get the context and draw the appropriate portion
        const firstPageCtx = firstPageCanvas.getContext('2d');
        if (!firstPageCtx) {
          throw new Error("Could not get canvas context");
        }
        
        // Draw the first portion
        firstPageCtx.drawImage(
          canvas,
          0, 0, canvas.width, firstPagePortionHeight,
          0, 0, firstPageCanvas.width, firstPageCanvas.height
        );
        
        // Convert to image and add to first page
        const firstPageImage = firstPageCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(firstPageImage, 'JPEG', 10, 10, imgWidth, firstPageHeight);
        
        // If we need additional pages
        if (firstPagePortionHeight < canvas.height) {
          // Calculate how many additional pages needed
          const remainingCanvasHeight = canvas.height - firstPagePortionHeight;
          const heightPerPage = (pdfHeight - 20) / imgHeight * canvas.height;
          const additionalPagesNeeded = Math.ceil(remainingCanvasHeight / heightPerPage);
          
          console.log(`Content requires ${additionalPagesNeeded + 1} pages total`);
          console.log(`First page shows ${firstPagePortionHeight}px of ${canvas.height}px total`);
          
          // Track position in the canvas
          let canvasYPosition = firstPagePortionHeight;
          
          // Create each additional page
          for (let i = 0; i < additionalPagesNeeded; i++) {
            // Create a new page
            pdf.addPage();
            
            // Calculate height for this page's portion
            const remainingHeight = canvas.height - canvasYPosition;
            const thisPageCanvasHeight = Math.min(heightPerPage, remainingHeight);
            const thisPagePdfHeight = (thisPageCanvasHeight / canvas.height) * imgHeight;
            
            // Create a canvas for this page's portion
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = thisPageCanvasHeight;
            
            // Draw this portion
            const pageCtx = pageCanvas.getContext('2d');
            if (!pageCtx) {
              continue; // Skip this page if context fails
            }
            
            pageCtx.drawImage(
              canvas,
              0, canvasYPosition, canvas.width, thisPageCanvasHeight,
              0, 0, pageCanvas.width, pageCanvas.height
            );
            
            // Convert to image and add to PDF
            const pageImage = pageCanvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(pageImage, 'JPEG', 10, 10, imgWidth, thisPagePdfHeight);
            
            // Update position for next page
            canvasYPosition += thisPageCanvasHeight;
            
            console.log(`Added page ${i + 2}, rendered up to ${canvasYPosition}px of ${canvas.height}px total`);
          }
        }
      }
    } catch (pdfError) {
      // Log the error
      console.error("Error during PDF generation:", pdfError);
      
      // Fall back to simplest approach
      console.warn("Using fallback approach for PDF generation");
      
      try {
        // Reset PDF
        pdf.deletePage(1);
        pdf.addPage();
        
        // Use a simpler method - just scale down content to fit on one page if needed
        const safeHeight = Math.min(imgHeight, pdfHeight - 20);
        
        // Add image with safe dimensions
        pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, safeHeight);
        
        console.log("Used fallback method with height:", safeHeight);
      } catch (fallbackError) {
        console.error("Fallback method failed:", fallbackError);
        
        // Last resort method
        pdf.setFontSize(14);
        pdf.text("Error generating PDF. Try collapsing the financial metrics section.", 20, 20);
      }
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
      foreignObjectRendering: false,
      onclone: (clonedDoc) => {
        // Mark container for special styling
        clonedElement.classList.add('html2canvas-container');
        
        // Handle select elements
        const selectContainers = clonedDoc.querySelectorAll('.html2canvas-hide');
        selectContainers.forEach(container => {
          container.classList.add('pdf-hidden');
          (container as HTMLElement).style.display = 'none';
        });
        
        // Enhanced approach to hide the standalone FTE Benefits summary (0.13 FTE (€12,500))
        // First, find the hidden input with the FTE summary value
        const fteBenefitsInput = clonedDoc.getElementById('fteBenefits');
        if (fteBenefitsInput) {
          (fteBenefitsInput as HTMLElement).style.display = 'none';
          console.log("Hiding fteBenefits input field");
        }
        
        // Find elements that have the hide-in-pdf-fte-summary class or data-no-pdf attribute
        const elementsToHide = clonedDoc.querySelectorAll('.hide-in-pdf-fte-summary, [data-no-pdf="true"]');
        elementsToHide.forEach(el => {
          (el as HTMLElement).style.display = 'none';
          console.log("Hiding PDF-excluded element");
        });
        
        // Next, find any elements that directly display the FTE summary text
        const fteBenefitSummaryRegex = /^\s*\d+\.\d+\s+FTE\s+\(\s*[€$£¥][\d,\.]+\s*\)\s*$/;
        const fteBenefitSummaryElements = Array.from(clonedDoc.querySelectorAll('div, p, span'));
        
        fteBenefitSummaryElements.forEach(element => {
          // If the element contains just the FTE pattern and nothing else substantial
          if (element.textContent && 
              fteBenefitSummaryRegex.test(element.textContent.trim()) && 
              element.textContent.trim().length < 30) {
              
            (element as HTMLElement).style.display = 'none';
            console.log("Hiding FTE summary element in PDF:", element.textContent);
            
            // Also hide parent if it's a simple container
            if (element.parentNode && 
                (element.parentNode as HTMLElement).children.length <= 2) {
              (element.parentNode as HTMLElement).style.display = 'none';
            }
          }
        });
        
        // Make sure html2canvas-show elements are visible
        const showElements = clonedDoc.querySelectorAll('.html2canvas-show');
        showElements.forEach(el => {
          el.classList.add('pdf-visible');
          (el as HTMLElement).style.display = 'block';
          (el as HTMLElement).style.visibility = 'visible';
          (el as HTMLElement).style.opacity = '1';
        });
        
        // Ensure plain text representations in PDF are styled properly
        showElements.forEach(el => {
          // Apply more compact padding and styling for text boxes
          (el as HTMLElement).style.padding = '0.25rem 0.5rem';
          (el as HTMLElement).style.border = '1px solid #e2e8f0';
          (el as HTMLElement).style.borderRadius = '0.25rem';
          (el as HTMLElement).style.backgroundColor = 'white';
          (el as HTMLElement).style.marginTop = '2px';
          (el as HTMLElement).style.marginBottom = '2px';
          (el as HTMLElement).style.color = '#1e293b'; 
          (el as HTMLElement).style.fontSize = '0.875rem';
          (el as HTMLElement).style.lineHeight = '1rem'; // Reduced line height
          (el as HTMLElement).style.minHeight = '1.4rem'; // Ensure minimum height
          (el as HTMLElement).style.height = 'auto'; // Let height adjust to content
          (el as HTMLElement).style.overflow = 'visible'; // Ensure text isn't cut off
        });
      }
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
    
    // Validate image dimensions
    if (!isFinite(imgHeight) || isNaN(imgHeight) || imgHeight <= 0) {
      console.warn("Invalid image height in multi-page export:", imgHeight);
      // Use a safe default height
      const safeHeight = Math.min(canvas.height / 2, pdfHeight - headerHeight - footerHeight);
      pdf.addImage(imgData, 'JPEG', margin, headerHeight, imgWidth, safeHeight);
      
      console.log("Used safe image dimensions for PDF");
      // Add a note about collapsed view
      pdf.setFontSize(9);
      pdf.setTextColor(150, 150, 150);
      pdf.text("Note: For best results, try collapsing the financial metrics section.", margin, pdfHeight - 5);
    }
    // Check if the content fits in a single page
    else if (imgHeight <= firstPageContentHeight) {
      // Content fits on a single page, just add it
      console.log("Single page content - using direct approach");
      pdf.addImage(imgData, 'JPEG', margin, headerHeight, imgWidth, imgHeight);
    } 
    // For multi-page content, use a try-catch to handle potential scaling issues
    else {
      try {
        console.log("Multi-page content - using safe segmented approach");
        
        // Break the content into sections with separate canvases to avoid scaling errors
        
        // First page - top portion
        const firstPageCanvasHeight = (firstPageContentHeight / imgHeight) * canvas.height;
        const firstPageCanvas = document.createElement('canvas');
        firstPageCanvas.width = canvas.width;
        firstPageCanvas.height = firstPageCanvasHeight;
        
        // Draw first page content
        const firstPageCtx = firstPageCanvas.getContext('2d');
        if (!firstPageCtx) {
          throw new Error("Could not get canvas context");
        }
        
        // Draw first page portion
        firstPageCtx.drawImage(
          canvas,
          0, 0, canvas.width, firstPageCanvasHeight,
          0, 0, firstPageCanvas.width, firstPageCanvas.height
        );
        
        // Add to PDF
        const firstPageImage = firstPageCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(firstPageImage, 'JPEG', margin, headerHeight, imgWidth, firstPageContentHeight);
        
        // Calculate remaining content
        const remainingCanvasHeight = canvas.height - firstPageCanvasHeight;
        
        // If we have more content to show, add additional pages
        if (remainingCanvasHeight > 0) {
          // Calculate how many more pages we need
          const canvasHeightPerPage = (subsequentPageContentHeight / imgHeight) * canvas.height;
          const additionalPagesNeeded = Math.ceil(remainingCanvasHeight / canvasHeightPerPage);
          
          console.log(`Multi-page PDF: Requires ${additionalPagesNeeded + 1} total pages`);
          
          // Track our position in the canvas
          let canvasYPosition = firstPageCanvasHeight;
          
          // Create each additional page
          for (let page = 1; page <= additionalPagesNeeded; page++) {
            // Add a new page
            pdf.addPage();
            
            // Calculate the content for this page
            const pageRemainingHeight = canvas.height - canvasYPosition;
            const pageCanvasHeight = Math.min(canvasHeightPerPage, pageRemainingHeight);
            const pagePdfHeight = Math.min(subsequentPageContentHeight, (pageCanvasHeight / canvas.height) * imgHeight);
            
            // Create a canvas for just this page's content
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = pageCanvasHeight;
            
            // Draw this page's content
            const pageCtx = pageCanvas.getContext('2d');
            if (!pageCtx) {
              console.warn(`Could not get context for page ${page + 1}`);
              continue;
            }
            
            // Draw the appropriate portion for this page
            pageCtx.drawImage(
              canvas,
              0, canvasYPosition, canvas.width, pageCanvasHeight,
              0, 0, pageCanvas.width, pageCanvas.height
            );
            
            // Convert to image and add to PDF
            const pageImage = pageCanvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(pageImage, 'JPEG', margin, margin, imgWidth, pagePdfHeight);
            
            // Update for next page
            canvasYPosition += pageCanvasHeight;
            
            console.log(`Added page ${page + 1}, position: ${canvasYPosition}/${canvas.height}`);
          }
        }
      } catch (pageError) {
        console.error("Error in multi-page PDF generation:", pageError);
        
        // If we encounter an error, use the simplest approach
        pdf.deletePage(1);
        pdf.addPage();
        
        // Use simple scaling approach instead
        const safeHeight = Math.min(imgHeight, pdfHeight - 20);
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, safeHeight);
        
        // Add note about error recovery
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text("Note: For best results, try collapsing the financial metrics section.", margin, pdfHeight - 5);
        
        console.log("Used fallback approach for PDF generation");
      }
    }
    
    // Add page numbers and footer to all pages
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Add page number
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Page ${i} of ${pageCount}`, pdfWidth / 2, pdfHeight - (footerHeight / 2), { align: 'center' });
      
      // Add a separator line above footer
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, pdfHeight - footerHeight, pdfWidth - margin, pdfHeight - footerHeight);
      
      // Add footer text
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Lean Six Sigma DMAIC Suite™', 14, pdfHeight - 5);
    }
    
    // Footer already added in previous step - no need to add it twice
    
    // Save the PDF
    pdf.save(`${filename}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating multi-page PDF:', error);
    return false;
  }
};