<script lang="ts">
  import { navigate } from '../router'
</script>

<section class="np-404">
  <h1>404</h1>
  <p>That page was not found.</p>
  <button onclick={() => navigate('/')}>Back home</button>
</section>

<style>
  .np-404 {
    text-align: center;
    padding: 96px 24px;
  }
  h1 {
    font-size: 72px;
    font-weight: 700;
    color: var(--np-text-primary);
    margin: 0 0 8px;
  }
  p {
    color: var(--np-text-secondary);
    margin: 0 0 24px;
  }
  button {
    height: 36px;
    padding: 0 16px;
    border: 0;
    border-radius: var(--np-radius-md);
    background-color: var(--np-brand);
    color: var(--np-text-on-brand);
    font-weight: 500;
    cursor: pointer;
  }
  button:hover { background-color: var(--np-brand-hover); }
</style>
