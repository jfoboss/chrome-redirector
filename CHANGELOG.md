# Changelog

## [1.3.0](https://github.com/jfoboss/chrome-redirector/compare/v1.2.0...v1.3.0) (2026-09-28)


### Features

* при импорте совпадающие адреса показываются в окне с выбором, какие правила заменить; точные копии пропускаются ([#8](https://github.com/jfoboss/chrome-redirector/pull/8))
* перед системным запросом доступа Chrome расширение объясняет, к каким сайтам и зачем нужен доступ ([#8](https://github.com/jfoboss/chrome-redirector/pull/8))
* понятная подсказка «Доступ к сайту ещё не выдан» с пояснением, когда так бывает ([#8](https://github.com/jfoboss/chrome-redirector/pull/8))
* `homepage_url` — ссылка на репозиторий в `chrome://extensions` ([#5](https://github.com/jfoboss/chrome-redirector/pull/5), версия 1.2.1)

## [1.2.0](https://github.com/jfoboss/chrome-redirector/compare/v1.1.0...v1.2.0) (2026-09-27)


### Features

* правила хранятся частями: помещается ~600–700 правил вместо ~50; правила версии 1.1.0 переносятся автоматически ([#3](https://github.com/jfoboss/chrome-redirector/pull/3))
* значок «!» и подсказка во всплывающем окне, если у правил нет доступа к сайту ([#3](https://github.com/jfoboss/chrome-redirector/pull/3))
* значок «err», если Chrome не принял правила ([#3](https://github.com/jfoboss/chrome-redirector/pull/3))


### Bug Fixes

* при переполнении хранилища и больше чем 1000 правил сохранение не молчит, а объясняет, что не так ([#3](https://github.com/jfoboss/chrome-redirector/pull/3))

## [1.1.0](https://github.com/jfoboss/chrome-redirector/releases/tag/v1.1.0) (2026-09-25)


### Features

* доступ запрашивается только к сайтам из правил вместо всех сайтов ([#2](https://github.com/jfoboss/chrome-redirector/pull/2))
* интерфейс на русском и английском ([#2](https://github.com/jfoboss/chrome-redirector/pull/2))
* сборка ZIP для Chrome Web Store, материалы для магазина ([#2](https://github.com/jfoboss/chrome-redirector/pull/2))

## 1.0.0 (2026-09-25)


### Features

* список перенаправлений: точный адрес, весь сайт, «начинается с», регулярные выражения; импорт и экспорт; всплывающее окно ([#1](https://github.com/jfoboss/chrome-redirector/pull/1))
