import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const securityAgent = {
  async reason(telemetry: any) {
    const prompt = `
      You are the core reasoning engine for Claw Protect, an advanced security SaaS.
      Analyze the following security telemetry and provide:
      1. A summary of the current security posture.
      2. Any detected anomalies or threats.
      3. Actionable recommendations.
      4. A "Threat Level" from 0 to 100.

      Telemetry:
      ${JSON.stringify(telemetry, null, 2)}

      Respond in JSON format with the following structure:
      {
        "summary": string,
        "threats": string[],
        "recommendations": string[],
        "threatLevel": number,
        "reasoning": string
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
    } catch (error) {
      console.error("Gemini Reasoning Error:", error);
      return {
        summary: "Error in reasoning engine. Falling back to local heuristics.",
        threats: ["Reasoning Engine Offline"],
        recommendations: ["Check API connectivity"],
        threatLevel: 50,
        reasoning: "The LLM reasoning loop failed to respond."
      };
    }
  }
};
