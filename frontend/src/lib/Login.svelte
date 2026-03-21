<script lang="ts">
  import { api } from './api'

  let { onLogin }: { onLogin: () => void } = $props()

  let password = $state('')
  let error = $state('')
  let loading = $state(false)

  async function submit() {
    if (!password) return
    loading = true
    error = ''
    try {
      await api.auth.login(password)
      onLogin()
    } catch {
      error = 'falsches passwort'
      password = ''
    } finally {
      loading = false
    }
  }
</script>

<div class="login-wrap">
  <div class="login-box">
    <div class="logo">DIVIDE</div>
    <div class="prompt-line">
      <span class="prompt">divide@pi</span><span class="sep">:</span><span class="path">~</span><span class="dollar">$</span>
      <span class="cmd">authenticate</span>
    </div>

    <div class="field">
      <label for="pw">// passwort</label>
      <div class="input-row">
        <input
          id="pw"
          type="password"
          bind:value={password}
          placeholder="········"
          autofocus
          onkeydown={(e) => e.key === 'Enter' && submit()}
          disabled={loading}
        />
        <button onclick={submit} disabled={loading || !password}>
          {loading ? '...' : 'LOGIN'}
        </button>
      </div>
      {#if error}
        <div class="error">✕ {error}</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .login-wrap {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .login-box {
    width: 100%;
    max-width: 360px;
    border: 1px solid #1a1a1a;
    border-radius: 4px;
    padding: 32px 24px;
    background: #040404;
  }

  .logo {
    font-size: 28px;
    font-weight: 700;
    color: var(--green);
    letter-spacing: 6px;
    text-shadow: 0 0 24px var(--green);
    margin-bottom: 24px;
    text-align: center;
  }

  .prompt-line {
    font-size: 12px;
    color: var(--green-dim);
    margin-bottom: 20px;
  }
  .sep { color: #444; }
  .path { color: var(--cyan-dim); }
  .dollar { color: var(--text); margin: 0 6px 0 4px; }
  .cmd { color: #555; }

  .field { display: flex; flex-direction: column; gap: 8px; }

  label { font-size: 11px; color: #444; letter-spacing: 1px; }

  .input-row { display: flex; gap: 8px; }

  input {
    flex: 1;
    background: #0a0a0a;
    border: 1px solid #1a1a1a;
    color: var(--green);
    font-family: var(--mono);
    font-size: 14px;
    padding: 9px 12px;
    border-radius: 3px;
    outline: none;
    caret-color: var(--green);
    transition: border-color 0.2s;
    letter-spacing: 3px;
  }
  input:focus { border-color: var(--green-dim); }
  input::placeholder { letter-spacing: 2px; color: #222; }

  button {
    background: none;
    border: 1px solid var(--border);
    color: var(--green);
    font-family: var(--mono);
    font-size: 12px;
    padding: 9px 14px;
    border-radius: 3px;
    cursor: pointer;
    letter-spacing: 1px;
    transition: all 0.15s;
    white-space: nowrap;
  }
  button:hover:not(:disabled) { border-color: var(--green); background: var(--green-glow); }
  button:disabled { color: #333; cursor: default; }

  .error { font-size: 12px; color: var(--red); }
</style>
