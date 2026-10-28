<script lang="ts">
  import { api, AuthError, type AdminActivity } from './api'

  let authed = $state<boolean | null>(null)
  let password = $state('')
  let loginError = $state('')
  let loginLoading = $state(false)

  let activities = $state<AdminActivity[]>([])
  let loading = $state(true)

  async function checkAuth() {
    try {
      activities = await api.admin.activities.list()
      authed = true
    } catch (e) {
      authed = e instanceof AuthError ? false : true
    } finally {
      loading = false
    }
  }

  async function login() {
    if (!password) return
    loginLoading = true
    loginError = ''
    try {
      await api.admin.login(password)
      password = ''
      loading = true
      await load()
      authed = true
    } catch {
      loginError = 'falsches passwort'
      password = ''
    } finally {
      loginLoading = false
    }
  }

  async function logout() {
    await api.admin.logout()
    authed = false
  }

  async function load() {
    loading = true
    try {
      activities = await api.admin.activities.list()
    } finally {
      loading = false
    }
  }

  async function remove(id: number) {
    if (!confirm('Gruppe wirklich löschen?')) return
    await api.admin.activities.delete(id)
    activities = activities.filter(a => a.id !== id)
  }

  function fmt(n: number) { return n.toFixed(2).replace('.', ',') + ' €' }
  function fmtDate(s: string) { return new Date(s.replace(' ', 'T') + 'Z').toLocaleString('de-DE') }

  $effect(() => { checkAuth() })
</script>

{#if authed === null}
  <div class="loading">initializing...</div>
{:else if !authed}
  <div class="login-wrap">
    <div class="login-box">
      <div class="logo">DIVIDE<span class="sub">/admin</span></div>
      <div class="field">
        <label for="pw">// admin-passwort</label>
        <div class="input-row">
          <input
            id="pw"
            type="password"
            bind:value={password}
            placeholder="········"
            autofocus
            onkeydown={(e) => e.key === 'Enter' && login()}
            disabled={loginLoading}
          />
          <button onclick={login} disabled={loginLoading || !password}>
            {loginLoading ? '...' : 'LOGIN'}
          </button>
        </div>
        {#if loginError}
          <div class="error">✕ {loginError}</div>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <div class="page">
    <div class="top-row">
      <span class="title">// admin — {activities.length} gruppe{activities.length === 1 ? '' : 'n'}</span>
      <button class="logout-btn" onclick={logout}>⏻ logout</button>
    </div>

    {#if loading}
      <div class="empty">loading...</div>
    {:else if activities.length === 0}
      <div class="empty">keine gruppen vorhanden</div>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>name</th>
              <th>erstellt</th>
              <th>läuft ab</th>
              <th class="num">teilnehmer</th>
              <th class="num">ausgaben</th>
              <th class="num">summe</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each activities as a (a.id)}
              <tr>
                <td class="name">{a.name}</td>
                <td class="dim">{fmtDate(a.created_at)}</td>
                <td class="dim">{a.expires_at ? fmtDate(a.expires_at) : '—'}</td>
                <td class="num">{a.participant_count}</td>
                <td class="num">{a.expense_count}</td>
                <td class="num green">{fmt(a.total)}</td>
                <td class="actions">
                  {#if a.room_token}
                    <a class="open-link" href="/#/r/{a.room_token}" target="_blank">öffnen</a>
                  {/if}
                  <button class="del-btn" onclick={() => remove(a.id)} title="löschen">✕</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
{/if}

<style>
  .loading {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #333;
    font-size: 12px;
  }

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
    font-size: 24px;
    font-weight: 700;
    color: var(--green);
    letter-spacing: 4px;
    text-shadow: 0 0 24px var(--green);
    margin-bottom: 24px;
    text-align: center;
  }
  .sub { color: var(--cyan); font-size: 14px; letter-spacing: 1px; }

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

  .page { padding-top: 24px; }

  .top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .title { font-size: 12px; color: #555; letter-spacing: 1px; }

  .logout-btn {
    background: none;
    border: none;
    color: #333;
    font-size: 11px;
    padding: 4px 0;
  }
  .logout-btn:hover { color: var(--red); border-color: transparent; background: none; }

  .empty { color: #333; font-size: 12px; padding: 8px 0; }

  .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 4px; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; }

  th {
    text-align: left;
    font-weight: 400;
    color: #444;
    letter-spacing: 1px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  th.num { text-align: right; }

  td {
    padding: 8px 12px;
    border-bottom: 1px solid #0f0f0f;
    white-space: nowrap;
  }
  tr:last-child td { border-bottom: none; }

  td.name { color: var(--text-bright); }
  td.dim { color: #555; }
  td.num { text-align: right; }
  td.green { color: var(--green); font-weight: 700; }

  .actions { display: flex; align-items: center; gap: 8px; }
  .open-link {
    color: var(--cyan-dim);
    font-size: 11px;
    text-decoration: none;
  }
  .open-link:hover { color: var(--cyan); }

  .del-btn {
    padding: 2px 6px;
    font-size: 10px;
    color: #333;
    border-color: transparent;
  }
  .del-btn:hover { color: var(--red) !important; border-color: var(--red) !important; background: rgba(255,68,68,0.1) !important; }
</style>
