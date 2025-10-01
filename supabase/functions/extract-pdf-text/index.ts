import { createClient } from "npm:@supabase/supabase-js@2.55.0";
import { Buffer } from "node:buffer";
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
      console.log('[extract-pdf-text] Downloading exam paper from storage...');
      const { data: paperData, error: downloadError } = await supabase.storage
        .from("exam-papers")
        .download(paper.paper_file_url);

      if (downloadError) {
        throw new Error(`Download failed: ${downloadError.message}`);
      }

      if (paperData) {
        console.log('[extract-pdf-text] Paper downloaded, size:', paperData.size);
        const paperBuffer = await paperData.arrayBuffer();
        console.log('[extract-pdf-text] ArrayBuffer size:', paperBuffer.byteLength);

        const buffer = Buffer.from(paperBuffer);
        console.log('[extract-pdf-text] Buffer created, length:', buffer.length);

        console.log('[extract-pdf-text] Starting PDF parsing...');
        const paperPdf = await pdfParse(buffer);
        console.log('[extract-pdf-text] PDF parsed, text length:', paperPdf.text?.length || 0);

        paperText = paperPdf.text || "";
      } else {
        throw new Error("No data returned from storage");
      }
    } catch (error) {
      console.error("Error extracting paper text:", error);
      console.error("Error stack:", error.stack);
      extractionError = `Paper extraction failed: ${error.message}`;
    }

    try {
      console.log('[extract-pdf-text] Downloading marking scheme from storage...');
      const { data: schemeData, error: downloadError } = await supabase.storage
        .from("marking-schemes")
        .download(paper.marking_scheme_file_url);

      if (downloadError) {
        throw new Error(`Download failed: ${downloadError.message}`);
      }

      if (schemeData) {
        console.log('[extract-pdf-text] Marking scheme downloaded, size:', schemeData.size);
        const schemeBuffer = await schemeData.arrayBuffer();
        console.log('[extract-pdf-text] ArrayBuffer size:', schemeBuffer.byteLength);

        const buffer = Buffer.from(schemeBuffer);
        console.log('[extract-pdf-text] Buffer created, length:', buffer.length);

        console.log('[extract-pdf-text] Starting PDF parsing...');
        const schemePdf = await pdfParse(buffer);
        console.log('[extract-pdf-text] PDF parsed, text length:', schemePdf.text?.length || 0);

        markingSchemeText = schemePdf.text || "";
      } else {
        throw new Error("No data returned from storage");
      }
    } catch (error) {
      console.error("Error extracting marking scheme text:", error);
      console.error("Error stack:", error.stack);
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
