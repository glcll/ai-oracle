export const MODELS = [
  {
    id: "nemotron-nano-9b",
    name: "Nemotron Nano 9B",
    openRouterId: "nvidia/nemotron-nano-9b-v2:free",
    provider: "NVIDIA",
  },
  {
    id: "nemotron-nano-30b",
    name: "Nemotron 3 Nano 30B",
    openRouterId: "nvidia/nemotron-3-nano-30b-a3b:free",
    provider: "NVIDIA",
  },
  {
    id: "lfm-1.2b",
    name: "LFM 2.5 1.2B",
    openRouterId: "liquid/lfm-2.5-1.2b-instruct:free",
    provider: "Liquid",
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
