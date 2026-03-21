<script lang="ts">
  import { api, type Activity } from './api'

  let { onRoom }: { onRoom: (activity: Activity) => void } = $props()

  let name = $state('')
  let loading = $state(false)
  let error = $state('')

  async function create() {
    if (!name.trim()) return
    loading = true
    error = ''
    try {
      const activity = await api.rooms.create(name.trim())
      // URL im Browser setzen damit der Link teilbar ist
      window.location.hash = `/r/${activity.room_token}`
      onRoom(activity)
    } catch (e) {
      error = 'Fehler beim Erstellen. Bitte nochmal versuchen.'
    } finally {
      loading = false
    }
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
    {#if error}
      <div class="error">{error}</div>
    {/if}
  </section>

  <section class="how">
    <div class="label">// so funktioniert es</div>
    <ol>
      <li><span class="num">01</span> gruppe erstellen &amp; link teilen</li>
      <li><span class="num">02</span> jeder trägt seine ausgaben ein</li>
      <li><span class="num">03</span> divide zeigt, wer wem was schuldet</li>
    </ol>
  </section>

  <footer>
    <span class="expires">// gruppen werden nach 30 tagen automatisch gelöscht</span>
  </footer>
</div>

<style>
  .landing {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    gap: 48px;
    padding: 48px 0 32px;
  }

  header {
    text-align: center;
  }

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
    color: #444;
    font-size: 13px;
    letter-spacing: 2px;
  }

  .create {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .label {
    font-size: 11px;
    color: #555;
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

  .prompt {
    color: var(--green);
    font-size: 14px;
    flex-shrink: 0;
  }

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

  .error {
    font-size: 12px;
    color: var(--red);
    letter-spacing: 1px;
  }

  .how {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

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
    color: #555;
    font-size: 13px;
    letter-spacing: 1px;
  }

  .num {
    color: var(--cyan);
    font-size: 11px;
    flex-shrink: 0;
  }

  footer {
    margin-top: auto;
    text-align: center;
  }

  .expires {
    font-size: 10px;
    color: #2a2a2a;
    letter-spacing: 1px;
  }
</style>
