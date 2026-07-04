import { put } from '@vercel/blob';
import requireAdmin from '../_lib/requireAdmin.js';
import { sendError, logError } from '../_lib/errors.js';

/**
 * POST /api/admin/upload-image
 * Uploads card artwork image to Vercel Blob Storage.
 * Accepts JSON body with base64 image data.
 */
export default requireAdmin(async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const { imageData, fileName, contentType } = req.body;

    if (!imageData) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'imageData (base64) diperlukan.');
    }

    // Decode base64
    const base64Data = imageData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Ukuran file maksimal 5MB.');
    }

    // Generate unique filename
    const ext = (contentType || 'image/png').split('/')[1] || 'png';
    const uniqueName = `cards/${fileName || 'card'}-${Date.now()}.${ext}`;

    // Upload to Vercel Blob with adaptive access fallback
    let blob;
    try {
      blob = await put(uniqueName, buffer, {
        access: 'public',
        contentType: contentType || 'image/png',
      });
    } catch (putErr) {
      const errMsg = putErr.message || '';
      if (errMsg.includes('private store') || errMsg.includes('private access') || errMsg.includes('configured with private')) {
        blob = await put(uniqueName, buffer, {
          access: 'private',
          contentType: contentType || 'image/png',
        });
      } else {
        throw putErr;
      }
    }

    return res.status(200).json({
      message: 'Gambar berhasil diupload!',
      url: blob.url,
    });
  } catch (err) {
    logError('/api/admin/upload-image', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal upload gambar: ' + (err.message || 'Unknown error'));
  }
});
