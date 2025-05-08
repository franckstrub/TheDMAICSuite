import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Google Generative AI client with proper API key validation
let genAI: GoogleGenerativeAI | null = null;
if (process.env.GOOGLE_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
}

// Validate API key presence at startup
if (!process.env.GOOGLE_API_KEY) {
  console.warn('Warning: GOOGLE_API_KEY is missing. API calls will fail.');
}

// Helper function for delay with exponential backoff
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to parse retry delay from Google API error
function getRetryDelayFromError(error: any): number {
  try {
    if (error.errorDetails) {
      for (const detail of error.errorDetails) {
        if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
          const retryDelayStr = detail.retryDelay;
          if (retryDelayStr && retryDelayStr.endsWith('s')) {
            // Convert "13s" to number of milliseconds
            return parseInt(retryDelayStr.slice(0, -1), 10) * 1000;
          }
        }
      }
    }
  } catch (e) {
    console.error('Error parsing retry delay:', e);
  }
  
  // Default retry delay if we can't parse it from the error
  return 15000; // 15 seconds
}

// Function to create a simple fallback plan when API fails
function createFallbackPlan(
  riskName: string,
  probability: string,
  impact: string
): string {
  // This is a fallback plan to use when Google AI API is unavailable
  return `
## Recommended Mitigation Strategies
• Identify specific risk triggers and warning signs
• Create a clear response plan with defined responsibilities
• Establish regular risk review meetings
• Document lessons learned for future projects

## Risk-Specific Strategies
• Analyze root causes through process mapping and data analysis
• Implement preventative controls at key process points
• Create contingency plan for if the risk occurs
• Develop early warning indicators for proactive monitoring

## Monitoring and Review Procedures
• Schedule weekly checkpoints to assess risk status
• Document and track all risk-related incidents
• Regularly review effectiveness of mitigation actions
• Update the risk register with new information

Note: This is a generic mitigation plan generated as a fallback when the AI service is unavailable due to rate limiting. Please try again later for a customized plan.
`;
}

// Generate a mitigation plan using Google Generative AI with retry mechanism
export async function generateMitigationPlan(
  riskName: string,
  probability: string,
  impact: string
): Promise<string> {
  const maxRetries = 2; // Maximum number of retries
  let retryCount = 0;
  let lastError: any = null;
  
  try {
    console.log(`Generating mitigation plan for risk: "${riskName}" with probability: "${probability}" and impact: "${impact}"`);
    
    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY is not set in environment variables');
      throw new Error('GOOGLE_API_KEY is missing. Please make sure it is set in your environment variables.');
    }
    
    // Check if Google AI client was initialized
    if (!genAI) {
      throw new Error('Google AI client not initialized. Check your API key.');
    }
    
    // Create a generative model instance - using Gemini 1.0 Pro (more quota available)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    // The prompt to send to Google AI
    const prompt = `
    You are a risk management expert specializing in Six Sigma and project risk mitigation.
    Create a concise but effective mitigation plan for the following risk in a Six Sigma project:
    
    Risk Name: ${riskName}
    Probability: ${probability} (Low/Medium/High)
    Impact: ${impact} (Low/Medium/High)
    
    Format your response consistently with bullet points in clearly defined sections.
    DO NOT include any introductory or closing text - respond ONLY with the mitigation plan.
    Include the following sections:
    1. Recommended Mitigation Strategies
    2. Risk-Specific Strategies (based on the risk type)
    3. Monitoring and Review Procedures
    
    The mitigation plan should be specific to this risk, considering its probability and impact level.`;

    // Retry loop
    while (retryCount <= maxRetries) {
      try {
        console.log(`Attempt ${retryCount + 1}/${maxRetries + 1}: Sending request to Google AI API...`);
        
        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log("Success: Response received from Google AI API");
        return text;
        
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${retryCount + 1}/${maxRetries + 1} failed:`, error);
        
        // If we hit a rate limit error, we can try to retry after the suggested delay
        if (error.status === 429 && retryCount < maxRetries) {
          const retryDelay = getRetryDelayFromError(error);
          console.log(`Rate limit hit. Retrying in ${retryDelay/1000} seconds...`);
          await delay(retryDelay);
          retryCount++;
        } else {
          // Other errors or we've hit max retries, break out of the loop
          break;
        }
      }
    }
    
    // If we've exhausted all retries or hit a non-retryable error
    console.error('All retries failed or non-retryable error occurred:', lastError);
    
    // Detailed error handling based on common API errors
    if (lastError.status === 401 || lastError.status === 403) {
      throw new Error('Authentication failed: Invalid API key. Please check your GOOGLE_API_KEY environment variable.');
    } else if (lastError.status === 400) {
      throw new Error(`Bad request: ${lastError.message || 'Check if the model name is correct and the request format is valid.'}`);
    } else if (lastError.status === 404) {
      throw new Error('Resource not found: The specified model may not exist or be available.');
    } else if (lastError.status === 429) {
      console.log("Rate limit exceeded. Using fallback plan instead.");
      return createFallbackPlan(riskName, probability, impact);
    } else if (lastError.status >= 500) {
      throw new Error('Server error: The API is experiencing issues. Please try again later.');
    } else {
      console.error('Full error details:', JSON.stringify(lastError, null, 2));
      throw new Error(`Failed to generate mitigation plan: ${lastError.message || 'Unknown error'}`);
    }
    
  } catch (error: any) {
    console.error('Error in generateMitigationPlan function:', error);
    
    // If this is a rate limit error, return the fallback plan
    if (error.status === 429 || (error.message && error.message.includes('rate limit'))) {
      console.log("Using fallback plan due to rate limiting");
      return createFallbackPlan(riskName, probability, impact);
    }
    
    // Rethrow the error for other error types
    throw error;
  }
}