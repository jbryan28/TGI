# TGI COT Dashboard

The public dashboard is a static client over a normalized snapshot generated from the official CFTC Public Reporting Environment.

## Update the data

```sh
npm run update:cot
npm run check
```

The scheduled `cot-data.yml` workflow runs after the normal Friday COT release and commits a validated snapshot to `cot/data/cot.json`.

## Data sources

- Traders in Financial Futures — Futures Only: `gpe5-46if`
- Disaggregated — Futures Only: `72hh-3qpy`

Financial contracts default to Leveraged Funds. Physical commodities default to Managed Money. The interface allows readers to inspect the other participant categories included in the normalized data.

## Membership boundary

The public dashboard must not contain proprietary TGI classifications or member commentary. The future member application will consume the same normalized records through a protected backend and add:

- positioning momentum;
- institutional divergence;
- DZC alignment;
- Authorized / Monitor / Wait classifications; and
- weekly TGI commentary.

GitHub Pages is not an authentication boundary. The member application must be deployed behind server-side access control and verified against active Thinkific enrollment.
