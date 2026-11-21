/**
 * UploadFoto.tsx
 * Seleção de foto com pré-visualização antes do envio.
 * - capture="environment": no celular abre direto a câmera traseira.
 * - Valida formato (JPEG/PNG/WEBP) e tamanho (5 MB) já no navegador, com a mesma
 *   regra do back-end, para o usuário não esperar o upload para descobrir o erro.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Camera, ImagePlus, RefreshCw } from 'lucide-react';

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

interface UploadFotoProps {
  /** Chamado com o arquivo já validado. */
  onSelect: (file: File) => void;
  /** URL de uma foto já existente (modo edição). */
  currentUrl?: string | null;
  /** Conteúdo sobreposto à imagem (ex.: "Analisando foto..."). */
  overlay?: ReactNode;
  /** Classe de altura da área (padrão: h-56). */
  heightClass?: string;
  label?: string;
}

export function UploadFoto({ onSelect, currentUrl, overlay, heightClass = 'h-56', label = 'Tirar ou escolher foto' }: UploadFotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Libera a URL temporária da pré-visualização para não vazar memória.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return void toast.error('Formato inválido. Use JPEG, PNG ou WEBP.');
    if (file.size > MAX_SIZE) return void toast.error('A imagem deve ter no máximo 5 MB.');
    setPreview(URL.createObjectURL(file));
    onSelect(file);
  }

  const image = preview ?? currentUrl;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border-2 border-dashed ${image ? 'border-transparent' : 'border-ink-200 hover:border-brand-400'} bg-ink-50 transition-colors ${heightClass}`}>
      <input ref={inputRef} type="file" accept={ACCEPTED.join(',')} capture="environment" className="hidden" onChange={handleChange} />

      {image ? (
        <>
          <img src={image} alt="Pré-visualização da foto" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-ink-800 shadow-soft backdrop-blur transition hover:bg-white"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Trocar foto
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-full w-full flex-col items-center justify-center gap-3 text-ink-500 transition-colors hover:text-brand-600"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft transition-transform duration-200 group-hover:scale-105">
            <Camera className="h-7 w-7" />
          </span>
          <span className="text-sm font-semibold">{label}</span>
          <span className="flex items-center gap-1 text-xs text-ink-400">
            <ImagePlus className="h-3.5 w-3.5" /> JPEG, PNG ou WEBP · até 5 MB
          </span>
        </button>
      )}

      {overlay}
    </div>
  );
}
