import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Google Generative AI client with proper API key validation
let genAI: GoogleGenerativeAI | null = null;
if (process.env.GOOGLE_AI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
}

// Validate API key presence at startup
if (!process.env.GOOGLE_AI_API_KEY) {
  console.warn('Warning: GOOGLE_AI_API_KEY is missing. API calls will fail.');
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
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY is not set in environment variables');
      throw new Error('GOOGLE_AI_API_KEY is missing. Please make sure it is set in your environment variables.');
    }
    
    // Check if Google AI client was initialized
    if (!genAI) {
      throw new Error('Google AI client not initialized. Check your API key.');
    }
    
    console.log("Using Google AI API to generate a mitigation plan");
    
    // Create a generative model instance - using Gemini Flash for better rate limits
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
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

    // The prompt to send to Google AI - shortened to reduce token usage
    const prompt = `Create a concise risk mitigation plan for:

Risk: ${riskName}
Probability: ${probability}
Impact: ${impact}

Provide:
1. Mitigation Strategies
2. Monitoring Procedures

Be specific and actionable. Keep it concise like you were writing an X (Twitter) post - brief but informative.`;

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

// Generate an elevator speech using Google Generative AI
export async function generateElevatorSpeech(
  projectTitle: string,
  problemStatement: string,
  goals: string,
  businessCase: string
): Promise<string> {
  try {
    console.log(`Generating elevator speech for project: "${projectTitle}"`);
    
    // Check if API key is available
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY is not set in environment variables');
      throw new Error('GOOGLE_AI_API_KEY is missing. Please make sure it is set in your environment variables.');
    }
    
    // Check if Google AI client was initialized
    if (!genAI) {
      throw new Error('Google AI client not initialized. Check your API key.');
    }
    
    console.log("Using Google AI API to generate an elevator speech");
    
    // Create a generative model instance
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
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
    const prompt = `Create a compelling 60-second elevator speech for this Lean Six Sigma project:

Project: ${projectTitle}
Problem: ${problemStatement}
Goals: ${goals}
Business Case: ${businessCase}

Create a persuasive elevator speech that:
- Hooks the listener immediately
- Clearly states the problem and solution
- Highlights business impact and benefits
- Ends with a clear call to action
- Is conversational and confident

Keep it under 150 words.`;

    console.log("Sending request to Google AI API for elevator speech...");
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Elevator speech response received from Google AI API");
    
    return text;
  } catch (error: any) {
    console.error('Error generating elevator speech with Google AI:', error);
    
    // Detailed error handling based on common API errors
    if (error.status === 401 || error.status === 403) {
      throw new Error('Authentication failed: Invalid API key. Please check your GOOGLE_AI_API_KEY environment variable.');
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
      throw new Error(`Failed to generate elevator speech: ${error.message || 'Unknown error'}`);
    }
  }
}

// Generate a stakeholder engagement strategy using Google Generative AI
export async function generateEngagementStrategy(
  stakeholderName: string,
  stakeholderRole: string,
  interestLevel: string,
  influenceLevel: string,
  supportLevel: string,
  resistanceType?: string
): Promise<string> {
  try {
    console.log(`Generating engagement strategy for stakeholder: "${stakeholderName}" (${stakeholderRole})`);
    
    // Check if API key is available
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY is not set in environment variables');
      throw new Error('GOOGLE_AI_API_KEY is missing. Please make sure it is set in your environment variables.');
    }
    
    // Check if Google AI client was initialized
    if (!genAI) {
      throw new Error('Google AI client not initialized. Check your API key.');
    }
    
    console.log("Using Google AI API to generate engagement strategy");
    
    // Create a generative model instance
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
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

    // Build the prompt based on stakeholder attributes
    const resistanceInfo = supportLevel === 'Resistant' && resistanceType 
      ? ` They show ${resistanceType.toLowerCase()} resistance.` 
      : '';

    const prompt = `Create a concise stakeholder engagement strategy for:

Stakeholder: ${stakeholderName}
Role: ${stakeholderRole}
Interest Level: ${interestLevel}
Influence Level: ${influenceLevel}
Support Level: ${supportLevel}${resistanceInfo}

Provide a specific, actionable engagement strategy considering their level of interest, influence, and current support. Include:
- Communication approach
- Frequency of engagement
- Key messages to emphasize

Keep it under 100 words and focus on practical actions.`;

    console.log("Sending request to Google AI API for engagement strategy...");
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Engagement strategy response received from Google AI API");
    
    return text;
  } catch (error: any) {
    console.error('Error generating engagement strategy with Google AI:', error);
    
    // Detailed error handling based on common API errors
    if (error.status === 401 || error.status === 403) {
      throw new Error('Authentication failed: Invalid API key. Please check your GOOGLE_AI_API_KEY environment variable.');
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
      throw new Error(`Failed to generate engagement strategy: ${error.message || 'Unknown error'}`);
    }
  }
}