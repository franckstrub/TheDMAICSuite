import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Generate a mitigation plan using Claude
export async function generateMitigationPlan(
  riskName: string,
  probability: string,
  impact: string
): Promise<string> {
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

    // Call the Anthropic API
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 750,
      temperature: 0.7,
      system: systemMessage,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    // Extract and return the response content
    if (response.content[0].type === 'text') {
      return response.content[0].text;
    } else {
      throw new Error('Unexpected response format from Claude API');
    }
  } catch (error) {
    console.error('Error generating mitigation plan with Claude:', error);
    throw new Error('Failed to generate mitigation plan. Please try again later.');
  }
}