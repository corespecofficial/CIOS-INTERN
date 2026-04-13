"use client";

import React, { useState, useEffect } from "react";

const LOGO_URL =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const WISE_QUOTES = [
  "Consistency is the true foundation of trust.",
  "Hard work beats talent when talent doesn't work hard.",
  "Integrity is doing the right thing even when no one is watching.",
  "Transparency breeds legitimacy.",
  "Accountability is the glue that ties commitment to results.",
  "Honesty is the first chapter in the book of wisdom.",
  "Discipline is the bridge between goals and accomplishment.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Excellence is not a destination but a continuous journey.",
  "The secret of your success is determined by your daily agenda.",
  "Without commitment, you cannot have depth in anything.",
  "Character is doing what's right when nobody's looking.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "The harder you work, the greater you'll feel when you achieve it.",
  "Don't stop when you're tired. Stop when you're done.",
  "Strive for progress, not perfection.",
  "Act as if what you do makes a difference. It does.",
  "Your only limit is your mind.",
  "Champions keep playing until they get it right.",
];

interface LoadingScreenProps {
  isVisible: boolean;
}

export default function LoadingScreen({ isVisible }: LoadingScreenProps) {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    if (isVisible) {
      const randomIndex = Math.floor(Math.random() * WISE_QUOTES.length);
      setQuote(WISE_QUOTES[randomIndex]);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(10, 14, 26, 0.95)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes logoPulse {
              0%, 100% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.08); opacity: 1; }
            }
            @keyframes dotBounce {
              0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
              40% { transform: translateY(-10px); opacity: 1; }
            }
          `,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          maxWidth: 400,
          padding: "0 24px",
          textAlign: "center",
        }}
      >
        {/* Pulsing Logo */}
        <img
          src={LOGO_URL}
          alt="CIOS"
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            objectFit: "cover",
            animation: "logoPulse 2s ease-in-out infinite",
          }}
        />

        {/* Wise Quote */}
        <p
          style={{
            fontStyle: "italic",
            color: "#9CA3AF",
            fontSize: 14,
            lineHeight: 1.6,
            margin: 0,
            minHeight: 44,
          }}
        >
          &ldquo;{quote}&rdquo;
        </p>

        {/* Animated Dots */}
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1E88E5, #FFC107)",
                animation: `dotBounce 1.4s ${i * 0.2}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        {/* Loading Text */}
        <p
          style={{
            color: "#6B7280",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: 1,
            margin: 0,
          }}
        >
          Loading...
        </p>
      </div>
    </div>
  );
}
