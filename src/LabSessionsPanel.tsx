import { useEffect, useRef, useState } from 'react'
import { deleteSession, listSessions, packSession, readSession, unpackSession, writeSession, type LabSnapshot, type SessionMeta } from './labSessions'

type Props = { snapshot: LabSnapshot; busy: boolean; onRestore: (snapshot: LabSnapshot) => void; onNew: () => LabSnapshot }

export function LabSessionsPanel({ snapshot, busy, onRestore, onNew }: Props) {
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [activeId, setActiveId] = useState<string>()
  const [name, setName] = useState('')
  const [working, setWorking] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<SessionMeta | null>(null)
  const [pending, setPending] = useState<{ action: 'open' | 'delete' | 'new'; session?: SessionMeta } | null>(null)
  const clean = useRef({ snapshot, name: '' })
  const dirty = snapshot.messages !== clean.current.snapshot.messages || snapshot.context !== clean.current.snapshot.context || snapshot.attachments !== clean.current.snapshot.attachments || snapshot.draft !== clean.current.snapshot.draft || name !== clean.current.name
  const disabled = busy || working

  useEffect(() => {
    let alive = true
    void listSessions().then((items) => { if (alive) setSessions(items) }).catch((reason: unknown) => { if (alive) setError(reason instanceof Error ? reason.message : 'Não consegui listar as sessões.') })
    return () => { alive = false }
  }, [])

  async function run(operation: () => Promise<void>) {
    setWorking(true); setError(''); setStatus('')
    try { await operation() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível concluir a operação.') }
    finally { setWorking(false) }
  }

  function save() {
    void run(async () => {
      const saved = packSession(snapshot, name || snapshot.context.objective || 'Minha bancada', activeId)
      await writeSession(saved)
      clean.current = { snapshot, name: saved.name }
      setName(saved.name); setActiveId(saved.id)
      setPending(null)
      setSessions(await listSessions())
      setStatus('Sessão salva neste navegador, incluindo os anexos.')
    })
  }

  function switchSession(session?: SessionMeta) {
    void run(async () => {
      if (session) {
        const saved = await readSession(session.id)
        const restored = unpackSession(saved)
        onRestore(restored)
        clean.current = { snapshot: restored, name: saved.name }
        setName(saved.name); setActiveId(saved.id)
        setStatus(`Sessão “${saved.name}” reaberta.`)
      } else {
        const blank = onNew()
        clean.current = { snapshot: blank, name: '' }
        setName(''); setActiveId(undefined)
        setStatus('Nova bancada pronta. As sessões salvas continuam disponíveis.')
      }
      setPending(null); setEditing(null)
    })
  }

  function requestSwitch(session?: SessionMeta) {
    if (dirty) setPending({ action: session ? 'open' : 'new', session })
    else switchSession(session)
  }

  function confirmAction() {
    if (!pending) return
    if (pending.action !== 'delete') { switchSession(pending.session); return }
    const item = pending.session!
    void run(async () => {
      await deleteSession(item.id)
      setSessions(await listSessions())
      if (activeId === item.id) setActiveId(undefined)
      setPending(null)
      setStatus('Cópia salva excluída. A conversa que está aberta não foi apagada.')
    })
  }

  function rename() {
    if (!editing?.name.trim()) return
    const edit = editing
    void run(async () => {
      const saved = await readSession(edit.id)
      await writeSession({ ...saved, name: edit.name.trim(), updatedAt: Date.now() })
      if (activeId === edit.id) {
        setName(edit.name.trim())
        clean.current.name = edit.name.trim()
      }
      setSessions(await listSessions()); setEditing(null)
      setStatus('Nome da sessão atualizado.')
    })
  }

  return <details className="lab-sessions">
    <summary>Sessões salvas{sessions.length ? ` · ${sessions.length}` : ''}{dirty ? ' · alterações não salvas' : ''}</summary>
    <div className="lab-sessions-body">
      <p>Salvas apenas neste navegador, com conversa, contexto e anexos. Não sincroniza entre dispositivos. Limpar os dados do site remove as sessões.</p>
      <label>Nome da sessão<input value={name} maxLength={80} disabled={disabled} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Fonte da bancada" /></label>
      <div className="session-actions">
        <button type="button" disabled={disabled} onClick={save}>{working ? 'Aguarde…' : activeId ? 'Salvar alterações' : 'Salvar sessão'}</button>
        <button type="button" disabled={disabled} onClick={() => requestSwitch()}>Nova bancada</button>
      </div>
      {status && <p role="status">{status}</p>}
      {error && <p className="chat-error" role="alert">{error}</p>}
      {pending && <div className="session-confirm">
        <p>{pending.action === 'delete' ? `Excluir a sessão salva “${pending.session!.name}”? Esta cópia não poderá ser recuperada.` : 'Há alterações não salvas na conversa atual. Salve antes de trocar, se quiser mantê-las.'}</p>
        <div className="session-actions"><button type="button" disabled={disabled} onClick={confirmAction}>{pending.action === 'delete' ? 'Confirmar exclusão' : 'Continuar sem salvar'}</button><button type="button" disabled={disabled} onClick={() => setPending(null)}>Cancelar</button></div>
      </div>}
      {editing && <div className="session-confirm"><label>Novo nome<input value={editing.name} maxLength={80} disabled={disabled} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label><div className="session-actions"><button type="button" disabled={disabled || !editing.name.trim()} onClick={rename}>Salvar nome</button><button type="button" disabled={disabled} onClick={() => setEditing(null)}>Cancelar renomeação</button></div></div>}
      {!sessions.length && <p>Nenhuma sessão salva ainda.</p>}
      <ul>{sessions.map((session) => <li key={session.id}>
        <strong>{session.name}{session.id === activeId ? ' · aberta' : ''}</strong>
        <small>{new Date(session.updatedAt).toLocaleString('pt-BR')}</small>
        <div className="session-actions">
          <button type="button" aria-label={`Abrir ${session.name}`} disabled={disabled} onClick={() => requestSwitch(session)}>Abrir</button>
          <button type="button" aria-label={`Renomear ${session.name}`} disabled={disabled} onClick={() => { setEditing(session); setPending(null) }}>Renomear</button>
          <button type="button" aria-label={`Excluir ${session.name}`} disabled={disabled} onClick={() => { setPending({ action: 'delete', session }); setEditing(null) }}>Excluir</button>
        </div>
      </li>)}</ul>
    </div>
  </details>
}
