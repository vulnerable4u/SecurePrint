export interface ValidateOTCReturn {
  valid: boolean;
  files: number;
  expiresAt: string;
  error?: string;
}

export interface RetrieveFileReturn {
  success: boolean;
  file?: Blob;
  fileName: string;
  mimeType?: string;
  error?: string;
}

