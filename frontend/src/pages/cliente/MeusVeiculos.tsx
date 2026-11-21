/**
 * MeusVeiculos.tsx
 * Veículos do cliente logado em cards com foto. Cadastro/edição em modal com
 * pré-visualização da foto (enviada ao Cloudinary após salvar os dados).
 * Cadastrar o veículo faz o sistema reconhecê-lo na entrada (e aplicar a mensalidade).
 */
import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Bike, Car, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { Input, Segmented } from '../../components/FormFields';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { PlateBadge } from '../../components/PlateBadge';
import { Skeleton } from '../../components/Skeleton';
import { UploadFoto } from '../../components/UploadFoto';
import { useAsync } from '../../hooks/useAsync';
import { useForm } from '../../hooks/useForm';
import { vehicleService } from '../../services/vehicle.service';
import type { Vehicle, VehicleType } from '../../types';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { VEHICLE_TYPE_LABEL, isValidPlate } from '../../utils/format';

const emptyForm = { placa: '', modelo: '', cor: '', tipo: 'CARRO' as VehicleType };

export function MeusVeiculos() {
  const { data: vehicles, loading, reload } = useAsync(vehicleService.list, []);
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Vehicle | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm(emptyForm);

  function openForm(vehicle: Vehicle | 'new') {
    setEditing(vehicle);
    setPhoto(null);
    form.reset(vehicle === 'new' ? emptyForm : { placa: vehicle.placa, modelo: vehicle.modelo, cor: vehicle.cor, tipo: vehicle.tipo });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const v = form.values;
    const e: Record<string, string> = {};
    if (!isValidPlate(v.placa)) e.placa = 'Placa inválida. Use ABC-1234 ou ABC1D23.';
    if (!v.modelo.trim()) e.modelo = 'Informe o modelo.';
    if (!v.cor.trim()) e.cor = 'Informe a cor.';
    if (Object.keys(e).length) return form.setErrors(e);

    setBusy(true);
    try {
      const saved = editing === 'new' ? await vehicleService.create(v) : await vehicleService.update((editing as Vehicle).id, v);
      if (photo) {
        try {
          await vehicleService.uploadPhoto(saved.id, photo);
        } catch (err) {
          // Os dados já foram salvos; só a foto falhou.
          toast.error(`Veículo salvo, mas a foto não foi enviada: ${getErrorMessage(err)}`);
        }
      }
      toast.success(editing === 'new' ? 'Veículo cadastrado.' : 'Veículo atualizado.');
      setEditing(null);
      reload(true);
    } catch (err) {
      form.setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await vehicleService.remove(toDelete.id);
      toast.success('Veículo removido.');
      setToDelete(null);
      reload(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Meus veículos"
        subtitle="Veículos cadastrados são reconhecidos automaticamente na entrada."
        actions={
          <Button onClick={() => openForm('new')} icon={<Plus className="h-4 w-4" />}>
            Adicionar veículo
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : !vehicles?.length ? (
        <Card>
          <EmptyState
            icon={<Car className="h-7 w-7" />}
            title="Nenhum veículo cadastrado"
            description="Adicione seu carro ou moto para acompanhar suas estadias."
            action={<Button onClick={() => openForm('new')}>Adicionar veículo</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => {
            const Icon = v.tipo === 'CARRO' ? Car : Bike;
            return (
              <Card key={v.id} className="group overflow-hidden transition-shadow duration-200 hover:shadow-lift">
                <div className="relative h-40 bg-gradient-to-br from-ink-100 to-ink-200">
                  {v.fotoUrl ? (
                    <img src={v.fotoUrl} alt={`${v.modelo} ${v.placa}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-ink-300">
                      <Icon className="h-14 w-14" />
                    </div>
                  )}
                  <div className="absolute left-3 top-3">
                    <PlateBadge plate={v.placa} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-4">
                  <div>
                    <p className="font-semibold text-ink-900">{v.modelo}</p>
                    <p className="text-sm text-ink-500">
                      {v.cor} · {VEHICLE_TYPE_LABEL[v.tipo]}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" aria-label="Editar" onClick={() => openForm(v)} icon={<Pencil className="h-4 w-4" />} />
                    <Button size="sm" variant="ghost" aria-label="Remover" onClick={() => setToDelete(v)} icon={<Trash2 className="h-4 w-4 text-occupied-600" />} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Adicionar veículo' : 'Editar veículo'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" form="vehicle-form" loading={busy}>
              Salvar
            </Button>
          </>
        }
      >
        <form id="vehicle-form" onSubmit={handleSave} noValidate className="space-y-4">
          <UploadFoto onSelect={setPhoto} currentUrl={editing && editing !== 'new' ? editing.fotoUrl : null} heightClass="h-44" label="Foto do veículo (opcional)" />
          <Segmented
            label="Tipo"
            value={form.values.tipo}
            onChange={(t) => form.setField('tipo', t)}
            options={[
              { value: 'CARRO', label: 'Carro', icon: <Car className="h-4 w-4" /> },
              { value: 'MOTO', label: 'Moto', icon: <Bike className="h-4 w-4" /> },
            ]}
          />
          <Input label="Placa" placeholder="ABC1D23" autoCapitalize="characters" maxLength={8} value={form.values.placa} onChange={(e) => form.setField('placa', e.target.value.toUpperCase())} error={form.errors.placa} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Modelo" placeholder="Ex.: Honda Civic" value={form.values.modelo} onChange={(e) => form.setField('modelo', e.target.value)} error={form.errors.modelo} />
            <Input label="Cor" placeholder="Ex.: Preto" value={form.values.cor} onChange={(e) => form.setField('cor', e.target.value)} error={form.errors.cor} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Remover veículo"
        message={
          <>
            Remover o veículo <strong>{toDelete?.modelo}</strong>? O histórico de estadias continua salvo, mas ele deixará de ser reconhecido na entrada.
          </>
        }
        confirmLabel="Remover"
        loading={busy}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
