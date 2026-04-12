export interface ModelDef {
  id: string;
  name: string;
  openRouterId: string;
  provider: string;
}

export const WORKER_MODELS: ModelDef[] = [
  {
    id: "glm-5-turbo",
    name: "GLM-5 Turbo",
    openRouterId: "z-ai/glm-5-turbo",
    provider: "Zhipu AI",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    openRouterId: "google/gemini-2.5-flash",
    provider: "Google",
  },
];

export const JUDGE_MODELS: ModelDef[] = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    openRouterId: "openai/gpt-4o-mini",
    provider: "OpenAI",
  },
];

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
  consensusMethod: "median-aggregation-2w1j";
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
