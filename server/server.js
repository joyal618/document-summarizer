require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 5000;

// Validate critical environment variables
const requiredEnvVars = ["GEMINI_API_KEY"];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Enhanced CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["POST"],
  allowedHeaders: ["Content-Type"]
};
app.use(cors(corsOptions));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    console.log("Upload request received"); // Debug log
    
    if (!req.file) {
      console.log("No file in request"); // Debug log
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(`Processing ${req.file.mimetype} file`); // Debug log

    let text = "";
    try {
      if (req.file.mimetype === "application/pdf") {
        const pdfData = await pdfParse(req.file.buffer);
        text = pdfData.text;
      } else if (req.file.mimetype.includes("wordprocessingml.document")) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
      } else {
        return res.status(400).json({ error: "Unsupported file type" });
      }
    } catch (parseError) {
      console.error("File parsing error:", parseError);
      return res.status(400).json({ error: "Error parsing document" });
    }

    if (!text.trim()) {
      return res.status(400).json({ error: "Empty document content" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Summarize this document concisely:\n\n${text.substring(0, 30000)}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    res.json({ summary });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS configured for: ${corsOptions.origin}`);
});