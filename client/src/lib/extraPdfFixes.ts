/**
 * Extra PDF export fixes to handle specific elements
 * 
 * This file contains functions to enhance PDF export functionality
 * by addressing specific edge cases like hidden fields appearing
 * in exported documents.
 */

/**
 * Hides the FTE benefits field in PDF exports to prevent duplicate display
 * @param documentToModify - The cloned document being prepared for PDF export
 */
export function fixFteBenefitsInPdf(documentToModify: Document): void {
  // Hide the fteBenefits input field that contains text like "0.13 FTE (€12,500)"
  const fteBenefitsInput = documentToModify.querySelector('#fteBenefits');
  if (fteBenefitsInput) {
    // Explicitly hide with multiple CSS properties to ensure it's completely hidden
    const elem = fteBenefitsInput as HTMLElement;
    elem.style.display = 'none';
    elem.style.visibility = 'hidden';
    elem.style.position = 'absolute';
    elem.style.opacity = '0';
    elem.style.pointerEvents = 'none';
    elem.style.width = '0';
    elem.style.height = '0';
    elem.style.overflow = 'hidden';
    
    // Also add classes to ensure CSS selectors can target it
    elem.classList.add('pdf-hidden');
    elem.classList.add('html2canvas-hide');
    
    console.log('Successfully hid FTE benefits input field in PDF export');
  } else {
    console.log('FTE benefits input field not found in document');
  }
}