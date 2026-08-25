# Custom invoice templates

Paste a complete HTML document into the Invoice Design settings. CSS should be inline or inside a `<style>` element. Values are HTML-escaped before insertion.

Supported values:

- `{{org.name}}`, `{{org.logo_url}}`, `{{org.address}}`
- `{{invoice.number}}`, `{{invoice.issue_date}}`, `{{invoice.due_date}}`, `{{invoice.notes}}`
- `{{client.name}}`, `{{client.company_name}}`, `{{client.email}}`
- `{{totals.subtotal}}`, `{{totals.tax}}`, `{{totals.discount}}`, `{{totals.grand_total}}`

Render line items with `{{#each items}} ... {{/each}}`. Within the block use `{{description}}`, `{{quantity}}`, `{{unit_price}}`, and `{{total}}`.

For security, `<script>` tags and inline event handlers such as `onload` and `onerror` are rejected.
