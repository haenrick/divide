<script lang="ts">
  import Login from './lib/Login.svelte'
  import Landing from './lib/Landing.svelte'
  import ActivityList from './lib/ActivityList.svelte'
  import ActivityDetail from './lib/ActivityDetail.svelte'
  import { api, AuthError, type Activity, type AppConfig } from './lib/api'
  import { saveRoom } from './lib/rooms'

  let appConfig = $state<AppConfig | null>(null)
  let authed    = $state<boolean | null>(null)
  let selected  = $state<Activity | null>(null)

  // ─── Selfhosted: Auth prüfen ───────────────────────────────────────────────

  async function checkAuth() {
    try {
      await api.activities.list()
      authed = true
    } catch (e) {
      authed = e instanceof AuthError ? false : true
    }
  }

  async function logout() {
    await api.auth.logout()
    authed = false
    selected = null
  }

  // ─── SaaS: URL-Hash Routing ───────────────────────────────────────────────
  // Hash-Format: #/r/TOKEN

  function getTokenFromHash(): string | null {
    const hash = window.location.hash.replace('#', '')
    const match = hash.match(/^\/r\/([a-f0-9]+)$/)
    return match ? match[1] : null
  }

  async function loadFromHash() {
    const token = getTokenFromHash()
    if (!token) { selected = null; return }
    try {
      selected = await api.rooms.get(token)
      saveRoom(token, selected.name)
    } catch {
      // Token ungültig oder abgelaufen → zurück zur Landing
      window.location.hash = ''
      selected = null
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  $effect(() => {
    api.config.get().then(async (cfg) => {
      appConfig = cfg

      if (cfg.mode === 'saas') {
        // Hash-Routing initialisieren
        await loadFromHash()
        window.addEventListener('hashchange', loadFromHash)
      } else {
        // Selfhosted: Auth prüfen
        await checkAuth()
      }
    })
  })
</script>

<!-- ─── Loading ─────────────────────────────────────────────────────────── -->
{#if appConfig === null}
  <div class="loading">initializing...</div>

<!-- ─── SaaS Mode ─────────────────────────────────────────────────────── -->
{:else if appConfig.mode === 'saas'}
  {#if selected}
    <ActivityDetail
      activity={selected}
      onBack={() => { window.location.hash = ''; selected = null }}
    />
  {:else}
    <Landing onRoom={(a) => selected = a} />
  {/if}

<!-- ─── Selfhosted Mode ────────────────────────────────────────────────── -->
{:else if authed === null}
  <div class="loading">initializing...</div>

{:else if !authed}
  <Login onLogin={() => { authed = true }} />

{:else}
  <div class="logout-bar">
    <button onclick={logout}>⏻ logout</button>
  </div>

  {#if selected}
    <ActivityDetail activity={selected} onBack={() => selected = null} />
  {:else}
    <ActivityList onSelect={(a) => selected = a} onUnauth={() => authed = false} />
  {/if}
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

  .logout-bar {
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
  }

  .logout-bar button {
    background: none;
    border: none;
    color: #333;
    font-family: var(--mono);
    font-size: 11px;
    cursor: pointer;
    padding: 4px 0;
    transition: color 0.15s;
    letter-spacing: 1px;
  }
  .logout-bar button:hover { color: var(--red); }
</style>
