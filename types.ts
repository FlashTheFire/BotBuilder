export type BuildState = 'IDLE' | 'VALIDATING' | 'GATHERING_CONFIG' | 'PLANNING' | 'CODING' | 'BUILDING' | 'RUNNING' | 'DEBUGGING' | 'SUCCESS' | 'ERROR';
export type BotRuntimeState = 'STOPPED' | 'RUNNING';

export interface GeneratedFile {
  name: string;
  code: string;
}

export interface FixedFile extends GeneratedFile {
  changes_summary: string;
}

export interface BotStructure {
  files: {
    name: string;
    purpose: string;
    is_required: boolean;
  }[];
  requirements: string[];
  run_cmd: string;
  docker_entry: string[];
  estimated_complexity: 'low' | 'medium' | 'high';
}

export type LogType = 'log' | 'error' | 'user' | 'bot' | 'raw';

export interface LogEntry {
    message: string;
    timestamp: Date;
    type: LogType;
}

export interface BotMetadata {
  username: string;
  id: number;
}

export interface RequiredSecret {
  key: string;
  description: string;
}