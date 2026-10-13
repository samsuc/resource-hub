# resource-hub

Static GitHub Pages site for SAMSUC Resource Hub.

- Live site: https://samsuc.github.io/resource-hub/
- Product API (current published inventory): https://samsuc-products.samsuc34.workers.dev/
- Checkout: Gumroad (`https://samsuchub.gumroad.com/l/...`)

`js/samsuc-catalog.js` loads that API with an 8 second timeout. If the request fails, times out, or returns an unexpected shape, the homepage and collection use a saved recovery list. That list is not live inventory.

There is no build step. Push to `main` to publish on GitHub Pages.
