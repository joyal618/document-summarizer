process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const cors = require("cors");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const upload = multer({ dest: "uploads/" });
const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApiKey);

app.use(cors());
app.use(express.json());

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    let text = "";

    if (req.file.mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
      console.log("PDF parsed. Text length:", text.length);
      console.log("First 500 characters of PDF text:", text.substring(0, 500));
    } else if (
      req.file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const data = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer: data });
      text = result.value;
      console.log("DOCX parsed. Text length:", text.length);
      console.log("First 500 characters of DOCX text:", text.substring(0, 500));
    } else {
      return res.status(400).send("Unsupported file type");
    }

    fs.unlinkSync(filePath);

    // Check if text is empty after extraction
    if (!text || text.trim().length === 0) {
      console.error("Extracted text is empty!");
      return res
        .status(400)
        .send(
          "Could not extract text from the document. Please check the file content."
        );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Summarize the following document:\n\n${text}`;

    console.log("Prompt length sent to Gemini:", prompt.length);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing file");
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));