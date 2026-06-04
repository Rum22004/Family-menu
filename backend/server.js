import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

function getPhnomPenhHour() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Phnom_Penh",
    hour: "2-digit",
    hour12: false,
  });

  let hour = Number(formatter.format(now));

  if (hour === 24) {
    hour = 0;
  }

  return hour;
}

function isOrderingOpen() {
  const hour = getPhnomPenhHour();

  // Closed only from 4 PM to before 7 PM.
  return hour < 16 || hour >= 19;
}

function getSessionMessage() {
  const hour = getPhnomPenhHour();

  if (hour >= 16 && hour < 19) {
    return "ការកម្មង់បានបិទហើយ។ អ្នកមិនអាចកម្មង់ ផ្លាស់ប្តូរ ឬលុបការកម្មង់បានទេ។ នឹងបើកវិញក្រោយម៉ោង 7:00 យប់ សម្រាប់ថ្ងៃស្អែក។";
  }

  if (hour >= 19) {
    return "ការកម្មង់បានបើកវិញហើយ។ អ្នកអាចកម្មង់មុខម្ហូបសម្រាប់ថ្ងៃស្អែកបាន។";
  }

  return "ការកម្មង់កំពុងបើក។ សូមកម្មង់មុនម៉ោង 4:00 ល្ងាច។";
}

function getOrderTargetText() {
  const hour = getPhnomPenhHour();

  if (hour >= 19) {
    return "សម្រាប់ថ្ងៃស្អែក";
  }

  return "សម្រាប់ថ្ងៃនេះ";
}

async function sendTelegramMessage(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error("Telegram token or chat ID is missing");
  }

  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

  await axios.post(telegramUrl, {
    chat_id: chatId,
    text,
  });
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Family menu backend is running",
  });
});

app.get("/api/session", (req, res) => {
  res.json({
    success: true,
    isOpen: isOrderingOpen(),
    message: getSessionMessage(),
    orderTarget: getOrderTargetText(),
  });
});

// Test this in browser anytime:
// https://family-menu-1tva.onrender.com/api/alert
app.get("/api/alert", async (req, res) => {
  try {
    const message = `
🔔 Family Menu Alert

ម៉ោង 3:00 ល្ងាចហើយ!

សូមចូលជ្រើសរើសមុខម្ហូបមុនម៉ោង 4:00 ល្ងាច។
ក្រោយម៉ោង 4:00 ល្ងាច អ្នកមិនអាចកម្មង់ ផ្លាស់ប្តូរ ឬលុបការកម្មង់បានទេ។

👉 បើក Menu:
https://family-menu-mu.vercel.app
`;

    await sendTelegramMessage(message);

    res.json({
      success: true,
      message: "Alert sent to Telegram",
    });
  } catch (error) {
    console.error("Alert error:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "Failed to send alert",
      error: error.response?.data || error.message,
    });
  }
});

app.post("/api/send-menu", async (req, res) => {
  try {
    const { selectedItems, note, action } = req.body;

    if (!isOrderingOpen()) {
      return res.status(403).json({
        success: false,
        message: getSessionMessage(),
      });
    }

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

    const menuList = selectedItems
      .map((item, index) => `${index + 1}. ${item.name}`)
      .join("\n");

    const finalNote = note && note.trim() !== "" ? note.trim() : "មិនមាន";

    const now = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Phnom_Penh",
    });

    const orderTarget = getOrderTargetText();

    const title =
      action === "change"
        ? "♻️ ការកម្មង់ត្រូវបានផ្លាស់ប្តូរ"
        : "🍽️ ការកម្មង់ថ្មី";

    const telegramMessage = `
${title}

📅 កម្មង់: ${orderTarget}

📋 បញ្ជីមុខម្ហូប:
${menuList}

📝 កំណត់ចំណាំ:
${finalNote}

⏰ Time: ${now}
`;

    await sendTelegramMessage(telegramMessage);

    res.status(200).json({
      success: true,
      message:
        action === "change"
          ? "Changed order sent to Telegram"
          : "New order sent to Telegram",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send Telegram message",
      error: error.response?.data || error.message,
    });
  }
});

app.post("/api/cancel-order", async (req, res) => {
  try {
    if (!isOrderingOpen()) {
      return res.status(403).json({
        success: false,
        message: getSessionMessage(),
      });
    }

    const { selectedItems, note } = req.body;

    const menuList =
      selectedItems && selectedItems.length > 0
        ? selectedItems
            .map((item, index) => `${index + 1}. ${item.name}`)
            .join("\n")
        : "មិនមាន";

    const finalNote = note && note.trim() !== "" ? note.trim() : "មិនមាន";

    const now = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Phnom_Penh",
    });

    const telegramMessage = `
❌ ការកម្មង់ត្រូវបានលុប

📋 មុខម្ហូបដែលបានលុប:
${menuList}

📝 កំណត់ចំណាំ:
${finalNote}

⏰ Time: ${now}
`;

    await sendTelegramMessage(telegramMessage);

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error.response?.data || error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});