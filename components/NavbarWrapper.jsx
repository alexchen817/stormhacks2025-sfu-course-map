"use client";
import { useState } from "react";
import { FloatingNavDemo } from "./Navbar";
import CourseGraph from "./CourseGraph";

export function NavbarWrapper() {
  const [courseData, setCourseData] = useState(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [graphData, setGraphData] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [showGraph, setShowGraph] = useState(true);

  const handleCourseSearch = async (searchQuery) => {
    setCourseLoading(true);
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
    
    setCourseLoading(false);
  };

  return (
    <>
      <FloatingNavDemo onSearch={handleCourseSearch} />
      
      {/* Course Search Results */}
      {(courseLoading || courseData || graphData) && (
        <div 
          id="course-results"
          style={{ 
            padding: "2rem",
            marginTop: "6rem",
            maxWidth: "1400px",
            marginLeft: "auto",
            marginRight: "auto"
          }}
        >
          {courseLoading && <p>Loading courses...</p>}
          
          {graphLoading && <p>Building prerequisite tree...</p>}

          {/* Graph Visualization */}
          {graphData && graphData.nodes && graphData.nodes.length > 0 && (
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2>Prerequisite Tree</h2>
                <div>
                  <button 
                    onClick={() => setShowGraph(!showGraph)}
                    style={{ 
                      padding: "0.5rem 1rem", 
                      marginRight: "0.5rem",
                      cursor: "pointer",
                      background: "#3498db",
                      color: "white",
                      border: "none",
                      borderRadius: "4px"
                    }}
                  >
                    {showGraph ? "Hide Graph" : "Show Graph"}
                  </button>
                  <button 
                    onClick={() => window.resetGraph && window.resetGraph()}
                    style={{ 
                      padding: "0.5rem 1rem",
                      cursor: "pointer",
                      background: "#2ecc71",
                      color: "white",
                      border: "none",
                      borderRadius: "4px"
                    }}
                  >
                    Reset Graph
                  </button>
                </div>
              </div>
              {showGraph && (
                <div style={{ 
                  border: "2px solid #ddd", 
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "#f9f9f9"
                }}>
                  <CourseGraph data={graphData} />
                </div>
              )}
              <p style={{ marginTop: "1rem", color: "#666" }}>
                <strong>Nodes:</strong> {graphData.nodes.length} courses | 
                <strong> Links:</strong> {graphData.links.length} prerequisites
              </p>
            </div>
          )}

          {/* Course Data JSON */}
          {courseData && (
            <div>
              <h2 style={{ marginBottom: "1rem" }}>Course Details</h2>
              {courseData.error ? (
                <p style={{ color: "red" }}>{courseData.error}</p>
              ) : (
                <details>
                  <summary style={{ cursor: "pointer", padding: "0.5rem", background: "#f0f0f0", borderRadius: "4px" }}>
                    View Raw JSON Data
                  </summary>
                  <pre style={{
                    background: "#f5f5f5",
                    padding: "1rem",
                    borderRadius: "4px",
                    overflow: "auto",
                    maxHeight: "500px",
                    border: "1px solid #ddd",
                    marginTop: "0.5rem"
                  }}>
                    {JSON.stringify(courseData, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}