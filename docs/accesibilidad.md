# Accesibilidad — Borde. Relatos al Margen

Objetivo: **WCAG 2.2 nivel AA**, con prioridad en personas ciegas que usan lector de pantalla.

> Documento en construcción. La checklist manual completa (NVDA, JAWS, VoiceOver, TalkBack)
> se redacta en la **Fase 5**. Acá se registran desde ya las decisiones tomadas.

## Decisiones registradas

| Fase | Decisión | Motivo |
| ---- | -------- | ------ |
| 1 | `<html lang="es">` | Los lectores de pantalla eligen voz y reglas de pronunciación según el idioma. |
| 1 | Viewport sin `maximum-scale` ni `user-scalable=no` | El zoom nunca se bloquea (WCAG 1.4.4). |
| 1 | `<meta name="color-scheme" content="light dark">` | Base para respetar `prefers-color-scheme`. |
| 1 | `eslint-plugin-jsx-a11y` en modo **strict** | Los problemas de accesibilidad detectables estáticamente son errores, no advertencias. |
| 1 | Mensajes de estado con `role="status"` | Región viva nativa (`aria-live="polite"`), sin ARIA extra. |
