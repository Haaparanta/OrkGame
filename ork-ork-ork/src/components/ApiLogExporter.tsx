'use client'

import { Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getApiLogs, clearApiLogs } from "@/lib/api"

export function ApiLogExporter() {
  const handleExportLogs = () => {
    const logs = getApiLogs()
    if (!logs || logs.length === 0) {
      alert("No API logs to export")
      return
    }

    // Create formatted text output
    const logText = logs
      .map((log: Record<string, unknown>) => {
        const timestamp = log.timestamp || new Date().toISOString()
        const method = log.method || "UNKNOWN"
        const endpoint = log.endpoint || "unknown"
        const success = log.success ? "✅" : "❌"
        
        let text = `\n${success} ${method} ${endpoint}\n`
        text += `⏰ ${timestamp}\n`
        
        if (log.params) {
          text += `📥 Params:\n${JSON.stringify(log.params, null, 2)}\n`
        }
        
        if (log.result) {
          text += `📤 Result:\n${JSON.stringify(log.result, null, 2)}\n`
        }
        
        if (log.error) {
          text += `💥 Error:\n${JSON.stringify(log.error, null, 2)}\n`
        }
        
        return text
      })
      .join("\n" + "=".repeat(80))

    // Create a blob and download
    const blob = new Blob([logText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `api-logs-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopyToClipboard = () => {
    const logs = getApiLogs()
    if (!logs || logs.length === 0) {
      alert("No API logs to copy")
      return
    }

    const logText = logs
      .map((log: Record<string, unknown>) => {
        const timestamp = log.timestamp || new Date().toISOString()
        const method = log.method || "UNKNOWN"
        const endpoint = log.endpoint || "unknown"
        const success = log.success ? "✅" : "❌"
        
        let text = `\n${success} ${method} ${endpoint}\n`
        text += `⏰ ${timestamp}\n`
        
        if (log.params) {
          text += `📥 Params:\n${JSON.stringify(log.params, null, 2)}\n`
        }
        
        if (log.result) {
          text += `📤 Result:\n${JSON.stringify(log.result, null, 2)}\n`
        }
        
        if (log.error) {
          text += `💥 Error:\n${JSON.stringify(log.error, null, 2)}\n`
        }
        
        return text
      })
      .join("\n" + "=".repeat(80))

    navigator.clipboard.writeText(logText).then(() => {
      alert(`Copied ${logs.length} API log entries to clipboard!`)
    })
  }

  const handleClearLogs = () => {
    if (confirm("Are you sure you want to clear all API logs?")) {
      clearApiLogs()
      alert("API logs cleared")
    }
  }

  const logCount = getApiLogs().length

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold text-muted-foreground">
        API Logs: {logCount} entries
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleExportLogs}
          disabled={logCount === 0}
          className="gap-2"
        >
          <Download className="size-4" />
          Export Logs
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopyToClipboard}
          disabled={logCount === 0}
        >
          Copy to Clipboard
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleClearLogs}
          disabled={logCount === 0}
          className="gap-2"
        >
          <Trash2 className="size-4" />
          Clear
        </Button>
      </div>
    </div>
  )
}
