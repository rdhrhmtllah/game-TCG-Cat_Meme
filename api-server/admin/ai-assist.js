import { GoogleGenerativeAI } from "@google/generative-ai";
import requireAdmin from "../_lib/requireAdmin.js";
import { sendError, logError } from "../_lib/errors.js";

/**
 * POST /api/admin/ai-assist
 * AI-assisted card creation using Gemini API.
 * Generates card properties (description, attack names, stats, etc.) from a prompt.
 */
export default requireAdmin(async function handler(req, res) {
  if (req.method !== "POST") {
    return sendError(res, 405, "VALIDATION_ERROR", "Method not allowed");
  }

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "CHANGE_ME") {
      return sendError(
        res,
        503,
        "SERVICE_UNAVAILABLE",
        "GEMINI_API_KEY belum dikonfigurasi.",
      );
    }

    const { prompt, currentCard, mode, image } = req.body;
    // mode: 'auto-create' | 'suggest' | 'modify-description' | 'suggest-attacks'

    if (!prompt && !currentCard?.name && !image) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Prompt, nama kartu, atau gambar diperlukan.",
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "auto-create") {
      // Auto-create: Generate ALL card properties from just a name/theme or image
      systemPrompt = `Kamu adalah pencipta kartu paling gokil untuk game TCG (Trading Card Game) bertema kucing meme bernama "MemeCats: The Viral Collection".
      
Tugas: Buatkan SEMUA properti untuk sebuah kartu berdasarkan gambar kucing meme yang dilampirkan dan/atau instruksi teks tambahan yang diberikan.

PENTING:
1. Identifikasi meme kucing pada gambar (jika ada). Temukan nama populer/resmi meme tersebut di internet (misal: "Pop Cat", "Keyboard Cat", "Grumpy Cat", "Maxwell the Cat", "Beluga", "Huh Cat", "Smudge the Cat", "Crying Cat", dll.).
2. Ambil "lore" (sejarah asli/konteks viral/inside jokes) meme tersebut dari internet untuk dijadikan tema kartu.
3. GAYA BAHASA HARUS ANAK MEME BANGET: JANGAN menulis dengan bahasa Indonesia baku/formal yang kaku seperti textbook sekolah atau humas korporat! Gunakan bahasa gaul internet/sosial media Indonesia (seperti gaya anak Twitter, Discord, TikTok, atau Kaskus) yang santai, kocak, sarkastik, dan penuh dengan slang.
4. Masukkan istilah gaul populer yang relate, contoh: "menolak punah", "vibing", "menyala abangku 🔥", "riil no fek", "si paling", "cringe", "sekte", "🗿", "💀", "sheesh", "ngab", "bjir", "gokil", "anjiir", "lawak", "lore", "canon event", "sekte", "ngakak brutal", "bukan main".
5. Response HARUS berupa JSON valid.

Format response JSON:
{
  "name": "nama resmi/populer meme kucing tersebut (max 100 char, contoh: Keyboard Cat, Maxwell the Spinning Cat)",
  "description": "deskripsi/flavor text kocak, santai, dan penuh slang tentang lore/sejarah meme kucing ini di internet (max 255 char, bahasa gaul sosmed Indonesia)",
  "rarity": "Common|Rare|Epic|Legendary",
  "hypeScore": number (Common:30-80, Rare:150-300, Epic:350-500, Legendary:700-1000),
  "likesPerSec": number (Common:0.5-1.5, Rare:2-5, Epic:5-10, Legendary:12-25),
  "element": "Normal|Fire|Water|Electric|Cosmic|Shadow|Nature",
  "attack": number (0-5000, sesuai rarity),
  "defense": number (0-5000, sesuai rarity),
  "attackName1": "nama attack 1 yang sangat relate dengan aksi/suara meme kucing ini (max 50 char, contoh: 'Keyboard Outro solo', 'Mouth POP Spam')",
  "attackName2": "nama attack 2 bertema keunikan meme tersebut (max 50 char)",
  "specialAbility": "nama kemampuan khusus bertema keunikan meme tersebut (max 100 char)",
  "specialDesc": "deskripsi efek kemampuan khusus yang kocak dan gaul (max 255 char, bahasa gaul Indonesia)",
  "weakness": "emoji + multiplier, contoh: 💧 x2",
  "resistance": "emoji + value, contoh: 📦 -30",
  "illustrator": "nama creator asli meme atau 'Internet Culture'"
}

Pastikan stats seimbang sesuai rarity. Sesuaikan Element dengan sifat meme kucing tersebut (misal: jika suka berputar pilih Cosmic, jika pemarah pilih Fire, jika suka air/menangis pilih Water, jika berenergi/cepat pilih Electric, dll.).`;

      if (image) {
        userPrompt = prompt
          ? `Identifikasi gambar kucing meme ini dan buatkan kartu TCG dengan instruksi tambahan: ${prompt}`
          : `Identifikasi gambar kucing meme ini dan buatkan kartu TCG yang sesuai.`;
      } else {
        userPrompt =
          prompt ||
          `Buatkan kartu untuk: ${currentCard?.name || "Kucing Meme"}`;
      }
    } else if (mode === "suggest-attacks") {
      systemPrompt = `Kamu adalah desainer kartu TCG kucing meme "MemeCats". Suggest attack names dan special ability yang keren berdasarkan tema kartu.
      
Response HARUS dalam format JSON valid:
{
  "attackName1": "nama attack 1",
  "attackName2": "nama attack 2",
  "specialAbility": "nama special ability",
  "specialDesc": "deskripsi special ability"
}`;

      userPrompt =
        prompt ||
        `Suggest attacks untuk kartu "${currentCard?.name}" (${currentCard?.rarity}, element: ${currentCard?.element})`;
    } else if (mode === "modify-description") {
      systemPrompt = `Kamu adalah copywriter untuk game TCG kucing meme "MemeCats". Tulis/modifikasi deskripsi kartu yang lucu dan menarik (bahasa Indonesia, max 255 char).
      
Response HARUS dalam format JSON valid:
{
  "description": "deskripsi baru"
}`;

      const existingDesc = currentCard?.description
        ? `\nDeskripsi saat ini: "${currentCard.description}"`
        : "";
      userPrompt = `${prompt || "Buatkan deskripsi yang lebih menarik"}${existingDesc}\nNama kartu: ${currentCard?.name || "Unknown"}`;
    } else {
      // Default: general suggestions
      systemPrompt = `Kamu adalah desainer kartu TCG kucing meme "MemeCats". Berikan saran untuk meningkatkan kartu ini.
      
Response HARUS dalam format JSON valid:
{
  "suggestions": ["saran 1", "saran 2", "saran 3"],
  "improvedFields": {
    // hanya field yang disarankan untuk diubah
  }
}`;

      userPrompt =
        prompt || `Berikan saran untuk kartu: ${JSON.stringify(currentCard)}`;
    }

    let contentParts = [];
    if (image && image.data && image.mimeType) {
      contentParts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType,
        },
      });
    }
    contentParts.push({ text: systemPrompt });
    contentParts.push({ text: userPrompt });

    let result;
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });
      result = await model.generateContent(contentParts);
    } catch (err) {
      console.warn(
        "Gemini 2.0 Flash failed, falling back to Gemini 1.5 Flash:",
        err.message,
      );
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });
      result = await fallbackModel.generateContent(contentParts);
    }

    const responseText = result.response.text().trim();

    // Try to parse JSON from response
    let parsed;
    try {
      // Remove markdown code blocks if present
      const cleaned = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, return raw text
      return res.status(200).json({
        success: true,
        mode,
        raw: responseText,
        parsed: null,
        message: "AI response received but could not be parsed as JSON.",
      });
    }

    return res.status(200).json({
      success: true,
      mode,
      parsed,
      raw: responseText,
    });
  } catch (err) {
    logError("/api/admin/ai-assist", err);
    return sendError(
      res,
      500,
      "INTERNAL_ERROR",
      "AI assist gagal: " + (err.message || "Unknown error"),
    );
  }
});
