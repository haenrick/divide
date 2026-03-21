<script lang="ts">
  import { api, type Activity } from './api'
  import { saveRoom, getRecentRooms, removeRoom, type SavedRoom } from './rooms'
  import { version } from '../../package.json'

  let { onRoom }: { onRoom: (activity: Activity) => void } = $props()

  let name     = $state('')
  let email    = $state('')
  let loading  = $state(false)
  let error    = $state('')
  let emailSent = $state(false)
  let recent   = $state<SavedRoom[]>(getRecentRooms())

  async function create() {
    if (!name.trim()) return
    loading = true
    error = ''
    emailSent = false
    try {
      const activity = await api.rooms.create(name.trim(), email.trim() || undefined)
      saveRoom(activity.room_token!, activity.name)
      if (email.trim()) emailSent = true
      window.location.hash = `/r/${activity.room_token}`
      onRoom(activity)
    } catch {
      error = 'Fehler beim Erstellen. Bitte nochmal versuchen.'
    } finally {
      loading = false
    }
  }

  async function openRoom(token: string) {
    try {
      const activity = await api.rooms.get(token)
      saveRoom(token, activity.name)
      window.location.hash = `/r/${token}`
      onRoom(activity)
    } catch {
      // Room abgelaufen → aus Liste entfernen
      removeRoom(token)
      recent = getRecentRooms()
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') create()
  }
</script>

<div class="landing">
  <header>
    <div class="logo">DIVIDE<span class="cursor">_</span></div>
    <p class="tagline">// gemeinsame ausgaben aufteilen</p>
  </header>

  <!-- Neue Gruppe -->
  <section class="create">
    <div class="label">&gt; neue gruppe erstellen</div>
    <div class="input-row">
      <span class="prompt">$</span>
      <input
        type="text"
        bind:value={name}
        onkeydown={onKeydown}
        placeholder="z.B. Berlin-Trip"
        disabled={loading}
        autofocus
      />
      <button onclick={create} disabled={loading || !name.trim()}>
        {loading ? '...' : 'starten'}
      </button>
    </div>
    <div class="email-row">
      <span class="prompt-dim">@</span>
      <input
        class="email-input"
        type="email"
        bind:value={email}
        onkeydown={onKeydown}
        placeholder="email für link-zusendung (optional)"
        disabled={loading}
      />
    </div>
    {#if error}
      <div class="error">{error}</div>
    {/if}
  </section>

  <!-- Zuletzt besucht -->
  {#if recent.length > 0}
    <section class="recent">
      <div class="label">// zuletzt besucht</div>
      <ul>
        {#each recent as room (room.token)}
          <li>
            <button class="room-btn" onclick={() => openRoom(room.token)}>
              <span class="room-name">{room.name}</span>
              <span class="room-date">{formatDate(room.visited)}</span>
            </button>
          </li>
        {/each}
      </ul>
      <div class="hint">// auf diesem gerät gespeichert · link teilen damit andere zugriff haben</div>
    </section>
  {/if}

  <!-- Erklärung -->
  <section class="how">
    <div class="label">// so funktioniert es</div>
    <ol>
      <li><span class="num">01</span> gruppe erstellen &amp; link teilen</li>
      <li><span class="num">02</span> jeder trägt seine ausgaben ein</li>
      <li><span class="num">03</span> divide zeigt, wer wem was schuldet</li>
    </ol>
    <div class="warning">
      <span class="warn-prefix">[!]</span> link ist einziger zugang — sofort speichern oder teilen
    </div>
  </section>

  <!-- Footer -->
  <footer>
    <div class="footer-links">
      <a href="https://haenrick.github.io/divide/" target="_blank" rel="noopener">info &amp; installation</a>
      <span class="sep">·</span>
      <a href="https://github.com/haenrick/divide" target="_blank" rel="noopener">github</a>
      <span class="sep">·</span>
      <span class="ver">v{version}</span>
    </div>
    <div class="expires">// gruppen werden nach 30 tagen automatisch gelöscht</div>
  </footer>
</div>

<style>
  .landing {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    gap: 40px;
    padding: 48px 0 32px;
  }

  header { text-align: center; }

  .logo {
    font-size: clamp(2.5rem, 10vw, 4rem);
    font-weight: 700;
    color: var(--green);
    letter-spacing: 0.2em;
    line-height: 1;
    text-shadow: 0 0 30px rgba(0, 255, 136, 0.4);
  }

  .cursor {
    animation: blink 1s step-end infinite;
    color: var(--cyan);
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .tagline {
    margin-top: 12px;
    color: #555;
    font-size: 13px;
    letter-spacing: 2px;
  }

  /* Create */
  .create { display: flex; flex-direction: column; gap: 12px; }

  .label {
    font-size: 11px;
    color: #666;
    letter-spacing: 2px;
    margin-bottom: 4px;
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #1a1a1a;
    background: var(--bg-input);
    padding: 12px 14px;
    transition: border-color 0.2s;
  }

  .input-row:focus-within {
    border-color: var(--green);
    box-shadow: 0 0 0 1px var(--green);
  }

  .prompt { color: var(--green); font-size: 14px; flex-shrink: 0; }

  input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: #e8e8e8;
    font-family: var(--mono);
    font-size: 16px;
    min-width: 0;
  }

  input::placeholder { color: #333; }
  input:disabled { opacity: 0.5; }

  button {
    background: var(--green);
    border: none;
    color: #000;
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    padding: 8px 14px;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.15s;
  }

  button:disabled { opacity: 0.3; cursor: not-allowed; }
  button:not(:disabled):hover { opacity: 0.8; }

  .email-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    border: 1px solid #111;
    background: var(--bg-input);
  }
  .email-row:focus-within { border-color: #222; }
  .prompt-dim { color: #333; font-size: 14px; flex-shrink: 0; }
  .email-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: #888;
    font-family: var(--mono);
    font-size: 13px;
    min-width: 0;
  }
  .email-input::placeholder { color: #2a2a2a; }

  .error { font-size: 12px; color: var(--red); letter-spacing: 1px; }

  /* Recent */
  .recent { display: flex; flex-direction: column; gap: 10px; }

  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }

  .room-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-card);
    border: 1px solid #1a1a1a;
    color: #e8e8e8;
    font-family: var(--mono);
    font-size: 13px;
    padding: 10px 14px;
    cursor: pointer;
    letter-spacing: 1px;
    transition: border-color 0.15s;
    text-align: left;
  }

  .room-btn:hover { border-color: var(--green); color: var(--green); }
  .room-date { font-size: 10px; color: #555; flex-shrink: 0; }
  .hint { font-size: 10px; color: #444; letter-spacing: 1px; margin-top: 4px; }

  /* How */
  .how { display: flex; flex-direction: column; gap: 16px; }

  ol {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 14px;
    color: #666;
    font-size: 13px;
    letter-spacing: 1px;
  }

  .num { color: var(--cyan); font-size: 11px; flex-shrink: 0; }

  .warning {
    font-size: 11px;
    color: #555;
    letter-spacing: 1px;
  }
  .warn-prefix { color: var(--cyan-dim); margin-right: 4px; }

  /* Footer */
  footer {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .footer-links {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10px;
  }

  .footer-links a {
    color: #666;
    text-decoration: none;
    letter-spacing: 1px;
    transition: color 0.15s;
  }

  .footer-links a:hover { color: var(--cyan); }
  .sep { color: #555; }
  .ver { color: #666; letter-spacing: 1px; }

  .expires {
    font-size: 10px;
    color: #555;
    letter-spacing: 1px;
  }
</style>
