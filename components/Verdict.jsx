import { LEVELS } from "@/lib/scoring";
import SourceTag from "./SourceTag";

// Widths use a square-root scale so an hour of work is still visible next to weeks of waiting.
function widths(time) {
  const work = Math.sqrt(Math.max(time.work.hours / 8, 0.05));
  const wait = time.wait.days ? Math.sqrt(time.wait.days) : 0;
  const buffer = time.buffer?.days ? Math.sqrt(time.buffer.days) : 0;
  const total = work + wait + buffer;
  return { work: (work / total) * 100, wait: (wait / total) * 100, buffer: (buffer / total) * 100 };
}

export default function Verdict({ guide }) {
  const level = LEVELS[guide.level];
  const w = widths(guide.time);

  return (
    <section className="verdict" aria-labelledby="verdict-level">
      <p id="verdict-level" className={`level tone-${level.tone}`}>{level.label}</p>
      <p className="level-meaning">{level.meaning}</p>
      <ul className="reasons">
        {guide.reasons.map((r) => <li key={r}>{r}</li>)}
      </ul>

      <div className="timebar">
        <div className="bar" role="img" aria-label={`Your work ${guide.time.work.text}. Waiting ${guide.time.wait.text}.`}>
          <span className="seg-work" style={{ width: `${w.work}%` }} />
          {w.wait > 0 && <span className="seg-wait" style={{ width: `${w.wait}%` }} />}
          {w.buffer > 0 && <span className="seg-buffer" style={{ width: `${w.buffer}%` }} />}
        </div>
        <div className="stats">
          <div>
            <div className="stat-label"><span className="dot seg-work" />Your work</div>
            <div className="stat-value">{guide.time.work.text}</div>
          </div>
          <div>
            <div className="stat-label"><span className="dot seg-wait" />Waiting</div>
            <div className="stat-value">{guide.time.wait.text}</div>
          </div>
          <div>
            <div className="stat-label">Cost</div>
            <div className="stat-value">{guide.cost}</div>
          </div>
        </div>
        {guide.time.buffer && (
          <p className="confidence">Allow extra time: {guide.time.buffer.text}</p>
        )}
      </div>

      <div className="blocker">
        <div className="stat-label">Most likely to slow you down</div>
        <div>
          {guide.blocker.text}
          <SourceTag id={guide.blocker.src} sources={guide.sources} />
        </div>
      </div>

      <p className="confidence">
        Confidence: {guide.confidence}. {guide.confidence === "High"
          ? "The verdict rests on the provider's own documentation."
          : guide.confidence === "Medium"
          ? "Part of the verdict rests on community reports."
          : "Key facts are unverified."}{" "}
        <a href="#evidence">See sources</a>
      </p>
    </section>
  );
}
