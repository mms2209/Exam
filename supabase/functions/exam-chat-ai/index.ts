import { GoogleGenAI, Type } from "npm:@google/genai@0.2.0";

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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new GoogleGenAI({ apiKey });
    
    const prompt = `You are an expert exam tutor helping students understand exam questions and how to answer them effectively.

Exam Paper Context:
${paperContent || "No paper content provided"}

Marking Scheme Context:
${markingSchemeContent || "No marking scheme provided"}

Student Question: ${question}

Please provide a comprehensive response in the following structured format:

## Explanation
Provide a clear explanation of the question and what it's asking for.

## Examples
Provide 2-3 relevant examples that illustrate the concept or help understand the question better.

## How to Get Full Marks
Provide bullet points on exactly what the student needs to include in their answer to achieve full marks based on the marking scheme.

## Solution
Provide a complete solution or answer to the question.

Format your response clearly with these exact headings.`;

    const response = await client.responses.create({
      model: "gemini-2.5-flash",
      input: prompt,
      type: Type.TEXT
    });

    const text = response.output[0].content[0].text || "";
    const parsedResponse = parseAIResponse(text);

    const messageId = crypto.randomUUID();
    const message = {
      id: messageId,
      role: "assistant" as const,
      content: JSON.stringify(parsedResponse),
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in exam-chat-ai:", error);

    let errorMessage = "An unexpected error occurred while processing your request.";
    let errorCode = "UNKNOWN_ERROR";
    let statusCode = 500;

    if (error instanceof Error) {
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
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(JSON.stringify({
      error: errorMessage,
      errorCode,
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
  if (explanationMatch) sections.explanation = explanationMatch[1].trim();

  const examplesMatch = text.match(/##\s*Examples\s*([\s\S]*?)(?=##|$)/i);
  if (examplesMatch) {
    const examplesText = examplesMatch[1].trim();
    sections.examples = examplesText
      .split(/\n+/)
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
  }

  const marksMatch = text.match(/##\s*How to Get Full Marks\s*([\s\S]*?)(?=##|$)/i);
  if (marksMatch) {
    const marksText = marksMatch[1].trim();
    sections.howToGetFullMarks = marksText
      .split(/\n+/)
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
  }

  const solutionMatch = text.match(/##\s*Solution\s*([\s\S]*?)$/i);
  if (solutionMatch) sections.solution = solutionMatch[1].trim();

  if (!sections.explanation && !sections.solution) sections.explanation = text;

  return sections;
}
