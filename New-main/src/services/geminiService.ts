import { GoogleGenAI, Type } from "@google/genai";
import { Mood, NoteCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function analyzeNote(content: string): Promise<{ mood: Mood; category: NoteCategory; summary: string }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this note and determine the most appropriate mood and category. 
    Note: "${content}"
    
    Moods: happy, sad, inspired, thoughtful, energetic, calm
    Categories: idea, inspiration, memory, status, reminder
    
    Return a JSON object with 'mood', 'category', and a short 'summary' (max 10 words).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mood: { type: Type.STRING, enum: ["happy", "sad", "inspired", "thoughtful", "energetic", "calm"] },
          category: { type: Type.STRING, enum: ["idea", "inspiration", "memory", "status", "reminder"] },
          summary: { type: Type.STRING }
        },
        required: ["mood", "category", "summary"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function transformToLyrics(content: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Transform the following note into poetic song lyrics. 
    Note: "${content}"
    
    The lyrics should be emotional, rhythmic, and capture the essence of the note. 
    Return only the lyrics in markdown format.`,
  });

  return response.text;
}

export async function transcribeAudio(base64Audio: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "audio/webm",
            data: base64Audio
          }
        },
        { text: "Transcribe this audio accurately in Turkish." }
      ]
    }
  });

  return response.text;
}
