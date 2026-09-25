---
id: TASK-1
title: 'tldv downloader: три простейшие метрики активности'
status: To Do
assignee: []
created_date: '2026-09-25 15:38'
labels:
  - side-project
  - tldv
dependencies: []
priority: low
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
README больше не обещает no tracking (2026-09-25). Релиз публикуется в Chrome Web Store автоматически (release.yml, browser-actions/release-chrome-extension, var CHROME_EXTENSION_ID задан). Добавить три простейшие анонимные метрики: ежедневный пинг со случайным install id, счётчик успешных скачиваний, опрос при удалении (setUninstallURL). Токены сейчас не тратить.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Три метрики работают и видны в одном месте
- [ ] #2 Privacy-раздел README и описание в сторе обновлены честно
<!-- AC:END -->
