import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "AIzaSyBnsicEhplNpyB-NihS2j9buy6bcV1plU4" });

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
1. Provide clear, structured responses
2. Include relevant tools and techniques
3. Offer practical examples when helpful
4. Suggest next steps or follow-up actions
5. Reference appropriate DMAIC phase when relevant
6. Be concise but thorough

Remember, you're helping users improve their processes and achieve measurable results through data-driven decision making.
`;

export async function generateAICoachResponse(userMessage: string): Promise<string> {
  try {
    console.log("Processing AI coach request for message:", userMessage);
    
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBnsicEhplNpyB-NihS2j9buy6bcV1plU4";
    if (!apiKey) {
      throw new Error("Gemini API key not configured");
    }

    const prompt = `${LEAN_SIX_SIGMA_CONTEXT}

User Question: ${userMessage}

Please provide a helpful, expert response as an AI Master Black Belt Coach:`;

    console.log("Sending request to Gemini API...");
    
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    console.log("Gemini API response received:", response.text?.substring(0, 100) + "...");

    return response.text || "I apologize, but I'm having trouble processing your question right now. Please try rephrasing your question or ask about a specific Lean Six Sigma topic.";
    
  } catch (error) {
    console.error("Error generating AI coach response:", error);
    console.error("Error details:", error.message);
    throw new Error(`Failed to generate response from AI Coach: ${error.message}`);
  }
}

// Predefined helpful responses for common scenarios
export const QUICK_HELP_RESPONSES = {
  dmaic: "DMAIC is the core problem-solving methodology in Six Sigma with 5 phases: Define (project scope), Measure (current state), Analyze (root causes), Improve (solutions), and Control (sustain gains). Which phase would you like to explore?",
  
  processCapability: "Process capability studies help determine if your process can meet customer requirements. Key metrics include Cp (process potential), Cpk (process performance), Pp (overall capability), and Ppk (overall performance). What specific aspect would you like to understand?",
  
  controlCharts: "Control charts monitor process stability over time. Common types include I-MR charts for individual values, X-bar R charts for subgroups, and p-charts for attribute data. What type of data are you working with?",
  
  msa: "Measurement System Analysis evaluates the quality of your measurement process. It examines repeatability (equipment variation) and reproducibility (appraiser variation). Are you working with continuous or attribute data?",
  
  rootCause: "Effective root cause analysis uses tools like 5 Whys, Fishbone diagrams, and Pareto analysis. The key is to dig deep beyond symptoms to find the true causes. What problem are you investigating?"
};