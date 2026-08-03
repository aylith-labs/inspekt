<script lang="ts">
  import '../app.css';
  import Footer from '$lib/components/layout/Footer.svelte';
  import Navbar from '$lib/components/layout/Navbar.svelte';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="flex min-h-screen flex-col">
  <Navbar />

  <main class="flex-1">
    {@render children()}
  </main>

  <Footer />
</div>
