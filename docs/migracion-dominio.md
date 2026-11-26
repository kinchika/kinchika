# Migración de kinchika.cl a GitHub Pages

Todo es gratuito: el repo es público, GitHub Pages es gratis para repos públicos
y el DNS sigue en Ecohosting (servicio "Hosting Gratis ONG").

## Cómo se publica el sitio

- El repo es de la organización **kinchika** (github.com/kinchika/kinchika), no de una
  cuenta personal. Para repos públicos, GitHub Actions y Pages son gratis.
- Cada push a `main` ejecuta `.github/workflows/deploy.yml`, que compila con
  `npm run build` y publica `dist/`.
- Settings → Pages → Source = **GitHub Actions**. El dominio personalizado
  (`www.kinchika.cl`) se configura en esa misma página.
- `public/CNAME` no se usa con Actions; queda por si algún día se vuelve a publicar
  desde la rama `gh-pages` (Source = Deploy from a branch).
- El dominio se verifica en la organización: github.com/organizations/kinchika/settings/pages.

## Respaldo del DNS antes del cambio (consultado el 2026-11-26)

| Nombre | Tipo | Valor | TTL |
|---|---|---|---|
| kinchika.cl | NS | dns1/dns2/dns3.ecohosting.cl | 21600 |
| kinchika.cl | A | 192.140.58.200 | 14400 |
| kinchika.cl | A | 216.239.34.21 | 14400 |
| kinchika.cl | A | 216.239.36.21 | 14400 |
| kinchika.cl | A | 216.239.38.21 | 14400 |
| kinchika.kinchika.cl | A | 216.239.32.21 (error de tipeo) | 14400 |
| www.kinchika.cl | CNAME | ghs.googlehosted.com | 14400 |
| mail.kinchika.cl | CNAME | kinchika.cl | 14400 |
| kinchika.cl | MX | 1 smtp.google.com | 14400 |
| kinchika.cl | TXT | v=spf1 +a +mx +ip4:192.140.58.200 ~all | 14400 |
| kinchika.cl | TXT | google-site-verification (2 registros) | 14400 |
| _dmarc.kinchika.cl | TXT | v=DMARC1; p=none; | 14400 |
| kinchika.cl | CAA | (no hay) | — |
| kinchika.cl | AAAA | (no hay) | — |

## DNS final esperado

| Nombre | Tipo | Valor |
|---|---|---|
| kinchika.cl | A | 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 |
| kinchika.cl | AAAA | 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153 |
| www.kinchika.cl | CNAME | kinchika.github.io |
| mail.kinchika.cl | A | 192.140.58.200 |
| _github-pages-challenge-kinchika.kinchika.cl | TXT | (código de verificación de GitHub) |
| kinchika.cl | TXT | v=spf1 include:_spf.google.com ip4:192.140.58.200 ~all |

Sin cambios: MX, google-site-verification, _dmarc, default._domainkey, SRV,
_acme-challenge, y los subdominios de cPanel (ftp, webmail, webdisk, whm, autodiscover,
autoconfig, cpcontacts, cpcalendars).

## Reversión

En el Zone Editor de Ecohosting:
1. Borrar los A/AAAA de GitHub en `kinchika.cl`.
2. Volver a crear los A de `kinchika.cl`: 192.140.58.200, 216.239.34.21, 216.239.36.21, 216.239.38.21.
3. CNAME `www.kinchika.cl` → `ghs.googlehosted.com`.
4. Si se quitó el dominio en Google Sites, volver a agregarlo ahí.
