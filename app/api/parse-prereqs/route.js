import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export async function POST(req) {
  try {
    const { prerequisiteText } = await req.json();
const prompt = `Extract all course codes from this prerequisite text and return them as a simple JSON array of strings.

Important rules:
- Include course codes like "CMPT 125", "MACM 101" that are TRUE university prerequisites
- If there are alternatives (e.g., "CMPT 125 or CMPT 130"), include BOTH courses
- If the course has already been used, but another course still requires that prerequisite, still connect that course.

OMIT the following:
- BC 12 or any British Columbia Grade 12 courses
- High school level prerequisites  
- Any university courses that are listed as ALTERNATIVES or EQUIVALENTS to BC 12 courses
- Courses mentioned alongside phrases like "or equivalent", "or any of", when paired with BC/Grade 12 requirements
- Example: "BC Math 12 (or equivalent, or any of MATH 100, 150, 151)" - omit ALL of these including MATH 100, 150, 151

Include ONLY courses that are standalone university prerequisites, not courses offered as substitutes for high school requirements.

Prerequisite text: "${prerequisiteText}"

Return ONLY a valid JSON array like: ["CMPT 125", "MACM 101"]
Do not include any explanations, just the JSON array.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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