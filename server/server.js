require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const upload = multer({ storage: multer.memoryStorage() }); 
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error("Missing GEMINI_API_KEY environment variable");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

// Configure CORS properly
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  optionsSuccessStatus: 200
}));

app.use(express.json());

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let text = "";

    if (req.file.mimetype === "application/pdf") {
      const pdfData = await pdfParse(req.file.buffer);
      text = pdfData.text;
    } else if (
      req.file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        error: "Could not extract text from document" 
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Summarize this document concisely in 3-5 bullet points:\n\n${text.substring(0, 30000)}`; 
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    res.json({ summary });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ 
      error: "Error processing file",
      details: err.message 
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));