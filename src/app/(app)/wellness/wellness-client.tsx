"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { submitCheckin } from "@/app/actions/wellness";
import {
  type WellnessCheckin,
  MOOD_LABELS,
  STRESS_LABELS,
  ENERGY_LABELS,
} from "@/app/actions/wellness-types";

const GREEN = "#66BB6A";
const GREEN_DIM = "rgba(102,187,106,0.12)";
const GREEN_BORDER = "rgba(102,187,106,0.25)";

function ScoreSelector({
  label,
  value,
  onChange,
  labels,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  labels: readonly string[];
  color: string;
}) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#E8EDF5",
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{value > 0 ? labels[value] : "Select…"}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const isSelected = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              style={{
                flex: 1,
                padding: "10px 4px",
                borderRadius: 10,
                border: `1px solid ${isSelected ? color : "rgba(255,255,255,0.08)"}`,
                background: isSelected ? `${color}22` : "rgba(255,255,255,0.03)",
                color: isSelected ? color : "#5A6478",
                fontSize: 18,
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{labels[n].split(" ")[0]}</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.2 }}>{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MoodDot({ value, color }: { value: number; color: string }) {
  const opacity = 0.3 + (value / 5) * 0.7;
  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        opacity,
        flexShrink: 0,
      }}
      title={`${value}/5`}
    />
  );
}

function HistoryCard({ checkin }: { checkin: WellnessCheckin }) {
  const date = new Date(checkin.week_of);
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 8, fontWeight: 600 }}>
        Week of {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#8892A4", width: 44 }}>Mood</span>
          <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(checkin.mood / 5) * 100}%`, background: GREEN, borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 10, color: GREEN, fontWeight: 700, width: 12 }}>{checkin.mood}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#8892A4", width: 44 }}>Stress</span>
          <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(checkin.stress / 5) * 100}%`, background: "#EF5350", borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 10, color: "#EF5350", fontWeight: 700, width: 12 }}>{checkin.stress}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#8892A4", width: 44 }}>Energy</span>
          <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(checkin.energy / 5) * 100}%`, background: "#42A5F5", borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 10, color: "#42A5F5", fontWeight: 700, width: 12 }}>{checkin.energy}</span>
        </div>
      </div>
      {checkin.notes && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: "#8892A4",
            fontStyle: "italic",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          &ldquo;{checkin.notes}&rdquo;
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
        <MoodDot value={checkin.mood} color={GREEN} />
        <MoodDot value={checkin.stress} color="#EF5350" />
        <MoodDot value={checkin.energy} color="#42A5F5" />
      </div>
    </div>
  );
}

export function WellnessClient({
  checkins,
  doneThisWeek: initialDone,
}: {
  checkins: WellnessCheckin[];
  doneThisWeek: boolean;
}) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(initialDone);

  const [mood, setMood] = useState(0);
  const [stress, setStress] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [notes, setNotes] = useState("");

  const canSubmit = mood > 0 && stress > 0 && energy > 0;

  const handleSubmit = () => {
    if (!canSubmit) { toast.error("Please rate your mood, stress, and energy."); return; }
    start(async () => {
      const res = await submitCheckin({ mood, stress, energy, notes: notes.trim() || undefined });
      if (res.ok) {
        toast.success("Check-in saved! Take care of yourself. 💚");
        setDone(true);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div
        style={{
          background: `linear-gradient(135deg, ${GREEN_DIM}, rgba(102,187,106,0.04))`,
          border: `1px solid ${GREEN_BORDER}`,
          borderRadius: 20,
          padding: 28,
          marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 11, color: GREEN, fontWeight: 700, letterSpacing: 0.5 }}>
          MENTAL HEALTH
        </span>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#E8EDF5",
            margin: "4px 0 6px",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          💚 Weekly Wellness Check-in
        </h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
          Your mental health matters. Take 60 seconds to check in.
        </p>
      </div>

      {/* Check-in form or already-done panel */}
      {done ? (
        <div
          style={{
            background: "#111827",
            border: `1px solid ${GREEN_BORDER}`,
            borderRadius: 16,
            padding: 32,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>💚</div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#E8EDF5",
              margin: "0 0 8px",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Already checked in this week!
          </h2>
          <p style={{ fontSize: 13, color: "#8892A4", margin: "0 0 16px", lineHeight: 1.6 }}>
            Great work taking care of yourself. Your check-in for this week has been recorded.
            Come back next Monday for your next check-in.
          </p>
          <div
            style={{
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
              padding: "8px 18px",
              background: GREEN_DIM,
              color: GREEN,
              border: `1px solid ${GREEN_BORDER}`,
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span>✓</span> Check-in complete
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16,
            padding: 24,
            marginBottom: 32,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#E8EDF5",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            How are you feeling this week?
          </div>

          <ScoreSelector
            label="Mood — How are you feeling overall?"
            value={mood}
            onChange={setMood}
            labels={MOOD_LABELS}
            color={GREEN}
          />

          <ScoreSelector
            label="Stress — How stressed are you feeling?"
            value={stress}
            onChange={setStress}
            labels={STRESS_LABELS}
            color="#EF5350"
          />

          <ScoreSelector
            label="Energy — What's your energy level like?"
            value={energy}
            onChange={setEnergy}
            labels={ENERGY_LABELS}
            color="#42A5F5"
          />

          {/* Notes */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                color: "#8892A4",
                textTransform: "uppercase",
                letterSpacing: 0.4,
                marginBottom: 6,
              }}
            >
              Notes <span style={{ color: "#5A6478", fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything on your mind? (optional)"
              rows={3}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0A0E1A",
                color: "#E8EDF5",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "'Nunito', sans-serif",
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={pending || !canSubmit}
            style={{
              padding: "13px 0",
              background: !canSubmit || pending ? "rgba(102,187,106,0.1)" : GREEN_DIM,
              color: !canSubmit || pending ? "#5A6478" : GREEN,
              border: `1px solid ${!canSubmit || pending ? "rgba(255,255,255,0.08)" : GREEN_BORDER}`,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: pending || !canSubmit ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {pending ? "Saving check-in…" : "Submit Weekly Check-in 💚"}
          </button>
        </div>
      )}

      {/* Past Check-ins */}
      <div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#E8EDF5",
            marginBottom: 16,
            fontFamily: "'Space Grotesk', sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>📊</span>
          <span>Past Check-ins</span>
          <span style={{ fontSize: 12, color: "#8892A4", fontWeight: 400 }}>
            ({checkins.length} recorded)
          </span>
        </div>

        {checkins.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#8892A4",
              background: "#111827",
              border: "1px dashed rgba(255,255,255,0.08)",
              borderRadius: 12,
              fontSize: 13,
            }}
          >
            No check-ins recorded yet. Your wellness history will appear here after your first check-in.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {checkins.map((c) => (
              <HistoryCard key={c.id} checkin={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
