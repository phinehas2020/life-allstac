"use client"

import { useUpload } from "@/lib/context/upload-context"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function GlobalUploadIndicator() {
  const { activeUploads, completedUploads, totalProgress, clearCompleted } = useUpload()
  const [isExpanded, setIsExpanded] = useState(false)
  const [show, setShow] = useState(false)

  // Show if there are active uploads or recently completed ones
  useEffect(() => {
    if (activeUploads.length > 0 || completedUploads.length > 0) {
      setShow(true)
    } else {
       // Delay hiding to show completion state
       const timer = setTimeout(() => setShow(false), 3000)
       return () => clearTimeout(timer)
    }
  }, [activeUploads, completedUploads])

  if (!show && activeUploads.length === 0 && completedUploads.length === 0) return null

  const pendingCount = activeUploads.length
  const completedCount = completedUploads.length

  // Calculate specific counts
  const uploadingCount = activeUploads.filter(u => u.status === 'uploading' || u.status === 'compressing').length
  const queueCount = activeUploads.filter(u => u.status === 'pending').length

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 shadow-lg">
       <AnimatePresence>
         {show && (
           <motion.div
             initial={{ y: 100, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             exit={{ y: 100, opacity: 0 }}
             className="bg-card border rounded-lg overflow-hidden flex flex-col"
           >
              {/* Header / Summary */}
              <div className="bg-primary/5 p-3 flex items-center justify-between border-b cursor-pointer hover:bg-primary/10 transition-colors"
                   onClick={() => setIsExpanded(!isExpanded)}>
                 <div className="flex items-center space-x-3">
                    {pendingCount > 0 ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">
                            {pendingCount > 0 ? "Uploading..." : "Uploads Complete"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {pendingCount > 0
                              ? `${completedCount} done, ${uploadingCount} active, ${queueCount} queued`
                              : `${completedCount} files uploaded`
                            }
                        </span>
                    </div>
                 </div>
                 <div className="flex items-center space-x-2">
                    {pendingCount === 0 && completedCount > 0 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                            e.stopPropagation()
                            clearCompleted()
                        }}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                 </div>
              </div>

              {/* Progress Bar (Global) */}
              {pendingCount > 0 && (
                  <div className="px-3 pt-2 pb-1">
                      <Progress value={totalProgress} className="h-1" />
                  </div>
              )}

              {/* Expanded List */}
              <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="max-h-60 overflow-y-auto p-2 space-y-2">
                            {[...activeUploads, ...completedUploads].map((task) => (
                                <div key={task.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                                    <div className="flex items-center space-x-2 truncate max-w-[70%]">
                                        {task.status === 'completed' ? (
                                            <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                                        ) : task.status === 'error' ? (
                                            <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                                        ) : (
                                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />
                                        )}
                                        <span className="truncate">{task.file.name}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-muted-foreground w-8 text-right">{Math.round(task.progress)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  )
}
