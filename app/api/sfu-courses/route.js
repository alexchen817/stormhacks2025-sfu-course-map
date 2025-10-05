export async function GET(req) {
    try {
      const { searchParams } = new URL(req.url);
      const dept = searchParams.get('dept') || '';
      const number = searchParams.get('number') || '';
  
      const response = await fetch(
        `https://api.sfucourses.com/v1/rest/outlines?dept=${dept}&number=${number}`
      );
  
      if (!response.ok) {
        throw new Error(`SFU API returned status: ${response.status}`);
      }
  
      const data = await response.json();
  
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("SFU Courses API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch course data" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }