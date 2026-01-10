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
    
    // Create a generative model instance - using Gemini Flash
    const model = genAI.getGenerativeModel({ 
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

    // The prompt to send to Google AI - shortened to reduce token usage
    const prompt = `Create a concise risk mitigation plan like you were writing an X (Twitter) post for this Risk: 
    ${riskName}`;

// Be specific and actionable. Keep it concise like you were writing an X (Twitter) post - brief`;
// Risk: ${riskName}
// Probability: ${probability}
// Impact: ${impact}

// Provide:
// 1. Mitigation Strategies

// Be specific and actionable. Keep it concise like you were writing an X (Twitter) post - brief`;

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
      model: "gemini-2.5-flash-lite",
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
      model: "gemini-2.5-flash-lite",
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

    const prompt = `Create a very concise and specific stakeholder engagement strategy for:

Role: ${stakeholderRole}
Interest Level: ${interestLevel}
Influence Level: ${influenceLevel}
Support Level: ${supportLevel}
Resistance type: ${resistanceInfo}

Keep it under 100 words and focus on practical actions.`;
// Stakeholder: ${stakeholderName}
// Provide a specific, actionable engagement strategy considering their level of interest, influence, and current support. Include:
// - Communication approach
// - Frequency of engagement
// - Key messages to emphasize

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

// Interface for Logistic Regression stats
interface LogisticRegressionStats {
  dataCount: number;
  xValues: number[];
  yValues: number[];
  intercept: number;
  slope: number;
  interceptSE: number;
  slopeSE: number;
  interceptZ: number;
  slopeZ: number;
  interceptPValue: number;
  slopePValue: number;
  logLikelihood: number;
  nullLogLikelihood: number;
  devianceResidual: number;
  nullDeviance: number;
  mcFaddenR2: number;
  significanceLevel: number;
  xDescription?: string;
  yDescription?: string;
  zeroLabel?: string;
  oneLabel?: string;
}

interface LogisticRegressionContext {
  projectName?: string;
  solutionName?: string;
}

// Generate Logistic Regression AI Analysis using Google Generative AI
export async function generateLogisticRegressionAnalysis(
  stats: LogisticRegressionStats,
  context: LogisticRegressionContext
): Promise<string> {
  try {
    console.log(`Generating logistic regression analysis for: "${context.solutionName || 'Logistic Regression'}"`);
    
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY is not set in environment variables');
      throw new Error('GOOGLE_AI_API_KEY is missing. Please make sure it is set in your environment variables.');
    }
    
    if (!genAI) {
      throw new Error('Google AI client not initialized. Check your API key.');
    }
    
    console.log("Using Google AI API to generate logistic regression analysis");
    
    const model = genAI.getGenerativeModel({ 
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

    const xDesc = stats.xDescription || 'X (Predictor)';
    const yDesc = stats.yDescription || 'Y (Response)';
    const zeroLabel = stats.zeroLabel ? ` (${stats.zeroLabel})` : '';
    const oneLabel = stats.oneLabel ? ` (${stats.oneLabel})` : '';

    const prompt = `As a Lean Six Sigma Master Black Belt expert in statistical analysis, provide a comprehensive logistic regression analysis.

**Model Information:**
- Response Variable: ${yDesc}
  - 0${zeroLabel} vs 1${oneLabel}
- Predictor Variable: ${xDesc}
- Sample Size: ${stats.dataCount} observations

**Logistic Regression Model Results:**
- Intercept (β₀): ${stats.intercept.toFixed(4)}
  - Standard Error: ${stats.interceptSE.toFixed(4)}
  - Z-statistic: ${stats.interceptZ.toFixed(4)}
  - P-value: ${stats.interceptPValue.toFixed(4)}
  
- Slope (β₁): ${stats.slope.toFixed(4)}
  - Standard Error: ${stats.slopeSE.toFixed(4)}
  - Z-statistic: ${stats.slopeZ.toFixed(4)}
  - P-value: ${stats.slopePValue.toFixed(4)}

**Model Fit Statistics:**
- Log-Likelihood: ${stats.logLikelihood.toFixed(4)}
- Null Log-Likelihood: ${stats.nullLogLikelihood.toFixed(4)}
- Deviance Residual: ${stats.devianceResidual.toFixed(4)}
- Null Deviance: ${stats.nullDeviance.toFixed(4)}
- McFadden's R²: ${stats.mcFaddenR2.toFixed(4)} (${(stats.mcFaddenR2 * 100).toFixed(2)}%)

**Significance Level:** α = ${stats.significanceLevel}

Please provide a structured analysis following these sections:

1. **Model Significance**
   - Is the predictor variable statistically significant?
   - Interpret the slope coefficient in context
   - What does the sign of the slope indicate about the relationship?

2. **Odds Ratio Interpretation**
   - Calculate and interpret the odds ratio (e^β₁)
   - Explain the practical meaning of the odds ratio
   - Discuss the 95% confidence interval for the odds ratio

3. **Model Fit Assessment**
   - Evaluate McFadden's R² (0.2-0.4 is considered good fit)
   - Compare deviance vs null deviance
   - Assess overall model adequacy

4. **Practical Implications**
   - What does this relationship mean for the process?
   - How can this be used for prediction and decision-making?
   - Recommendations for process improvement

5. **Limitations and Cautions**
   - Sample size considerations
   - Assumptions of logistic regression
   - Recommendations for further analysis

Keep the analysis professional, technical but accessible, and actionable for Six Sigma practitioners.`;

    console.log("Sending request to Google AI API for logistic regression analysis...");
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Logistic regression analysis response received from Google AI API");
    
    return text || "Unable to generate logistic regression analysis. Please try again.";
  } catch (error: any) {
    console.error('Error generating logistic regression analysis with Google AI:', error);
    
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
      throw new Error(`Failed to generate logistic regression analysis: ${error.message || 'Unknown error'}`);
    }
  }
}