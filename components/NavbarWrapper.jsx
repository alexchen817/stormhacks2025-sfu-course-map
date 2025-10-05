"use client";
import { useState } from "react";
import { FloatingNavDemo } from "./Navbar";

export function NavbarWrapper() {
  const [courseData, setCourseData] = useState(null);
  const [courseLoading, setCourseLoading] = useState(false);

  const handleCourseSearch = async (searchQuery) => {
    setCourseLoading(true);
    setCourseData(null);
    
    // Parse the search query (e.g., "CMPT225" or "CMPT 225")
    const firstCourse = searchQuery.split(',')[0].trim();
    
    // Match patterns like "CMPT225", "CMPT 225", etc.
    const match = firstCourse.match(/([A-Z]+)\s*(\d+)/i);
    
    if (match) {
      const dept = match[1].toUpperCase();
      const number = match[2];
      
      try {
        const response = await fetch(
          `/api/sfu-courses?dept=${encodeURIComponent(dept)}&number=${encodeURIComponent(number)}`
        );
        
        if (!response.ok) {
          throw new Error("Failed to fetch courses");
        }
        
        const data = await response.json();
        setCourseData(data);
        
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
      }
    } else {
      setCourseData({ error: "Invalid course format. Use format like: CMPT225" });
    }
    
    setCourseLoading(false);
  };

  return (
    <>
      <FloatingNavDemo onSearch={handleCourseSearch} />
      
      {/* Course Search Results - Fixed position */}
      {(courseLoading || courseData) && (
        <div 
          id="course-results"
          style={{ 
            padding: "2rem",
            marginTop: "6rem",
            maxWidth: "1200px",
            marginLeft: "auto",
            marginRight: "auto"
          }}
        >
          {courseLoading && <p>Loading courses...</p>}
          
          {courseData && (
            <div>
              <h2 style={{ marginBottom: "1rem" }}>Course Results</h2>
              {courseData.error ? (
                <p style={{ color: "red" }}>{courseData.error}</p>
              ) : (
                <pre style={{
                  background: "#f5f5f5",
                  padding: "1rem",
                  borderRadius: "4px",
                  overflow: "auto",
                  maxHeight: "500px",
                  border: "1px solid #ddd"
                }}>
                  {JSON.stringify(courseData, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}