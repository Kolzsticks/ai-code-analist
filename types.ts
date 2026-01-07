
export interface ZipFile {
  name: string;
  path: string;
  content: string;
  isDirectory: boolean;
}

export interface AnalysisResult {
  summary: string;
  entryPoint: string;
  dependencies: string[];
  executionSimulation: string;
  suggestions: string[];
}
