
import { GoogleGenAI, Type } from "@google/genai";
import { ZipFile, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeCodebase = async (files: ZipFile[]): Promise<AnalysisResult> => {
  // We only send text files to Gemini. Filter out binary-looking extensions or directories.
  const textFiles = files.filter(f => !f.isDirectory && isLikelyText(f.name));
  
  // Truncate if codebase is massive, prioritizing common entry points
  const contextFiles = textFiles.slice(0, 30); 
  
  const filesContext = contextFiles.map(f => `FILE: ${f.path}\nCONTENT:\n${f.content.substring(0, 5000)}`).join('\n\n---\n\n');

  const prompt = `
    You are a world-class code analyst and software engineer. I have uploaded a ZIP file containing source code. 
    Here is the content of the primary files in the project:
    
    ${filesContext}
    
    Please analyze this project. Determine what it is, how it works, and "run" it in your simulation.
    Explain what would happen if this code were executed in its appropriate environment.
    Identify the main entry point and key dependencies.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 20000 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "A high-level summary of the project." },
          entryPoint: { type: Type.STRING, description: "The likely main entry point of the application." },
          dependencies: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of major libraries or dependencies found."
          },
          executionSimulation: { 
            type: Type.STRING, 
            description: "A detailed 'run' log or description of what happens when executed." 
          },
          suggestions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Improvements or bugs found during analysis."
          }
        },
        required: ["summary", "entryPoint", "dependencies", "executionSimulation", "suggestions"]
      }
    }
  });

  return JSON.parse(response.text) as AnalysisResult;
};

const isLikelyText = (filename: string): boolean => {
  const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md', '.txt', '.py', '.rb', '.go', '.java', '.c', '.cpp', '.rs', '.php'];
  return textExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};
