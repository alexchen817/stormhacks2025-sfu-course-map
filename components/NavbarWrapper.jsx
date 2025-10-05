"use client";
import { useState } from "react";
import { FloatingNavDemo } from "./Navbar";
import CourseGraph from "./CourseGraph";

export function NavbarWrapper() {
  const [courseData, setCourseData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);

  const handleCourseSearch = async (searchQuery) => {
    setGraphLoading(true);
    setCourseData(null);
    setGraphData(null);
    
    // Parse the search query (e.g., "CMPT225" or "CMPT 225")
    const firstCourse = searchQuery.split(',')[0].trim();
    
    // Match patterns like "CMPT225", "CMPT 225", etc.
    const match = firstCourse.match(/([A-Z]+)\s*(\d+)/i);
    
    if (match) {
      const dept = match[1].toUpperCase();
      const number = match[2];
      const courseStr = `${dept} ${number}`;
      
      try {
        // Fetch course data
        const response = await fetch(
          `/api/sfu-courses?dept=${encodeURIComponent(dept)}&number=${encodeURIComponent(number)}`
        );
        
        if (!response.ok) {
          throw new Error("Failed to fetch courses");
        }
        
        const data = await response.json();
        setCourseData(data);
        
        // Build prerequisite graph
        const graphResponse = await fetch('/api/build-graph', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startCourse: courseStr }),
        });

        if (graphResponse.ok) {
          const graph = await graphResponse.json();
          console.log("Graph data received:", graph);
          setGraphData(graph);
        } else {
          const errorData = await graphResponse.json();
          console.error("Failed to build graph:", graphResponse.status, errorData);
        }
        
        setGraphLoading(false);
        
        // Scroll to results
        setTimeout(() => {
          document.getElementById('course-results')?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }, 100);
      } catch (error) {
        console.error("Error fetching courses:", error);
        setCourseData({ error: "Failed to fetch course data" });
        setGraphLoading(false);
      }
    } else {
      setCourseData({ error: "Invalid course format. Use format like: CMPT225" });
      setGraphLoading(false);
    }
    
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#020617",
      }}
    >
      <FloatingNavDemo onSearch={handleCourseSearch} />
      <div
        id="course-results"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {graphLoading && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "#F9FAFB",
              fontSize: "1rem",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Building prerequisite tree...
          </div>
        )}
        {!graphLoading && courseData?.error && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "#F87171",
              fontSize: "1rem",
              letterSpacing: "0.05em",
              textAlign: "center",
            }}
          >
            {courseData.error}
          </div>
        )}
        <CourseGraph data={graphData} />
      </div>
    </div>
  );
}

