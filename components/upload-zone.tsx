"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, X, Image as ImageIcon, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"
import { staggerContainer, fadeUp } from "@/lib/animations/variants"

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  accept?: Record<string, string[]>
  maxSize?: number
  disabled?: boolean
}

export function UploadZone({
  onFilesSelected,
  maxFiles = 10,
  accept = {
    "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    "video/*": [".mp4", ".mov", ".avi", ".webm"],
  },
  maxSize = 50 * 1024 * 1024, // 50MB
  disabled = false,
}: UploadZoneProps) {
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const validateFile = (file: File): Promise<{ file: File; error?: string }> => {
    return new Promise((resolve) => {
      if (file.type.startsWith("video/")) {
        const video = document.createElement("video")
        video.preload = "metadata"

        video.onloadedmetadata = function () {
          window.URL.revokeObjectURL(video.src)
          // Increased limit to 120 seconds
          if (video.duration > 120) {
            resolve({ file, error: `${file.name} exceeds 120 seconds limit` })
          } else {
            resolve({ file })
          }
        }

        video.onerror = function () {
          window.URL.revokeObjectURL(video.src)
          resolve({ file, error: `Failed to load video metadata for ${file.name}` })
        }

        video.src = URL.createObjectURL(file)
      } else {
        resolve({ file })
      }
    })
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      setErrors([])
      const newErrors: string[] = []

      // Handle rejected files first
      rejectedFiles.forEach((rejection) => {
        const { file, errors } = rejection
        errors.forEach((error: any) => {
          if (error.code === "file-too-large") {
            newErrors.push(`${file.name} is too large (max ${maxSize / 1024 / 1024}MB)`)
          } else if (error.code === "file-invalid-type") {
            newErrors.push(`${file.name} is not a valid file type`)
          } else if (error.code === "too-many-files") {
            newErrors.push(`Maximum ${maxFiles} files allowed`)
          }
        })
      })

      // Validate accepted files (async)
      const validationResults = await Promise.all(acceptedFiles.map(validateFile))

      const validFiles: File[] = []

      validationResults.forEach((result) => {
        if (result.error) {
          newErrors.push(result.error)
        } else {
          validFiles.push(result.file)
        }
      })

      setFiles(validFiles)
      setErrors(newErrors)

      if (validFiles.length > 0) {
        onFilesSelected(validFiles)
      }
    },
    [maxFiles, maxSize, onFilesSelected]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    disabled,
    multiple: true,
  })

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onFilesSelected(newFiles)
  }

  return (
    <div className="space-y-4">
      <motion.div
        animate={{
          scale: isDragActive ? 1.02 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        <div
          {...getRootProps()}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors overflow-hidden",
            isDragActive
              ? "border-accent bg-accent/5"
              : "border-gray-200 hover:border-accent/50 hover:bg-gray-50/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />

        {/* Animated dot pattern background on drag */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              className="absolute inset-0 -z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              exit={{ opacity: 0 }}
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--accent)) 1px, transparent 1px)`,
                backgroundSize: "20px 20px",
              }}
            />
          )}
        </AnimatePresence>

        {/* Animated icon */}
        <motion.div
          animate={{ y: isDragActive ? -5 : 0 }}
          transition={{ duration: 0.3, repeat: isDragActive ? Infinity : 0, repeatType: "reverse" }}
        >
          <Upload className={cn(
            "mx-auto h-14 w-14 mb-4 transition-colors",
            isDragActive ? "text-accent" : "text-gray-300"
          )} />
        </motion.div>

        <AnimatePresence mode="wait">
          {isDragActive ? (
            <motion.p
              key="drop"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-lg font-bold text-accent"
            >
              Drop to upload!
            </motion.p>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Drag & drop your files here
              </p>
              <p className="text-sm text-gray-400">or click to browse</p>
              <p className="text-xs text-gray-400 mt-3">
                Images & Videos (max {maxFiles} files, {maxSize / 1024 / 1024}MB each)
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </motion.div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-900 mb-2">Upload Errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">Selected Files ({files.length})</h4>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {files.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  variants={fadeUp}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                  layout
                  className="flex items-center justify-between p-3 bg-white rounded-xl border shadow-sm"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      file.type.startsWith("image/") ? "bg-blue-50" : "bg-purple-50"
                    )}>
                      {file.type.startsWith("image/") ? (
                        <ImageIcon className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Video className="h-5 w-5 text-purple-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeFile(index)}
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </div>
  )
}
