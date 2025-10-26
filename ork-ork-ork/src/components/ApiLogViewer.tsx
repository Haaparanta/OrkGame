"use client"

import { useEffect, useMemo, useState } from "react"

import { clearApiLogs, getApiLogs } from "@/lib/api"

interface LogEntry {
  timestamp?: string
  endpoint?: string
  method?: string
  params?: unknown
  result?: unknown
  error?: unknown
  success?: boolean
}

function toJson(value: unknown) {
  if (value === undefined) return ""
  if (value === null) return "null"
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function hasValues(value: unknown) {
  if (value === null || value === undefined) return false
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0
  }
  return Boolean(value)
}

export function ApiLogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      const entries = getApiLogs() as LogEntry[]
      setLogs(entries)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const lowerFilter = filter.toLowerCase()

  const filteredLogs = useMemo(() => {
    if (!lowerFilter) return logs
    return logs.filter((log) => {
      const endpoint = log.endpoint?.toLowerCase() ?? ""
      const method = log.method?.toLowerCase() ?? ""
      const errorText = toJson(log.error).toLowerCase()
      return endpoint.includes(lowerFilter) || method.includes(lowerFilter) || errorText.includes(lowerFilter)
    })
  }, [logs, lowerFilter])

  const handleClearLogs = () => {
    clearApiLogs()
    setLogs([])
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 rounded-lg border border-emerald-500 bg-emerald-600 px-4 py-2 font-semibold text-white shadow-lg transition-colors hover:bg-emerald-700"
      >
        📊 API Logs ({logs.length})
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 h-96 w-96 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 p-2">
        <h3 className="text-sm font-semibold text-emerald-400">📊 API Logs ({filteredLogs.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={handleClearLogs}
            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700"
          >
            🗑️ Clear
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded bg-slate-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-slate-700"
          >
            ✕ Close
          </button>
        </div>
      </div>

      <div className="bg-slate-900 p-2">
        <input
          type="text"
          placeholder="🔍 Filter logs..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-xs text-slate-200 placeholder-slate-400 transition-colors focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div className="h-64 overflow-y-auto bg-slate-900 p-2" data-testid="api-log-list">
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <div className="mb-2 text-2xl">🦗</div>
            <div>No logs found</div>
          </div>
        ) : (
          <div className="space-y-2">
            {[...filteredLogs].reverse().map((log, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 text-xs transition-all ${
                  log.success
                    ? "border-emerald-600/30 bg-emerald-950/50 hover:bg-emerald-950/70"
                    : "border-red-600/30 bg-red-950/50 hover:bg-red-950/70"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className={`flex items-center gap-2 ${log.success ? "text-emerald-400" : "text-red-400"}`}>
                    <span className="text-sm">{log.success ? "✅" : "❌"}</span>
                    <span className="font-mono">{log.method}</span>
                    <span className="text-slate-300">{log.endpoint}</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ""}
                  </span>
                </div>

                {hasValues(log.params) && (
                  <div className="mt-2">
                    <div className="mb-1 text-xs font-medium text-cyan-400">📥 Params:</div>
                    <pre className="overflow-x-auto rounded border border-slate-700 bg-slate-800/80 p-2 text-xs text-slate-300">
                      {toJson(log.params)}
                    </pre>
                  </div>
                )}

                {hasValues(log.result) && (
                  <div className="mt-2">
                    <div className="mb-1 text-xs font-medium text-emerald-400">📤 Result:</div>
                    <pre className="overflow-x-auto rounded border border-slate-700 bg-slate-800/80 p-2 text-xs text-slate-300">
                      {toJson(log.result)}
                    </pre>
                  </div>
                )}

                {hasValues(log.error) && (
                  <div className="mt-2">
                    <div className="mb-1 text-xs font-medium text-red-400">💥 Error:</div>
                    <pre className="overflow-x-auto rounded border border-red-700 bg-red-950/50 p-2 text-xs text-red-200">
                      {toJson(log.error)}
                    </pre>
                    {typeof log.error === "object" && log.error !== null && "status" in log.error && (
                      <div className="mt-1 text-xs text-red-300">
                        Status: {(log.error as { status?: string }).status}
                        {"code" in (log.error as object) &&
                          ` (${(log.error as { code?: string }).code ?? "unknown"})`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
