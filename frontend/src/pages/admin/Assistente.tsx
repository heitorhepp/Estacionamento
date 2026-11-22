/**
 * Assistente.tsx
 * Assistente de IA do ADMIN com visual de chat. A pergunta vai para o back-end, que
 * monta um resumo AGREGADO dos dados (sem dados pessoais) e consulta o Gemini.
 * Erros (ex.: limite de requisições) aparecem como mensagem amigável no próprio chat.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { dashboardService } from '../../services/dashboard.service';
import { useAuthStore } from '../../stores/authStore';
import { useAssistenteStore } from '../../stores/assistenteStore';
import { getErrorMessage } from '../../utils/errors';

const suggestions = [
  'Qual dia teve mais movimento esta semana?',
  'Qual é o horário de pico?',
  'Quanto faturamos este mês com mensalidades?',
  'Como está a ocupação agora?',
];

export function Assistente() {
  const user = useAuthStore((state) => state.user);
  const { messages, thinking, addMessage, setThinking } = useAssistenteStore();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Rola até a última mensagem.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  async function ask(question: string) {
    const text = question.trim();
    if (text.length < 3 || thinking) return;
    setInput('');
    addMessage({ id: Date.now(), role: 'user', text });
    setThinking(true);
    try {
      const { resposta } = await dashboardService.ask(text);
      addMessage({ id: Date.now(), role: 'assistant', text: resposta });
    } catch (err) {
      addMessage({ id: Date.now(), role: 'assistant', text: getErrorMessage(err), error: true });
    } finally {
      setThinking(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    ask(input);
  }

  return (
    <>
      <PageHeader title="Assistente IA" subtitle="Pergunte em linguagem natural sobre o movimento e o faturamento dos últimos 30 dias." />

      <Card className="flex h-[calc(100vh-15rem)] min-h-[480px] flex-col overflow-hidden">
        <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lift">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-ink-900">Como posso ajudar?</h2>
              <p className="mt-1 max-w-md text-sm text-ink-500">Eu analiso um resumo dos dados do estacionamento. Experimente uma destas perguntas:</p>
              <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="rounded-xl border border-ink-200 bg-white px-4 py-3 text-left text-sm text-ink-700 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex animate-fade-in justify-end gap-3">
                <p className="max-w-[80%] rounded-2xl rounded-tr-md bg-brand-600 px-4 py-2.5 text-sm text-white">{m.text}</p>
                <Avatar name={user?.nome ?? 'Você'} url={user?.avatarUrl} size="sm" />
              </div>
            ) : (
              <div key={m.id} className="flex animate-fade-in gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-white">
                  <Bot className="h-4 w-4" />
                </span>
                <p
                  className={`max-w-[80%] whitespace-pre-line rounded-2xl rounded-tl-md px-4 py-2.5 text-sm leading-relaxed ${
                    m.error ? 'bg-overdue-50 text-overdue-700' : 'bg-ink-100 text-ink-800'
                  }`}
                >
                  {m.text}
                </p>
              </div>
            ),
          )}

          {thinking && (
            <div className="flex gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-ink-100 px-4 py-3">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-ink-100 bg-ink-50/60 p-3 sm:p-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva sua pergunta..."
            maxLength={500}
            className="h-11 flex-1 rounded-xl border border-ink-200 bg-white px-4 text-[15px] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
            aria-label="Pergunta para o assistente"
          />
          <Button type="submit" loading={thinking} disabled={input.trim().length < 3} icon={<Send className="h-4 w-4" />}>
            <span className="hidden sm:inline">Enviar</span>
          </Button>
        </form>
      </Card>
    </>
  );
}
