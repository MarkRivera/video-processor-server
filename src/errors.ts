type MultiPartChunkUploadErrorTypes = 'MUTLIPART_CHUNK_UPLOAD' | 'MULTIPART_CHUNK_INIT' | 'MULTIPART_CHUNK_ABORT' | 'MULTIPART_CHUNK_COMPLETE';

export class MultipartChunkUploadError extends Error {
  data?: Record<string, string>;
  constructor(message: string, name: MultiPartChunkUploadErrorTypes, data?: Record<string, string>) {
    super(message);
    this.name = name;
    this.data = data
  }
}

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ENV_ERROR';
  }
}

type DatabaseErrorTypes = 'DATABASE' | 'DATABASE_CONNECTION' | 'DATABASE_QUERY' | 'DATABASE_UPLOAD';
export class DatabaseError extends Error {
  data?: Record<string, string>;
  constructor(message: string, name: DatabaseErrorTypes, data?: Record<string, string>) {
    super(message);
    this.name = name;
    this.data = data;
  }
}

type SQSErrorTypes = 'SQS' | 'SQS_SEND_MESSAGE' | 'EMPTY_QUEUE_URL';
export class SQSError extends Error {
  data?: Record<string, string>;
  constructor(message: string, name: SQSErrorTypes, data?: Record<string, string>) {
    super(message);
    this.name = name;
    this.data = data;
  }
}