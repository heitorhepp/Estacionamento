/**
 * cloudinary.ts
 * Configura o SDK do Cloudinary com as credenciais do .env.
 * As imagens ficam no Cloudinary (CDN) e o banco guarda só a URL: o servidor
 * do Render não tem disco persistente, então salvar arquivo localmente se perderia.
 */
import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

/** true quando as três credenciais estão preenchidas. */
export const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true, // URLs https
});

export { cloudinary };
