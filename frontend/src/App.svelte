<script lang="ts">
  import Login from './lib/Login.svelte'
  import ActivityList from './lib/ActivityList.svelte'
  import ActivityDetail from './lib/ActivityDetail.svelte'
  import { api, AuthError, type Activity } from './lib/api'

  let authed = $state<boolean | null>(null)  // null = noch unbekannt
  let selected = $state<Activity | null>(null)

  // Beim Start prüfen ob Session noch gültig ist
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

  $effect(() => { checkAuth() })
</script>

{#if authed === null}
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
