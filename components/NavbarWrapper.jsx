"use client";
import { useRef, useState } from "react";
import { FloatingNavDemo } from "./Navbar";
import CourseGraph from "./CourseGraph";

const parseCourseCode = (code) => {
  if (!code) return null;
  const match = code.match(/([A-Z]+)\s*(\d+)/i);
  if (!match) return null;
  return {
    dept: match[1].toUpperCase(),
    number: match[2],
  };
};

const valueToText = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const name = [item.firstName, item.lastName].filter(Boolean).join(" ");
          return item.name || name || null;
        }
        return null;
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text;
    if (Array.isArray(value.lines)) return value.lines.filter(Boolean).join("\n");
    const name = [value.firstName, value.lastName].filter(Boolean).join(" ");
    return value.name || name || null;
  }
  return null;
};

export function NavbarWrapper() {
  const [courseData, setCourseData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState(null);
  const [infoDetails, setInfoDetails] = useState(null);
  const [infoScrolled, setInfoScrolled] = useState(false);
  const courseInfoCache = useRef(new Map());
  const currentRequestRef = useRef(null);

  const resetInfoPanel = () => {
    setActiveNodeId(null);
    setInfoVisible(false);
    setInfoDetails(null);
    setInfoError(null);
    setInfoLoading(false);
    setInfoScrolled(false);
  };

  const handleCourseSearch = async (searchQuery) => {
    setGraphLoading(true);
    setCourseData(null);
    setGraphData(null);
    resetInfoPanel();
    courseInfoCache.current = new Map();
    
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

  const handleNodeSelect = async (node) => {
    if (!node?.id) return;

    const courseId = node.id;
    setActiveNodeId(courseId);
    if (!infoVisible) {
      setInfoVisible(true);
    }
    setInfoScrolled(false);
    setInfoError(null);

    if (courseInfoCache.current.has(courseId)) {
      setInfoDetails(courseInfoCache.current.get(courseId));
      setInfoLoading(false);
      return;
    }

    const parsed = parseCourseCode(courseId);
    if (!parsed) {
      setInfoDetails(null);
      setInfoError("Unable to locate course details for this code.");
      setInfoLoading(false);
      return;
    }

    setInfoLoading(true);
    currentRequestRef.current = courseId;

    try {
      const response = await fetch(
        `/api/sfu-courses?dept=${encodeURIComponent(parsed.dept)}&number=${encodeURIComponent(parsed.number)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch course details");
      }

      const data = await response.json();
      courseInfoCache.current.set(courseId, data);

      if (currentRequestRef.current === courseId) {
        setInfoDetails(data);
        setInfoError(null);
      }
    } catch (error) {
      console.error("Error loading course details:", error);
      if (currentRequestRef.current === courseId) {
        setInfoDetails(null);
        setInfoError("Unable to load course details right now.");
      }
    } finally {
      if (currentRequestRef.current === courseId) {
        setInfoLoading(false);
      }
    }
  };

  const handleInfoClose = () => {
    resetInfoPanel();
  };

  const outlinesArray = Array.isArray(infoDetails)
    ? infoDetails
    : Array.isArray(infoDetails?.outlines)
      ? infoDetails.outlines
      : Array.isArray(infoDetails?.data)
        ? infoDetails.data
        : infoDetails
          ? [infoDetails]
          : [];

  const primaryOutline = outlinesArray[0] || null;
  const courseTitle = valueToText(primaryOutline?.title) || valueToText(primaryOutline?.courseTitle) || valueToText(primaryOutline?.name) || activeNodeId;
  const description = valueToText(primaryOutline?.description) || valueToText(primaryOutline?.info?.description);
  const units = primaryOutline?.units ?? primaryOutline?.unit ?? primaryOutline?.credit ?? primaryOutline?.credits ?? primaryOutline?.creditHours;
  const prerequisites = valueToText(primaryOutline?.prerequisites) || valueToText(primaryOutline?.info?.prerequisites);
  const corequisites = valueToText(primaryOutline?.corequisites) || valueToText(primaryOutline?.info?.corequisites);
  const notes = valueToText(primaryOutline?.notes) || valueToText(primaryOutline?.info?.notes);

  const termList = Array.from(new Set(outlinesArray
    .map((outline) => outline?.term || outline?.termName || outline?.semester || outline?.when || (outline?.year && outline?.term ? `${outline.term} ${outline.year}` : null))
    .filter(Boolean))).slice(0, 4);

  const instructorList = Array.from(new Set(outlinesArray
    .flatMap((outline) => {
      const instructors = outline?.instructors || outline?.info?.instructors;
      if (!instructors) return [];
      if (Array.isArray(instructors)) return instructors;
      return [instructors];
    })
    .map((instructor) => {
      if (typeof instructor === "string") return instructor;
      if (!instructor || typeof instructor !== "object") return null;
      const fullName = [instructor.firstName, instructor.lastName].filter(Boolean).join(" ");
      return instructor.name || fullName || null;
    })
    .filter(Boolean))).slice(0, 5);

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
        <CourseGraph
          data={graphData}
          activeNodeId={activeNodeId}
          onNodeClick={handleNodeSelect}
        />
        {infoVisible && graphData && !graphLoading && (
          <div
            style={{
              position: "absolute",
              top: "7rem",
              left: "2.5rem",
              width: "min(340px, 90vw)",
              maxHeight: "calc(100vh - 9rem)",
              overflowY: "auto",
              padding: "1.5rem 1.75rem",
              borderRadius: "1.25rem",
              background: "rgba(17, 24, 39, 0.92)",
              boxShadow: "0 24px 40px -24px rgba(2, 6, 23, 0.85)",
              backdropFilter: "blur(16px)",
              color: "#F8FAFC",
              zIndex: 4100,
              border: "none",
            }}
            onScroll={(event) => {
              const scrolled = event.currentTarget.scrollTop > 6;
              if (scrolled !== infoScrolled) {
                setInfoScrolled(scrolled);
              }
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                bottom: "-1px",
                width: "55%",
                height: "2px",
                background: "linear-gradient(90deg, rgba(239, 68, 68, 0), rgba(239, 68, 68, 0.9), rgba(239, 68, 68, 0))",
                opacity: infoScrolled ? 0 : 1,
                transition: "opacity 0.25s ease",
                pointerEvents: "none",
              }}
            />
            <button
              type="button"
              onClick={handleInfoClose}
              style={{
                position: "absolute",
                top: "0.9rem",
                right: "0.9rem",
                background: "rgba(248, 113, 113, 0.14)",
                border: "none",
                borderRadius: "999px",
                color: "rgba(248, 250, 252, 0.9)",
                padding: "0.25rem 0.7rem",
                fontSize: "0.72rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Close
            </button>
            <p style={{ fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#ef4444", marginBottom: "0.6rem" }}>
              Course Spotlight
            </p>
            <h2 style={{ fontSize: "1.85rem", fontWeight: 700, margin: 0, letterSpacing: "0.03em" }}>
              {activeNodeId || "Course"}
            </h2>
            {courseTitle && (
              <p style={{ marginTop: "0.4rem", marginBottom: "1rem", fontSize: "1rem", color: "rgba(226, 232, 240, 0.9)", lineHeight: 1.5 }}>
                {courseTitle}
              </p>
            )}

            {infoLoading && (
              <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(226, 232, 240, 0.7)" }}>
                Loading course details...
              </p>
            )}

            {infoError && !infoLoading && (
              <p style={{ marginTop: "0.5rem", color: "#fca5a5", fontSize: "0.9rem" }}>
                {infoError}
              </p>
            )}

            {!infoLoading && !infoError && (!infoDetails || outlinesArray.length === 0) && (
              <p style={{ marginTop: "0.5rem", color: "rgba(226, 232, 240, 0.8)", fontSize: "0.9rem" }}>
                No supplemental outline data was returned for this course.
              </p>
            )}

            {!infoLoading && !infoError && outlinesArray.length > 0 && (
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  {units && (
                    <div style={{
                      padding: "0.45rem 0.75rem",
                      borderRadius: "999px",
                      background: "rgba(37, 99, 235, 0.12)",
                      border: "1px solid rgba(59, 130, 246, 0.25)",
                      fontSize: "0.75rem",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}>
                      {units} Units
                    </div>
                  )}
                  {termList.length > 0 && (
                    <div style={{
                      padding: "0.45rem 0.75rem",
                      borderRadius: "999px",
                      background: "rgba(248, 113, 113, 0.12)",
                      border: "1px solid rgba(248, 113, 113, 0.25)",
                      fontSize: "0.75rem",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}>
                      Terms: {termList.join(", ")}
                    </div>
                  )}
                </div>

                {description && (
                  <div>
                    <p style={{ fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(226, 232, 240, 0.65)", marginBottom: "0.4rem" }}>
                      Overview
                    </p>
                    <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "rgba(226, 232, 240, 0.92)", whiteSpace: "pre-wrap" }}>
                      {description}
                    </p>
                  </div>
                )}

                {prerequisites && (
                  <div>
                    <p style={{ fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(226, 232, 240, 0.65)", marginBottom: "0.35rem" }}>
                      Prerequisites
                    </p>
                    <p style={{ fontSize: "0.95rem", color: "rgba(226, 232, 240, 0.92)", whiteSpace: "pre-wrap" }}>{prerequisites}</p>
                  </div>
                )}

                {corequisites && (
                  <div>
                    <p style={{ fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(226, 232, 240, 0.65)", marginBottom: "0.35rem" }}>
                      Corequisites
                    </p>
                    <p style={{ fontSize: "0.95rem", color: "rgba(226, 232, 240, 0.92)", whiteSpace: "pre-wrap" }}>{corequisites}</p>
                  </div>
                )}

                {instructorList.length > 0 && (
                  <div>
                    <p style={{ fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(226, 232, 240, 0.65)", marginBottom: "0.35rem" }}>
                      Recent Instructors
                    </p>
                    <p style={{ fontSize: "0.95rem", color: "rgba(226, 232, 240, 0.92)" }}>{instructorList.join(", ")}</p>
                  </div>
                )}

                {notes && (
                  <div>
                    <p style={{ fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(226, 232, 240, 0.65)", marginBottom: "0.35rem" }}>
                      Notes
                    </p>
                    <p style={{ fontSize: "0.95rem", color: "rgba(226, 232, 240, 0.92)", whiteSpace: "pre-wrap" }}>{notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
              background: "rgba(17, 24, 39, 0.9)",
              boxShadow: "0 24px 40px -24px rgba(2, 6, 23, 0.85)",
              backdropFilter: "blur(16px)",
              pointerEvents: "auto",
              lineHeight: 1.5,
              border: "none",
              position: "absolute",
            }}
          >
            <button
              type="button"
              onClick={() => setShowLegend(false)}
              style={{
                position: "absolute",
                top: "0.75rem",
                right: "0.75rem",
                background: "rgba(15, 23, 42, 0.6)",
                border: "none",
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
            <span
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                bottom: "-1px",
                width: "55%",
                height: "2px",
                background: "linear-gradient(90deg, rgba(239, 68, 68, 0), rgba(239, 68, 68, 0.9), rgba(239, 68, 68, 0))",
                pointerEvents: "none",
              }}
            />
            <p style={{ fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem", color: "#ef4444" }}>
              How To Explore
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.9rem" }}>
              <li style={{ marginBottom: "0.65rem" }}>
                • <strong>Drag</strong> nodes to inspect pathways. Click <strong>Reset View</strong> to recentre.
              </li>
              <li style={{ marginBottom: "0.65rem" }}>
                • <strong>Click</strong> a course to open its SFU outline card.
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
              <li>
                • Details card keeps its course highlighted until you close it.
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
                  padding: "0.55rem 1.25rem",
                  borderRadius: "999px",
                  background: "rgba(17, 24, 39, 0.9)",
                  color: "#F8FAFC",
                  border: "none",
                  letterSpacing: "0.12em",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: "0 24px 40px -24px rgba(2, 6, 23, 0.85)",
                  backdropFilter: "blur(16px)",
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
