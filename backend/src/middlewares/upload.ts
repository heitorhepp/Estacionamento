/**
 * upload.ts
 * Middleware de upload de imagem reutilizável (Multer).
 *
 * - memoryStorage: o arquivo fica só na memória (req.file.buffer) e vai direto para o
 *   Cloudinary/Gemini. Nada é gravado no disco do servidor.
 * - Limite de 5 MB e somente JPEG, PNG e WEBP.
 * Erros de tamanho viram 413 e de formato viram 400 (ver errorHandler).
 */
import multer from 'multer';
import { AppError } from '../utils/AppError';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return callback(null, true);
    callback(new AppError('Formato de imagem inválido. Envie um arquivo JPEG, PNG ou WEBP.', 400));
  },
});

/**
 * Aceita UMA imagem no campo informado do formulário multipart.
 * @param fieldName Nome do campo (padrão: "foto").
 * @example router.post('/foto', uploadImage(), handler) // arquivo em req.file
 */
export function uploadImage(fieldName = 'foto') {
  return imageUpload.single(fieldName);
}
