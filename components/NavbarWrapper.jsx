"use client";
import { useState } from "react";
import { FloatingNavDemo } from "./Navbar";
import CourseGraph from "./CourseGraph";

export function NavbarWrapper() {
  const [courseData, setCourseData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [showLegend, setShowLegend] = useState(true);

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
        {graphData && !graphLoading && !courseData?.error && (
          <>
            {showLegend ? (
          <div
            style={{
              position: "absolute",
              top: "7rem",
              right: "2.5rem",
              maxWidth: "280px",
              padding: "1.25rem 1.5rem",
              borderRadius: "1rem",
              color: "#F8FAFC",
              background: "rgba(15, 23, 42, 0.65)",
              boxShadow: "0 20px 35px -20px rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              backdropFilter: "blur(14px)",
              pointerEvents: "auto",
              lineHeight: 1.5,
            }}
          >
            <button
              type="button"
              onClick={() => setShowLegend(false)}
              style={{
                position: "absolute",
                top: "0.75rem",
                right: "0.75rem",
                background: "transparent",
                border: "1px solid rgba(148, 163, 184, 0.45)",
                borderRadius: "999px",
                color: "rgba(248, 250, 252, 0.8)",
                padding: "0.2rem 0.65rem",
                fontSize: "0.7rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Hide
            </button>
            <p style={{ fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem", color: "rgba(226, 232, 240, 0.85)" }}>
              How To Explore
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.9rem" }}>
              <li style={{ marginBottom: "0.65rem" }}>
                • <strong>Drag</strong> nodes to inspect pathways. Click <strong>Reset View</strong> to recentre.
              </li>
              <li style={{ marginBottom: "0.65rem" }}>
                • <strong>Scroll / pinch</strong> anywhere to zoom in or out.
              </li>
              <li style={{ marginBottom: "0.9rem" }}>
                • <strong>Hover</strong> a course to highlight its relationships.
              </li>
            </ul>
            <p style={{ fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem", color: "rgba(226, 232, 240, 0.85)" }}>
              Color Legend
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.9rem" }}>
              <li style={{ marginBottom: "0.55rem" }}>
                • <span style={{ color: "#f87171" }}>Red node</span>: course you searched.
              </li>
              <li style={{ marginBottom: "0.55rem" }}>
                • <span style={{ color: "#60a5fa" }}>Blue node</span>: prerequisite or dependent course.
              </li>
              <li style={{ marginBottom: "0.55rem" }}>
                • <span style={{ color: "#38bdf8" }}>Blue edge</span>: course unlocked by the hovered node.
              </li>
              <li>
                • <span style={{ color: "#facc15" }}>Gold edge</span>: requirement leading into the hovered node.
              </li>
            </ul>
          </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLegend(true)}
                style={{
                  position: "absolute",
                  top: "7rem",
                  right: "2.5rem",
                  padding: "0.6rem 1.2rem",
                  borderRadius: "999px",
                  background: "rgba(15, 23, 42, 0.65)",
                  color: "#F8FAFC",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  letterSpacing: "0.1em",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: "0 20px 35px -20px rgba(15, 23, 42, 0.8)",
                  backdropFilter: "blur(14px)",
                }}
              >
                Show Legend
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
