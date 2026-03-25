<script lang="ts">
  import { api, type Activity, type Participant, type Expense, type Balances } from './api'

  let { activity, onBack }: { activity: Activity; onBack: () => void } = $props()

  let participants = $state<Participant[]>([])
  let expenses = $state<Expense[]>([])
  let balances = $state<Balances | null>(null)
  let newParticipant = $state('')
  let expAmount = $state('')
  let expDesc = $state('')
  let expPaidBy = $state<number | null>(null)
  let tab = $state<'expenses' | 'balances'>('balances')

  async function load() {
    [participants, expenses, balances] = await Promise.all([
      api.participants.list(activity.id),
      api.expenses.list(activity.id),
      api.balances.get(activity.id),
    ])
    if (participants.length > 0 && !expPaidBy) expPaidBy = participants[0].id
  }

  async function addParticipant() {
    if (!newParticipant.trim()) return
    const p = await api.participants.create(activity.id, newParticipant.trim())
    participants = [...participants, p]
    newParticipant = ''
    if (!expPaidBy) expPaidBy = p.id
    balances = await api.balances.get(activity.id)
  }

  async function removeParticipant(id: number) {
    await api.participants.delete(id)
    participants = participants.filter(p => p.id !== id)
    expenses = expenses.filter(e => e.paid_by !== id)
    balances = await api.balances.get(activity.id)
  }

  async function addExpense() {
    const amount = parseFloat(expAmount.replace(',', '.'))
    if (!expPaidBy || isNaN(amount) || amount <= 0) return
    const e = await api.expenses.create(activity.id, expPaidBy, amount, expDesc)
    expenses = [e, ...expenses]
    expAmount = ''
    expDesc = ''
    balances = await api.balances.get(activity.id)
    window.umami?.track('ausgabe-hinzugefuegt', { betrag: amount })
  }

  async function removeExpense(id: number) {
    await api.expenses.delete(id)
    expenses = expenses.filter(e => e.id !== id)
    balances = await api.balances.get(activity.id)
  }

  function fmt(n: number) { return n.toFixed(2).replace('.', ',') + ' €' }

  // Share-Link
  let copied = $state(false)
  function shareLink() {
    if (!activity.room_token) return
    const url = `${window.location.origin}/#/r/${activity.room_token}`
    // Fallback für HTTP (kein HTTPS) oder ältere Browser
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        copied = true
        setTimeout(() => copied = false, 2000)
      })
    } else {
      const el = document.createElement('textarea')
      el.value = url
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      copied = true
      setTimeout(() => copied = false, 2000)
    }
  }

  $effect(() => { load() })
</script>

<div class="page">
  <div class="back-row">
    <button class="back-btn" onclick={onBack}>← zurück</button>
    <span class="act-name">{activity.name}</span>
    {#if activity.room_token}
      <button class="share-btn" onclick={shareLink}>
        {copied ? '✓ kopiert' : '⬡ teilen'}
      </button>
    {/if}
  </div>

  <!-- Participants -->
  <section class="card">
    <div class="card-label">// teilnehmer</div>
    <div class="input-row">
      <input
        type="text"
        bind:value={newParticipant}
        placeholder="Name"
        onkeydown={(e) => e.key === 'Enter' && addParticipant()}
      />
      <button onclick={addParticipant} disabled={!newParticipant.trim()}>+ ADD</button>
    </div>
    {#if participants.length > 0}
      <div class="chips">
        {#each participants as p (p.id)}
          <span class="chip">
            {p.name}
            <button class="chip-del" onclick={() => removeParticipant(p.id)}>✕</button>
          </span>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Expense input -->
  {#if participants.length >= 2}
    <section class="card">
      <div class="card-label">// ausgabe hinzufügen</div>
      <div class="exp-grid">
        <select bind:value={expPaidBy}>
          {#each participants as p (p.id)}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
        <input
          type="text"
          inputmode="decimal"
          bind:value={expAmount}
          placeholder="Betrag €"
          onkeydown={(e) => e.key === 'Enter' && addExpense()}
        />
        <input
          type="text"
          bind:value={expDesc}
          placeholder="Beschreibung (optional)"
          class="desc-input"
          onkeydown={(e) => e.key === 'Enter' && addExpense()}
        />
        <button onclick={addExpense} disabled={!expAmount || !expPaidBy}>+ ADD</button>
      </div>
    </section>
  {:else if participants.length < 2}
    <div class="hint">// mindestens 2 teilnehmer für ausgaben</div>
  {/if}

  <!-- Tabs -->
  {#if participants.length >= 2}
    <div class="tabs">
      <button class="tab" class:active={tab === 'balances'} onclick={() => tab = 'balances'}>
        [SCHULDEN]
      </button>
      <button class="tab" class:active={tab === 'expenses'} onclick={() => tab = 'expenses'}>
        [AUSGABEN]
      </button>
    </div>

    {#if tab === 'balances'}
      <!-- Balances -->
      {#if balances}
        <section class="card">
          <div class="card-label">// gesamtausgaben: <span class="green">{fmt(balances.total)}</span></div>

          {#if balances.settlements.length === 0 && balances.total === 0}
            <div class="empty">keine ausgaben bisher</div>
          {:else if balances.settlements.length === 0}
            <div class="settled">✓ alles ausgeglichen</div>
          {:else}
            <div class="settlements">
              {#each balances.settlements as s}
                <div class="settlement">
                  <span class="s-from">{s.from}</span>
                  <span class="s-arrow"> ──▶ </span>
                  <span class="s-to">{s.to}</span>
                  <span class="s-amount">{fmt(s.amount)}</span>
                </div>
              {/each}
            </div>
          {/if}

          {#if balances.balances.length > 0 && balances.total > 0}
            <div class="balance-table">
              <div class="card-label" style="margin-top:16px">// einzelaufstellung</div>
              {#each balances.balances as b}
                <div class="balance-row">
                  <span class="b-name">{b.name}</span>
                  <span class="b-paid">gezahlt: {fmt(b.paid)}</span>
                  <span class="b-net" class:positive={b.net >= 0} class:negative={b.net < 0}>
                    {b.net >= 0 ? '+' : ''}{fmt(b.net)}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/if}

    {:else}
      <!-- Expense list -->
      <section class="card">
        <div class="card-label">// ausgaben</div>
        {#if expenses.length === 0}
          <div class="empty">keine ausgaben</div>
        {:else}
          <ul class="list">
            {#each expenses as e (e.id)}
              <li class="exp-item">
                <span class="e-who">{e.paid_by_name}</span>
                <span class="e-desc">{e.description || '—'}</span>
                <span class="e-amount">{fmt(e.amount)}</span>
                <button class="del-btn" onclick={() => removeExpense(e.id)}>✕</button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}
  {/if}
</div>

<style>
  .page { padding-top: 24px; }

  .back-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  .back-btn {
    background: none;
    border: 1px solid var(--border);
    color: var(--cyan-dim);
    font-family: var(--mono);
    font-size: 12px;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .back-btn:hover { border-color: var(--cyan); color: var(--cyan); background: rgba(0,229,255,0.08); }
  .act-name { color: var(--green); font-size: 16px; font-weight: 700; letter-spacing: 2px; flex: 1; }

  .share-btn {
    background: none;
    border: 1px solid #2a2a2a;
    color: #555;
    font-family: var(--mono);
    font-size: 11px;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
    letter-spacing: 1px;
    transition: all 0.15s;
    margin-left: auto;
  }
  .share-btn:hover { border-color: var(--cyan); color: var(--cyan); background: rgba(0,229,255,0.05); }

  .card {
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 14px 16px;
    margin-bottom: 12px;
    background: var(--bg-card);
  }
  .card-label { font-size: 11px; color: #444; margin-bottom: 10px; letter-spacing: 1px; }
  .green { color: var(--green); }

  .input-row { display: flex; gap: 8px; }

  input, select {
    background: var(--bg-input);
    border: 1px solid var(--border);
    color: var(--green);
    font-family: var(--mono);
    font-size: 13px;
    padding: 7px 10px;
    border-radius: 3px;
    outline: none;
    caret-color: var(--green);
    transition: border-color 0.2s;
  }
  input:focus, select:focus { border-color: var(--green-dim); }
  input::placeholder { color: #333; }
  select option { background: #111; }

  button {
    background: none;
    border: 1px solid var(--border);
    color: var(--green);
    font-family: var(--mono);
    font-size: 12px;
    padding: 7px 12px;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  button:hover:not(:disabled) { border-color: var(--green); background: var(--green-glow); }
  button:disabled { color: #333; cursor: default; }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .chip {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #111;
    border: 1px solid #222;
    border-radius: 3px;
    padding: 3px 8px;
    font-size: 12px;
    color: var(--cyan-dim);
  }
  .chip-del {
    padding: 0 2px;
    border: none;
    color: #444;
    font-size: 10px;
    line-height: 1;
  }
  .chip-del:hover { color: var(--red) !important; background: none !important; border-color: transparent !important; }

  .exp-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px;
  }
  .desc-input { grid-column: 1 / -1; }
  .exp-grid button { grid-column: 2; }
  .exp-grid select { min-width: 100px; }

  .tabs { display: flex; gap: 4px; margin-bottom: 8px; }
  .tab {
    font-size: 11px;
    padding: 5px 10px;
    color: #444;
    border-color: #1a1a1a;
  }
  .tab.active { color: var(--green); border-color: var(--green-dim); background: var(--green-glow); }

  .hint { color: #333; font-size: 12px; padding: 4px 0 12px; }

  .settlements { display: flex; flex-direction: column; gap: 8px; }
  .settlement {
    font-size: 13px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
  }
  .s-from { color: var(--red); }
  .s-arrow { color: #444; }
  .s-to { color: var(--green); }
  .s-amount { margin-left: auto; color: var(--cyan); font-weight: 700; }

  .settled { color: var(--green); font-size: 13px; }

  .balance-table { display: flex; flex-direction: column; gap: 4px; }
  .balance-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    border-top: 1px solid #0f0f0f;
    padding-top: 4px;
  }
  .b-name { flex: 1; color: var(--text-bright); }
  .b-paid { color: #555; font-size: 11px; }
  .b-net { font-weight: 700; min-width: 70px; text-align: right; }
  .b-net.positive { color: var(--green); }
  .b-net.negative { color: var(--red); }

  .list { list-style: none; padding: 0; margin: 0; }
  .exp-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    padding: 7px 0;
    border-bottom: 1px solid #0d0d0d;
  }
  .exp-item:last-child { border-bottom: none; }
  .e-who { color: var(--cyan-dim); min-width: 70px; }
  .e-desc { flex: 1; color: #666; }
  .e-amount { color: var(--green); font-weight: 700; }

  .del-btn {
    padding: 2px 6px;
    font-size: 10px;
    color: #333;
    border-color: transparent;
  }
  .del-btn:hover { color: var(--red) !important; border-color: var(--red) !important; background: rgba(255,68,68,0.1) !important; }

  .empty { color: #333; font-size: 12px; }
</style>
