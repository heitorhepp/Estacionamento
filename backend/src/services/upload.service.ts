/**
 * upload.service.ts
 * Envia imagens ao Cloudinary e devolve a URL pública para salvar no banco.
 */
import { UploadApiResponse } from 'cloudinary';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { AppError } from '../utils/AppError';

/** Pastas separadas por finalidade, para organizar o painel do Cloudinary. */
export const UPLOAD_FOLDERS = {
  entries: 'estacionamento/entradas',
  vehicles: 'estacionamento/veiculos',
} as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[keyof typeof UPLOAD_FOLDERS];

/**
 * Envia uma imagem (em memória) ao Cloudinary.
 *
 * Usa upload_stream porque o Multer está com memoryStorage: temos um Buffer, não um
 * caminho de arquivo. O stream manda o buffer direto, sem arquivo temporário em disco.
 *
 * @param file Arquivo recebido pelo Multer (req.file).
 * @param folder Pasta de destino.
 * @returns URL https da imagem.
 * @throws 400 sem arquivo; 503 se o Cloudinary não estiver configurado; 502 se o envio falhar.
 */
export async function uploadImage(file: Express.Multer.File | undefined, folder: UploadFolder): Promise<string> {
  if (!file) throw new AppError('Envie uma imagem no campo "foto".', 400);
  if (!isCloudinaryConfigured) {
    throw new AppError('O upload de imagens não está configurado no servidor (Cloudinary).', 503);
  }

  try {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'image',
            // Reduz fotos grandes de celular (até 1600 px) e deixa o Cloudinary escolher a qualidade.
            transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
          },
          (error, uploaded) => (error || !uploaded ? reject(error) : resolve(uploaded)),
        )
        .end(file.buffer);
    });
    return result.secure_url;
  } catch (err) {
    console.error('Falha no upload para o Cloudinary:', err);
    throw new AppError('Não foi possível enviar a imagem. Tente novamente.', 502);
  }
}
