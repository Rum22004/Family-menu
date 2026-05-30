import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Family menu backend is running",
  });
});

app.post("/api/send-menu", async (req, res) => {
  try {
    const { selectedItems, note } = req.body;

    if (
      !selectedItems ||
      !Array.isArray(selectedItems) ||
      selectedItems.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "No menu selected",
      });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({
        success: false,
        message: "Telegram token or chat ID is missing in .env file",
      });
    }

    const menuList = selectedItems
      .map((item, index) => `${index + 1}. ${item.name}`)
      .join("\n");

    const finalNote =
      note && note.trim() !== "" ? note.trim() : "មិនមាន";

    const now = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Phnom_Penh",
    });

    const telegramMessage = `
🍽️ មុខម្ហូបដែលបានជ្រើស

📋 បញ្ជីមុខម្ហូប:
${menuList}

📝 កំណត់ចំណាំ:
${finalNote}

⏰ Time: ${now}
`;

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const telegramResponse = await axios.post(telegramUrl, {
      chat_id: chatId,
      text: telegramMessage,
    });

    if (!telegramResponse.data.ok) {
      return res.status(500).json({
        success: false,
        message: "Telegram failed to send message",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Sent to Telegram successfully",
    });
  } catch (error) {
    console.error("Telegram error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to send Telegram message",
      error: error.response?.data || error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});