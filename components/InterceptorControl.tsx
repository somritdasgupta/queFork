import { useEffect } from 'react'
import { useAPIInterceptor } from "./APIInterceptor"
import { Switch } from "./ui/switch"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { toast } from "sonner"
import { ActivityIcon, CheckCircle2, XCircle } from "lucide-react"

export function InterceptorControl() {
  const { hasExtension, isEnabled, toggleInterceptor, testInterceptor } = useAPIInterceptor({
    onRequestIntercept: async (req) => {
      return { ...req, intercepted: true }
    }
  })

  if (!hasExtension) return null

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50">
      <div className="flex items-center gap-2">
        <Switch
          checked={isEnabled}
          onCheckedChange={toggleInterceptor}
          className="data-[state=checked]:bg-green-500"
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-200">Local Interceptor</span>
          <span className="text-xs text-slate-400">Redirect API calls to localhost</span>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-700/50" />

      <Badge 
        variant={isEnabled ? "default" : "secondary"}
        className="gap-1"
      >
        {isEnabled ? (
          <>
            <ActivityIcon className="w-3 h-3 animate-pulse" />
            Active
          </>
        ) : (
          <>
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            Disabled
          </>
        )}
      </Badge>

      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          const result = await testInterceptor()
          if (result) {
            toast.success("Interceptor is working correctly!", {
              icon: <CheckCircle2 className="w-4 h-4 text-green-500" />
            })
          } else {
            toast.error("Interceptor test failed", {
              icon: <XCircle className="w-4 h-4 text-red-500" />
            })
          }
        }}
      >
        Test Connection
      </Button>
    </div>
  )
}
