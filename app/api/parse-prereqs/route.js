// Pure regex parser - no AI, no rate limits, instant results
export async function POST(req) {
  try {
    const { prerequisiteText } = await req.json();
    
    if (!prerequisiteText || typeof prerequisiteText !== 'string') {
      return new Response(JSON.stringify({ courses: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract all course codes using regex
    // Matches patterns like: CMPT 225, CMPT 105W, MACM101, ENSC 251D
    const coursePattern = /\b([A-Z]{2,5})\s*(\d{3,4})([A-Z]{0,2})\b/gi;
    const matches = [...prerequisiteText.matchAll(coursePattern)];

    // Filter out BC 12 / high school courses and create unique course codes
    const coursesSet = new Set();
    const excludePatterns = [
      /^BC\s*\d+[A-Z]*$/i,                    // BC 12, BC 11, BC 12W, etc.
      /^(MATH|CHEM|PHYS|ENGL|BIO)\s*11[A-Z]*$/i,  // Grade 11 courses
      /^(MATH|CHEM|PHYS|ENGL|BIO)\s*12[A-Z]*$/i,  // Grade 12 courses
    ];

    matches.forEach(match => {
      const dept = match[1].toUpperCase();
      const number = match[2];
      const suffix = match[3] ? match[3].toUpperCase() : '';
      const courseCode = `${dept} ${number}${suffix}`;

      // Skip if it matches any exclude pattern
      const shouldExclude = excludePatterns.some(pattern => pattern.test(courseCode));
      
      if (!shouldExclude) {
        coursesSet.add(courseCode);
      }
    });

    const courses = Array.from(coursesSet);

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