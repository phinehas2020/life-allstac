"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, Image as ImageIcon, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

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

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setErrors([])
      
      // Validate video duration for video files
      const validatedFiles: File[] = []
      const newErrors: string[] = []

      acceptedFiles.forEach((file) => {
        if (file.type.startsWith("video/")) {
          const video = document.createElement("video")
          video.preload = "metadata"
          video.onloadedmetadata = function () {
            window.URL.revokeObjectURL(video.src)
            if (video.duration > 10) {
              newErrors.push(`${file.name} exceeds 10 seconds limit`)
            } else {
              validatedFiles.push(file)
            }
          }
          video.src = URL.createObjectURL(file)
        } else {
          validatedFiles.push(file)
        }
      })

      // Handle rejected files
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

      setTimeout(() => {
        setFiles(validatedFiles)
        setErrors(newErrors)
        if (validatedFiles.length > 0) {
          onFilesSelected(validatedFiles)
        }
      }, 100)
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
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-lg font-medium">Drop the files here...</p>
        ) : (
          <>
            <p className="text-lg font-medium mb-2">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Images (JPG, PNG, GIF, WebP) and Videos (MP4, MOV, max 10 seconds)
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Maximum {maxFiles} files, up to {maxSize / 1024 / 1024}MB each
            </p>
          </>
        )}
      </div>

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
        <div className="space-y-2">
          <h4 className="font-medium">Selected Files:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Video className="h-5 w-5 text-purple-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}