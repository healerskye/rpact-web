export interface DesignParams {
  kMax: number;
  alpha: number;
  beta: number;
  typeOfDesign: "OF" | "P" | "WT" | "asP";
  sided: 1 | 2;
}

export interface DesignResult {
  criticalValues: number[];
  informationRates: number[];
  stageLevels: number[];
  futilityBounds?: number[];
}

export interface SampleSizeMeansParams extends DesignParams {
  meanRatio: number;
  stDev: number;
  allocationRatioPlanned: number;
}

export interface SampleSizeRatesParams extends DesignParams {
  pi1: number;
  pi2: number;
  allocationRatioPlanned: number;
}

export interface SampleSizeSurvivalParams extends DesignParams {
  lambda1?: number;
  lambda2?: number;
  median1?: number;
  median2?: number;
  accrualTime: number;
  followUpTime: number;
  allocationRatioPlanned: number;
}

export interface SimulationMeansParams extends DesignParams {
  meanRatio: number;
  stDev: number;
  maxNumberOfIterations: number;
}

export interface SimulationRatesParams extends DesignParams {
  pi1: number;
  pi2: number;
  maxNumberOfIterations: number;
}

export interface SimulationSurvivalParams extends DesignParams {
  lambda1: number;
  lambda2: number;
  accrualTime: number;
  followUpTime: number;
  maxNumberOfIterations: number;
}

export interface ApiResponse<T = Record<string, unknown>> {
  success: boolean;
  result?: T;
  rCode?: string;
  error?: string;
}

export interface SampleSizeResult {
  numberOfSubjects: number[];
  maxNumberOfSubjects: number;
  informationRates: number[];
  criticalValues: number[];
  power?: number;
}

export interface SimulationResult {
  overallReject: number;
  expectedNumberOfSubjects: number;
  iterations: number;
  rejectPerStage?: number[];
}
