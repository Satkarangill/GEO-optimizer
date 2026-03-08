import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai.types import GenerateContentConfig

load_dotenv()

app = FastAPI(title="Gemini Expert Consultant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

SYSTEM_INSTRUCTION = (
    "You are an expert, highly analytical consultant. Whenever the user asks a question, "
    "provide a clear, direct answer first. Then, automatically follow up with in-depth "
    "suggestions, best practices, or alternative approaches they might not have considered."
)


class MessageRequest(BaseModel):
    message: str


@app.post("/api/chat")
def chat(request: MessageRequest):
    if not client:
        return {"response": "Error: GEMINI_API_KEY is not set. Add it to backend/.env (see .env.example)."}
    try:
        config = GenerateContentConfig(
            system_instruction=[SYSTEM_INSTRUCTION],
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=request.message,
            config=config,
        )
        text = response.text if response.text else "No response generated."
        return {"response": text}
    except Exception as e:
        return {"response": f"Error calling Gemini: {str(e)}"}


@app.get("/health")
def health():
    return {"status": "ok"}
