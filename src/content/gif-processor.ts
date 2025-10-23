// Content Script GIF Processor - Handles complete GIF creation in content script
import { logger } from '@/lib/logger';
import { createError } from '@/lib/errors';
import { encodeFrames, FrameData as EncoderFrameData, EncodingOptions } from '@/lib/encoders';
import { TextOverlay } from '@/types';

/**
 * Compare two canvas frames to detect if they are similar/duplicate
 * @param canvas1 First canvas to compare
 * @param canvas2 Second canvas to compare
 * @param threshold Similarity threshold (0-1), default 0.98 means 98% similar pixels
 * @returns true if frames are considered duplicates
 */
function areCanvasFramesSimilar(
  canvas1: HTMLCanvasElement,
  canvas2: HTMLCanvasElement,
  threshold = 0.98
): boolean {
  if (canvas1.width !== canvas2.width || canvas1.height !== canvas2.height) {
    return false;
  }

  const ctx1 = canvas1.getContext('2d', { willReadFrequently: true });
  const ctx2 = canvas2.getContext('2d', { willReadFrequently: true });

  if (!ctx1 || !ctx2) {
    return false;
  }

  const imageData1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
  const imageData2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);

  const data1 = imageData1.data;
  const data2 = imageData2.data;
  const totalPixels = data1.length / 4;
  const sampleSize = Math.min(1000, totalPixels);
  const step = Math.max(4, Math.floor(data1.length / sampleSize / 4) * 4);

  let matches = 0;
  let samples = 0;

  for (let i = 0; i < data1.length && samples < sampleSize; i += step) {
    // Compare RGB values (skip alpha channel)
    if (data1[i] === data2[i] && data1[i + 1] === data2[i + 1] && data1[i + 2] === data2[i + 2]) {
      matches++;
    }
    samples++;
  }

  if (samples === 0) {
    return false;
  }

  const similarity = matches / samples;
  return similarity > threshold;
}

interface GifProcessingOptions {
  startTime: number;
  endTime: number;
  frameRate?: number;
  width?: number;
  height?: number;
  quality?: 'low' | 'medium' | 'high';
  textOverlays?: TextOverlay[];
}

interface GifProcessingResult {
  blob: Blob;
  metadata: {
    fileSize: number;
    duration: number;
    frameCount: number;
    width: number;
    height: number;
    id: string;
  };
}

export interface StageProgressInfo {
  stage: string;
  stageNumber: number;
  totalStages: number;
  stageName: string;
  message: string;
  progress: number;
}

export class ContentScriptGifProcessor {
  private static instance: ContentScriptGifProcessor;
  private isProcessing = false;
  private messageTimer: NodeJS.Timeout | null = null;
  private currentStage: string | null = null;
  private messageIndex = 0;
  private progressCallback: ((stageInfo: StageProgressInfo) => void) | undefined = undefined;

  // Reusable canvases to avoid creating new ones for every frame
  private mainCanvas: HTMLCanvasElement | null = null;
  private mainCtx: CanvasRenderingContext2D | null = null;
  private recoveryCanvas: HTMLCanvasElement | null = null;
  private recoveryCtx: CanvasRenderingContext2D | null = null;

  // Stage definitions
  private stages = {
    CAPTURING: {
      name: 'Capturing Frames',
      icon: '📹',
      messages: [
        'Reading video data...',
        'Extracting frames...',
        'Processing frame timings...',
        'Capturing pixel data...',
        'Organizing frame sequence...',
      ],
    },
    ANALYZING: {
      name: 'Analyzing Colors',
      icon: '🎨',
      messages: [
        'Scanning color distribution...',
        'Finding dominant colors...',
        'Building color histogram...',
        'Optimizing palette...',
        'Reducing to 256 colors...',
      ],
    },
    ENCODING: {
      name: 'Encoding GIF',
      icon: '🔧',
      messages: [
        'Initializing encoder...',
        'Writing frame data...',
        'Applying compression...',
        'Optimizing frame deltas...',
        'Processing animations...',
      ],
    },
    FINALIZING: {
      name: 'Finalizing',
      icon: '✨',
      messages: [
        'Writing file headers...',
        'Optimizing file size...',
        'Preparing for download...',
        'Final quality checks...',
        'Almost ready...',
      ],
    },
  };

  private constructor() {}

  /**
   * Initialize or resize reusable canvases to match the required dimensions
   */
  private initializeCanvases(width: number, height: number): void {
    // Initialize main canvas
    if (!this.mainCanvas) {
      this.mainCanvas = document.createElement('canvas');
      this.mainCtx = this.mainCanvas.getContext('2d', { willReadFrequently: true });
      if (!this.mainCtx) {
        throw createError('gif', 'Failed to create main canvas context');
      }
    }

    // Initialize recovery canvas
    if (!this.recoveryCanvas) {
      this.recoveryCanvas = document.createElement('canvas');
      this.recoveryCtx = this.recoveryCanvas.getContext('2d', { willReadFrequently: true });
      if (!this.recoveryCtx) {
        throw createError('gif', 'Failed to create recovery canvas context');
      }
    }

    // Resize canvases if dimensions changed
    if (this.mainCanvas.width !== width || this.mainCanvas.height !== height) {
      this.mainCanvas.width = width;
      this.mainCanvas.height = height;
    }

    if (this.recoveryCanvas.width !== width || this.recoveryCanvas.height !== height) {
      this.recoveryCanvas.width = width;
      this.recoveryCanvas.height = height;
    }
  }

  public static getInstance(): ContentScriptGifProcessor {
    if (!ContentScriptGifProcessor.instance) {
      ContentScriptGifProcessor.instance = new ContentScriptGifProcessor();
    }
    return ContentScriptGifProcessor.instance;
  }

  private updateStage(stageName: keyof typeof this.stages) {
    this.currentStage = stageName;
    this.messageIndex = 0;
    this.startMessageCycling();

    const stageInfo: StageProgressInfo = {
      stage: stageName,
      stageNumber: this.getStageNumber(stageName),
      totalStages: 4,
      stageName: this.stages[stageName].name,
      message: this.stages[stageName].messages[0],
      progress: this.getStageProgress(stageName),
    };

    this.progressCallback?.(stageInfo);
  }

  private getStageNumber(stageName: keyof typeof this.stages): number {
    const stageOrder = ['CAPTURING', 'ANALYZING', 'ENCODING', 'FINALIZING'];
    return stageOrder.indexOf(stageName) + 1;
  }

  private getStageProgress(stageName: keyof typeof this.stages): number {
    const stageNumber = this.getStageNumber(stageName);
    return ((stageNumber - 1) / 4) * 100;
  }

  private startMessageCycling() {
    // Clear existing timer
    if (this.messageTimer) clearInterval(this.messageTimer);

    if (!this.currentStage) return;

    // Cycle through messages every 3000ms
    this.messageTimer = setInterval(() => {
      if (!this.currentStage) return;

      const stage = this.stages[this.currentStage as keyof typeof this.stages];
      this.messageIndex = (this.messageIndex + 1) % stage.messages.length;

      const stageInfo: StageProgressInfo = {
        stage: this.currentStage,
        stageNumber: this.getStageNumber(this.currentStage as keyof typeof this.stages),
        totalStages: 4,
        stageName: stage.name,
        message: stage.messages[this.messageIndex],
        progress: this.getStageProgress(this.currentStage as keyof typeof this.stages),
      };

      this.progressCallback?.(stageInfo);
    }, 3000);
  }

  private stopMessageCycling() {
    if (this.messageTimer) {
      clearInterval(this.messageTimer);
      this.messageTimer = null;
    }
  }

  /**
   * Process video element to GIF entirely in content script
   */
  public async processVideoToGif(
    videoElement: HTMLVideoElement,
    options: GifProcessingOptions,
    onProgress?: (stageInfo: StageProgressInfo) => void
  ): Promise<GifProcessingResult> {
    if (this.isProcessing) {
      throw createError('gif', 'Already processing a GIF');
    }

    this.isProcessing = true;
    this.progressCallback = onProgress;
    const startTime = performance.now();

    try {
      logger.info('[ContentScriptGifProcessor] Starting GIF processing', { options });

      // Stage 1: Capturing Frames
      this.updateStage('CAPTURING');
      const frames = await this.captureFrames(videoElement, options);
      logger.info('[ContentScriptGifProcessor] Frames captured', { count: frames.length });

      // Stage 2: Analyzing Colors
      this.updateStage('ANALYZING');
      // Simulate color analysis time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Stage 3: Encoding GIF
      this.updateStage('ENCODING');
      const gifBlob = await this.encodeGif(frames, options);
      logger.info('[ContentScriptGifProcessor] GIF encoded', { size: gifBlob.size });

      // Stage 4: Finalizing
      this.updateStage('FINALIZING');
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate metadata
      const metadata = {
        fileSize: gifBlob.size,
        duration: options.endTime - options.startTime,
        frameCount: frames.length,
        width: frames[0]?.width || 320,
        height: frames[0]?.height || 240,
        id: `gif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      // Complete
      this.stopMessageCycling();
      const finalStageInfo: StageProgressInfo = {
        stage: 'COMPLETED',
        stageNumber: 4,
        totalStages: 4,
        stageName: 'Complete',
        message: '✅ GIF created successfully!',
        progress: 100,
      };
      onProgress?.(finalStageInfo);

      const processingTime = performance.now() - startTime;
      logger.info('[ContentScriptGifProcessor] Processing complete', {
        processingTime,
        metadata,
      });

      return { blob: gifBlob, metadata };
    } finally {
      this.isProcessing = false;
      this.stopMessageCycling();
      this.progressCallback = undefined;
    }
  }

  /**
   * Capture frames from video element
   */
  private async captureFrames(
    videoElement: HTMLVideoElement,
    options: GifProcessingOptions
  ): Promise<HTMLCanvasElement[]> {
    const { startTime, endTime, frameRate = 5, width = 480, height = 270 } = options;
    console.log(
      '[gif-processor] captureFrames - frameRate from options:',
      options.frameRate,
      'using:',
      frameRate
    );
    const duration = endTime - startTime;
    // Calculate proper frame count based on duration and frame rate
    const rawFrameCount = Math.ceil(duration * frameRate);
    const frameCount = rawFrameCount; // No artificial limit
    const frameInterval = duration / frameCount;

    logger.info('[ContentScriptGifProcessor] Capturing frames', {
      frameCount,
      frameInterval,
      dimensions: { width, height },
    });

    // Calculate actual dimensions maintaining aspect ratio
    const videoAspectRatio = videoElement.videoWidth / videoElement.videoHeight;
    const targetAspectRatio = width / height;

    let actualWidth: number;
    let actualHeight: number;

    // Check if requested dimensions already maintain the video's aspect ratio (within 2% tolerance)
    const aspectRatioTolerance = 0.02;
    const aspectRatioDifference = Math.abs(videoAspectRatio - targetAspectRatio) / videoAspectRatio;

    if (aspectRatioDifference <= aspectRatioTolerance) {
      // Requested dimensions already maintain aspect ratio - use them directly
      actualWidth = width;
      actualHeight = height;
      logger.info(
        '[ContentScriptGifProcessor] Using requested dimensions (aspect ratio preserved)',
        {
          aspectRatioDifference: `${(aspectRatioDifference * 100).toFixed(1)}%`,
        }
      );
    } else {
      // Fit video within requested dimensions while maintaining aspect ratio
      if (videoAspectRatio > targetAspectRatio) {
        // Video is wider than target - fit to width
        actualWidth = width;
        actualHeight = Math.round(width / videoAspectRatio);
      } else {
        // Video is taller than target - fit to height
        actualHeight = height;
        actualWidth = Math.round(height * videoAspectRatio);
      }
      logger.info('[ContentScriptGifProcessor] Adjusted dimensions to maintain aspect ratio', {
        requestedRatio: targetAspectRatio,
        videoRatio: videoAspectRatio,
        adjustment: videoAspectRatio > targetAspectRatio ? 'fit-to-width' : 'fit-to-height',
      });
    }

    // Ensure even dimensions for video encoding
    actualWidth = Math.floor(actualWidth / 2) * 2;
    actualHeight = Math.floor(actualHeight / 2) * 2;

    logger.info('[ContentScriptGifProcessor] Calculated dimensions', {
      video: { width: videoElement.videoWidth, height: videoElement.videoHeight },
      requested: { width, height },
      actual: { width: actualWidth, height: actualHeight },
      videoAspectRatio,
      targetAspectRatio,
    });

    // Initialize reusable canvases with calculated dimensions
    this.initializeCanvases(actualWidth, actualHeight);

    const frames: HTMLCanvasElement[] = [];

    // Store original state
    const originalTime = videoElement.currentTime;
    const wasPlaying = !videoElement.paused;

    // Pause for stable capture
    videoElement.pause();

    for (let i = 0; i < frameCount; i++) {
      const captureTime = startTime + i * frameInterval;

      logger.debug(
        `[ContentScriptGifProcessor] Seeking to ${captureTime.toFixed(2)}s for frame ${i + 1}`
      );

      // Seek to capture time
      const seekStartTime = performance.now();
      const previousTime = videoElement.currentTime;
      videoElement.currentTime = captureTime;

      // Wait for seek to complete using a combination of methods
      // First, wait a bit for the seek to initiate
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Then poll to check if we're close to the target time
      let attempts = 0;
      const maxAttempts = 20; // 20 * 25ms = 500ms max wait
      let lastCheckedTime = videoElement.currentTime;

      // Keep polling until either:
      // 1. We're close to the target time, OR
      // 2. The video has stopped moving (stuck), OR
      // 3. We've hit the max attempts
      while (attempts < maxAttempts) {
        const currentVideoTime = videoElement.currentTime;
        const distanceToTarget = Math.abs(currentVideoTime - captureTime);

        // If we're close enough to target, we're done
        if (distanceToTarget < 0.05) {
          break;
        }

        // If the video hasn't moved in the last few attempts, it might be stuck
        if (attempts > 5 && Math.abs(currentVideoTime - lastCheckedTime) < 0.001) {
          logger.debug(
            `[ContentScriptGifProcessor] Video appears stuck at ${currentVideoTime.toFixed(3)}s after ${attempts} attempts`
          );
          break;
        }

        lastCheckedTime = currentVideoTime;
        await new Promise((resolve) => setTimeout(resolve, 25));
        attempts++;
      }

      // Additional wait to ensure frame is decoded and rendered
      // This needs to be longer for seeks to non-keyframe positions
      const seekDistance = Math.abs(captureTime - previousTime);
      const additionalDelay = seekDistance > 2 ? 150 : 100; // Longer delay for longer seeks
      await new Promise((resolve) => setTimeout(resolve, additionalDelay));

      const seekDuration = performance.now() - seekStartTime;
      const actualTime = videoElement.currentTime;

      if (Math.abs(actualTime - captureTime) > 0.1) {
        logger.warn(
          `[ContentScriptGifProcessor] Seek inaccuracy for frame ${i + 1}: target=${captureTime.toFixed(2)}s, actual=${actualTime.toFixed(2)}s`
        );
      }

      logger.debug(
        `[ContentScriptGifProcessor] Seek completed for frame ${i + 1} in ${seekDuration.toFixed(0)}ms (target=${captureTime.toFixed(2)}s, actual=${actualTime.toFixed(2)}s)`
      );

      // Clear and reuse main canvas for this frame
      this.mainCtx!.clearRect(0, 0, actualWidth, actualHeight);

      // Draw video frame to reusable canvas
      this.mainCtx!.drawImage(videoElement, 0, 0, actualWidth, actualHeight);

      // Check for duplicate frames
      let isDuplicate = false;
      if (frames.length > 0) {
        const lastFrame = frames[frames.length - 1];
        if (areCanvasFramesSimilar(this.mainCanvas!, lastFrame)) {
          isDuplicate = true;
          logger.warn(
            `[ContentScriptGifProcessor] ⚠️ DUPLICATE FRAME at ${i + 1}/${frameCount}: video stuck at ${videoElement.currentTime.toFixed(3)}s (wanted ${captureTime.toFixed(3)}s, prev was ${previousTime.toFixed(3)}s)`
          );

          // Try one more aggressive seek attempt if we have a duplicate
          if (Math.abs(videoElement.currentTime - captureTime) > 0.01) {
            logger.info(`[ContentScriptGifProcessor] Attempting recovery seek for frame ${i + 1}`);

            // Try nudging forward slightly
            videoElement.currentTime = captureTime + 0.001;
            await new Promise((resolve) => setTimeout(resolve, 200));

            // Clear and reuse recovery canvas for the recovery attempt
            this.recoveryCtx!.clearRect(0, 0, actualWidth, actualHeight);
            this.recoveryCtx!.drawImage(videoElement, 0, 0, actualWidth, actualHeight);

            // Check if recovery worked
            if (!areCanvasFramesSimilar(this.recoveryCanvas!, lastFrame)) {
              logger.info(
                `[ContentScriptGifProcessor] Recovery successful! Now at ${videoElement.currentTime.toFixed(3)}s`
              );
              // Copy recovery canvas content to main canvas
              this.mainCtx!.clearRect(0, 0, actualWidth, actualHeight);
              this.mainCtx!.drawImage(this.recoveryCanvas!, 0, 0);
              isDuplicate = false;
            } else {
              logger.warn(
                `[ContentScriptGifProcessor] Recovery failed, still stuck at ${videoElement.currentTime.toFixed(3)}s`
              );
            }
          }
        }
      }

      // Create a clone of the main canvas for the frames array
      // since we reuse the same canvas for all frames
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = actualWidth;
      frameCanvas.height = actualHeight;
      const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
      if (!frameCtx) {
        throw createError('gif', 'Failed to create frame canvas context');
      }
      frameCtx.drawImage(this.mainCanvas!, 0, 0);

      frames.push(frameCanvas);

      // Export frame data for verification (in dev mode)
      if (typeof window !== 'undefined') {
        const win = window as Window & {
          __DEBUG_CAPTURED_FRAMES?: Array<{
            frameNumber: number;
            videoTime: number;
            targetTime: number;
            width: number;
            height: number;
            dataUrl: string;
            isDuplicate: boolean;
          }>;
        };
        if (!win.__DEBUG_CAPTURED_FRAMES) {
          win.__DEBUG_CAPTURED_FRAMES = [];
        }
        // Convert canvas to data URL for debugging
        const frameDataUrl = frameCanvas.toDataURL('image/png');
        win.__DEBUG_CAPTURED_FRAMES.push({
          frameNumber: i + 1,
          videoTime: videoElement.currentTime,
          targetTime: captureTime,
          width: actualWidth,
          height: actualHeight,
          dataUrl: frameDataUrl,
          isDuplicate: isDuplicate,
        });
      }

      logger.debug(
        `[ContentScriptGifProcessor] Captured frame ${i + 1}/${frameCount} at ${videoElement.currentTime.toFixed(2)}s (target: ${captureTime.toFixed(2)}s)`
      );
    }

    // Restore video state
    videoElement.currentTime = originalTime;
    if (wasPlaying) {
      videoElement.play().catch(() => {});
    }

    return frames;
  }

  /**
   * Encode frames to GIF using encoder abstraction
   */
  private async encodeGif(
    frames: HTMLCanvasElement[],
    options: GifProcessingOptions
  ): Promise<Blob> {
    const { frameRate = 10, quality = 'medium' } = options;
    console.log(
      '[gif-processor] encodeGif - frameRate from options:',
      options.frameRate,
      'using:',
      frameRate
    );

    try {
      // Convert canvas frames to encoder format
      const frameData: EncoderFrameData[] = frames.map((canvas, index) => {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error(`Failed to get context for frame ${index + 1}`);
        }

        // Apply text overlays if specified
        if (options.textOverlays && options.textOverlays.length > 0) {
          options.textOverlays.forEach((overlay) => {
            ctx.save();

            // Use font size directly - it's already resolution-appropriate from TextOverlayScreenV2
            ctx.font = `${overlay.fontSize}px ${overlay.fontFamily}`;
            ctx.fillStyle = overlay.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Calculate actual position (overlay.position is in percentage)
            const x = (overlay.position.x / 100) * canvas.width;
            const y = (overlay.position.y / 100) * canvas.height;

            // Use stroke width directly
            const strokeWidth = overlay.strokeWidth || 2;

            // Add text stroke for better visibility
            if (overlay.strokeColor) {
              ctx.strokeStyle = overlay.strokeColor;
              ctx.lineWidth = strokeWidth;
              ctx.strokeText(overlay.text, x, y);
            } else {
              // Default black stroke for better visibility
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.lineWidth = strokeWidth;
              ctx.strokeText(overlay.text, x, y);
            }

            // Draw the text
            ctx.fillText(overlay.text, x, y);

            ctx.restore();
          });
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Convert to EncoderFrameData format
        return {
          imageData: imageData,
          timestamp: index * (1000 / frameRate),
          delay: Math.round(1000 / frameRate),
        };
      });

      // Create encoding options
      const encodingOptions: EncodingOptions = {
        width: frames[0].width,
        height: frames[0].height,
        quality: quality,
        frameRate: frameRate,
        loop: true,
      };

      // Encode frames using the main encoder system
      const result = await encodeFrames(frameData, encodingOptions, {
        encoder: 'auto', // Let the system choose the best encoder
        format: 'gif',
      });

      logger.info('[ContentScriptGifProcessor] GIF encoding finished', {
        size: result.blob.size,
        metadata: result.metadata,
      });

      return result.blob;
    } catch (error) {
      console.error('[ContentScriptGifProcessor] Failed to encode GIF:', error);
      logger.error('[ContentScriptGifProcessor] Failed to encode GIF', { error });
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw createError('gif', `Failed to encode GIF: ${errorMessage}`);
    }
  }

  /**
   * Save GIF to IndexedDB
   */
  public async saveGifToStorage(blob: Blob, metadata: Record<string, unknown>): Promise<string> {
    return new Promise((resolve, reject) => {
      const dbName = 'YouTubeGifStore';

      const request = indexedDB.open(dbName, 3);

      request.onerror = () => {
        reject(createError('storage', 'Failed to open IndexedDB'));
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('gifs')) {
          const gifsStore = db.createObjectStore('gifs', { keyPath: 'id' });
          gifsStore.createIndex('createdAt', 'metadata.createdAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['gifs'], 'readwrite');
        const store = transaction.objectStore('gifs');

        const gifData = {
          id: metadata.id,
          blob,
          metadata: {
            ...metadata,
            createdAt: new Date().toISOString(),
            url: window.location.href,
            title: document.title,
          },
        };

        const addRequest = store.add(gifData);

        addRequest.onsuccess = () => {
          logger.info('[ContentScriptGifProcessor] GIF saved to IndexedDB', {
            id: (metadata as { id: string }).id,
          });
          resolve((metadata as { id: string }).id);
        };

        addRequest.onerror = () => {
          reject(createError('storage', 'Failed to save GIF to IndexedDB'));
        };
      };
    });
  }

  /**
   * Trigger download of GIF
   */
  public async downloadGif(blob: Blob, filename?: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    const name = filename || `youtube-gif-${Date.now()}.gif`;

    // Send download request to background script (Firefox Promise-based API)
    browser.runtime.sendMessage({
      type: 'DOWNLOAD_GIF',
      data: {
        url,
        filename: name,
      },
    }).then((response) => {
      // Clean up blob URL after download starts
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      if (response?.success) {
        logger.info('[ContentScriptGifProcessor] Download initiated', { filename: name });
      } else {
        logger.error('[ContentScriptGifProcessor] Download failed', { error: response?.error });
      }
    }).catch((error) => {
      logger.error('[ContentScriptGifProcessor] Failed to send download message', { error });
      URL.revokeObjectURL(url);
    });
  }
}

// Export singleton instance
export const gifProcessor = ContentScriptGifProcessor.getInstance();
