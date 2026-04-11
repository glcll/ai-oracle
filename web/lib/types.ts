export const MODELS = [
  {
    id: "gemma-3-12b",
    name: "Gemma 3 12B",
    openRouterId: "google/gemma-3-12b-it:free",
    provider: "Google",
  },
  {
    id: "llama-3.2-3b",
    name: "Llama 3.2 3B",
    openRouterId: "meta-llama/llama-3.2-3b-instruct:free",
    provider: "Meta",
  },
  {
    id: "gemma-3n-4b",
    name: "Gemma 3n 4B",
    openRouterId: "google/gemma-3n-e4b-it:free",
    provider: "Google",
  },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

export interface AskRequest {
  prompt: string;
}

export interface AskResponse {
  requestId: string;
  status: "pending";
  statusUrl: string;
  models: string[];
}

export interface ModelResponse {
  model: string;
  answer: string;
  confidence: number;
  avgScore: number;
}

export interface ScoreMatrix {
  [respondentModel: string]: {
    judgedBy: { [judgeModel: string]: number };
  };
}

export interface ConsensusData {
  winningModel: string;
  winningIndex: number;
  averageScores: { [model: string]: number };
  scoreMatrix: ScoreMatrix;
  nodeCount: number;
  consensusMethod: "median-aggregation-3x3";
}

export interface OracleResult {
  requestId: string;
  status: "pending" | "completed" | "failed";
  prompt?: string;
  response?: string;
  consensus?: ConsensusData;
  allResponses?: ModelResponse[];
  timing?: {
    submittedAt: string;
    completedAt?: string;
    durationMs?: number;
  };
  error?: string;
}
