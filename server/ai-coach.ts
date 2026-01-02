import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Google Generative AI client with proper API key validation
// Prioritize GOOGLE_API_KEY, fallback to GEMINI_API_KEY
const getApiKey = () => {
  if (process.env.GOOGLE_API_KEY) {
    console.log("Using GOOGLE_API_KEY for AI Coach");
    return process.env.GOOGLE_API_KEY;
  }
  if (process.env.GEMINI_API_KEY) {
    console.log("Using GEMINI_API_KEY for AI Coach");
    return process.env.GEMINI_API_KEY;
  }
  return null;
};

let genAI: GoogleGenerativeAI | null = null;
const apiKey = getApiKey();
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  console.warn('Warning: Neither GOOGLE_API_KEY nor GEMINI_API_KEY is set. AI Coach will not function.');
}

const LEAN_SIX_SIGMA_CONTEXT = `
You are an AI Master Black Belt Coach specializing in Lean Six Sigma methodology. You have extensive experience in:

- DMAIC (Define, Measure, Analyze, Improve, Control) methodology
- Statistical analysis and process capability studies
- MSA (Measurement System Analysis)
- Control charts and statistical process control
- Root cause analysis and problem-solving techniques
- Change management and project leadership
- Lean tools and waste elimination
- Process mapping and value stream mapping
- Design of Experiments (DOE)
- Risk assessment and FMEA
- Project management and team leadership

Your role is to provide expert guidance, answer questions, and help users navigate their Lean Six Sigma projects. Always provide practical, actionable advice based on proven methodologies. Be encouraging and supportive while maintaining professional expertise.

When answering questions:
1. Provide clear, concise and precise structured responses
2. Include relevant tools and techniques when necessary
3. Offer practical examples when helpful
4. Suggest next steps or follow-up actions when relevant
5. Reference appropriate DMAIC phase when relevant
6. Be very concise but thorough

Remember, you're helping users improve their processes and achieve measurable results through data-driven decision making.
`;

export async function generateAICoachResponse(userMessage: string): Promise<string> {
  try {
    console.log("Processing AI coach request for message:", userMessage);
    
    // Check if API key is available
    if (!apiKey) {
      console.error('No Google API key is set in environment variables');
      throw new Error('API key is missing. Please set GOOGLE_API_KEY or GEMINI_API_KEY in your environment variables.');
    }
    
    // Check if Google AI client was initialized
    if (!genAI) {
      throw new Error('Google AI client not initialized. Check your API key.');
    }

    console.log("Using Google AI API to generate AI Coach response");
    
    // Create a generative model instance
    const model = genAI.getGenerativeModel({ 
      //model: "gemini-2.5-pro",
      model: "gemini-2.5-pro",
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

    const prompt = `${LEAN_SIX_SIGMA_CONTEXT}

User Question: ${userMessage}

Please provide a helpful, expert response as an AI Master Black Belt Coach:`;

    console.log("Sending request to Google AI API...");
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("Google AI API response received:", text?.substring(0, 100) + "...");

    return text || "I apologize, but I'm having trouble processing your question right now. Please try rephrasing your question or ask about a specific Lean Six Sigma topic.";
    
  } catch (error) {
    console.error("Error generating AI coach response:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error details:", errorMessage);
    throw new Error(`Failed to generate response from AI Coach: ${errorMessage}`);
  }
}

// Predefined helpful responses for common scenarios
export const QUICK_HELP_RESPONSES = {
  dmaic: "DMAIC is the core problem-solving methodology in Six Sigma with 5 phases: Define (project scope), Measure (current state), Analyze (root causes), Improve (solutions), and Control (sustain gains). Which phase would you like to explore?",
  
  processCapability: "Process capability studies help determine if your process can meet customer requirements. Key metrics include Cp (process potential), Cpk (process performance), Pp (overall capability), and Ppk (overall performance). What specific aspect would you like to understand?",
  
  controlCharts: "Control charts monitor process stability over time. Common types include I-MR charts for individual values, X-bar R charts for subgroups, and p-charts for attribute data. What type of data are you working with?",
  
  msa: "Measurement System Analysis evaluates the quality of your measurement process. It examines repeatability (equipment variation) and reproducibility (appraiser variation). Are you working with continuous or attribute data?",
  
  rootCause: "Effective root cause analysis uses tools like 5 Whys, Fishbone diagrams, 6M's and Pareto analysis. The key is to dig deep beyond symptoms to find the true causes. What problem are you investigating?"
};
