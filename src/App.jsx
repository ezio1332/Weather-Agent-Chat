import React, { useState } from "react";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((msgs) => [...msgs, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(
        "https://millions-screeching-vultur.mastra.cloud/api/agents/weatherAgent/stream",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-mastra-dev-playground": "true",
          },
          body: JSON.stringify({
            messages: [userMessage],
            runId: "weatherAgent",
            maxRetries: 2,
            maxSteps: 5,
            temperature: 0.5,
            topP: 1,
            runtimeContext: {},
            threadId: "YOUR_COLLEGE_ROLL_NUMBER",
            resourceId: "weatherAgent",
          }),
        }
      );

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let currentMessage = "";
      let agentMessageStarted = false;
      let hasShownToolResult = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/(?<=})\s|(?<=\n)/);
        buffer = parts.pop();

        for (let part of parts) {
          part = part.trim();
          if (!part) continue;

          const prefixMatch = part.match(/^([a-z0-9]+):\s*(.*)$/i);
          if (!prefixMatch) continue;

          const [, prefix, jsonStr] = prefixMatch;

          if (prefix === "a") {
            try {
              const parsed = JSON.parse(jsonStr);
              const weather = parsed?.result;
              if (weather?.temperature) {
                const summary = `🌦️ Weather in ${weather.location}:
Temp: ${weather.temperature}°C (Feels like ${weather.feelsLike}°C)
Humidity: ${weather.humidity}%
Wind: ${weather.windSpeed} km/h (Gusts up to ${weather.windGust} km/h)
Condition: ${weather.conditions}`;
                hasShownToolResult = true;
                setMessages((msgs) => [
                  ...msgs,
                  { role: "agent", content: summary },
                ]);
              }
            } catch (err) {
              console.warn("Failed to parse a: chunk", err);
            }
          }

          if (!hasShownToolResult && prefix === "0") {
            try {
              const token = JSON.parse(jsonStr);
              currentMessage += token;
              if (!agentMessageStarted) {
                setMessages((msgs) => [
                  ...msgs,
                  { role: "agent", content: token },
                ]);
                agentMessageStarted = true;
              } else {
                setMessages((msgs) =>
                  msgs.map((msg, idx) =>
                    idx === msgs.length - 1
                      ? { ...msg, content: currentMessage }
                      : msg
                  )
                );
              }
            } catch (err) {
              console.warn("Invalid 0: token", jsonStr);
            }
          }
        }
      }
    } catch (error) {
      setMessages((msgs) => [
        ...msgs,
        { role: "agent", content: "❌ Error fetching response." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="title">🌦️ Weather Agent Chat</h1>
      <div className="chat-window">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message-row ${msg.role === "user" ? "user" : "agent"}`}
          >
            <div className="bubble">{msg.content}</div>
          </div>
        ))}
        {loading && <div className="bubble typing">⏳ Typing...</div>}
      </div>
      <div className="input-area">
        <input
          placeholder="Ask about the weather..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading} className="send-btn">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="white"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="white"
            className="send-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 10l9 4-4 9 12-18L3 10z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
