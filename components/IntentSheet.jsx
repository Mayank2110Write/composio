"use client";
import { useEffect, useRef, useState } from "react";
import { WHO, BRAND } from "@/lib/intent";

function Question({ name, legend, options, value, onChange }) {
  return (
    <fieldset className="question">
      <legend>{legend}</legend>
      <div className="options">
        {options.map((o) => (
          <label key={o.id} className="option">
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
            />
            <span>
              {o.label}
              {o.hint && <span className="hint">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function IntentSheet({ appName, doesOptions, initial, onSubmit, onClose, submitLabel = "Show my path" }) {
  const [does, setDoes] = useState(initial?.does ?? doesOptions[0]?.id);
  const [who, setWho] = useState(initial?.who ?? "public");
  const [brand, setBrand] = useState(initial?.brand ?? "yes");
  const sheetRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    sheetRef.current?.querySelector("input")?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref={sheetRef}>
        <h2 id="sheet-title">{appName}</h2>
        <p className="sheet-sub">Three answers decide how long this takes.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ does, who, brand });
          }}
        >
          <Question
            name="does"
            legend={`What will your agent do in ${appName}?`}
            options={doesOptions}
            value={does}
            onChange={setDoes}
          />
          <Question name="who" legend="Who will connect their accounts?" options={WHO} value={who} onChange={setWho} />
          <Question
            name="brand"
            legend="Should users see your app's name when they connect?"
            options={BRAND}
            value={brand}
            onChange={setBrand}
          />
          <div className="sheet-actions">
            <button type="button" className="link-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
