import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatRequest {
  paperId: string;
  question: string;
  sessionId?: string;
  paperContent?: string;
  markingSchemeContent?: string;
}

interface AIResponse {
  explanation: string;
  examples: string[];
  howToGetFullMarks: string[];
  solution: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "AI service not configured. Please contact your administrator to set up the GEMINI_API_KEY.",
          errorCode: "API_KEY_MISSING"
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { question, paperContent, markingSchemeContent }: ChatRequest = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    const prompt = `You are an expert exam tutor helping students understand exam questions and how to answer them effectively.

${paperContent || "No paper content provided"}

${markingSchemeContent || "No marking scheme provided"}

The student is asking: "${question}"

Your task is to help the student understand this question and how to answer it correctly. Please provide a comprehensive educational response in the following structured format:

## Explanation
Provide a clear explanation of what the question is asking and the key concepts involved. Break down the question into understandable parts.

## Examples
Provide 2-3 relevant, concrete examples that illustrate the concepts or demonstrate similar problems and their solutions.

## How to Get Full Marks
Provide clear bullet points on exactly what a student needs to include in their answer to achieve full marks. Focus on:
- Key points that must be mentioned
- Important terminology to use
- Common mistakes to avoid
- How to structure the answer

## Solution
Provide a complete, well-structured solution or answer to the question that demonstrates best practices and would receive full marks.

IMPORTANT: Format your response using these exact headings. Be specific, educational, and helpful. If you need clarification about the question, explain what information would be helpful and provide the best guidance you can with the available context.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const parsedResponse = parseAIResponse(text);

    const messageId = crypto.randomUUID();
    const message = {
      id: messageId,
      role: "assistant" as const,
      content: JSON.stringify(parsedResponse),
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({ message }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in exam-chat-ai:", error);

    let errorMessage = "An unexpected error occurred while processing your request.";
    let errorCode = "UNKNOWN_ERROR";
    let statusCode = 500;

    if (error.message) {
      if (error.message.includes("API key")) {
        errorMessage = "Invalid API key. Please contact your administrator.";
        errorCode = "INVALID_API_KEY";
        statusCode = 503;
      } else if (error.message.includes("quota") || error.message.includes("limit")) {
        errorMessage = "AI service quota exceeded. Please try again later or contact your administrator.";
        errorCode = "QUOTA_EXCEEDED";
        statusCode = 429;
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        errorMessage = "Network error. Please check your connection and try again.";
        errorCode = "NETWORK_ERROR";
        statusCode = 503;
      } else if (error.message.includes("not found") || error.message.includes("404")) {
        errorMessage = "AI model not found or not supported. Please contact your administrator to update the model configuration.";
        errorCode = "MODEL_NOT_FOUND";
        statusCode = 503;
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        errorCode,
        details: error.message
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function parseAIResponse(text: string): AIResponse {
  const sections = {
    explanation: "",
    examples: [] as string[],
    howToGetFullMarks: [] as string[],
    solution: "",
  };

  const explanationMatch = text.match(/##\s*Explanation\s*([\s\S]*?)(?=##|$)/i);
  if (explanationMatch) {
    sections.explanation = explanationMatch[1].trim();
  }

  const examplesMatch = text.match(/##\s*Examples\s*([\s\S]*?)(?=##|$)/i);
  if (examplesMatch) {
    const examplesText = examplesMatch[1].trim();
    sections.examples = examplesText
      .split(/\n+/)
      .filter((line) => line.trim().length > 0)
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter((line) => line.length > 0);
  }

  const marksMatch = text.match(/##\s*How to Get Full Marks\s*([\s\S]*?)(?=##|$)/i);
  if (marksMatch) {
    const marksText = marksMatch[1].trim();
    sections.howToGetFullMarks = marksText
      .split(/\n+/)
      .filter((line) => line.trim().length > 0)
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter((line) => line.length > 0);
  }

  const solutionMatch = text.match(/##\s*Solution\s*([\s\S]*?)$/i);
  if (solutionMatch) {
    sections.solution = solutionMatch[1].trim();
  }

  if (!sections.explanation && !sections.solution) {
    sections.explanation = text;
  }

  return sections;
}
