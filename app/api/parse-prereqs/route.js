import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export async function POST(req) {
  try {
    const { prerequisiteText } = await req.json();

    const prompt = `Extract all course codes from this prerequisite text and return them as a simple JSON array of strings. Only include the course codes (e.g., "CMPT 125", "MACM 101"), nothing else.

Prerequisite text: "${prerequisiteText}"

Return ONLY a valid JSON array like: ["CMPT 125", "MACM 101", "CMPT 129"]
Do not include any explanations, just the JSON array.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: prompt,
    });

    let text = response.text.trim();
    
    // Remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const courses = JSON.parse(text);

    return new Response(JSON.stringify({ courses }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Parse prereqs error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to parse prerequisites" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}