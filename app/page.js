"use client";
import { useState } from "react";

export default function Home() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setResult("");
    try {
      const response = await fetch("/api/genai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Explain where Pandas usually live" }),
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setResult(text);
      }
    } catch (error) {
      console.error("Error calling API:", error);
      setResult("Error calling API");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Gemini API Test</h1>
      <button onClick={handleClick} disabled={loading}>
        {loading ? "Generating..." : "Generate AI Text"}
      </button>
      <p>{result}</p>
    </div>
  );
}