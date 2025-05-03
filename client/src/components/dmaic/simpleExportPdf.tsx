// Simple PDF export function for testing syntax

export const handleExportPdf = async () => {
  try {
    // Do something
    console.log("Starting PDF generation");
    
    try {
      // Try inner function
      console.log("Inner PDF generation");
    } catch (innerError) {
      // Handle inner error
      console.error("Inner error:", innerError);
      throw innerError;
    }
    
    // Success
    console.log("PDF Generated Successfully");
    
  } catch (error) {
    // Handle outer error
    console.error("Outer error:", error);
  }
};