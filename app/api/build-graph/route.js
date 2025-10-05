export async function POST(req) {
    try {
      const { startCourse } = await req.json();
      
      const nodes = [];
      const links = [];
      const visited = new Set();
      const nodeMap = new Map();
  
      const courseCodePattern = /([A-Z]+)\s*(\d+[A-Z]*)/i;

      // Helper to parse course string "CMPT 225" -> {dept: "CMPT", number: "225"}
      function parseCourse(courseStr) {
        const match = courseStr.trim().match(courseCodePattern);
        if (!match) return null;
        return { dept: match[1].toUpperCase(), number: match[2].toUpperCase() };
      }
  
      // Recursive function to build the tree
      async function fetchPrerequisites(courseStr, depth = 0) {
        if (depth > 5) return; // Limit depth to prevent infinite loops
        if (visited.has(courseStr)) return;
        
        visited.add(courseStr);
        
        const parsed = parseCourse(courseStr);
        if (!parsed) return;
        
        // Skip CMPT 300 specifically
        if (parsed.dept === "CMPT" && parsed.number === "300") return;
  
        // Fetch course data
        const courseResponse = await fetch(
          `${req.headers.get('origin')}/api/sfu-courses?dept=${parsed.dept}&number=${parsed.number}`
        );
  
        if (!courseResponse.ok) return;
  
        const courseData = await courseResponse.json();
        if (!courseData || courseData.length === 0) return;
  
        const course = courseData[0];
        const courseId = `${course.dept} ${course.number}`;
  
        // Add node
        if (!nodeMap.has(courseId)) {
          nodes.push({
            id: courseId,
            title: course.title,
            dept: course.dept,
            number: course.number,
          });
          nodeMap.set(courseId, true);
        }
  
        // Parse prerequisites
        if (course.prerequisites && course.prerequisites.trim()) {
          const parseResponse = await fetch(
            `${req.headers.get('origin')}/api/parse-prereqs`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prerequisiteText: course.prerequisites }),
            }
          );
  
          if (parseResponse.ok) {
            const { courses: prereqCourses } = await parseResponse.json();
  
            // Add links and recursively fetch prerequisites
            for (const prereqStr of prereqCourses) {
              const prereqParsed = parseCourse(prereqStr);
              if (!prereqParsed) continue;
  
              const prereqId = `${prereqParsed.dept} ${prereqParsed.number}`;
  
              // Add link (from prerequisite to current course)
              links.push({
                source: prereqId,
                target: courseId,
              });
  
              // Recursively fetch this prerequisite's prerequisites
              await fetchPrerequisites(prereqStr, depth + 1);
            }
          }
        }
      }
  
      // Start the recursive fetch
      await fetchPrerequisites(startCourse);
  
      return new Response(
        JSON.stringify({ nodes, links }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Build graph error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to build course graph" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
