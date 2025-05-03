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
    const imgHeight = imgWidth * ratio;
    
    console.log("PDF dimensions:", pdfWidth, "x", pdfHeight);
    console.log("Image dimensions:", imgWidth, "x", imgHeight);
    
    // Check if content fits on a single page or needs multiple pages
    if (imgHeight <= pdfHeight - 20) {
      // Content fits on a single page
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    } else {
      // Content is too tall for a single page, so we'll use a multi-page approach
      console.log("Content is too tall for a single page, using multi-page approach");
      
      // Calculate the height of content that can fit on the first page
      const firstPageImgHeight = pdfHeight - 20; // Leave 20mm total margin
      
      // Create a temporary canvas for just the first page portion
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        throw new Error("Failed to get canvas context");
      }
      
      // Set canvas dimensions to match the source image for the first page
      tempCanvas.width = canvas.width;
      tempCanvas.height = (firstPageImgHeight / imgHeight) * canvas.height;
      
      // Draw the first portion of the original canvas
      tempCtx.drawImage(
        canvas, 
        0, 0, canvas.width, tempCanvas.height,
        0, 0, tempCanvas.width, tempCanvas.height
      );
      
      // Add this portion to first page
      const firstPageImgData = tempCanvas.toDataURL('image/png');
      pdf.addImage(firstPageImgData, 'PNG', 10, 10, imgWidth, firstPageImgHeight);
      
      // Calculate how many additional pages we need
      const remainingHeight = imgHeight - firstPageImgHeight;
      const additionalPagesCount = Math.ceil(remainingHeight / (pdfHeight - 20));
      
      console.log(`Content requires ${additionalPagesCount + 1} pages total`);
      
      // Create additional pages for the remaining content
      let heightRendered = firstPageImgHeight;
      
      for (let i = 0; i < additionalPagesCount; i++) {
        // Add a new page
        pdf.addPage();
        
        // Calculate the height for this page
        const thisPageImgHeight = Math.min(pdfHeight - 20, imgHeight - heightRendered);
        
        // Calculate source y position in the original canvas
        const sourceY = (heightRendered / imgHeight) * canvas.height;
        const sourceHeight = (thisPageImgHeight / imgHeight) * canvas.height;
        
        // Create a temporary canvas for this page section
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        if (!pageCtx) {
          throw new Error("Failed to get page canvas context");
        }
        
        // Set canvas dimensions for this page section
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        
        // Draw the portion of the original canvas for this page
        pageCtx.drawImage(
          canvas, 
          0, sourceY, canvas.width, sourceHeight,
          0, 0, pageCanvas.width, pageCanvas.height
        );
        
        // Add this portion to the PDF
        const pageImgData = pageCanvas.toDataURL('image/png');
        pdf.addImage(pageImgData, 'PNG', 10, 10, imgWidth, thisPageImgHeight);
        
        // Update how much height we've rendered
        heightRendered += thisPageImgHeight;
        
        console.log(`Added page ${i + 2}, rendered ${heightRendered}px of ${imgHeight}px total`);
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
    
    // Check if the content fits in a single page
    if (imgHeight <= firstPageContentHeight) {
      // Content fits on a single page, just add it
      pdf.addImage(imgData, 'JPEG', margin, headerHeight, imgWidth, imgHeight);
    } else {
      // Content requires multiple pages
      const totalPages = Math.ceil((imgHeight - firstPageContentHeight) / subsequentPageContentHeight) + 1;
      console.log(`Multi-page PDF: Content requires ${totalPages} pages`);
      
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
          
          console.log(`Added page ${page + 1} of ${totalPages}, remaining height: ${remainingHeight}px`);
        }
      }
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