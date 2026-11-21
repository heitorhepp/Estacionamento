/**
 * Entrada.tsx
 * Registro de entrada com foto e IA:
 * 1. Operador tira/escolhe a foto → o back-end salva no Cloudinary e o Gemini sugere
 *    placa, modelo, cor, tipo e avarias (indicador "Analisando foto...").
 * 2. Os campos são preenchidos com o selo "sugerido pela IA" — o operador SEMPRE confere
 *    e pode corrigir. Ao editar o campo, o selo some.
 * 3. Escolhe a vaga (só vagas livres e do tipo certo) e confirma.
 * Se a IA ou o upload falharem, o formulário continua funcionando manualmente.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bike, Car, CircleAlert, Loader2, ScanLine, Sparkles } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input, Segmented, Select, Textarea } from '../../components/FormFields';
import { PageHeader } from '../../components/PageHeader';
import { UploadFoto } from '../../components/UploadFoto';
import { useAsync } from '../../hooks/useAsync';
import { useForm } from '../../hooks/useForm';
import { movementService } from '../../services/movement.service';
import { spotService } from '../../services/spot.service';
import type { VehicleType } from '../../types';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { isValidPlate } from '../../utils/format';

type SuggestedField = 'placa' | 'modelo' | 'cor' | 'tipoVeiculo' | 'avariasObservadas';

const initialForm = { placa: '', modelo: '', cor: '', tipoVeiculo: 'CARRO' as VehicleType, vagaId: '', avariasObservadas: '' };

/** Selo exibido ao lado do rótulo dos campos preenchidos pela IA. */
function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-50 to-violet-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
      <Sparkles className="h-3 w-3" /> sugerido pela IA
    </span>
  );
}

export function Entrada() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { values, setField, setValues, errors, setErrors, reset } = useForm(initialForm);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<Set<SuggestedField>>(new Set());
  const [saving, setSaving] = useState(false);
  const [photoKey, setPhotoKey] = useState(0); // força limpar a pré-visualização após salvar

  const { data: spots } = useAsync(spotService.list, []);
  const freeSpots = useMemo(() => (spots ?? []).filter((s) => s.status === 'LIVRE' && s.tipo === values.tipoVeiculo), [spots, values.tipoVeiculo]);

  // Vaga vinda do mapa (?vaga=id): seleciona ela e o tipo correspondente.
  useEffect(() => {
    const spot = spots?.find((s) => s.id === searchParams.get('vaga'));
    if (spot) setValues((v) => ({ ...v, vagaId: spot.id, tipoVeiculo: spot.tipo }));
  }, [spots, searchParams, setValues]);

  // Se a vaga escolhida não serve para o tipo atual, limpa a escolha.
  useEffect(() => {
    if (values.vagaId && spots && !freeSpots.some((s) => s.id === values.vagaId)) setField('vagaId', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeSpots]);

  /** Altera um campo e retira o selo de IA dele (o operador assumiu o valor). */
  function edit<K extends keyof typeof initialForm>(field: K, value: (typeof initialForm)[K]) {
    setField(field, value);
    setSuggested((current) => {
      const next = new Set(current);
      next.delete(field as SuggestedField);
      return next;
    });
  }

  async function handlePhoto(file: File) {
    setAnalyzing(true);
    setWarnings([]);
    try {
      const result = await movementService.analyzePhoto(file);
      setPhotoUrl(result.fotoUrl);
      setWarnings(result.avisos);
      const s = result.sugestao;
      if (s) {
        // Só sobrescreve os campos que a IA conseguiu ler (null = não reconheceu).
        const suggestion = {
          placa: s.placa ?? undefined,
          modelo: s.modelo ?? undefined,
          cor: s.cor ?? undefined,
          tipoVeiculo: s.tipoVeiculo ?? undefined,
          avariasObservadas: s.avarias ?? undefined,
        };
        const filled = new Set((Object.keys(suggestion) as SuggestedField[]).filter((field) => suggestion[field]));
        setValues((v) => ({
          ...v,
          ...Object.fromEntries(Object.entries(suggestion).filter(([, value]) => value)),
        }));
        setSuggested(filled);
        if (filled.size) toast.success('Campos preenchidos pela IA. Confira antes de salvar.');
      }
    } catch (err) {
      setWarnings([getErrorMessage(err)]);
    } finally {
      setAnalyzing(false);
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!isValidPlate(values.placa)) e.placa = 'Placa inválida. Use ABC-1234 ou ABC1D23.';
    if (!values.modelo.trim()) e.modelo = 'Informe o modelo.';
    if (!values.cor.trim()) e.cor = 'Informe a cor.';
    if (!values.vagaId) e.vagaId = 'Escolha uma vaga livre.';
    return e;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    if (Object.keys(found).length) return setErrors(found);

    setSaving(true);
    try {
      const movement = await movementService.registerEntry({
        ...values,
        avariasObservadas: values.avariasObservadas.trim() || null,
        fotoEntradaUrl: photoUrl,
      });
      toast.success(`Entrada registrada na vaga ${movement.vaga.codigo}.`);
      reset();
      setPhotoUrl(null);
      setSuggested(new Set());
      setWarnings([]);
      setPhotoKey((k) => k + 1);
      navigate('/painel/mapa');
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const badge = (field: SuggestedField) => (suggested.has(field) ? <AiBadge /> : undefined);

  return (
    <>
      <PageHeader title="Registrar entrada" subtitle="Tire uma foto do veículo: a IA sugere os dados e você confirma." />

      <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-5">
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink-900">
            <ScanLine className="h-5 w-5 text-brand-600" /> Foto do veículo
          </h2>
          <UploadFoto
            key={photoKey}
            onSelect={handlePhoto}
            heightClass="h-64 sm:h-80"
            label="Tirar foto do veículo"
            overlay={
              analyzing && (
                <div className="absolute inset-0 flex animate-fade-in flex-col items-center justify-center gap-3 bg-ink-950/60 text-white backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm font-semibold">Analisando foto...</p>
                  <p className="text-xs text-ink-300">A IA está lendo placa, modelo e cor</p>
                </div>
              )
            }
          />
          {warnings.length > 0 && (
            <div className="mt-3 space-y-1.5 rounded-xl bg-overdue-50 p-3 text-sm text-overdue-700">
              {warnings.map((w) => (
                <p key={w} className="flex gap-2">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {w}
                </p>
              ))}
              <p className="text-xs text-overdue-600">Você pode preencher os campos manualmente.</p>
            </div>
          )}
          <p className="mt-3 text-xs text-ink-500">A foto é opcional, mas ajuda a registrar o estado do veículo na entrada.</p>
        </Card>

        <Card className="space-y-4 p-4 sm:p-5 lg:col-span-3">
          <h2 className="font-semibold text-ink-900">Dados do veículo</h2>
          <Segmented
            label="Tipo"
            badge={badge('tipoVeiculo')}
            value={values.tipoVeiculo}
            onChange={(v) => edit('tipoVeiculo', v)}
            options={[
              { value: 'CARRO', label: 'Carro', icon: <Car className="h-4 w-4" /> },
              { value: 'MOTO', label: 'Moto', icon: <Bike className="h-4 w-4" /> },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Placa"
              badge={badge('placa')}
              placeholder="ABC1D23"
              autoCapitalize="characters"
              className="sm:col-span-2"
              value={values.placa}
              onChange={(e) => edit('placa', e.target.value.toUpperCase())}
              error={errors.placa}
              maxLength={8}
            />
            <Input label="Modelo" badge={badge('modelo')} placeholder="Ex.: Fiat Argo" value={values.modelo} onChange={(e) => edit('modelo', e.target.value)} error={errors.modelo} />
            <Input label="Cor" badge={badge('cor')} placeholder="Ex.: Prata" value={values.cor} onChange={(e) => edit('cor', e.target.value)} error={errors.cor} />
          </div>
          <Select
            label="Vaga"
            value={values.vagaId}
            onChange={(e) => edit('vagaId', e.target.value)}
            error={errors.vagaId}
            hint={`${freeSpots.length} vaga(s) livre(s) para ${values.tipoVeiculo === 'CARRO' ? 'carro' : 'moto'}`}
          >
            <option value="">Selecione uma vaga livre</option>
            {freeSpots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.codigo} — Setor {s.setor}
              </option>
            ))}
          </Select>
          <Textarea
            label="Avarias observadas"
            badge={badge('avariasObservadas')}
            placeholder="Riscos, amassados, retrovisor quebrado... (opcional)"
            value={values.avariasObservadas}
            onChange={(e) => edit('avariasObservadas', e.target.value)}
            error={errors.avariasObservadas}
            maxLength={500}
          />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => navigate('/painel/mapa')}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving} disabled={analyzing}>
              Confirmar entrada
            </Button>
          </div>
        </Card>
      </form>
    </>
  );
}
