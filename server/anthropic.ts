import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client with proper API key validation
// Only create the client if there's a valid API key
let anthropic: Anthropic | null = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

// Validate API key format at startup
if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
  console.warn('Warning: ANTHROPIC_API_KEY is missing or has incorrect format. API calls will fail.');
}

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
// Use the latest model for best results
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Generate an elevator speech for the project
export async function generateElevatorSpeech(
  charterData: any,
  customerRequirements: any,
  businessRequirements: any
): Promise<string> {
  try {
    console.log("Generating elevator speech using Claude...");
    
    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set in environment variables');
      throw new Error('ANTHROPIC_API_KEY is missing. Please make sure it is set in your environment variables.');
    }
    
    // Check if anthropic client was initialized
    if (!anthropic) {
      throw new Error('Anthropic client not initialized. Check your API key.');
    }
    
    console.log("Processing project data for elevator speech generation...");
    
    // Format project title and problem statement for clarity
    const projectTitle = charterData?.projectTitle || "the project";
    const problemStatement = charterData?.problemStatement || "No problem statement provided";
    const scope = charterData?.scope || "No scope provided";
    
    // Extract financial metrics for business impact
    const qualityCostSavings = charterData?.savingsPerYear || "0";
    const financialSavings = charterData?.financialSavings || "0";
    const fteBenefits = charterData?.fteBenefits || "0";
    const netValue = charterData?.projectNetValue || "0";
    const roi = charterData?.roi || "0%";
    
    // Format customer requirements for the voice of customer
    const formattedCustomerRequirements = Array.isArray(customerRequirements) 
      ? customerRequirements.map((req: any) => ({
          need: req.requirement || "",
          importance: req.importance || 0,
          ctq: req.satisfaction || ""
        }))
      : [];
      
    // Format business requirements for the voice of business
    const formattedBusinessRequirements = Array.isArray(businessRequirements)
      ? businessRequirements.map((req: any) => ({
          requirement: req.requirement || "",
          need: req.businessRequirement || "",
          importance: req.importance || 0,
          ctq: req.criticalToQuality || req.impact || ""
        }))
      : [];
    
    // Generate a detailed system message to guide Claude
    const systemMessage = `You are an expert Six Sigma communication coach specializing in creating compelling elevator speeches for process improvement projects.
Your task is to create a concise, persuasive elevator speech that a project leader can use to quickly explain the project to stakeholders.
The elevator speech should be 30-45 seconds when spoken (about 100-150 words).
Focus on communicating the business value, customer benefits, and strategic importance.
Use simple, jargon-free language that any stakeholder can understand.
Format the speech as a single, cohesive paragraph that flows naturally when spoken.`;

    // The prompt to send to Claude with all the project information
    const userPrompt = `Create an elevator speech for the following Six Sigma project:

Project Title: ${projectTitle}
Problem Statement: ${problemStatement}
Project Scope: ${scope}

Financial Impact:
- Quality Cost Savings: ${qualityCostSavings}
- Financial Savings: ${financialSavings}
- FTE Benefits: ${fteBenefits}
- Project Net Value: ${netValue}
- ROI: ${roi}

Customer Requirements (Voice of Customer):
${formattedCustomerRequirements.map((req: any) => 
  `- ${req.need} (Importance: ${req.importance}/5, CTQ: ${req.ctq})`).join('\n')}

Business Requirements (Voice of Business):
${formattedBusinessRequirements.map((req: any) => 
  `- ${req.requirement}: ${req.need} (Importance: ${req.importance}/5, CTQ: ${req.ctq})`).join('\n')}

The elevator speech should:
1. Clearly state the project purpose and problem being solved
2. Highlight key benefits for customers and the business
3. Mention the expected ROI or financial impact
4. End with a clear call to action or next steps

Keep it concise, compelling, and free of technical jargon.`;

    console.log("Sending request to Anthropic API for elevator speech...");
    
    // Call the Anthropic API with the latest model
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      temperature: 0.7,
      system: systemMessage,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    console.log("Elevator speech response received from Anthropic API");
    
    // Extract and return the response content
    if (response.content[0].type === 'text') {
      return response.content[0].text;
    } else {
      throw new Error('Unexpected response format from Claude API');
    }
  } catch (error: any) {
    console.error('Error generating elevator speech with Claude:', error);
    
    // Detailed error handling based on common API errors
    if (error.status === 401) {
      throw new Error('Authentication failed: Invalid API key. Please check your ANTHROPIC_API_KEY environment variable.');
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

// Generate a mitigation plan using Claude
export async function generateMitigationPlan(
  riskName: string,
  probability: string,
  impact: string
): Promise<string> {
  try {
    console.log(`Generating mitigation plan for risk: "${riskName}" with probability: "${probability}" and impact: "${impact}"`);
    
    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set in environment variables');
      throw new Error('ANTHROPIC_API_KEY is missing. Please make sure it is set in your environment variables.');
    }
    
    // Check if anthropic client was initialized
    if (!anthropic) {
      throw new Error('Anthropic client not initialized. Check your API key.');
    }
    
    console.log("Using Anthropic API to generate a mitigation plan");
    
    // Generate a detailed system message to guide Claude
    const systemMessage = `You are a risk management expert specializing in Six Sigma and project risk mitigation.
Your task is to generate a concise but effective mitigation plan for a risk in a Six Sigma project.
Format your response consistently with bullet points in clearly defined sections. 
DO NOT include any introductory or closing text - respond ONLY with the mitigation plan.
Include the following sections: 
1. Recommended Mitigation Strategies
2. Risk-Specific Strategies (based on the risk type)
3. Monitoring and Review Procedures`;

    // The prompt to send to Claude
    const userPrompt = `Create a mitigation plan for the following risk:
Risk Name: ${riskName}
Probability: ${probability} (Low/Medium/High)
Impact: ${impact} (Low/Medium/High)

The mitigation plan should be specific to this risk, considering its probability and impact level.`;

    console.log("Sending request to Anthropic API...");
    console.log("API Key starts with:", process.env.ANTHROPIC_API_KEY?.substring(0, 8) + "...");
    
    // Call the Anthropic API with the latest model
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL, // Using the latest available model
      max_tokens: 750,
      temperature: 0.7,
      system: systemMessage,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    console.log("Response received from Anthropic API");
    
    // Extract and return the response content
    if (response.content[0].type === 'text') {
      return response.content[0].text;
    } else {
      throw new Error('Unexpected response format from Claude API');
    }
  } catch (error: any) {
    console.error('Error generating mitigation plan with Claude:', error);
    
    // Detailed error handling based on common API errors
    if (error.status === 401) {
      throw new Error('Authentication failed: Invalid API key. Please check your ANTHROPIC_API_KEY environment variable.');
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