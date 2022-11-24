[web]: https://packs.macarena.ceo

# Modpack CLI

## Usage

Update assets & pages on the [Web Index][web]

```sh
pack web --web-token *******
```

Create a release [Web Index][web]

```sh
pack web
  --web-token ******* \
  --version 1.0.0 \
  --author me \
  --changelog "Initial Release" \
```

Create a release [Web Index][web] & Curseforge

```sh
pack web curseforge
  --web-token ******* \
  --version 1.1.0 \
  --author me \
  --changelog "Minor Patches" \
  --curseforge-token ******* \
  --curseforge-project 123456 \
```
