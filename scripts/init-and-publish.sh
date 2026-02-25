#!/bin/sh
# Инициализация репозитория и первый коммит. Запустите из корня проекта: ./scripts/init-and-publish.sh
set -e
cd "$(dirname "$0")/.."

if [ -d .git ]; then
  echo "Git уже инициализирован."
else
  git init
  echo "Git инициализирован."
fi

git add .
git status

if git diff --cached --quiet 2>/dev/null; then
  echo "Нет изменений для коммита."
else
  git commit -m "Initial commit: news aggregator (Express, Nuxt 3, Vue 3 admin)"
  echo "Первый коммит создан."
fi

echo ""
echo "Чтобы опубликовать на GitHub:"
echo "  1. Создайте новый репозиторий на https://github.com/new (без README, .gitignore и лицензии)"
echo "  2. Выполните:"
echo "     git remote add origin https://github.com/YOUR_USERNAME/news-aggregator.git"
echo "     git branch -M main"
echo "     git push -u origin main"
echo ""
echo "Или одной командой (если установлен GitHub CLI):"
echo "     gh repo create news-aggregator --private --source=. --push"
echo "     # или --public для публичного репозитория"
echo ""
