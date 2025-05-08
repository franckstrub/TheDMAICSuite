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

// Generate a mitigation plan using Google Generative AI
export async function generateMitigationPlan(
  riskName: string,
  probability: string,
  impact: string
): Promise<string> {
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
    
    console.log("Using Google AI API to generate a mitigation plan");
    
    // Create a generative model instance - using Gemini Pro
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
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

    console.log("Sending request to Google AI API...");
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Response received from Google AI API");
    
    return text;
  } catch (error: any) {
    console.error('Error generating mitigation plan with Google AI:', error);
    
    // Detailed error handling based on common API errors
    if (error.status === 401 || error.status === 403) {
      throw new Error('Authentication failed: Invalid API key. Please check your GOOGLE_API_KEY environment variable.');
    } else if (error.status === 400) {
      throw new Error(`Bad request: ${error.message || 'Check if the model name is correct and the request format is valid.'}`);
    } else if (error.status === 404) {
      throw new Error('Resource not found: The specified model may not exist or be available.');
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded: Too many requests in a given amount of time.');
    } else if (error.status >= 500) {
      throw new Error('Server error: The API is experiencing issues. Please try again later.');
    } else {
      console.error('Full error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to generate mitigation plan: ${error.message || 'Unknown error'}`);
    }
  }
}