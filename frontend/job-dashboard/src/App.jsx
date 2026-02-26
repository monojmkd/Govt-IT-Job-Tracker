import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

// ── AI Job Finder Panel ──────────────────────────────────────────────
function AIJobFinder({ jobs }) {
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const quickFilters = [
    "IT",
    "Research",
    "Administrative",
    "Professor",
    "Data Entry",
    "2026",
  ];

  const toggleTag = (tag) =>
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const runAI = async () => {
    if (!jobs.length) return;
    setLoading(true);
    setError(null);
    setResults(null);

    const tags = activeTags.length ? activeTags.join(", ") : "any";
    const userQuery = query.trim() || "Find the most relevant opportunities";

    const prompt = `You are a government job matching assistant. Given job postings, find and rank the most relevant jobs based on the user's request.

User request: "${userQuery}"
Active filters: ${tags}

Available jobs (JSON):
${JSON.stringify(
  jobs.map((j) => ({ id: j.id, title: j.title, link: j.link })),
  null,
  2,
)}

Return ONLY valid JSON, no markdown, no extra text:
{
  "summary": "One sentence describing what you found",
  "matches": [
    {
      "id": "job id",
      "title": "job title",
      "link": "job link",
      "reason": "One short sentence why this matches",
      "score": 85
    }
  ]
}

Return at most 6 best matches. Score is 0-100 relevance. Only include genuinely relevant jobs.`;

    try {
      const response = await fetch("http://localhost:3000/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      const text = data.content?.map((b) => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResults(parsed);
    } catch (err) {
      setError("AI analysis failed. Check the console for details.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <div className="ai-icon">✦</div>
        <div className="ai-panel-title-group">
          <div className="ai-panel-title">AI Job Finder</div>
          <div className="ai-panel-sub">Powered by Claude</div>
        </div>
      </div>

      <div className="ai-panel-body">
        <div className="ai-field">
          <label>What are you looking for?</label>
          <textarea
            rows={2}
            placeholder="e.g. IT roles in North East India, research positions requiring PhD..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="ai-field">
          <label>Quick Filters</label>
          <div className="ai-tags">
            {quickFilters.map((tag) => (
              <span
                key={tag}
                className={`ai-tag ${activeTags.includes(tag) ? "active" : ""}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <button
          className="ai-run-btn"
          onClick={runAI}
          disabled={loading || !jobs.length}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ marginRight: 0 }} />
              Analysing...
            </>
          ) : (
            <>✦ Find Matching Jobs</>
          )}
        </button>
      </div>

      <div className="ai-divider" />

      {loading && (
        <div className="ai-thinking">
          <div className="ai-thinking-ring" />
          <div className="ai-thinking-text">
            Scanning {jobs.length} listings
            <span className="ai-thinking-dots" />
          </div>
        </div>
      )}

      {error && !loading && <div className="ai-error">⚠ {error}</div>}

      {results && !loading && (
        <>
          <div className="ai-result-header">
            <span className="ai-result-label">AI Matches</span>
            <span className="ai-result-count">
              {results.matches?.length ?? 0} found
            </span>
          </div>

          {results.summary && (
            <div className="ai-summary">{results.summary}</div>
          )}

          {results.matches?.length === 0 && (
            <div className="ai-empty">
              <div className="ai-empty-icon">◻</div>
              <div className="ai-empty-text">
                No strong matches found.
                <br />
                Try a different query.
              </div>
            </div>
          )}

          {results.matches?.map((match, i) => (
            <div
              key={match.id ?? i}
              className="ai-job-card"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <div className="ai-job-card-title">{match.title}</div>
              <div className="ai-job-card-reason">{match.reason}</div>
              <div className="ai-job-card-footer">
                <div className="ai-match-score">
                  <div className="ai-score-bar">
                    <div
                      className="ai-score-fill"
                      style={{ width: `${match.score ?? 0}%` }}
                    />
                  </div>
                  <span
                    style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  >
                    {match.score}%
                  </span>
                </div>
                {match.link && (
                  <a
                    href={match.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ai-view-link"
                  >
                    View ↗
                  </a>
                )}
              </div>
            </div>
          ))}

          <div style={{ height: 8 }} />
        </>
      )}

      {!loading && !results && !error && (
        <div className="ai-empty">
          <div className="ai-empty-icon">✦</div>
          <div className="ai-empty-text">
            Describe what you're looking for and AI will match the best jobs
            from your live feed.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────
export default function App() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    axios
      .get("http://localhost:3000/api/jobs")
      .then((res) => {
        setJobs(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    axios
      .get("http://localhost:3000/api/jobs")
      .then((res) => {
        setJobs(res.data);
        setRefreshing(false);
      })
      .catch((err) => {
        console.error(err);
        setRefreshing(false);
      });
  };

  const filtered = jobs.filter((j) =>
    j.title?.toLowerCase().includes(search.toLowerCase()),
  );

  const newestJob = jobs.length
    ? new Date(
        Math.max(...jobs.map((j) => new Date(j.createdAt))),
      ).toLocaleDateString()
    : "—";

  return (
    <>
      <div className="app">
        <header className="header">
          <div className="header-left">
            <span className="eyebrow">Dashboard / Jobs</span>
            <h1>
              Govt <span>IT</span> Tracker
            </h1>
          </div>
          <div className="badge">
            <span className="badge-dot" />
            Live Feed
          </div>
        </header>

        <div className="stats-bar">
          <div className="stat">
            <div className="stat-label">Total Listings</div>
            <div className="stat-value">{jobs.length}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Filtered Results</div>
            <div className="stat-value">{filtered.length}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Latest Posting</div>
            <div className="stat-value" style={{ fontSize: 14, paddingTop: 4 }}>
              {newestJob}
            </div>
          </div>
        </div>

        <div className="main-layout">
          {/* Left: Job Table */}
          <div>
            <div className="table-container">
              <div className="table-toolbar">
                <span className="toolbar-title">All Positions</span>
                <div className="search-box">
                  <span className="search-icon">⌕</span>
                  <input
                    placeholder="Search jobs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>#</th>
                    <th>Position Title</th>
                    <th>Link</th>
                    <th>Posted</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="loading-row">
                      <td colSpan={4}>
                        <span className="spinner" />
                        Fetching jobs...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty-state">
                          <div className="empty-state-icon">◻</div>
                          <p>No jobs found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((job, i) => (
                      <tr key={job.id}>
                        <td className="row-num">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className="job-title">{job.title}</td>
                        <td className="job-link">
                          <a
                            href={job.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View ↗
                          </a>
                        </td>
                        <td className="job-date">
                          {new Date(job.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="footer">
              <span className="footer-text">Source: localhost:3000</span>
              <button
                className={`refresh-btn ${refreshing ? "spinning" : ""}`}
                onClick={handleRefresh}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Right: AI Panel */}
          <AIJobFinder jobs={jobs} />
        </div>
      </div>
    </>
  );
}
