import { createClient } from "npm:@supabase/supabase-js@2.55.0";
import pdfParse from "npm:pdf-parse@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtractionRequest {
  paperId: string;
}

interface ExtractionResponse {
  success: boolean;
  paperId: string;
  message: string;
  paperTextLength?: number;
  markingSchemeTextLength?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: "Server configuration error. Missing Supabase credentials.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { paperId }: ExtractionRequest = await req.json();

    if (!paperId) {
      return new Response(
        JSON.stringify({ error: "Paper ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: paper, error: fetchError } = await supabase
      .from("exam_papers")
      .select("id, paper_file_url, marking_scheme_file_url")
      .eq("id", paperId)
      .single();

    if (fetchError || !paper) {
      return new Response(
        JSON.stringify({ error: "Exam paper not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase
      .from("exam_papers")
      .update({ text_extraction_status: "processing" })
      .eq("id", paperId);

    let paperText = "";
    let markingSchemeText = "";
    let extractionError = null;

    try {
      const { data: paperData } = await supabase.storage
        .from("exam-papers")
        .download(paper.paper_file_url);

      if (paperData) {
        const paperBuffer = await paperData.arrayBuffer();
        const paperPdf = await pdfParse(Buffer.from(paperBuffer));
        paperText = paperPdf.text || "";
      }
    } catch (error) {
      console.error("Error extracting paper text:", error);
      extractionError = `Paper extraction failed: ${error.message}`;
    }

    try {
      const { data: schemeData } = await supabase.storage
        .from("marking-schemes")
        .download(paper.marking_scheme_file_url);

      if (schemeData) {
        const schemeBuffer = await schemeData.arrayBuffer();
        const schemePdf = await pdfParse(Buffer.from(schemeBuffer));
        markingSchemeText = schemePdf.text || "";
      }
    } catch (error) {
      console.error("Error extracting marking scheme text:", error);
      extractionError = extractionError
        ? `${extractionError}; Scheme extraction failed: ${error.message}`
        : `Scheme extraction failed: ${error.message}`;
    }

    const status = paperText || markingSchemeText ? "completed" : "failed";
    const finalError = status === "failed"
      ? extractionError || "No text could be extracted from PDFs"
      : null;

    await supabase
      .from("exam_papers")
      .update({
        paper_extracted_text: paperText || null,
        marking_scheme_extracted_text: markingSchemeText || null,
        text_extraction_status: status,
        text_extracted_at: status === "completed" ? new Date().toISOString() : null,
        extraction_error: finalError,
      })
      .eq("id", paperId);

    const response: ExtractionResponse = {
      success: status === "completed",
      paperId,
      message:
        status === "completed"
          ? "Text extraction completed successfully"
          : finalError || "Text extraction failed",
      paperTextLength: paperText.length,
      markingSchemeTextLength: markingSchemeText.length,
    };

    return new Response(JSON.stringify(response), {
      status: status === "completed" ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in extract-pdf-text:", error);

    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred during PDF text extraction",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
