# RSS-источники новостей

Документация RSS-источников для агрегатора новостей. Здесь хранится информация о доступных источниках, их настройках и фильтрах для последующей интеграции.

---

## Ивановские новостные источники

### 1. IvanovoNews (ИвановоНьюс)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | IvanovoNews |
| **URL RSS** | `https://ivanovonews.ru/rss.php` |
| **Тип** | RSS 2.0 |
| **Сайт** | https://ivanovonews.ru |
| **Регион** | Иваново |
| **Статус** | Активен |
| **Обновление** | Каждые 60 минут (TTL) |

**Описание:**
Крупнейший информационный портал г. Иваново. Публикует новости региона, интервью, репортажи, телепередачи.

**Параметры (params):**
```json
{
  "region": "Иваново",
  "city": "Иваново",
  "language": "ru",
  "encoding": "UTF-8",
  "supportsTurbo": true,
  "supportsYandexNews": true
}
```

**Категории контента:**
- Интервью
- Телепередачи
- Репортажи
- Новости дня
- Спорт
- Культура
- Общество
- Политика

**Фильтры (рекомендуемые):**
```json
[
  {
    "type": "INCLUDE",
    "field": "category",
    "operator": "contains",
    "value": "Интервью",
    "isActive": true
  },
  {
    "type": "INCLUDE",
    "field": "category",
    "operator": "contains",
    "value": "Репортажи",
    "isActive": true
  },
  {
    "type": "INCLUDE",
    "field": "category",
    "operator": "contains",
    "value": "Новости",
    "isActive": true
  },
  {
    "type": "EXCLUDE",
    "field": "category",
    "operator": "contains",
    "value": "Телепередачи",
    "isActive": false
  }
]
```

**Особенности парсинга:**
- Формат: RSS 2.0 с namespace Яндекса (`xmlns:yandex`)
- Поддерживает турбо-контент (`turbo="true"`)
- Полный текст доступен в `<yandex:full-text>`
- Дата публикации: `<pubDate>` (формат RFC 822)
- Категории: `<category>`
- Изображения: `<yandex:logo>`, внутри CDATA turbo-контента
- Ссылки: относительные пути с `https://www.ivanovonews.ru`

**Структура item:**
```xml
<item turbo="true">
  <title>Заголовок новости</title>
  <link>https://www.ivanovonews.ru/category/id/</link>
  <description>Краткое описание</description>
  <category>Категория</category>
  <yandex:full-text>Полный текст статьи</yandex:full-text>
  <turbo:content><![CDATA[...]]></turbo:content>
  <pubDate>Wed, 18 Mar 2026 21:30:00 +0300</pubDate>
</item>
```

**Примечания:**
- Сайт требует согласия с cookie (заголовок `Cookie` может понадобиться для curl)
- RSS доступен без авторизации
- Последнее обновление ленты: 18 марта 2026

---

### 2. NEWSIVANOVO.RU (Ивановские новости)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | NEWSIVANOVO.RU |
| **URL RSS** | RSS-лента **отсутствует** |
| **Альтернатива** | `https://newsivanovo.ru/sitemap.xml` |
| **Тип** | Sitemap XML (для парсинга) |
| **Сайт** | https://newsivanovo.ru |
| **Регион** | Иваново |
| **Статус** | Требуется реализация парсера sitemap |

**Описание:**
Крупный информационный портал Ивановской области. Публикует новости политики, общества, спорта, экономики, ЖКХ, происшествий и СВО.

**Параметры (params):**
```json
{
  "region": "Иваново",
  "city": "Иваново",
  "language": "ru",
  "encoding": "UTF-8",
  "parserType": "sitemap",
  "sitemapUrl": "https://newsivanovo.ru/sitemap.xml"
}
```

**Категории контента:**
- 100 самых влиятельных людей
- События недели
- Интервью
- Аналитика
- СВО
- Афиша
- Вакансии
- Общество
- Спорт
- Экология
- Культура
- Происшествия
- Здоровье
- Бизнес
- Экономика
- Подкасты
- Новости компаний
- Память (некрологи)
- ЖКХ
- Расследования
- Политика

**Структура sitemap:**
```xml
<urlset count="350">
  <url>
    <loc>https://newsivanovo.ru/fn_1824542.html</loc>
    <lastmod>2026-03-18 22:00:00</lastmod>
    <changefreq>always</changefreq>
    <priority>0.5</priority>
  </url>
  ...
</urlset>
```

**Особенности парсинга:**
- Паттерн URL новостей: `https://newsivanovo.ru/fn_{id}.html`
- Дата публикации: `<lastmod>` (формат: `YYYY-MM-DD HH:MM:SS`)
- Sitemap содержит ~350 последних новостей
- Обновление: постоянное (`changefreq: always`)

**Рекомендации по интеграции:**
Так как RSS отсутствует, для получения новостей необходимо:
1. Периодически запрашивать `https://newsivanovo.ru/sitemap.xml`
2. Извлекать URL новостей из `<loc>`
3. Для каждого URL парсить HTML-страницу:
   - Заголовок: `<h1>` или `<title>`
   - Контент: `.detale-news-block__text`
   - Дата: из `<lastmod>` или со страницы
   - Категория: из URL категории или breadcrumbs

**Пример парсинга страницы:**
```bash
# Получить sitemap
curl -s "https://newsivanovo.ru/sitemap.xml"

# Получить конкретную новость
curl -s "https://newsivanovo.ru/fn_1824542.html"
```

**Примечания:**
- RSS-лента **не предоставляется**
- Для парсинга требуется реализация HTML-парсера
- Сайт использует защиту от ботов (возможно потребуется обход)
- Мобильная версия: `https://m.newsivanovo.ru/`

---

### 3. i3vestno.ru (Известно.ру)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | Известно.ру |
| **URL RSS** | RSS-лента **отсутствует** |
| **Альтернатива** | `https://i3vestno.ru/sitemap.xml` |
| **Тип** | Sitemap XML (для парсинга) |
| **Сайт** | https://i3vestno.ru |
| **Регион** | Иваново |
| **Статус** | Требуется реализация парсера sitemap |

**Описание:**
Новостной портал Ивановской области. Публикует свежие новости, главные темы дня в политике, экономике, бизнесе и жизни.

**Параметры (params):**
```json
{
  "region": "Иваново",
  "city": "Иваново",
  "language": "ru",
  "encoding": "UTF-8",
  "parserType": "sitemap",
  "sitemapUrl": "https://i3vestno.ru/sitemap.xml"
}
```

**Категории контента (по URL):**
| Паттерн URL | Категория |
|-------------|-----------|
| `/news/...` | Новости |
| `/article/...` | Статьи |
| `/interviews/...` | Интервью |
| `/videos/...` | Видео |
| `/photos/...` | Фото |
| `/posters/...` | Афиша |
| `/companynews/...` | Новости партнёров |
| `/special_projects/...` | Спецпроекты |

**Структура sitemap:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://i3vestno.ru/news/2026/03/18/ivanovcy_provodili_v_posledniy_put_boycov...</loc>
  </url>
  ...
</urlset>
```

**Особенности парсинга:**
- Паттерн URL новостей: `https://i3vestno.ru/{category}/{year}/{month}/{day}/{slug}`
- Примеры категорий в URL: `news`, `article`, `poster`, `companynews`
- Sitemap содержит URL всех материалов
- Дата в URL: `/{year}/{month}/{day}/`
- Структура сайта чистая, удобная для парсинга

**Рекомендации по интеграции:**
1. Загружать `https://i3vestno.ru/sitemap.xml`
2. Извлекать URL из `<loc>`
3. Фильтровать по категориям (news, article, interviews)
4. Для каждого URL парсить HTML:
   - Заголовок: `<h1>` или `<title>`
   - Контент: основной блок контента
   - Дата: из URL или со страницы
   - Категория: из первого сегмента URL

**Пример парсинга:**
```bash
# Получить sitemap
curl -s "https://i3vestno.ru/sitemap.xml"

# Получить конкретную новость
curl -s "https://i3vestno.ru/news/2026/03/18/ivanovcy_provodili_v_posledniy_put_boycov_ivana_bobkova_i_ilyu_ponomareva"
```

**Примечания:**
- RSS-лента **не предоставляется**
- Возрастной рейтинг: 18+
- Телефон редакции: +7 (4932) 41-94-81
- Email: info@i3vestno.ru

---

### 4. 168.ru (168 часов)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | 168 часов |
| **URL RSS** | `https://168.ru/feed` или `https://168.ru/rss` |
| **Тип** | RSS 2.0 (WordPress) |
| **Сайт** | https://168.ru |
| **Регион** | Кинешма, Ивановская область |
| **Статус** | Активен |
| **Обновление** | Ежечасно (hourly) |

**Описание:**
Кинешемский городской новостной ресурс «168 часов». Лента новостей города Кинешма и Кинешемского района Ивановской области.

**Параметры (params):**
```json
{
  "region": "Ивановская область",
  "city": "Кинешма",
  "language": "ru",
  "encoding": "UTF-8",
  "platform": "wordpress",
  "wordpressVersion": "6.2.4"
}
```

**Категории контента:**
- Без рубрики
- Новости
- Общество
- Происшествия
- Культура
- Спорт
- Экономика
- Политика

**Фильтры (рекомендуемые):**
```json
[
  {
    "type": "EXCLUDE",
    "field": "category",
    "operator": "equals",
    "value": "Без рубрики",
    "isActive": true
  }
]
```

**Особенности парсинга:**
- Формат: Стандартный WordPress RSS 2.0
- Полный контент доступен в `<content:encoded>`
- Дата публикации: `<pubDate>` (RFC 822)
- Автор: `<dc:creator>`
- Категории: `<category>`
- Комментарии: `<comments>`
- GUID: `<guid>`
- Изображение канала: `<image>`
- Кодировка: UTF-8
- Пространства имен: content, dc, atom, sy, slash

**Структура item:**
```xml
<item>
  <title>Заголовок новости</title>
  <link>https://168.ru/...</link>
  <comments>https://168.ru/...#respond</comments>
  <dc:creator><![CDATA[Автор]]></dc:creator>
  <pubDate>Fri, 12 Dec 2025 13:59:00 +0000</pubDate>
  <category><![CDATA[Категория]]></category>
  <guid isPermaLink="false">https://168.ru/?p=185556</guid>
  <description><![CDATA[Краткое описание]]></description>
  <content:encoded><![CDATA[Полный текст статьи...]]></content:encoded>
</item>
```

**Примечания:**
- WordPress сайт (версия 6.2.4)
- RSS доступен без авторизации
- Поддерживает стандартные WordPress фиды
- Последнее обновление ленты: декабрь 2025

---

### 5. ivanovolive.ru (ИВАНОВОLIVE)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | ИВАНОВОLIVE |
| **URL RSS** | `https://ivanovolive.ru/feed` или `https://ivanovolive.ru/rss` |
| **Тип** | RSS 2.0 (самописная CMS) |
| **Сайт** | https://ivanovolive.ru |
| **Регион** | Иваново |
| **Статус** | Активен |
| **Обновление** | Ежедневно |

**Описание:**
Главные общественно-политические и экономические новости Ивановской области, аналитика и комментарии. Авторский проект Михаила Мокрецова.

**Параметры (params):**
```json
{
  "region": "Иваново",
  "city": "Иваново",
  "language": "ru",
  "encoding": "UTF-8",
  "platform": "custom",
  "author": "Михаил Мокрецов"
}
```

**Категории контента:**
- Политика
- Экономика
- Общество
- Бизнес
- Аналитика
- Комментарии

**Фильтры (рекомендуемые):**
```json
[
  {
    "type": "INCLUDE",
    "field": "author",
    "operator": "equals",
    "value": "Михаил Мокрецов",
    "isActive": false
  }
]
```

**Особенности парсинга:**
- Формат: RSS 2.0 с namespace: content, dc, media, atom, georss
- Полный контент доступен в `<content:encoded>`
- Дата публикации: `<pubDate>` (RFC 822)
- Автор: `<author>`
- GUID: `<guid>`
- Кодировка: UTF-8
- URL новостей: `https://ivanovolive.ru/news/{id}`

**Структура item:**
```xml
<item>
  <title>Заголовок новости</title>
  <link>https://ivanovolive.ru/news/23922</link>
  <pubDate>Wed, 18 Mar 2026 17:03:57 </pubDate>
  <author>Михаил Мокрецов</author>
  <guid isPermaLink="false">https://ivanovolive.ru/?p=23922</guid>
  <description><![CDATA[Краткое описание...]]></description>
  <content:encoded>Полный текст статьи...</content:encoded>
</item>
```

**Социальные сети:**
- Telegram: https://t.me/ivanovolive_ru
- VK: https://vk.com/ivanovolive

**Примечания:**
- Авторский проект с уникальной аналитикой
- RSS доступен без авторизации
- Есть sitemap.xml
- Использует самописную CMS (не WordPress)
- Последнее обновление: 18 марта 2026

---

### 6. mkivanovo.ru (МК в Иваново)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | МК в Иваново |
| **URL RSS** | RSS-лента **отсутствует** |
| **Альтернатива** | HTML-парсинг |
| **Тип** | HTML (требует парсинга) |
| **Сайт** | https://www.mkivanovo.ru |
| **Регион** | Иваново |
| **Статус** | Требуется реализация HTML-парсера |

**Описание:**
Московский Комсомолец в Иваново - федеральное издание с региональным представительством. Публикует местные и федеральные новости, статьи, обзоры, видео.

**Параметры (params):**
```json
{
  "region": "Иваново",
  "city": "Иваново",
  "language": "ru",
  "encoding": "UTF-8",
  "platform": "mk_ru_cms",
  "parent": "Московский Комсомолец"
}
```

**Категории контента (по URL):**
| Паттерн URL | Категория |
|-------------|-----------|
| `/social/` | Общество |
| `/politics/` | Политика |
| `/incident/` | Происшествия |
| `/economics/` | Экономика |
| `/culture/` | Культура |
| `/sport/` | Спорт |

**Особенности парсинга:**
- RSS-лента **не предоставляется**
- Sitemap **не обнаружен**
- Для получения новостей требуется HTML-парсинг
- URL новостей: `https://www.mkivanovo.ru/{category}/{year}/{month}/{day}/{slug}.html`
- Структура сайта: собственная CMS (на базе mk.ru)

**Рекомендации по интеграции:**
1. Загружать главную страницу `https://www.mkivanovo.ru/`
2. Извлекать ссылки на новости из блоков `.article-preview` или подобных
3. Для каждой новости парсить HTML-страницу:
   - Заголовок: `<h1>` или `<meta property="og:title">`
   - Контент: основной блок статьи
   - Дата: из URL или `<meta property="article:published_time">`
   - Категория: из URL

**Пример парсинга:**
```bash
# Получить главную страницу
curl -s "https://www.mkivanovo.ru/"

# Получить конкретную новость
curl -s "https://www.mkivanovo.ru/social/2023/07/05/sila-ssylochnoy-massy.html"
```

**Примечания:**
- RSS-лента **не предоставляется**
- Sitemap **не обнаружен**
- Филиал федерального издания "Московский Комсомолец"
- Для парсинга требуется реализация HTML-парсера
- Сайт может иметь защиту от ботов

---

### 7. kineshemec.ru (Кинешемец.RU)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | Кинешемец.RU |
| **URL RSS** | RSS-лента **отсутствует** |
| **Альтернатива** | Sitemap (частично работает) / HTML-парсинг |
| **Тип** | HTML (требует парсинга) |
| **Сайт** | https://kineshemec.ru |
| **Регион** | Кинешма, Ивановская область |
| **Статус** | Требуется реализация HTML-парсера |

**Описание:**
Популярный кинешемский городской сайт. Публикует новости, видео, статьи на злободневные темы Кинешмы и Ивановской области.

**Параметры (params):**
```json
{
  "region": "Ивановская область",
  "city": "Кинешма",
  "language": "ru",
  "encoding": "UTF-8",
  "platform": "custom_cms",
  "hasVideo": true
}
```

**Категории контента (по URL):**
| Паттерн URL | Категория |
|-------------|-----------|
| `/news/` | Новости |
| `/afisha/` | Афиша |
| `/board/` | Объявления |
| `/auto/` | Авто |
| `/realty/` | Недвижимость |
| `/job/` | Работа |

**Особенности парсинга:**
- RSS-лента **не предоставляется** (ссылки `/rss`, `/feed` редиректят на главную)
- Sitemap index существует: `https://kineshemec.ru/sitemap.xml`
- Отдельные sitemaps (news, afisha, board и др.) в формате `.xml.gz`
- URL новостей: `https://kineshemec.ru/news/{id}-{slug}.html` или похожий формат
- Структура сайта: самописная CMS

**Рекомендации по интеграции:**
1. Загружать главную страницу `https://kineshemec.ru/`
2. Извлекать ссылки на новости из блоков новостей
3. Альтернатива: попробовать распаковать и парсить `.xml.gz` sitemaps:
   - `https://kineshemec.ru/xml/news/sitemap_items.xml.gz`
4. Для каждой новости парсить HTML-страницу:
   - Заголовок: `<h1>` или `<title>`
   - Контент: основной блок статьи
   - Дата: со страницы или из структуры URL
   - Категория: из URL

**Пример парсинга:**
```bash
# Получить главную страницу
curl -s "https://kineshemec.ru/"

# Получить sitemap index
curl -s "https://kineshemec.ru/sitemap.xml"

# Попробовать получить news sitemap (gzip)
curl -s "https://kineshemec.ru/xml/news/sitemap_items.xml.gz" | gunzip -c
```

**Социальные сети:**
- VK: https://vk.com/kineshemec_gzt
- Odnoklassniki: https://ok.ru/kinru
- YouTube: https://www.youtube.com/user/KineshemecRU

**Примечания:**
- RSS-лента **не предоставляется**
- Sitemap index существует, но отдельные sitemaps могут быть недоступны
- Популярный городской портал Кинешмы
- Для парсинга требуется реализация HTML-парсера
- Сайт использует рекламные сети (Yandex.RTB, AdSense)

---

### 8. kstati.news (Кстати.NEWS)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | Кстати.NEWS |
| **URL RSS** | `https://kstati.news/rss_news.php` или `https://kstati.news/rss_mainnews.php` |
| **Тип** | RSS 2.0 (1С-Битрикс) |
| **Сайт** | https://kstati.news |
| **Регион** | Иваново |
| **Статус** | Активен |
| **Обновление** | Каждые 60 минут (TTL) |

**Описание:**
Главный информационный портал Ивановской области. Новости, события, происшествия, криминал и новости компаний.

**Параметры (params):**
```json
{
  "region": "Иваново",
  "city": "Иваново",
  "language": "ru",
  "encoding": "windows-1251",
  "platform": "bitrix",
  "feeds": {
    "main": "https://kstati.news/rss_mainnews.php",
    "all": "https://kstati.news/rss_news.php"
  }
}
```

**RSS-ленты:**
| Лента | URL | Описание |
|-------|-----|----------|
| Главные новости | `https://kstati.news/rss_mainnews.php` | Только главные новости |
| Все новости | `https://kstati.news/rss_news.php` | Полная лента новостей |

**Категории контента:**
- Общество
- Происшествия
- Криминал
- Политика
- Экономика
- Культура
- Спорт
- Новости компаний

**Фильтры (рекомендуемые):**
```json
[
  {
    "type": "INCLUDE",
    "field": "category",
    "operator": "contains",
    "value": "Общество",
    "isActive": true
  },
  {
    "type": "INCLUDE",
    "field": "category",
    "operator": "contains",
    "value": "Политика",
    "isActive": true
  },
  {
    "type": "INCLUDE",
    "field": "category",
    "operator": "contains",
    "value": "Экономика",
    "isActive": true
  }
]
```

**Особенности парсинга:**
- Формат: RSS 2.0 с namespace Яндекса (`xmlns:yandex`)
- Кодировка: **Windows-1251** (требует перекодировки!)
- Полный контент в `<description>` (HTML)
- Дата публикации: `<pubDate>` (RFC 822)
- Категории: `<category>`
- Изображения: `<enclosure>` (type="image/jpeg")
- Логотип: `<yandex:logo>`
- URL новостей: `https://kstati.news/news/{category}/{slug}/`

**Структура item:**
```xml
<item>
  <title>Заголовок новости</title>
  <link>https://kstati.news/news/society/...</link>
  <description>Описание новости...</description>
  <enclosure url="https://kstati.news/upload/..." length="302612" type="image/jpeg"/>
  <category>Общество</category>
  <pubDate>Wed, 18 Mar 2026 15:30:25 +0300</pubDate>
</item>
```

**Социальные сети:**
- Telegram: https://t.me/kstati37
- VK: https://vk.com/kstati.news
- Twitter: https://twitter.com/Kstati_news

**Примечания:**
- Сайт на 1С-Битрикс
- Кодировка Windows-1251 - требует конвертации в UTF-8
- RSS доступен без авторизации
- Поддерживает Яндекс.Новости
- Последнее обновление: 18 марта 2026

---

### 7. ivteleradio.ru (ГТРК «Ивтелерадио»)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | ГТРК «Ивтелерадио» |
| **URL RSS** | `https://ivteleradio.ru/rss` |
| **Тип** | RSS 2.0 (Яндекс + Media RSS) |
| **Сайт** | https://ivteleradio.ru |
| **Регион** | Иваново |
| **Статус** | Активен |
| **Владелец** | Филиал ВГТРК |

**Описание:**
Государственная телевизионная и радиовещательная компания «Ивтелерадио». Новости, сюжеты, телепередачи города Иваново и области. Официальный филиал ВГТРК.

**Параметры (params):**
```json
{
  "region": "Иваново",
  "city": "Иваново",
  "language": "ru",
  "encoding": "UTF-8",
  "platform": "vgt",
  "owner": "ВГТРК",
  "hasVideo": true
}
```

**Категории контента (по URL):**
| Паттерн URL | Категория |
|-------------|-----------|
| `/vesti/...` | Вести-Иваново |
| `/russia24/...` | Вести 24 |
| `/news/...` | Новости |
| `/society/...` | Общество |
| `/culture/...` | Культура |
| `/sport/...` | Спорт |
| `/economy/...` | Экономика |

**Фильтры (рекомендуемые):**
```json
[
  {
    "type": "INCLUDE",
    "field": "category",
    "operator": "contains",
    "value": "Вести",
    "isActive": true
  },
  {
    "type": "INCLUDE",
    "field": "category",
    "operator": "contains",
    "value": "новости",
    "isActive": true
  }
]
```

**Особенности парсинга:**
- Формат: RSS 2.0 с namespace Яндекса (`xmlns:yandex`) и Media RSS (`xmlns:media`)
- Кодировка: UTF-8
- Полный текст в `<yandex:full-text>`
- Видео: `<enclosure type="video">` и `<media:group>`
- Изображения: `<enclosure type="image/jpeg">`
- Дата публикации: `<pubDate>` (RFC 822)
- PDA-ссылка: `<pdalink>`
- Логотип: `<yandex:logo>` (нормальный и квадратный)
- URL новостей: `https://ivteleradio.ru/{category}/{year}/{month}/{day}/{slug}`

**Структура item:**
```xml
<item>
  <title>Вести-Иваново. 21:10</title>
  <link>https://ivteleradio.ru/vesti/2026/03/18/vesti_ivanovo_21_10</link>
  <pdalink>https://ivteleradio.ru/vesti/2026/03/18/vesti_ivanovo_21_10</pdalink>
  <description></description>
  <pubDate>Wed, 18 Mar 2026 22:00:00 +0300</pubDate>
  <yandex:full-text>Полный текст статьи...</yandex:full-text>
  <enclosure type="image/jpeg" url="https://ivteleradio.ru/images/..." />
  <enclosure type="video" url="//vk.com/video_ext.php?..." />
  <media:group>
    <media:player url="//vk.com/video_ext.php?..." />
    <media:thumbnail url="https://ivteleradio.ru/images/..." />
  </media:group>
</item>
```

**Социальные сети:**
- VK: https://vk.com/ivteleradio
- Telegram: https://t.me/ivteleradio
- Odnoklassniki: https://ok.ru/ivteleradio
- MAX: https://web.max.ru/-69535881639213

**Контакты:**
- Телефон: +7 (4932) 93-69-00
- Email: vesti@ivtele.ru

**Примечания:**
- Официальный филиал ВГТРК
- Поддерживает видео-контент (VK Video)
- RSS доступен без авторизации
- Кодировка UTF-8
- Последнее обновление: 18 марта 2026

---

### 8. news1ivanovo.ru (NEWS1 Иваново)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | NEWS1 Иваново |
| **URL RSS** | `https://news1ivanovo.ru/rss` |
| **Тип** | RSS 2.0 |
| **Сайт** | https://news1ivanovo.ru |
| **Регион** | Иваново |
| **Статус** | Активен |

**Описание:**
Новости Иваново и области. Новости политики, спорта, экономики, общества, науки, бизнеса, ЖКХ и других сфер.

**Параметры (params):**
```json
{
  "region": "Иваново",
  "city": "Иваново",
  "language": "ru",
  "encoding": "UTF-8",
  "platform": "custom"
}
```

**Категории контента (по URL):**
| Паттерн URL | Категория |
|-------------|-----------|
| `/obschestvo/` | Общество |
| `/politika/` | Политика |
| `/ekonomika/` | Экономика |
| `/sport/` | Спорт |
| `/kultura/` | Культура |
| `/proisshestviya/` | Происшествия |
| `/v-mire/` | В мире |

**Особенности парсинга:**
- Формат: RSS 2.0
- Кодировка: UTF-8
- Изображения: `<enclosure type="image/webp">`
- Дата публикации: `<pubDate>` (RFC 822)
- Автор: не указан
- URL новостей: `https://news1ivanovo.ru/{category}/{slug}`

**Структура item:**
```xml
<item>
  <title>В Иванове общественники призвали бороться с демонами</title>
  <link>https://news1ivanovo.ru/obschestvo/v-ivanove-obschestvenniki-prizvali-borotsya-s-demonami</link>
  <description>Прошел форум Всемирного русского народного собора...</description>
  <enclosure url="https://news1ivanovo.ru/storage/...webp" type="image/webp"></enclosure>
  <pubDate>Wed, 18 Mar 2026 17:42:57 +0300</pubDate>
  <guid isPermaLink="true">https://news1ivanovo.ru/...</guid>
</item>
```

**Примечания:**
- RSS доступен без авторизации
- Кодировка UTF-8
- Последнее обновление: 18 марта 2026

---

### 9. ivanovo.aif.ru (АиФ-Иваново)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | Аргументы и Факты - Иваново |
| **URL RSS** | `https://ivanovo.aif.ru/rss/googlearticles` или `https://ivanovo.aif.ru/rss/googlenews` |
| **Тип** | RSS 2.0 (AIF Engine) |
| **Сайт** | https://ivanovo.aif.ru |
| **Регион** | Иваново |
| **Статус** | Активен |

**Описание:**
Аргументы и Факты в Иванове: главные события дня Иваново и Ивановской области, последние новости, картина сегодняшнего дня.

**Параметры (params):**
```json
{
  "region": "Иваново",
  "city": "Иваново",
  "language": "ru",
  "encoding": "UTF-8",
  "platform": "aif_engine",
  "parent": "Аргументы и Факты"
}
```

**RSS-ленты:**
| Лента | URL |
|-------|-----|
| Google Articles | `https://ivanovo.aif.ru/rss/googlearticles` |
| Google News | `https://ivanovo.aif.ru/rss/googlenews` |

**Категории контента (по URL):**
| Паттерн URL | Категория |
|-------------|-----------|
| `/society/` | Общество |
| `/politics/` | Политика |
| `/economy/` | Экономика |
| `/sport/` | Спорт |
| `/culture/` | Культура |
| `/incidents/` | Происшествия |
| `/incidents/scene/` | Происшествия (с места событий) |
| `/incidents/fire/` | Пожары |
| `/incidents/crash/` | ДТП |

**Особенности парсинга:**
- Формат: RSS 2.0 с namespace DC
- Кодировка: UTF-8
- Автор: `<dc:creator>`
- Дата публикации: `<pubDate>` (RFC 822)
- TTL: 24 часа
- URL новостей: `https://ivanovo.aif.ru/{category}/{slug}`

**Структура item:**
```xml
<item>
  <title><![CDATA[В Ивановской области за сутки не зарегистрировано ни одного пожара]]></title>
  <link>https://ivanovo.aif.ru/society/v-ivanovskoy-oblasti-za-sutki-ne-zaregistrirovano-ni-odnogo-pozhara</link>
  <description><![CDATA[Огнеборцы благодарят жителей региона...]]></description>
  <dc:creator>Александр Мысовских</dc:creator>
  <pubDate>Wed, 18 Mar 26 19:32:05 +0300</pubDate>
</item>
```

**Примечания:**
- Филиал федерального издания "Аргументы и Факты"
- RSS доступен без авторизации
- Кодировка UTF-8
- Последнее обновление: 18 марта 2026

---

### 10. ivgazeta.ru (Ивановская газета)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | Ивановская газета |
| **URL RSS** | `http://ivgazeta.ru/rss` |
| **Тип** | RSS 2.0 (Яндекс + Turbo) |
| **Сайт** | https://ivgazeta.ru |
| **Регион** | Иваново |
| **Статус** | Активен |

**Описание:**
Ивановская областная газета. Новости, статьи, репортажи о жизни Ивановской области.

**Параметры (params):**
```json
{
  "region": "Иваново",
  "city": "Иваново",
  "language": "ru",
  "encoding": "UTF-8",
  "platform": "custom",
  "supportsTurbo": true,
  "supportsYandexNews": true
}
```

**Категории контента (по URL):**
| Паттерн URL | Категория |
|-------------|-----------|
| `/news/` | Новости |
| `/article/` | Статьи |
| `/interview/` | Интервью |
| `/report/` | Репортажи |

**Особенности парсинга:**
- Формат: RSS 2.0 с namespace Яндекса и Turbo
- Кодировка: UTF-8
- Полный текст: `<yandex:full-text>` (HTML)
- Изображения: `<enclosure type="image/jpeg">`
- Дата публикации: `<pubDate>` (RFC 822)
- PDA-ссылка: `<pdalink>`
- URL новостей: `https://ivgazeta.ru/{category}/{year}/{month}/{day}/{slug}`

**Структура item:**
```xml
<item>
  <title><![CDATA[Служить Ивановской области на федеральном уровне]]></title>
  <link>https://ivgazeta.ru/news/2026/03/18/sluzhit_ivanovskoy_oblasti_na_federalnom_urovne</link>
  <pdalink>https://ivgazeta.ru/news/2026/03/18/...</pdalink>
  <description><![CDATA[Региональное отделение «Единой России»...]]></description>
  <pubDate>Wed, 18 Mar 2026 17:11:00 +0300</pubDate>
  <yandex:full-text>Полный текст статьи...</yandex:full-text>
  <enclosure type="image/jpeg" url="https://ivgazeta.ru/images/..." />
</item>
```

**Примечания:**
- Поддерживает Яндекс.Турбо
- RSS доступен без авторизации
- Кодировка UTF-8
- Последнее обновление: 18 марта 2026

---

### 11. rk37.ru (Рабочий край)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | Рабочий край |
| **URL RSS** | `https://rk37.ru/rss` |
| **Тип** | RSS 2.0 (Яндекс) |
| **Сайт** | https://rk37.ru |
| **Регион** | Иваново |
| **Статус** | Активен |

**Описание:**
Ивановская областная газета "Рабочий край". Новости, фоторепортажи и статьи о жизни Иваново и Ивановской области.

**Параметры (params):**
```json
{
  "region": "Иваново",
  "city": "Иваново",
  "language": "ru",
  "encoding": "UTF-8",
  "platform": "custom",
  "supportsYandexNews": true
}
```

**Категории контента (по URL):**
| Паттерн URL | Категория |
|-------------|-----------|
| `/news/` | Новости |
| `/articles/` | Статьи |
| `/photo/` | Фоторепортажи |

**Особенности парсинга:**
- Формат: RSS 2.0 с namespace Яндекса
- Кодировка: UTF-8
- Полный текст: `<yandex:full-text>` (HTML)
- Изображения: `<enclosure type="image/jpeg">`
- Дата публикации: `<pubDate>` (RFC 822)
- PDA-ссылка: `<pdalink>`
- Логотип: `<yandex:logo>`
- URL новостей: `https://rk37.ru/{category}/{year}/{month}/{day}/{slug}`

**Структура item:**
```xml
<item>
  <title>Обставить «Яндекс» и вылечить образование</title>
  <link>https://rk37.ru/articles/2026/03/18/obstavit_yandeks_i_vylechit_obrazovanie</link>
  <pdalink>https://rk37.ru/articles/2026/03/18/...</pdalink>
  <description>Программный код ивановского студента...</description>
  <pubDate>Wed, 18 Mar 2026 11:17:00 +0300</pubDate>
  <yandex:full-text>Полный текст статьи...</yandex:full-text>
  <enclosure type="image/jpeg" url="https://rk37.ru/images/..." />
</item>
```

**Примечания:**
- Поддерживает Яндекс.Новости
- RSS доступен без авторизации
- Кодировка UTF-8
- Последнее обновление: 18 марта 2026

---

### 12. vladimir.tsargrad.tv (Царьград Владимир/Иваново)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | Царьград Владимир/Иваново |
| **URL RSS** | RSS-лента **отсутствует** |
| **Тип** | HTML (требует парсинга) |
| **Сайт** | https://vladimir.tsargrad.tv |
| **Регион** | Владимир/Иваново |
| **Статус** | Требуется реализация HTML-парсера |

**Описание:**
Телеканал Царьград. Новости России и мира, аналитика, расследования, эксклюзивные интервью. Политика, культура, церковь, общество, экономика.

**Параметры (params):**
```json
{
  "region": "Владимир/Иваново",
  "language": "ru",
  "encoding": "UTF-8",
  "platform": "tsargrad_tv",
  "hasVideo": true
}
```

**Особенности парсинга:**
- RSS-лента **не предоставляется**
- URL `/feed` возвращает ошибку "error"
- Для получения новостей требуется HTML-парсинг
- Сайт использует современный JavaScript-фреймворк
- URL новостей: структура неизвестна, требуется анализ

**Рекомендации по интеграции:**
1. Загружать главную страницу `https://vladimir.tsargrad.tv/`
2. Извлекать ссылки на новости из блоков
3. Для каждой новости парсить HTML-страницу
4. Альтернатива: искать API или другие endpoints

**Примечания:**
- RSS-лента **не предоставляется**
- Телеканал с федеральным охватом
- Для парсинга требуется реализация HTML-парсера
- Сайт может иметь защиту от ботов

---

### 13. mspros.ru (Местный спрос)

**Базовая информация:**
| Поле | Значение |
|------|----------|
| **Название** | Местный спрос |
| **URL RSS** | RSS-лента **пустая** |
| **Тип** | HTML (требует парсинга) |
| **Сайт** | http://www.mspros.ru |
| **Регион** | Шуя, Ивановская область |
| **Статус** | RSS пустой, требуется HTML-парсинг |

**Описание:**
Газета "Местный спрос". Новости Шуи и Шуйского района Ивановской области.

**Параметры (params):**
```json
{
  "region": "Ивановская область",
  "city": "Шуя",
  "language": "ru",
  "encoding": "UTF-8",
  "platform": "custom"
}
```

**Особенности парсинга:**
- RSS URL `/rss.php` существует, но возвращает пустой контент
- Для получения новостей требуется HTML-парсинг
- URL новостей: `http://www.mspros.ru/main` или похожий формат
- Сайт использует самописную CMS

**Рекомендации по интеграции:**
1. Загружать главную страницу `http://www.mspros.ru/`
2. Извлекать ссылки на новости из блоков
3. Для каждой новости парсить HTML-страницу

**Контакты:**
- Адрес: 155900, Ивановская область, г. Шуя, ул. Свердлова, д. 6
- Телефон: +7 (49351) 33-100
- Email: verstka@mspros.ru

**Примечания:**
- RSS-лента существует, но пустая
- Городская газета Шуи
- Для парсинга требуется реализация HTML-парсера

---

## Добавление источника в систему

Для добавления источника в админ-панели используйте следующие данные:

### IvanovoNews
**POST /api/admin/sources**
```json
{
  "url": "https://ivanovonews.ru/rss.php",
  "name": "IvanovoNews",
  "params": {
    "region": "Иваново",
    "language": "ru"
  },
  "isActive": true,
  "filters": [
    {
      "type": "INCLUDE",
      "field": "title",
      "operator": "not_contains",
      "value": "реклама"
    }
  ]
}
```

### 168 часов
**POST /api/admin/sources**
```json
{
  "url": "https://168.ru/feed",
  "name": "168 часов",
  "params": {
    "region": "Ивановская область",
    "city": "Кинешма",
    "language": "ru",
    "platform": "wordpress"
  },
  "isActive": true,
  "filters": [
    {
      "type": "EXCLUDE",
      "field": "category",
      "operator": "equals",
      "value": "Без рубрики"
    }
  ]
}
```

### ИВАНОВОLIVE
**POST /api/admin/sources**
```json
{
  "url": "https://ivanovolive.ru/feed",
  "name": "ИВАНОВОLIVE",
  "params": {
    "region": "Иваново",
    "city": "Иваново",
    "language": "ru",
    "platform": "custom",
    "author": "Михаил Мокрецов"
  },
  "isActive": true
}
```

### Кстати.NEWS
**POST /api/admin/sources**
```json
{
  "url": "https://kstati.news/rss_news.php",
  "name": "Кстати.NEWS",
  "params": {
    "region": "Иваново",
    "city": "Иваново",
    "language": "ru",
    "encoding": "windows-1251",
    "platform": "bitrix"
  },
  "isActive": true,
  "filters": [
    {
      "type": "INCLUDE",
      "field": "category",
      "operator": "contains",
      "value": "Общество"
    }
  ]
}
```

### ГТРК «Ивтелерадио»
**POST /api/admin/sources**
```json
{
  "url": "https://ivteleradio.ru/rss",
  "name": "ГТРК Ивтелерадио",
  "params": {
    "region": "Иваново",
    "city": "Иваново",
    "language": "ru",
    "encoding": "UTF-8",
    "platform": "vgt",
    "owner": "ВГТРК",
    "hasVideo": true
  },
  "isActive": true
}
```

### NEWS1 Иваново
**POST /api/admin/sources**
```json
{
  "url": "https://news1ivanovo.ru/rss",
  "name": "NEWS1 Иваново",
  "params": {
    "region": "Иваново",
    "city": "Иваново",
    "language": "ru",
    "encoding": "UTF-8",
    "platform": "custom"
  },
  "isActive": true
}
```

### АиФ-Иваново
**POST /api/admin/sources**
```json
{
  "url": "https://ivanovo.aif.ru/rss/googlearticles",
  "name": "АиФ-Иваново",
  "params": {
    "region": "Иваново",
    "city": "Иваново",
    "language": "ru",
    "encoding": "UTF-8",
    "platform": "aif_engine",
    "parent": "Аргументы и Факты"
  },
  "isActive": true
}
```

### Ивановская газета
**POST /api/admin/sources**
```json
{
  "url": "http://ivgazeta.ru/rss",
  "name": "Ивановская газета",
  "params": {
    "region": "Иваново",
    "city": "Иваново",
    "language": "ru",
    "encoding": "UTF-8",
    "platform": "custom",
    "supportsTurbo": true,
    "supportsYandexNews": true
  },
  "isActive": true
}
```

### Рабочий край
**POST /api/admin/sources**
```json
{
  "url": "https://rk37.ru/rss",
  "name": "Рабочий край",
  "params": {
    "region": "Иваново",
    "city": "Иваново",
    "language": "ru",
    "encoding": "UTF-8",
    "platform": "custom",
    "supportsYandexNews": true
  },
  "isActive": true
}
```

## Проверка источника

### IvanovoNews
```bash
# Получить RSS-ленту
curl -s "https://ivanovonews.ru/rss.php" | head -50

# Проверить валидность XML
curl -s "https://ivanovonews.ru/rss.php" | xmllint --format -

# Получить только заголовки новостей
curl -s "https://ivanovonews.ru/rss.php" | grep -oP '(?<=<title>).*?(?=</title>)'
```

### 168 часов
```bash
# Получить RSS-ленту
curl -s "https://168.ru/feed" | head -50

# Проверить валидность XML
curl -s "https://168.ru/feed" | xmllint --format -

# Получить только заголовки новостей
curl -s "https://168.ru/feed" | grep -oP '(?<=<title>).*?(?=</title>)'
```

### ИВАНОВОLIVE
```bash
# Получить RSS-ленту
curl -s "https://ivanovolive.ru/feed" | head -50

# Проверить валидность XML
curl -s "https://ivanovolive.ru/feed" | xmllint --format -

# Получить только заголовки новостей
curl -s "https://ivanovolive.ru/feed" | grep -oP '(?<=<title>).*?(?=</title>)'
```

### Кстати.NEWS
```bash
# Получить RSS-ленту (все новости)
curl -s "https://kstati.news/rss_news.php" | head -50

# Получить только главные новости
curl -s "https://kstati.news/rss_mainnews.php" | head -50

# Конвертировать из Windows-1251 в UTF-8
curl -s "https://kstati.news/rss_news.php" | iconv -f WINDOWS-1251 -t UTF-8

# Проверить валидность XML (с конвертацией)
curl -s "https://kstati.news/rss_news.php" | iconv -f WINDOWS-1251 -t UTF-8 | xmllint --format -
```

### ГТРК «Ивтелерадио»
```bash
# Получить RSS-ленту
curl -s "https://ivteleradio.ru/rss" | head -50

# Проверить валидность XML
curl -s "https://ivteleradio.ru/rss" | xmllint --format -

# Получить только заголовки новостей
curl -s "https://ivteleradio.ru/rss" | grep -oP '(?<=<title>).*?(?=</title>)'

# Получить URL видео
curl -s "https://ivteleradio.ru/rss" | grep -oP '(?<=<enclosure type="video" url=").*?(?=")'
```

### NEWS1 Иваново
```bash
# Получить RSS-ленту
curl -s "https://news1ivanovo.ru/rss" | head -50

# Проверить валидность XML
curl -s "https://news1ivanovo.ru/rss" | xmllint --format -

# Получить только заголовки новостей
curl -s "https://news1ivanovo.ru/rss" | grep -oP '(?<=<title>).*?(?=</title>)'
```

### АиФ-Иваново
```bash
# Получить RSS-ленту (Google Articles)
curl -s "https://ivanovo.aif.ru/rss/googlearticles" | head -50

# Получить RSS-ленту (Google News)
curl -s "https://ivanovo.aif.ru/rss/googlenews" | head -50

# Проверить валидность XML
curl -s "https://ivanovo.aif.ru/rss/googlearticles" | xmllint --format -
```

### Ивановская газета
```bash
# Получить RSS-ленту
curl -s "http://ivgazeta.ru/rss" | head -50

# Проверить валидность XML
curl -s "http://ivgazeta.ru/rss" | xmllint --format -

# Получить только заголовки новостей
curl -s "http://ivgazeta.ru/rss" | grep -oP '(?<=<title>).*?(?=</title>)'
```

### Рабочий край
```bash
# Получить RSS-ленту
curl -s "https://rk37.ru/rss" | head -50

# Проверить валидность XML
curl -s "https://rk37.ru/rss" | xmllint --format -

# Получить только заголовки новостей
curl -s "https://rk37.ru/rss" | grep -oP '(?<=<title>).*?(?=</title>)'
```

---

## TODO: Другие источники для добавления

### С RSS-лентой:
- [x] IvanovoNews (ivanovonews.ru) - `https://ivanovonews.ru/rss.php`
- [x] 168 часов (168.ru) - `https://168.ru/feed`
- [x] ИВАНОВОLIVE (ivanovolive.ru) - `https://ivanovolive.ru/feed`
- [x] Кстати.NEWS (kstati.news) - `https://kstati.news/rss_news.php`
- [x] ГТРК «Ивтелерадио» (ivteleradio.ru) - `https://ivteleradio.ru/rss`
- [x] NEWS1 Иваново (news1ivanovo.ru) - `https://news1ivanovo.ru/rss`
- [x] АиФ-Иваново (ivanovo.aif.ru) - `https://ivanovo.aif.ru/rss/googlearticles`
- [x] Ивановская газета (ivgazeta.ru) - `http://ivgazeta.ru/rss`
- [x] Рабочий край (rk37.ru) - `https://rk37.ru/rss`
- [ ] ГТРК "Иваново" (gtrk-ivanovo.ru) - зеркало ivteleradio.ru
- [ ] ИА "Регион 37" (region37.ru)
- [ ] Заря ТВ (zarya.tv)
- [ ] Барс ТВ (barstv.ru)
- [ ] 37.ru (37.ru)
- [ ] Ивановская правда (ivanovskayapravda.ru)

### Требуют парсинга через sitemap/HTML:
- [x] NEWSIVANOVO.RU (newsivanovo.ru) - sitemap
- [x] i3vestno.ru (Известно.ру) - sitemap
- [x] МК в Иваново (mkivanovo.ru) - HTML-парсинг (нет RSS, нет sitemap)
- [x] Кинешемец.RU (kineshemec.ru) - HTML-парсинг (нет RSS, sitemap .gz)
- [x] Царьград Владимир/Иваново (vladimir.tsargrad.tv) - HTML-парсинг (/feed = error)
- [x] Местный спрос (mspros.ru) - HTML-парсинг (RSS пустой)

---

## Технические заметки

### Общие требования к RSS-источникам

1. **Форматы:** RSS 0.9x, RSS 1.0, RSS 2.0, Atom 1.0
2. **Кодировка:** UTF-8 (предпочтительно) или Windows-1251
3. **Обязательные поля:** title, link, pubDate
4. **Желательные поля:** description, category, enclosure (для изображений)

### Сопоставление категорий

При парсинге рекомендуется сопоставлять категории источника с разделами сайта:

| Категория источника | Раздел сайта |
|---------------------|--------------|
| Интервью | Общество |
| Репортажи | Общество |
| Спорт | Спорт |
| Культура | Культура |
| Телепередачи | - (фильтровать) |

### Альтернативы RSS: Sitemap XML

Если сайт не предоставляет RSS, можно использовать `sitemap.xml`:

| Параметр | Описание |
|----------|----------|
| **URL** | `https://site.com/sitemap.xml` или `https://site.com/sitemap-news.xml` |
| **Формат** | XML с namespace `http://www.sitemaps.org/schemas/sitemap/0.9` |
| **Структура** | `<urlset>` → `<url>` → `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>` |

**Пример sitemap:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://site.com/news/fn_12345.html</loc>
    <lastmod>2026-03-18T22:00:00+03:00</lastmod>
    <changefreq>always</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
```

**Процесс парсинга через sitemap:**
1. Запросить sitemap.xml
2. Распарсить все `<loc>` (URL новостей)
3. Фильтровать URL по шаблону (например, только `/fn_*.html`)
4. Для каждого URL запросить HTML-страницу
5. Извлечь заголовок, контент, дату с помощью cheerio/css-selectors
6. Сохранить в БД

**Источники с RSS:**
| Источник | RSS URL | Тип | Регион |
|----------|---------|-----|--------|
| IvanovoNews | https://ivanovonews.ru/rss.php | RSS 2.0 (Яндекс) | Иваново |
| 168 часов | https://168.ru/feed | RSS 2.0 (WordPress) | Кинешма |
| ИВАНОВОLIVE | https://ivanovolive.ru/feed | RSS 2.0 (Custom) | Иваново |
| Кстати.NEWS | https://kstati.news/rss_news.php | RSS 2.0 (Битрикс) | Иваново |
| ГТРК «Ивтелерадио» | https://ivteleradio.ru/rss | RSS 2.0 (Яндекс+Media) | Иваново |
| NEWS1 Иваново | https://news1ivanovo.ru/rss | RSS 2.0 | Иваново |
| АиФ-Иваново | https://ivanovo.aif.ru/rss/googlearticles | RSS 2.0 (AIF) | Иваново |
| Ивановская газета | http://ivgazeta.ru/rss | RSS 2.0 (Яндекс) | Иваново |
| Рабочий край | https://rk37.ru/rss | RSS 2.0 (Яндекс) | Иваново |

**Источники с sitemap (без RSS):**
| Источник | Sitemap URL | Паттерн URL новостей |
|----------|-------------|---------------------|
| NEWSIVANOVO.RU | https://newsivanovo.ru/sitemap.xml | `/fn_{id}.html` |
| i3vestno.ru | https://i3vestno.ru/sitemap.xml | `/{category}/{year}/{month}/{day}/{slug}` |

**Источники без RSS (требуют HTML-парсинга):**
| Источник | URL | Платформа | Примечание |
|----------|-----|-----------|------------|
| МК в Иваново | https://www.mkivanovo.ru | MK.ru CMS | Нет RSS, нет sitemap |
| Кинешемец.RU | https://kineshemec.ru | Custom CMS | Нет RSS, sitemap в .gz |
| Царьград Владимир/Иваново | https://vladimir.tsargrad.tv | Tsargrad TV | Нет RSS, /feed = error |
| Местный спрос | http://www.mspros.ru | Custom CMS | RSS пустой, требуется HTML |

### Кодировки

**UTF-8 (предпочтительно):**
- IvanovoNews
- 168 часов
- ИВАНОВОLIVE
- i3vestno.ru

**Windows-1251 (требует конвертации):**
| Источник | Кодировка | Конвертация |
|----------|-----------|-------------|
| Кстати.NEWS | Windows-1251 | `iconv -f WINDOWS-1251 -t UTF-8` |

**Пример конвертации:**
```bash
# Конвертировать RSS из Windows-1251 в UTF-8
curl -s "https://kstati.news/rss_news.php" | iconv -f WINDOWS-1251 -t UTF-8

# В Node.js
const iconv = require('iconv-lite');
const response = await fetch(url);
const buffer = await response.buffer();
const xml = iconv.decode(buffer, 'win1251');
```

### Обработка ошибок

- 404 - RSS-лента недоступна или изменился URL
- 500 - Ошибка сервера источника
- Таймаут - Медленное соединение, увеличить timeout
- Invalid XML - Некорректный XML, требуется очистка
- No RSS - RSS отсутствует, попробовать sitemap или HTML-парсинг
