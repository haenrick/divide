<script lang="ts">
  import { api, AuthError, type Activity } from './api'

  let { onSelect, onUnauth }: { onSelect: (a: Activity) => void; onUnauth: () => void } = $props()

  let activities = $state<Activity[]>([])
  let newName = $state('')
  let loading = $state(true)

  async function load() {
    try {
      activities = await api.activities.list()
    } catch (e) {
      if (e instanceof AuthError) onUnauth()
    } finally {
      loading = false
    }
  }

  async function create() {
    if (!newName.trim()) return
    const a = await api.activities.create(newName.trim())
    activities = [a, ...activities]
    newName = ''
  }

  async function remove(id: number) {
    await api.activities.delete(id)
    activities = activities.filter(a => a.id !== id)
  }

  $effect(() => { load() })
</script>

<div class="page">
  <header>
    <span class="prompt">divide@pi</span><span class="sep">:</span><span class="path">~</span><span class="cursor">$</span>
    <span class="title">DIVIDE</span>
  </header>
  <p class="subtitle">// Ausgaben aufteilen — simpel und fair</p>

  <section class="card">
    <div class="card-label">// neue aktivität</div>
    <div class="input-row">
      <input
        type="text"
        bind:value={newName}
        placeholder="z.B. Ausflug Berlin"
        onkeydown={(e) => e.key === 'Enter' && create()}
      />
      <button onclick={create} disabled={!newName.trim()}>+ ADD</button>
    </div>
  </section>

  <section class="card">
    <div class="card-label">// aktivitäten</div>
    {#if loading}
      <div class="empty">loading...</div>
    {:else if activities.length === 0}
      <div class="empty">keine aktivitäten vorhanden</div>
    {:else}
      <ul class="list">
        {#each activities as a (a.id)}
          <li class="list-item">
            <button class="item-btn" onclick={() => onSelect(a)}>
              <span class="item-id">[{String(a.id).padStart(3, '0')}]</span>
              <span class="item-name">{a.name}</span>
              <span class="item-date">{new Date(a.created_at).toLocaleDateString('de-DE')}</span>
            </button>
            <button class="del-btn" onclick={() => remove(a.id)} title="löschen">✕</button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .page { padding-top: 32px; }

  header {
    font-size: 12px;
    color: var(--green-dim);
    margin-bottom: 4px;
  }
  .sep { color: #444; }
  .path { color: var(--cyan-dim); }
  .cursor { color: var(--text); margin: 0 8px 0 4px; }
  .title {
    font-size: 22px;
    font-weight: 700;
    color: var(--green);
    letter-spacing: 4px;
    text-shadow: 0 0 20px var(--green);
  }

  .subtitle {
    color: #444;
    font-size: 12px;
    margin: 0 0 28px;
  }

  .card {
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 16px;
    background: var(--bg-card);
    position: relative;
  }
  .card-label {
    font-size: 11px;
    color: #444;
    margin-bottom: 12px;
    letter-spacing: 1px;
  }

  .input-row {
    display: flex;
    gap: 8px;
  }

  input {
    flex: 1;
    background: var(--bg-input);
    border: 1px solid var(--border);
    color: var(--green);
    font-family: var(--mono);
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 3px;
    outline: none;
    transition: border-color 0.2s;
    caret-color: var(--green);
  }
  input:focus { border-color: var(--green-dim); }
  input::placeholder { color: #333; }

  button {
    background: none;
    border: 1px solid var(--border);
    color: var(--green);
    font-family: var(--mono);
    font-size: 13px;
    padding: 8px 14px;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.15s;
  }
  button:hover:not(:disabled) {
    border-color: var(--green);
    background: var(--green-glow);
  }
  button:disabled { color: #333; cursor: default; }

  .list { list-style: none; padding: 0; margin: 0; }

  .list-item {
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--border);
    gap: 4px;
  }
  .list-item:last-child { border-bottom: none; }

  .item-btn {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 4px;
    border: none;
    text-align: left;
    font-size: 13px;
    border-radius: 2px;
  }
  .item-btn:hover { background: var(--green-glow); border-color: transparent; }

  .item-id { color: #333; font-size: 11px; min-width: 38px; }
  .item-name { flex: 1; color: var(--text-bright); }
  .item-date { color: #444; font-size: 11px; }

  .del-btn {
    padding: 4px 8px;
    font-size: 11px;
    color: #333;
    border-color: transparent;
  }
  .del-btn:hover { color: var(--red) !important; border-color: var(--red) !important; background: rgba(255,68,68,0.1) !important; }

  .empty { color: #333; font-size: 12px; padding: 8px 0; }
</style>
