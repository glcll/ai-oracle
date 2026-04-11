export const MODELS = [
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    openRouterId: "meta-llama/llama-3.3-70b-instruct:free",
    provider: "Meta",
  },
  {
    id: "nemotron-super-120b",
    name: "Nemotron 3 Super 120B",
    openRouterId: "nvidia/nemotron-3-super-120b-a12b:free",
    provider: "NVIDIA",
  },
  {
    id: "qwen3-next-80b",
    name: "Qwen3 Next 80B",
    openRouterId: "qwen/qwen3-next-80b-a3b-instruct:free",
    provider: "Alibaba",
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
