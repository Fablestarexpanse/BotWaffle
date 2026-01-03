const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Encodes a string to Base64
 */
function toBase64(str) {
    return Buffer.from(str, 'utf8').toString('base64');
}

/**
 * Creates a PNG chunk
 * @param {string} type - 4 character chunk type (e.g. 'tEXt')
 * @param {Buffer} data - Chunk data
 * @returns {Buffer} Full chunk buffer
 */
function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');

    // Calculate CRC
    const crc = require('zlib').crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Exports a chatbot to a PNG Character Card (TavernAI/V2 Format)
 * @param {Object} chatbot - The chatbot object
 * @param {string} outputPath - Path to save the PNG
 * @param {string} sourceImagePath - Path to source avatar image (optional)
 */
function exportToPng(chatbot, outputPath, sourceImagePath) {
    // 1. Construct V2 Character Card Spec JSON
    const cardData = {
        name: chatbot.profile.name || "Anonymous",
        description: chatbot.profile.description || "",
        personality: chatbot.personality.personality || "",
        scenario: chatbot.prompts?.scenario || "",
        first_mes: chatbot.prompts?.greetings?.[0]?.text || "",
        mes_example: chatbot.prompts?.examples?.map(ex => `<START>\n{{user}}: ${ex.user}\n{{char}}: ${ex.assistant}`).join('\n') || "",
        creator_notes: `Created with BotWaffle`,
        system_prompt: chatbot.personality.systemPrompt || "",
        post_history_instructions: "",
        alternate_greetings: [],
        character_book: undefined,

        // Extended fields often used
        tags: chatbot.profile.tags || [],
        creator: "BotWaffle User",
        character_version: "1.0.0",
        extensions: {}
    };

    // Serialize to Base64 string for embedding
    const jsonStr = JSON.stringify(cardData);
    const base64Data = toBase64(jsonStr);

    // 2. Prepare PNG Data
    let pngBuffer;
    if (sourceImagePath && fs.existsSync(sourceImagePath)) {
        pngBuffer = fs.readFileSync(sourceImagePath);
        // Verify it's a PNG
        if (pngBuffer.readUInt32BE(0) !== 0x89504E47) {
            // If not PNG, we would ideally convert it, but for now throwing error or handling gracefully is needed.
            // Simplified: Throw if not PNG.
            throw new Error('Source image must be a PNG');
        }
    } else {
        // Create a 1x1 Transparent PNG if no image
        pngBuffer = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da636000020000050001e9fae39a0000000049454e44ae426082', 'hex');
    }

    // 3. Insert 'tEXt' chunk with keyword 'chara' and data
    // Format of tEXt data: keyword + null separator + text
    const keyword = 'chara';
    const textData = Buffer.concat([
        Buffer.from(keyword, 'ascii'),
        Buffer.alloc(1), // Null separator
        Buffer.from(base64Data, 'ascii')
    ]);

    const chunk = createChunk('tEXt', textData);

    // Insert before IEND (last 12 bytes)
    const endPos = pngBuffer.length - 12;
    const finalBuffer = Buffer.concat([
        pngBuffer.slice(0, endPos),
        chunk,
        pngBuffer.slice(endPos)
    ]);

    fs.writeFileSync(outputPath, finalBuffer);
    return true;
}

module.exports = { exportToPng };
