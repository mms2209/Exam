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

    console.log('[exam-chat-ai] Received request');
    console.log('[exam-chat-ai] Question:', question);
    console.log('[exam-chat-ai] Paper content length:', paperContent?.length || 0);
    console.log('[exam-chat-ai] Marking scheme content length:', markingSchemeContent?.length || 0);

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

    const hasPaperContent = paperContent && paperContent.length > 100;
    const hasMarkingScheme = markingSchemeContent && markingSchemeContent.length > 100;

    console.log('[exam-chat-ai] Has paper content:', hasPaperContent);
    console.log('[exam-chat-ai] Has marking scheme:', hasMarkingScheme);

    const questionNumber = extractQuestionNumber(question);
    console.log('[exam-chat-ai] Detected question number:', questionNumber);

    let focusedPaperContent = paperContent;
    let focusedMarkingScheme = markingSchemeContent;
    let questionContext = '';

    if (questionNumber && hasPaperContent) {
      const extractedQuestion = extractSpecificQuestion(paperContent, questionNumber);
      if (extractedQuestion) {
        console.log('[exam-chat-ai] Extracted specific question, length:', extractedQuestion.length);
        questionContext = `\n=== SPECIFIC QUESTION ${questionNumber} FROM EXAM PAPER ===\n${extractedQuestion}\n=== END OF QUESTION ${questionNumber} ===\n\n`;
      }
    }

    if (questionNumber && hasMarkingScheme) {
      const extractedScheme = extractSpecificMarkingScheme(markingSchemeContent, questionNumber);
      if (extractedScheme) {
        console.log('[exam-chat-ai] Extracted specific marking scheme, length:', extractedScheme.length);
        focusedMarkingScheme = `\n=== MARKING SCHEME FOR QUESTION ${questionNumber} ===\n${extractedScheme}\n=== END OF MARKING SCHEME FOR QUESTION ${questionNumber} ===\n\n`;
      }
    }

    const prompt = `You are an expert mathematics and exam tutor helping students understand exam questions and how to answer them effectively.

${questionContext ? questionContext : (paperContent || "No paper content provided")}

${focusedMarkingScheme || "No marking scheme provided"}

The student is asking: "${question}"

CRITICAL INSTRUCTIONS FOR MATHEMATICAL CONTENT:
- When writing mathematical expressions, use plain text notation that is clear and unambiguous
- Use standard notation: x^2 for x squared, sqrt(x) for square root, integral signs, fractions as a/b
- Use spacing and line breaks to make formulas readable
- Show step-by-step working with clear explanations at each step
- Preserve mathematical notation exactly as it appears in the exam paper and marking scheme

${hasPaperContent ? `IMPORTANT: You have been provided with the ${questionNumber ? `specific question ${questionNumber}` : 'complete exam paper'} content above. Read through it carefully and reference specific parts of the question in your response. If there are mathematical formulas, preserve them exactly as shown.` : 'Note: The exam paper content is not available. Provide general educational guidance.'}

${hasMarkingScheme ? `CRITICAL: You have been provided with the ${questionNumber ? `marking scheme for question ${questionNumber}` : 'complete marking scheme'} above.

YOU MUST STRICTLY FOLLOW THE MARKING SCHEME:
1. Identify EVERY marking point mentioned in the scheme
2. Your solution MUST address EVERY SINGLE marking point - do not skip any
3. Quote the marking points EXACTLY as they appear in the scheme
4. Show the marks allocated for each point (e.g., "[2 marks]")
5. Structure your solution to match the marking scheme structure
6. If the marking scheme shows specific steps or formulas, include those EXACT steps
7. Your solution should earn FULL MARKS based on the marking scheme provided

If the marking scheme is not clear or seems incomplete, still provide a comprehensive answer based on what is available.` : 'Note: The marking scheme is not available. Provide general best practices for answering such questions.'}

Your task is to help the student understand this question and how to answer it correctly. Please provide a comprehensive educational response in the following structured format:

## Explanation
${questionNumber ? `First, quote the exact text of question ${questionNumber} from the exam paper (preserve all mathematical notation), then provide a clear explanation of what it's asking.` : 'Provide a clear explanation of what the question is asking and the key concepts involved.'} Break down the question into understandable parts. Explain any technical terms or concepts that the student needs to know. If there are formulas, explain what each symbol represents.

## Examples
Provide 2-3 relevant, concrete examples that illustrate the concepts or demonstrate similar problems and their solutions. Make these examples specific and practical. Show full working for any calculations.

## How to Get Full Marks
${hasMarkingScheme ? 'CRITICAL: List EVERY SINGLE marking point from the marking scheme. Copy the exact wording from the scheme and show marks allocated.' : 'Provide clear bullet points on exactly what a student needs to include in their answer to achieve full marks.'}

YOU MUST INCLUDE:
- Every marking point from the scheme (quote exactly)
- Marks allocated for each point (if shown)
- Important terminology to use
- Required formulas or methods
- Common mistakes to avoid
- How to structure the answer to match marking expectations

${hasMarkingScheme ? 'DO NOT add your own marking criteria - use ONLY what is in the provided marking scheme.' : ''}

## Solution
Provide a complete, step-by-step model answer that would receive FULL MARKS. ${hasMarkingScheme ? 'CRITICAL: Your solution MUST address EVERY marking point from the scheme in the exact order shown. After each step, indicate which marking point(s) you are addressing and the marks earned. Show all working clearly.' : 'Structure your answer logically with clear headings and well-explained reasoning. Show all steps for any calculations.'}

For mathematical solutions:
- Number each step clearly (Step 1, Step 2, etc.)
- Show all working - never skip steps
- State formulas before using them
- Include units where applicable
- Box or highlight final answers

IMPORTANT: Format your response using these exact headings. Be specific, educational, and helpful. ${hasPaperContent ? 'Make sure to demonstrate that you have read and understood the exam paper by quoting relevant parts of the question.' : ''} ${hasMarkingScheme ? 'Your solution MUST match the marking scheme exactly - this is non-negotiable.' : ''}`;

    console.log('[exam-chat-ai] Sending prompt to AI model...');
    console.log('[exam-chat-ai] Prompt length:', prompt.length);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('[exam-chat-ai] Received AI response, length:', text.length);

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

function extractQuestionNumber(userQuestion: string): string | null {
  const patterns = [
    /question\s+(\d+[a-z]?)/i,
    /q\.?\s*(\d+[a-z]?)/i,
    /\bq(\d+[a-z]?)\b/i,
    /\b(\d+[a-z]?)\s*\)/,
    /^(\d+[a-z]?)[.:\s]/,
  ];

  for (const pattern of patterns) {
    const match = userQuestion.match(pattern);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  }

  return null;
}

function extractSpecificQuestion(paperContent: string, questionNumber: string): string | null {
  const qNum = questionNumber.toLowerCase();

  const patterns = [
    new RegExp(`(?:^|\\n)\\s*${qNum}[.):\\s]([\\s\\S]*?)(?=\\n\\s*(?:\\d+[a-z]?)[.):]|$)`, 'i'),
    new RegExp(`(?:^|\\n)\\s*question\\s+${qNum}[.):\\s]([\\s\\S]*?)(?=\\n\\s*question\\s+\\d+|$)`, 'i'),
    new RegExp(`(?:^|\\n)\\s*Q\\.?\\s*${qNum}[.):\\s]([\\s\\S]*?)(?=\\n\\s*Q\\.?\\s*\\d+|$)`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = paperContent.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted.length > 20) {
        return `Question ${questionNumber}: ${extracted}`;
      }
    }
  }

  const lines = paperContent.split('\n');
  let capturing = false;
  let questionText = '';
  let captureLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!capturing && line.match(new RegExp(`^\\s*${qNum}[.):\\s]`, 'i'))) {
      capturing = true;
      questionText = line + '\n';
      captureLines = 1;
      continue;
    }

    if (capturing) {
      if (line.match(/^\s*\d+[a-z]?[.):]/) && captureLines > 0) {
        break;
      }

      questionText += line + '\n';
      captureLines++;

      if (captureLines > 50) {
        break;
      }
    }
  }

  if (questionText.length > 20) {
    return questionText.trim();
  }

  return null;
}

function extractSpecificMarkingScheme(markingSchemeContent: string, questionNumber: string): string | null {
  const qNum = questionNumber.toLowerCase();

  const patterns = [
    new RegExp(`(?:^|\\n)\\s*${qNum}[.):\\s]([\\s\\S]*?)(?=\\n\\s*(?:\\d+[a-z]?)[.):]|$)`, 'i'),
    new RegExp(`(?:^|\\n)\\s*question\\s+${qNum}[.):\\s]([\\s\\S]*?)(?=\\n\\s*question\\s+\\d+|$)`, 'i'),
    new RegExp(`(?:^|\\n)\\s*Q\\.?\\s*${qNum}[.):\\s]([\\s\\S]*?)(?=\\n\\s*Q\\.?\\s*\\d+|$)`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = markingSchemeContent.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted.length > 10) {
        return `Marking scheme for Question ${questionNumber}:\n${extracted}`;
      }
    }
  }

  const lines = markingSchemeContent.split('\n');
  let capturing = false;
  let schemeText = '';
  let captureLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!capturing && line.match(new RegExp(`^\\s*${qNum}[.):\\s]`, 'i'))) {
      capturing = true;
      schemeText = line + '\n';
      captureLines = 1;
      continue;
    }

    if (capturing) {
      if (line.match(/^\s*\d+[a-z]?[.):]/) && captureLines > 0) {
        break;
      }

      schemeText += line + '\n';
      captureLines++;

      if (captureLines > 100) {
        break;
      }
    }
  }

  if (schemeText.length > 10) {
    return schemeText.trim();
  }

  return null;
}

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
