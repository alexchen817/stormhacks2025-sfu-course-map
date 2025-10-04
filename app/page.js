"use client";

import { useState } from "react";

export default function Home() {
  const [result, setResult] = useState("");

  const handleClick = async () => {
    try {
      const response = await fetch("/api/genai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Explain where Pandas usually live" }),
      });

      const data = await response.json();
      setResult(data.text);
    } catch (error) {
      console.error("Error calling API:", error);
      setResult("Error calling API");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Gemini API Test</h1>
      <button onClick={handleClick}>Generate AI Text</button>
      <p>{result}</p>
    </div>
  );
}
