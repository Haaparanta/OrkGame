"use client"

import { useState, useEffect } from 'react'
import { getApiLogs, clearApiLogs } from '@/lib/api'

interface LogEntry {
  timestamp: string
  endpoint: string
  method: string
  params: any
  result: any
  error: any
  success: boolean
}

export function ApiLogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(getApiLogs())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const filteredLogs = logs.filter(log => 
    log.endpoint.toLowerCase().includes(filter.toLowerCase()) ||
    log.method.toLowerCase().includes(filter.toLowerCase()) ||
    (log.error && JSON.stringify(log.error).toLowerCase().includes(filter.toLowerCase()))
  )

  const handleClearLogs = () => {
    clearApiLogs()
    setLogs([])
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-emerald-700 transition-colors font-semibold z-50 border border-emerald-500"
      >
        📊 API Logs ({logs.length})
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-96 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
      <div className="bg-slate-800 p-2 border-b border-slate-700 flex justify-between items-center">
        <h3 className="font-semibold text-sm text-emerald-400">📊 API Logs ({filteredLogs.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={handleClearLogs}
            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors font-medium"
          >
            🗑️ Clear
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-xs bg-slate-600 text-white px-2 py-1 rounded hover:bg-slate-700 transition-colors font-medium"
          >
            ✕ Close
          </button>
        </div>
      </div>
      
      <div className="p-2 bg-slate-900">
        <input
          type="text"
          placeholder="🔍 Filter logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full text-xs p-2 border border-slate-600 rounded mb-2 bg-slate-800 text-slate-200 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
        />
      </div>

      <div className="overflow-y-auto h-64 p-2 bg-slate-900">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-400 text-xs text-center py-8">
            <div className="text-2xl mb-2">🦗</div>
            <div>No logs found</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.reverse().map((log, index) => (
              <div
                key={index}
                className={`text-xs border rounded-lg p-3 transition-all ${
                  log.success 
                    ? 'border-emerald-600/30 bg-emerald-950/50 hover:bg-emerald-950/70' 
                    : 'border-red-600/30 bg-red-950/50 hover:bg-red-950/70'
                }`}
              >
                <div className="font-semibold flex justify-between items-center">
                  <span className={`flex items-center gap-2 ${log.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span className="text-sm">{log.success ? '✅' : '❌'}</span>
                    <span className="font-mono">{log.method}</span>
                    <span className="text-slate-300">{log.endpoint}</span>
                  </span>
                  <span className="text-slate-500 text-xs">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                {log.params && Object.keys(log.params).length > 0 && (
                  <div className="mt-2">
                    <div className="text-cyan-400 font-medium mb-1">📥 Params:</div>
                    <pre className="text-xs bg-slate-800/80 p-2 rounded border border-slate-700 overflow-x-auto text-slate-300">
                      {JSON.stringify(log.params, null, 2)}
                    </pre>
                  </div>
                )}
                
                {log.result && (
                  <div className="mt-2">
                    <div className="text-emerald-400 font-medium mb-1">📤 Result:</div>
                    <pre className="text-xs bg-slate-800/80 p-2 rounded border border-slate-700 overflow-x-auto text-slate-300">
                      {typeof log.result === 'string' ? log.result : JSON.stringify(log.result, null, 2)}
                    </pre>
                  </div>
                )}
                
                {log.error && (
                  <div className="mt-2">
                    <div className="text-red-400 font-medium mb-1">💥 Error:</div>
                    <pre className="text-xs bg-red-950/50 p-2 rounded border border-red-700 overflow-x-auto text-red-200">
                      {typeof log.error === 'string' 
                        ? log.error 
                        : JSON.stringify(log.error, null, 2)}
                    </pre>
                    {log.error?.status && (
                      <div className="text-xs text-red-300 mt-1">
                        Status: {log.error.status} {log.error.code && `(${log.error.code})`}
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
