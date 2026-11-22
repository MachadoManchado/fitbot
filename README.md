# Fitness: treino e dieta

App pessoal de celular (PWA) para registrar treinos, dieta por opções, água, peso e metas, com um robô-guia em pixel art.
Os dados ficam só no aparelho (IndexedDB); não há conta nem servidor.

## Rodar no computador

```sh
npm install
npm run dev
```

## Publicar

Cada envio para a branch `main` publica o app no GitHub Pages (ver `.github/workflows/deploy.yml`).

## Créditos

- Ilustrações de exercícios: [Workout Guide](https://github.com/bryllim/workout-guide), de Bryl Lim, baseado no [Everkinetic](https://github.com/everkinetic/data). Licença CC BY-SA 4.0 (ver `public/exercises/CREDITS.md`).
- Fontes: Fixedsys Excelsior (domínio público) e Departure Mono, de Helena Zhang (SIL OFL 1.1). Licenças em `src/assets/fonts/`.
- Ícones: pixelarticons (MIT), Lucide (ISC) e Tabler Icons (MIT).
