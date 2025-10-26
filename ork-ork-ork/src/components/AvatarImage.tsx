'use client'

import { useState, useEffect } from 'react'

interface AvatarImageProps {
  src: string
  alt: string
  className?: string
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void
}

/**
 * AvatarImage component that handles image loading with fallback
 * Loads avatar images from the public folder
 */
export function AvatarImage({ src, alt, className, onError }: AvatarImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Log the image being loaded
    console.log(`[AvatarImage] Loading image: ${src}`)
  }, [src])

  const handleLoad = () => {
    console.log(`[AvatarImage] Successfully loaded: ${src}`)
    setIsLoading(false)
  }

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    console.error(`[AvatarImage] Failed to load: ${src}`)
    setIsLoading(false)
    setHasError(true)
    onError?.(event)
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      loading="lazy"
      decoding="async"
    />
  )
}
