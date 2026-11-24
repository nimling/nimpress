<script lang="ts">
  import { version } from '../../package.json'
  import logo from '../../assets/logo.svg?url'

  const year = new Date().getFullYear()
</script>

<footer class="np-api-footer">
  <a class="np-api-footer-brand" href="https://nimling.github.io/nimpress" target="_blank" rel="noopener">
    <img class="np-api-footer-logo" src={logo} alt="nimpress" />
    <span class="np-api-footer-version">v{version}</span>
  </a>
  <span class="np-api-footer-copyright">© {year} Nimling</span>
  <span class="np-api-footer-love">Made with ♥</span>
</footer>

<style>
  .np-api-footer {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px 32px 32px;
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px 20px;
    border-top: 1px solid var(--np-divider);
    color: var(--np-text-faint);
    font-size: 12px;
  }
  .np-api-footer-brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: inherit;
    text-decoration: none;
  }
  .np-api-footer-brand:hover {
    color: var(--np-text-secondary);
  }
  .np-api-footer-logo {
    display: block;
    height: 18px;
    width: auto;
  }
  .np-api-footer-version {
    font-family: var(--np-font-mono);
  }
</style>
