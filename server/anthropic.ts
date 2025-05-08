import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client with proper API key validation
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Validate API key format
if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
  console.warn('Warning: ANTHROPIC_API_KEY is missing or has incorrect format. API calls will fail.');
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
      return "ANTHROPIC_API_KEY is missing. Please contact your administrator.";
    }
    
    console.log("Using Anthropic API to generate a mitigation plan");
    
    try {
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
      console.log("API Key starts with:", process.env.ANTHROPIC_API_KEY?.substring(0, 5) + "...");
      
      // Call the Anthropic API with the latest available model
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307', // Using the latest haiku model
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
    } catch (apiError) {
      console.error('Error calling Anthropic API:', apiError);
      
      // If API fails, fall back to the static template
      console.log("API call failed, falling back to static template");
      return `Recommended Mitigation Strategies:
• Implement multiple preventative controls with overlapping coverage
• Develop prevention strategies to reduce likelihood of occurrence
• Create detailed contingency and recovery plans to minimize impact
• Consider risk transfer options (insurance, partnerships, contracts)
• Assign dedicated risk owner with executive oversight

Risk-Specific Strategies:
• Conduct comprehensive technical assessments 
• Implement redundant systems or fallback options
• Develop detailed disaster recovery procedures
• Establish 24/7 technical support protocols
• Consider prototype or pilot implementations before full deployment

Monitoring and Review Procedures:
• Review risk status weekly
• Report to executive leadership monthly
• Reassess mitigation effectiveness quarterly`;
    }
  } catch (error) {
    console.error('Error generating mitigation plan with Claude:', error);
    throw new Error('Failed to generate mitigation plan. Please try again later.');
  }
}